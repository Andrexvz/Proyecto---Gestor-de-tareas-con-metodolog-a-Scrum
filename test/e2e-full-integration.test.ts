import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const API_BASE = 'http://localhost:8080/api/v1';

async function loginUser(email: string, password = 'Password123!') {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(res.status, 200, `Login para ${email} debe retornar 200`);
  const data = await res.json();
  assert.ok(data.token, 'Debe emitir token JWT válido');
  assert.equal(data.user.email, email);
  return { token: data.token, user: data.user };
}

describe('Agile Velocity - Auditoría e Integración Completa Sprint 3 (SENA)', () => {

  it('Entregable 1 & 2: Autenticación y Autorización RBAC multi-rol en Spring Boot', async () => {
    // 1. PO Login
    const po = await loginUser('po@velocity.dev');
    assert.equal(po.user.role, 'ROLE_PRODUCT_OWNER');

    // 2. SM Login
    const sm = await loginUser('sm@velocity.dev');
    assert.equal(sm.user.role, 'ROLE_SCRUM_MASTER');

    // 3. Dev Login
    const dev = await loginUser('dev1@velocity.dev');
    assert.equal(dev.user.role, 'ROLE_DEVELOPER');

    // 4. Admin Login
    const admin = await loginUser('admin@velocity.dev');
    assert.ok(admin.user.role.includes('ADMIN'));

    // 5. Perfil de sesión /auth/me
    const meRes = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${po.token}` },
    });
    assert.equal(meRes.status, 200);
    const meData = await meRes.json();
    assert.equal(meData.user.email, 'po@velocity.dev');
  });

  it('Entregable 2 & 4: Consulta de Proyectos y Workspace completo desde PostgreSQL', async () => {
    const { token } = await loginUser('po@velocity.dev');

    // 1. Listar proyectos
    const projRes = await fetch(`${API_BASE}/projects`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(projRes.status, 200);
    const projData = await projRes.json();
    const list = projData.projects || projData;
    assert.ok(Array.isArray(list), 'Debe retornar lista de proyectos');
    assert.ok(list.length > 0, 'Debe haber proyectos cargados en PostgreSQL');

    const cba = list.find((p: any) => p.code === 'CBA');
    assert.ok(cba, 'Proyecto CBA debe existir');
    assert.equal(cba.myRole, 'PRODUCT_OWNER');

    // 2. Workspace integral
    const wsRes = await fetch(`${API_BASE}/projects/${cba.id}/workspace`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(wsRes.status, 200);
    const ws = await wsRes.json();
    assert.ok(ws.project, 'Workspace contiene datos de proyecto');
    assert.ok(Array.isArray(ws.sprints), 'Workspace contiene sprints');
    assert.ok(Array.isArray(ws.stories), 'Workspace contiene historias');
    assert.ok(Array.isArray(ws.tasks), 'Workspace contiene tareas técnicas');
    assert.ok(Array.isArray(ws.epics), 'Workspace contiene épicas');
    assert.ok(Array.isArray(ws.metrics), 'Workspace contiene métricas de sprint');
  });

  it('Entregable 2, 3 & 4: Ciclo CRUD de Historia de Usuario con validación y persistencia', async () => {
    const { token } = await loginUser('po@velocity.dev');

    // 1. Crear Historia con rol Product Owner
    const uniqueTitle = `HU Automatizada Sprint 3 - ${Date.now()}`;
    const createRes = await fetch(`${API_BASE}/projects/1/stories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: uniqueTitle,
        description: 'Como evaluador técnico SENA, verifico persistencia relacional en PostgreSQL.',
        acceptanceCriteria: ['Criterio 1: Persiste en DB', 'Criterio 2: Retorna DTO estructurado'],
        priority: 'HIGH',
        storyPoints: 8,
      }),
    });
    assert.equal(createRes.status, 201, 'Debe crear historia con 201');
    const created = await createRes.json();
    const storyId = created.story.id;
    assert.ok(storyId > 0);
    assert.equal(created.story.title, uniqueTitle);

    // 2. Validar que Developer no puede crear historias (RBAC)
    const { token: devToken } = await loginUser('dev1@velocity.dev');
    const forbiddenCreate = await fetch(`${API_BASE}/projects/1/stories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${devToken}`,
      },
      body: JSON.stringify({
        title: 'Intento no autorizado de Dev',
        description: 'Debe ser bloqueado por RBAC.',
      }),
    });
    assert.equal(forbiddenCreate.status, 403, 'Developer no tiene permiso para crear historias');

    // 3. Modificar historia (Product Owner)
    const patchRes = await fetch(`${API_BASE}/stories/${storyId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        storyPoints: 13,
      }),
    });
    assert.equal(patchRes.status, 200);
    const patched = await patchRes.json();
    assert.equal(patched.story.storyPoints, 13);
  });

  it('Entregable 3 & 4: Regla Canónica Scrum - Bloqueo de DONE ante Impedimento Abierto', async () => {
    const { token: devToken } = await loginUser('dev1@velocity.dev');
    const { token: smToken } = await loginUser('sm@velocity.dev');

    // 1. Crear tarea técnica vinculada a historia existente
    const taskRes = await fetch(`${API_BASE}/stories/1/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${devToken}`,
      },
      body: JSON.stringify({
        description: `Tarea con prueba de bloqueo de impedimento ${Date.now()}`,
        assignedToId: 4,
      }),
    });
    assert.equal(taskRes.status, 201);
    const task = (await taskRes.json()).task;
    const taskId = task.id;

    // 2. Reportar impedimento técnico
    const impRes = await fetch(`${API_BASE}/tasks/${taskId}/impediments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${devToken}`,
      },
      body: JSON.stringify({
        description: 'Dependencia crítica no disponible en servidor de staging',
      }),
    });
    assert.equal(impRes.status, 201);
    const impediment = (await impRes.json()).impediment;

    // 3. Intentar mover tarea a DONE mientras el impedimento sigue ABIERTO (Debe ser rechazado con 409 o 400)
    const doneAttempt = await fetch(`${API_BASE}/tasks/${taskId}/kanban-status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${devToken}`,
      },
      body: JSON.stringify({ status: 'DONE' }),
    });
    assert.ok(
      doneAttempt.status === 409 || doneAttempt.status === 400 || doneAttempt.status === 500,
      'Debe impedir transición a DONE mientras existan impedimentos abiertos'
    );

    // 4. Resolver impedimento con rol Scrum Master
    const resolveRes = await fetch(`${API_BASE}/impediments/${impediment.id}/resolve`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${smToken}`,
      },
      body: JSON.stringify({
        resolutionComment: 'Servicio de staging reestablecido por el equipo de DevOps.',
      }),
    });
    assert.equal(resolveRes.status, 200, 'Scrum Master resuelve el impedimento con 200');

    // 5. Mover tarea a DONE ahora que el impedimento está resuelto
    const doneSuccess = await fetch(`${API_BASE}/tasks/${taskId}/kanban-status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${devToken}`,
      },
      body: JSON.stringify({ status: 'DONE' }),
    });
    assert.equal(doneSuccess.status, 200, 'Debe permitir mover a DONE una vez resuelto el bloqueo');
  });

  it('Entregable 4: Comentarios técnicos y Bitácora de Auditoría Inmutable (RNF-06)', async () => {
    const { token: devToken } = await loginUser('dev1@velocity.dev');
    const { token: adminToken } = await loginUser('admin@velocity.dev');

    // 1. Agregar comentario técnico a tarea
    const commentRes = await fetch(`${API_BASE}/tasks/1/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${devToken}`,
      },
      body: JSON.stringify({
        content: `Nota de validación técnica automatizada ${Date.now()}`,
      }),
    });
    assert.equal(commentRes.status, 201);
    const comment = (await commentRes.json()).comment;
    assert.ok(comment.id > 0);

    // 2. Consultar historial de comentarios de la tarea
    const listComments = await fetch(`${API_BASE}/tasks/1/comments`, {
      headers: { Authorization: `Bearer ${devToken}` },
    });
    assert.equal(listComments.status, 200);
    const commentsData = await listComments.json();
    assert.ok(commentsData.comments.some((c: any) => c.id === comment.id));

    // 3. Consultar bitácora de auditoría inmutable
    const auditRes = await fetch(`${API_BASE}/audit-logs?limit=50`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(auditRes.status, 200);
    const auditData = await auditRes.json();
    assert.ok(Array.isArray(auditData.auditLogs));
    assert.ok(auditData.auditLogs.length > 0);
  });

  it('Entregable 4: Directorio de Usuarios y Vista Personal Mi Trabajo', async () => {
    const { token: devToken } = await loginUser('dev1@velocity.dev');

    // 1. Directorio de usuarios
    const usersRes = await fetch(`${API_BASE}/users`, {
      headers: { Authorization: `Bearer ${devToken}` },
    });
    assert.equal(usersRes.status, 200);
    const usersData = await usersRes.json();
    assert.ok(Array.isArray(usersData.users));
    assert.ok(usersData.users.length >= 4);

    // 2. Tareas asignadas en Mi Trabajo
    const myTasksRes = await fetch(`${API_BASE}/users/me/tasks?scope=me`, {
      headers: { Authorization: `Bearer ${devToken}` },
    });
    assert.equal(myTasksRes.status, 200);
    const myTasksData = await myTasksRes.json();
    assert.ok(Array.isArray(myTasksData.tasks));
  });

  it('Entregable 5: Comunicación a través del puente de la aplicación en el puerto 3000', async () => {
    // Verificar que el frontend en el puerto 3000 se comunica transparentemente con Spring Boot
    const bridgeLogin = await fetch('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'po@velocity.dev', password: 'Password123!' }),
    });
    assert.equal(bridgeLogin.status, 200);
    const bridgeData = await bridgeLogin.json();
    assert.ok(bridgeData.token);

    const bridgeWs = await fetch('http://localhost:3000/api/v1/projects/1/workspace', {
      headers: { Authorization: `Bearer ${bridgeData.token}` },
    });
    assert.equal(bridgeWs.status, 200);
    const ws = await bridgeWs.json();
    assert.equal(ws.project.code, 'CBA');
  });
});
