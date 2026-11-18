import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { store } from '../server/store';
import { MyWorkView } from '../src/components/MyWorkView';
import { DashboardView } from '../src/components/DashboardView';
import { AppShell } from '../src/components/AppShell';
import { CommandPalette } from '../src/components/CommandPalette';
import { AuthProvider } from '../src/context/AuthContext';
import { ToastProvider } from '../src/context/ToastContext';
import type {
  ProjectSummary,
  Sprint,
  User,
  AssignedTaskDetail,
} from '../src/types/scrum';

// Mock users for different Scrum roles
const mockAdminUser: User = {
  id: 1,
  email: 'admin@velocity.dev',
  fullName: 'Elena Vance (Admin)',
  globalRole: 'ADMIN',
  title: 'Lead Architect',
};

const mockPoUser: User = {
  id: 2,
  email: 'po@velocity.dev',
  fullName: 'Mateo Ríos (PO)',
  globalRole: 'USER',
  title: 'Product Owner',
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
    { id: 2, userId: 2, projectId: 1, scrumRole: 'PRODUCT_OWNER', user: mockPoUser },
    { id: 3, userId: 3, projectId: 1, scrumRole: 'SCRUM_MASTER', user: mockSmUser },
    { id: 4, userId: 4, projectId: 1, scrumRole: 'DEVELOPER', user: mockDevUser },
  ],
};

test('Sección Mi Trabajo y Dashboard Personalizado por Rol - Suite Automatizada', async (t) => {
  await t.test('1. Backend - Consulta de tareas asignadas al usuario respetando seguridad', () => {
    // Look up developer user in database
    const devRecord = store.findUserByEmail('dev1@velocity.dev');
    assert.ok(devRecord, 'Usuario developer dev1 debe existir en base de datos');

    const devTasks = store.getUserAssignedTasks(devRecord, 'me');
    assert.ok(Array.isArray(devTasks), 'Debe retornar un arreglo de tareas');
    assert.ok(devTasks.length > 0, 'Lucas Herrera (dev1) debe tener tareas asignadas');

    // Verify task enrichment
    const firstTask = devTasks[0];
    assert.ok(firstTask.id, 'La tarea debe tener ID');
    assert.ok(firstTask.code, 'La tarea debe tener código TASK-XX');
    assert.ok(firstTask.status, 'La tarea debe tener estado');
    assert.ok(firstTask.story, 'La tarea debe incluir detalles de su historia asociada');
    assert.ok(firstTask.project, 'La tarea debe incluir detalles de su proyecto');
    assert.equal(firstTask.assignedToId, devRecord.id, 'Todas las tareas deben pertenecer al usuario');
  });

  await t.test('2. Backend - Restricción de permisos y seguridad entre proyectos', () => {
    // A regular user cannot see unauthorized projects or other users tasks via scope='all'
    const devRecord = store.findUserByEmail('dev1@velocity.dev')!;
    const adminRecord = store.findUserByEmail('admin@velocity.dev')!;

    // As normal dev, scope='all' falls back to user assigned tasks
    const devAllTasks = store.getUserAssignedTasks(devRecord, 'all');
    assert.ok(
      devAllTasks.every((t) => t.assignedToId === devRecord.id),
      'Un desarrollador estándar no puede acceder a tareas ajenas con scope=all'
    );

    // As global admin, scope='all' retrieves all tasks across authorized projects
    const adminAllTasks = store.getUserAssignedTasks(adminRecord, 'all');
    assert.ok(adminAllTasks.length >= devAllTasks.length, 'El Administrador puede auditar todas las tareas');
  });

  await t.test('3. MyWorkView - Renderizado de vista de tareas personales y categorías', () => {
    const html = renderToString(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          AuthProvider,
          { initialUser: mockDevUser },
          React.createElement(MyWorkView, {
            onNavigate: () => {},
          })
        )
      )
    );

    assert.ok(html.includes('Mi Trabajo'), 'Debe renderizar el título de la sección');
    assert.ok(html.includes('Todas'), 'Debe incluir pestaña de todas las tareas');
    assert.ok(html.includes('Por Hacer'), 'Debe incluir categoría Por Hacer');
    assert.ok(html.includes('En Progreso'), 'Debe incluir categoría En Progreso');
    assert.ok(html.includes('En Testing'), 'Debe incluir categoría En Testing');
    assert.ok(html.includes('Completadas'), 'Debe incluir categoría Completadas');
    assert.ok(html.includes('Buscar por código'), 'Debe incluir campo de búsqueda dinámica');
  });

  await t.test('4. DashboardView - Renderizado de Acciones Frecuentes y Enfoque de Rol', () => {
    const html = renderToString(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          AuthProvider,
          { initialUser: mockDevUser },
          React.createElement(DashboardView, {
            projects: [mockProjectSummary],
            users: [mockDevUser],
            loading: false,
            loadError: '',
            onRetry: () => {},
            onOpenProject: () => {},
            onRefreshProjects: async () => {},
            onNavigate: () => {},
          })
        )
      )
    );

    // Header and role badge
    assert.ok(html.includes('Dashboard de Proyectos Scrum'), 'Debe renderizar título principal');
    assert.ok(html.includes('Enfoque:'), 'Debe incluir indicador de enfoque de rol');

    // Bloque de Acciones Frecuentes
    assert.ok(html.includes('Acciones Frecuentes'), 'Debe renderizar bloque de acciones frecuentes');
    assert.ok(html.includes('Ver mis tareas'), 'Debe ofrecer botón para saltar a Mi Trabajo');
    assert.ok(html.includes('Ir al Kanban'), 'Debe ofrecer acceso directo al Kanban');
    assert.ok(html.includes('Product Backlog'), 'Debe ofrecer acceso al Backlog');
    assert.ok(html.includes('Abrir Sprint activo'), 'Debe ofrecer acceso al Sprint activo');

    // Core statistics preservation
    assert.ok(html.includes('Proyectos Activos'), 'Conserva métrica de Proyectos Activos');
    assert.ok(html.includes('Sprints en Curso'), 'Conserva métrica de Sprints en Curso');
    assert.ok(html.includes('Historias de Usuario'), 'Conserva métrica de Historias');
    assert.ok(html.includes('Entrega de Puntos'), 'Conserva métrica de Puntos');
  });

  await t.test('5. DashboardView - Personalización adaptada para Product Owner', () => {
    const poProject = { ...mockProjectSummary, myRole: 'PRODUCT_OWNER' as const };
    const html = renderToString(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          AuthProvider,
          { initialUser: mockPoUser },
          React.createElement(DashboardView, {
            projects: [poProject],
            users: [mockPoUser],
            loading: false,
            loadError: '',
            onRetry: () => {},
            onOpenProject: () => {},
            onRefreshProjects: async () => {},
            onNavigate: () => {},
          })
        )
      )
    );

    assert.ok(/Enfoque.*Product Owner/.test(html), 'Debe destacar enfoque de Product Owner');
    assert.ok(html.includes('Product Backlog'), 'Debe mencionar supervisión de Backlog');
    assert.ok(html.includes('Crear historia'), 'Debe ofrecer botón de Crear historia para PO');
  });

  await t.test('6. DashboardView - Personalización adaptada para Scrum Master', () => {
    const smProject = { ...mockProjectSummary, myRole: 'SCRUM_MASTER' as const };
    const html = renderToString(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          AuthProvider,
          { initialUser: mockSmUser },
          React.createElement(DashboardView, {
            projects: [smProject],
            users: [mockSmUser],
            loading: false,
            loadError: '',
            onRetry: () => {},
            onOpenProject: () => {},
            onRefreshProjects: async () => {},
            onNavigate: () => {},
          })
        )
      )
    );

    assert.ok(/Enfoque.*Scrum Master/.test(html), 'Debe destacar enfoque de Scrum Master');
    assert.ok(html.includes('Sprint activo'), 'Debe orientar hacia el flujo del Sprint activo');
  });

  await t.test('7. AppShell y CommandPalette - Integración de acceso a Mi Trabajo', () => {
    const shellHtml = renderToString(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          AuthProvider,
          { initialUser: mockDevUser },
          React.createElement(AppShell, {
            route: 'my-work',
            projects: [mockProjectSummary],
            currentProject: null,
            notifications: [],
            onNavigate: () => {},
            onMarkNotificationsRead: () => {},
            onOpenCommandPalette: () => {},
          })
        )
      )
    );

    assert.ok(shellHtml.includes('Mi Trabajo'), 'AppShell debe incluir el enlace a Mi Trabajo en la barra lateral');

    const paletteHtml = renderToString(
      React.createElement(CommandPalette, {
        open: true,
        currentProject: mockProjectSummary,
        projects: [mockProjectSummary],
        onClose: () => {},
        onNavigate: () => {},
      })
    );

    assert.ok(
      paletteHtml.includes('Mi Trabajo'),
      'CommandPalette debe incluir acción de búsqueda para Mi Trabajo'
    );
  });
});
