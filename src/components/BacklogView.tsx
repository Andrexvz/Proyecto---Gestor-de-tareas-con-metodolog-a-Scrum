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
  SlidersHorizontal,
  X,
  Layers,
  Sparkles,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { apiFetch } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { ConfirmDialog, PrioritySignal } from './UIHelpers';
import { EpicManagerModal } from './EpicManagerModal';
import {
  Button,
  Input,
  Badge,
  EmptyState,
  SkeletonLoader,
} from './ui';
import type { Epic, ProjectSummary, Sprint, StoryPriority, TaskItem, UserStory } from '../types/scrum';

type SortOption = 'DEFAULT' | 'POINTS_DESC' | 'POINTS_ASC' | 'PRIORITY' | 'TITLE';

interface BacklogViewProps {
  project: ProjectSummary;
  sprints: Sprint[];
  stories: UserStory[];
  tasks: TaskItem[];
  epics?: Epic[];
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
  epics = [],
  loading,
  onNewStory,
  onEditStory,
  onGoToSprints,
  onRefresh,
}: BacklogViewProps) {
  const { showToast } = useToast();
  const shouldReduceMotion = useReducedMotion();

  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | StoryPriority>('ALL');
  const [scopeFilter, setScopeFilter] = useState<'ALL' | 'BACKLOG' | 'SPRINTS'>('ALL');
  const [selectedEpicFilter, setSelectedEpicFilter] = useState<'ALL' | 'NO_EPIC' | number>('ALL');
  const [groupByEpic, setGroupByEpic] = useState(false);
  const [epicManagerOpen, setEpicManagerOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('DEFAULT');
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

  const priorityWeight: Record<StoryPriority, number> = {
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
  };

  const filteredStories = useMemo(() => {
    let list = stories.filter((s) => {
      if (scopeFilter === 'BACKLOG' && s.sprintId !== null) return false;
      if (scopeFilter === 'SPRINTS' && s.sprintId === null) return false;
      if (priorityFilter !== 'ALL' && s.priority !== priorityFilter) return false;
      if (selectedEpicFilter === 'NO_EPIC' && s.epicId) return false;
      if (typeof selectedEpicFilter === 'number' && s.epicId !== selectedEpicFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const match =
          s.title.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          (s.epic && s.epic.name.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });

    if (sortBy === 'POINTS_DESC') {
      list = [...list].sort((a, b) => (b.storyPoints || 0) - (a.storyPoints || 0));
    } else if (sortBy === 'POINTS_ASC') {
      list = [...list].sort((a, b) => (a.storyPoints || 0) - (b.storyPoints || 0));
    } else if (sortBy === 'PRIORITY') {
      list = [...list].sort(
        (a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]
      );
    } else if (sortBy === 'TITLE') {
      list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    }

    return list;
  }, [stories, scopeFilter, priorityFilter, selectedEpicFilter, search, sortBy]);

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

  const storiesByEpic = useMemo(() => {
    if (!groupByEpic) return [];
    const groups: Array<{
      epic: Epic | null;
      stories: UserStory[];
      totalPoints: number;
    }> = [];

    // Epics with matching stories
    for (const epic of epics) {
      const epicStories = filteredStories.filter((s) => s.epicId === epic.id);
      if (epicStories.length > 0 || selectedEpicFilter === epic.id) {
        groups.push({
          epic,
          stories: epicStories,
          totalPoints: epicStories.reduce((sum, s) => sum + (s.storyPoints || 0), 0),
        });
      }
    }

    // Stories without epic
    const noEpicStories = filteredStories.filter((s) => !s.epicId);
    if (noEpicStories.length > 0) {
      groups.push({
        epic: null,
        stories: noEpicStories,
        totalPoints: noEpicStories.reduce((sum, s) => sum + (s.storyPoints || 0), 0),
      });
    }

    return groups;
  }, [groupByEpic, epics, filteredStories, selectedEpicFilter]);

  const totalPoints = filteredStories.reduce((acc, s) => acc + (s.storyPoints || 0), 0);
  const completedCount = filteredStories.filter((s) => s.isCompleted).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl font-semibold text-bone tracking-tight">
              Product Backlog
            </h1>
            <Badge variant="purple" shape="pill">
              {project.code}
            </Badge>
          </div>
          <p className="mt-1 text-[13px] text-fog">
            {project.name} ·{' '}
            <span className="font-mono tabular-nums text-bone font-medium">
              {filteredStories.length}
            </span>{' '}
            historias ({completedCount} completadas) ·{' '}
            <span className="font-mono tabular-nums text-bone font-medium">
              {totalPoints}
            </span>{' '}
            Story Points totales
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEpicManagerOpen(true)}
            icon={<Layers className="w-3.5 h-3.5 text-iris-violet" />}
            title="Administrar Épicas del proyecto (RF3, HU #4)"
          >
            Épicas ({epics.length})
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onGoToSprints}
            icon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Planificar Sprints
          </Button>
          {canManageStories && (
            <Button
              variant="primary"
              size="sm"
              onClick={onNewStory}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              Nueva historia
            </Button>
          )}
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 rounded-cards bg-carbon border border-graphite shadow-subtle">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-fog absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código, título o descripción..."
            className="w-full pl-9 pr-8 py-1.5 bg-obsidian border border-graphite rounded-inputs text-[13px] text-bone placeholder:text-ash focus:outline-none focus:border-iris-violet shadow-subtle"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fog hover:text-paper"
              aria-label="Limpiar búsqueda"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Badges & Sorters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Scope Filter */}
          <div className="flex items-center gap-1 p-0.5 bg-obsidian rounded-inputs border border-graphite text-[12px]">
            <button
              type="button"
              onClick={() => setScopeFilter('ALL')}
              className={`px-2.5 py-1 rounded-sm font-medium transition-colors ${
                scopeFilter === 'ALL'
                  ? 'bg-graphite text-paper shadow-xs'
                  : 'text-fog hover:text-paper'
              }`}
            >
              Todas
            </button>
            <button
              type="button"
              onClick={() => setScopeFilter('BACKLOG')}
              className={`px-2.5 py-1 rounded-sm font-medium transition-colors ${
                scopeFilter === 'BACKLOG'
                  ? 'bg-graphite text-paper shadow-xs'
                  : 'text-fog hover:text-paper'
              }`}
            >
              Sin Sprint
            </button>
            <button
              type="button"
              onClick={() => setScopeFilter('SPRINTS')}
              className={`px-2.5 py-1 rounded-sm font-medium transition-colors ${
                scopeFilter === 'SPRINTS'
                  ? 'bg-graphite text-paper shadow-xs'
                  : 'text-fog hover:text-paper'
              }`}
            >
              En Sprints
            </button>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1 p-0.5 bg-obsidian rounded-inputs border border-graphite text-[12px]">
            {(['ALL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((prio) => {
              const label =
                prio === 'ALL' ? 'Todas' : prio === 'HIGH' ? 'Alta' : prio === 'MEDIUM' ? 'Media' : 'Baja';
              return (
                <button
                  key={prio}
                  type="button"
                  onClick={() => setPriorityFilter(prio)}
                  className={`px-2 py-1 rounded-sm font-medium transition-colors ${
                    priorityFilter === prio
                      ? 'bg-iris-violet text-paper shadow-xs'
                      : 'text-fog hover:text-paper'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Epic Filter Dropdown */}
          {epics.length > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-obsidian rounded-inputs border border-graphite text-[12px]">
              <Layers className="w-3.5 h-3.5 text-fog shrink-0" />
              <select
                value={selectedEpicFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedEpicFilter(
                    val === 'ALL' ? 'ALL' : val === 'NO_EPIC' ? 'NO_EPIC' : Number(val)
                  );
                }}
                className="bg-transparent text-mist text-[12px] font-medium focus:outline-none cursor-pointer"
                aria-label="Filtrar por Épica"
              >
                <option value="ALL" className="bg-carbon text-bone">
                  Todas las Épicas
                </option>
                <option value="NO_EPIC" className="bg-carbon text-fog">
                  Sin Épica
                </option>
                {epics.map((ep) => (
                  <option key={ep.id} value={ep.id} className="bg-carbon text-bone">
                    ● {ep.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Group by Epic toggle */}
          {epics.length > 0 && (
            <button
              type="button"
              onClick={() => setGroupByEpic(!groupByEpic)}
              className={`px-2.5 py-1 rounded-inputs border text-[12px] font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                groupByEpic
                  ? 'bg-iris-violet/20 border-iris-violet text-iris-violet'
                  : 'bg-obsidian border-graphite text-fog hover:text-bone'
              }`}
              title="Agrupar historias visualmente por Épica"
            >
              <Layers className="w-3.5 h-3.5" />
              Agrupar por Épica
            </button>
          )}

          {/* Sort selector */}
          <div className="flex items-center gap-1.5 text-[12px]">
            <SlidersHorizontal className="w-3.5 h-3.5 text-fog shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              aria-label="Ordenar historias"
              className="px-2.5 py-1 bg-obsidian border border-graphite rounded-inputs text-[12px] text-mist focus:outline-none focus:border-iris-violet shadow-subtle cursor-pointer"
            >
              <option value="DEFAULT">Orden por defecto</option>
              <option value="PRIORITY">Prioridad más alta</option>
              <option value="POINTS_DESC">Más Story Points</option>
              <option value="POINTS_ASC">Menos Story Points</option>
              <option value="TITLE">Título alfabético</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stories List */}
      {loading ? (
        <div className="space-y-2.5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 rounded-cards bg-carbon border border-graphite space-y-2">
              <SkeletonLoader variant="text" width="20%" height={14} />
              <SkeletonLoader variant="text" width="60%" height={18} />
            </div>
          ))}
        </div>
      ) : filteredStories.length === 0 ? (
        <EmptyState
          icon={<ListTodo className="w-6 h-6" />}
          title="No se encontraron historias de usuario"
          description={
            stories.length === 0
              ? 'Crea tu primera historia de usuario o utiliza el Asistente IA para redactar requerimientos con criterios de aceptación.'
              : 'No hay historias que coincidan con los filtros o la búsqueda seleccionada. Prueba restableciendo los filtros.'
          }
          action={
            stories.length === 0 && canManageStories ? (
              <Button
                variant="primary"
                size="sm"
                onClick={onNewStory}
                icon={<Plus className="w-3.5 h-3.5" />}
              >
                Crear primera historia
              </Button>
            ) : search || priorityFilter !== 'ALL' || scopeFilter !== 'ALL' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setPriorityFilter('ALL');
                  setScopeFilter('ALL');
                }}
              >
                Limpiar filtros
              </Button>
            ) : undefined
          }
        />
      ) : (
        (() => {
          const renderStoryCard = (story: UserStory) => {
            const sprint = story.sprintId ? sprintById.get(story.sprintId) : null;
            const storyTasks = tasks.filter((t) => t.userStoryId === story.id);
            const doneTasks = storyTasks.filter((t) => t.status === 'DONE').length;
            const isExpanded = expandedId === story.id;
            const lockedDelete =
              sprint && (sprint.status === 'ACTIVE' || sprint.status === 'CLOSED');

            return (
              <div
                key={story.id}
                className={`rounded-cards bg-carbon border transition-all duration-150 overflow-hidden shadow-subtle ${
                  isExpanded
                    ? 'border-iris-violet/50 shadow-md ring-1 ring-iris-violet/20'
                    : 'border-graphite hover:border-iris-violet/30 hover:bg-carbon/80'
                }`}
              >
                {/* Main Card Header Bar */}
                <div className="p-3.5 sm:px-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : story.id)}
                      className="mt-0.5 p-1 rounded-inputs hover:bg-graphite text-fog hover:text-paper transition-colors shrink-0"
                      aria-label="Ver detalles de la historia"
                      aria-expanded={isExpanded}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        <span className="font-mono text-[12px] font-semibold text-signal-teal bg-signal-teal/10 px-1.5 py-0.5 rounded text-[11px]">
                          {story.code}
                        </span>
                        <span className="text-ash" aria-hidden="true">
                          ·
                        </span>
                        <PrioritySignal priority={story.priority} />
                        {story.epic && (
                          <>
                            <span className="text-ash" aria-hidden="true">
                              ·
                            </span>
                            <span
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border shadow-xs"
                              style={{
                                backgroundColor: `${story.epic.colorHex}18`,
                                borderColor: `${story.epic.colorHex}50`,
                                color: story.epic.colorHex,
                              }}
                              title={story.epic.description || story.epic.name}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: story.epic.colorHex }}
                              />
                              {story.epic.name}
                            </span>
                          </>
                        )}
                        <span className="text-ash" aria-hidden="true">
                          ·
                        </span>
                        <Badge variant={sprint ? 'info' : 'default'} size="sm">
                          {sprint ? sprint.name : 'Product Backlog'}
                        </Badge>
                        {story.isCompleted && (
                          <>
                            <span className="text-ash" aria-hidden="true">
                              ·
                            </span>
                            <Badge variant="success" size="sm" dot>
                              Completada
                            </Badge>
                          </>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : story.id)}
                        className="mt-1 text-left text-[14px] font-medium text-bone hover:text-paper transition-colors block leading-snug"
                      >
                        {story.title}
                      </button>
                    </div>
                  </div>

                  {/* Right metadata controls */}
                  <div className="flex flex-wrap items-center gap-3 pl-8 lg:pl-0 shrink-0">
                    {/* Task progress indicator */}
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-pills bg-obsidian overflow-hidden hidden sm:block">
                        <div
                          className="h-full bg-pulse-green rounded-pills transition-all"
                          style={{
                            width: `${
                              storyTasks.length > 0 ? (doneTasks / storyTasks.length) * 100 : 0
                            }%`,
                          }}
                        />
                      </div>
                      <span className="font-mono tabular-nums text-[12px] text-fog">
                        <strong className="text-bone">{doneTasks}</strong>/{storyTasks.length} tareas
                      </span>
                    </div>

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
                        className="px-2.5 py-1 bg-obsidian border border-graphite rounded-inputs text-[12px] text-mist focus:outline-none focus:border-iris-violet shadow-subtle cursor-pointer"
                      >
                        <option value="">Backlog General</option>
                        {availableTargetSprints.map((sp) => (
                          <option key={sp.id} value={sp.id}>
                            {sp.name}
                          </option>
                        ))}
                      </select>
                    )}

                    {/* Quick Story Points Selector */}
                    <select
                      value={story.storyPoints}
                      onChange={(e) => handleQuickEstimate(story.id, Number(e.target.value))}
                      aria-label="Story Points"
                      className="px-2.5 py-1 bg-obsidian border border-graphite rounded-inputs font-mono tabular-nums text-[12px] text-iris-violet font-semibold focus:outline-none focus:border-iris-violet shadow-subtle cursor-pointer"
                    >
                      {[0, 1, 2, 3, 5, 8, 13, 21].map((pt) => (
                        <option key={pt} value={pt}>
                          {pt} pts
                        </option>
                      ))}
                    </select>

                    {/* Story Actions */}
                    {canManageStories && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onEditStory(story)}
                          className="p-1.5 rounded-inputs text-fog hover:text-paper hover:bg-graphite transition-colors"
                          title="Editar historia"
                          aria-label="Editar historia"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
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
                          aria-label="Eliminar historia"
                          className="p-1.5 rounded-inputs text-fog hover:text-coral-red hover:bg-graphite disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Animated Expanded Details Panel */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
                      exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      className="overflow-hidden border-t border-graphite bg-obsidian/70"
                    >
                      <div className="p-4 sm:px-6 space-y-4">
                        {/* Narrative description */}
                        <div>
                          <h4 className="text-[11px] font-semibold text-fog uppercase tracking-wider mb-1">
                            Narrativa de Usuario
                          </h4>
                          <p className="text-[13px] text-bone leading-relaxed bg-carbon/50 p-3 rounded-inputs border border-graphite/60">
                            {story.description || 'Sin descripción narrativa registrada.'}
                          </p>
                        </div>

                        {/* Acceptance Criteria Checklist */}
                        {story.acceptanceCriteria && story.acceptanceCriteria.length > 0 && (
                          <div className="space-y-1.5">
                            <h4 className="text-[11px] font-semibold text-fog uppercase tracking-wider">
                              Criterios de Aceptación ({story.acceptanceCriteria.length})
                            </h4>
                            <div className="space-y-1.5">
                              {story.acceptanceCriteria.map((criterion, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-start gap-2.5 p-2 rounded-inputs bg-carbon/40 border border-graphite/40 text-[12px] text-mist"
                                >
                                  <div className="w-4 h-4 rounded-full bg-signal-teal/15 text-signal-teal flex items-center justify-center text-[10px] font-mono shrink-0 mt-0.5">
                                    ✓
                                  </div>
                                  <span className="leading-snug">{criterion}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Tasks breakdown preview */}
                        {storyTasks.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            <h4 className="text-[11px] font-semibold text-fog uppercase tracking-wider">
                              Tareas Técnicas Asociadas ({storyTasks.length})
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {storyTasks.map((task) => (
                                <div
                                  key={task.id}
                                  className="flex items-center justify-between p-2 rounded-inputs bg-carbon border border-graphite text-[12px]"
                                >
                                  <span className="font-mono text-signal-teal text-[11px] shrink-0 mr-2">
                                    {task.code}
                                  </span>
                                  <span className="truncate text-mist flex-1">
                                    {task.description}
                                  </span>
                                  <Badge
                                    variant={
                                      task.status === 'DONE'
                                        ? 'success'
                                        : task.status === 'IN_PROGRESS'
                                        ? 'purple'
                                        : 'default'
                                    }
                                    size="sm"
                                  >
                                    {task.status}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          };

          if (groupByEpic && epics.length > 0) {
            return (
              <div className="space-y-6">
                {epics.map((epic) => {
                  const epicStories = filteredStories.filter((s) => s.epicId === epic.id);
                  if (epicStories.length === 0) return null;
                  const epicPoints = epicStories.reduce((acc, s) => acc + s.storyPoints, 0);
                  return (
                    <div
                      key={epic.id}
                      className="rounded-cards bg-carbon/50 border p-4 space-y-3 shadow-subtle"
                      style={{ borderColor: `${epic.colorHex}40` }}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-graphite/60">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                            style={{ backgroundColor: epic.colorHex }}
                          />
                          <h3 className="text-[14px] font-semibold text-bone truncate">{epic.name}</h3>
                          {epic.description && (
                            <span className="text-[12px] text-fog hidden md:inline truncate max-w-sm">
                              — {epic.description}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="purple" size="sm">
                            {epicStories.length} {epicStories.length === 1 ? 'historia' : 'historias'}
                          </Badge>
                          <Badge variant="default" size="sm">
                            {epicPoints} pts
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-2.5">
                        {epicStories.map((story) => renderStoryCard(story))}
                      </div>
                    </div>
                  );
                })}

                {/* Stories without Epic */}
                {filteredStories.some((s) => !s.epicId) && (
                  <div className="rounded-cards bg-carbon/25 border border-dashed border-graphite p-4 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-graphite/40">
                      <div className="flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-fog" />
                        <h3 className="text-[13px] font-medium text-fog">Historias sin Épica Asignada</h3>
                      </div>
                      <Badge variant="default" size="sm">
                        {filteredStories.filter((s) => !s.epicId).length} historias
                      </Badge>
                    </div>
                    <div className="space-y-2.5">
                      {filteredStories
                        .filter((s) => !s.epicId)
                        .map((story) => renderStoryCard(story))}
                    </div>
                  </div>
                )}
              </div>
            );
          }

          return (
            <div className="space-y-2.5">
              {filteredStories.map((story) => renderStoryCard(story))}
            </div>
          );
        })()
      )}

      {/* Epic Manager Modal (RF3, HU #4) */}
      <EpicManagerModal
        open={epicManagerOpen}
        projectId={project.id}
        epics={epics}
        canManage={canManageStories || project.myRole === 'SCRUM_MASTER'}
        onClose={() => setEpicManagerOpen(false)}
        onRefresh={onRefresh}
      />

      {/* Delete Story Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Eliminar ${deleteTarget?.code}`}
        description="Esta acción eliminará permanentemente la historia de usuario y sus tareas técnicas asociadas del Product Backlog. ¿Deseas continuar?"
        confirmLabel="Eliminar historia"
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteStory}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
