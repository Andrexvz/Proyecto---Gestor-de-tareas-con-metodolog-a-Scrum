import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { store, type StoredUser } from './server/store';
import type { ScrumRole, StoryPriority, TaskStatus } from './src/types/scrum';

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'agile-velocity-scrum-dev-secret-2026-hmac256';
const AI_TIMEOUT_MS = 8000;

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.warn('[SECURITY WARNING] In production, JWT_SECRET should be defined in environment variables.');
}

// In-memory brute force protection tracking
interface RateLimitBucket {
  count: number;
  resetAt: number;
}
const loginAttempts = new Map<string, RateLimitBucket>();
const forgotAttempts = new Map<string, RateLimitBucket>();

function checkRateLimit(
  map: Map<string, RateLimitBucket>,
  key: string,
  maxAttempts: number,
  windowMs: number
): { allowed: boolean; remainingSec: number } {
  const now = Date.now();
  const bucket = map.get(key);
  if (!bucket || bucket.resetAt < now) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remainingSec: Math.ceil(windowMs / 1000) };
  }
  if (bucket.count >= maxAttempts) {
    const remainingSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    return { allowed: false, remainingSec };
  }
  bucket.count++;
  return { allowed: true, remainingSec: Math.ceil((bucket.resetAt - now) / 1000) };
}

interface AuthRequest extends Request {
  user?: StoredUser;
}

const aiClient = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: 'Token de autenticación requerido' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    const user = store.findUserById(decoded.userId);
    if (!user) {
      res.status(401).json({ error: 'Sesión inválida o usuario inexistente' });
      return;
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Tu sesión ha expirado. Por favor, ingresa nuevamente' });
  }
}

function getEffectiveRole(user: StoredUser, projectId: number): ScrumRole | 'ADMIN' | null {
  if (user.globalRole === 'ADMIN') return 'ADMIN';
  const membership = store.getMembership(user.id, projectId);
  return membership ? membership.scrumRole : null;
}

function requireProjectAccess(allowedRoles?: Array<ScrumRole | 'ADMIN'>) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user!;
    const projectId = Number(req.params.projectId || req.body?.projectId);
    if (!projectId || Number.isNaN(projectId)) {
      res.status(400).json({ error: 'ID de proyecto inválido' });
      return;
    }
    const role = getEffectiveRole(user, projectId);
    if (!role) {
      res.status(403).json({ error: 'No tienes membresía activa en este proyecto' });
      return;
    }
    if (allowedRoles && !allowedRoles.includes(role)) {
      res.status(403).json({ error: 'No tienes permisos suficientes para realizar esta acción' });
      return;
    }
    next();
  };
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Security Headers Middleware (OWASP recommended defense-in-depth)
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Healthcheck
  app.get('/api/v1/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // --- AUTH ---
  app.post('/api/v1/auth/login', (req, res) => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const rateCheck = checkRateLimit(loginAttempts, clientIp, 10, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
      res.setHeader('Retry-After', String(rateCheck.remainingSec));
      res.status(429).json({
        error: `Demasiados intentos fallidos. Por seguridad, espera ${Math.ceil(rateCheck.remainingSec / 60)} minutos antes de reintentar.`,
      });
      return;
    }

    const { email, password } = req.body ?? {};
    if (!email || !password) {
      res.status(400).json({ error: 'Ingresa tu correo y contraseña' });
      return;
    }
    const user = store.findUserByEmail(String(email));
    if (!user || !bcrypt.compareSync(String(password), user.passwordHash)) {
      res.status(401).json({ error: 'Credenciales inválidas. Verifica tu correo y contraseña' });
      return;
    }

    // Reset rate limiter on successful authentication
    loginAttempts.delete(clientIp);

    const token = jwt.sign({ userId: user.id, role: user.globalRole }, JWT_SECRET, {
      expiresIn: '24h',
    });
    res.json({
      token,
      user: store.sanitizeUser(user),
    });
  });

  app.get('/api/v1/auth/me', authenticateToken, (req: AuthRequest, res) => {
    res.json({ user: store.sanitizeUser(req.user!) });
  });

  app.post('/api/v1/auth/forgot-password', (req, res) => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const { email } = req.body ?? {};
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
      res.status(400).json({ error: 'Ingresa un correo electrónico válido' });
      return;
    }

    const rateKey = `${clientIp}_${String(email).toLowerCase()}`;
    const rateCheck = checkRateLimit(forgotAttempts, rateKey, 5, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
      res.setHeader('Retry-After', String(rateCheck.remainingSec));
      res.status(429).json({
        error: `Demasiadas solicitudes de recuperación de contraseña. Por favor espera ${Math.ceil(rateCheck.remainingSec / 60)} minutos.`,
      });
      return;
    }

    const token = store.createResetToken(String(email));
    // RF-16 neutral response; demoToken is included strictly for local evaluation when present
    res.json({
      message:
        'Si el correo existe en nuestro sistema, recibirás instrucciones para restablecer tu contraseña en los próximos minutos.',
      ...(process.env.NODE_ENV !== 'production' && token ? { demoToken: token } : {}),
    });
  });

  app.post('/api/v1/auth/reset-password', (req, res) => {
    const { token, newPassword } = req.body ?? {};
    if (!token || !newPassword || String(newPassword).length < 8) {
      res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
      return;
    }
    try {
      store.resetPasswordWithToken(String(token), String(newPassword));
      res.json({ message: 'Contraseña actualizada correctamente' });
    } catch (err: any) {
      res.status(err.status || 400).json({ error: err.message });
    }
  });

  // --- USERS (Admin CRUD + Team lookup) ---
  app.get('/api/v1/users', authenticateToken, (_req, res) => {
    res.json({ users: store.getUsers() });
  });

  app.post('/api/v1/users', authenticateToken, (req: AuthRequest, res) => {
    if (req.user!.globalRole !== 'ADMIN') {
      res.status(403).json({ error: 'Solo los administradores pueden registrar usuarios' });
      return;
    }
    const { email, password, fullName, globalRole, title } = req.body ?? {};
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
      res.status(400).json({ error: 'El correo electrónico no es válido' });
      return;
    }
    if (!password || String(password).length < 8) {
      res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
      return;
    }
    if (!fullName || String(fullName).trim().length < 2) {
      res.status(400).json({ error: 'El nombre completo es obligatorio' });
      return;
    }
    try {
      const user = store.createUser({
        email: String(email),
        password: String(password),
        fullName: String(fullName),
        globalRole: globalRole === 'ADMIN' ? 'ADMIN' : 'USER',
        title: title ? String(title) : undefined,
      });
      res.status(201).json({ user });
    } catch (err: any) {
      res.status(err.status || 400).json({ error: err.message });
    }
  });

  // --- PROJECTS ---
  app.get('/api/v1/projects', authenticateToken, (req: AuthRequest, res) => {
    res.json({ projects: store.getProjectsForUser(req.user!) });
  });

  app.post('/api/v1/projects', authenticateToken, (req: AuthRequest, res) => {
    if (req.user!.globalRole !== 'ADMIN') {
      res.status(403).json({ error: 'Solo el Administrador puede crear proyectos' });
      return;
    }
    const { name, description, code } = req.body ?? {};
    if (!name || !String(name).trim()) {
      res.status(400).json({ error: 'El nombre del proyecto es obligatorio' });
      return;
    }
    const project = store.createProject(
      { name: String(name), description: String(description || ''), code: code ? String(code) : undefined },
      req.user!.id
    );
    res.status(201).json({ project });
  });

  app.delete('/api/v1/projects/:projectId', authenticateToken, (req: AuthRequest, res) => {
    if (req.user!.globalRole !== 'ADMIN') {
      res.status(403).json({ error: 'Solo el Administrador puede eliminar proyectos' });
      return;
    }
    try {
      store.deleteProject(Number(req.params.projectId));
      res.json({ ok: true });
    } catch (err: any) {
      res.status(err.status || 400).json({ error: err.message });
    }
  });

  app.get(
    '/api/v1/projects/:projectId/workspace',
    authenticateToken,
    requireProjectAccess(),
    (req: AuthRequest, res) => {
      const projectId = Number(req.params.projectId);
      const projects = store.getProjectsForUser(req.user!);
      const project = projects.find((p) => p.id === projectId);
      if (!project) {
        res.status(404).json({ error: 'Proyecto no encontrado' });
        return;
      }
      res.json({
        project,
        sprints: store.getSprintsByProject(projectId),
        stories: store.getStoriesByProject(projectId),
        tasks: store.getTasksByProject(projectId),
        metrics: store.getProjectMetrics(projectId),
      });
    }
  );

  // Memberships (RF-03)
  app.post(
    '/api/v1/projects/:projectId/memberships',
    authenticateToken,
    (req: AuthRequest, res) => {
      if (req.user!.globalRole !== 'ADMIN') {
        res.status(403).json({ error: 'Solo el Administrador puede gestionar membresías' });
        return;
      }
      const projectId = Number(req.params.projectId);
      const { userId, scrumRole } = req.body ?? {};
      if (!userId || !['PRODUCT_OWNER', 'SCRUM_MASTER', 'DEVELOPER'].includes(scrumRole)) {
        res.status(400).json({ error: 'Usuario o rol Scrum inválido' });
        return;
      }
      try {
        const membership = store.upsertMembership(projectId, Number(userId), scrumRole);
        res.status(201).json({ membership });
      } catch (err: any) {
        res.status(err.status || 400).json({ error: err.message });
      }
    }
  );

  app.delete(
    '/api/v1/projects/:projectId/memberships/:userId',
    authenticateToken,
    (req: AuthRequest, res) => {
      if (req.user!.globalRole !== 'ADMIN') {
        res.status(403).json({ error: 'Solo el Administrador puede gestionar membresías' });
        return;
      }
      store.removeMembership(Number(req.params.projectId), Number(req.params.userId));
      res.json({ ok: true });
    }
  );

  // --- USER STORIES (RF-04, RF-06) ---
  app.post(
    '/api/v1/projects/:projectId/stories',
    authenticateToken,
    requireProjectAccess(['ADMIN', 'PRODUCT_OWNER']),
    (req: AuthRequest, res) => {
      const projectId = Number(req.params.projectId);
      const { title, description, acceptanceCriteria, priority, storyPoints } = req.body ?? {};

      if (!title || !String(title).trim()) {
        res.status(400).json({ error: 'El título es obligatorio' });
        return;
      }
      if (!['HIGH', 'MEDIUM', 'LOW'].includes(priority)) {
        res.status(400).json({ error: 'La prioridad es obligatoria' });
        return;
      }
      const pts = Number(storyPoints ?? 0);
      if (!Number.isInteger(pts) || pts < 0) {
        res.status(400).json({ error: 'Los Story Points deben ser un entero mayor o igual a 0' });
        return;
      }

      try {
        const story = store.createStory(projectId, {
          title: String(title),
          description: String(description || ''),
          acceptanceCriteria: Array.isArray(acceptanceCriteria)
            ? acceptanceCriteria.map(String)
            : [],
          priority: priority as StoryPriority,
          storyPoints: pts,
        });
        res.status(201).json({ story });
      } catch (err: any) {
        res.status(err.status || 400).json({ error: err.message });
      }
    }
  );

  app.patch('/api/v1/stories/:storyId', authenticateToken, (req: AuthRequest, res) => {
    const storyId = Number(req.params.storyId);
    const story = store.getStoryById(storyId);
    if (!story) {
      res.status(404).json({ error: 'Historia no encontrada' });
      return;
    }
    const role = getEffectiveRole(req.user!, story.projectId);
    if (!role) {
      res.status(403).json({ error: 'Sin acceso al proyecto' });
      return;
    }
    const { title, description, acceptanceCriteria, priority, storyPoints } = req.body ?? {};
    const isOnlyPointsUpdate =
      storyPoints !== undefined &&
      title === undefined &&
      description === undefined &&
      acceptanceCriteria === undefined &&
      priority === undefined;

    if (!isOnlyPointsUpdate && role !== 'ADMIN' && role !== 'PRODUCT_OWNER') {
      res.status(403).json({ error: 'Solo Product Owner o Admin pueden editar detalles de historias' });
      return;
    }

    try {
      const updated = store.updateStory(storyId, {
        ...(title !== undefined ? { title: String(title) } : {}),
        ...(description !== undefined ? { description: String(description) } : {}),
        ...(acceptanceCriteria !== undefined
          ? { acceptanceCriteria: Array.isArray(acceptanceCriteria) ? acceptanceCriteria.map(String) : [] }
          : {}),
        ...(priority !== undefined ? { priority } : {}),
        ...(storyPoints !== undefined ? { storyPoints: Number(storyPoints) } : {}),
      });
      res.json({ story: updated });
    } catch (err: any) {
      res.status(err.status || 400).json({ error: err.message });
    }
  });

  app.delete('/api/v1/stories/:storyId', authenticateToken, (req: AuthRequest, res) => {
    const storyId = Number(req.params.storyId);
    const story = store.getStoryById(storyId);
    if (!story) {
      res.status(404).json({ error: 'Historia no encontrada' });
      return;
    }
    const role = getEffectiveRole(req.user!, story.projectId);
    if (role !== 'ADMIN' && role !== 'PRODUCT_OWNER') {
      res.status(403).json({ error: 'No tienes permiso para eliminar historias' });
      return;
    }
    try {
      store.deleteStory(storyId);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(err.status || 409).json({ error: err.message });
    }
  });

  app.patch('/api/v1/stories/:storyId/sprint', authenticateToken, (req: AuthRequest, res) => {
    const storyId = Number(req.params.storyId);
    const story = store.getStoryById(storyId);
    if (!story) {
      res.status(404).json({ error: 'Historia no encontrada' });
      return;
    }
    const role = getEffectiveRole(req.user!, story.projectId);
    if (!role || role === 'DEVELOPER') {
      res.status(403).json({ error: 'Solo Scrum Master, Product Owner o Admin pueden planificar Sprints' });
      return;
    }
    const sprintId = req.body?.sprintId === null ? null : Number(req.body?.sprintId);
    try {
      const updated = store.assignStoryToSprint(storyId, sprintId);
      res.json({ story: updated });
    } catch (err: any) {
      res.status(err.status || 400).json({ error: err.message });
    }
  });

  // --- SPRINTS (RF-07, RF-08, RF-13) ---
  app.post(
    '/api/v1/projects/:projectId/sprints',
    authenticateToken,
    requireProjectAccess(['ADMIN', 'PRODUCT_OWNER', 'SCRUM_MASTER']),
    (req: AuthRequest, res) => {
      const projectId = Number(req.params.projectId);
      const { name, goal, startDate, endDate } = req.body ?? {};
      if (!name || !startDate || !endDate) {
        res.status(400).json({ error: 'Nombre y rango de fechas son obligatorios' });
        return;
      }
      try {
        const sprint = store.createSprint(projectId, {
          name: String(name),
          goal: String(goal || ''),
          startDate: String(startDate),
          endDate: String(endDate),
        });
        res.status(201).json({ sprint });
      } catch (err: any) {
        res.status(err.status || 400).json({ error: err.message });
      }
    }
  );

  app.post('/api/v1/sprints/:sprintId/start', authenticateToken, (req: AuthRequest, res) => {
    const sprint = store.getSprintById(Number(req.params.sprintId));
    if (!sprint) {
      res.status(404).json({ error: 'Sprint no encontrado' });
      return;
    }
    const role = getEffectiveRole(req.user!, sprint.projectId);
    if (!role || role === 'DEVELOPER') {
      res.status(403).json({ error: 'Solo Scrum Master, Product Owner o Admin pueden iniciar Sprints' });
      return;
    }
    try {
      const started = store.startSprint(sprint.id);
      res.json({ sprint: started });
    } catch (err: any) {
      res.status(err.status || 409).json({ error: err.message });
    }
  });

  app.post('/api/v1/sprints/:sprintId/close', authenticateToken, (req: AuthRequest, res) => {
    const sprint = store.getSprintById(Number(req.params.sprintId));
    if (!sprint) {
      res.status(404).json({ error: 'Sprint no encontrado' });
      return;
    }
    const role = getEffectiveRole(req.user!, sprint.projectId);
    if (!role || (role !== 'ADMIN' && role !== 'SCRUM_MASTER' && role !== 'PRODUCT_OWNER')) {
      res.status(403).json({ error: 'Solo Scrum Master o Admin pueden cerrar Sprints' });
      return;
    }
    try {
      const summary = store.closeSprint(sprint.id);
      res.json({ summary });
    } catch (err: any) {
      res.status(err.status || 409).json({ error: err.message });
    }
  });

  // --- TASKS (RF-09, RF-10, RF-11) ---
  app.post('/api/v1/stories/:storyId/tasks', authenticateToken, (req: AuthRequest, res) => {
    const storyId = Number(req.params.storyId);
    if (!storyId || Number.isNaN(storyId)) {
      res.status(400).json({ error: 'ID de historia de usuario inválido' });
      return;
    }
    const story = store.getStoryById(storyId);
    if (!story) {
      res.status(404).json({ error: 'Historia de usuario no encontrada' });
      return;
    }
    const role = getEffectiveRole(req.user!, story.projectId);
    if (!role) {
      res.status(403).json({ error: 'No tienes acceso a este proyecto' });
      return;
    }
    const { description, assignedToId } = req.body ?? {};
    if (!description || typeof description !== 'string' || description.trim().length < 3) {
      res.status(400).json({ error: 'La descripción técnica debe tener al menos 3 caracteres' });
      return;
    }
    if (description.trim().length > 500) {
      res.status(400).json({ error: 'La descripción técnica no puede exceder 500 caracteres' });
      return;
    }
    const parsedAssigneeId =
      assignedToId === null || assignedToId === undefined || assignedToId === ''
        ? null
        : Number(assignedToId);
    if (parsedAssigneeId !== null && Number.isNaN(parsedAssigneeId)) {
      res.status(400).json({ error: 'Identificador de responsable asignado inválido' });
      return;
    }
    try {
      const result = store.createTask(storyId, {
        description: description.trim(),
        assignedToId: parsedAssigneeId,
      });
      res.status(201).json(result);
    } catch (err: any) {
      res.status(err.status || 400).json({ error: err.message });
    }
  });

  app.patch('/api/v1/tasks/:taskId', authenticateToken, (req: AuthRequest, res) => {
    const taskId = Number(req.params.taskId);
    if (!taskId || Number.isNaN(taskId)) {
      res.status(400).json({ error: 'ID de tarea inválido' });
      return;
    }
    const existingTask = store.getTaskById(taskId);
    if (!existingTask) {
      res.status(404).json({ error: 'Tarea no encontrada' });
      return;
    }
    const story = store.getStoryById(existingTask.userStoryId);
    if (!story) {
      res.status(404).json({ error: 'Historia asociada no encontrada' });
      return;
    }
    const role = getEffectiveRole(req.user!, story.projectId);
    if (!role) {
      res.status(403).json({ error: 'No tienes acceso a este proyecto' });
      return;
    }

    const { status, assignedToId, description } = req.body ?? {};
    if (status !== undefined && !['TODO', 'IN_PROGRESS', 'TESTING', 'DONE'].includes(status)) {
      res.status(400).json({ error: 'Estado de tarea inválido. Debe ser: TODO, IN_PROGRESS, TESTING o DONE' });
      return;
    }
    if (description !== undefined) {
      if (typeof description !== 'string' || description.trim().length < 3) {
        res.status(400).json({ error: 'La descripción técnica debe tener al menos 3 caracteres' });
        return;
      }
      if (description.trim().length > 500) {
        res.status(400).json({ error: 'La descripción técnica no puede exceder 500 caracteres' });
        return;
      }
    }
    const parsedAssigneeId =
      assignedToId === null || assignedToId === undefined || assignedToId === ''
        ? (assignedToId === null ? null : undefined)
        : Number(assignedToId);
    if (parsedAssigneeId !== undefined && parsedAssigneeId !== null && Number.isNaN(parsedAssigneeId)) {
      res.status(400).json({ error: 'Identificador de responsable asignado inválido' });
      return;
    }

    try {
      const result = store.updateTask(taskId, {
        ...(status !== undefined ? { status: status as TaskStatus } : {}),
        ...(parsedAssigneeId !== undefined ? { assignedToId: parsedAssigneeId } : {}),
        ...(description !== undefined ? { description: description.trim() } : {}),
      });
      res.json(result);
    } catch (err: any) {
      res.status(err.status || 400).json({ error: err.message });
    }
  });

  app.delete('/api/v1/tasks/:taskId', authenticateToken, (req: AuthRequest, res) => {
    const taskId = Number(req.params.taskId);
    if (!taskId || Number.isNaN(taskId)) {
      res.status(400).json({ error: 'ID de tarea inválido' });
      return;
    }
    const existingTask = store.getTaskById(taskId);
    if (!existingTask) {
      res.status(404).json({ error: 'Tarea no encontrada' });
      return;
    }
    const story = store.getStoryById(existingTask.userStoryId);
    if (!story) {
      res.status(404).json({ error: 'Historia asociada no encontrada' });
      return;
    }
    const role = getEffectiveRole(req.user!, story.projectId);
    if (!role) {
      res.status(403).json({ error: 'No tienes acceso a este proyecto' });
      return;
    }

    try {
      store.deleteTask(taskId);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(err.status || 400).json({ error: err.message });
    }
  });

  // --- NOTIFICATIONS (RF-15) ---
  app.get('/api/v1/notifications', authenticateToken, (req: AuthRequest, res) => {
    res.json({ notifications: store.getNotifications(req.user!.id) });
  });

  app.post('/api/v1/notifications/read', authenticateToken, (req: AuthRequest, res) => {
    const notificationId = req.body?.notificationId ? Number(req.body.notificationId) : undefined;
    store.markNotificationRead(req.user!.id, notificationId);
    res.json({ notifications: store.getNotifications(req.user!.id) });
  });

  // --- AI ASSISTANT (RF-05, 8s strict timeout, server-side @google/genai) ---
  app.post('/api/v1/ai/generate-story', authenticateToken, async (req: AuthRequest, res) => {
    const { prompt, projectId } = req.body ?? {};
    if (!prompt || String(prompt).trim().length < 5) {
      res.status(400).json({ error: 'Ingresa al menos 5 caracteres para asistir a la IA' });
      return;
    }

    if (projectId) {
      const role = getEffectiveRole(req.user!, Number(projectId));
      if (role === 'DEVELOPER') {
        res.status(403).json({
          error: 'Solo Product Owner, Scrum Master o Admin pueden generar historias con IA',
        });
        return;
      }
    }

    if (!aiClient) {
      res.status(503).json({
        error: 'El asistente de IA no está disponible temporalmente. Puedes continuar escribiendo manualmente',
      });
      return;
    }

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(Object.assign(new Error('AI_TIMEOUT'), { status: 504 }));
      }, AI_TIMEOUT_MS);
    });

    try {
      const generationPromise = aiClient.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Genera una historia de usuario Scrum profesional y concisa en español basada en esta idea o título: "${String(prompt).trim()}".`,
        config: {
          systemInstruction:
            'Eres un Product Owner senior experto en metodología Scrum. Responde únicamente con JSON estructurado en español. Los criterios de aceptación deben ser verificables, claros y entre 3 y 4 viñetas.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              role: {
                type: Type.STRING,
                description: 'Rol del usuario (ej. usuario móvil, administrador, cliente)',
              },
              action: {
                type: Type.STRING,
                description: 'Acción que desea realizar el usuario',
              },
              benefit: {
                type: Type.STRING,
                description: 'Beneficio o valor de negocio obtenido',
              },
              acceptanceCriteria: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Lista de 3 a 4 criterios de aceptación verificables',
              },
            },
            required: ['role', 'action', 'benefit', 'acceptanceCriteria'],
          },
        },
      });

      const response = await Promise.race([generationPromise, timeoutPromise]);
      const rawText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawText);

      res.json({
        draft: {
          role: String(parsed.role || 'usuario del sistema'),
          action: String(parsed.action || String(prompt).trim()),
          benefit: String(parsed.benefit || 'agilizar el flujo operativo'),
          acceptanceCriteria: Array.isArray(parsed.acceptanceCriteria)
            ? parsed.acceptanceCriteria.map(String)
            : [],
        },
      });
    } catch (err: any) {
      console.warn('[AI Assistant]', err?.message || err);
      res.status(err?.status === 504 ? 504 : 503).json({
        error:
          'El asistente de IA no está disponible temporalmente. Puedes continuar escribiendo manualmente',
      });
    }
  });

  // Vite dev middleware or static prod serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Agile Velocity server running on http://localhost:${PORT}`);
  });
}

startServer();
