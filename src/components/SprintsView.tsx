import React, { useMemo, useState } from 'react';
import {
  Plus,
  Play,
  CheckSquare,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Kanban,
  X,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { PrioritySignal, SprintStatusText } from './UIHelpers';
import type { ProjectSummary, Sprint, SprintCloseSummary, UserStory } from '../types/scrum';

interface SprintsViewProps {
  project: ProjectSummary;
  sprints: Sprint[];
  stories: UserStory[];
  onGoToKanban: () => void;
  onRefresh: () => Promise<void>;
}

export function SprintsView({
  project,
  sprints,
  stories,
  onGoToKanban,
  onRefresh,
}: SprintsViewProps) {
  const { showToast } = useToast();

  const canManageSprints =
    project.myRole === 'ADMIN' ||
    project.myRole === 'SCRUM_MASTER' ||
    project.myRole === 'PRODUCT_OWNER';

  const activeSprint = sprints.find((s) => s.status === 'ACTIVE') ?? null;

  // Default target sprint for moving backlog items
  const defaultTargetId =
    sprints.find((s) => s.status === 'PLANNING')?.id ?? activeSprint?.id ?? null;
  const [selectedTargetSprintId, setSelectedTargetSprintId] = useState<number | null>(
    defaultTargetId
  );

  // Create Sprint modal
  const [createOpen, setCreateOpen] = useState(false);
  const [sprintName, setSprintName] = useState('');
  const [sprintGoal, setSprintGoal] = useState('');
  const [startDate, setStartDate] = useState('2026-11-18');
  const [endDate, setEndDate] = useState('2026-12-02');
  const [creating, setCreating] = useState(false);
  const [dateError, setDateError] = useState('');

  // Close Sprint confirmation + result summary
  const [closeModalSprint, setCloseModalSprint] = useState<Sprint | null>(null);
  const [closing, setClosing] = useState(false);
  const [closeSummary, setCloseSummary] = useState<SprintCloseSummary | null>(null);

  const backlogStories = useMemo(
    () => stories.filter((s) => s.sprintId === null),
    [stories]
  );

  const effectiveTargetId =
    selectedTargetSprintId && sprints.some((s) => s.id === selectedTargetSprintId && s.status !== 'CLOSED')
      ? selectedTargetSprintId
      : sprints.find((s) => s.status === 'PLANNING')?.id ?? activeSprint?.id ?? null;

  const handleCreateSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    setDateError('');
    if (new Date(endDate) <= new Date(startDate)) {
      setDateError('La fecha de finalización debe ser estrictamente posterior a la fecha de inicio');
      return;
    }
    setCreating(true);
    try {
      const res = await apiFetch<{ sprint: Sprint }>(`/api/v1/projects/${project.id}/sprints`, {
        method: 'POST',
        body: JSON.stringify({
          name: sprintName,
          goal: sprintGoal,
          startDate,
          endDate,
        }),
      });
      showToast('Sprint creado en estado Planificación', 'success');
      setCreateOpen(false);
      setSprintName('');
      setSprintGoal('');
      setSelectedTargetSprintId(res.sprint.id);
      await onRefresh();
    } catch (err: any) {
      showToast(err?.message || 'Error al crear Sprint', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleMoveStory = async (storyId: number, targetSprintId: number | null) => {
    try {
      await apiFetch(`/api/v1/stories/${storyId}/sprint`, {
        method: 'PATCH',
        body: JSON.stringify({ sprintId: targetSprintId }),
      });
      showToast(
        targetSprintId ? 'Historia agregada al Sprint Backlog' : 'Historia devuelta al Product Backlog',
        'success'
      );
      await onRefresh();
    } catch (err: any) {
      showToast(err?.message || 'No se pudo mover la historia', 'error');
    }
  };

  const handleStartSprint = async (sprintId: number) => {
    try {
      await apiFetch(`/api/v1/sprints/${sprintId}/start`, { method: 'POST' });
      showToast('Sprint iniciado correctamente', 'success');
      await onRefresh();
    } catch (err: any) {
      showToast(err?.message || 'No se pudo iniciar el Sprint', 'error');
    }
  };

  const handleConfirmCloseSprint = async () => {
    if (!closeModalSprint) return;
    setClosing(true);
    try {
      const res = await apiFetch<{ summary: SprintCloseSummary }>(
        `/api/v1/sprints/${closeModalSprint.id}/close`,
        { method: 'POST' }
      );
      showToast('Sprint finalizado correctamente', 'success');
      setCloseModalSprint(null);
      setCloseSummary(res.summary);
      await onRefresh();
    } catch (err: any) {
      showToast(err?.message || 'Error al cerrar el Sprint', 'error');
    } finally {
      setClosing(false);
    }
  };

  const closeModalStats = useMemo(() => {
    if (!closeModalSprint) return { completed: [], incomplete: [] };
    const spStories = stories.filter((s) => s.sprintId === closeModalSprint.id);
    return {
      completed: spStories.filter((s) => s.isCompleted),
      incomplete: spStories.filter((s) => !s.isCompleted),
    };
  }, [closeModalSprint, stories]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-white tracking-tight">
            Planificación de Sprints
          </h1>
          <p className="mt-1 text-[13px] text-[#8D90A0]">
            Organiza iteraciones, asigna historias del Product Backlog y controla el ciclo de vida del Sprint.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {activeSprint && (
            <button
              type="button"
              onClick={onGoToKanban}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#131B2E] hover:bg-[#1E293B] border border-[#334155] text-[13px] font-medium text-[#4EDEA3] transition-colors whitespace-nowrap"
            >
              <Kanban className="w-4 h-4" />
              Ir al Tablero Kanban
            </button>
          )}
          {canManageSprints && (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-[13px] font-medium text-white transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Crear Sprint
            </button>
          )}
        </div>
      </div>

      {/* Sprint Closure Summary Banner (Step 6 User Flow) */}
      {closeSummary && (
        <div className="rounded-xl bg-[#131B2E] border border-[#10B981]/40 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#4EDEA3] shrink-0 mt-0.5" />
            <div>
              <h2 className="font-display text-[15px] font-semibold text-white">
                Resumen de cierre · {closeSummary.sprintName}
              </h2>
              <p className="mt-1 text-[13px] text-[#C3C6D7]">
                Historias completadas:{' '}
                <span className="font-mono tabular-nums text-white">
                  {closeSummary.completedStoriesCount}
                </span>{' '}
                · Devueltas al Backlog:{' '}
                <span className="font-mono tabular-nums text-white">
                  {closeSummary.returnedStoriesCount}
                </span>{' '}
                · Story Points entregados:{' '}
                <span className="font-mono tabular-nums text-[#4EDEA3]">
                  {closeSummary.deliveredPoints} / {closeSummary.plannedPoints}
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCloseSummary(null)}
            className="text-[12px] text-[#8D90A0] hover:text-white self-end sm:self-center"
          >
            Ocultar
          </button>
        </div>
      )}

      {/* Dual Pane Planning Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Product Backlog */}
        <section className="lg:col-span-5 rounded-xl bg-[#0F172A] border border-[#1E293B] overflow-hidden">
          <div className="px-4 py-3.5 border-b border-[#1E293B] flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[14px] font-semibold text-white">Product Backlog</h2>
              <p className="text-[12px] text-[#8D90A0]">
                <span className="font-mono tabular-nums">{backlogStories.length}</span> historias disponibles
              </p>
            </div>

            {canManageSprints && sprints.some((s) => s.status !== 'CLOSED') && (
              <select
                value={effectiveTargetId ?? ''}
                onChange={(e) => setSelectedTargetSprintId(Number(e.target.value))}
                aria-label="Sprint destino"
                className="px-2.5 py-1.5 bg-[#131B2E] border border-[#2D3449] rounded-lg text-[12px] text-white max-w-[180px]"
              >
                {sprints
                  .filter((s) => s.status !== 'CLOSED')
                  .map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      Destino: {sp.name}
                    </option>
                  ))}
              </select>
            )}
          </div>

          <div className="divide-y divide-[#1E293B] max-h-[600px] overflow-y-auto">
            {backlogStories.length === 0 ? (
              <p className="py-12 px-4 text-center text-[13px] text-[#8D90A0]">
                No hay historias pendientes en el Product Backlog.
              </p>
            ) : (
              backlogStories.map((story) => (
                <div
                  key={story.id}
                  className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-[#131B2E]/60 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="font-mono text-[#B4C5FF]">{story.code}</span>
                      <span className="text-[#475569]">·</span>
                      <PrioritySignal priority={story.priority} />
                      <span className="text-[#475569]">·</span>
                      <span className="font-mono tabular-nums text-[#8D90A0]">
                        {story.storyPoints} pts
                      </span>
                    </div>
                    <p className="mt-1 text-[13px] font-medium text-white truncate">
                      {story.title}
                    </p>
                  </div>

                  {canManageSprints && effectiveTargetId && (
                    <button
                      type="button"
                      onClick={() => handleMoveStory(story.id, effectiveTargetId)}
                      title="Mover al Sprint seleccionado"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[#171F33] hover:bg-[#2563EB] border border-[#2D3449] text-[12px] text-[#DAE2FD] hover:text-white transition-colors shrink-0 whitespace-nowrap"
                    >
                      Asignar
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* Right: Sprints List */}
        <section className="lg:col-span-7 space-y-4">
          {sprints.length === 0 ? (
            <div className="rounded-xl bg-[#0F172A] border border-[#1E293B] py-14 px-6 text-center">
              <p className="text-[14px] font-medium text-white">No hay Sprints creados aún</p>
              <p className="mt-1 text-[13px] text-[#8D90A0]">
                Crea un Sprint en estado Planificación para asignar historias del backlog.
              </p>
            </div>
          ) : (
            [...sprints]
              .sort((a, b) => {
                const order = { ACTIVE: 0, PLANNING: 1, CLOSED: 2 };
                return order[a.status] - order[b.status];
              })
              .map((sprint) => {
                const sprintStories = stories.filter((s) => s.sprintId === sprint.id);
                const totalPts = sprintStories.reduce((acc, s) => acc + (s.storyPoints || 0), 0);
                const anotherActiveExists = Boolean(activeSprint && activeSprint.id !== sprint.id);

                return (
                  <div
                    key={sprint.id}
                    className={`rounded-xl bg-[#131B2E] border overflow-hidden ${
                      sprint.status === 'ACTIVE'
                        ? 'border-[#10B981]/40'
                        : 'border-[#222A3D]'
                    }`}
                  >
                    <div className="px-5 py-4 border-b border-[#1E293B] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <h3 className="font-display text-[16px] font-semibold text-white">
                            {sprint.name}
                          </h3>
                          <SprintStatusText status={sprint.status} />
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[12px] text-[#8D90A0]">
                          <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                            <Calendar className="w-3.5 h-3.5" />
                            {sprint.startDate} → {sprint.endDate}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums text-[#C3C6D7]">
                            {sprintStories.length} historias · {totalPts} pts
                          </span>
                        </div>
                        {sprint.goal && (
                          <p className="text-[12px] text-[#C3C6D7] pt-0.5">{sprint.goal}</p>
                        )}
                      </div>

                      {canManageSprints && (
                        <div className="flex items-center gap-2 shrink-0">
                          {sprint.status === 'PLANNING' && (
                            <button
                              type="button"
                              disabled={anotherActiveExists}
                              onClick={() => handleStartSprint(sprint.id)}
                              title={
                                anotherActiveExists
                                  ? 'Ya existe un Sprint activo. Debes cerrarlo antes de iniciar uno nuevo.'
                                  : 'Iniciar Sprint'
                              }
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[12px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                            >
                              <Play className="w-3.5 h-3.5" />
                              Iniciar Sprint
                            </button>
                          )}
                          {sprint.status === 'ACTIVE' && (
                            <>
                              <button
                                type="button"
                                onClick={onGoToKanban}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1E293B] hover:bg-[#2D3449] text-[#DAE2FD] text-[12px] font-medium transition-colors whitespace-nowrap"
                              >
                                <Kanban className="w-3.5 h-3.5" />
                                Kanban
                              </button>
                              <button
                                type="button"
                                onClick={() => setCloseModalSprint(sprint)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-[12px] font-medium transition-colors whitespace-nowrap"
                              >
                                <CheckSquare className="w-3.5 h-3.5" />
                                Cerrar Sprint
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Stories inside Sprint */}
                    <div className="divide-y divide-[#1E293B] bg-[#0F172A]/60">
                      {sprintStories.length === 0 ? (
                        <p className="py-6 px-4 text-center text-[12px] text-[#8D90A0]">
                          Sprint Backlog vacío. Asigna historias desde el panel izquierdo.
                        </p>
                      ) : (
                        sprintStories.map((story) => (
                          <div
                            key={story.id}
                            className="px-4 py-2.5 flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="font-mono text-[11px] text-[#B4C5FF] shrink-0">
                                {story.code}
                              </span>
                              <span className="text-[13px] text-[#DAE2FD] truncate">
                                {story.title}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <PrioritySignal priority={story.priority} />
                              <span className="font-mono tabular-nums text-[12px] text-[#8D90A0]">
                                {story.storyPoints} pts
                              </span>
                              {story.isCompleted && (
                                <CheckCircle2
                                  className="w-4 h-4 text-[#4EDEA3]"
                                  aria-label="Completada"
                                />
                              )}
                              {canManageSprints && sprint.status !== 'CLOSED' && (
                                <button
                                  type="button"
                                  onClick={() => handleMoveStory(story.id, null)}
                                  title="Devolver al Product Backlog"
                                  className="p-1 rounded hover:bg-[#1E293B] text-[#8D90A0] hover:text-white transition-colors"
                                >
                                  <ArrowLeft className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })
          )}
        </section>
      </div>

      {/* Create Sprint Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-[2px] p-4">
          <form
            onSubmit={handleCreateSprint}
            className="w-full max-w-md rounded-xl bg-[#171F33] border border-[#334155] p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-white">Crear Sprint</h2>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="text-[#8D90A0] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#C3C6D7] mb-1.5">
                Nombre del Sprint *
              </label>
              <input
                type="text"
                required
                value={sprintName}
                onChange={(e) => setSprintName(e.target.value)}
                placeholder="Ej. Sprint 16 — Integración Pasarela"
                className="w-full px-3.5 py-2 bg-[#0F172A] border border-[#334155] rounded-lg text-[13px] text-white focus:outline-none focus:border-[#3B82F6]"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#C3C6D7] mb-1.5">
                Objetivo del Sprint
              </label>
              <textarea
                rows={2}
                value={sprintGoal}
                onChange={(e) => setSprintGoal(e.target.value)}
                placeholder="Meta funcional principal de la iteración..."
                className="w-full px-3.5 py-2 bg-[#0F172A] border border-[#334155] rounded-lg text-[13px] text-white focus:outline-none focus:border-[#3B82F6]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-medium text-[#C3C6D7] mb-1.5">
                  Fecha inicio *
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setDateError('');
                  }}
                  className="w-full px-3 py-2 bg-[#0F172A] border border-[#334155] rounded-lg text-[13px] font-mono text-white"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#C3C6D7] mb-1.5">
                  Fecha fin *
                </label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setDateError('');
                  }}
                  className="w-full px-3 py-2 bg-[#0F172A] border border-[#334155] rounded-lg text-[13px] font-mono text-white"
                />
              </div>
            </div>
            {dateError && <p className="text-[12px] text-[#FDA4AF]">{dateError}</p>}

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="px-4 py-2 text-[13px] text-[#C3C6D7] hover:text-white rounded-lg hover:bg-[#222A3D]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 text-[13px] font-medium bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg disabled:opacity-60"
              >
                {creating ? 'Creando...' : 'Crear Sprint'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Transactional Close Sprint Confirmation Modal (RF-13) */}
      {closeModalSprint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-[2px] p-4">
          <div className="w-full max-w-lg rounded-xl bg-[#171F33] border border-[#334155] p-6 shadow-2xl space-y-4">
            <h2 className="font-display text-lg font-semibold text-white">
              Cerrar {closeModalSprint.name}
            </h2>

            <div className="p-3.5 rounded-lg bg-[#0F172A] border border-[#2D3449] flex items-center justify-between text-[13px]">
              <span>
                Historias completadas:{' '}
                <strong className="font-mono text-[#4EDEA3]">
                  {closeModalStats.completed.length}
                </strong>
              </span>
              <span>
                Historias pendientes:{' '}
                <strong className="font-mono text-[#FCD34D]">
                  {closeModalStats.incomplete.length}
                </strong>
              </span>
            </div>

            {closeModalStats.incomplete.length > 0 ? (
              <div className="p-3.5 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/30 space-y-2">
                <div className="flex items-start gap-2 text-[13px] text-[#FDE68A]">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#F59E0B]" />
                  <p>
                    Este Sprint contiene historias de usuario incompletas. Al cerrarlo, estas historias regresarán automáticamente al Product Backlog. ¿Deseas continuar?
                  </p>
                </div>
                <ul className="pl-6 list-disc text-[12px] text-[#C3C6D7] space-y-0.5">
                  {closeModalStats.incomplete.map((st) => (
                    <li key={st.id}>
                      <span className="font-mono text-[#B4C5FF]">{st.code}</span> · {st.title}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-[13px] text-[#C3C6D7]">
                Todas las historias de este Sprint tienen el 100% de sus tareas en estado Done. Se consolidarán los Story Points entregados.
              </p>
            )}

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setCloseModalSprint(null)}
                disabled={closing}
                className="px-4 py-2 text-[13px] text-[#C3C6D7] hover:text-white rounded-lg hover:bg-[#222A3D]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmCloseSprint}
                disabled={closing}
                className="px-4 py-2 text-[13px] font-medium bg-[#059669] hover:bg-[#047857] text-white rounded-lg disabled:opacity-60"
              >
                {closing ? 'Cerrando Sprint...' : 'Confirmar cierre'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
