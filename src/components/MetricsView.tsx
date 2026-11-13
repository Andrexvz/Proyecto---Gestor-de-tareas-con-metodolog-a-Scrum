import React from 'react';
import { SprintStatusText } from './UIHelpers';
import type { ProjectSummary, SprintMetricRow, TaskItem, TaskStatus } from '../types/scrum';

interface MetricsViewProps {
  project: ProjectSummary;
  metrics: SprintMetricRow[];
  tasks: TaskItem[];
}

export function MetricsView({ project, metrics, tasks }: MetricsViewProps) {
  const totalDelivered = metrics.reduce((acc, m) => acc + m.completedPoints, 0);
  const totalPlanned = metrics.reduce((acc, m) => acc + m.plannedPoints, 0);
  const completionRate = totalPlanned > 0 ? Math.round((totalDelivered / totalPlanned) * 100) : 0;

  const maxPoints = Math.max(10, ...metrics.map((m) => Math.max(m.plannedPoints, m.completedPoints)));

  const statusCounts: Record<TaskStatus, number> = {
    TODO: tasks.filter((t) => t.status === 'TODO').length,
    IN_PROGRESS: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
    TESTING: tasks.filter((t) => t.status === 'TESTING').length,
    DONE: tasks.filter((t) => t.status === 'DONE').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-white tracking-tight">
          Métricas y Velocidad
        </h1>
        <p className="mt-1 text-[13px] text-[#8D90A0]">
          {project.name} · Comparativa transaccional de Story Points planificados frente a completados (100% tareas en Done).
        </p>
      </div>

      {/* Summary KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl bg-[#0F172A] border border-[#1E293B] p-4">
          <p className="text-[12px] text-[#8D90A0]">Points Completados</p>
          <p className="mt-1.5 font-mono tabular-nums text-2xl font-semibold text-[#4EDEA3]">
            {totalDelivered}
          </p>
        </div>
        <div className="rounded-xl bg-[#0F172A] border border-[#1E293B] p-4">
          <p className="text-[12px] text-[#8D90A0]">Points Planificados</p>
          <p className="mt-1.5 font-mono tabular-nums text-2xl font-semibold text-white">
            {totalPlanned}
          </p>
        </div>
        <div className="rounded-xl bg-[#0F172A] border border-[#1E293B] p-4">
          <p className="text-[12px] text-[#8D90A0]">Cumplimiento Global</p>
          <p className="mt-1.5 font-mono tabular-nums text-2xl font-semibold text-[#B4C5FF]">
            {completionRate}%
          </p>
        </div>
        <div className="rounded-xl bg-[#0F172A] border border-[#1E293B] p-4">
          <p className="text-[12px] text-[#8D90A0]">Tareas Completadas</p>
          <p className="mt-1.5 font-mono tabular-nums text-2xl font-semibold text-white">
            {statusCounts.DONE} / {tasks.length}
          </p>
        </div>
      </div>

      {/* Velocity Bar Comparison + Task Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 rounded-xl bg-[#0F172A] border border-[#1E293B] p-5 space-y-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[15px] font-semibold text-white">Velocidad por Sprint</h2>
            <div className="flex items-center gap-4 text-[12px] text-[#C3C6D7]">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#334155]" />
                Planificados
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#2563EB]" />
                Completados
              </span>
            </div>
          </div>

          {metrics.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-[#8D90A0]">
              Aún no existen Sprints registrados para calcular velocidad.
            </p>
          ) : (
            <div className="space-y-4">
              {metrics.map((row) => {
                const plannedW = Math.round((row.plannedPoints / maxPoints) * 100);
                const completedW = Math.round((row.completedPoints / maxPoints) * 100);
                return (
                  <div key={row.sprintId} className="space-y-1.5">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="font-medium text-white truncate max-w-[60%]">
                        {row.sprintName}
                      </span>
                      <span className="font-mono tabular-nums text-[#C3C6D7]">
                        {row.completedPoints} / {row.plannedPoints} pts
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="h-2.5 w-full rounded bg-[#0B0F17] overflow-hidden">
                        <div
                          className="h-full bg-[#334155] rounded transition-all"
                          style={{ width: `${plannedW}%` }}
                        />
                      </div>
                      <div className="h-2.5 w-full rounded bg-[#0B0F17] overflow-hidden">
                        <div
                          className="h-full bg-[#2563EB] rounded transition-all"
                          style={{ width: `${completedW}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-5 rounded-xl bg-[#0F172A] border border-[#1E293B] p-5 space-y-5">
          <h2 className="text-[15px] font-semibold text-white">Distribución de Tareas Kanban</h2>
          <div className="space-y-3.5">
            {(
              [
                { key: 'TODO', label: 'To Do', color: 'bg-[#64748B]' },
                { key: 'IN_PROGRESS', label: 'In Progress', color: 'bg-[#3B82F6]' },
                { key: 'TESTING', label: 'Testing', color: 'bg-[#8B5CF6]' },
                { key: 'DONE', label: 'Done', color: 'bg-[#10B981]' },
              ] as const
            ).map((st) => {
              const count = statusCounts[st.key];
              const pct = tasks.length > 0 ? Math.round((count / tasks.length) * 100) : 0;
              return (
                <div key={st.key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-[#DAE2FD]">{st.label}</span>
                    <span className="font-mono tabular-nums text-[#8D90A0]">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#0B0F17] overflow-hidden">
                    <div className={`h-full ${st.color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabular Ledger */}
      <div className="rounded-xl bg-[#0F172A] border border-[#1E293B] overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#1E293B] text-[12px] text-[#8D90A0]">
              <th className="py-3 px-4 font-medium">Sprint</th>
              <th className="py-3 px-4 font-medium">Estado</th>
              <th className="py-3 px-4 font-medium">Fechas</th>
              <th className="py-3 px-4 font-medium text-right">Historias</th>
              <th className="py-3 px-4 font-medium text-right">Planificados</th>
              <th className="py-3 px-4 font-medium text-right">Completados</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E293B] text-[13px]">
            {metrics.map((row) => (
              <tr key={row.sprintId} className="hover:bg-[#131B2E]/60">
                <td className="py-3 px-4 font-medium text-white">{row.sprintName}</td>
                <td className="py-3 px-4">
                  <SprintStatusText status={row.status} />
                </td>
                <td className="py-3 px-4 font-mono tabular-nums text-[12px] text-[#8D90A0]">
                  {row.startDate} → {row.endDate}
                </td>
                <td className="py-3 px-4 font-mono tabular-nums text-right text-[#DAE2FD]">
                  {row.completedStories} / {row.totalStories}
                </td>
                <td className="py-3 px-4 font-mono tabular-nums text-right text-[#C3C6D7]">
                  {row.plannedPoints} pts
                </td>
                <td className="py-3 px-4 font-mono tabular-nums text-right text-[#4EDEA3] font-medium">
                  {row.completedPoints} pts
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
