import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { store } from '../server/store';
import { EpicManagerModal } from '../src/components/EpicManagerModal';
import { ImpedimentModal } from '../src/components/ImpedimentModal';
import { BacklogView } from '../src/components/BacklogView';
import { KanbanView } from '../src/components/KanbanView';
import { AuthProvider } from '../src/context/AuthContext';
import { ToastProvider } from '../src/context/ToastContext';
import type {
  ProjectSummary,
  Sprint,
  User,
  UserStory,
  TaskItem,
  Epic,
} from '../src/types/scrum';

const mockAdminUser: User = {
  id: 1,
  email: 'admin@velocity.dev',
  fullName: 'Elena Vance (Admin)',
  globalRole: 'ADMIN',
  title: 'Lead Architect',
};

const mockSmUser: User = {
  id: 3,
  email: 'sm@velocity.dev',
  fullName: 'Sofía Mendoza (SM)',
  globalRole: 'USER',
  title: 'Scrum Master',
};

const mockDevUser: User = {
  id: 4,
  email: 'dev1@velocity.dev',
  fullName: 'Lucas Herrera (Dev)',
  globalRole: 'USER',
  title: 'Senior Full Stack',
};

const mockSprintActive: Sprint = {
  id: 2,
  projectId: 1,
  name: 'Sprint 14 — Biometría & FIDO2',
  goal: 'Habilitar acceso por huella digital',
  startDate: '2026-11-02',
  endDate: '2026-11-16',
  status: 'ACTIVE',
};

const mockProjectSummary: ProjectSummary = {
  id: 1,
  code: 'CBA',
  name: 'Core Banking Auth v2',
  description: 'Plataforma de autenticación biométrica FIDO2 y OAuth2',
  createdAt: '2026-10-01',
  activeSprint: mockSprintActive,
  myRole: 'DEVELOPER',
  totalStories: 17,
  completedStories: 3,
  totalPoints: 76,
  completedPoints: 14,
  members: [
    { id: 1, userId: 1, projectId: 1, scrumRole: 'DEVELOPER', user: mockAdminUser },
    { id: 3, userId: 3, projectId: 1, scrumRole: 'SCRUM_MASTER', user: mockSmUser },
    { id: 4, userId: 4, projectId: 1, scrumRole: 'DEVELOPER', user: mockDevUser },
  ],
};

test('Gestión de Épicas e Impedimentos (RF3, RF5, RF6, HU #4, HU #9) - Suite Automatizada', async (t) => {
  let createdEpicId: number;
  let testStoryId: number;
  let testTaskId: number;
  let createdImpedimentId: number;

  await t.test('1. Épicas - Creación, validación de color hex y consulta por proyecto (RF3 / HU #4)', () => {
    // Validation: Name must be >= 3 chars
    assert.throws(
      () => store.createEpic(1, { name: 'AB', colorHex: '#8B5CF6' }),
      /al menos 3 caracteres/
    );

    // Validation: Hex color must match #RRGGBB
    assert.throws(
      () => store.createEpic(1, { name: 'Épica Inválida', colorHex: 'not-a-hex' }),
      /formato hexadecimal/
    );

    // Successful creation
    const epic = store.createEpic(1, {
      name: 'Arquitectura Cloud & Microservicios',
      description: 'Evolución de backend hacia arquitectura serverless distribuida',
      colorHex: '#10B981',
    });

    assert.ok(epic.id > 0, 'La Épica debe recibir un ID autoincremental');
    assert.equal(epic.name, 'Arquitectura Cloud & Microservicios');
    assert.equal(epic.colorHex, '#10B981');
    assert.equal(epic.projectId, 1);
    createdEpicId = epic.id;

    // Retrieve epics for project
    const projectEpics = store.getEpicsByProject(1);
    assert.ok(
      projectEpics.some((e) => e.id === createdEpicId),
      'La nueva Épica debe estar presente en el listado del proyecto'
    );
  });

  await t.test('2. Épicas - Vinculación con Historias de Usuario y enriquecimiento (RF3)', () => {
    // Create test user story linked to epic
    const story = store.createStory(1, {
      title: 'Historia vinculada a Épica Cloud',
      description: 'Como dev quiero desplegar en cluster Kubernetes',
      acceptanceCriteria: ['Cluster activo', 'Ingress configurado'],
      priority: 'HIGH',
      storyPoints: 8,
      epicId: createdEpicId,
    });

    testStoryId = story.id;
    assert.equal(story.epicId, createdEpicId);
    assert.ok(story.epic, 'La historia debe incluir el objeto epic enriquecido');
    assert.equal(story.epic?.name, 'Arquitectura Cloud & Microservicios');
    assert.equal(story.epic?.colorHex, '#10B981');

    // Update story to unlink epic
    const unlinked = store.updateStory(testStoryId, { epicId: null });
    assert.equal(unlinked.epicId, null);
    assert.equal(unlinked.epic, null);

    // Re-link epic
    const relinked = store.updateStory(testStoryId, { epicId: createdEpicId });
    assert.equal(relinked.epicId, createdEpicId);
    assert.equal(relinked.epic?.id, createdEpicId);
  });

  await t.test('3. Impedimentos - Registro en tarea Kanban y bloqueo de flujo (RF5 / HU #9)', () => {
    // Create a task under our test story
    const { task } = store.createTask(testStoryId, {
      description: 'Configurar manifiestos de Ingress TLS para Kubernetes',
      assignedToId: 4, // Lucas Herrera
    });
    testTaskId = task.id;

    assert.equal(task.hasActiveImpediment, false, 'Tarea nueva no debe tener impedimentos activos');

    // Validation: Description must be >= 5 chars
    assert.throws(
      () =>
        store.createImpediment(
          testTaskId,
          { id: 4, fullName: 'Lucas Herrera' },
          { description: 'Fail' }
        ),
      /al menos 5 caracteres/
    );

    // Register valid impediment
    const impediment = store.createImpediment(
      testTaskId,
      { id: 4, fullName: 'Lucas Herrera' },
      {
        description: 'Certificados TLS corporativos no han sido emitidos por el equipo de Seguridad',
      }
    );

    createdImpedimentId = impediment.id;
    assert.ok(impediment.id > 0);
    assert.equal(impediment.status, 'OPEN');
    assert.equal(impediment.taskId, testTaskId);

    // Verify task enrichment reflects open impediment
    const enrichedTask = store.getTaskById(testTaskId);
    assert.ok(enrichedTask, 'Tarea debe existir');
    assert.equal(
      enrichedTask.hasActiveImpediment,
      true,
      'hasActiveImpediment debe ser true al tener un impedimento abierto'
    );
  });

  await t.test('4. Regla Canónica Scrum (RF5) - Prohibido mover a HECHO (DONE) con impedimentos abiertos', () => {
    // Moving to IN_PROGRESS or TESTING is permitted with warnings
    const progressUpdate = store.updateTask(testTaskId, { status: 'IN_PROGRESS' });
    assert.equal(progressUpdate.task.status, 'IN_PROGRESS');

    // Moving to DONE MUST FAIL with HTTP 409 conflict
    assert.throws(
      () => store.updateTask(testTaskId, { status: 'DONE' }),
      (err: any) => {
        return (
          err.status === 409 &&
          err.message.includes('No se puede mover a Hecho una tarea con impedimentos abiertos')
        );
      },
      'Debe lanzar error 409 impidiendo pasar a DONE mientras exista impedimento abierto'
    );

    // Verify task remains in IN_PROGRESS
    const currentTask = store.getTaskById(testTaskId);
    assert.equal(currentTask?.status, 'IN_PROGRESS');
  });

  await t.test('5. Resolución de Impedimentos (RF6 / HU #9) - Scrum Master resuelve y desbloquea', () => {
    // Resolve impediment with resolution notes
    const resolved = store.resolveImpediment(
      createdImpedimentId,
      { id: 3, fullName: 'Sofía Mendoza (SM)' },
      {
        resolutionComment:
          'Se tramitó certificado TLS de emergencia con el CISO y se importó en Vault',
      }
    );

    assert.equal(resolved.status, 'RESOLVED');
    assert.equal(resolved.resolvedById, 3);
    assert.equal(resolved.resolverName, 'Sofía Mendoza (SM)');
    assert.ok(resolved.resolvedAt, 'resolvedAt debe contener timestamp ISO');
    assert.ok(resolved.resolutionComment?.includes('emergencia'));

    // Verify task is now unblocked
    const unblockedTask = store.getTaskById(testTaskId);
    assert.equal(
      unblockedTask?.hasActiveImpediment,
      false,
      'hasActiveImpediment debe ser false tras resolver todos los impedimentos'
    );

    // Now moving to DONE succeeds!
    const doneUpdate = store.updateTask(testTaskId, { status: 'DONE' });
    assert.equal(doneUpdate.task.status, 'DONE', 'La tarea puede completarse una vez resuelto el bloqueo');
  });

  await t.test('6. Épicas - Eliminación segura desvincula historias sin borrarlas (RF3)', () => {
    // Delete the test epic
    store.deleteEpic(createdEpicId);

    // Story still exists but epicId is now null
    const storyAfterDelete = store.getStoryById(testStoryId);
    assert.ok(storyAfterDelete, 'La historia debe conservarse en el Backlog');
    assert.equal(storyAfterDelete.epicId, null, 'El epicId de la historia debe pasar a null');
    assert.equal(storyAfterDelete.epic, null);

    // Clean up test data
    store.deleteTask(testTaskId);
    store.deleteStory(testStoryId);
  });

  await t.test('7. Renderizado UI - EpicManagerModal e ImpedimentModal', () => {
    // Render EpicManagerModal
    const epicsMock: Epic[] = [
      {
        id: 1,
        projectId: 1,
        name: 'Seguridad y Autenticación Central',
        description: 'Módulos FIDO2 y JWT',
        colorHex: '#8B5CF6',
        createdAt: '2026-10-01T00:00:00Z',
      },
    ];

    const epicModalHtml = renderToString(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          AuthProvider,
          null,
          React.createElement(EpicManagerModal, {
            open: true,
            projectId: 1,
            epics: epicsMock,
            canManage: true,
            onClose: () => {},
            onRefresh: async () => {},
          })
        )
      )
    );

    assert.ok(epicModalHtml.includes('Gestión de Épicas del Proyecto'));
    assert.ok(epicModalHtml.includes('Seguridad y Autenticación Central'));
    assert.ok(epicModalHtml.includes('#8B5CF6'));

    // Render ImpedimentModal
    const mockTask: TaskItem = {
      id: 99,
      code: 'TASK-99',
      userStoryId: 1,
      description: 'Integrar validador biométrico WebAuthn',
      status: 'IN_PROGRESS',
      assignedToId: 4,
      hasActiveImpediment: true,
      createdAt: '2026-11-01T00:00:00Z',
    };

    const impModalHtml = renderToString(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          AuthProvider,
          null,
          React.createElement(ImpedimentModal, {
            open: true,
            task: mockTask,
            projectId: 1,
            myRole: 'SCRUM_MASTER',
            onClose: () => {},
            onRefresh: async () => {},
          })
        )
      )
    );

    assert.ok(impModalHtml.includes('Impedimentos y Bloqueos'));
    assert.ok(impModalHtml.includes('TASK-99'));
    assert.ok(impModalHtml.includes('Reportar Nuevo Impedimento'));
    assert.ok(impModalHtml.includes('Registrar Bloqueo'));
  });
});
