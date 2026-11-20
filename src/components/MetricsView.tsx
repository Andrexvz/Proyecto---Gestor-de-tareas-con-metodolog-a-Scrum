import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  CheckCircle2,
  Zap,
  Calendar,
  HelpCircle,
  PieChart,
  LineChart,
  ArrowUpRight,
  Info,
  Filter,
  Layers,
  Activity,
  ChevronDown,
  BookOpen,
  Sparkles,
  Target,
  Clock,
  ArrowRight,
  Check,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { SprintStatusText } from './UIHelpers';
import { Badge, EmptyState, Button } from './ui';
import type {
  ProjectSummary,
  SprintMetricRow,
  TaskItem,
  TaskStatus,
  Sprint,
  UserStory,
} from '../types/scrum';

export interface MetricsViewProps {
  project: ProjectSummary;
  metrics: SprintMetricRow[];
  tasks: TaskItem[];
  sprints?: Sprint[];
  stories?: UserStory[];
}

export function MetricsView({ project, metrics, tasks, sprints = [], stories = [] }: MetricsViewProps) {
  const shouldReduceMotion = useReducedMotion();

  // Filters and Interactive State
  const [selectedSprintId, setSelectedSprintId] = useState<'ALL' | number>('ALL');
  const [activeTooltip, setActiveTooltip] = useState<SprintMetricRow | null>(null);
  const [activeTaskSlice, setActiveTaskSlice] = useState<TaskStatus | null>(null);
  const [showGlossary, setShowGlossary] = useState(false);
  const [activeKpiHelp, setActiveKpiHelp] = useState<string | null>(null);

  // Sprints breakdown by status
  const closedMetrics = useMemo(() => metrics.filter((m) => m.status === 'CLOSED'), [metrics]);
  const activeMetric = useMemo(() => metrics.find((m) => m.status === 'ACTIVE'), [metrics]);
  const planningMetrics = useMemo(() => metrics.filter((m) => m.status === 'PLANNING'), [metrics]);

  // Closed sprints velocity calculations (Strict Scrum canonical rule)
  const closedDeliveredPoints = useMemo(
    () => closedMetrics.reduce((sum, m) => sum + (m.completedPoints || 0), 0),
    [closedMetrics]
  );
  const closedPlannedPoints = useMemo(
    () => closedMetrics.reduce((sum, m) => sum + (m.plannedPoints || 0), 0),
    [closedMetrics]
  );
  const closedAverageVelocity =
    closedMetrics.length > 0 ? Math.round(closedDeliveredPoints / closedMetrics.length) : 0;

  // Global Sprints calculations (all sprints in project)
  const allDeliveredPoints = useMemo(
    () => metrics.reduce((acc, m) => acc + (m.completedPoints || 0), 0),
    [metrics]
  );
  const allPlannedPoints = useMemo(
    () => metrics.reduce((acc, m) => acc + (m.plannedPoints || 0), 0),
    [metrics]
  );

  const allTotalStories = useMemo(
    () => metrics.reduce((acc, m) => acc + (m.totalStories || 0), 0),
    [metrics]
  );
  const allCompletedStories = useMemo(
    () => metrics.reduce((acc, m) => acc + (m.completedStories || 0), 0),
    [metrics]
  );

  // Selected Sprint or Consolidated Target
  const selectedMetric = useMemo(() => {
    if (selectedSprintId === 'ALL') return null;
    return metrics.find((m) => m.sprintId === selectedSprintId) || null;
  }, [selectedSprintId, metrics]);

  // Effective values based on filter
  const currentDelivered = selectedMetric ? selectedMetric.completedPoints : allDeliveredPoints;
  const currentPlanned = selectedMetric ? selectedMetric.plannedPoints : allPlannedPoints;
  const completionRate =
    currentPlanned > 0 ? Math.round((currentDelivered / currentPlanned) * 100) : 0;

  const currentTotalStories = selectedMetric ? selectedMetric.totalStories : allTotalStories;
  const currentCompletedStories = selectedMetric
    ? selectedMetric.completedStories
    : allCompletedStories;
  const storiesRate =
    currentTotalStories > 0 ? Math.round((currentCompletedStories / currentTotalStories) * 100) : 0;

  // Average velocity displayed: prioritizes closed sprints when available
  const averageVelocity =
    closedMetrics.length > 0
      ? closedAverageVelocity
      : metrics.length > 0
      ? Math.round(allDeliveredPoints / metrics.length)
      : 0;

  const maxPoints = Math.max(
    10,
    ...metrics.map((m) => Math.max(m.plannedPoints || 0, m.completedPoints || 0))
  );

  // Filter tasks if a specific sprint is chosen and stories are available
  const filteredTasks = useMemo(() => {
    if (selectedSprintId === 'ALL' || stories.length === 0) {
      return tasks;
    }
    const sprintStoryIds = new Set(
      stories.filter((s) => s.sprintId === selectedSprintId).map((s) => s.id)
    );
    return tasks.filter((t) => sprintStoryIds.has(t.userStoryId));
  }, [selectedSprintId, stories, tasks]);

  const statusCounts: Record<TaskStatus, number> = useMemo(
    () => ({
      TODO: filteredTasks.filter((t) => t.status === 'TODO').length,
      IN_PROGRESS: filteredTasks.filter((t) => t.status === 'IN_PROGRESS').length,
      TESTING: filteredTasks.filter((t) => t.status === 'TESTING').length,
      DONE: filteredTasks.filter((t) => t.status === 'DONE').length,
    }),
    [filteredTasks]
  );

  const taskDistributionConfig = [
    { key: 'TODO' as TaskStatus, label: 'Por Hacer', color: '#94A3B8', bgClass: 'bg-smoke' },
    { key: 'IN_PROGRESS' as TaskStatus, label: 'En Progreso', color: '#8B5CF6', bgClass: 'bg-iris-violet' },
    { key: 'TESTING' as TaskStatus, label: 'En Revisión', color: '#06B6D4', bgClass: 'bg-signal-teal' },
    { key: 'DONE' as TaskStatus, label: 'Hecho', color: '#10B981', bgClass: 'bg-pulse-green' },
  ];

  // Donut chart calculations (significantly enlarged to radius 70 for 200x200 viewBox)
  const totalTasksCount = filteredTasks.length;
  const donutRadius = 70;
  const donutCircumference = 2 * Math.PI * donutRadius;

  let accumulatedPercent = 0;
  const donutSegments = taskDistributionConfig.map((item) => {
    const count = statusCounts[item.key];
    const percent = totalTasksCount > 0 ? count / totalTasksCount : 0;
    const strokeDasharray = `${percent * donutCircumference} ${donutCircumference}`;
    const strokeDashoffset = -accumulatedPercent * donutCircumference;
    accumulatedPercent += percent;
    return {
      ...item,
      count,
      percent: Math.round(percent * 100),
      strokeDasharray,
      strokeDashoffset,
    };
  });

  const activeSliceData = activeTaskSlice
    ? donutSegments.find((s) => s.key === activeTaskSlice)
    : null;

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-graphite/60">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="font-display text-2xl font-semibold text-bone tracking-tight">
              Métricas de Desempeño y Velocidad
            </h1>
            <Badge variant="purple" shape="pill">
              {project.code}
            </Badge>
            {activeMetric && (
              <Badge variant="success" size="sm">
                Sprint Activo: {activeMetric.sprintName.split('—')[0].trim()}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-[13px] text-fog leading-relaxed">
            {project.name} · Análisis de velocidad del equipo, cumplimiento de Story Points y distribución operativa de tareas técnicas en Scrum.
          </p>
        </div>

        {/* Filter and Help Controls */}
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          {/* Sprint Filter Dropdown */}
          <div className="relative">
            <label htmlFor="sprint-metrics-filter" className="sr-only">
              Filtrar por Sprint
            </label>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-inputs bg-carbon border border-graphite text-[13px] text-bone hover:border-iris-violet/60 transition-colors">
              <Filter className="w-3.5 h-3.5 text-fog" />
              <select
                id="sprint-metrics-filter"
                value={selectedSprintId}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedSprintId(val === 'ALL' ? 'ALL' : Number(val));
                }}
                className="bg-transparent text-bone font-medium focus:outline-none cursor-pointer pr-1"
                aria-label="Seleccionar filtro de Sprint"
              >
                <option value="ALL" className="bg-carbon text-bone">
                  Todos los Sprints (Consolidado)
                </option>
                {metrics.map((m) => (
                  <option key={m.sprintId} value={m.sprintId} className="bg-carbon text-bone">
                    {m.sprintName} ({m.status === 'CLOSED' ? 'Concluido' : m.status === 'ACTIVE' ? 'Activo' : 'Planificación'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Scrum Glossary Button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowGlossary(!showGlossary)}
            icon={<BookOpen className="w-4 h-4 text-iris-violet" />}
            title="Abrir glosario y guía de términos Scrum"
          >
            {showGlossary ? 'Cerrar Guía' : 'Glosario Scrum'}
          </Button>
        </div>
      </div>

      {/* Accessible Scrum Glossary Drawer / Banner */}
      <AnimatePresence>
        {showGlossary && (
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="p-5 rounded-cards bg-carbon border border-iris-violet/40 shadow-glow space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-graphite">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-iris-violet" />
                  <h2 className="text-[14px] font-semibold text-bone">
                    Guía de Conceptos y Métricas Scrum en Agile Velocity
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGlossary(false)}
                  className="text-fog hover:text-bone text-xs font-medium cursor-pointer"
                >
                  Ocultar
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-[12px]">
                <div className="p-3 rounded-inputs bg-obsidian border border-graphite/60 space-y-1">
                  <span className="font-semibold text-iris-violet flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" /> Velocidad del Sprint (Sprint Velocity)
                  </span>
                  <p className="text-mist leading-relaxed">
                    Medida cuantitativa de los Story Points completados exclusivamente en <strong>Sprints cerrados</strong> que cumplen con la Definición de Terminado (DoD). No se dividen sprints activos ni planificados para no distorsionar la capacidad histórica del equipo.
                  </p>
                </div>

                <div className="p-3 rounded-inputs bg-obsidian border border-graphite/60 space-y-1">
                  <span className="font-semibold text-pulse-green flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5" /> Story Points (Puntos de Historia)
                  </span>
                  <p className="text-mist leading-relaxed">
                    Unidad relativa de estimación (sucesión Fibonacci: 1, 2, 3, 5, 8, 13) que mide la complejidad, incertidumbre y esfuerzo técnico de una historia de usuario. No representan horas reloj de trabajo.
                  </p>
                </div>

                <div className="p-3 rounded-inputs bg-obsidian border border-graphite/60 space-y-1">
                  <span className="font-semibold text-signal-teal flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" /> Cumplimiento de Compromiso (Say/Do)
                  </span>
                  <p className="text-mist leading-relaxed">
                    Porcentaje de puntos completados frente a los puntos comprometidos en la Sprint Planning. Un ratio entre 85% y 115% indica una capacidad de estimación predecible y madura.
                  </p>
                </div>

                <div className="p-3 rounded-inputs bg-obsidian border border-graphite/60 space-y-1">
                  <span className="font-semibold text-amber-400 flex items-center gap-1.5">
                    <LineChart className="w-3.5 h-3.5" /> Burndown Chart (Quema de Trabajo)
                  </span>
                  <p className="text-mist leading-relaxed">
                    Gráfico que proyecta la reducción diaria o cíclica de trabajo restante contra una línea ideal. Requiere bitácoras de quema periódica para evitar suposiciones arbitrarias.
                  </p>
                </div>

                <div className="p-3 rounded-inputs bg-obsidian border border-graphite/60 space-y-1">
                  <span className="font-semibold text-lavender flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" /> Trabajo Pendiente (Product Backlog)
                  </span>
                  <p className="text-mist leading-relaxed">
                    Listado priorizado de historias de usuario del proyecto ({project.totalPoints} pts en total). Diferente al alcance comprometido en un Sprint específico (ej. {activeMetric ? activeMetric.plannedPoints : 0} pts en el Sprint actual).
                  </p>
                </div>

                <div className="p-3 rounded-inputs bg-obsidian border border-graphite/60 space-y-1">
                  <span className="font-semibold text-mist flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-pulse-green" /> Definición de Terminado (DoD)
                  </span>
                  <p className="text-mist leading-relaxed">
                    Criterio estricto de calidad: en Agile Velocity, una historia de usuario se considera entregada únicamente cuando el 100% de sus tareas técnicas asociadas han alcanzado el estado <strong>DONE</strong>.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scope Alert / Context Notification */}
      {selectedSprintId !== 'ALL' && selectedMetric && (
        <div className="p-3 rounded-inputs bg-obsidian/70 border border-iris-violet/40 flex items-center justify-between text-[12px]">
          <div className="flex items-center gap-2 text-mist">
            <Filter className="w-4 h-4 text-iris-violet shrink-0" />
            <span>
              Filtrando métricas para <strong>{selectedMetric.sprintName}</strong> ({selectedMetric.status === 'CLOSED' ? 'Concluido' : selectedMetric.status === 'ACTIVE' ? 'En Curso' : 'Planificación'}).
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedSprintId('ALL')}
            className="text-iris-violet hover:underline font-medium shrink-0 ml-2"
          >
            Ver consolidado general
          </button>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* KPI 1: Delivered Points */}
        <motion.div
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 8 }}
          animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className="p-4 rounded-cards bg-carbon border border-graphite shadow-subtle flex flex-col justify-between relative group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-fog flex items-center gap-1">
              Points Entregados
              <button
                type="button"
                onClick={() =>
                  setActiveKpiHelp(activeKpiHelp === 'delivered' ? null : 'delivered')
                }
                className="text-fog hover:text-bone cursor-pointer"
                title="Ver explicación de Points Entregados"
                aria-label="Información de Points Entregados"
              >
                <Info className="w-3 h-3 text-fog" />
              </button>
            </span>
            <div className="p-1.5 rounded-md bg-pulse-green/10 text-pulse-green">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="font-display text-2xl font-bold text-pulse-green font-mono">
              {currentDelivered}
            </span>
            <p className="text-[11px] text-fog mt-0.5">
              De {currentPlanned} planificados
              {selectedSprintId === 'ALL' ? ' en Sprints' : ''}
            </p>
          </div>
          {/* Mini progress bar */}
          <div className="mt-3 h-1 w-full rounded-pills bg-obsidian overflow-hidden">
            <div
              className="h-full bg-pulse-green transition-all duration-500 rounded-pills"
              style={{
                width: `${currentPlanned > 0 ? Math.min(100, Math.round((currentDelivered / currentPlanned) * 100)) : 0}%`,
              }}
            />
          </div>
          {activeKpiHelp === 'delivered' && (
            <div className="absolute inset-0 bg-obsidian/95 p-3 rounded-cards text-[11px] text-mist flex flex-col justify-between z-10 border border-pulse-green/40">
              <p>
                Suma de Story Points de historias cuyas tareas técnicas están 100% en estado <strong>DONE</strong>.
              </p>
              <button
                type="button"
                onClick={() => setActiveKpiHelp(null)}
                className="text-pulse-green text-[10px] font-semibold self-end"
              >
                Entendido
              </button>
            </div>
          )}
        </motion.div>

        {/* KPI 2: Velocity */}
        <motion.div
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 8 }}
          animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          className="p-4 rounded-cards bg-carbon border border-graphite shadow-subtle flex flex-col justify-between relative group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-fog flex items-center gap-1">
              Velocidad Media
              <button
                type="button"
                onClick={() =>
                  setActiveKpiHelp(activeKpiHelp === 'velocity' ? null : 'velocity')
                }
                className="text-fog hover:text-bone cursor-pointer"
                title="Ver explicación de Velocidad Media"
                aria-label="Información de Velocidad Media"
              >
                <Info className="w-3 h-3 text-fog" />
              </button>
            </span>
            <div className="p-1.5 rounded-md bg-iris-violet/10 text-iris-violet">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-2xl font-bold text-bone font-mono">
                {averageVelocity}
              </span>
              <span className="text-[12px] text-iris-violet font-semibold">pts</span>
            </div>
            <p className="text-[11px] text-fog mt-0.5 truncate">
              {closedMetrics.length > 0
                ? `pts / Sprint concluido (${closedMetrics.length} cerrado${closedMetrics.length > 1 ? 's' : ''})`
                : 'pts / Sprint concluido'}
            </p>
          </div>
          <div className="mt-3 flex items-center justify-between text-[10px] text-fog font-medium">
            <span>
              {closedMetrics.length > 0
                ? `${closedDeliveredPoints} pts en Sprints cerrados`
                : `${allDeliveredPoints} pts entregados`}
            </span>
            {activeMetric && (
              <span className="text-signal-teal font-mono">
                Activo: {activeMetric.completedPoints} pts
              </span>
            )}
          </div>
          {activeKpiHelp === 'velocity' && (
            <div className="absolute inset-0 bg-obsidian/95 p-3 rounded-cards text-[11px] text-mist flex flex-col justify-between z-10 border border-iris-violet/40">
              <p>
                La velocidad canónica de Scrum se calcula promediando únicamente los puntos entregados en <strong>Sprints concluidos</strong> ({closedMetrics.length > 0 ? `${closedDeliveredPoints} pts / ${closedMetrics.length} Sprint` : 'sin cierres aún'}).
              </p>
              <button
                type="button"
                onClick={() => setActiveKpiHelp(null)}
                className="text-iris-violet text-[10px] font-semibold self-end"
              >
                Entendido
              </button>
            </div>
          )}
        </motion.div>

        {/* KPI 3: Completion Rate */}
        <motion.div
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 8 }}
          animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ duration: 0.26 }}
          className="p-4 rounded-cards bg-carbon border border-graphite shadow-subtle flex flex-col justify-between relative group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-fog flex items-center gap-1">
              Cumplimiento Puntos
              <button
                type="button"
                onClick={() =>
                  setActiveKpiHelp(activeKpiHelp === 'completion' ? null : 'completion')
                }
                className="text-fog hover:text-bone cursor-pointer"
                title="Ver explicación de Cumplimiento"
                aria-label="Información de Cumplimiento"
              >
                <Info className="w-3 h-3 text-fog" />
              </button>
            </span>
            <div className="p-1.5 rounded-md bg-signal-teal/10 text-signal-teal">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span
              className={`font-display text-2xl font-bold font-mono ${
                completionRate >= 85
                  ? 'text-pulse-green'
                  : completionRate >= 60
                  ? 'text-signal-teal'
                  : 'text-amber-400'
              }`}
            >
              {completionRate}%
            </span>
            <p className="text-[11px] text-fog mt-0.5 truncate">
              {selectedMetric
                ? `Efectividad de ${selectedMetric.sprintName.split('—')[0].trim()}`
                : 'Efectividad de entrega'}
            </p>
          </div>
          <div className="mt-3 flex items-center justify-between text-[10px] text-fog">
            <span>
              {selectedMetric
                ? `${selectedMetric.completedPoints}/${selectedMetric.plannedPoints} pts`
                : `${currentDelivered}/${currentPlanned} pts`}
            </span>
            <span className="font-mono text-mist">
              {completionRate >= 100
                ? 'Objetivo superado'
                : completionRate >= 85
                ? 'En rango ideal'
                : 'En progreso'}
            </span>
          </div>
          {activeKpiHelp === 'completion' && (
            <div className="absolute inset-0 bg-obsidian/95 p-3 rounded-cards text-[11px] text-mist flex flex-col justify-between z-10 border border-signal-teal/40">
              <p>
                Ratio de cumplimiento (Say/Do). Mide la proporción entre los Story Points entregados y los comprometidos inicialmente.
              </p>
              <button
                type="button"
                onClick={() => setActiveKpiHelp(null)}
                className="text-signal-teal text-[10px] font-semibold self-end"
              >
                Entendido
              </button>
            </div>
          )}
        </motion.div>

        {/* KPI 4: Stories Rate */}
        <motion.div
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 8 }}
          animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-4 rounded-cards bg-carbon border border-graphite shadow-subtle flex flex-col justify-between relative group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-fog flex items-center gap-1">
              Historias Listas
              <button
                type="button"
                onClick={() =>
                  setActiveKpiHelp(activeKpiHelp === 'stories' ? null : 'stories')
                }
                className="text-fog hover:text-bone cursor-pointer"
                title="Ver explicación de Historias Listas"
                aria-label="Información de Historias Listas"
              >
                <Info className="w-3 h-3 text-fog" />
              </button>
            </span>
            <div className="p-1.5 rounded-md bg-lavender/10 text-lavender">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="font-display text-2xl font-bold text-bone font-mono">
              {currentCompletedStories}/{currentTotalStories}
            </span>
            <p className="text-[11px] text-fog mt-0.5">{storiesRate}% del total</p>
          </div>
          <div className="mt-3 flex items-center justify-between text-[10px] text-fog">
            <span>
              {currentTotalStories - currentCompletedStories} pendientes
            </span>
            <span className="font-mono text-mist">
              Backlog global: {project.completedStories}/{project.totalStories}
            </span>
          </div>
          {activeKpiHelp === 'stories' && (
            <div className="absolute inset-0 bg-obsidian/95 p-3 rounded-cards text-[11px] text-mist flex flex-col justify-between z-10 border border-lavender/40">
              <p>
                Número de historias de usuario cuyos criterios de aceptación han sido completados y verificados mediante sus tareas en Kanban.
              </p>
              <button
                type="button"
                onClick={() => setActiveKpiHelp(null)}
                className="text-lavender text-[10px] font-semibold self-end"
              >
                Entendido
              </button>
            </div>
          )}
        </motion.div>

        {/* KPI 5: Tasks Done */}
        <motion.div
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 8 }}
          animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ duration: 0.34 }}
          className="p-4 rounded-cards bg-carbon border border-graphite shadow-subtle flex flex-col justify-between col-span-2 lg:col-span-1 relative group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-fog flex items-center gap-1">
              Tareas en Hecho (Done)
              <button
                type="button"
                onClick={() => setActiveKpiHelp(activeKpiHelp === 'tasks' ? null : 'tasks')}
                className="text-fog hover:text-bone cursor-pointer"
                title="Ver explicación de Tareas en Hecho"
                aria-label="Información de Tareas en Hecho"
              >
                <Info className="w-3 h-3 text-fog" />
              </button>
            </span>
            <div className="p-1.5 rounded-md bg-amber-400/10 text-amber-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="font-display text-2xl font-bold text-bone font-mono">
              {statusCounts.DONE}/{totalTasksCount}
            </span>
            <p className="text-[11px] text-fog mt-0.5">
              {totalTasksCount > 0
                ? `${Math.round((statusCounts.DONE / totalTasksCount) * 100)}% de tareas técnicas`
                : 'Sin tareas'}
            </p>
          </div>
          <div className="mt-3 flex items-center justify-between text-[10px] text-fog">
            <span className="text-amber-400 font-mono">
              {statusCounts.IN_PROGRESS + statusCounts.TESTING} en curso
            </span>
            <span className="text-fog font-mono">{statusCounts.TODO} por hacer</span>
          </div>
          {activeKpiHelp === 'tasks' && (
            <div className="absolute inset-0 bg-obsidian/95 p-3 rounded-cards text-[11px] text-mist flex flex-col justify-between z-10 border border-amber-400/40">
              <p>
                Distribución operativa de las tareas de desarrollo en el tablero Kanban. Una historia solo pasa a completada cuando todas sus tareas llegan a <strong>DONE</strong>.
              </p>
              <button
                type="button"
                onClick={() => setActiveKpiHelp(null)}
                className="text-amber-400 text-[10px] font-semibold self-end"
              >
                Entendido
              </button>
            </div>
          )}
        </motion.div>
      </div>

      {/* Main Visuals Grid: Comparative Bar Chart & ENLARGED Task Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left Chart: Velocity Comparison Bar Chart */}
        <div className="lg:col-span-7 rounded-cards bg-carbon border border-graphite p-5 flex flex-col justify-between shadow-subtle">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-graphite">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-iris-violet" />
                <h2 className="text-[14px] font-semibold text-bone">
                  Velocidad por Sprint (Comprometidos vs Entregados)
                </h2>
              </div>
              <div className="flex items-center gap-3 text-[12px] text-fog">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-smoke border border-graphite" />
                  Planificados
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-gradient-to-r from-iris-violet to-signal-teal" />
                  Completados
                </span>
              </div>
            </div>

            {/* Context Note & Reference Capacity Line */}
            <div className="mt-3 flex items-center justify-between text-[11px] text-fog px-1">
              <span>Haz clic en un Sprint para filtrar sus detalles</span>
              {closedAverageVelocity > 0 && (
                <span className="font-mono text-iris-violet flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-iris-violet inline-block" /> Capacidad media: {closedAverageVelocity} pts/sprint
                </span>
              )}
            </div>

            {metrics.length === 0 ? (
              <div className="py-16 text-center">
                <EmptyState
                  compact
                  icon={<BarChart3 className="w-5 h-5" />}
                  title="Sin datos de velocidad disponibles"
                  description="Se calculará la velocidad una vez que completes o planifiques el primer Sprint en este proyecto."
                />
              </div>
            ) : (
              <div className="py-4 space-y-4">
                {metrics.map((row) => {
                  const plannedW = Math.round((row.plannedPoints / maxPoints) * 100);
                  const completedW = Math.round((row.completedPoints / maxPoints) * 100);
                  const isHovered = activeTooltip?.sprintId === row.sprintId;
                  const isSelected = selectedSprintId === row.sprintId;
                  const rate =
                    row.plannedPoints > 0
                      ? Math.round((row.completedPoints / row.plannedPoints) * 100)
                      : 0;
                  const diff = row.completedPoints - row.plannedPoints;

                  return (
                    <div
                      key={row.sprintId}
                      onMouseEnter={() => setActiveTooltip(row)}
                      onMouseLeave={() => setActiveTooltip(null)}
                      onClick={() =>
                        setSelectedSprintId(selectedSprintId === row.sprintId ? 'ALL' : row.sprintId)
                      }
                      className={`p-3 rounded-inputs transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-obsidian border-iris-violet/70 shadow-glow'
                          : isHovered
                          ? 'bg-obsidian/70 border-graphite'
                          : 'bg-transparent border-transparent hover:bg-obsidian/40'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[12px] mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`font-medium truncate ${
                              isSelected ? 'text-iris-violet font-semibold' : 'text-bone'
                            }`}
                          >
                            {row.sprintName}
                          </span>
                          <SprintStatusText status={row.status} />
                          {isSelected && (
                            <Badge variant="purple" size="sm">
                              Filtrado
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono tabular-nums text-fog text-[12px]">
                            <strong className="text-pulse-green">{row.completedPoints}</strong> /{' '}
                            {row.plannedPoints} pts
                          </span>
                          <span
                            className={`font-mono text-[11px] px-1.5 py-0.5 rounded-sm ${
                              rate >= 85
                                ? 'bg-pulse-green/10 text-pulse-green'
                                : rate >= 60
                                ? 'bg-signal-teal/10 text-signal-teal'
                                : 'bg-amber-400/10 text-amber-400'
                            }`}
                          >
                            {rate}%
                          </span>
                        </div>
                      </div>

                      {/* Dual Comparative Progress Bars */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-fog w-16 shrink-0">Compromiso</span>
                          <div className="h-2 flex-1 rounded-pills bg-obsidian overflow-hidden border border-graphite/40">
                            <motion.div
                              initial={shouldReduceMotion ? false : { width: 0 }}
                              animate={{ width: `${plannedW}%` }}
                              transition={{ duration: 0.5, ease: 'easeOut' }}
                              className="h-full bg-smoke/80 rounded-pills"
                              title={`Planificados: ${row.plannedPoints} pts`}
                            />
                          </div>
                          <span className="text-[10px] text-fog font-mono w-10 text-right">
                            {row.plannedPoints}p
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-fog w-16 shrink-0">Entregados</span>
                          <div className="h-2.5 flex-1 rounded-pills bg-obsidian overflow-hidden border border-graphite/40">
                            <motion.div
                              initial={shouldReduceMotion ? false : { width: 0 }}
                              animate={{ width: `${completedW}%` }}
                              transition={{ duration: 0.6, ease: 'easeOut' }}
                              className="h-full bg-gradient-to-r from-iris-violet to-signal-teal rounded-pills"
                              title={`Completados: ${row.completedPoints} pts`}
                            />
                          </div>
                          <span className="text-[10px] text-pulse-green font-mono font-medium w-10 text-right">
                            {row.completedPoints}p
                          </span>
                        </div>
                      </div>

                      {/* Sprint Subtitle Info on Hover/Select */}
                      {(isHovered || isSelected) && (
                        <div className="mt-2 pt-2 border-t border-graphite/40 flex items-center justify-between text-[11px] text-fog animate-fadeIn">
                          <span>
                            {row.completedStories} de {row.totalStories} historias completadas
                          </span>
                          <span className="font-mono">
                            Variación:{' '}
                            <strong
                              className={diff >= 0 ? 'text-pulse-green' : 'text-amber-400'}
                            >
                              {diff > 0 ? `+${diff}` : diff} pts
                            </strong>
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-graphite text-[11px] text-fog flex items-center justify-between">
            <span>Fuente: Registro transaccional de Sprints</span>
            <span className="font-mono">Escala de comparación: {maxPoints} pts</span>
          </div>
        </div>

        {/* Right Chart: ENLARGED Task Status Donut Chart */}
        <div className="lg:col-span-5 rounded-cards bg-carbon border border-graphite p-5 flex flex-col justify-between shadow-subtle">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-graphite">
              <div className="flex items-center gap-2">
                <PieChart className="w-4 h-4 text-signal-teal" />
                <h2 className="text-[14px] font-semibold text-bone">
                  Distribución de Tareas Técnicas
                </h2>
              </div>
              <Badge variant="default" size="sm">
                {totalTasksCount} {totalTasksCount === 1 ? 'Tarea' : 'Tareas'}
              </Badge>
            </div>

            {totalTasksCount === 0 ? (
              <div className="py-16 text-center">
                <EmptyState
                  compact
                  icon={<PieChart className="w-5 h-5" />}
                  title="Sin tareas en ejecución"
                  description="Agrega tareas técnicas en el tablero Kanban para visualizar su distribución por estado."
                />
              </div>
            ) : (
              <div className="py-4 flex flex-col items-center justify-center gap-6">
                {/* ENLARGED SVG Donut Visual (w-60 h-60 / 240px) */}
                <div className="relative w-56 h-56 sm:w-60 sm:h-60 flex items-center justify-center shrink-0">
                  <svg
                    className="w-full h-full -rotate-90 transform drop-shadow-md"
                    viewBox="0 0 200 200"
                    aria-label="Gráfico Donut de tareas por estado"
                    role="img"
                  >
                    {/* Background Ring */}
                    <circle
                      cx="100"
                      cy="100"
                      r={donutRadius}
                      fill="transparent"
                      stroke="#1E293B"
                      strokeWidth="20"
                    />
                    {/* Colored Donut Segments */}
                    {donutSegments.map((seg) => {
                      const isHovered = activeTaskSlice === seg.key;
                      return (
                        <circle
                          key={seg.key}
                          cx="100"
                          cy="100"
                          r={donutRadius}
                          fill="transparent"
                          stroke={seg.color}
                          strokeWidth={isHovered ? '24' : '20'}
                          strokeDasharray={seg.strokeDasharray}
                          strokeDashoffset={seg.strokeDashoffset}
                          strokeLinecap="round"
                          className="transition-all duration-200 cursor-pointer"
                          onMouseEnter={() => setActiveTaskSlice(seg.key)}
                          onMouseLeave={() => setActiveTaskSlice(null)}
                          onClick={() =>
                            setActiveTaskSlice(activeTaskSlice === seg.key ? null : seg.key)
                          }
                        />
                      );
                    })}
                  </svg>

                  {/* Center Content (Interactive Info) */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
                    <span className="font-display text-3xl font-extrabold text-bone font-mono tracking-tight">
                      {activeSliceData
                        ? activeSliceData.count
                        : Math.round((statusCounts.DONE / totalTasksCount) * 100) + '%'}
                    </span>
                    <span className="text-[11px] font-semibold tracking-wider uppercase mt-0.5 text-fog">
                      {activeSliceData ? activeSliceData.label : 'Completado (Done)'}
                    </span>
                    <span className="text-[10px] text-fog/80 mt-0.5 font-mono">
                      {activeSliceData
                        ? `${activeSliceData.percent}% del total`
                        : `${statusCounts.DONE} de ${totalTasksCount} tareas`}
                    </span>
                  </div>
                </div>

                {/* Interactive Legend with Badges & Counts */}
                <div className="grid grid-cols-2 gap-2.5 w-full">
                  {donutSegments.map((seg) => {
                    const isSelected = activeTaskSlice === seg.key;
                    return (
                      <div
                        key={seg.key}
                        onMouseEnter={() => setActiveTaskSlice(seg.key)}
                        onMouseLeave={() => setActiveTaskSlice(null)}
                        onClick={() =>
                          setActiveTaskSlice(activeTaskSlice === seg.key ? null : seg.key)
                        }
                        className={`flex items-center justify-between gap-2 p-2 rounded-inputs transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-obsidian border-graphite shadow-subtle'
                            : 'bg-obsidian/40 border-transparent hover:bg-obsidian/80'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-3 h-3 rounded-sm shrink-0 shadow-sm"
                            style={{ backgroundColor: seg.color }}
                          />
                          <span className="text-[12px] font-medium text-mist truncate">
                            {seg.label}
                          </span>
                        </div>
                        <span className="font-mono tabular-nums text-[12px] text-fog shrink-0">
                          <strong className="text-bone">{seg.count}</strong>{' '}
                          <span className="text-[10px]">({seg.percent}%)</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-graphite text-[11px] text-fog flex items-center justify-between">
            <span>Tablero Kanban {selectedSprintId !== 'ALL' ? '(Filtrado)' : 'activo'}</span>
            <span className="font-mono">
              Completitud: {totalTasksCount > 0 ? Math.round((statusCounts.DONE / totalTasksCount) * 100) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Burndown Analysis & Explanatory Banner */}
      <div className="rounded-cards bg-carbon border border-graphite p-5 space-y-4 shadow-subtle">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-graphite">
          <div className="flex items-center gap-2">
            <LineChart className="w-4 h-4 text-amber-400" />
            <h2 className="text-[14px] font-semibold text-bone">
              Progresión Histórica y Ritmo de Entrega (Burndown Trend)
            </h2>
          </div>
          <span className="text-[12px] text-fog">
            {metrics.length} {metrics.length === 1 ? 'Sprint evaluado' : 'Sprints evaluados'}
          </span>
        </div>

        {/* Methodological Transparency Note */}
        <div className="p-4 rounded-inputs bg-obsidian/60 border border-graphite/60 flex items-start gap-3">
          <Info className="w-4 h-4 text-iris-violet shrink-0 mt-0.5" />
          <div className="text-[12px] text-mist space-y-1">
            <p className="font-medium text-bone">
              Evolución de Entrega y Tendencia por Ciclos Iterativos
            </p>
            <p className="leading-relaxed text-fog">
              Nota metodológica Scrum: Un <em>Burndown Chart</em> diario requiere registros de quema de horas o tareas día tras día. Para garantizar máxima precisión sin inferencias artificiales, Agile Velocity presenta la progresión real de quema de Story Points entre ciclos consecutivos de Sprints concluidos y activos.
            </p>
          </div>
        </div>

        {/* Historical Sprint Cards */}
        {metrics.length > 0 && (
          <div className="space-y-3">
            <p className="text-[12px] text-fog">
              Comparativa de Story Points planificados y completados a través de los ciclos iterativos:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {metrics.map((row, idx) => {
                const diff = row.completedPoints - row.plannedPoints;
                const isPositive = diff >= 0;
                const rate =
                  row.plannedPoints > 0
                    ? Math.round((row.completedPoints / row.plannedPoints) * 100)
                    : 0;
                return (
                  <div
                    key={row.sprintId}
                    className="p-3.5 rounded-inputs bg-obsidian border border-graphite space-y-2 hover:border-iris-violet/50 transition-colors"
                  >
                    <div className="flex items-center justify-between text-[11px] text-fog">
                      <span className="font-mono">Ciclo {idx + 1}</span>
                      <SprintStatusText status={row.status} />
                    </div>
                    <p className="text-[13px] font-medium text-bone truncate">{row.sprintName}</p>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="font-mono text-fog">
                          {row.completedPoints} / {row.plannedPoints} pts
                        </span>
                        <span
                          className={`font-mono text-[11px] font-medium ${
                            isPositive ? 'text-pulse-green' : 'text-amber-400'
                          }`}
                        >
                          {diff > 0 ? `+${diff}` : diff} pts
                        </span>
                      </div>

                      {/* Mini Bar */}
                      <div className="h-1.5 w-full rounded-pills bg-carbon overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-iris-violet to-signal-teal rounded-pills"
                          style={{ width: `${Math.min(100, rate)}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-fog pt-1 border-t border-graphite/40">
                      <span>{row.completedStories}/{row.totalStories} historias</span>
                      <span className="font-mono text-mist font-semibold">{rate}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Tabular Ledger: Sprints Historical Summary */}
      <div className="rounded-cards bg-carbon border border-graphite overflow-hidden shadow-subtle">
        <div className="px-5 py-3.5 border-b border-graphite flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-bone">
            Historial Consolidado de Sprints
          </h3>
          <span className="text-[12px] text-fog font-mono">
            {metrics.length} {metrics.length === 1 ? 'Registro' : 'Registros'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-graphite text-[12px] font-medium text-fog bg-obsidian/40">
                <th className="py-3 px-4">Sprint</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4">Fechas de Ejecución</th>
                <th className="py-3 px-4 text-right">Historias (Completadas/Total)</th>
                <th className="py-3 px-4 text-right">Points Planificados</th>
                <th className="py-3 px-4 text-right">Points Entregados</th>
                <th className="py-3 px-4 text-right">Efectividad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-graphite/50 text-[13px]">
              {metrics.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[12px] text-fog">
                    No hay Sprints registrados en este proyecto.
                  </td>
                </tr>
              ) : (
                metrics.map((row) => {
                  const rate =
                    row.plannedPoints > 0
                      ? Math.round((row.completedPoints / row.plannedPoints) * 100)
                      : 0;
                  return (
                    <tr
                      key={row.sprintId}
                      className="hover:bg-obsidian/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-bone">{row.sprintName}</td>
                      <td className="py-3 px-4">
                        <SprintStatusText status={row.status} />
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-[12px] text-fog">
                        {row.startDate} → {row.endDate}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right text-mist">
                        {row.completedStories} / {row.totalStories}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right text-fog">
                        {row.plannedPoints} pts
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right text-pulse-green font-medium">
                        {row.completedPoints} pts
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right">
                        <Badge
                          variant={
                            rate >= 100 ? 'success' : rate >= 70 ? 'info' : 'warning'
                          }
                          size="sm"
                        >
                          {rate}%
                        </Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
