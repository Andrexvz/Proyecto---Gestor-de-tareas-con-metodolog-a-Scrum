import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckSquare,
  Search,
  Filter,
  Kanban,
  Layers,
  Calendar,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
  RotateCcw,
  LayoutGrid,
  List,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  User as UserIcon,
  AlertOctagon,
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiFetch } from '../lib/api';
import { UserAvatar, formatRoleLabel, SprintStatusText } from './UIHelpers';
import { Badge, Button, EmptyState, SkeletonCard } from './ui';
import type { AssignedTaskDetail, StoryPriority, TaskStatus } from '../types/scrum';
import type { ActiveRoute } from './AppShell';

interface MyWorkViewProps {
  onNavigate: (route: ActiveRoute, projectId?: number) => void;
}

export function MyWorkView({ onNavigate }: MyWorkViewProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const shouldReduceMotion = useReducedMotion();

  const [tasks, setTasks] = useState<AssignedTaskDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [scope, setScope] = useState<'me' | 'all'>('me');
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('cards');
  const [updatingTaskId, setUpdatingTaskId] = useState<number | null>(null);

  // Filters state
  const [statusTab, setStatusTab] = useState<'ALL' | TaskStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>('ALL');
  const [selectedSprint, setSelectedSprint] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');

  const canSwitchScope =
    user?.globalRole === 'ADMIN' ||
    tasks.some((t) => t.project.myRole === 'SCRUM_MASTER' || t.project.myRole === 'ADMIN');

  const fetchTasks = async (targetScope: 'me' | 'all') => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await apiFetch<{ tasks: AssignedTaskDetail[] }>(
        `/api/v1/users/me/tasks?scope=${targetScope}`
      );
      setTasks(res.tasks || []);
    } catch (err: any) {
      setLoadError(err?.message || 'Error al cargar tus tareas asignadas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks(scope);
  }, [scope]);

  // Handle task status update directly from My Work
  const handleUpdateStatus = async (taskId: number, newStatus: TaskStatus) => {
    // Canonical Scrum Rule (RF5 / HU #9): Block transition to DONE if active impediments exist
    if (newStatus === 'DONE') {
      const taskObj = tasks.find((t) => t.id === taskId);
      if (taskObj?.hasActiveImpediment) {
        showToast(
          'No se puede mover a Hecho una tarea con impedimentos abiertos. El Scrum Master debe resolver el impedimento primero (RF5 / HU #9).',
          'error'
        );
        return;
      }
    }

    setUpdatingTaskId(taskId);
    try {
      await apiFetch(`/api/v1/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );
      showToast(`Tarea actualizada a ${newStatus}`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Error al actualizar el estado de la tarea', 'error');
    } finally {
      setUpdatingTaskId(null);
    }
  };

  // Unique projects and sprints for filter dropdowns
  const projectOptions = useMemo(() => {
    const map = new Map<number, { id: number; name: string; code: string }>();
    tasks.forEach((t) => {
      if (!map.has(t.project.id)) {
        map.set(t.project.id, {
          id: t.project.id,
          name: t.project.name,
          code: t.project.code,
        });
      }
    });
    return Array.from(map.values());
  }, [tasks]);

  const sprintOptions = useMemo(() => {
    const map = new Map<number, string>();
    tasks.forEach((t) => {
      if (t.sprint && !map.has(t.sprint.id)) {
        map.set(t.sprint.id, t.sprint.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [tasks]);

  // Statistics
  const stats = useMemo(() => {
    const total = tasks.length;
    const todo = tasks.filter((t) => t.status === 'TODO').length;
    const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
    const testing = tasks.filter((t) => t.status === 'TESTING').length;
    const done = tasks.filter((t) => t.status === 'DONE').length;
    return { total, todo, inProgress, testing, done };
  }, [tasks]);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Status tab filter
      if (statusTab !== 'ALL' && t.status !== statusTab) {
        return false;
      }
      // Project filter
      if (selectedProject !== 'ALL' && String(t.project.id) !== selectedProject) {
        return false;
      }
      // Sprint filter
      if (selectedSprint === 'BACKLOG') {
        if (t.sprint !== null) return false;
      } else if (selectedSprint !== 'ALL' && (!t.sprint || String(t.sprint.id) !== selectedSprint)) {
        return false;
      }
      // Priority filter
      if (selectedPriority !== 'ALL' && t.story.priority !== selectedPriority) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesCode = t.code.toLowerCase().includes(q);
        const matchesDesc = t.description.toLowerCase().includes(q);
        const matchesStory =
          t.story.code.toLowerCase().includes(q) || t.story.title.toLowerCase().includes(q);
        const matchesProject =
          t.project.code.toLowerCase().includes(q) || t.project.name.toLowerCase().includes(q);
        if (!matchesCode && !matchesDesc && !matchesStory && !matchesProject) {
          return false;
        }
      }
      return true;
    });
  }, [tasks, statusTab, selectedProject, selectedSprint, selectedPriority, searchQuery]);

  const hasActiveFilters =
    statusTab !== 'ALL' ||
    selectedProject !== 'ALL' ||
    selectedSprint !== 'ALL' ||
    selectedPriority !== 'ALL' ||
    searchQuery.trim().length > 0;

  const handleResetFilters = () => {
    setStatusTab('ALL');
    setSelectedProject('ALL');
    setSelectedSprint('ALL');
    setSelectedPriority('ALL');
    setSearchQuery('');
  };

  const getPriorityBadge = (priority?: StoryPriority) => {
    switch (priority) {
      case 'HIGH':
        return (
          <Badge variant="danger" size="sm">
            Alta
          </Badge>
        );
      case 'MEDIUM':
        return (
          <Badge variant="warning" size="sm">
            Media
          </Badge>
        );
      case 'LOW':
        return (
          <Badge variant="default" size="sm">
            Baja
          </Badge>
        );
      default:
        return null;
    }
  };

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'TODO':
        return (
          <Badge variant="default" size="sm">
            Por Hacer
          </Badge>
        );
      case 'IN_PROGRESS':
        return (
          <Badge variant="purple" size="sm">
            En Progreso
          </Badge>
        );
      case 'TESTING':
        return (
          <Badge variant="info" size="sm">
            En Revisión
          </Badge>
        );
      case 'DONE':
        return (
          <Badge variant="success" size="sm">
            Hecho
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-graphite/60">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="font-display text-2xl font-semibold text-bone tracking-tight flex items-center gap-2">
              <CheckSquare className="w-6 h-6 text-iris-violet" />
              Mi Trabajo
            </h1>
            <Badge variant="purple" shape="pill">
              {stats.total} {stats.total === 1 ? 'Tarea' : 'Tareas'}
            </Badge>
            {stats.inProgress > 0 && (
              <Badge variant="info" size="sm">
                {stats.inProgress} en curso
              </Badge>
            )}
          </div>
          <p className="mt-1 text-[13px] text-fog leading-relaxed">
            Consulta y gestiona las tareas técnicas asignadas a tu cargo en todos tus proyectos Scrum autorizados.
          </p>
        </div>

        {/* Scope and View Mode controls */}
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          {canSwitchScope && (
            <div className="flex items-center p-1 rounded-inputs bg-carbon border border-graphite text-[12px]">
              <button
                type="button"
                onClick={() => setScope('me')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  scope === 'me'
                    ? 'bg-iris-violet text-paper shadow-sm'
                    : 'text-fog hover:text-bone'
                }`}
              >
                Mis Tareas
              </button>
              <button
                type="button"
                onClick={() => setScope('all')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  scope === 'all'
                    ? 'bg-iris-violet text-paper shadow-sm'
                    : 'text-fog hover:text-bone'
                }`}
                title="Ver todas las tareas técnicas del equipo en proyectos autorizados"
              >
                Todo el Equipo
              </button>
            </div>
          )}

          {/* View mode toggle (List vs Cards) */}
          <div className="flex items-center p-1 rounded-inputs bg-carbon border border-graphite text-[12px]">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'cards'
                  ? 'bg-obsidian text-bone border border-graphite/60'
                  : 'text-fog hover:text-bone'
              }`}
              title="Vista en Tarjetas"
              aria-label="Vista en Tarjetas"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'list'
                  ? 'bg-obsidian text-bone border border-graphite/60'
                  : 'text-fog hover:text-bone'
              }`}
              title="Vista en Lista"
              aria-label="Vista en Lista"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          type="button"
          onClick={() => setStatusTab('ALL')}
          className={`p-3.5 rounded-cards border text-left transition-all cursor-pointer ${
            statusTab === 'ALL'
              ? 'bg-carbon border-iris-violet shadow-glow'
              : 'bg-carbon/70 border-graphite hover:border-graphite/80'
          }`}
        >
          <span className="text-[11px] font-medium text-fog block">Todas</span>
          <span className="font-display text-xl font-bold text-bone font-mono mt-1 block">
            {stats.total}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusTab('TODO')}
          className={`p-3.5 rounded-cards border text-left transition-all cursor-pointer ${
            statusTab === 'TODO'
              ? 'bg-carbon border-smoke shadow-glow'
              : 'bg-carbon/70 border-graphite hover:border-graphite/80'
          }`}
        >
          <span className="text-[11px] font-medium text-fog block">Por Hacer</span>
          <span className="font-display text-xl font-bold text-mist font-mono mt-1 block">
            {stats.todo}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusTab('IN_PROGRESS')}
          className={`p-3.5 rounded-cards border text-left transition-all cursor-pointer ${
            statusTab === 'IN_PROGRESS'
              ? 'bg-carbon border-iris-violet shadow-glow'
              : 'bg-carbon/70 border-graphite hover:border-graphite/80'
          }`}
        >
          <span className="text-[11px] font-medium text-iris-violet block">En Progreso</span>
          <span className="font-display text-xl font-bold text-iris-violet font-mono mt-1 block">
            {stats.inProgress}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusTab('TESTING')}
          className={`p-3.5 rounded-cards border text-left transition-all cursor-pointer ${
            statusTab === 'TESTING'
              ? 'bg-carbon border-signal-teal shadow-glow'
              : 'bg-carbon/70 border-graphite hover:border-graphite/80'
          }`}
        >
          <span className="text-[11px] font-medium text-signal-teal block">En Revisión</span>
          <span className="font-display text-xl font-bold text-signal-teal font-mono mt-1 block">
            {stats.testing}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusTab('DONE')}
          className={`p-3.5 rounded-cards border text-left transition-all cursor-pointer col-span-2 sm:col-span-1 ${
            statusTab === 'DONE'
              ? 'bg-carbon border-pulse-green shadow-glow'
              : 'bg-carbon/70 border-graphite hover:border-graphite/80'
          }`}
        >
          <span className="text-[11px] font-medium text-pulse-green block">Hecho</span>
          <span className="font-display text-xl font-bold text-pulse-green font-mono mt-1 block">
            {stats.done}
          </span>
        </button>
      </div>

      {/* Search and Filters Toolbar */}
      <div className="p-3 rounded-cards bg-carbon border border-graphite shadow-subtle flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Dynamic Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-fog absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por código de tarea, descripción, historia o proyecto..."
            className="w-full pl-9 pr-3 py-2 rounded-inputs bg-obsidian border border-graphite text-[13px] text-bone placeholder:text-fog/70 focus:outline-none focus:border-iris-violet transition-colors"
            aria-label="Buscar tareas"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fog hover:text-bone text-xs"
            >
              ×
            </button>
          )}
        </div>

        {/* Project Filter */}
        <div className="w-full md:w-48 shrink-0">
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="w-full px-3 py-2 rounded-inputs bg-obsidian border border-graphite text-[13px] text-bone focus:outline-none focus:border-iris-violet transition-colors cursor-pointer"
            aria-label="Filtrar por Proyecto"
          >
            <option value="ALL">Todos los Proyectos</option>
            {projectOptions.map((p) => (
              <option key={p.id} value={String(p.id)}>
                [{p.code}] {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Sprint Filter */}
        <div className="w-full md:w-44 shrink-0">
          <select
            value={selectedSprint}
            onChange={(e) => setSelectedSprint(e.target.value)}
            className="w-full px-3 py-2 rounded-inputs bg-obsidian border border-graphite text-[13px] text-bone focus:outline-none focus:border-iris-violet transition-colors cursor-pointer"
            aria-label="Filtrar por Sprint"
          >
            <option value="ALL">Todos los Sprints</option>
            {sprintOptions.map((sp) => (
              <option key={sp.id} value={String(sp.id)}>
                {sp.name}
              </option>
            ))}
            <option value="BACKLOG">En Backlog (Sin Sprint)</option>
          </select>
        </div>

        {/* Priority Filter */}
        <div className="w-full md:w-36 shrink-0">
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="w-full px-3 py-2 rounded-inputs bg-obsidian border border-graphite text-[13px] text-bone focus:outline-none focus:border-iris-violet transition-colors cursor-pointer"
            aria-label="Filtrar por Prioridad"
          >
            <option value="ALL">Prioridad</option>
            <option value="HIGH">Alta (High)</option>
            <option value="MEDIUM">Media (Medium)</option>
            <option value="LOW">Baja (Low)</option>
          </select>
        </div>

        {/* Reset Filters button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetFilters}
            icon={<RotateCcw className="w-3.5 h-3.5" />}
            title="Restablecer todos los filtros"
          >
            Limpiar
          </Button>
        )}
      </div>

      {/* Loading & Error States */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : loadError ? (
        <div className="p-6 rounded-cards bg-carbon border border-red-500/30 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
          <p className="text-[14px] text-bone font-medium">{loadError}</p>
          <Button variant="secondary" size="sm" onClick={() => fetchTasks(scope)}>
            Reintentar
          </Button>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="py-12 bg-carbon rounded-cards border border-graphite p-8 text-center">
          <EmptyState
            icon={<CheckSquare className="w-8 h-8 text-iris-violet" />}
            title={
              hasActiveFilters
                ? 'No se encontraron tareas con los filtros actuales'
                : 'No tienes tareas asignadas pendientes'
            }
            description={
              hasActiveFilters
                ? 'Intenta restablecer los filtros para visualizar otras tareas disponibles en tus proyectos.'
                : '¡Todo al día! No tienes tareas técnicas activas a tu cargo. Puedes explorar el Tablero Kanban o el Product Backlog para tomar nuevas asignaciones.'
            }
            action={
              hasActiveFilters ? (
                <Button variant="secondary" size="sm" onClick={handleResetFilters}>
                  Restablecer filtros
                </Button>
              ) : projectOptions.length > 0 ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onNavigate('kanban', projectOptions[0].id)}
                  icon={<Kanban className="w-4 h-4" />}
                >
                  Ir al Tablero Kanban
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : viewMode === 'cards' ? (
        /* CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredTasks.map((task) => {
              const isUpdating = updatingTaskId === task.id;
              return (
                <motion.div
                  key={task.id}
                  layout
                  initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={shouldReduceMotion ? {} : { opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.18 }}
                  className="rounded-cards bg-carbon border border-graphite p-4 flex flex-col justify-between shadow-subtle hover:border-iris-violet/50 transition-all group"
                >
                  <div className="space-y-3">
                    {/* Card Header: Task Code, Project badge, Priority badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-mono text-[12px] font-semibold text-iris-violet">
                          {task.code}
                        </span>
                        <Badge variant="default" size="sm">
                          {task.project.code}
                        </Badge>
                        {task.hasActiveImpediment && (
                          <Badge variant="danger" size="sm" shape="pill" dot>
                            Bloqueada
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {getPriorityBadge(task.story.priority)}
                        {getStatusBadge(task.status)}
                      </div>
                    </div>

                    {/* Task Description */}
                    <p className="text-[13px] text-bone font-medium leading-relaxed">
                      {task.description}
                    </p>

                    {/* Story Reference */}
                    <div className="p-2.5 rounded-inputs bg-obsidian/70 border border-graphite/40 text-[11px] space-y-1">
                      <div className="flex items-center justify-between text-fog">
                        <span className="font-mono font-medium text-iris-violet">
                          {task.story.code}
                        </span>
                        <span className="font-mono">{task.story.storyPoints} pts</span>
                      </div>
                      <p className="text-mist truncate font-medium">{task.story.title}</p>
                    </div>

                    {/* Sprint & Dates */}
                    <div className="flex items-center justify-between text-[11px] text-fog">
                      <div className="flex items-center gap-1 min-w-0 truncate">
                        <Calendar className="w-3 h-3 text-fog shrink-0" />
                        <span className="truncate">
                          {task.sprint ? task.sprint.name : 'En Backlog (Sin Sprint)'}
                        </span>
                      </div>
                      {task.sprint && (
                        <span className="font-mono text-[10px] text-fog shrink-0">
                          {task.sprint.startDate.slice(5)} → {task.sprint.endDate.slice(5)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Footer: Quick Status Switcher & Kanban Link */}
                  <div className="pt-3 mt-3 border-t border-graphite/60 flex items-center justify-between gap-2">
                    {/* Status change select */}
                    <div className="relative">
                      <label htmlFor={`status-select-${task.id}`} className="sr-only">
                        Cambiar estado de {task.code}
                      </label>
                      <select
                        id={`status-select-${task.id}`}
                        disabled={isUpdating}
                        value={task.status}
                        onChange={(e) =>
                          handleUpdateStatus(task.id, e.target.value as TaskStatus)
                        }
                        className="text-[11px] font-medium bg-obsidian border border-graphite/60 text-bone px-2 py-1 rounded-inputs focus:outline-none focus:border-iris-violet cursor-pointer disabled:opacity-50"
                      >
                        <option value="TODO">To Do</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="TESTING">Testing</option>
                        <option value="DONE">Done</option>
                      </select>
                    </div>

                    {/* Action to jump to Kanban board */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onNavigate('kanban', task.project.id)}
                      icon={<Kanban className="w-3.5 h-3.5 text-iris-violet" />}
                      title={`Ver tarea en el Tablero Kanban de ${task.project.code}`}
                    >
                      Ver en Kanban
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        /* LIST VIEW */
        <div className="rounded-cards bg-carbon border border-graphite overflow-hidden shadow-subtle">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-graphite text-[12px] font-medium text-fog bg-obsidian/40">
                  <th className="py-3 px-4">Tarea</th>
                  <th className="py-3 px-4">Historia Asociada</th>
                  <th className="py-3 px-4">Proyecto</th>
                  <th className="py-3 px-4">Sprint</th>
                  <th className="py-3 px-4">Prioridad</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-graphite/50 text-[13px]">
                {filteredTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-obsidian/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-baseline gap-2">
                        <span className="font-mono text-[12px] font-semibold text-iris-violet shrink-0">
                          {task.code}
                        </span>
                        {task.hasActiveImpediment && (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] text-coral-red bg-coral-red/10 px-1.5 py-0.5 rounded border border-coral-red/30 shrink-0 font-medium"
                            title="Tarea con impedimento activo"
                          >
                            <AlertOctagon className="w-2.5 h-2.5" />
                            Bloqueada
                          </span>
                        )}
                        <span className="font-medium text-bone line-clamp-1">
                          {task.description}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-mist max-w-[200px] truncate">
                      <span className="font-mono text-[11px] text-iris-violet mr-1">
                        {task.story.code}
                      </span>
                      {task.story.title}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="default" size="sm">
                        {task.project.code}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-[12px] text-fog">
                      {task.sprint ? task.sprint.name : 'En Backlog'}
                    </td>
                    <td className="py-3 px-4">{getPriorityBadge(task.story.priority)}</td>
                    <td className="py-3 px-4">
                      <select
                        value={task.status}
                        onChange={(e) =>
                          handleUpdateStatus(task.id, e.target.value as TaskStatus)
                        }
                        className="text-[11px] font-medium bg-obsidian border border-graphite/60 text-bone px-2 py-1 rounded-inputs focus:outline-none focus:border-iris-violet cursor-pointer"
                        aria-label={`Estado de ${task.code}`}
                      >
                        <option value="TODO">To Do</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="TESTING">Testing</option>
                        <option value="DONE">Done</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onNavigate('kanban', task.project.id)}
                        className="text-iris-violet hover:text-lavender text-[12px] font-medium inline-flex items-center gap-1 cursor-pointer"
                        title="Saltar al Tablero Kanban"
                      >
                        Kanban <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
