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
  X,
  GripVertical,
  Trash2,
  Pencil,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { PrioritySignal, SprintStatusText, TaskColumnLabel, UserAvatar } from './UIHelpers';
import type {
  ProjectSummary,
  Sprint,
  StoryPriority,
  TaskItem,
  TaskStatus,
  User,
  UserStory,
} from '../types/scrum';

const KANBAN_COLUMNS: Array<{ id: TaskStatus; title: string; accent: string }> = [
  { id: 'TODO', title: 'To Do', accent: 'border-t-smoke' },
  { id: 'IN_PROGRESS', title: 'In Progress', accent: 'border-t-iris-violet' },
  { id: 'TESTING', title: 'Testing', accent: 'border-t-signal-teal' },
  { id: 'DONE', title: 'Done', accent: 'border-t-pulse-green' },
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
      className={`rounded-cards bg-obsidian border p-3.5 space-y-2.5 transition-shadow ${
        isOverlay
          ? 'border-iris-violet shadow-xl rotate-[1.5deg] opacity-95'
          : isDragging
          ? 'opacity-35 border-smoke'
          : 'border-graphite hover:border-smoke shadow-sm'
      }`}
    >
      {/* Card top metadata */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            type="button"
            {...(isOverlay ? {} : listeners)}
            {...(isOverlay ? {} : attributes)}
            className="text-fog hover:text-paper cursor-grab active:cursor-grabbing shrink-0"
            aria-label="Arrastrar tarea"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-[11px] font-medium text-signal-teal">{task.code}</span>
          {story && (
            <>
              <span className="text-ash">·</span>
              <span className="font-mono text-[11px] text-fog truncate">{story.code}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {story && <PrioritySignal priority={story.priority} />}
          {!isOverlay && (
            <>
              {onEditTask && (
                <button
                  type="button"
                  onClick={() => onEditTask(task)}
                  className="p-1 rounded text-fog hover:text-iris-violet transition-colors"
                  title="Editar tarea"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              )}
              <button
                type="button"
                onClick={() => onDeleteTask(task.id)}
                className="p-1 rounded text-fog hover:text-coral-red transition-colors"
                title="Eliminar tarea"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Task description */}
      <p className="text-[13px] text-bone leading-[19px]">{task.description}</p>

      {/* Bottom bar: assignee + accessible status selector */}
      <div className="pt-2 border-t border-graphite flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {assignee ? (
            <UserAvatar name={assignee.fullName} size="xs" />
          ) : (
            <span className="w-5 h-5 rounded-full border border-dashed border-smoke inline-flex items-center justify-center text-[10px] text-fog">
              ?
            </span>
          )}
          <select
            value={task.assignedToId ?? ''}
            onChange={(e) =>
              onChangeAssignee(task.id, e.target.value ? Number(e.target.value) : null)
            }
            aria-label="Responsable de tarea"
            className="bg-transparent text-[11px] text-mist hover:text-paper focus:outline-none truncate max-w-[120px] cursor-pointer"
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

        <select
          value={task.status}
          onChange={(e) => onChangeStatus(task.id, e.target.value as TaskStatus)}
          aria-label="Cambiar columna"
          className="px-1.5 py-0.5 bg-carbon border border-graphite rounded-inputs text-[11px] font-mono text-fog hover:text-paper focus:outline-none"
        >
          {KANBAN_COLUMNS.map((col) => (
            <option key={col.id} value={col.id}>
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
  count,
  children,
}: {
  id: TaskStatus;
  title: string;
  accent: string;
  count: number;
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-cards bg-carbon border border-t-2 ${accent} min-h-[420px] transition-colors shadow-subtle ${
        isOver ? 'border-iris-violet bg-obsidian' : 'border-graphite'
      }`}
    >
      <div className="px-3.5 py-3 border-b border-graphite flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-bone">{title}</h3>
        <span className="font-mono tabular-nums text-[12px] text-fog">{count}</span>
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
      // Automatic visual rollback on network/500 failure
      setOptimisticTasks(snapshot);
      setTimeout(() => setOptimisticTasks(null), 50);
      showToast(err?.message || 'No se pudo actualizar la tarea. Verifica tu conexión e inténtalo nuevamente', 'error');
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
          <div key={i} className="h-[460px] rounded-xl skeleton-wave border border-[#1E293B]" />
        ))}
      </div>
    );
  }

  // Empty State when no Sprint is ACTIVE (RF-11)
  if (!activeSprint) {
    return (
      <div className="rounded-xl bg-[#0F172A] border border-[#1E293B] py-16 px-6 text-center max-w-lg mx-auto mt-8">
        <div className="w-12 h-12 rounded-xl bg-[#171F33] border border-[#2D3449] flex items-center justify-center mx-auto text-[#B4C5FF]">
          <CalendarRange className="w-6 h-6" />
        </div>
        <h1 className="mt-4 font-display text-lg font-semibold text-white">
          No hay un Sprint activo en este proyecto
        </h1>
        <p className="mt-1.5 text-[13px] text-[#8D90A0]">
          Inicia un Sprint desde la vista de planificación para habilitar el tablero Kanban y ejecutar tareas técnicas.
        </p>
        <button
          type="button"
          onClick={onGoToSprints}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-[13px] font-medium text-white transition-colors"
        >
          Ir a planificación
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Active Sprint Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-2xl font-semibold text-bone tracking-tight">
              {activeSprint.name}
            </h1>
            <SprintStatusText status="ACTIVE" />
          </div>
          <p className="mt-1 text-[13px] text-fog">
            <span className="font-mono tabular-nums">
              {activeSprint.startDate} → {activeSprint.endDate}
            </span>{' '}
            · {activeSprint.goal || project.name}
          </p>
        </div>

        {/* Filters Toolbar (RF-12) */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setOnlyMyTasks((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-inputs text-[12px] font-medium border transition-colors whitespace-nowrap shadow-subtle ${
              onlyMyTasks
                ? 'bg-iris-violet border-iris-violet text-paper shadow-sm'
                : 'bg-carbon border-graphite text-mist hover:text-paper hover:border-smoke'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Mis tareas
          </button>

          {!onlyMyTasks && (
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              aria-label="Filtrar por desarrollador"
              className="px-3 py-1.5 rounded-inputs bg-carbon border border-graphite text-[12px] text-mist focus:border-iris-violet shadow-subtle"
            >
              <option value="ALL">Todos los responsables</option>
              <option value="UNASSIGNED">Sin asignar</option>
              {projectUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-1 p-1 bg-carbon border border-graphite rounded-inputs shadow-subtle">
            {(['ALL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((p) => {
              const label =
                p === 'ALL' ? 'Todas' : p === 'HIGH' ? 'Alta' : p === 'MEDIUM' ? 'Media' : 'Baja';
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriorityFilter(p)}
                  className={`px-2 py-0.5 rounded-sm text-[11px] font-medium transition-colors ${
                    priorityFilter === p
                      ? 'bg-graphite text-paper shadow-subtle'
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

      {/* Sprint Stories Strip with "+ Agregar tarea" and Auto-Completion check */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {activeStories.map((story) => {
          const stTasks = sprintTasks.filter((t) => t.userStoryId === story.id);
          const doneCount = stTasks.filter((t) => t.status === 'DONE').length;
          const allDone = stTasks.length > 0 && doneCount === stTasks.length;

          return (
            <div
              key={story.id}
              className={`rounded-cards p-3.5 border flex flex-col justify-between gap-2.5 shadow-subtle ${
                allDone
                  ? 'bg-obsidian border-pulse-green/40'
                  : 'bg-carbon border-graphite'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-signal-teal">{story.code}</span>
                    <span className="text-ash">·</span>
                    <span className="font-mono tabular-nums text-fog">
                      {story.storyPoints} pts
                    </span>
                  </div>
                  {allDone ? (
                    <span className="inline-flex items-center gap-1 text-pulse-green font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Lista
                    </span>
                  ) : (
                    <span className="font-mono tabular-nums text-fog">
                      {doneCount}/{stTasks.length}
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
                className="inline-flex items-center gap-1 text-[12px] font-medium text-signal-teal hover:text-paper transition-colors w-fit"
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
        <div className="rounded-xl bg-[#0F172A] border border-[#1E293B] py-12 px-6 text-center">
          <p className="text-[14px] font-medium text-white">
            No encontramos tareas con estos filtros
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1E293B] hover:bg-[#2D3449] text-[12px] font-medium text-white"
          >
            <FilterX className="w-4 h-4" />
            Limpiar filtros
          </button>
        </div>
      ) : (
        <>
          {/* Mobile column segmented tabs */}
          <div className="md:hidden grid grid-cols-4 gap-1 p-1 rounded-lg bg-[#0F172A] border border-[#1E293B]">
            {KANBAN_COLUMNS.map((col) => {
              const count = filteredTasks.filter((t) => t.status === col.id).length;
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => setMobileColumn(col.id)}
                  className={`py-1.5 px-1 rounded-md text-[11px] font-medium transition-colors truncate ${
                    mobileColumn === col.id ? 'bg-[#2563EB] text-white' : 'text-[#8D90A0]'
                  }`}
                >
                  {col.title} ({count})
                </button>
              );
            })}
          </div>

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
                      count={colTasks.length}
                    >
                      {colTasks.length === 0 ? (
                        <div className="h-24 rounded-lg border border-dashed border-[#222A3D] flex items-center justify-center text-[12px] text-[#64748B]">
                          Sin tareas en {TaskColumnLabel(col.id)}
                        </div>
                      ) : (
                        colTasks.map((task) => (
                          <DraggableTaskCard
                            key={task.id}
                            task={task}
                            story={storyMap.get(task.userStoryId)}
                            assignee={task.assignedToId ? userMap.get(task.assignedToId) : undefined}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <form
            onSubmit={handleCreateTask}
            className="w-full max-w-md rounded-cards bg-obsidian border border-graphite p-6 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold text-bone">Agregar tarea técnica</h2>
                <p className="text-[12px] text-signal-teal font-mono">
                  {addTaskStory.code} · {addTaskStory.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddTaskStory(null)}
                className="text-fog hover:text-paper"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-mist mb-1.5">
                Descripción técnica *
              </label>
              <textarea
                rows={3}
                autoFocus
                value={taskDesc}
                onChange={(e) => {
                  setTaskDesc(e.target.value);
                  setTaskError('');
                }}
                placeholder="Ej. Implementar endpoint POST /webauthn/register y pruebas unitarias"
                className="w-full px-3.5 py-2 bg-carbon border border-graphite rounded-inputs text-[13px] text-bone placeholder:text-ash focus:outline-none focus:border-iris-violet focus:ring-1 focus:ring-iris-violet shadow-subtle"
              />
              {taskError && <p className="mt-1 text-[12px] text-coral-red">{taskError}</p>}
            </div>

            <div>
              <label className="block text-[12px] font-medium text-mist mb-1.5">
                Responsable asignado
              </label>
              <select
                value={taskAssigneeId}
                onChange={(e) => setTaskAssigneeId(e.target.value)}
                className="w-full px-3 py-2 bg-carbon border border-graphite rounded-inputs text-[13px] text-bone focus:border-iris-violet shadow-subtle"
              >
                <option value="">Sin asignar</option>
                {projectUsers.map((u) => (
                  <option key={u.id} value={u.id} className="bg-obsidian">
                    {u.id === user?.id ? `${u.fullName} (Autoasignarme)` : u.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setAddTaskStory(null)}
                className="px-4 py-2 text-[13px] text-mist hover:text-paper rounded-buttons hover:bg-graphite transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingTask}
                className="px-4 py-2 text-[13px] font-medium bg-iris-violet hover:bg-iris-violet/90 text-paper rounded-buttons disabled:opacity-60 shadow-sm"
              >
                {savingTask ? 'Creando...' : 'Crear en To Do'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <form
            onSubmit={handleSaveEditTask}
            className="w-full max-w-md rounded-cards bg-obsidian border border-graphite p-6 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold text-bone">Editar tarea técnica</h2>
                <p className="text-[12px] text-signal-teal font-mono">
                  {editingTask.code}
                  {storyMap.get(editingTask.userStoryId)
                    ? ` · ${storyMap.get(editingTask.userStoryId)?.title}`
                    : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="text-fog hover:text-paper"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-mist mb-1.5">
                Descripción técnica *
              </label>
              <textarea
                rows={3}
                autoFocus
                value={editTaskDesc}
                onChange={(e) => {
                  setEditTaskDesc(e.target.value);
                  setEditTaskError('');
                }}
                placeholder="Descripción técnica de la tarea"
                className="w-full px-3.5 py-2 bg-carbon border border-graphite rounded-inputs text-[13px] text-bone placeholder:text-ash focus:outline-none focus:border-iris-violet focus:ring-1 focus:ring-iris-violet shadow-subtle"
              />
              {editTaskError && <p className="mt-1 text-[12px] text-coral-red">{editTaskError}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-medium text-mist mb-1.5">
                  Estado
                </label>
                <select
                  value={editTaskStatus}
                  onChange={(e) => setEditTaskStatus(e.target.value as TaskStatus)}
                  className="w-full px-3 py-2 bg-carbon border border-graphite rounded-inputs text-[13px] text-bone focus:border-iris-violet shadow-subtle"
                >
                  {KANBAN_COLUMNS.map((col) => (
                    <option key={col.id} value={col.id} className="bg-obsidian">
                      {col.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-mist mb-1.5">
                  Responsable
                </label>
                <select
                  value={editTaskAssigneeId}
                  onChange={(e) => setEditTaskAssigneeId(e.target.value)}
                  className="w-full px-3 py-2 bg-carbon border border-graphite rounded-inputs text-[13px] text-bone focus:border-iris-violet shadow-subtle"
                >
                  <option value="">Sin asignar</option>
                  {projectUsers.map((u) => (
                    <option key={u.id} value={u.id} className="bg-obsidian">
                      {u.id === user?.id ? `${u.fullName} (Yo)` : u.fullName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="px-4 py-2 text-[13px] text-mist hover:text-paper rounded-buttons hover:bg-graphite transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingEditTask}
                className="px-4 py-2 text-[13px] font-medium bg-iris-violet hover:bg-iris-violet/90 text-paper rounded-buttons disabled:opacity-60 shadow-sm"
              >
                {savingEditTask ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
