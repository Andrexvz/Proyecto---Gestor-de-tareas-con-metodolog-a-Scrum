import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { DashboardView } from '../src/components/DashboardView.js';
import { BacklogView } from '../src/components/BacklogView.js';
import { StoryModal } from '../src/components/StoryModal.js';
import { KanbanView } from '../src/components/KanbanView.js';
import { ToastProvider } from '../src/context/ToastContext.js';
import { AuthProvider } from '../src/context/AuthContext.js';
import type {
  ProjectSummary,
  Sprint,
  TaskItem,
  User,
  UserStory,
} from '../src/types/scrum.js';

const mockAdminUser: User = {
  id: 1,
  email: 'admin@velocity.dev',
  fullName: 'Ada Lovelace (Admin)',
  globalRole: 'ADMIN',
  title: 'Lead Architect',
};

const mockSprintActive: Sprint = {
  id: 201,
  projectId: 101,
  name: 'Sprint 1 - Core Flow',
  goal: 'Desplegar arquitectura base y autenticación',
  startDate: '2026-02-01',
  endDate: '2026-02-15',
  status: 'ACTIVE',
};

const mockProject: ProjectSummary = {
  id: 101,
  name: 'Plataforma Core Scrum',
  code: 'CORE',
  description: 'Sistema principal de gestión ágil',
  createdAt: '2026-01-01',
  activeSprint: mockSprintActive,
  myRole: 'ADMIN',
  totalStories: 6,
  completedStories: 2,
  totalPoints: 24,
  completedPoints: 8,
  members: [
    {
      id: 1,
      userId: 1,
      projectId: 101,
      scrumRole: 'PRODUCT_OWNER',
      user: mockAdminUser,
    },
  ],
};

const mockStory: UserStory = {
  id: 301,
  projectId: 101,
  sprintId: 201,
  code: 'CORE-1',
  title: 'Autenticación con Huella Digital',
  description: 'Como usuario, quiero ingresar con huella dactilar para agilizar el acceso.',
  acceptanceCriteria: ['Validar sensor biométrico', 'Almacenar token en sesión cifrada'],
  priority: 'HIGH',
  storyPoints: 5,
  isCompleted: false,
  createdAt: '2026-01-02',
};

const mockTask: TaskItem = {
  id: 401,
  userStoryId: 301,
  code: 'TASK-1',
  description: 'Implementar endpoint POST /api/v1/auth/biometric',
  status: 'IN_PROGRESS',
  assignedToId: 1,
  createdAt: '2026-01-03',
};

test('Vistas Principales (Etapa 3) - Suite Automatizada', async (t) => {
  await t.test('1. DashboardView - renderizado de estadísticas y tarjetas de proyectos', () => {
    const html = renderToString(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          AuthProvider,
          { initialUser: mockAdminUser },
          React.createElement(DashboardView, {
            projects: [mockProject],
            users: [mockAdminUser],
            loading: false,
            loadError: '',
            onRetry: () => {},
            onOpenProject: () => {},
            onRefreshProjects: async () => {},
          })
        )
      )
    );

    assert.ok(html.includes('Dashboard de Proyectos Scrum'), 'Debe renderizar el título del Dashboard');
    assert.ok(html.includes('Proyectos Activos'), 'Debe incluir la tarjeta de estadística de proyectos');
    assert.ok(html.includes('Sprints en Curso'), 'Debe incluir la tarjeta de estadística de Sprints');
    assert.ok(html.includes('Historias de Usuario'), 'Debe incluir la estadística de historias');
    assert.ok(html.includes('Entrega de Puntos'), 'Debe incluir la estadística de Story Points');
    assert.ok(html.includes('Plataforma Core Scrum'), 'Debe listar el proyecto');
    assert.ok(html.includes('CORE'), 'Debe mostrar el código prefijo del proyecto');
    assert.ok(html.includes('Sprint 1 - Core Flow'), 'Debe mostrar el Sprint activo');
    assert.ok(html.includes('Kanban'), 'Debe incluir botón de acceso rápido a Kanban');
    assert.ok(html.includes('Backlog'), 'Debe incluir botón de acceso rápido a Backlog');
  });

  await t.test('2. DashboardView - estado vacío cuando no existen proyectos', () => {
    const html = renderToString(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          AuthProvider,
          { initialUser: mockAdminUser },
          React.createElement(DashboardView, {
            projects: [],
            users: [mockAdminUser],
            loading: false,
            loadError: '',
            onRetry: () => {},
            onOpenProject: () => {},
            onRefreshProjects: async () => {},
          })
        )
      )
    );

    assert.ok(html.includes('Todavía no hay proyectos registrados'), 'Debe renderizar mensaje amigable de estado vacío');
    assert.ok(html.includes('Crear primer proyecto'), 'Debe ofrecer llamada a la acción para crear proyecto');
  });

  await t.test('3. BacklogView - renderizado de lista de historias, filtros y ordenamiento', () => {
    const html = renderToString(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(BacklogView, {
          project: mockProject,
          sprints: [mockSprintActive],
          stories: [mockStory],
          tasks: [mockTask],
          loading: false,
          onNewStory: () => {},
          onEditStory: () => {},
          onGoToSprints: () => {},
          onRefresh: async () => {},
        })
      )
    );

    assert.ok(html.includes('Product Backlog'), 'Debe renderizar el título');
    assert.ok(html.includes('CORE-1'), 'Debe renderizar el código de la historia');
    assert.ok(html.includes('Autenticación con Huella Digital'), 'Debe renderizar el título de la historia');
    assert.ok(html.includes('Buscar por código, título o descripción'), 'Debe incluir campo de búsqueda');
    assert.ok(html.includes('Sin Sprint'), 'Debe tener filtro de alcance');
    assert.ok(html.includes('Orden por defecto'), 'Debe incluir opciones interactivas de ordenamiento');
  });

  await t.test('4. StoryModal - renderizado del modal, asistente IA y estimación', () => {
    const html = renderToString(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(StoryModal, {
          open: true,
          projectId: 101,
          canUseAi: true,
          editingStory: mockStory,
          onClose: () => {},
          onSaved: async () => {},
        })
      )
    );

    assert.ok(html.includes('Editar historia · CORE-1'), 'Debe mostrar el título del modal');
    assert.ok(html.includes('Asistencia IA'), 'Debe mostrar el botón de asistencia con IA');
    assert.ok(html.includes('Criterios de Aceptación'), 'Debe mostrar sección de criterios de aceptación');
    assert.ok(html.includes('Prioridad'), 'Debe incluir selector de prioridad');
    assert.ok(html.includes('Story Points'), 'Debe incluir estimación en Story Points');
    assert.ok(html.includes('Guardar historia'), 'Debe incluir botón de confirmación de guardado');
  });

  await t.test('5. KanbanView - renderizado de columnas, historias del Sprint y tareas', () => {
    const html = renderToString(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          AuthProvider,
          { initialUser: mockAdminUser },
          React.createElement(KanbanView, {
            project: mockProject,
            sprints: [mockSprintActive],
            stories: [mockStory],
            tasks: [mockTask],
            allUsers: [mockAdminUser],
            loading: false,
            onGoToSprints: () => {},
            onRefresh: async () => {},
          })
        )
      )
    );

    assert.ok(html.includes('Tablero Kanban'), 'Debe renderizar el título del tablero');
    assert.ok(html.includes('Sprint 1 - Core Flow'), 'Debe mostrar el nombre del Sprint activo');
    assert.ok(html.includes('To Do'), 'Debe tener columna To Do');
    assert.ok(html.includes('In Progress'), 'Debe tener columna In Progress');
    assert.ok(html.includes('Testing'), 'Debe tener columna Testing');
    assert.ok(html.includes('Done'), 'Debe tener columna Done');
    assert.ok(html.includes('TASK-1'), 'Debe listar la tarea');
    assert.ok(html.includes('Mis tareas'), 'Debe tener filtro de tareas personales');
  });

  await t.test('6. KanbanView - estado vacío cuando no hay Sprint activo', () => {
    const html = renderToString(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          AuthProvider,
          { initialUser: mockAdminUser },
          React.createElement(KanbanView, {
            project: { ...mockProject, activeSprint: null },
            sprints: [],
            stories: [],
            tasks: [],
            allUsers: [mockAdminUser],
            loading: false,
            onGoToSprints: () => {},
            onRefresh: async () => {},
          })
        )
      )
    );

    assert.ok(html.includes('No hay un Sprint activo en este proyecto'), 'Debe mostrar mensaje explicativo');
    assert.ok(html.includes('Ir a planificación de Sprints'), 'Debe incluir botón para ir a planificar');
  });
});
