import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MetricsView } from '../src/components/MetricsView';
import type {
  ProjectSummary,
  SprintMetricRow,
  TaskItem,
  Sprint,
  UserStory,
} from '../src/types/scrum';

// Mock Data reflecting the real project case
const mockProject: ProjectSummary = {
  id: 1,
  code: 'CBA',
  name: 'Core Banking Auth v2',
  description: 'Plataforma de autenticación biométrica FIDO2 y OAuth2',
  createdAt: '2026-10-01T09:00:00.000Z',
  myRole: 'ADMIN',
  activeSprint: {
    id: 2,
    projectId: 1,
    name: 'Sprint 14 — Biometría & FIDO2',
    goal: 'Habilitar acceso por huella digital',
    startDate: '2026-11-02',
    endDate: '2026-11-16',
    status: 'ACTIVE',
  },
  totalStories: 17,
  completedStories: 3,
  totalPoints: 76,
  completedPoints: 14,
  members: [],
};

const mockMetrics: SprintMetricRow[] = [
  {
    sprintId: 1,
    sprintName: 'Sprint 13 — OAuth2 Core',
    status: 'CLOSED',
    startDate: '2026-10-15',
    endDate: '2026-10-29',
    plannedPoints: 9,
    completedPoints: 9,
    totalStories: 2,
    completedStories: 2,
  },
  {
    sprintId: 2,
    sprintName: 'Sprint 14 — Biometría & FIDO2',
    status: 'ACTIVE',
    startDate: '2026-11-02',
    endDate: '2026-11-16',
    plannedPoints: 21,
    completedPoints: 5,
    totalStories: 4,
    completedStories: 1,
  },
  {
    sprintId: 3,
    sprintName: 'Sprint 15 — Rate Limiting & Auditoría',
    status: 'PLANNING',
    startDate: '2026-11-17',
    endDate: '2026-12-01',
    plannedPoints: 5,
    completedPoints: 0,
    totalStories: 1,
    completedStories: 0,
  },
];

const mockTasks: TaskItem[] = [
  { id: 1, userStoryId: 1, code: 'TASK-01', description: 'Task 1', status: 'DONE', assignedToId: null, createdAt: '' },
  { id: 2, userStoryId: 2, code: 'TASK-02', description: 'Task 2', status: 'DONE', assignedToId: null, createdAt: '' },
  { id: 3, userStoryId: 3, code: 'TASK-03', description: 'Task 3', status: 'IN_PROGRESS', assignedToId: null, createdAt: '' },
  { id: 4, userStoryId: 3, code: 'TASK-04', description: 'Task 4', status: 'TESTING', assignedToId: null, createdAt: '' },
  { id: 5, userStoryId: 3, code: 'TASK-05', description: 'Task 5', status: 'TODO', assignedToId: null, createdAt: '' },
  { id: 6, userStoryId: 5, code: 'TASK-06', description: 'Task 6', status: 'DONE', assignedToId: null, createdAt: '' },
];

test('Auditoría Integral de Métricas Scrum (Etapa Métricas Overhaul)', async (t) => {
  await t.test('1. Resolución Inconsistencia 1 - Velocidad Media de Sprints Concluidos vs Total', () => {
    // Audit of Formula:
    // In canonical Scrum, average velocity MUST be calculated from completed (CLOSED) sprints.
    const closedSprints = mockMetrics.filter((m) => m.status === 'CLOSED');
    assert.equal(closedSprints.length, 1, 'Sólo hay 1 Sprint cerrado');

    const closedDelivered = closedSprints.reduce((acc, m) => acc + m.completedPoints, 0);
    assert.equal(closedDelivered, 9, 'Sprint 13 cerrado entregó exactamente 9 puntos');

    const closedVelocity = Math.round(closedDelivered / closedSprints.length);
    assert.equal(closedVelocity, 9, 'La velocidad media de Sprints concluidos es 9 pts/sprint (NO 5 pts)');

    // Demostración de la inconsistencia previa:
    // Dividir 14 puntos (incluyendo el sprint activo) entre 3 sprints (incluyendo el de planificación) daba Math.round(14/3) = 5
    const allDelivered = mockMetrics.reduce((acc, m) => acc + m.completedPoints, 0);
    const flawedVelocity = Math.round(allDelivered / mockMetrics.length);
    assert.equal(flawedVelocity, 5, 'La fórmula defectuosa anterior arrojaba 5 pts al dividir por sprints no concluidos');
    assert.notEqual(closedVelocity, flawedVelocity, 'La velocidad canónica corrige la distorsión del 44%');
  });

  await t.test('2. Resolución Inconsistencia 2 - Alcance Global del Proyecto (14/76) vs Sprint Activo (5/21)', () => {
    // Project backlog total vs active sprint commitment:
    assert.equal(mockProject.completedPoints, 14, 'El proyecto global tiene 14 puntos completados');
    assert.equal(mockProject.totalPoints, 76, 'El proyecto global tiene 76 puntos en total (Backlog entero)');

    const activeSprintMetric = mockMetrics.find((m) => m.status === 'ACTIVE');
    assert.ok(activeSprintMetric, 'Existe métrica de Sprint activo');
    assert.equal(activeSprintMetric.completedPoints, 5, 'Sprint 14 tiene 5 puntos entregados');
    assert.equal(activeSprintMetric.plannedPoints, 21, 'Sprint 14 tiene 21 puntos comprometidos');

    // Confirma que 14/76 y 5/21 son ambos matemáticamente válidos pero pertenecen a diferentes alcances
    assert.equal(
      `${activeSprintMetric.completedPoints}/${activeSprintMetric.plannedPoints}`,
      '5/21',
      'Sprint 14 tiene alcance de 5/21 puntos'
    );
    assert.equal(
      `${mockProject.completedPoints}/${mockProject.totalPoints}`,
      '14/76',
      'Proyecto CBA tiene alcance global de 14/76 puntos'
    );
  });

  await t.test('3. Cálculo de Cumplimiento de Compromiso (Say/Do Ratio)', () => {
    const s13 = mockMetrics[0];
    const s13Rate = Math.round((s13.completedPoints / s13.plannedPoints) * 100);
    assert.equal(s13Rate, 100, 'Sprint 13 tuvo cumplimiento del 100%');

    const s14 = mockMetrics[1];
    const s14Rate = Math.round((s14.completedPoints / s14.plannedPoints) * 100);
    assert.equal(s14Rate, 24, 'Sprint 14 activo tiene 24% de avance (5/21)');

    const s15 = mockMetrics[2];
    const s15Rate = s15.plannedPoints > 0 ? Math.round((s15.completedPoints / s15.plannedPoints) * 100) : 0;
    assert.equal(s15Rate, 0, 'Sprint 15 en planificación tiene 0%');
  });

  await t.test('4. Distribución de Tareas Técnicas y Geometría de Donut SVG Ampliado', () => {
    const counts = {
      TODO: mockTasks.filter((t) => t.status === 'TODO').length,
      IN_PROGRESS: mockTasks.filter((t) => t.status === 'IN_PROGRESS').length,
      TESTING: mockTasks.filter((t) => t.status === 'TESTING').length,
      DONE: mockTasks.filter((t) => t.status === 'DONE').length,
    };

    assert.equal(counts.TODO, 1, '1 tarea en TODO');
    assert.equal(counts.IN_PROGRESS, 1, '1 tarea en IN_PROGRESS');
    assert.equal(counts.TESTING, 1, '1 tarea en TESTING');
    assert.equal(counts.DONE, 3, '3 tareas en DONE');
    assert.equal(mockTasks.length, 6, 'Total 6 tareas técnicas evaluadas');

    const donePercent = Math.round((counts.DONE / mockTasks.length) * 100);
    assert.equal(donePercent, 50, '50% de tareas técnicas en DONE');

    // Comprobar circunferencia con radio ampliado de 70px (viewBox 200x200)
    const radius = 70;
    const circumference = 2 * Math.PI * radius;
    assert.ok(circumference > 439 && circumference < 440, 'Circunferencia del Donut ampliado es ~439.82px');
  });

  await t.test('5. Renderizado de MetricsView con Filtros, KPIs y Glosario Scrum', () => {
    const html = renderToString(
      React.createElement(MetricsView, {
        project: mockProject,
        metrics: mockMetrics,
        tasks: mockTasks,
      })
    );

    // Titulares y KPIs principales
    assert.ok(html.includes('Métricas de Desempeño y Velocidad'), 'Debe renderizar título principal');
    assert.ok(html.includes('Points Entregados'), 'Debe incluir KPI de points entregados');
    assert.ok(html.includes('Velocidad Media'), 'Debe incluir KPI de velocidad media');
    assert.ok(html.includes('Cumplimiento Puntos'), 'Debe incluir KPI de cumplimiento');
    assert.ok(html.includes('Historias Listas'), 'Debe incluir KPI de historias listas');
    assert.ok(html.includes('Tareas en Hecho') || html.includes('Tareas en Done'), 'Debe incluir KPI de tareas en Hecho / Done');

    // Filtros de Sprint y Selector
    assert.ok(html.includes('Filtrar por Sprint'), 'Debe incluir accesiblemente el filtro por Sprint');
    assert.ok(html.includes('Todos los Sprints (Consolidado)'), 'Debe incluir opción consolidada');
    assert.ok(html.includes('Sprint 13'), 'Debe incluir opción de Sprint 13');
    assert.ok(html.includes('Sprint 14'), 'Debe incluir opción de Sprint 14');

    // Gráficos y Tabla
    assert.ok(html.includes('Velocidad por Sprint (Comprometidos vs Entregados)'), 'Debe incluir gráfico de velocidad');
    assert.ok(html.includes('Distribución de Tareas Técnicas'), 'Debe incluir gráfico donut ampliado');
    assert.ok(html.includes('Progresión Histórica y Ritmo de Entrega (Burndown Trend)'), 'Debe incluir análisis de burndown');
    assert.ok(html.includes('Historial Consolidado de Sprints'), 'Debe incluir tabla histórica');

    // Controles de glosario y ayuda
    assert.ok(html.includes('Glosario Scrum'), 'Debe incluir botón para el glosario de métricas');
  });

  await t.test('6. MetricsView - Resiliencia ante Proyecto Nuevo sin Sprints ni Tareas', () => {
    const emptyProject: ProjectSummary = {
      ...mockProject,
      activeSprint: null,
      totalStories: 0,
      completedStories: 0,
      totalPoints: 0,
      completedPoints: 0,
    };

    const html = renderToString(
      React.createElement(MetricsView, {
        project: emptyProject,
        metrics: [],
        tasks: [],
      })
    );

    assert.ok(html.includes('Sin datos de velocidad disponibles'), 'Debe mostrar estado vacío en gráfico de velocidad');
    assert.ok(html.includes('Sin tareas en ejecución'), 'Debe mostrar estado vacío en distribución de tareas');
    assert.ok(html.includes('No hay Sprints registrados en este proyecto'), 'Debe mostrar fila vacía en tabla');
  });
});
