import React, { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  Plus,
  CheckCircle2,
  UserCheck,
  FilterX,
  CalendarRange,
  GripVertical,
  Trash2,
  Pencil,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { PrioritySignal, SprintStatusText, TaskColumnLabel, UserAvatar } from './UIHelpers';
import {
  Button,
  Input,
  Textarea,
  Select,
  Modal,
  Badge,
  EmptyState,
  SkeletonLoader,
} from './ui';
import type {
  ProjectSummary,
  Sprint,
  StoryPriority,
  TaskItem,
  TaskStatus,
  User,
  UserStory,
} from '../types/scrum';

const KANBAN_COLUMNS: Array<{
  id: TaskStatus;
  title: string;
  accent: string;
  badgeVariant: 'default' | 'purple' | 'info' | 'success';
}> = [
  { id: 'TODO', title: 'Por Hacer', accent: 'border-t-smoke', badgeVariant: 'default' },
  { id: 'IN_PROGRESS', title: 'En Progreso', accent: 'border-t-iris-violet', badgeVariant: 'purple' },
  { id: 'TESTING', title: 'En Revisión', accent: 'border-t-signal-teal', badgeVariant: 'info' },
  { id: 'DONE', title: 'Hecho', accent: 'border-t-pulse-green', badgeVariant: 'success' },
];

interface KanbanViewProps {
  project: ProjectSummary;
  sprints: Sprint[];
  stories: UserStory[];
  tasks: TaskItem[];
  allUsers: User[];
  loading: boolean;
  onGoToSprints: () => void;
  onRefresh: () => Promise<void>;
}

function DraggableTaskCard({
  task,
  story,
  assignee,
  projectMembers,
  currentUserId,
  onChangeAssignee,
  onChangeStatus,
  onEditTask,
  onDeleteTask,
  isOverlay = false,
}: {
  task: TaskItem;
  story: UserStory | undefined;
  assignee: User | undefined;
  projectMembers: User[];
  currentUserId: number;
  onChangeAssignee: (taskId: number, userId: number | null) => void;
  onChangeStatus: (taskId: number, status: TaskStatus) => void;
  onEditTask?: (task: TaskItem) => void;
  onDeleteTask: (taskId: number) => void;
  isOverlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `task-${task.id}`,
    data: { task },
    disabled: isOverlay,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      style={style}
      className={`rounded-cards bg-carbon border p-3.5 space-y-2.5 transition-all select-none ${
        isOverlay
          ? 'border-iris-violet bg-obsidian shadow-2xl rotate-2 scale-[1.02] opacity-95 ring-1 ring-iris-violet/40 z-50'
          : isDragging
          ? 'opacity-30 border-dashed border-smoke'
          : 'border-graphite hover:border-iris-violet/40 hover:shadow-md'
      }`}
    >
      {/* Card Header: Drag Handle, Code, Story Tag & Priority */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            type="button"
            {...(isOverlay ? {} : listeners)}
            {...(isOverlay ? {} : attributes)}
            className="text-fog hover:text-paper cursor-grab active:cursor-grabbing p-0.5 rounded shrink-0 transition-colors"
            title="Arrastrar tarea"
            aria-label="Arrastrar tarea"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-[11px] font-semibold text-signal-teal bg-signal-teal/10 px-1 py-0.5 rounded">
            {task.code}
          </span>
          {story && (
            <>
              <span className="text-ash" aria-hidden="true">
                ·
              </span>
              <span
                className="font-mono text-[11px] text-fog truncate max-w-[120px]"
                title={story.title}
              >
                {story.code}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {story && <PrioritySignal priority={story.priority} />}
          {!isOverlay && (
            <div className="flex items-center gap-0.5">
              {onEditTask && (
                <button
                  type="button"
                  onClick={() => onEditTask(task)}
                  className="p-1 rounded-inputs text-fog hover:text-iris-violet hover:bg-graphite transition-colors"
                  title="Editar tarea"
                  aria-label="Editar tarea"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              )}
              <button
                type="button"
                onClick={() => onDeleteTask(task.id)}
                className="p-1 rounded-inputs text-fog hover:text-coral-red hover:bg-graphite transition-colors"
                title="Eliminar tarea"
                aria-label="Eliminar tarea"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Task Description */}
      <p className="text-[13px] text-bone leading-[19px] break-words">
        {task.description}
      </p>

      {/* Bottom bar: Assignee & Accessible Status selector */}
      <div className="pt-2 border-t border-graphite/60 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {assignee ? (
            <UserAvatar name={assignee.fullName} size="xs" />
          ) : (
            <span className="w-5 h-5 rounded-full border border-dashed border-smoke inline-flex items-center justify-center text-[10px] text-fog shrink-0">
              ?
            </span>
          )}
          <select
            value={task.assignedToId ?? ''}
            onChange={(e) =>
              onChangeAssignee(task.id, e.target.value ? Number(e.target.value) : null)
            }
            aria-label="Responsable de tarea"
            className="bg-transparent text-[11px] text-mist hover:text-paper focus:outline-none truncate max-w-[110px] cursor-pointer"
          >
            <option value="" className="bg-obsidian">
              Sin asignar
            </option>
            {projectMembers.map((m) => (
              <option key={m.id} value={m.id} className="bg-obsidian">
                {m.id === currentUserId ? `${m.fullName} (Yo)` : m.fullName}
              </option>
            ))}
          </select>
        </div>

        {/* Move dropdown (accessibility & keyboard support) */}
        <select
          value={task.status}
          onChange={(e) => onChangeStatus(task.id, e.target.value as TaskStatus)}
          aria-label="Mover a otra columna"
          className="px-1.5 py-0.5 bg-obsidian border border-graphite rounded-inputs text-[11px] font-mono text-fog hover:text-paper focus:outline-none focus:border-iris-violet cursor-pointer"
        >
          {KANBAN_COLUMNS.map((col) => (
            <option key={col.id} value={col.id} className="bg-obsidian">
              {col.title}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function KanbanColumn({
  id,
  title,
  accent,
  badgeVariant,
  count,
  children,
}: {
  id: TaskStatus;
  title: string;
  accent: string;
  badgeVariant: 'default' | 'purple' | 'info' | 'success';
  count: number;
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-cards bg-carbon/60 border border-t-2 ${accent} min-h-[460px] transition-all duration-150 shadow-subtle ${
        isOver
          ? 'border-iris-violet/70 bg-iris-violet/5 ring-1 ring-iris-violet/30 shadow-md'
          : 'border-graphite'
      }`}
    >
      <div className="px-3.5 py-3 border-b border-graphite flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-bone tracking-tight">{title}</h3>
        <Badge variant={badgeVariant} size="sm" shape="pill">
          {count}
        </Badge>
      </div>
      <div className="flex-1 p-2.5 space-y-2.5 overflow-y-auto">{children}</div>
    </div>
  );
}

export function KanbanView({
  project,
  sprints,
  stories,
  tasks,
  allUsers,
  loading,
  onGoToSprints,
  onRefresh,
}: KanbanViewProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [optimisticTasks, setOptimisticTasks] = useState<TaskItem[] | null>(null);
  const [activeDragTask, setActiveDragTask] = useState<TaskItem | null>(null);

  // Filters (RF-12)
  const [assigneeFilter, setAssigneeFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | StoryPriority>('ALL');
  const [onlyMyTasks, setOnlyMyTasks] = useState(false);

  // Mobile stage tab
  const [mobileColumn, setMobileColumn] = useState<TaskStatus>('TODO');

  // Add Task Modal
  const [addTaskStory, setAddTaskStory] = useState<UserStory | null>(null);
  const [taskDesc, setTaskDesc] = useState('');
  const [taskAssigneeId, setTaskAssigneeId] = useState<string>('');
  const [taskError, setTaskError] = useState('');
  const [savingTask, setSavingTask] = useState(false);

  // Edit Task Modal
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [editTaskDesc, setEditTaskDesc] = useState('');
  const [editTaskAssigneeId, setEditTaskAssigneeId] = useState<string>('');
  const [editTaskStatus, setEditTaskStatus] = useState<TaskStatus>('TODO');
  const [editTaskError, setEditTaskError] = useState('');
  const [savingEditTask, setSavingEditTask] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const activeSprint = sprints.find((s) => s.status === 'ACTIVE') ?? null;

  const projectUsers = useMemo(() => {
    const memberIds = new Set(project.members.map((m) => m.userId));
    if (user && user.globalRole === 'ADMIN') memberIds.add(user.id);
    return allUsers.filter((u) => memberIds.has(u.id));
  }, [project.members, allUsers, user]);

  const userMap = useMemo(() => {
    const map = new Map<number, User>();
    for (const u of allUsers) map.set(u.id, u);
    return map;
  }, [allUsers]);

  const activeStories = useMemo(() => {
    if (!activeSprint) return [];
    return stories.filter((s) => s.sprintId === activeSprint.id);
  }, [activeSprint, stories]);

  const storyMap = useMemo(() => {
    const map = new Map<number, UserStory>();
    for (const s of activeStories) map.set(s.id, s);
    return map;
  }, [activeStories]);

  const effectiveTasks = optimisticTasks ?? tasks;

  const sprintTasks = useMemo(() => {
    return effectiveTasks.filter((t) => storyMap.has(t.userStoryId));
  }, [effectiveTasks, storyMap]);

  const filteredTasks = useMemo(() => {
    return sprintTasks.filter((t) => {
      const parent = storyMap.get(t.userStoryId);
      if (onlyMyTasks && user && t.assignedToId !== user.id) return false;
      if (!onlyMyTasks && assigneeFilter !== 'ALL') {
        if (assigneeFilter === 'UNASSIGNED' && t.assignedToId !== null) return false;
        if (assigneeFilter !== 'UNASSIGNED' && t.assignedToId !== Number(assigneeFilter)) {
          return false;
        }
      }
      if (priorityFilter !== 'ALL' && parent?.priority !== priorityFilter) return false;
      return true;
    });
  }, [sprintTasks, storyMap, onlyMyTasks, assigneeFilter, priorityFilter, user]);

  const hasActiveFilters = onlyMyTasks || assigneeFilter !== 'ALL' || priorityFilter !== 'ALL';

  const clearFilters = () => {
    setOnlyMyTasks(false);
    setAssigneeFilter('ALL');
    setPriorityFilter('ALL');
  };

  const persistTaskStatus = async (taskId: number, newStatus: TaskStatus) => {
    const current = effectiveTasks.find((t) => t.id === taskId);
    if (!current || current.status === newStatus) return;

    const snapshot = [...effectiveTasks];
    // Optimistic state update (<16ms UI feedback)
    setOptimisticTasks(
      snapshot.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      await apiFetch(`/api/v1/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      await onRefresh();
      setOptimisticTasks(null);
      showToast(`Tarea ${current.code} movida a ${TaskColumnLabel(newStatus)}`, 'success');
    } catch (err: any) {
      // Automatic visual rollback on failure
      setOptimisticTasks(snapshot);
      setTimeout(() => setOptimisticTasks(null), 50);
      showToast(
        err?.message || 'No se pudo actualizar la tarea. Se restauró el estado anterior.',
        'error'
      );
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = event.active.data.current?.task as TaskItem | undefined;
    if (task) setActiveDragTask(task);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragTask(null);
    const { active, over } = event;
    if (!over) return;
    const task = active.data.current?.task as TaskItem | undefined;
    const targetColumn = over.id as TaskStatus;
    if (task && ['TODO', 'IN_PROGRESS', 'TESTING', 'DONE'].includes(targetColumn)) {
      persistTaskStatus(task.id, targetColumn);
    }
  };

  const handleChangeAssignee = async (taskId: number, assignedToId: number | null) => {
    const task = effectiveTasks.find((t) => t.id === taskId);
    try {
      await apiFetch(`/api/v1/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ assignedToId }),
      });
      await onRefresh();
      const assigneeName = assignedToId
        ? userMap.get(assignedToId)?.fullName || 'usuario'
        : 'Sin asignar';
      showToast(`Responsable de ${task?.code ?? 'tarea'} actualizado a: ${assigneeName}`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Error al asignar responsable a la tarea', 'error');
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    const task = effectiveTasks.find((t) => t.id === taskId);
    try {
      await apiFetch(`/api/v1/tasks/${taskId}`, { method: 'DELETE' });
      await onRefresh();
      showToast(`Tarea ${task?.code ?? ''} eliminada correctamente`, 'info');
    } catch (err: any) {
      showToast(err?.message || 'Error al eliminar la tarea', 'error');
    }
  };

  const handleOpenEditTask = (task: TaskItem) => {
    setEditingTask(task);
    setEditTaskDesc(task.description);
    setEditTaskAssigneeId(task.assignedToId ? String(task.assignedToId) : '');
    setEditTaskStatus(task.status);
    setEditTaskError('');
  };

  const handleSaveEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    const trimmed = editTaskDesc.trim();
    if (!trimmed || trimmed.length < 3) {
      setEditTaskError('La descripción técnica debe tener al menos 3 caracteres');
      return;
    }
    if (trimmed.length > 500) {
      setEditTaskError('La descripción técnica no puede exceder 500 caracteres');
      return;
    }
    setSavingEditTask(true);
    try {
      await apiFetch(`/api/v1/tasks/${editingTask.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          description: trimmed,
          assignedToId: editTaskAssigneeId ? Number(editTaskAssigneeId) : null,
          status: editTaskStatus,
        }),
      });
      showToast(`Tarea ${editingTask.code} actualizada correctamente`, 'success');
      setEditingTask(null);
      await onRefresh();
    } catch (err: any) {
      setEditTaskError(err?.message || 'Error al actualizar la tarea');
      showToast(err?.message || 'Error al actualizar la tarea', 'error');
    } finally {
      setSavingEditTask(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addTaskStory) return;
    const trimmed = taskDesc.trim();
    if (!trimmed || trimmed.length < 3) {
      setTaskError('La descripción técnica debe tener al menos 3 caracteres');
      return;
    }
    if (trimmed.length > 500) {
      setTaskError('La descripción técnica no puede exceder 500 caracteres');
      return;
    }
    setSavingTask(true);
    try {
      await apiFetch(`/api/v1/stories/${addTaskStory.id}/tasks`, {
        method: 'POST',
        body: JSON.stringify({
          description: trimmed,
          assignedToId: taskAssigneeId ? Number(taskAssigneeId) : null,
        }),
      });
      showToast('Tarea agregada exitosamente en To Do', 'success');
      setAddTaskStory(null);
      setTaskDesc('');
      setTaskError('');
      await onRefresh();
    } catch (err: any) {
      setTaskError(err?.message || 'Error al crear la tarea');
      showToast(err?.message || 'Error al crear tarea', 'error');
    } finally {
      setSavingTask(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-[480px] rounded-cards bg-carbon/50 border border-graphite p-4 space-y-3">
            <SkeletonLoader variant="text" width="40%" height={16} />
            <SkeletonLoader variant="card" height={100} />
            <SkeletonLoader variant="card" height={100} />
          </div>
        ))}
      </div>
    );
  }

  // Empty State when no Sprint is ACTIVE (RF-11)
  if (!activeSprint) {
    return (
      <EmptyState
        icon={<CalendarRange className="w-6 h-6" />}
        title="No hay un Sprint activo en este proyecto"
        description="Inicia un Sprint desde la vista de planificación para habilitar el tablero Kanban interactivo y gestionar las tareas técnicas en ejecución."
        action={
          <Button
            variant="primary"
            size="md"
            onClick={onGoToSprints}
            icon={<ArrowRight className="w-4 h-4" />}
          >
            Ir a planificación de Sprints
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Active Sprint Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-2xl font-semibold text-bone tracking-tight">
              Tablero Kanban · {activeSprint.name}
            </h1>
            <SprintStatusText status="ACTIVE" />
          </div>
          <p className="mt-1 text-[13px] text-fog">
            <span className="font-mono tabular-nums text-bone">
              {activeSprint.startDate} → {activeSprint.endDate}
            </span>{' '}
            · {activeSprint.goal || project.name}
          </p>
        </div>

        {/* Filters Toolbar (RF-12) */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={onlyMyTasks ? 'primary' : 'outline'}
            size="xs"
            onClick={() => setOnlyMyTasks((v) => !v)}
            icon={<UserCheck className="w-3.5 h-3.5" />}
          >
            Mis tareas
          </Button>

          {!onlyMyTasks && (
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              aria-label="Filtrar por desarrollador"
              className="px-2.5 py-1.5 rounded-inputs bg-carbon border border-graphite text-[12px] text-mist focus:border-iris-violet shadow-subtle cursor-pointer"
            >
              <option value="ALL">Todos los miembros</option>
              <option value="UNASSIGNED">Sin asignar</option>
              {projectUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-1 p-0.5 bg-carbon border border-graphite rounded-inputs text-[11px] shadow-subtle">
            {(['ALL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((p) => {
              const label =
                p === 'ALL' ? 'Todas' : p === 'HIGH' ? 'Alta' : p === 'MEDIUM' ? 'Media' : 'Baja';
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriorityFilter(p)}
                  className={`px-2 py-0.5 rounded-sm font-medium transition-colors ${
                    priorityFilter === p
                      ? 'bg-graphite text-paper shadow-xs'
                      : 'text-fog hover:text-paper'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Active Stories Strip with "+ Agregar tarea" */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {activeStories.map((story) => {
          const stTasks = sprintTasks.filter((t) => t.userStoryId === story.id);
          const doneCount = stTasks.filter((t) => t.status === 'DONE').length;
          const allDone = stTasks.length > 0 && doneCount === stTasks.length;

          return (
            <div
              key={story.id}
              className={`rounded-cards p-3.5 border flex flex-col justify-between gap-2.5 transition-all shadow-subtle ${
                allDone
                  ? 'bg-obsidian border-pulse-green/40'
                  : 'bg-carbon border-graphite hover:border-iris-violet/30'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-signal-teal font-semibold">
                      {story.code}
                    </span>
                    <span className="text-ash" aria-hidden="true">
                      ·
                    </span>
                    <span className="font-mono tabular-nums text-fog">
                      {story.storyPoints} pts
                    </span>
                  </div>
                  {allDone ? (
                    <Badge variant="success" size="sm" dot>
                      Completada
                    </Badge>
                  ) : (
                    <span className="font-mono tabular-nums text-fog">
                      <strong className="text-bone">{doneCount}</strong>/{stTasks.length} tareas
                    </span>
                  )}
                </div>
                <p className="text-[13px] font-medium text-bone line-clamp-1" title={story.title}>
                  {story.title}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setAddTaskStory(story);
                  setTaskDesc('');
                  setTaskAssigneeId(user ? String(user.id) : '');
                  setTaskError('');
                }}
                className="inline-flex items-center gap-1 text-[12px] font-medium text-signal-teal hover:text-paper transition-colors w-fit focus-visible:outline-none focus-visible:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar tarea
              </button>
            </div>
          );
        })}
      </div>

      {/* Empty Filter State */}
      {hasActiveFilters && filteredTasks.length === 0 ? (
        <EmptyState
          icon={<FilterX className="w-6 h-6" />}
          title="No encontramos tareas que coincidan"
          description="Ninguna tarea técnica cumple con los filtros de responsable o prioridad activos actualmente."
          action={
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          }
        />
      ) : (
        <>
          {/* Mobile column segmented tabs */}
          <div className="md:hidden grid grid-cols-4 gap-1 p-1 rounded-cards bg-carbon border border-graphite">
            {KANBAN_COLUMNS.map((col) => {
              const count = filteredTasks.filter((t) => t.status === col.id).length;
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => setMobileColumn(col.id)}
                  className={`py-1.5 px-1 rounded-inputs text-[11px] font-medium transition-colors truncate ${
                    mobileColumn === col.id
                      ? 'bg-iris-violet text-paper shadow-sm'
                      : 'text-fog hover:text-paper'
                  }`}
                >
                  {col.title} ({count})
                </button>
              );
            })}
          </div>

          {/* Drag and Drop Canvas */}
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {KANBAN_COLUMNS.map((col) => {
                const colTasks = filteredTasks.filter((t) => t.status === col.id);
                return (
                  <div
                    key={col.id}
                    className={mobileColumn === col.id ? 'block' : 'hidden md:block'}
                  >
                    <KanbanColumn
                      id={col.id}
                      title={col.title}
                      accent={col.accent}
                      badgeVariant={col.badgeVariant}
                      count={colTasks.length}
                    >
                      {colTasks.length === 0 ? (
                        <div className="h-28 rounded-cards border border-dashed border-graphite/60 flex items-center justify-center text-[12px] text-fog">
                          Sin tareas en {TaskColumnLabel(col.id)}
                        </div>
                      ) : (
                        colTasks.map((task) => (
                          <DraggableTaskCard
                            key={task.id}
                            task={task}
                            story={storyMap.get(task.userStoryId)}
                            assignee={
                              task.assignedToId ? userMap.get(task.assignedToId) : undefined
                            }
                            projectMembers={projectUsers}
                            currentUserId={user?.id ?? 0}
                            onChangeAssignee={handleChangeAssignee}
                            onChangeStatus={persistTaskStatus}
                            onEditTask={handleOpenEditTask}
                            onDeleteTask={handleDeleteTask}
                          />
                        ))
                      )}
                    </KanbanColumn>
                  </div>
                );
              })}
            </div>

            {/* Drag Overlay visual enhancement */}
            <DragOverlay>
              {activeDragTask ? (
                <DraggableTaskCard
                  task={activeDragTask}
                  story={storyMap.get(activeDragTask.userStoryId)}
                  assignee={
                    activeDragTask.assignedToId
                      ? userMap.get(activeDragTask.assignedToId)
                      : undefined
                  }
                  projectMembers={projectUsers}
                  currentUserId={user?.id ?? 0}
                  onChangeAssignee={() => {}}
                  onChangeStatus={() => {}}
                  onDeleteTask={() => {}}
                  isOverlay
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        </>
      )}

      {/* Quick Add Task Modal */}
      {addTaskStory && (
        <Modal
          open={Boolean(addTaskStory)}
          onClose={() => setAddTaskStory(null)}
          title="Agregar tarea técnica"
          description={`Historia: ${addTaskStory.code} · ${addTaskStory.title}`}
          size="md"
        >
          <form onSubmit={handleCreateTask} className="space-y-4">
            <Textarea
              label="Descripción técnica de la tarea"
              required
              rows={3}
              autoFocus
              value={taskDesc}
              onChange={(e) => {
                setTaskDesc(e.target.value);
                setTaskError('');
              }}
              placeholder="Ej. Implementar endpoint POST /api/v1/auth y pruebas unitarias"
              error={taskError}
            />

            <Select
              label="Responsable asignado"
              value={taskAssigneeId}
              onChange={(e) => setTaskAssigneeId(e.target.value)}
            >
              <option value="">Sin asignar</option>
              {projectUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.id === user?.id ? `${u.fullName} (Autoasignarme)` : u.fullName}
                </option>
              ))}
            </Select>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-graphite">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setAddTaskStory(null)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={savingTask}
              >
                Crear en To Do
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <Modal
          open={Boolean(editingTask)}
          onClose={() => setEditingTask(null)}
          title="Editar tarea técnica"
          description={`Tarea ${editingTask.code}${
            storyMap.get(editingTask.userStoryId)
              ? ` · ${storyMap.get(editingTask.userStoryId)?.title}`
              : ''
          }`}
          size="md"
        >
          <form onSubmit={handleSaveEditTask} className="space-y-4">
            <Textarea
              label="Descripción técnica"
              required
              rows={3}
              autoFocus
              value={editTaskDesc}
              onChange={(e) => {
                setEditTaskDesc(e.target.value);
                setEditTaskError('');
              }}
              placeholder="Descripción técnica de la tarea"
              error={editTaskError}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Estado Kanban"
                value={editTaskStatus}
                onChange={(e) => setEditTaskStatus(e.target.value as TaskStatus)}
              >
                {KANBAN_COLUMNS.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.title}
                  </option>
                ))}
              </Select>

              <Select
                label="Responsable asignado"
                value={editTaskAssigneeId}
                onChange={(e) => setEditTaskAssigneeId(e.target.value)}
              >
                <option value="">Sin asignar</option>
                {projectUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.id === user?.id ? `${u.fullName} (Yo)` : u.fullName}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-graphite">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditingTask(null)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={savingEditTask}
              >
                Guardar cambios
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
