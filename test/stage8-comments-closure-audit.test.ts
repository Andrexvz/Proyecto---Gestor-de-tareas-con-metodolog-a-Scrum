import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { store } from '../server/store';
import { AuditLogModal } from '../src/components/AuditLogModal';
import { SprintsView } from '../src/components/SprintsView';
import { KanbanView } from '../src/components/KanbanView';
import { ImpedimentModal } from '../src/components/ImpedimentModal';
import { AuthProvider } from '../src/context/AuthContext';
import { ToastProvider } from '../src/context/ToastContext';
import type {
  ProjectSummary,
  Sprint,
  User,
  UserStory,
  TaskItem,
} from '../src/types/scrum';

const mockUserSM: User = {
  id: 3,
  email: 'sm@velocity.dev',
  fullName: 'Sofía Mendoza (SM)',
  globalRole: 'USER',
  title: 'Scrum Master',
};

const mockUserDev: User = {
  id: 4,
  email: 'dev1@velocity.dev',
  fullName: 'Lucas Herrera (Dev)',
  globalRole: 'USER',
  title: 'Senior Full Stack',
};

const mockActiveSprint: Sprint = {
  id: 2,
  projectId: 1,
  name: 'Sprint 14 — Biometría & FIDO2',
  goal: 'Habilitar acceso por huella digital',
  startDate: '2026-11-02',
  endDate: '2026-11-16',
  status: 'ACTIVE',
};

const mockPlanningSprint: Sprint = {
  id: 3,
  projectId: 1,
  name: 'Sprint 15 — Notificaciones Push & Webhooks',
  goal: 'Integración de webhooks transaccionales',
  startDate: '2026-11-17',
  endDate: '2026-12-01',
  status: 'PLANNING',
};

const mockProject: ProjectSummary = {
  id: 1,
  code: 'CBA',
  name: 'Core Banking Auth v2',
  description: 'Plataforma de autenticación biométrica',
  createdAt: '2026-10-01',
  activeSprint: mockActiveSprint,
  myRole: 'SCRUM_MASTER',
  totalStories: 2,
  completedStories: 1,
  totalPoints: 8,
  completedPoints: 5,
  members: [
    { id: 1, userId: 3, projectId: 1, scrumRole: 'SCRUM_MASTER', user: mockUserSM },
    { id: 2, userId: 4, projectId: 1, scrumRole: 'DEVELOPER', user: mockUserDev },
  ],
};

test('HU #12: Task comments can be created with author details and timestamp', () => {
  const tasks = store.getTasksByProject(1);
  assert.ok(tasks.length > 0, 'Project 1 must have tasks');
  const targetTask = tasks[0];

  const comment = store.createTaskComment(
    targetTask.id,
    { id: mockUserDev.id, fullName: mockUserDev.fullName, email: mockUserDev.email },
    'Investigando fallo en el intercambio de tokens PKCE'
  );

  assert.ok(comment.id > 0);
  assert.equal(comment.taskId, targetTask.id);
  assert.equal(comment.authorId, mockUserDev.id);
  assert.equal(comment.authorName, mockUserDev.fullName);
  assert.ok(comment.createdAt);
  assert.equal(comment.content, 'Investigando fallo en el intercambio de tokens PKCE');

  const comments = store.getCommentsByTask(targetTask.id);
  const found = comments.find((c) => c.id === comment.id);
  assert.ok(found, 'Created comment should be found in task comments list');
});

test('HU #12: Empty or whitespace-only comments are rejected with 400', () => {
  const tasks = store.getTasksByProject(1);
  const targetTask = tasks[0];

  assert.throws(
    () => {
      store.createTaskComment(
        targetTask.id,
        { id: mockUserDev.id, fullName: mockUserDev.fullName },
        '   '
      );
    },
    (err: any) => err.status === 400
  );
});

test('HU #12: Comments exceeding 1000 characters are rejected with 400', () => {
  const tasks = store.getTasksByProject(1);
  const targetTask = tasks[0];
  const longContent = 'A'.repeat(1001);

  assert.throws(
    () => {
      store.createTaskComment(
        targetTask.id,
        { id: mockUserDev.id, fullName: mockUserDev.fullName },
        longContent
      );
    },
    (err: any) => err.status === 400
  );
});

test('RF6 & HU #10: Sprint closure computes velocity from 100% completed stories only', () => {
  // 1. Create a dedicated test project and sprint
  const proj = store.createProject(
    { name: 'Velocity Calc Test', description: 'Test project for sprint closure' },
    1
  );
  const sprint = store.createSprint(proj.id, {
    name: 'Sprint Test Velocity',
    goal: 'Verificar cálculo de velocidad estricta',
    startDate: '2026-11-01',
    endDate: '2026-11-15',
  });
  store.startSprint(sprint.id);

  // 2. Story 1: 5 points, 1 task -> DONE (100% completed)
  const story1 = store.createStory(proj.id, {
    title: 'Historia Completa',
    description: 'Historia 100% terminada',
    storyPoints: 5,
    priority: 'HIGH',
  });
  store.assignStoryToSprint(story1.id, sprint.id);
  const { task: task1 } = store.createTask(story1.id, { description: 'Tarea completa de story 1' });
  store.updateTask(task1.id, { status: 'DONE' });

  // 3. Story 2: 3 points, 2 tasks -> 1 DONE, 1 IN_PROGRESS (partially completed, NOT 100%)
  const story2 = store.createStory(proj.id, {
    title: 'Historia Parcial',
    description: 'Historia incompleta',
    storyPoints: 3,
    priority: 'MEDIUM',
  });
  store.assignStoryToSprint(story2.id, sprint.id);
  const { task: task2a } = store.createTask(story2.id, { description: 'Tarea 2a Done' });
  const { task: task2b } = store.createTask(story2.id, { description: 'Tarea 2b En progreso' });
  store.updateTask(task2a.id, { status: 'DONE' });
  store.updateTask(task2b.id, { status: 'IN_PROGRESS' });

  // 4. Close sprint
  const summary = store.closeSprint(sprint.id, {
    destination: 'BACKLOG',
    actor: { id: mockUserSM.id, fullName: mockUserSM.fullName },
  });

  // Strict Scrum check: Only story1 (5 points) delivered. Story2 (3 points) NOT delivered.
  assert.equal(summary.velocity, 5, 'Velocity must be 5 (only 100% completed stories)');
  assert.equal(summary.deliveredPoints, 5);
  assert.equal(summary.plannedPoints, 8);
  assert.equal(summary.completedStoriesCount, 1);
  assert.equal(summary.returnedStoriesCount, 1);

  // Verify sprint record persistence
  const closedSprint = store.getSprintById(sprint.id);
  assert.ok(closedSprint);
  assert.equal(closedSprint.status, 'CLOSED');
  assert.equal(closedSprint.velocity, 5);
  assert.equal(closedSprint.deliveredPoints, 5);
  assert.equal(closedSprint.plannedPoints, 8);

  // Incomplete story returned to backlog (sprintId === null)
  const updatedStory2 = store.getStoryById(story2.id);
  assert.equal(updatedStory2?.sprintId, null, 'Incomplete story returned to backlog');

  // Attempt to close an already closed sprint throws 409
  assert.throws(
    () => {
      store.closeSprint(sprint.id);
    },
    (err: any) => err.status === 409
  );
});

test('RF6 & HU #10: Incomplete stories can be migrated to target planning sprint', () => {
  const proj = store.createProject(
    { name: 'Migration Target Test', description: 'Sprint migration test' },
    1
  );
  const sprintA = store.createSprint(proj.id, {
    name: 'Sprint A',
    goal: 'Sprint A',
    startDate: '2026-11-01',
    endDate: '2026-11-15',
  });
  const sprintB = store.createSprint(proj.id, {
    name: 'Sprint B',
    goal: 'Sprint B en planning',
    startDate: '2026-11-16',
    endDate: '2026-11-30',
  });
  store.startSprint(sprintA.id);

  const story = store.createStory(proj.id, {
    title: 'Historia para transferir a Sprint B',
    description: 'Pendiente de entrega',
    storyPoints: 8,
  });
  store.assignStoryToSprint(story.id, sprintA.id);
  const { task } = store.createTask(story.id, { description: 'Tarea pendiente' });
  store.updateTask(task.id, { status: 'IN_PROGRESS' });

  const summary = store.closeSprint(sprintA.id, {
    destination: 'NEXT_SPRINT',
    targetSprintId: sprintB.id,
    actor: { id: mockUserSM.id, fullName: mockUserSM.fullName },
  });

  assert.equal(summary.returnedStoriesCount, 1);
  assert.equal(summary.targetDestination, 'Sprint B');

  const updatedStory = store.getStoryById(story.id);
  assert.equal(updatedStory?.sprintId, sprintB.id, 'Story migrated into Sprint B');
});

test('RNF-06: Inmutable audit logs record critical events', () => {
  // Test user creation event
  const testEmail = `audit_test_${Date.now()}@velocity.dev`;
  const newUser = store.createUser({
    email: testEmail,
    password: 'password123',
    fullName: 'Usuario Auditoría',
    globalRole: 'USER',
  });
  assert.ok(newUser.id);

  const logs = store.getAuditLogs({ limit: 50 });
  const userCreatedLog = logs.find(
    (l) => l.action === 'USER_CREATED' && l.entityId === newUser.id
  );
  assert.ok(userCreatedLog, 'USER_CREATED audit log must exist');
  assert.equal(userCreatedLog.entityType, 'USER');
  assert.ok(userCreatedLog.timestamp);

  // Check sprint closure audit log from previous test
  const sprintClosedLogs = store.getAuditLogs({ action: 'SPRINT_CLOSED' });
  assert.ok(sprintClosedLogs.length > 0, 'SPRINT_CLOSED audit log must exist');
  assert.equal(sprintClosedLogs[0].action, 'SPRINT_CLOSED');
  assert.equal(sprintClosedLogs[0].entityType, 'SPRINT');

  // Check task comment audit log
  const commentLogs = store.getAuditLogs({ action: 'TASK_COMMENT_ADDED' });
  assert.ok(commentLogs.length > 0, 'TASK_COMMENT_ADDED audit log must exist');
});

test('UI: AuditLogModal renders cleanly without errors', () => {
  const html = renderToString(
    React.createElement(AuditLogModal, { open: true, onClose: () => {} })
  );
  assert.ok(html.includes('Registro de Auditoría y Seguridad'));
  assert.ok(html.includes('RNF-06'));
  assert.ok(html.includes('Todos los eventos'));
});

test('UI: SprintsView renders destination options in close sprint modal context', () => {
  const html = renderToString(
    React.createElement(
      ToastProvider,
      null,
      React.createElement(
        AuthProvider,
        null,
        React.createElement(SprintsView, {
          project: mockProject,
          sprints: [mockActiveSprint, mockPlanningSprint],
          stories: [],
          onRefresh: async () => {},
          onGoToKanban: () => {},
        })
      )
    )
  );
  assert.ok(html.includes('Planificación y Gestión de Sprints'));
  assert.ok(html.includes('Sprint 14'));
});

test('Matriz de Permisos SRS v2.0 - Reglas 1 y 2: Lectura y Publicación de comentarios (HU #12)', () => {
  const adminUser = store.findUserByEmail('admin@velocity.dev')!;
  const poUser = store.findUserByEmail('po@velocity.dev')!;
  const smUser = store.findUserByEmail('sm@velocity.dev')!;
  const devUser = store.findUserByEmail('dev1@velocity.dev')!;
  const outsider = {
    id: 999,
    email: 'outsider@velocity.dev',
    fullName: 'Usuario No Miembro',
    passwordHash: '',
    globalRole: 'USER' as const,
    title: 'Externo',
    createdAt: '2026-11-01',
  };

  // Regla 1: Lectura de comentarios permitida para todos los miembros autorizados y admin
  assert.equal(store.canReadComments(devUser, 1), true, 'Developer debe tener lectura de comentarios');
  assert.equal(store.canReadComments(smUser, 1), true, 'Scrum Master debe tener lectura de comentarios');
  assert.equal(store.canReadComments(poUser, 1), true, 'Product Owner debe tener lectura de comentarios');
  assert.equal(store.canReadComments(adminUser, 1), true, 'Admin debe tener lectura autorizada de comentarios');
  assert.equal(store.canReadComments(outsider, 1), false, 'Usuario externo no debe tener acceso de lectura');

  // Regla 2: Publicación de comentarios estrictamente reservada a Developer y Scrum Master
  assert.equal(store.canPostComment(devUser, 1), true, 'Developer puede publicar comentarios');
  assert.equal(store.canPostComment(smUser, 1), true, 'Scrum Master puede publicar comentarios');
  assert.equal(store.canPostComment(poUser, 1), false, 'Product Owner NO puede publicar comentarios por su rol');
  assert.equal(store.canPostComment(adminUser, 1), false, 'Admin NO recibe permisos automáticos de escritura');
  assert.equal(store.canPostComment(outsider, 1), false, 'Usuario externo NO puede publicar comentarios');
});

test('Matriz de Permisos SRS v2.0 - Regla 3: Registro y Resolución de Impedimentos (RF5, RF6, HU #9)', () => {
  const adminUser = store.findUserByEmail('admin@velocity.dev')!;
  const poUser = store.findUserByEmail('po@velocity.dev')!;
  const smUser = store.findUserByEmail('sm@velocity.dev')!;
  const devUser = store.findUserByEmail('dev1@velocity.dev')!;
  const outsider = {
    id: 999,
    email: 'outsider@velocity.dev',
    fullName: 'Usuario No Miembro',
    passwordHash: '',
    globalRole: 'USER' as const,
    title: 'Externo',
    createdAt: '2026-11-01',
  };

  // Registro de impedimentos: Developer y Scrum Master
  assert.equal(store.canReportImpediment(devUser, 1), true, 'Developer puede reportar impedimentos');
  assert.equal(store.canReportImpediment(smUser, 1), true, 'Scrum Master puede reportar impedimentos');
  assert.equal(store.canReportImpediment(poUser, 1), false, 'Product Owner NO puede reportar impedimentos');
  assert.equal(store.canReportImpediment(adminUser, 1), false, 'Admin NO puede reportar impedimentos');
  assert.equal(store.canReportImpediment(outsider, 1), false, 'Usuario externo NO puede reportar impedimentos');

  // Resolución de impedimentos: Exclusivo del Scrum Master (RF6)
  assert.equal(store.canResolveImpediment(smUser, 1), true, 'Solo Scrum Master puede resolver impedimentos');
  assert.equal(store.canResolveImpediment(devUser, 1), false, 'Developer NO puede resolver impedimentos');
  assert.equal(store.canResolveImpediment(poUser, 1), false, 'Product Owner NO puede resolver impedimentos');
  assert.equal(store.canResolveImpediment(adminUser, 1), false, 'Admin NO recibe privilegios automáticos de Scrum Master');
  assert.equal(store.canResolveImpediment(outsider, 1), false, 'Usuario externo NO puede resolver impedimentos');
});

test('Matriz de Permisos SRS v2.0 - Regla 4: Cierre de Sprints Exclusivo de Scrum Master (RF6, HU #10)', () => {
  const adminUser = store.findUserByEmail('admin@velocity.dev')!;
  const poUser = store.findUserByEmail('po@velocity.dev')!;
  const smUser = store.findUserByEmail('sm@velocity.dev')!;
  const devUser = store.findUserByEmail('dev1@velocity.dev')!;
  const outsider = {
    id: 999,
    email: 'outsider@velocity.dev',
    fullName: 'Usuario No Miembro',
    passwordHash: '',
    globalRole: 'USER' as const,
    title: 'Externo',
    createdAt: '2026-11-01',
  };

  // Cierre de Sprints restringido al Scrum Master del proyecto
  assert.equal(store.canCloseSprint(smUser, 1), true, 'Scrum Master puede cerrar Sprints');
  assert.equal(store.canCloseSprint(devUser, 1), false, 'Developer NO puede cerrar Sprints');
  assert.equal(store.canCloseSprint(poUser, 1), false, 'Product Owner NO puede cerrar Sprints');
  assert.equal(store.canCloseSprint(adminUser, 1), false, 'Admin NO tiene privilegios automáticos de cierre');
  assert.equal(store.canCloseSprint(outsider, 1), false, 'Usuario externo NO puede cerrar Sprints');
});

test('Matriz de Permisos SRS v2.0 - Regla 5: Acceso al Historial de Auditoría (RNF-06)', () => {
  const adminUser = store.findUserByEmail('admin@velocity.dev')!;
  const poUser = store.findUserByEmail('po@velocity.dev')!;
  const smUser = store.findUserByEmail('sm@velocity.dev')!;
  const devUser = store.findUserByEmail('dev1@velocity.dev')!;
  const outsider = {
    id: 999,
    email: 'outsider@velocity.dev',
    fullName: 'Usuario No Miembro',
    passwordHash: '',
    globalRole: 'USER' as const,
    title: 'Externo',
    createdAt: '2026-11-01',
  };

  // Auditoría: Admin y Scrum Master
  assert.equal(store.canViewAuditLogs(adminUser), true, 'Admin tiene acceso a auditoría');
  assert.equal(store.canViewAuditLogs(smUser), true, 'Scrum Master tiene acceso a auditoría');
  assert.equal(store.canViewAuditLogs(devUser), false, 'Developer NO tiene acceso a auditoría');
  assert.equal(store.canViewAuditLogs(poUser), false, 'Product Owner NO tiene acceso a auditoría');
  assert.equal(store.canViewAuditLogs(outsider), false, 'Usuario externo NO tiene acceso a auditoría');
});

test('UI Security: SprintsView solo renderiza Finalizar Sprint cuando myRole === SCRUM_MASTER', () => {
  const projectAsDev: ProjectSummary = { ...mockProject, myRole: 'DEVELOPER' };
  const htmlDev = renderToString(
    React.createElement(
      ToastProvider,
      null,
      React.createElement(
        AuthProvider,
        null,
        React.createElement(SprintsView, {
          project: projectAsDev,
          sprints: [mockActiveSprint, mockPlanningSprint],
          stories: [],
          onRefresh: async () => {},
          onGoToKanban: () => {},
        })
      )
    )
  );
  assert.ok(!htmlDev.includes('Finalizar Sprint'), 'Developer NO debe ver el botón Finalizar Sprint');

  const projectAsSM: ProjectSummary = { ...mockProject, myRole: 'SCRUM_MASTER' };
  const htmlSM = renderToString(
    React.createElement(
      ToastProvider,
      null,
      React.createElement(
        AuthProvider,
        null,
        React.createElement(SprintsView, {
          project: projectAsSM,
          sprints: [mockActiveSprint, mockPlanningSprint],
          stories: [],
          onRefresh: async () => {},
          onGoToKanban: () => {},
        })
      )
    )
  );
  assert.ok(htmlSM.includes('Finalizar Sprint'), 'Scrum Master DEBE ver el botón Finalizar Sprint');
});

test('UI Security: ImpedimentModal adapta acciones según rol (SM puede resolver, Dev puede reportar, PO solo lee)', () => {
  const dummyTask: TaskItem = {
    id: 10,
    code: 'CBA-102-1',
    userStoryId: 2,
    assignedToId: 4,
    status: 'IN_PROGRESS',
    description: 'Implementar interfaz de enrolamiento FIDO2',
    createdAt: '2026-11-01',
    hasActiveImpediment: true,
    impediments: [
      {
        id: 101,
        taskId: 10,
        description: 'Fallo de conectividad con HSM biométrico',
        status: 'OPEN',
        createdById: 4,
        creatorName: 'Lucas Herrera',
        createdAt: '2026-11-01T10:00:00.000Z',
        resolvedById: null,
        resolverName: null,
        resolvedAt: null,
        resolutionComment: null,
      },
    ],
  };

  const renderModalWithProviders = (myRole: any) =>
    renderToString(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          AuthProvider,
          null,
          React.createElement(ImpedimentModal, {
            open: true,
            onClose: () => {},
            task: dummyTask,
            projectId: 1,
            myRole,
            onRefresh: async () => {},
          })
        )
      )
    );

  // Developer view: Can report, cannot resolve
  const htmlDev = renderModalWithProviders('DEVELOPER');
  assert.ok(htmlDev.includes('Reportar Nuevo Impedimento'), 'Developer puede reportar impedimentos');
  assert.ok(!htmlDev.includes('Resolución del Scrum Master (RF6 / HU #9)'), 'Developer NO ve formulario de resolución');

  // Scrum Master view: Can report and can resolve
  const htmlSM = renderModalWithProviders('SCRUM_MASTER');
  assert.ok(htmlSM.includes('Reportar Nuevo Impedimento'), 'Scrum Master puede reportar impedimentos');
  assert.ok(htmlSM.includes('Resolver'), 'Scrum Master tiene disponible acción de resolución');

  // Product Owner view: Read-only mode
  const htmlPO = renderModalWithProviders('PRODUCT_OWNER');
  assert.ok(!htmlPO.includes('Reportar Nuevo Impedimento'), 'Product Owner NO ve formulario de creación');
  assert.ok(htmlPO.includes('Modo lectura'), 'Product Owner ve mensaje informativo de modo lectura');
});
