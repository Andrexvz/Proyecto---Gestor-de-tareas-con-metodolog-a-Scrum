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
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { SprintStatusText } from './UIHelpers';
import { Badge, EmptyState } from './ui';
import type { ProjectSummary, SprintMetricRow, TaskItem, TaskStatus } from '../types/scrum';

interface MetricsViewProps {
  project: ProjectSummary;
  metrics: SprintMetricRow[];
  tasks: TaskItem[];
}

export function MetricsView({ project, metrics, tasks }: MetricsViewProps) {
  const shouldReduceMotion = useReducedMotion();
  const [activeTooltip, setActiveTooltip] = useState<SprintMetricRow | null>(null);
  const [activeTaskSlice, setActiveTaskSlice] = useState<TaskStatus | null>(null);

  const totalDelivered = useMemo(
    () => metrics.reduce((acc, m) => acc + (m.completedPoints || 0), 0),
    [metrics]
  );
  const totalPlanned = useMemo(
    () => metrics.reduce((acc, m) => acc + (m.plannedPoints || 0), 0),
    [metrics]
  );
  const completionRate = totalPlanned > 0 ? Math.round((totalDelivered / totalPlanned) * 100) : 0;

  const totalStoriesSum = useMemo(
    () => metrics.reduce((acc, m) => acc + (m.totalStories || 0), 0),
    [metrics]
  );
  const completedStoriesSum = useMemo(
    () => metrics.reduce((acc, m) => acc + (m.completedStories || 0), 0),
    [metrics]
  );
  const storiesRate =
    totalStoriesSum > 0 ? Math.round((completedStoriesSum / totalStoriesSum) * 100) : 0;

  const averageVelocity =
    metrics.length > 0 ? Math.round(totalDelivered / metrics.length) : 0;

  const maxPoints = Math.max(
    10,
    ...metrics.map((m) => Math.max(m.plannedPoints || 0, m.completedPoints || 0))
  );

  const statusCounts: Record<TaskStatus, number> = useMemo(
    () => ({
      TODO: tasks.filter((t) => t.status === 'TODO').length,
      IN_PROGRESS: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
      TESTING: tasks.filter((t) => t.status === 'TESTING').length,
      DONE: tasks.filter((t) => t.status === 'DONE').length,
    }),
    [tasks]
  );

  const taskDistributionConfig = [
    { key: 'TODO' as TaskStatus, label: 'To Do', color: '#94A3B8', bgClass: 'bg-smoke' },
    { key: 'IN_PROGRESS' as TaskStatus, label: 'In Progress', color: '#8B5CF6', bgClass: 'bg-iris-violet' },
    { key: 'TESTING' as TaskStatus, label: 'Testing', color: '#06B6D4', bgClass: 'bg-signal-teal' },
    { key: 'DONE' as TaskStatus, label: 'Done', color: '#10B981', bgClass: 'bg-pulse-green' },
  ];

  // Donut chart calculations
  const totalTasks = tasks.length;
  const donutRadius = 40;
  const donutCircumference = 2 * Math.PI * donutRadius;

  let accumulatedPercent = 0;
  const donutSegments = taskDistributionConfig.map((item) => {
    const count = statusCounts[item.key];
    const percent = totalTasks > 0 ? count / totalTasks : 0;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="font-display text-2xl font-semibold text-bone tracking-tight">
            Métricas de Desempeño y Velocidad
          </h1>
          <Badge variant="purple" shape="pill">
            {project.code}
          </Badge>
        </div>
        <p className="mt-1 text-[13px] text-fog leading-relaxed">
          {project.name} · Análisis de velocidad del equipo, cumplimiento de Story Points y distribución operativa de tareas técnicas en Scrum.
        </p>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* KPI 1: Delivered Points */}
        <motion.div
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 8 }}
          animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className="p-4 rounded-cards bg-carbon border border-graphite shadow-subtle flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-fog">Points Entregados</span>
            <div className="p-1.5 rounded-md bg-pulse-green/10 text-pulse-green">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="font-display text-2xl font-bold text-pulse-green font-mono">
              {totalDelivered}
            </span>
            <p className="text-[11px] text-fog mt-0.5">De {totalPlanned} planificados</p>
          </div>
        </motion.div>

        {/* KPI 2: Velocity */}
        <motion.div
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 8 }}
          animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          className="p-4 rounded-cards bg-carbon border border-graphite shadow-subtle flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-fog">Velocidad Media</span>
            <div className="p-1.5 rounded-md bg-iris-violet/10 text-iris-violet">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="font-display text-2xl font-bold text-bone font-mono">
              {averageVelocity}
            </span>
            <p className="text-[11px] text-fog mt-0.5">pts / Sprint concluido</p>
          </div>
        </motion.div>

        {/* KPI 3: Completion Rate */}
        <motion.div
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 8 }}
          animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ duration: 0.26 }}
          className="p-4 rounded-cards bg-carbon border border-graphite shadow-subtle flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-fog">Cumplimiento Puntos</span>
            <div className="p-1.5 rounded-md bg-signal-teal/10 text-signal-teal">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="font-display text-2xl font-bold text-signal-teal font-mono">
              {completionRate}%
            </span>
            <p className="text-[11px] text-fog mt-0.5">Efectividad de entrega</p>
          </div>
        </motion.div>

        {/* KPI 4: Stories Rate */}
        <motion.div
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 8 }}
          animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-4 rounded-cards bg-carbon border border-graphite shadow-subtle flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-fog">Historias Listas</span>
            <div className="p-1.5 rounded-md bg-lavender/10 text-lavender">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="font-display text-2xl font-bold text-bone font-mono">
              {completedStoriesSum}/{totalStoriesSum}
            </span>
            <p className="text-[11px] text-fog mt-0.5">{storiesRate}% del total</p>
          </div>
        </motion.div>

        {/* KPI 5: Tasks Done */}
        <motion.div
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 8 }}
          animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ duration: 0.34 }}
          className="p-4 rounded-cards bg-carbon border border-graphite shadow-subtle flex flex-col justify-between col-span-2 lg:col-span-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-fog">Tareas en Done</span>
            <div className="p-1.5 rounded-md bg-amber-400/10 text-amber-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="font-display text-2xl font-bold text-bone font-mono">
              {statusCounts.DONE}/{tasks.length}
            </span>
            <p className="text-[11px] text-fog mt-0.5">
              {tasks.length > 0
                ? `${Math.round((statusCounts.DONE / tasks.length) * 100)}% de tareas técnicas`
                : 'Sin tareas'}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Main Charts Grid: Velocity Comparison & Task Status Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left Chart: Velocity Comparison Bar Chart */}
        <div className="lg:col-span-7 rounded-cards bg-carbon border border-graphite p-5 flex flex-col justify-between shadow-subtle">
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
                <span className="w-2.5 h-2.5 rounded-sm bg-iris-violet" />
                Completados
              </span>
            </div>
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

                return (
                  <div
                    key={row.sprintId}
                    onMouseEnter={() => setActiveTooltip(row)}
                    onMouseLeave={() => setActiveTooltip(null)}
                    className={`p-2 rounded-inputs transition-colors cursor-default ${
                      isHovered ? 'bg-obsidian/70' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between text-[12px] mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-bone truncate">{row.sprintName}</span>
                        <SprintStatusText status={row.status} />
                      </div>
                      <span className="font-mono tabular-nums text-fog shrink-0">
                        <strong className="text-iris-violet">{row.completedPoints}</strong> /{' '}
                        {row.plannedPoints} pts
                      </span>
                    </div>

                    {/* Dual Comparative Progress Bars */}
                    <div className="space-y-1">
                      <div className="h-2 w-full rounded-pills bg-obsidian overflow-hidden">
                        <motion.div
                          initial={shouldReduceMotion ? false : { width: 0 }}
                          animate={{ width: `${plannedW}%` }}
                          transition={{ duration: 0.5, ease: 'easeOut' }}
                          className="h-full bg-smoke/80 rounded-pills"
                          title={`Planificados: ${row.plannedPoints} pts`}
                        />
                      </div>
                      <div className="h-2.5 w-full rounded-pills bg-obsidian overflow-hidden">
                        <motion.div
                          initial={shouldReduceMotion ? false : { width: 0 }}
                          animate={{ width: `${completedW}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                          className="h-full bg-gradient-to-r from-iris-violet to-signal-teal rounded-pills"
                          title={`Completados: ${row.completedPoints} pts`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-3 border-t border-graphite text-[11px] text-fog flex items-center justify-between">
            <span>Fuente: Registro transaccional de Sprints</span>
            <span className="font-mono">Escala máx: {maxPoints} pts</span>
          </div>
        </div>

        {/* Right Chart: Task Status Donut Chart */}
        <div className="lg:col-span-5 rounded-cards bg-carbon border border-graphite p-5 flex flex-col justify-between shadow-subtle">
          <div className="flex items-center justify-between pb-3 border-b border-graphite">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-signal-teal" />
              <h2 className="text-[14px] font-semibold text-bone">
                Distribución de Tareas Técnicas
              </h2>
            </div>
            <Badge variant="default" size="sm">
              {totalTasks} Tareas
            </Badge>
          </div>

          {totalTasks === 0 ? (
            <div className="py-16 text-center">
              <EmptyState
                compact
                icon={<PieChart className="w-5 h-5" />}
                title="Sin tareas en ejecución"
                description="Agrega tareas técnicas en el tablero Kanban para visualizar su distribución por estado."
              />
            </div>
          ) : (
            <div className="py-4 flex flex-col sm:flex-row items-center justify-around gap-4">
              {/* SVG Donut Visual */}
              <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r={donutRadius}
                    fill="transparent"
                    stroke="#1E293B"
                    strokeWidth="12"
                  />
                  {donutSegments.map((seg) => (
                    <circle
                      key={seg.key}
                      cx="50"
                      cy="50"
                      r={donutRadius}
                      fill="transparent"
                      stroke={seg.color}
                      strokeWidth={activeTaskSlice === seg.key ? '14' : '12'}
                      strokeDasharray={seg.strokeDasharray}
                      strokeDashoffset={seg.strokeDashoffset}
                      strokeLinecap="round"
                      className="transition-all duration-200 cursor-pointer"
                      onMouseEnter={() => setActiveTaskSlice(seg.key)}
                      onMouseLeave={() => setActiveTaskSlice(null)}
                    />
                  ))}
                </svg>
                {/* Center Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                  <span className="font-display text-xl font-bold text-bone font-mono">
                    {activeTaskSlice
                      ? statusCounts[activeTaskSlice]
                      : Math.round((statusCounts.DONE / totalTasks) * 100) + '%'}
                  </span>
                  <span className="text-[10px] text-fog uppercase tracking-wider">
                    {activeTaskSlice
                      ? taskDistributionConfig.find((s) => s.key === activeTaskSlice)?.label
                      : 'Completado'}
                  </span>
                </div>
              </div>

              {/* Legend with Interactive Hover */}
              <div className="space-y-2 w-full sm:w-auto">
                {donutSegments.map((seg) => (
                  <div
                    key={seg.key}
                    onMouseEnter={() => setActiveTaskSlice(seg.key)}
                    onMouseLeave={() => setActiveTaskSlice(null)}
                    className={`flex items-center justify-between gap-3 px-2 py-1.5 rounded-inputs transition-colors cursor-pointer ${
                      activeTaskSlice === seg.key ? 'bg-obsidian/70' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: seg.color }}
                      />
                      <span className="text-[12px] text-mist">{seg.label}</span>
                    </div>
                    <span className="font-mono tabular-nums text-[12px] text-fog">
                      <strong className="text-bone">{seg.count}</strong> ({seg.percent}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-graphite text-[11px] text-fog flex items-center justify-between">
            <span>Tablero Kanban activo</span>
            <span>Total: {totalTasks} tareas</span>
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

        {metrics.length < 2 ? (
          <div className="p-4 rounded-inputs bg-obsidian/60 border border-graphite/60 flex items-start gap-3">
            <Info className="w-4 h-4 text-iris-violet shrink-0 mt-0.5" />
            <div className="text-[12px] text-mist space-y-1">
              <p className="font-medium text-bone">
                Cálculo de Burndown estadístico en espera
              </p>
              <p className="leading-relaxed">
                El Burndown Chart requiere al menos dos Sprints concluidos para proyectar la pendiente ideal de quema frente al ritmo real del equipo sin inferencias artificiales. Actualmente se dispone de {metrics.length} Sprint(s) en la base de datos de Agile Velocity.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[12px] text-fog">
              Comparativa de Story Points planificados y completados a través de los ciclos iterativos:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {metrics.map((row, idx) => {
                const diff = row.completedPoints - row.plannedPoints;
                const isPositive = diff >= 0;
                return (
                  <div
                    key={row.sprintId}
                    className="p-3 rounded-inputs bg-obsidian border border-graphite space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px] text-fog">
                      <span>Ciclo {idx + 1}</span>
                      <SprintStatusText status={row.status} />
                    </div>
                    <p className="text-[13px] font-medium text-bone truncate">{row.sprintName}</p>
                    <div className="flex items-center justify-between pt-1 text-[12px]">
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
            {metrics.length} Registros
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
