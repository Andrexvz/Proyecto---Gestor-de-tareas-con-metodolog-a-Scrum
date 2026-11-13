import React, { useMemo, useState } from 'react';
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ListTodo,
  ArrowRight,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { ConfirmDialog, PrioritySignal } from './UIHelpers';
import type { ProjectSummary, Sprint, StoryPriority, TaskItem, UserStory } from '../types/scrum';

interface BacklogViewProps {
  project: ProjectSummary;
  sprints: Sprint[];
  stories: UserStory[];
  tasks: TaskItem[];
  loading: boolean;
  onNewStory: () => void;
  onEditStory: (story: UserStory) => void;
  onGoToSprints: () => void;
  onRefresh: () => Promise<void>;
}

export function BacklogView({
  project,
  sprints,
  stories,
  tasks,
  loading,
  onNewStory,
  onEditStory,
  onGoToSprints,
  onRefresh,
}: BacklogViewProps) {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | StoryPriority>('ALL');
  const [scopeFilter, setScopeFilter] = useState<'BACKLOG' | 'ALL'>('ALL');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserStory | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canManageStories = project.myRole === 'ADMIN' || project.myRole === 'PRODUCT_OWNER';
  const canPlanSprints =
    project.myRole === 'ADMIN' ||
    project.myRole === 'PRODUCT_OWNER' ||
    project.myRole === 'SCRUM_MASTER';

  const sprintById = useMemo(() => {
    const map = new Map<number, Sprint>();
    for (const s of sprints) map.set(s.id, s);
    return map;
  }, [sprints]);

  const filteredStories = useMemo(() => {
    return stories.filter((s) => {
      if (scopeFilter === 'BACKLOG' && s.sprintId !== null) return false;
      if (priorityFilter !== 'ALL' && s.priority !== priorityFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const match =
          s.title.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [stories, scopeFilter, priorityFilter, search]);

  const handleDeleteStory = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/v1/stories/${deleteTarget.id}`, { method: 'DELETE' });
      showToast('Historia eliminada del backlog', 'info');
      setDeleteTarget(null);
      await onRefresh();
    } catch (err: any) {
      showToast(err?.message || 'No se pudo eliminar la historia', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleQuickEstimate = async (storyId: number, newPoints: number) => {
    try {
      await apiFetch(`/api/v1/stories/${storyId}`, {
        method: 'PATCH',
        body: JSON.stringify({ storyPoints: newPoints }),
      });
      showToast('Estimación actualizada', 'success');
      await onRefresh();
    } catch (err: any) {
      showToast(err?.message || 'Error al actualizar Story Points', 'error');
    }
  };

  const availableTargetSprints = sprints.filter((s) => s.status !== 'CLOSED');

  const handleAssignSprint = async (storyId: number, sprintId: number | null) => {
    try {
      await apiFetch(`/api/v1/stories/${storyId}/sprint`, {
        method: 'PATCH',
        body: JSON.stringify({ sprintId }),
      });
      showToast(
        sprintId ? 'Historia movida al Sprint' : 'Historia devuelta al Product Backlog',
        'success'
      );
      await onRefresh();
    } catch (err: any) {
      showToast(err?.message || 'Error al asignar Sprint', 'error');
    }
  };

  const totalPoints = filteredStories.reduce((acc, s) => acc + (s.storyPoints || 0), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-white tracking-tight">
            Product Backlog
          </h1>
          <p className="mt-1 text-[13px] text-[#8D90A0]">
            {project.name} · <span className="font-mono tabular-nums">{filteredStories.length}</span>{' '}
            historias · <span className="font-mono tabular-nums">{totalPoints}</span> Story Points
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onGoToSprints}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#131B2E] hover:bg-[#1E293B] border border-[#334155] text-[13px] font-medium text-[#DAE2FD] transition-colors whitespace-nowrap"
          >
            Planificar Sprints
            <ArrowRight className="w-4 h-4" />
          </button>
          {canManageStories && (
            <button
              type="button"
              onClick={onNewStory}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-[13px] font-medium text-white transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Nueva historia
            </button>
          )}
        </div>
      </div>

      {/* Filters toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 rounded-xl bg-[#0F172A] border border-[#1E293B]">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#8D90A0] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código o título..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#0B0F17] border border-[#2D3449] rounded-lg text-[13px] text-white placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-[#0B0F17] rounded-lg border border-[#1E293B]">
            <button
              type="button"
              onClick={() => setScopeFilter('ALL')}
              className={`px-3 py-1 text-[12px] font-medium rounded-md transition-colors whitespace-nowrap ${
                scopeFilter === 'ALL' ? 'bg-[#1E293B] text-white' : 'text-[#8D90A0] hover:text-white'
              }`}
            >
              Todas
            </button>
            <button
              type="button"
              onClick={() => setScopeFilter('BACKLOG')}
              className={`px-3 py-1 text-[12px] font-medium rounded-md transition-colors whitespace-nowrap ${
                scopeFilter === 'BACKLOG'
                  ? 'bg-[#1E293B] text-white'
                  : 'text-[#8D90A0] hover:text-white'
              }`}
            >
              Sin Sprint asignado
            </button>
          </div>

          <div className="flex items-center gap-1 p-1 bg-[#0B0F17] rounded-lg border border-[#1E293B]">
            {(['ALL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((prio) => {
              const label =
                prio === 'ALL'
                  ? 'Todas'
                  : prio === 'HIGH'
                  ? 'Alta'
                  : prio === 'MEDIUM'
                  ? 'Media'
                  : 'Baja';
              return (
                <button
                  key={prio}
                  type="button"
                  onClick={() => setPriorityFilter(prio)}
                  className={`px-2.5 py-1 text-[12px] font-medium rounded-md transition-colors whitespace-nowrap ${
                    priorityFilter === prio
                      ? 'bg-[#2563EB] text-white'
                      : 'text-[#8D90A0] hover:text-white'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Stories List */}
      {loading ? (
        <div className="space-y-2.5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 rounded-xl skeleton-wave border border-[#1E293B]" />
          ))}
        </div>
      ) : filteredStories.length === 0 ? (
        <div className="rounded-xl bg-[#0F172A] border border-[#1E293B] py-14 px-6 text-center">
          <div className="w-11 h-11 rounded-xl bg-[#171F33] border border-[#2D3449] flex items-center justify-center mx-auto text-[#8D90A0]">
            <ListTodo className="w-5 h-5" />
          </div>
          <h2 className="mt-3.5 font-display text-base font-semibold text-white">
            Aún no hay historias de usuario que coincidan
          </h2>
          <p className="mt-1 text-[13px] text-[#8D90A0]">
            {stories.length === 0
              ? 'Crea la primera historia de usuario o utiliza el Asistente IA para generar el borrador.'
              : 'Prueba limpiando los filtros o la búsqueda actual.'}
          </p>
          {canManageStories && stories.length === 0 && (
            <button
              type="button"
              onClick={onNewStory}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-[13px] font-medium text-white"
            >
              <Plus className="w-4 h-4" />
              Crear historia
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-xl bg-[#0F172A] border border-[#1E293B] divide-y divide-[#1E293B] overflow-hidden">
          {filteredStories.map((story) => {
            const sprint = story.sprintId ? sprintById.get(story.sprintId) : null;
            const storyTasks = tasks.filter((t) => t.userStoryId === story.id);
            const doneTasks = storyTasks.filter((t) => t.status === 'DONE').length;
            const isExpanded = expandedId === story.id;
            const lockedDelete =
              sprint && (sprint.status === 'ACTIVE' || sprint.status === 'CLOSED');

            return (
              <div key={story.id} className="hover:bg-[#131B2E]/60 transition-colors">
                <div className="px-4 py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : story.id)}
                      className="mt-0.5 p-1 rounded hover:bg-[#1E293B] text-[#8D90A0] hover:text-white shrink-0"
                      aria-label="Ver detalles de la historia"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        <span className="font-mono text-[12px] font-medium text-[#B4C5FF]">
                          {story.code}
                        </span>
                        <span className="text-[#475569]" aria-hidden="true">
                          ·
                        </span>
                        <PrioritySignal priority={story.priority} />
                        <span className="text-[#475569]" aria-hidden="true">
                          ·
                        </span>
                        <span className="text-[12px] text-[#8D90A0]">
                          {sprint ? sprint.name : 'Product Backlog'}
                        </span>
                        {story.isCompleted && (
                          <>
                            <span className="text-[#475569]" aria-hidden="true">
                              ·
                            </span>
                            <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[#4EDEA3]">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Completada
                            </span>
                          </>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : story.id)}
                        className="mt-1 text-left text-[14px] font-medium text-white hover:text-[#B4C5FF] transition-colors block"
                      >
                        {story.title}
                      </button>
                    </div>
                  </div>

                  {/* Right metrics & controls */}
                  <div className="flex flex-wrap items-center gap-3 pl-8 lg:pl-0 shrink-0">
                    <span className="font-mono tabular-nums text-[12px] text-[#8D90A0]">
                      {doneTasks}/{storyTasks.length} tareas
                    </span>

                    {/* Quick Sprint Assign */}
                    {canPlanSprints && (!sprint || sprint.status !== 'CLOSED') && (
                      <select
                        value={story.sprintId ?? ''}
                        onChange={(e) =>
                          handleAssignSprint(
                            story.id,
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                        aria-label="Asignar a Sprint"
                        className="px-2.5 py-1 bg-[#131B2E] border border-[#2D3449] rounded-md text-[12px] text-[#DAE2FD] focus:outline-none focus:border-[#3B82F6]"
                      >
                        <option value="">Backlog</option>
                        {availableTargetSprints.map((sp) => (
                          <option key={sp.id} value={sp.id}>
                            {sp.name}
                          </option>
                        ))}
                      </select>
                    )}

                    {/* Story Points selector */}
                    <select
                      value={story.storyPoints}
                      onChange={(e) => handleQuickEstimate(story.id, Number(e.target.value))}
                      aria-label="Story Points"
                      className="px-2.5 py-1 bg-[#131B2E] border border-[#2D3449] rounded-md font-mono tabular-nums text-[12px] text-white focus:outline-none focus:border-[#3B82F6]"
                    >
                      {[0, 1, 2, 3, 5, 8, 13, 21].map((pt) => (
                        <option key={pt} value={pt}>
                          {pt} pts
                        </option>
                      ))}
                    </select>

                    {canManageStories && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onEditStory(story)}
                          className="p-1.5 rounded-md text-[#8D90A0] hover:text-white hover:bg-[#1E293B]"
                          title="Editar historia"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={Boolean(lockedDelete)}
                          onClick={() => setDeleteTarget(story)}
                          title={
                            lockedDelete
                              ? 'No se puede eliminar una historia de un Sprint activo o cerrado'
                              : 'Eliminar historia'
                          }
                          className="p-1.5 rounded-md text-[#8D90A0] hover:text-[#F43F5E] hover:bg-[#1E293B] disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-11 pb-4 pt-1 space-y-3 text-[13px] border-t border-[#1E293B]/60 bg-[#0B0F17]/40">
                    <p className="text-[#C3C6D7] leading-6">
                      {story.description || 'Sin descripción narrativa.'}
                    </p>
                    {story.acceptanceCriteria.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[12px] font-semibold text-white">
                          Criterios de Aceptación
                        </p>
                        <ul className="space-y-1 text-[12px] text-[#C3C6D7] list-disc pl-5">
                          {story.acceptanceCriteria.map((c, idx) => (
                            <li key={idx}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Eliminar ${deleteTarget?.code}`}
        description="Esta acción eliminará la historia de usuario y sus tareas asociadas del backlog. ¿Deseas continuar?"
        confirmLabel="Eliminar historia"
        loading={deleting}
        onConfirm={handleDeleteStory}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
