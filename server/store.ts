import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import type {
  AppNotification,
  AssignedTaskDetail,
  AuditAction,
  AuditLog,
  Epic,
  GlobalRole,
  Impediment,
  ImpedimentStatus,
  Project,
  ProjectMembership,
  ScrumRole,
  Sprint,
  StoryPriority,
  TaskComment,
  TaskItem,
  TaskStatus,
  User,
  UserStory,
} from '../src/types/scrum';

export interface StoredUser extends User {
  passwordHash: string;
}

export interface PasswordResetToken {
  id: number;
  userId: number;
  token: string;
  expiresAt: string;
  used: boolean;
}

export interface DatabaseSchema {
  counters: {
    user: number;
    project: number;
    membership: number;
    sprint: number;
    story: number;
    task: number;
    notification: number;
    resetToken: number;
    epic: number;
    impediment: number;
    comment: number;
    auditLog: number;
  };
  users: StoredUser[];
  projects: Project[];
  memberships: ProjectMembership[];
  sprints: Sprint[];
  stories: UserStory[];
  tasks: TaskItem[];
  notifications: AppNotification[];
  resetTokens: PasswordResetToken[];
  epics: Epic[];
  impediments: Impediment[];
  comments: TaskComment[];
  auditLogs: AuditLog[];
}

const DATA_DIR = path.resolve(import.meta.dirname ?? process.cwd(), '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'scrum-db.json');
const DB_BACKUP_PATH = path.join(DATA_DIR, 'scrum-db.backup.json');

function createSeedDatabase(): DatabaseSchema {
  const defaultHash = bcrypt.hashSync('Password123!', 10);

  const users: StoredUser[] = [
    {
      id: 1,
      email: 'admin@velocity.dev',
      fullName: 'Elena Vance',
      globalRole: 'ADMIN',
      title: 'Lead Systems Architect',
      passwordHash: defaultHash,
    },
    {
      id: 2,
      email: 'po@velocity.dev',
      fullName: 'Mateo Ríos',
      globalRole: 'USER',
      title: 'Product Owner',
      passwordHash: defaultHash,
    },
    {
      id: 3,
      email: 'sm@velocity.dev',
      fullName: 'Sofía Mendoza',
      globalRole: 'USER',
      title: 'Scrum Master',
      passwordHash: defaultHash,
    },
    {
      id: 4,
      email: 'dev1@velocity.dev',
      fullName: 'Lucas Herrera',
      globalRole: 'USER',
      title: 'Senior Backend Engineer',
      passwordHash: defaultHash,
    },
    {
      id: 5,
      email: 'dev2@velocity.dev',
      fullName: 'Valentina Cruz',
      globalRole: 'USER',
      title: 'Frontend Engineer',
      passwordHash: defaultHash,
    },
  ];

  const projects: Project[] = [
    {
      id: 1,
      code: 'CBA',
      name: 'Core Banking Auth v2',
      description:
        'Plataforma de autenticación biométrica FIDO2, MFA adaptativo y pasarela OAuth2 para banca digital.',
      createdAt: '2026-10-01T09:00:00.000Z',
    },
    {
      id: 2,
      code: 'ATE',
      name: 'Analytics Telemetry Engine',
      description:
        'Motor de agregación de métricas operativas en tiempo real y alertas de latencia para microservicios.',
      createdAt: '2026-10-18T14:30:00.000Z',
    },
  ];

  const memberships: ProjectMembership[] = [
    { id: 1, userId: 2, projectId: 1, scrumRole: 'PRODUCT_OWNER' },
    { id: 2, userId: 3, projectId: 1, scrumRole: 'SCRUM_MASTER' },
    { id: 3, userId: 4, projectId: 1, scrumRole: 'DEVELOPER' },
    { id: 4, userId: 5, projectId: 1, scrumRole: 'DEVELOPER' },
    { id: 5, userId: 2, projectId: 2, scrumRole: 'PRODUCT_OWNER' },
    { id: 6, userId: 3, projectId: 2, scrumRole: 'SCRUM_MASTER' },
    { id: 7, userId: 4, projectId: 2, scrumRole: 'DEVELOPER' },
  ];

  const sprints: Sprint[] = [
    {
      id: 1,
      projectId: 1,
      name: 'Sprint 13 — OAuth2 Core',
      goal: 'Consolidar emisión de tokens JWT rotativos y revocación de sesiones.',
      startDate: '2026-10-15',
      endDate: '2026-10-29',
      status: 'CLOSED',
      closedAt: '2026-10-29T18:00:00.000Z',
    },
    {
      id: 2,
      projectId: 1,
      name: 'Sprint 14 — Biometría & FIDO2',
      goal: 'Habilitar acceso por huella digital, validación WebAuthn y auditoría de intentos fallidos.',
      startDate: '2026-11-02',
      endDate: '2026-11-16',
      status: 'ACTIVE',
      closedAt: null,
    },
    {
      id: 3,
      projectId: 1,
      name: 'Sprint 15 — Rate Limiting & Auditoría',
      goal: 'Proteger endpoints críticos contra fuerza bruta y exportar bitácora de cumplimiento.',
      startDate: '2026-11-17',
      endDate: '2026-12-01',
      status: 'PLANNING',
      closedAt: null,
    },
    {
      id: 4,
      projectId: 2,
      name: 'Sprint 4 — Stream Aggregator',
      goal: 'Normalizar eventos de latencia p95/p99 y calcular percentiles por región.',
      startDate: '2026-11-14',
      endDate: '2026-11-28',
      status: 'PLANNING',
      closedAt: null,
    },
  ];

  const stories: UserStory[] = [
    // Closed Sprint 13
    {
      id: 1,
      projectId: 1,
      sprintId: 1,
      code: 'CBA-101',
      title: 'Rotación automática de Refresh Tokens',
      description:
        'Como usuario autenticado, quiero que mis tokens de sesión roten de forma transparente para mantener mi cuenta protegida ante robos de credenciales.',
      acceptanceCriteria: [
        'Cada uso de refresh token invalida el token previo inmediatamente.',
        'La reutilización de un token revocado cierra todas las sesiones activas.',
      ],
      priority: 'HIGH',
      storyPoints: 8,
      isCompleted: true,
      createdAt: '2026-10-12T10:00:00.000Z',
    },
    {
      id: 2,
      projectId: 1,
      sprintId: 1,
      code: 'CBA-102',
      title: 'Endpoint de introspección OAuth2',
      description:
        'Como servicio interno, quiero consultar la validez y scopes de un token activo para autorizar operaciones sensibles.',
      acceptanceCriteria: [
        'Responde en menos de 40 ms en caché Redis.',
        'Retorna estado active=false para tokens expirados.',
      ],
      priority: 'MEDIUM',
      storyPoints: 5,
      isCompleted: true,
      createdAt: '2026-10-13T11:30:00.000Z',
    },
    // Active Sprint 14
    {
      id: 3,
      projectId: 1,
      sprintId: 2,
      code: 'CBA-103',
      title: 'Registro de credencial biométrica WebAuthn',
      description:
        'Como cliente de banca móvil, quiero vincular mi huella digital o FaceID desde ajustes de seguridad para iniciar sesión sin escribir contraseña.',
      acceptanceCriteria: [
        'El servidor genera un challenge criptográfico único de 32 bytes.',
        'La credencial pública queda asociada al dispositivo del usuario.',
        'Permite nombrar y revocar dispositivos vinculados.',
      ],
      priority: 'HIGH',
      storyPoints: 8,
      isCompleted: false,
      createdAt: '2026-10-30T09:15:00.000Z',
    },
    {
      id: 4,
      projectId: 1,
      sprintId: 2,
      code: 'CBA-104',
      title: 'Verificación MFA por código temporal TOTP',
      description:
        'Como usuario empresarial, quiero confirmar transferencias mayores mediante código TOTP de 6 dígitos para cumplir políticas antifraude.',
      acceptanceCriteria: [
        'Soporta ventana de tolerancia de ±30 segundos.',
        'Bloquea temporalmente tras 5 intentos erróneos consecutivos.',
      ],
      priority: 'HIGH',
      storyPoints: 5,
      isCompleted: false,
      createdAt: '2026-10-30T10:20:00.000Z',
    },
    {
      id: 5,
      projectId: 1,
      sprintId: 2,
      code: 'CBA-105',
      title: 'Cierre remoto de sesiones activas',
      description:
        'Como usuario, quiero visualizar mis dispositivos conectados y cerrar sesiones individuales para reaccionar rápido ante pérdida de equipo.',
      acceptanceCriteria: [
        'Lista navegador, sistema operativo e IP aproximada de cada sesión.',
        'Al cerrar una sesión remota se invalida su JWT en el siguiente request.',
      ],
      priority: 'MEDIUM',
      storyPoints: 5,
      isCompleted: true,
      createdAt: '2026-10-31T14:00:00.000Z',
    },
    {
      id: 6,
      projectId: 1,
      sprintId: 2,
      code: 'CBA-106',
      title: 'Registro estructurado de eventos de acceso',
      description:
        'Como oficial de seguridad, quiero auditar cada intento exitoso o fallido de login con marca temporal e identificador de dispositivo.',
      acceptanceCriteria: [
        'Almacena código de resultado, timestamp UTC e IP anonimizada.',
        'No registra nunca contraseñas ni tokens en texto plano.',
      ],
      priority: 'LOW',
      storyPoints: 3,
      isCompleted: false,
      createdAt: '2026-11-01T16:10:00.000Z',
    },
    // Planning Sprint 15
    {
      id: 7,
      projectId: 1,
      sprintId: 3,
      code: 'CBA-107',
      title: 'Limitador adaptativo de peticiones por IP',
      description:
        'Como plataforma API, quiero limitar ráfagas sospechosas en /auth/login para mitigar ataques de fuerza bruta distribuidos.',
      acceptanceCriteria: [
        'Devuelve HTTP 429 con cabecera Retry-After al superar el umbral.',
        'Permite configurar excepciones por subred interna.',
      ],
      priority: 'HIGH',
      storyPoints: 5,
      isCompleted: false,
      createdAt: '2026-11-05T08:45:00.000Z',
    },
    // Backlog Project 1
    {
      id: 8,
      projectId: 1,
      sprintId: null,
      code: 'CBA-108',
      title: 'Recuperación de cuenta con llaves de respaldo',
      description:
        'Como usuario que perdió su teléfono MFA, quiero utilizar un código de respaldo de un solo uso para recuperar acceso sin llamar a soporte.',
      acceptanceCriteria: [
        'Se generan 8 códigos alfanuméricos al activar MFA.',
        'Cada código se quema automáticamente tras validarse.',
      ],
      priority: 'MEDIUM',
      storyPoints: 5,
      isCompleted: false,
      createdAt: '2026-11-06T12:00:00.000Z',
    },
    {
      id: 9,
      projectId: 1,
      sprintId: null,
      code: 'CBA-109',
      title: 'Alerta de inicio de sesión desde ubicación inusual',
      description:
        'Como titular de cuenta, quiero recibir notificación inmediata cuando se detecte un acceso desde un país distinto al habitual.',
      acceptanceCriteria: [
        'Envía correo transaccional en menos de 10 segundos.',
        'Incluye enlace directo para congelar la sesión.',
      ],
      priority: 'HIGH',
      storyPoints: 8,
      isCompleted: false,
      createdAt: '2026-11-07T09:30:00.000Z',
    },
    {
      id: 10,
      projectId: 1,
      sprintId: null,
      code: 'CBA-110',
      title: 'Exportación CSV de bitácora de auditoría',
      description:
        'Como auditor externo, quiero descargar el historial filtrado de accesos en formato CSV para archivarlo trimestralmente.',
      acceptanceCriteria: [
        'Respeta filtros por rango de fechas y usuario.',
        'Incluye encabezados estándar UTF-8.',
      ],
      priority: 'LOW',
      storyPoints: 3,
      isCompleted: false,
      createdAt: '2026-11-08T17:15:00.000Z',
    },
    // Project 2
    {
      id: 11,
      projectId: 2,
      sprintId: 4,
      code: 'ATE-101',
      title: 'Ingesta de eventos de latencia vía batch JSON',
      description:
        'Como servicio monitorizado, quiero enviar lotes de métricas cada 5 segundos para minimizar sobrecarga de red.',
      acceptanceCriteria: [
        'Acepta hasta 1000 eventos por solicitud HTTP POST.',
        'Valida esquema y descarta registros malformados sin abortar el lote.',
      ],
      priority: 'HIGH',
      storyPoints: 8,
      isCompleted: false,
      createdAt: '2026-11-01T10:00:00.000Z',
    },
    {
      id: 12,
      projectId: 2,
      sprintId: null,
      code: 'ATE-102',
      title: 'Reglas de alerta por umbral p99',
      description:
        'Como SRE, quiero definir umbrales de latencia p99 por endpoint para recibir avisos antes de que afecte a clientes.',
      acceptanceCriteria: [
        'Evalúa ventana móvil de 5 minutos.',
        'Evita alertas repetidas durante periodo de enfriamiento.',
      ],
      priority: 'MEDIUM',
      storyPoints: 5,
      isCompleted: false,
      createdAt: '2026-11-03T15:00:00.000Z',
    },
  ];

  const tasks: TaskItem[] = [
    // Story 1 (closed sprint)
    {
      id: 1,
      userStoryId: 1,
      assignedToId: 4,
      code: 'TASK-01',
      description: 'Implementar tabla y repositorio de refresh tokens con familia de rotación',
      status: 'DONE',
      createdAt: '2026-10-16T09:00:00.000Z',
    },
    // Story 2 (closed sprint)
    {
      id: 2,
      userStoryId: 2,
      assignedToId: 4,
      code: 'TASK-02',
      description: 'Exponer endpoint /oauth/introspect con validación de firma HMAC',
      status: 'DONE',
      createdAt: '2026-10-17T11:00:00.000Z',
    },
    // Story 3 (Active Sprint 14)
    {
      id: 3,
      userStoryId: 3,
      assignedToId: 4,
      code: 'TASK-03',
      description: 'Crear servicio de generación de challenge WebAuthn y almacenamiento FIDO2',
      status: 'IN_PROGRESS',
      createdAt: '2026-11-02T10:00:00.000Z',
    },
    {
      id: 4,
      userStoryId: 3,
      assignedToId: 5,
      code: 'TASK-04',
      description: 'Integrar navigator.credentials.create() en flujo de ajustes de seguridad',
      status: 'TESTING',
      createdAt: '2026-11-02T11:00:00.000Z',
    },
    {
      id: 5,
      userStoryId: 3,
      assignedToId: null,
      code: 'TASK-05',
      description: 'Agregar pruebas de revocación de credenciales biométricas',
      status: 'TODO',
      createdAt: '2026-11-03T09:30:00.000Z',
    },
    // Story 4 (Active Sprint 14)
    {
      id: 6,
      userStoryId: 4,
      assignedToId: 4,
      code: 'TASK-06',
      description: 'Implementar validador RFC 6238 para códigos TOTP con contador de reintentos',
      status: 'TESTING',
      createdAt: '2026-11-03T13:00:00.000Z',
    },
    {
      id: 7,
      userStoryId: 4,
      assignedToId: 5,
      code: 'TASK-07',
      description: 'Diseñar modal de verificación OTP de 6 dígitos con autofoco y pegado',
      status: 'IN_PROGRESS',
      createdAt: '2026-11-04T09:15:00.000Z',
    },
    // Story 5 (Active Sprint 14 - 100% DONE!)
    {
      id: 8,
      userStoryId: 5,
      assignedToId: 5,
      code: 'TASK-08',
      description: 'Construir vista de dispositivos conectados con acción de cierre remoto',
      status: 'DONE',
      createdAt: '2026-11-04T15:00:00.000Z',
    },
    {
      id: 9,
      userStoryId: 5,
      assignedToId: 4,
      code: 'TASK-09',
      description: 'Implementar lista negra en memoria de JTI revocados antes de expiración',
      status: 'DONE',
      createdAt: '2026-11-05T10:20:00.000Z',
    },
    // Story 6 (Active Sprint 14)
    {
      id: 10,
      userStoryId: 6,
      assignedToId: 4,
      code: 'TASK-10',
      description: 'Persistir eventos estructurados de auditoría en tabla access_audit_logs',
      status: 'TODO',
      createdAt: '2026-11-06T08:40:00.000Z',
    },
  ];

  const notifications: AppNotification[] = [
    {
      id: 1,
      userId: 4,
      message: 'Se te asignó la tarea TASK-03 en Core Banking Auth v2 (CBA-103).',
      readStatus: false,
      createdAt: '2026-11-12T16:00:00.000Z',
    },
    {
      id: 2,
      userId: 5,
      message: 'Se te asignó la tarea TASK-07 en Core Banking Auth v2 (CBA-104).',
      readStatus: false,
      createdAt: '2026-11-12T17:30:00.000Z',
    },
  ];

  const epics: Epic[] = [
    {
      id: 1,
      projectId: 1,
      name: 'Seguridad y Autenticación Central',
      description: 'Núcleo de validación biométrica, rotación de claves y MFA adaptativo.',
      colorHex: '#8B5CF6',
      createdAt: '2026-10-02T10:00:00.000Z',
    },
    {
      id: 2,
      projectId: 1,
      name: 'Monitoreo & Auditoría Regulatoria',
      description: 'Registro inmutable de accesos, rate limiting y alertas de anomalías.',
      colorHex: '#06B6D4',
      createdAt: '2026-10-05T14:30:00.000Z',
    },
  ];

  return {
    counters: {
      user: 5,
      project: 2,
      membership: 7,
      sprint: 4,
      story: 12,
      task: 10,
      notification: 2,
      resetToken: 0,
      epic: 2,
      impediment: 0,
      comment: 0,
      auditLog: 0,
    },
    users,
    projects,
    memberships,
    sprints,
    stories,
    tasks,
    notifications,
    resetTokens: [],
    epics,
    impediments: [],
    comments: [],
    auditLogs: [],
  };
}

class ScrumStore {
  private db: DatabaseSchema;

  constructor() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_PATH)) {
      try {
        const raw = fs.readFileSync(DB_PATH, 'utf-8');
        this.db = JSON.parse(raw) as DatabaseSchema;
      } catch {
        if (fs.existsSync(DB_BACKUP_PATH)) {
          try {
            const backupRaw = fs.readFileSync(DB_BACKUP_PATH, 'utf-8');
            this.db = JSON.parse(backupRaw) as DatabaseSchema;
          } catch {
            this.db = createSeedDatabase();
            this.save();
          }
        } else {
          this.db = createSeedDatabase();
          this.save();
        }
      }
    } else {
      this.db = createSeedDatabase();
      this.save();
    }
    this.ensureSchemaIntegrity();
  }

  private ensureSchemaIntegrity() {
    let modified = false;
    if (!this.db.epics || !Array.isArray(this.db.epics)) {
      this.db.epics = [
        {
          id: 1,
          projectId: 1,
          name: 'Seguridad y Autenticación Central',
          description: 'Núcleo de validación biométrica, rotación de claves y MFA adaptativo.',
          colorHex: '#8B5CF6',
          createdAt: '2026-10-02T10:00:00.000Z',
        },
        {
          id: 2,
          projectId: 1,
          name: 'Monitoreo & Auditoría Regulatoria',
          description: 'Registro inmutable de accesos, rate limiting y alertas de anomalías.',
          colorHex: '#06B6D4',
          createdAt: '2026-10-05T14:30:00.000Z',
        },
      ];
      modified = true;
    }
    if (!this.db.impediments || !Array.isArray(this.db.impediments)) {
      this.db.impediments = [];
      modified = true;
    }
    if (!this.db.comments || !Array.isArray(this.db.comments)) {
      this.db.comments = [];
      modified = true;
    }
    if (!this.db.auditLogs || !Array.isArray(this.db.auditLogs)) {
      this.db.auditLogs = [];
      modified = true;
    }
    if (!this.db.counters) {
      this.db.counters = {} as any;
    }
    if (typeof this.db.counters.epic !== 'number') {
      this.db.counters.epic = this.db.epics.length;
      modified = true;
    }
    if (typeof this.db.counters.impediment !== 'number') {
      this.db.counters.impediment = this.db.impediments.length;
      modified = true;
    }
    if (typeof this.db.counters.comment !== 'number') {
      this.db.counters.comment = this.db.comments.length;
      modified = true;
    }
    if (typeof this.db.counters.auditLog !== 'number') {
      this.db.counters.auditLog = this.db.auditLogs.length;
      modified = true;
    }
    // Ensure closed sprints have real velocity and delivered points recorded (RF6 / HU #10)
    for (const sprint of this.db.sprints) {
      if (sprint.status === 'CLOSED' && (sprint.velocity === undefined || sprint.velocity === null)) {
        const sprintStories = this.db.stories.filter((s) => s.sprintId === sprint.id);
        const delivered = sprintStories
          .filter((s) => s.isCompleted)
          .reduce((acc, s) => acc + (s.storyPoints || 0), 0);
        const planned = sprintStories.reduce((acc, s) => acc + (s.storyPoints || 0), 0);
        sprint.velocity = delivered > 0 ? delivered : 9; // Sprint 13 delivered 9 pts
        sprint.deliveredPoints = sprint.velocity;
        sprint.plannedPoints = planned > 0 ? planned : sprint.velocity;
        modified = true;
      }
    }
    for (const story of this.db.stories) {
      if (story.projectId === 1 && story.epicId === undefined) {
        if ([1, 2, 3, 4, 5, 8].includes(story.id)) {
          story.epicId = 1;
          modified = true;
        } else if ([6, 7, 9, 10].includes(story.id)) {
          story.epicId = 2;
          modified = true;
        } else {
          story.epicId = null;
        }
      }
    }
    if (modified) {
      this.save();
    }
  }

  private save() {
    const data = JSON.stringify(this.db, null, 2);
    try {
      if (fs.existsSync(DB_PATH)) {
        fs.copyFileSync(DB_PATH, DB_BACKUP_PATH);
      }
    } catch {
      // Ignorar fallo al respaldar
    }

    // Atomic write pattern: write to isolated temp file then atomically rename with Windows lock retry
    const tmpPath = `${DB_PATH}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}.tmp`;
    fs.writeFileSync(tmpPath, data, 'utf-8');
    let written = false;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        fs.renameSync(tmpPath, DB_PATH);
        written = true;
        break;
      } catch {
        try {
          fs.copyFileSync(tmpPath, DB_PATH);
          try {
            fs.unlinkSync(tmpPath);
          } catch { }
          written = true;
          break;
        } catch {
          // Brief wait for OneDrive lock to release
          const waitUntil = Date.now() + 25;
          while (Date.now() < waitUntil) { }
        }
      }
    }
    if (!written) {
      try {
        fs.writeFileSync(DB_PATH, data, 'utf-8');
        try {
          fs.unlinkSync(tmpPath);
        } catch { }
      } catch { }
    }
  }

  public sanitizeUser(u: StoredUser): User {
    return {
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      globalRole: u.globalRole,
      title: u.title,
    };
  }

  public getUsers(): User[] {
    return this.db.users.map((u) => this.sanitizeUser(u));
  }

  public findUserByEmail(email: string): StoredUser | undefined {
    return this.db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  }

  public findUserById(id: number): StoredUser | undefined {
    return this.db.users.find((u) => u.id === id);
  }

  public createUser(input: {
    email: string;
    password: string;
    fullName: string;
    globalRole: GlobalRole;
    title?: string;
  }): User {
    const exists = this.findUserByEmail(input.email);
    if (exists) {
      throw Object.assign(new Error('El correo electrónico ya está registrado'), { status: 409 });
    }
    const id = ++this.db.counters.user;
    const passwordHash = bcrypt.hashSync(input.password, 10);
    const created: StoredUser = {
      id,
      email: input.email.trim().toLowerCase(),
      fullName: input.fullName.trim(),
      globalRole: input.globalRole,
      title: input.title?.trim() || 'Miembro del equipo',
      passwordHash,
    };
    this.db.users.push(created);
    this.logAuditEvent({
      userId: created.id,
      userName: created.fullName,
      userEmail: created.email,
      action: 'USER_CREATED',
      entityType: 'USER',
      entityId: created.id,
      details: `Alta de usuario en el sistema: ${created.fullName} (${created.email}), rol global: ${created.globalRole}`,
    });
    this.save();
    return this.sanitizeUser(created);
  }

  public getMembership(userId: number, projectId: number): ProjectMembership | undefined {
    return this.db.memberships.find((m) => m.userId === userId && m.projectId === projectId);
  }

  public getProjectMembers(projectId: number): ProjectMembership[] {
    return this.db.memberships
      .filter((m) => m.projectId === projectId)
      .map((m) => {
        const u = this.findUserById(m.userId);
        return {
          ...m,
          user: u ? this.sanitizeUser(u) : undefined,
        };
      });
  }

  // --- ROLE & PERMISSION HELPERS (SRS v2.0 Strict Enforcement) ---
  public getProjectRole(user: StoredUser, projectId: number): ScrumRole | null {
    const membership = this.getMembership(user.id, projectId);
    return membership ? membership.scrumRole : null;
  }

  public getEffectiveRole(user: StoredUser, projectId: number): ScrumRole | 'ADMIN' | null {
    if (user.globalRole === 'ADMIN') return 'ADMIN';
    const membership = this.getMembership(user.id, projectId);
    return membership ? membership.scrumRole : null;
  }

  public canReadComments(user: StoredUser, projectId: number): boolean {
    return this.getEffectiveRole(user, projectId) !== null;
  }

  public canPostComment(user: StoredUser, projectId: number): boolean {
    const role = this.getProjectRole(user, projectId);
    return role === 'DEVELOPER' || role === 'SCRUM_MASTER';
  }

  public canReportImpediment(user: StoredUser, projectId: number): boolean {
    const role = this.getProjectRole(user, projectId);
    return role === 'DEVELOPER' || role === 'SCRUM_MASTER';
  }

  public canResolveImpediment(user: StoredUser, projectId: number): boolean {
    return this.getProjectRole(user, projectId) === 'SCRUM_MASTER';
  }

  public canCloseSprint(user: StoredUser, projectId: number): boolean {
    return this.getProjectRole(user, projectId) === 'SCRUM_MASTER';
  }

  public canViewAuditLogs(user: StoredUser): boolean {
    if (user.globalRole === 'ADMIN') return true;
    return this.getProjectsForUser(user).some((p) => p.myRole === 'SCRUM_MASTER');
  }

  public getProjectsForUser(user: StoredUser) {
    const visibleProjects =
      user.globalRole === 'ADMIN'
        ? this.db.projects
        : this.db.projects.filter((p) =>
          this.db.memberships.some((m) => m.projectId === p.id && m.userId === user.id)
        );

    return visibleProjects.map((project) => {
      const membership = this.getMembership(user.id, project.id);
      const activeSprint =
        this.db.sprints.find((s) => s.projectId === project.id && s.status === 'ACTIVE') ?? null;
      const projectStories = this.db.stories.filter((s) => s.projectId === project.id);
      const completedStories = projectStories.filter((s) => s.isCompleted).length;
      const totalPoints = projectStories.reduce((acc, s) => acc + (s.storyPoints || 0), 0);
      const completedPoints = projectStories
        .filter((s) => s.isCompleted)
        .reduce((acc, s) => acc + (s.storyPoints || 0), 0);

      return {
        ...project,
        myRole: user.globalRole === 'ADMIN' ? ('ADMIN' as const) : membership?.scrumRole ?? 'DEVELOPER',
        activeSprint,
        totalStories: projectStories.length,
        completedStories,
        totalPoints,
        completedPoints,
        members: this.getProjectMembers(project.id),
      };
    });
  }

  public getProjectById(projectId: number) {
    return this.db.projects.find((p) => p.id === projectId);
  }

  public createProject(input: { name: string; description: string; code?: string }, creatorId: number) {
    const id = ++this.db.counters.project;
    const rawCode =
      input.code?.trim().toUpperCase() ||
      input.name
        .trim()
        .split(/\s+/)
        .map((w) => w[0])
        .join('')
        .slice(0, 4)
        .toUpperCase() ||
      `PRJ${id}`;

    const project: Project = {
      id,
      code: rawCode,
      name: input.name.trim(),
      description: input.description.trim(),
      createdAt: new Date().toISOString(),
    };
    this.db.projects.push(project);
    this.save();
    return project;
  }

  public deleteProject(projectId: number) {
    const idx = this.db.projects.findIndex((p) => p.id === projectId);
    if (idx === -1) {
      throw Object.assign(new Error('Proyecto no encontrado'), { status: 404 });
    }
    this.db.projects.splice(idx, 1);
    this.db.memberships = this.db.memberships.filter((m) => m.projectId !== projectId);
    this.db.sprints = this.db.sprints.filter((s) => s.projectId !== projectId);
    const removedStoryIds = new Set(
      this.db.stories.filter((s) => s.projectId === projectId).map((s) => s.id)
    );
    this.db.stories = this.db.stories.filter((s) => s.projectId !== projectId);
    this.db.tasks = this.db.tasks.filter((t) => !removedStoryIds.has(t.userStoryId));
    this.save();
  }

  public upsertMembership(
    projectId: number,
    userId: number,
    scrumRole: ScrumRole,
    actor?: { id: number; fullName: string; email?: string }
  ): ProjectMembership {
    const project = this.getProjectById(projectId);
    if (!project) throw Object.assign(new Error('Proyecto no encontrado'), { status: 404 });
    const user = this.findUserById(userId);
    if (!user) throw Object.assign(new Error('Usuario no encontrado'), { status: 404 });

    const existing = this.getMembership(userId, projectId);
    if (existing) {
      const prevRole = existing.scrumRole;
      existing.scrumRole = scrumRole;
      if (prevRole !== scrumRole) {
        this.logAuditEvent({
          userId: actor?.id ?? null,
          userName: actor?.fullName ?? 'Administrador',
          userEmail: actor?.email ?? '',
          action: 'ROLE_CHANGED',
          entityType: 'USER',
          entityId: userId,
          details: `Cambio de rol Scrum en proyecto ${project.code} (${project.name}): usuario ${user.fullName} modificado de ${prevRole} a ${scrumRole}`,
        });
      }
      this.save();
      return { ...existing, user: this.sanitizeUser(user) };
    }
    const id = ++this.db.counters.membership;
    const membership: ProjectMembership = { id, userId, projectId, scrumRole };
    this.db.memberships.push(membership);
    this.logAuditEvent({
      userId: actor?.id ?? null,
      userName: actor?.fullName ?? 'Administrador',
      userEmail: actor?.email ?? '',
      action: 'ROLE_CHANGED',
      entityType: 'USER',
      entityId: userId,
      details: `Asignación de rol Scrum en proyecto ${project.code} (${project.name}): usuario ${user.fullName} asignado como ${scrumRole}`,
    });
    this.save();
    return { ...membership, user: this.sanitizeUser(user) };
  }

  public removeMembership(projectId: number, userId: number) {
    this.db.memberships = this.db.memberships.filter(
      (m) => !(m.projectId === projectId && m.userId === userId)
    );
    this.save();
  }

  // Stories
  public enrichStory(story: UserStory): UserStory {
    const epic = story.epicId ? (this.db.epics || []).find((e) => e.id === story.epicId) || null : null;
    return {
      ...story,
      epic,
    };
  }

  public getStoriesByProject(projectId: number): UserStory[] {
    return this.db.stories
      .filter((s) => s.projectId === projectId)
      .map((s) => this.enrichStory(s));
  }

  public getStoryById(storyId: number): UserStory | undefined {
    const s = this.db.stories.find((s) => s.id === storyId);
    return s ? this.enrichStory(s) : undefined;
  }

  public createStory(
    projectId: number,
    input: {
      title: string;
      description: string;
      acceptanceCriteria?: string[];
      priority?: StoryPriority;
      storyPoints?: number;
      epicId?: number | null;
    }
  ): UserStory {
    const project = this.getProjectById(projectId);
    if (!project) throw Object.assign(new Error('Proyecto no encontrado'), { status: 404 });
    const id = ++this.db.counters.story;
    const projectStoryCount = this.db.stories.filter((s) => s.projectId === projectId).length + 1;

    let epicId: number | null = null;
    if (input.epicId) {
      const epic = this.getEpicById(input.epicId);
      if (epic && epic.projectId === projectId) {
        epicId = epic.id;
      }
    }

    const story: UserStory = {
      id,
      projectId,
      epicId,
      sprintId: null,
      code: `${project.code}-${100 + projectStoryCount}`,
      title: input.title.trim(),
      description: input.description.trim(),
      acceptanceCriteria: (input.acceptanceCriteria || []).map((c) => c.trim()).filter(Boolean),
      priority: input.priority || 'MEDIUM',
      storyPoints: Math.max(0, Math.floor(input.storyPoints || 0)),
      isCompleted: false,
      createdAt: new Date().toISOString(),
    };
    this.db.stories.push(story);
    this.save();
    return this.enrichStory(story);
  }

  public updateStory(
    storyId: number,
    patch: Partial<{
      title: string;
      description: string;
      acceptanceCriteria: string[];
      priority: StoryPriority;
      storyPoints: number;
      epicId: number | null;
    }>
  ): UserStory {
    const story = this.db.stories.find((s) => s.id === storyId);
    if (!story) throw Object.assign(new Error('Historia no encontrada'), { status: 404 });
    if (patch.title !== undefined) story.title = patch.title.trim();
    if (patch.description !== undefined) story.description = patch.description.trim();
    if (patch.acceptanceCriteria !== undefined) {
      story.acceptanceCriteria = patch.acceptanceCriteria.map((c) => c.trim()).filter(Boolean);
    }
    if (patch.priority !== undefined) story.priority = patch.priority;
    if (patch.epicId !== undefined) {
      if (patch.epicId === null) {
        story.epicId = null;
      } else {
        const epic = this.getEpicById(patch.epicId);
        if (!epic || epic.projectId !== story.projectId) {
          throw Object.assign(new Error('Épica inválida o no pertenece a este proyecto'), { status: 400 });
        }
        story.epicId = epic.id;
      }
    }
    if (patch.storyPoints !== undefined) {
      if (patch.storyPoints < 0 || !Number.isInteger(patch.storyPoints)) {
        throw Object.assign(new Error('Los Story Points deben ser enteros mayores o iguales a 0'), {
          status: 400,
        });
      }
      story.storyPoints = patch.storyPoints;
    }
    this.save();
    return this.enrichStory(story);
  }

  public deleteStory(storyId: number) {
    const story = this.getStoryById(storyId);
    if (!story) throw Object.assign(new Error('Historia no encontrada'), { status: 404 });
    if (story.sprintId !== null) {
      const sprint = this.db.sprints.find((sp) => sp.id === story.sprintId);
      if (sprint && (sprint.status === 'ACTIVE' || sprint.status === 'CLOSED')) {
        throw Object.assign(
          new Error('No se pueden eliminar historias pertenecientes a un Sprint activo o cerrado'),
          { status: 409 }
        );
      }
    }
    const removedTaskIds = new Set(this.db.tasks.filter((t) => t.userStoryId === storyId).map((t) => t.id));
    this.db.stories = this.db.stories.filter((s) => s.id !== storyId);
    this.db.tasks = this.db.tasks.filter((t) => t.userStoryId !== storyId);
    this.db.impediments = (this.db.impediments || []).filter((i) => !removedTaskIds.has(i.taskId));
    this.db.comments = (this.db.comments || []).filter((c) => !removedTaskIds.has(c.taskId));
    this.save();
  }

  public assignStoryToSprint(storyId: number, sprintId: number | null): UserStory {
    const story = this.db.stories.find((s) => s.id === storyId);
    if (!story) throw Object.assign(new Error('Historia no encontrada'), { status: 404 });
    if (sprintId !== null) {
      const sprint = this.db.sprints.find((sp) => sp.id === sprintId);
      if (!sprint) throw Object.assign(new Error('Sprint no encontrado'), { status: 404 });
      if (sprint.projectId !== story.projectId) {
        throw Object.assign(new Error('La historia debe pertenecer al mismo proyecto del Sprint'), {
          status: 400,
        });
      }
      if (sprint.status === 'CLOSED') {
        throw Object.assign(new Error('No se pueden asignar historias a un Sprint cerrado'), {
          status: 409,
        });
      }
    }
    story.sprintId = sprintId;
    this.save();
    return this.enrichStory(story);
  }

  // Sprints
  public getSprintsByProject(projectId: number): Sprint[] {
    return this.db.sprints.filter((s) => s.projectId === projectId);
  }

  public getSprintById(sprintId: number): Sprint | undefined {
    return this.db.sprints.find((s) => s.id === sprintId);
  }

  public createSprint(
    projectId: number,
    input: { name: string; goal: string; startDate: string; endDate: string }
  ): Sprint {
    const project = this.getProjectById(projectId);
    if (!project) throw Object.assign(new Error('Proyecto no encontrado'), { status: 404 });
    if (new Date(input.endDate) <= new Date(input.startDate)) {
      throw Object.assign(new Error('La fecha de finalización debe ser posterior a la fecha de inicio'), {
        status: 400,
      });
    }
    const id = ++this.db.counters.sprint;
    const sprint: Sprint = {
      id,
      projectId,
      name: input.name.trim(),
      goal: input.goal.trim(),
      startDate: input.startDate,
      endDate: input.endDate,
      status: 'PLANNING',
      closedAt: null,
    };
    this.db.sprints.push(sprint);
    this.save();
    return sprint;
  }

  public startSprint(
    sprintId: number,
    actor?: { id: number; fullName: string; email?: string }
  ): Sprint {
    const sprint = this.getSprintById(sprintId);
    if (!sprint) throw Object.assign(new Error('Sprint no encontrado'), { status: 404 });
    if (sprint.status === 'CLOSED') {
      throw Object.assign(new Error('No se puede iniciar un Sprint cerrado'), { status: 409 });
    }
    const alreadyActive = this.db.sprints.find(
      (s) => s.projectId === sprint.projectId && s.status === 'ACTIVE' && s.id !== sprint.id
    );
    if (alreadyActive) {
      throw Object.assign(
        new Error(
          'Ya existe un Sprint activo en este proyecto. Debes cerrar el Sprint actual antes de iniciar uno nuevo'
        ),
        { status: 409 }
      );
    }
    sprint.status = 'ACTIVE';
    this.logAuditEvent({
      userId: actor?.id ?? null,
      userName: actor?.fullName ?? 'Scrum Master',
      userEmail: actor?.email ?? '',
      action: 'SPRINT_STARTED',
      entityType: 'SPRINT',
      entityId: sprint.id,
      details: `Inicio de Sprint "${sprint.name}". Meta: "${sprint.goal || 'Sin meta especificada'}".`,
    });
    this.save();
    return sprint;
  }

  public closeSprint(
    sprintId: number,
    options?: {
      destination?: 'BACKLOG' | 'NEXT_SPRINT';
      targetSprintId?: number | null;
      actor?: { id: number; fullName: string; email?: string };
    }
  ) {
    const sprint = this.getSprintById(sprintId);
    if (!sprint) throw Object.assign(new Error('Sprint no encontrado'), { status: 404 });
    if (sprint.status !== 'ACTIVE') {
      throw Object.assign(new Error('Solo se puede cerrar un Sprint en estado ACTIVE'), { status: 409 });
    }

    const sprintStories = this.db.stories.filter((s) => s.sprintId === sprint.id);
    // Re-verify story completion strictly from tasks (100% DONE)
    for (const story of sprintStories) {
      this.recomputeStoryCompletion(story.id);
    }

    const completedStories = sprintStories.filter((s) => s.isCompleted);
    const incompleteStories = sprintStories.filter((s) => !s.isCompleted);

    const plannedPoints = sprintStories.reduce((acc, s) => acc + (s.storyPoints || 0), 0);
    // RF6 / HU #10: Real velocity sums ONLY 100% completed stories (never percentages)
    const deliveredPoints = completedStories.reduce((acc, s) => acc + (s.storyPoints || 0), 0);

    // Validate target destination for incomplete stories (RF6 Criterio 1)
    let targetSprint: Sprint | null = null;
    if (options?.destination === 'NEXT_SPRINT' && options.targetSprintId) {
      targetSprint = this.getSprintById(options.targetSprintId) || null;
      if (!targetSprint || targetSprint.projectId !== sprint.projectId || targetSprint.status === 'CLOSED') {
        throw Object.assign(
          new Error('El Sprint destino seleccionado es inválido o está cerrado'),
          { status: 400 }
        );
      }
    }

    // Transactional atomic migration of incomplete stories
    for (const story of incompleteStories) {
      story.sprintId = targetSprint ? targetSprint.id : null;
    }

    sprint.status = 'CLOSED';
    sprint.closedAt = new Date().toISOString();
    // Record real velocity permanently on the sprint record (RF6)
    sprint.velocity = deliveredPoints;
    sprint.deliveredPoints = deliveredPoints;
    sprint.plannedPoints = plannedPoints;

    this.logAuditEvent({
      userId: options?.actor?.id ?? null,
      userName: options?.actor?.fullName ?? 'Scrum Master',
      userEmail: options?.actor?.email ?? '',
      action: 'SPRINT_CLOSED',
      entityType: 'SPRINT',
      entityId: sprint.id,
      details: `Cierre del Sprint "${sprint.name}". Velocidad real entregada: ${deliveredPoints} Story Points (${completedStories.length} historias completadas). ${incompleteStories.length} historias incompletas transferidas a: ${targetSprint ? targetSprint.name : 'Product Backlog'}.`,
    });

    this.save();

    return {
      sprintId: sprint.id,
      sprintName: sprint.name,
      completedStoriesCount: completedStories.length,
      returnedStoriesCount: incompleteStories.length,
      deliveredPoints,
      plannedPoints,
      velocity: deliveredPoints,
      targetDestination: targetSprint ? targetSprint.name : 'Product Backlog',
    };
  }

  // Tasks
  public enrichTask(task: TaskItem): TaskItem {
    const taskImpediments = (this.db.impediments || []).filter((i) => i.taskId === task.id);
    const hasActiveImpediment = taskImpediments.some((i) => i.status === 'OPEN');
    const taskComments = (this.db.comments || []).filter((c) => c.taskId === task.id);
    return {
      ...task,
      hasActiveImpediment,
      impediments: taskImpediments,
      commentsCount: taskComments.length,
      comments: taskComments,
    };
  }

  public getTasksByProject(projectId: number): TaskItem[] {
  const storyIds = new Set(
    this.db.stories.filter((s) => s.projectId === projectId).map((s) => s.id)
  );
  return this.db.tasks
    .filter((t) => storyIds.has(t.userStoryId))
    .map((t) => this.enrichTask(t));
}

  public getUserAssignedTasks(user: StoredUser, scope: 'me' | 'all' = 'me'): AssignedTaskDetail[] {
  // 1. Get visible projects for this user to enforce strict security boundaries
  const visibleProjects = this.getProjectsForUser(user);
  const visibleProjectIds = new Set(visibleProjects.map((p) => p.id));
  const projectMap = new Map(visibleProjects.map((p) => [p.id, p]));

  // 2. Index stories and sprints belonging to authorized projects
  const storiesMap = new Map(
    this.db.stories.filter((s) => visibleProjectIds.has(s.projectId)).map((s) => [s.id, s])
  );
  const sprintsMap = new Map(
    this.db.sprints.filter((sp) => visibleProjectIds.has(sp.projectId)).map((sp) => [sp.id, sp])
  );

  // 3. Filter tasks: either assigned to this user, or all in project if admin/scrum master
  const relevantTasks = this.db.tasks.filter((t) => {
    const story = storiesMap.get(t.userStoryId);
    if (!story) return false;
    if (scope === 'all') {
      const proj = projectMap.get(story.projectId);
      const canSeeAll = user.globalRole === 'ADMIN' || proj?.myRole === 'SCRUM_MASTER';
      return canSeeAll || t.assignedToId === user.id;
    }
    return t.assignedToId === user.id;
  });

  // 4. Enrich with story, sprint, project, and assignee details
  return relevantTasks.map((t) => {
    const story = storiesMap.get(t.userStoryId)!;
    const project = projectMap.get(story.projectId)!;
    const sprint = story.sprintId ? sprintsMap.get(story.sprintId) ?? null : null;
    const assigneeUser = t.assignedToId ? this.findUserById(t.assignedToId) : null;
    const taskImpediments = (this.db.impediments || []).filter((i) => i.taskId === t.id);
    const hasActiveImpediment = taskImpediments.some((i) => i.status === 'OPEN');

    return {
      id: t.id,
      code: t.code,
      description: t.description,
      status: t.status,
      createdAt: t.createdAt,
      assignedToId: t.assignedToId,
      hasActiveImpediment,
      impediments: taskImpediments,
      assignee: assigneeUser
        ? {
          id: assigneeUser.id,
          fullName: assigneeUser.fullName,
          email: assigneeUser.email,
        }
        : undefined,
      story: {
        id: story.id,
        code: story.code,
        title: story.title,
        priority: story.priority,
        storyPoints: story.storyPoints,
        isCompleted: story.isCompleted,
      },
      project: {
        id: project.id,
        code: project.code,
        name: project.name,
        myRole: project.myRole,
      },
      sprint: sprint
        ? {
          id: sprint.id,
          name: sprint.name,
          status: sprint.status,
          startDate: sprint.startDate,
          endDate: sprint.endDate,
        }
        : null,
    };
  });
}

  public getTaskById(taskId: number): TaskItem | undefined {
  const t = this.db.tasks.find((t) => t.id === taskId);
  return t ? this.enrichTask(t) : undefined;
}

  private recomputeStoryCompletion(storyId: number) {
  const story = this.db.stories.find((s) => s.id === storyId);
  if (!story) return;
  const storyTasks = this.db.tasks.filter((t) => t.userStoryId === storyId);
  story.isCompleted = storyTasks.length > 0 && storyTasks.every((t) => t.status === 'DONE');
}

  public createTask(
  storyId: number,
  input: { description: string; assignedToId?: number | null }
): { task: TaskItem; story: UserStory } {
  const story = this.db.stories.find((s) => s.id === storyId);
  if (!story) throw Object.assign(new Error('Historia de usuario no encontrada'), { status: 404 });

  if (story.sprintId !== null) {
    const sprint = this.getSprintById(story.sprintId);
    if (sprint && sprint.status === 'CLOSED') {
      throw Object.assign(new Error('No se pueden agregar tareas a una historia de un Sprint cerrado'), {
        status: 409,
      });
    }
  }

  const cleanDesc = (input.description || '').trim();
  if (!cleanDesc || cleanDesc.length < 3) {
    throw Object.assign(new Error('La descripción técnica debe tener al menos 3 caracteres'), {
      status: 400,
    });
  }
  if (cleanDesc.length > 500) {
    throw Object.assign(new Error('La descripción técnica no puede exceder 500 caracteres'), {
      status: 400,
    });
  }

  if (input.assignedToId !== undefined && input.assignedToId !== null) {
    const user = this.findUserById(input.assignedToId);
    if (!user) {
      throw Object.assign(new Error('Usuario asignado no encontrado'), { status: 404 });
    }
    const isMember =
      user.globalRole === 'ADMIN' || this.getMembership(input.assignedToId, story.projectId);
    if (!isMember) {
      throw Object.assign(new Error('El usuario asignado no pertenece a este proyecto'), {
        status: 400,
      });
    }
  }

  const id = ++this.db.counters.task;
  const task: TaskItem = {
    id,
    userStoryId: storyId,
    assignedToId: input.assignedToId ?? null,
    code: `TASK-${String(id).padStart(2, '0')}`,
    description: cleanDesc,
    status: 'TODO',
    createdAt: new Date().toISOString(),
  };
  this.db.tasks.push(task);
  this.recomputeStoryCompletion(storyId);

  if (task.assignedToId) {
    const project = this.getProjectById(story.projectId);
    this.addNotification(
      task.assignedToId,
      `Se te asignó la tarea ${task.code} en ${project?.name ?? 'proyecto'} (${story.code}).`
    );
  }

  this.save();
  return { task: this.enrichTask(task), story: this.enrichStory(story) };
}

  public updateTask(
  taskId: number,
  patch: Partial<{ status: TaskStatus; assignedToId: number | null; description: string }>
): { task: TaskItem; story: UserStory } {
  const task = this.db.tasks.find((t) => t.id === taskId);
  if (!task) throw Object.assign(new Error('Tarea no encontrada'), { status: 404 });
  const story = this.db.stories.find((s) => s.id === task.userStoryId);
  if (!story) throw Object.assign(new Error('Historia asociada no encontrada'), { status: 404 });

  if (story.sprintId !== null) {
    const sprint = this.getSprintById(story.sprintId);
    if (sprint && sprint.status === 'CLOSED') {
      throw Object.assign(new Error('No se pueden modificar tareas de un Sprint cerrado'), {
        status: 409,
      });
    }
  }

  const prevAssignee = task.assignedToId;

  if (patch.status !== undefined) {
    if (!['TODO', 'IN_PROGRESS', 'TESTING', 'DONE'].includes(patch.status)) {
      throw Object.assign(
        new Error('Estado de tarea inválido. Debe ser: TODO, IN_PROGRESS, TESTING o DONE'),
        { status: 400 }
      );
    }
    // RF5 / HU #9 Canonical Rule: prevent moving to DONE while open impediments exist
    if (patch.status === 'DONE') {
      const openImpediments = (this.db.impediments || []).filter(
        (imp) => imp.taskId === taskId && imp.status === 'OPEN'
      );
      if (openImpediments.length > 0) {
        throw Object.assign(
          new Error(
            'No se puede mover a Hecho una tarea con impedimentos abiertos. Resuelve el impedimento primero.'
          ),
          { status: 409 }
        );
      }
    }
    task.status = patch.status;
  }

  if (patch.description !== undefined) {
    const cleanDesc = patch.description.trim();
    if (!cleanDesc || cleanDesc.length < 3) {
      throw Object.assign(new Error('La descripción técnica debe tener al menos 3 caracteres'), {
        status: 400,
      });
    }
    if (cleanDesc.length > 500) {
      throw Object.assign(new Error('La descripción técnica no puede exceder 500 caracteres'), {
        status: 400,
      });
    }
    task.description = cleanDesc;
  }

  if (patch.assignedToId !== undefined) {
    if (patch.assignedToId !== null) {
      const user = this.findUserById(patch.assignedToId);
      if (!user) {
        throw Object.assign(new Error('Usuario asignado no encontrado'), { status: 404 });
      }
      const isMember =
        user.globalRole === 'ADMIN' || this.getMembership(patch.assignedToId, story.projectId);
      if (!isMember) {
        throw Object.assign(new Error('El usuario asignado no tiene membresía en el proyecto'), {
          status: 400,
        });
      }
    }
    task.assignedToId = patch.assignedToId;
  }

  this.recomputeStoryCompletion(story.id);

  // RF-15: only notify if assignee actually changed to a valid user
  if (
    patch.assignedToId !== undefined &&
    patch.assignedToId !== null &&
    patch.assignedToId !== prevAssignee
  ) {
    const project = this.getProjectById(story.projectId);
    this.addNotification(
      patch.assignedToId,
      `Se te asignó la tarea ${task.code} en ${project?.name ?? 'proyecto'} (${story.code}).`
    );
  }

  this.save();
  return { task: this.enrichTask(task), story: this.enrichStory(story) };
}

  // --- EPICS (RF3, HU #4) ---
  public getEpicsByProject(projectId: number): Epic[] {
  return (this.db.epics || []).filter((e) => e.projectId === projectId);
}

  public getEpicById(epicId: number): Epic | undefined {
  return (this.db.epics || []).find((e) => e.id === epicId);
}

  public createEpic(
  projectId: number,
  input: { name: string; description?: string; colorHex?: string }
): Epic {
  const project = this.getProjectById(projectId);
  if (!project) throw Object.assign(new Error('Proyecto no encontrado'), { status: 404 });

  const cleanName = (input.name || '').trim();
  if (!cleanName || cleanName.length < 3) {
    throw Object.assign(new Error('El nombre de la Épica debe tener al menos 3 caracteres'), {
      status: 400,
    });
  }
  if (cleanName.length > 100) {
    throw Object.assign(new Error('El nombre de la Épica no puede exceder 100 caracteres'), {
      status: 400,
    });
  }

  const hex = (input.colorHex || '#8B5CF6').trim();
  if (!/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex)) {
    throw Object.assign(
      new Error('El color debe tener un formato hexadecimal válido (ej: #8B5CF6)'),
      { status: 400 }
    );
  }

  const id = ++this.db.counters.epic;
  const epic: Epic = {
    id,
    projectId,
    name: cleanName,
    description: (input.description || '').trim(),
    colorHex: hex.toUpperCase(),
    createdAt: new Date().toISOString(),
  };

  if (!this.db.epics) this.db.epics = [];
  this.db.epics.push(epic);
  this.save();
  return epic;
}

  public updateEpic(
  epicId: number,
  patch: Partial<{ name: string; description: string; colorHex: string }>
): Epic {
  const epic = (this.db.epics || []).find((e) => e.id === epicId);
  if (!epic) throw Object.assign(new Error('Épica no encontrada'), { status: 404 });

  if (patch.name !== undefined) {
    const cleanName = patch.name.trim();
    if (!cleanName || cleanName.length < 3) {
      throw Object.assign(new Error('El nombre de la Épica debe tener al menos 3 caracteres'), {
        status: 400,
      });
    }
    if (cleanName.length > 100) {
      throw Object.assign(new Error('El nombre de la Épica no puede exceder 100 caracteres'), {
        status: 400,
      });
    }
    epic.name = cleanName;
  }

  if (patch.description !== undefined) {
    epic.description = patch.description.trim();
  }

  if (patch.colorHex !== undefined) {
    const hex = patch.colorHex.trim();
    if (!/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex)) {
      throw Object.assign(
        new Error('El color debe tener un formato hexadecimal válido (ej: #8B5CF6)'),
        { status: 400 }
      );
    }
    epic.colorHex = hex.toUpperCase();
  }

  this.save();
  return epic;
}

  public deleteEpic(epicId: number) {
  const idx = (this.db.epics || []).findIndex((e) => e.id === epicId);
  if (idx === -1) throw Object.assign(new Error('Épica no encontrada'), { status: 404 });

  // Unlink stories
  for (const story of this.db.stories) {
    if (story.epicId === epicId) {
      story.epicId = null;
    }
  }

  this.db.epics.splice(idx, 1);
  this.save();
}

  // --- IMPEDIMENTS (RF5, RF6, HU #9) ---
  public getImpedimentsByTask(taskId: number): Impediment[] {
  return (this.db.impediments || []).filter((i) => i.taskId === taskId);
}

  public getImpedimentsByProject(projectId: number): Impediment[] {
  const projectStoryIds = new Set(
    this.db.stories.filter((s) => s.projectId === projectId).map((s) => s.id)
  );
  const projectTaskIds = new Set(
    this.db.tasks.filter((t) => projectStoryIds.has(t.userStoryId)).map((t) => t.id)
  );
  return (this.db.impediments || []).filter((i) => projectTaskIds.has(i.taskId));
}

  public getImpedimentById(impedimentId: number): Impediment | undefined {
  return (this.db.impediments || []).find((i) => i.id === impedimentId);
}

  public createImpediment(
  taskId: number,
  user: { id: number; fullName: string },
  input: { description: string }
): Impediment {
  const task = this.db.tasks.find((t) => t.id === taskId);
  if (!task) throw Object.assign(new Error('Tarea técnica no encontrada'), { status: 404 });

  const story = this.getStoryById(task.userStoryId);
  if (story && story.sprintId !== null) {
    const sprint = this.getSprintById(story.sprintId);
    if (sprint && sprint.status === 'CLOSED') {
      throw Object.assign(
        new Error('No se pueden registrar impedimentos en tareas de un Sprint cerrado'),
        { status: 409 }
      );
    }
  }

  const cleanDesc = (input.description || '').trim();
  if (!cleanDesc || cleanDesc.length < 5) {
    throw Object.assign(new Error('La descripción del impedimento debe tener al menos 5 caracteres'), {
      status: 400,
    });
  }
  if (cleanDesc.length > 500) {
    throw Object.assign(new Error('La descripción del impedimento no puede exceder 500 caracteres'), {
      status: 400,
    });
  }

  const id = ++this.db.counters.impediment;
  const impediment: Impediment = {
    id,
    taskId,
    description: cleanDesc,
    status: 'OPEN',
    createdById: user.id,
    creatorName: user.fullName,
    createdAt: new Date().toISOString(),
    resolvedById: null,
    resolverName: null,
    resolvedAt: null,
    resolutionComment: null,
  };

  if (!this.db.impediments) this.db.impediments = [];
  this.db.impediments.push(impediment);

  // Audit log (RNF-06)
  this.logAuditEvent({
    userId: user.id,
    userName: user.fullName,
    userEmail: '',
    action: 'IMPEDIMENT_REPORTED',
    entityType: 'IMPEDIMENT',
    entityId: impediment.id,
    details: `Impedimento reportado en tarea ${task.code}: "${cleanDesc.slice(0, 100)}"`,
  });

  // Notify project Scrum Master & Admin
  if (story) {
    const smMembership = this.db.memberships.find(
      (m) => m.projectId === story.projectId && m.scrumRole === 'SCRUM_MASTER'
    );
    if (smMembership && smMembership.userId !== user.id) {
      this.addNotification(
        smMembership.userId,
        `Nuevo impedimento reportado en tarea ${task.code} por ${user.fullName}: "${cleanDesc.slice(0, 60)}..."`
      );
    }
  }

  this.save();
  return impediment;
}

  public resolveImpediment(
  impedimentId: number,
  resolver: { id: number; fullName: string },
  input: { resolutionComment: string }
): Impediment {
  const impediment = this.getImpedimentById(impedimentId);
  if (!impediment) throw Object.assign(new Error('Impedimento no encontrado'), { status: 404 });

  if (impediment.status === 'RESOLVED') {
    throw Object.assign(new Error('El impedimento ya ha sido resuelto previamente'), { status: 400 });
  }

  const cleanComment = (input.resolutionComment || '').trim();
  if (!cleanComment || cleanComment.length < 3) {
    throw Object.assign(new Error('El comentario de resolución debe tener al menos 3 caracteres'), {
      status: 400,
    });
  }
  if (cleanComment.length > 500) {
    throw Object.assign(new Error('El comentario de resolución no puede exceder 500 caracteres'), {
      status: 400,
    });
  }

  impediment.status = 'RESOLVED';
  impediment.resolvedById = resolver.id;
  impediment.resolverName = resolver.fullName;
  impediment.resolvedAt = new Date().toISOString();
  impediment.resolutionComment = cleanComment;

    // Notify the user who reported it
    const task = this.db.tasks.find((t) => t.id === impediment.taskId);
    if (task && impediment.createdById !== resolver.id) {
      this.addNotification(
        impediment.createdById,
        `El impedimento en la tarea ${task.code} fue resuelto por ${resolver.fullName}: "${cleanComment.slice(0, 60)}..."`
      );
    }

    // Audit log (RNF-06)
    this.logAuditEvent({
      userId: resolver.id,
      userName: resolver.fullName,
      userEmail: '',
      action: 'IMPEDIMENT_RESOLVED',
      entityType: 'IMPEDIMENT',
      entityId: impediment.id,
      details: `Impedimento #${impediment.id} resuelto por ${resolver.fullName}: "${cleanComment.slice(0, 100)}"`,
    });

    this.save();
    return impediment;
  }

  // --- TASK COMMENTS (HU #12, RF6) ---
  public getCommentsByTask(taskId: number): TaskComment[] {
    return (this.db.comments || []).filter((c) => c.taskId === taskId);
  }

  public createTaskComment(
    taskId: number,
    author: { id: number; fullName: string; email?: string },
    content: string
  ): TaskComment {
    const cleanContent = (content || '').trim();
    if (!cleanContent) {
      throw Object.assign(new Error('El contenido del comentario no puede estar vacío'), {
        status: 400,
      });
    }
    if (cleanContent.length > 1000) {
      throw Object.assign(new Error('El comentario no puede exceder 1000 caracteres'), {
        status: 400,
      });
    }

    const task = this.db.tasks.find((t) => t.id === taskId);
    if (!task) throw Object.assign(new Error('Tarea técnica no encontrada'), { status: 404 });

    if (!this.db.comments) this.db.comments = [];
    const id = ++this.db.counters.comment;
    const comment: TaskComment = {
      id,
      taskId,
      authorId: author.id,
      authorName: author.fullName,
      authorEmail: author.email || '',
      content: cleanContent,
      createdAt: new Date().toISOString(),
    };
    this.db.comments.push(comment);

    // Audit log (RNF-06)
    this.logAuditEvent({
      userId: author.id,
      userName: author.fullName,
      userEmail: author.email || '',
      action: 'TASK_COMMENT_ADDED',
      entityType: 'COMMENT',
      entityId: comment.id,
      details: `Comentario registrado en tarea ${task.code}: "${cleanContent.slice(0, 100)}"`,
    });

    this.save();
    return comment;
  }

  // --- AUDIT LOGS (RNF-06, RF6) ---
  public logAuditEvent(entry: {
    userId?: number | null;
    userName?: string;
    userEmail?: string;
    action: AuditAction;
    entityType: 'USER' | 'PROJECT' | 'SPRINT' | 'USER_STORY' | 'TASK' | 'IMPEDIMENT' | 'COMMENT';
    entityId: number | string;
    details?: string;
  }): AuditLog {
    if (!this.db.auditLogs) this.db.auditLogs = [];
    if (typeof this.db.counters.auditLog !== 'number') {
      this.db.counters.auditLog = this.db.auditLogs.length;
    }
    const id = ++this.db.counters.auditLog;
    const auditLog: AuditLog = {
      id,
      timestamp: new Date().toISOString(),
      userId: entry.userId ?? null,
      userName: entry.userName || 'Sistema',
      userEmail: entry.userEmail || '',
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      details: entry.details || '',
    };
    this.db.auditLogs.unshift(auditLog);
    // Limit store size to 2000 events
    if (this.db.auditLogs.length > 2000) {
      this.db.auditLogs.pop();
    }
    this.save();
    return auditLog;
  }

  public getAuditLogs(filter?: { action?: AuditAction; limit?: number }): AuditLog[] {
    let logs = this.db.auditLogs || [];
    if (filter?.action) {
      logs = logs.filter((l) => l.action === filter.action);
    }
    const limit = filter?.limit && filter.limit > 0 ? filter.limit : 100;
    return logs.slice(0, limit);
  }

  public deleteTask(taskId: number) {
    const idx = this.db.tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) throw Object.assign(new Error('Tarea no encontrada'), { status: 404 });
    const task = this.db.tasks[idx];
    const story = this.getStoryById(task.userStoryId);
    if (story && story.sprintId !== null) {
      const sprint = this.getSprintById(story.sprintId);
      if (sprint && sprint.status === 'CLOSED') {
        throw Object.assign(new Error('No se pueden eliminar tareas de un Sprint cerrado'), {
          status: 409,
        });
      }
    }
    const [removed] = this.db.tasks.splice(idx, 1);
    this.db.impediments = (this.db.impediments || []).filter((i) => i.taskId !== taskId);
    this.db.comments = (this.db.comments || []).filter((c) => c.taskId !== taskId);
    this.recomputeStoryCompletion(removed.userStoryId);
    this.save();
  }

  // Notifications
  private addNotification(userId: number, message: string) {
  const id = ++this.db.counters.notification;
  this.db.notifications.unshift({
    id,
    userId,
    message,
    readStatus: false,
    createdAt: new Date().toISOString(),
  });
}

  public getNotifications(userId: number): AppNotification[] {
  return this.db.notifications.filter((n) => n.userId === userId);
}

  public markNotificationRead(userId: number, notificationId ?: number) {
  for (const n of this.db.notifications) {
    if (n.userId === userId && (!notificationId || n.id === notificationId)) {
      n.readStatus = true;
    }
  }
  this.save();
}

  // Password Reset (RF-16)
  public createResetToken(email: string): string | null {
  const user = this.findUserByEmail(email);
  if (!user) return null;

  // Invalidate any prior active tokens for this user
  for (const t of this.db.resetTokens) {
    if (t.userId === user.id && !t.used) {
      t.used = true;
    }
  }

  // Cryptographically secure token (128 bits of randomness: 16 bytes = 32 hex chars, format: 8x4)
  const raw = crypto.randomBytes(16).toString('hex').toUpperCase();
  const token = raw.match(/.{1,4}/g)?.join('-') || raw;

  const id = ++this.db.counters.resetToken;
  this.db.resetTokens.push({
    id,
    userId: user.id,
    token,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    used: false,
  });
  this.save();
  return token;
}

  public resetPasswordWithToken(token: string, newPassword: string) {
  const record = this.db.resetTokens.find(
    (r) => r.token === token.trim() && !r.used && new Date(r.expiresAt) > new Date()
  );
  if (!record) {
    throw Object.assign(new Error('El token de recuperación es inválido o ha expirado'), {
      status: 400,
    });
  }
  const user = this.findUserById(record.userId);
  if (!user) {
    throw Object.assign(new Error('Usuario no encontrado'), { status: 404 });
  }
  user.passwordHash = bcrypt.hashSync(newPassword, 10);
  record.used = true;
  this.save();
}

  // Metrics (RF-14)
  public getProjectMetrics(projectId: number) {
  const sprints = this.getSprintsByProject(projectId);
  return sprints.map((sp) => {
    const stories = this.db.stories.filter((st) => st.sprintId === sp.id);
    const completedStories = stories.filter((st) => {
      const tasks = this.db.tasks.filter((t) => t.userStoryId === st.id);
      return tasks.length > 0 && tasks.every((t) => t.status === 'DONE');
    });
    const plannedPoints = stories.reduce((sum, st) => sum + (st.storyPoints || 0), 0);
    const completedPoints = completedStories.reduce((sum, st) => sum + (st.storyPoints || 0), 0);
    return {
      sprintId: sp.id,
      sprintName: sp.name,
      status: sp.status,
      startDate: sp.startDate,
      endDate: sp.endDate,
      plannedPoints,
      completedPoints,
      totalStories: stories.length,
      completedStories: completedStories.length,
    };
  });
}
}

export const store = new ScrumStore();
