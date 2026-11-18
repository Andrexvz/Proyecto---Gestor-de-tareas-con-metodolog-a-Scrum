import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { SprintsView } from '../src/components/SprintsView.js';
import { MetricsView } from '../src/components/MetricsView.js';
import { ToastProvider } from '../src/context/ToastContext.js';
import type {
  ProjectSummary,
  Sprint,
  SprintMetricRow,
  TaskItem,
  UserStory,
} from '../src/types/scrum.js';

const mockProject: ProjectSummary = {
  id: 101,
  name: 'Plataforma Core Scrum',
  code: 'CORE',
  description: 'Sistema principal de gestión ágil',
  createdAt: '2026-01-01',
  activeSprint: null,
  myRole: 'SCRUM_MASTER',
  totalStories: 5,
  completedStories: 2,
  totalPoints: 20,
  completedPoints: 8,
  members: [],
};

const mockSprintActive: Sprint = {
  id: 201,
  projectId: 101,
  name: 'Sprint 1 - Autenticación y Core',
  goal: 'Desplegar arquitectura base y flujo de login',
  startDate: '2026-02-01',
  endDate: '2026-02-15',
  status: 'ACTIVE',
};

const mockSprintPlanning: Sprint = {
  id: 202,
  projectId: 101,
  name: 'Sprint 2 - Notificaciones y Reportes',
  goal: 'Implementar mensajería y exportación',
  startDate: '2026-02-16',
  endDate: '2026-03-01',
  status: 'PLANNING',
};

const mockStories: UserStory[] = [
  {
    id: 301,
    projectId: 101,
    sprintId: 201,
    code: 'CORE-1',
    title: 'Autenticación con Huella Digital',
    description: 'Como usuario, quiero acceder mediante biometría.',
    acceptanceCriteria: ['Validar lector', 'Guardar sesión'],
    priority: 'HIGH',
    storyPoints: 5,
    isCompleted: true,
    createdAt: '2026-01-02',
  },
  {
    id: 302,
    projectId: 101,
    sprintId: 201,
    code: 'CORE-2',
    title: 'Recuperación de Contraseña',
    description: 'Como usuario, quiero recuperar mi acceso.',
    acceptanceCriteria: ['Enviar correo con token temporal'],
    priority: 'MEDIUM',
    storyPoints: 3,
    isCompleted: false,
    createdAt: '2026-01-03',
  },
  {
    id: 303,
    projectId: 101,
    sprintId: null, // In Backlog pool
    code: 'CORE-3',
    title: 'Exportar Reporte en PDF',
    description: 'Como administrador, quiero exportar métricas.',
    acceptanceCriteria: ['Generar documento PDF'],
    priority: 'LOW',
    storyPoints: 5,
    isCompleted: false,
    createdAt: '2026-01-04',
  },
];

const mockMetrics: SprintMetricRow[] = [
  {
    sprintId: 201,
    sprintName: 'Sprint 1 - Autenticación y Core',
    status: 'ACTIVE',
    startDate: '2026-02-01',
    endDate: '2026-02-15',
    plannedPoints: 8,
    completedPoints: 5,
    totalStories: 2,
    completedStories: 1,
  },
  {
    sprintId: 200,
    sprintName: 'Sprint 0 - Spike Inicial',
    status: 'CLOSED',
    startDate: '2026-01-15',
    endDate: '2026-01-31',
    plannedPoints: 10,
    completedPoints: 10,
    totalStories: 3,
    completedStories: 3,
  },
];

const mockTasks: TaskItem[] = [
  {
    id: 401,
    userStoryId: 301,
    code: 'TASK-1',
    description: 'Crear controlador biometric.ts',
    status: 'DONE',
    assignedToId: 1,
    createdAt: '2026-02-02',
  },
  {
    id: 402,
    userStoryId: 302,
    code: 'TASK-2',
    description: 'Configurar servicio SMTP',
    status: 'IN_PROGRESS',
    assignedToId: 1,
    createdAt: '2026-02-03',
  },
  {
    id: 403,
    userStoryId: 302,
    code: 'TASK-3',
    description: 'Formulario de restablecimiento',
    status: 'TODO',
    assignedToId: null,
    createdAt: '2026-02-04',
  },
];

test('Gestión de Sprints y Métricas (Etapa 4) - Suite Automatizada', async (t) => {
  await t.test('1. SprintsView - renderizado de panel dual y estado de Sprints', () => {
    const html = renderToString(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(SprintsView, {
          project: { ...mockProject, activeSprint: mockSprintActive },
          sprints: [mockSprintActive, mockSprintPlanning],
          stories: mockStories,
          onGoToKanban: () => {},
          onRefresh: async () => {},
        })
      )
    );

    assert.ok(html.includes('Planificación y Gestión de Sprints'), 'Debe renderizar el título de la vista');
    assert.ok(html.includes('Product Backlog'), 'Debe incluir el panel izquierdo del Backlog');
    assert.ok(html.includes('CORE-3'), 'Debe listar la historia disponible en el Backlog');
    assert.ok(html.includes('Sprint 1 - Autenticación y Core'), 'Debe renderizar el Sprint activo');
    assert.ok(html.includes('Sprint 2 - Notificaciones y Reportes'), 'Debe renderizar el Sprint en planificación');
    assert.ok(html.includes('Iniciar Sprint'), 'Debe ofrecer botón para iniciar Sprint');
    assert.ok(html.includes('Ir a Kanban'), 'Debe incluir botón para saltar al Tablero Kanban');
    assert.ok(html.includes('Finalizar Sprint'), 'Debe ofrecer botón para finalizar Sprint activo');
  });

  await t.test('2. SprintsView - estado vacío cuando no existen Sprints', () => {
    const html = renderToString(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(SprintsView, {
          project: mockProject,
          sprints: [],
          stories: mockStories,
          onGoToKanban: () => {},
          onRefresh: async () => {},
        })
      )
    );

    assert.ok(html.includes('Aún no hay Sprints creados'), 'Debe renderizar mensaje de estado vacío');
    assert.ok(html.includes('Crear primer Sprint'), 'Debe mostrar acción para crear el primer Sprint');
  });

  await t.test('3. MetricsView - renderizado de KPIs, gráficos y comparativa de velocidad', () => {
    const html = renderToString(
      React.createElement(MetricsView, {
        project: mockProject,
        metrics: mockMetrics,
        tasks: mockTasks,
      })
    );

    assert.ok(html.includes('Métricas de Desempeño y Velocidad'), 'Debe renderizar el título');
    assert.ok(html.includes('Points Entregados'), 'Debe incluir KPI de points entregados');
    assert.ok(html.includes('Velocidad Media'), 'Debe incluir KPI de velocidad media');
    assert.ok(html.includes('Cumplimiento Puntos'), 'Debe incluir KPI de tasa de cumplimiento');
    assert.ok(html.includes('Velocidad por Sprint'), 'Debe incluir gráfico de velocidad');
    assert.ok(html.includes('Distribución de Tareas Técnicas'), 'Debe incluir gráfico de distribución');
    assert.ok(html.includes('Historial Consolidado de Sprints'), 'Debe incluir la tabla de historial');
    assert.ok(html.includes('Sprint 1 - Autenticación y Core'), 'Debe listar la fila del Sprint 1');
    assert.ok(html.includes('Sprint 0 - Spike Inicial'), 'Debe listar la fila del Sprint 0');
  });

  await t.test('4. MetricsView - estado vacío cuando no hay métricas', () => {
    const html = renderToString(
      React.createElement(MetricsView, {
        project: mockProject,
        metrics: [],
        tasks: [],
      })
    );

    assert.ok(html.includes('Sin datos de velocidad disponibles'), 'Debe mostrar estado vacío en velocidad');
    assert.ok(html.includes('Sin tareas en ejecución'), 'Debe mostrar estado vacío en tareas');
  });
});
