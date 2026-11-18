import React, { useMemo, useState } from 'react';
import {
  Plus,
  Users,
  Trash2,
  ArrowRight,
  FolderOpen,
  UserPlus,
  RefreshCw,
  FolderKanban,
  Activity,
  CheckCircle2,
  Zap,
  Kanban,
  ListTodo,
  CheckSquare,
  Sparkles,
  CalendarRange,
  Target,
  Shield,
  Filter,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiFetch } from '../lib/api';
import { ConfirmDialog, SprintStatusText, UserAvatar, formatRoleLabel } from './UIHelpers';
import {
  Button,
  Input,
  Textarea,
  Select,
  Modal,
  Badge,
  EmptyState,
  SkeletonCard,
} from './ui';
import type { ProjectSummary, ScrumRole, User } from '../types/scrum';
import type { ActiveRoute } from './AppShell';

interface DashboardViewProps {
  projects: ProjectSummary[];
  users: User[];
  loading: boolean;
  loadError: string;
  onRetry: () => void;
  onOpenProject: (projectId: number, route?: ActiveRoute) => void;
  onRefreshProjects: () => Promise<void>;
  onNavigate?: (route: ActiveRoute, projectId?: number) => void;
  onQuickCreateStory?: (projectId?: number) => void;
}

export function DashboardView({
  projects,
  users,
  loading,
  loadError,
  onRetry,
  onOpenProject,
  onRefreshProjects,
  onNavigate,
  onQuickCreateStory,
}: DashboardViewProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const shouldReduceMotion = useReducedMotion();
  const isAdmin = user?.globalRole === 'ADMIN';

  // Role perspective filter (Auto / PO / SM / Dev / Admin)
  const [rolePerspective, setRolePerspective] = useState<'AUTO' | ScrumRole | 'ADMIN'>('AUTO');

  // Create Project Modal
  const [createOpen, setCreateOpen] = useState(false);
  const [projName, setProjName] = useState('');
  const [projCode, setProjCode] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [savingProject, setSavingProject] = useState(false);

  // Team / Memberships Modal
  const [teamProject, setTeamProject] = useState<ProjectSummary | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
  const [selectedRole, setSelectedRole] = useState<ScrumRole>('DEVELOPER');
  const [savingMember, setSavingMember] = useState(false);

  // Register User Modal (RF-01 Admin)
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [newUserRole, setNewUserRole] = useState<'USER' | 'ADMIN'>('USER');
  const [savingUser, setSavingUser] = useState(false);

  // Delete project confirmation
  const [deleteTarget, setDeleteTarget] = useState<ProjectSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Overall statistics calculation
  const stats = useMemo(() => {
    const totalProjects = projects.length;
    const activeSprintsCount = projects.filter((p) => p.activeSprint !== null).length;
    const totalStories = projects.reduce((acc, p) => acc + (p.totalStories || 0), 0);
    const completedStories = projects.reduce((acc, p) => acc + (p.completedStories || 0), 0);
    const totalPoints = projects.reduce((acc, p) => acc + (p.totalPoints || 0), 0);
    const completedPoints = projects.reduce((acc, p) => acc + (p.completedPoints || 0), 0);
    const overallVelocity =
      totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0;

    return {
      totalProjects,
      activeSprintsCount,
      totalStories,
      completedStories,
      totalPoints,
      completedPoints,
      overallVelocity,
    };
  }, [projects]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projName.trim()) {
      showToast('El nombre del proyecto es obligatorio', 'error');
      return;
    }
    setSavingProject(true);
    try {
      await apiFetch('/api/v1/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: projName.trim(),
          code: projCode.trim() || undefined,
          description: projDesc.trim(),
        }),
      });
      showToast('Proyecto creado correctamente', 'success');
      setCreateOpen(false);
      setProjName('');
      setProjCode('');
      setProjDesc('');
      await onRefreshProjects();
    } catch (err: any) {
      showToast(err?.message || 'Error al crear proyecto', 'error');
    } finally {
      setSavingProject(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/v1/projects/${deleteTarget.id}`, { method: 'DELETE' });
      showToast('Proyecto eliminado correctamente', 'success');
      setDeleteTarget(null);
      await onRefreshProjects();
    } catch (err: any) {
      showToast(err?.message || 'Error al eliminar proyecto', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamProject || !selectedUserId) return;
    setSavingMember(true);
    try {
      await apiFetch(`/api/v1/projects/${teamProject.id}/memberships`, {
        method: 'POST',
        body: JSON.stringify({ userId: Number(selectedUserId), scrumRole: selectedRole }),
      });
      showToast('Membresía actualizada correctamente', 'success');
      await onRefreshProjects();
      setSelectedUserId('');
    } catch (err: any) {
      showToast(err?.message || 'Error al asignar miembro', 'error');
    } finally {
      setSavingMember(false);
    }
  };

  const handleRemoveMember = async (projectId: number, userId: number) => {
    try {
      await apiFetch(`/api/v1/projects/${projectId}/memberships/${userId}`, {
        method: 'DELETE',
      });
      showToast('Miembro removido del proyecto', 'info');
      await onRefreshProjects();
    } catch (err: any) {
      showToast(err?.message || 'Error al remover miembro', 'error');
    }
  };

  const handleRegisterUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingUser(true);
    try {
      await apiFetch('/api/v1/users', {
        method: 'POST',
        body: JSON.stringify({
          email: newUserEmail,
          fullName: newUserName,
          password: newUserPass,
          globalRole: newUserRole,
        }),
      });
      showToast('Usuario registrado correctamente', 'success');
      setUserModalOpen(false);
      setNewUserEmail('');
      setNewUserName('');
      setNewUserPass('');
      await onRefreshProjects();
    } catch (err: any) {
      showToast(err?.message || 'Error al registrar usuario', 'error');
    } finally {
      setSavingUser(false);
    }
  };

  const currentTeamProject = teamProject
    ? projects.find((p) => p.id === teamProject.id) ?? teamProject
    : null;

  // Determine effective role & contextual helpers
  const activeProjectWithSprint = useMemo(
    () => projects.find((p) => p.activeSprint !== null) ?? null,
    [projects]
  );
  const firstProj = projects[0] ?? null;

  const effectiveRole = useMemo(() => {
    if (rolePerspective !== 'AUTO') return rolePerspective;
    if (isAdmin) return 'ADMIN';
    if (projects.some((p) => p.myRole === 'PRODUCT_OWNER')) return 'PRODUCT_OWNER';
    if (projects.some((p) => p.myRole === 'SCRUM_MASTER')) return 'SCRUM_MASTER';
    return 'DEVELOPER';
  }, [rolePerspective, isAdmin, projects]);

  return (
    <div className="space-y-6">
      {/* Header with Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="font-display text-2xl font-semibold text-bone tracking-tight">
              Dashboard de Proyectos Scrum
            </h1>
            <Badge variant="purple" shape="pill">
              {projects.length} {projects.length === 1 ? 'Espacio' : 'Espacios'}
            </Badge>
            <Badge variant="info" size="sm">
              Enfoque: {formatRoleLabel(effectiveRole)}
            </Badge>
          </div>
          <p className="mt-1 text-[13px] text-fog leading-relaxed">
            Gestiona tus espacios de trabajo, monitorea el rendimiento de los Sprints y da seguimiento a las historias de usuario.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          {/* Role Perspective Selector */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-inputs bg-carbon border border-graphite text-[12px]">
            <Filter className="w-3.5 h-3.5 text-fog shrink-0" />
            <span className="text-fog text-[11px]">Perspectiva:</span>
            <select
              value={rolePerspective}
              onChange={(e) => setRolePerspective(e.target.value as any)}
              className="bg-transparent text-bone font-medium focus:outline-none cursor-pointer pr-1"
              aria-label="Perspectiva de Rol"
            >
              <option value="AUTO" className="bg-carbon text-bone">
                Auto ({formatRoleLabel(effectiveRole)})
              </option>
              <option value="ADMIN" className="bg-carbon text-bone">
                Administrador
              </option>
              <option value="PRODUCT_OWNER" className="bg-carbon text-bone">
                Product Owner
              </option>
              <option value="SCRUM_MASTER" className="bg-carbon text-bone">
                Scrum Master
              </option>
              <option value="DEVELOPER" className="bg-carbon text-bone">
                Developer
              </option>
            </select>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUserModalOpen(true)}
                icon={<UserPlus className="w-3.5 h-3.5" />}
              >
                Registrar usuario
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setCreateOpen(true)}
                icon={<Plus className="w-3.5 h-3.5" />}
              >
                Crear proyecto
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Bloque de Acciones Frecuentes / Rápidas */}
      <div className="p-3.5 rounded-cards bg-carbon border border-graphite shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[12px] text-fog font-medium">
          <Sparkles className="w-4 h-4 text-iris-violet shrink-0" />
          <span className="text-bone font-semibold">Acciones Frecuentes:</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              onNavigate ? onNavigate('my-work') : onOpenProject(firstProj?.id || 1, 'kanban')
            }
            icon={<CheckSquare className="w-3.5 h-3.5 text-iris-violet" />}
            title="Consultar todas las tareas asignadas en tus proyectos"
          >
            Ver mis tareas
          </Button>

          {activeProjectWithSprint && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onOpenProject(activeProjectWithSprint.id, 'sprints')}
              icon={<CalendarRange className="w-3.5 h-3.5 text-signal-teal" />}
              title={`Abrir Sprint activo: ${activeProjectWithSprint.activeSprint?.name}`}
            >
              Abrir Sprint activo
            </Button>
          )}

          {firstProj && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onOpenProject(firstProj.id, 'kanban')}
                icon={<Kanban className="w-3.5 h-3.5 text-pulse-green" />}
                title="Abrir Tablero Kanban de historias y tareas técnicas"
              >
                Ir al Kanban
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onOpenProject(firstProj.id, 'backlog')}
                icon={<ListTodo className="w-3.5 h-3.5 text-lavender" />}
                title="Explorar y priorizar el Product Backlog"
              >
                Product Backlog
              </Button>
            </>
          )}

          {(isAdmin || effectiveRole === 'PRODUCT_OWNER') && firstProj && (
            <Button
              variant="primary"
              size="sm"
              onClick={() =>
                onQuickCreateStory
                  ? onQuickCreateStory(firstProj.id)
                  : onOpenProject(firstProj.id, 'backlog')
              }
              icon={<Plus className="w-3.5 h-3.5" />}
              title="Crear nueva historia de usuario con asistencia IA"
            >
              Crear historia
            </Button>
          )}
        </div>
      </div>

      {/* Role-Specific Contextual Guidance Banner */}
      <div className="p-4 rounded-cards bg-carbon/80 border border-graphite/70 shadow-subtle flex items-start gap-3.5">
        <div className="p-2 rounded-lg bg-iris-violet/10 text-iris-violet shrink-0 mt-0.5">
          {effectiveRole === 'PRODUCT_OWNER' ? (
            <Target className="w-5 h-5" />
          ) : effectiveRole === 'SCRUM_MASTER' ? (
            <Activity className="w-5 h-5" />
          ) : effectiveRole === 'DEVELOPER' ? (
            <CheckSquare className="w-5 h-5" />
          ) : (
            <Shield className="w-5 h-5" />
          )}
        </div>
        <div className="text-[12px] space-y-1 text-mist">
          <p className="font-semibold text-bone text-[13px] flex items-center gap-2">
            <span>Enfoque de Rol: {formatRoleLabel(effectiveRole)}</span>
            <span className="text-fog font-normal text-[11px]">
              (Adaptado a tus responsabilidades Scrum)
            </span>
          </p>
          {effectiveRole === 'PRODUCT_OWNER' && (
            <p className="leading-relaxed">
              Supervisa la entrega de valor y la prioridad del negocio. Dispones de{' '}
              <strong className="text-bone">{stats.totalStories - stats.completedStories} historias pendientes</strong>{' '}
              de entrega en el Product Backlog ({stats.totalPoints} Story Points totales). Puedes priorizar historias con MoSCoW o generar nuevas con el Asistente IA.
            </p>
          )}
          {effectiveRole === 'SCRUM_MASTER' && (
            <p className="leading-relaxed">
              Facilita el flujo iterativo y remueve impedimentos.{' '}
              <strong className="text-bone">{stats.activeSprintsCount} Sprint activo</strong> en ejecución. Monitorea el ritmo del equipo, el cumplimiento de Story Points y la transición fluida de tareas en el Tablero Kanban.
            </p>
          )}
          {effectiveRole === 'DEVELOPER' && (
            <p className="leading-relaxed">
              Enfocado en ejecución técnica y calidad. Accede a{' '}
              <strong className="text-bone">Mi Trabajo</strong> para mover el estado de tus tareas asignadas o interactúa directamente con el Tablero Kanban en arrastre y soltado fluido.
            </p>
          )}
          {effectiveRole === 'ADMIN' && (
            <p className="leading-relaxed">
              Gobernanza global de Agile Velocity. Administra membresías de proyectos ({stats.totalProjects} espacios activos), registra nuevos usuarios en el sistema y supervisa el estado general de la plataforma.
            </p>
          )}
        </div>
      </div>

      {/* Network Error Alert */}
      {loadError && (
        <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-cards bg-coral-red/10 border border-coral-red/30 text-[13px] text-coral-red">
          <span>{loadError}</span>
          <Button
            variant="ghost"
            size="xs"
            onClick={onRetry}
            icon={<RefreshCw className="w-3 h-3" />}
          >
            Reintentar
          </Button>
        </div>
      )}

      {/* Statistics Cards Overview */}
      {!loading && projects.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <motion.div
            initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
            animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="p-4 rounded-cards bg-carbon border border-graphite shadow-subtle flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium text-fog">Proyectos Activos</span>
              <div className="p-1.5 rounded-md bg-iris-violet/10 text-iris-violet">
                <FolderKanban className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="font-display text-2xl font-bold text-bone">
                {stats.totalProjects}
              </span>
              <p className="text-[11px] text-fog mt-0.5">Espacios registrados</p>
            </div>
          </motion.div>

          <motion.div
            initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
            animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            className="p-4 rounded-cards bg-carbon border border-graphite shadow-subtle flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium text-fog">Sprints en Curso</span>
              <div className="p-1.5 rounded-md bg-signal-teal/10 text-signal-teal">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="font-display text-2xl font-bold text-bone">
                {stats.activeSprintsCount}
              </span>
              <p className="text-[11px] text-fog mt-0.5">
                {stats.activeSprintsCount === 1 ? 'Sprint activo' : 'Sprints activos'}
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
            animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
            transition={{ duration: 0.26 }}
            className="p-4 rounded-cards bg-carbon border border-graphite shadow-subtle flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium text-fog">Historias de Usuario</span>
              <div className="p-1.5 rounded-md bg-pulse-green/10 text-pulse-green">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-1.5">
                <span className="font-display text-2xl font-bold text-bone">
                  {stats.completedStories}
                </span>
                <span className="text-[13px] text-fog">/ {stats.totalStories}</span>
              </div>
              <p className="text-[11px] text-pulse-green mt-0.5 font-medium">
                {stats.totalStories > 0
                  ? `${Math.round((stats.completedStories / stats.totalStories) * 100)}% completadas`
                  : 'Sin historias'}
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
            animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="p-4 rounded-cards bg-carbon border border-graphite shadow-subtle flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium text-fog">Entrega de Puntos</span>
              <div className="p-1.5 rounded-md bg-amber-400/10 text-amber-400">
                <Zap className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-1.5">
                <span className="font-display text-2xl font-bold text-bone">
                  {stats.completedPoints}
                </span>
                <span className="text-[13px] text-fog">/ {stats.totalPoints} pts</span>
              </div>
              <p className="text-[11px] text-fog mt-0.5">
                {stats.overallVelocity}% de velocidad global
              </p>
            </div>
          </motion.div>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="w-6 h-6" />}
          title="Todavía no hay proyectos registrados"
          description={
            isAdmin
              ? 'Crea tu primer proyecto Scrum para estructurar el Product Backlog, planificar Sprints y seguir el tablero Kanban.'
              : 'Solicita a un Administrador que te asigne una membresía en un proyecto para empezar a colaborar.'
          }
          action={
            isAdmin ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setCreateOpen(true)}
                icon={<Plus className="w-3.5 h-3.5" />}
              >
                Crear primer proyecto
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((project, index) => {
            const pct =
              project.totalPoints > 0
                ? Math.round((project.completedPoints / project.totalPoints) * 100)
                : 0;

            return (
              <motion.div
                key={project.id}
                initial={shouldReduceMotion ? {} : { opacity: 0, y: 12 }}
                animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
                transition={{ duration: 0.18, delay: Math.min(index * 0.05, 0.3) }}
                className="group rounded-cards bg-carbon border border-graphite hover:border-iris-violet/40 hover:shadow-lg transition-all duration-200 p-5 flex flex-col justify-between gap-5 relative overflow-hidden"
              >
                {/* Subtle top indicator bar */}
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-iris-violet/40 via-signal-teal/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                <div className="space-y-3">
                  {/* Top metadata */}
                  <div className="flex items-center justify-between gap-2 text-[12px]">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono font-semibold text-iris-violet bg-iris-violet/10 px-1.5 py-0.5 rounded text-[11px]">
                        {project.code}
                      </span>
                      <span className="text-ash" aria-hidden="true">
                        ·
                      </span>
                      <Badge variant="default" size="sm">
                        {formatRoleLabel(project.myRole)}
                      </Badge>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setTeamProject(project)}
                          className="p-1.5 rounded-inputs text-fog hover:text-paper hover:bg-graphite transition-colors"
                          title="Gestionar equipo y roles"
                          aria-label="Gestionar equipo y roles"
                        >
                          <Users className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(project)}
                          className="p-1.5 rounded-inputs text-fog hover:text-coral-red hover:bg-graphite transition-colors"
                          title="Eliminar proyecto"
                          aria-label="Eliminar proyecto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Project Name & Description */}
                  <button
                    type="button"
                    onClick={() => onOpenProject(project.id, 'backlog')}
                    className="text-left block w-full group/btn focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-violet/50 rounded-inputs"
                  >
                    <h2 className="font-display text-[17px] font-semibold text-bone group-hover/btn:text-paper group-hover/btn:translate-x-0.5 transition-all">
                      {project.name}
                    </h2>
                    <p className="mt-1 text-[13px] text-mist leading-relaxed line-clamp-2">
                      {project.description || 'Sin descripción técnica registrada.'}
                    </p>
                  </button>
                </div>

                {/* Progress & Active Sprint summary */}
                <div className="space-y-2.5 pt-3.5 border-t border-graphite">
                  <div className="flex items-center justify-between text-[12px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {project.activeSprint ? (
                        <>
                          <SprintStatusText status="ACTIVE" />
                          <span className="text-bone truncate font-medium">
                            {project.activeSprint.name}
                          </span>
                        </>
                      ) : (
                        <span className="text-fog italic">Sin Sprint activo</span>
                      )}
                    </div>
                    <span className="text-[11px] text-fog shrink-0 font-medium">
                      Alcance Global
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-fog text-[11px]">Progreso del Proyecto</span>
                    <span className="font-mono tabular-nums text-fog shrink-0">
                      <strong className="text-bone">{project.completedPoints}</strong> /{' '}
                      {project.totalPoints} pts{' '}
                      <span className="text-signal-teal text-[11px]">({pct}%)</span>
                    </span>
                  </div>

                  {/* Animated Progress Bar */}
                  <div className="h-1.5 w-full rounded-pills bg-obsidian overflow-hidden">
                    <motion.div
                      initial={shouldReduceMotion ? false : { width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className="h-full bg-gradient-to-r from-iris-violet to-signal-teal rounded-pills"
                    />
                  </div>

                  {/* Members & Action buttons */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center -space-x-1.5">
                      {project.members.slice(0, 5).map((m) =>
                        m.user ? (
                          <div key={m.id} title={`${m.user.fullName} (${formatRoleLabel(m.scrumRole)})`}>
                            <UserAvatar name={m.user.fullName} size="xs" />
                          </div>
                        ) : null
                      )}
                      {project.members.length === 0 && (
                        <span className="text-[11px] text-ash">Sin miembros</span>
                      )}
                      {project.members.length > 5 && (
                        <span className="w-5 h-5 rounded-full bg-graphite text-[10px] text-fog font-mono flex items-center justify-center border border-carbon">
                          +{project.members.length - 5}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => onOpenProject(project.id, 'kanban')}
                        icon={<Kanban className="w-3 h-3" />}
                      >
                        Kanban
                      </Button>
                      <Button
                        variant="primary"
                        size="xs"
                        onClick={() => onOpenProject(project.id, 'backlog')}
                        icon={<ArrowRight className="w-3 h-3" />}
                      >
                        Backlog
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create Project Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Crear nuevo proyecto Scrum"
        description="Define el nombre, código y descripción del espacio de trabajo."
        size="md"
      >
        <form onSubmit={handleCreateProject} className="space-y-4">
          <Input
            label="Nombre del proyecto"
            required
            value={projName}
            onChange={(e) => setProjName(e.target.value)}
            placeholder="Ej. Pasarela de Pagos Móvil"
          />
          <Input
            label="Código prefijo (opcional)"
            maxLength={5}
            value={projCode}
            onChange={(e) => setProjCode(e.target.value.toUpperCase())}
            placeholder="Ej. PPM"
            hint="Código de 2 a 5 letras que identificará las historias y tareas."
          />
          <Textarea
            label="Descripción del proyecto"
            rows={3}
            value={projDesc}
            onChange={(e) => setProjDesc(e.target.value)}
            placeholder="Objetivo y alcance del producto a construir..."
          />
          <div className="flex justify-end gap-2.5 pt-2 border-t border-graphite">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCreateOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={savingProject}
            >
              Crear proyecto
            </Button>
          </div>
        </form>
      </Modal>

      {/* Team Memberships Modal (RF-03) */}
      {currentTeamProject && (
        <Modal
          open={Boolean(currentTeamProject)}
          onClose={() => setTeamProject(null)}
          title={`Equipo y Roles · ${currentTeamProject.name}`}
          description="Cada usuario mantiene un único rol Scrum activo en este proyecto."
          size="lg"
        >
          <div className="space-y-4">
            <form onSubmit={handleSaveMember} className="flex flex-col sm:flex-row gap-2.5 items-end">
              <div className="flex-1 w-full">
                <Select
                  label="Seleccionar usuario"
                  value={selectedUserId}
                  onChange={(e) =>
                    setSelectedUserId(e.target.value ? Number(e.target.value) : '')
                  }
                  required
                >
                  <option value="">Seleccionar usuario del sistema...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.email})
                    </option>
                  ))}
                </Select>
              </div>

              <div className="w-full sm:w-48">
                <Select
                  label="Rol Scrum"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as ScrumRole)}
                >
                  <option value="PRODUCT_OWNER">Product Owner</option>
                  <option value="SCRUM_MASTER">Scrum Master</option>
                  <option value="DEVELOPER">Developer</option>
                </Select>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={savingMember}
                disabled={!selectedUserId}
              >
                Asignar
              </Button>
            </form>

            <div className="divide-y divide-graphite max-h-64 overflow-y-auto border-t border-graphite pt-1">
              {currentTeamProject.members.length === 0 ? (
                <p className="py-6 text-center text-[12px] text-fog">
                  No hay miembros asignados a este proyecto todavía.
                </p>
              ) : (
                currentTeamProject.members.map((m) => (
                  <div key={m.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <UserAvatar name={m.user?.fullName || 'U'} size="sm" />
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-bone truncate">
                          {m.user?.fullName}
                        </p>
                        <p className="text-[11px] text-fog truncate">{m.user?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge variant="purple" size="sm">
                        {formatRoleLabel(m.scrumRole)}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(currentTeamProject.id, m.userId)}
                        className="p-1 rounded text-fog hover:text-coral-red hover:bg-graphite transition-colors"
                        title="Remover del proyecto"
                        aria-label="Remover del proyecto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Register User Modal (RF-01 Admin) */}
      <Modal
        open={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        title="Registrar nuevo usuario"
        description="Crea una cuenta en Agile Velocity con credenciales de acceso iniciales."
        size="md"
      >
        <form onSubmit={handleRegisterUser} className="space-y-4">
          <Input
            label="Nombre completo"
            required
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
            placeholder="Ej. Alan Turing"
          />
          <Input
            label="Correo electrónico"
            type="email"
            required
            value={newUserEmail}
            onChange={(e) => setNewUserEmail(e.target.value)}
            placeholder="alan@velocity.dev"
          />
          <Input
            label="Contraseña inicial (mín. 8 caracteres)"
            type="password"
            required
            minLength={8}
            value={newUserPass}
            onChange={(e) => setNewUserPass(e.target.value)}
            placeholder="••••••••"
          />
          <Select
            label="Rol global en la plataforma"
            value={newUserRole}
            onChange={(e) => setNewUserRole(e.target.value as 'USER' | 'ADMIN')}
          >
            <option value="USER">Usuario estándar (USER)</option>
            <option value="ADMIN">Administrador (ADMIN)</option>
          </Select>
          <div className="flex justify-end gap-2.5 pt-2 border-t border-graphite">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setUserModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={savingUser}
            >
              Registrar usuario
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Project Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Eliminar ${deleteTarget?.name}`}
        description="Esta acción eliminará permanentemente el proyecto, sus Sprints, historias de usuario y tareas técnicas asociadas. ¿Deseas continuar?"
        confirmLabel="Eliminar proyecto"
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteProject}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
