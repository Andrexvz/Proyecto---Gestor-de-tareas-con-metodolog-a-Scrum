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
  TrendingUp,
  Clock,
  AlertTriangle,
  ArrowUpRight,
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

// Glowing Neon SVG Sparkline directly inspired by Aether Analytics
function NeonSparkline({
  points,
  color = '#19D9E8',
  gradientId,
  height = 36,
}: {
  points: number[];
  color?: string;
  gradientId: string;
  height?: number;
}) {
  const min = Math.min(...points);
  const max = Math.max(...points) || 1;
  const range = max - min || 1;
  const width = 160;
  const step = width / (points.length - 1);

  const coords = points.map((p, i) => {
    const x = i * step;
    const y = height - ((p - min) / range) * (height - 8) - 4;
    return { x, y };
  });

  const pathD = coords.reduce(
    (acc, pt, i) => (i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
    ''
  );

  const areaD = `${pathD} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full overflow-visible shrink-0 mt-2"
      style={{ height: `${height}px` }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradientId})`} />
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 5px ${color})` }}
      />
    </svg>
  );
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
          {/* Quick Date / Segment Selector (Matching Aether Analytics header bar) */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-inputs bg-carbon border border-graphite/80 text-[12px] text-mist shadow-subtle">
            <CalendarRange className="w-3.5 h-3.5 text-signal-teal" />
            <span className="text-bone font-medium">Sprint Actual</span>
            <span className="text-ash">·</span>
            <span className="text-fog">Ciclo Activo</span>
          </div>

          {/* Role Perspective Selector */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-inputs bg-carbon border border-graphite/80 text-[12px] shadow-subtle">
            <Filter className="w-3.5 h-3.5 text-signal-teal shrink-0" />
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
                icon={<UserPlus className="w-3.5 h-3.5 text-signal-teal" />}
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
      <div className="p-3.5 rounded-cards bg-carbon border border-graphite/80 shadow-[0_4px_20px_rgba(0,0,0,0.35)] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[12px] text-fog font-medium">
          <Sparkles className="w-4 h-4 text-signal-teal shrink-0" />
          <span className="text-bone font-semibold">Acciones Frecuentes:</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              onNavigate ? onNavigate('my-work') : onOpenProject(firstProj?.id || 1, 'kanban')
            }
            icon={<CheckSquare className="w-3.5 h-3.5 text-signal-teal" />}
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
      <div className="p-4 rounded-cards bg-carbon/90 border border-graphite/70 shadow-subtle flex items-start gap-3.5">
        <div className="p-2 rounded-lg bg-signal-teal/10 text-signal-teal shrink-0 mt-0.5 border border-signal-teal/20 shadow-[0_0_10px_rgba(25,217,232,0.15)]">
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

      {/* Top 4 Statistics Cards Overview (Directly matching Aether Analytics KPI cards) */}
      {!loading && projects.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {/* Card 1: Proyectos Activos */}
          <motion.div
            initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
            animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="p-5 rounded-cards bg-carbon border border-graphite/80 hover:border-signal-teal/40 shadow-[0_4px_20px_rgba(0,0,0,0.35)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.5),0_0_15px_rgba(25,217,232,0.1)] transition-all duration-200 flex flex-col justify-between relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-fog">Proyectos Activos</span>
              <div className="w-8 h-8 rounded-full bg-signal-teal/10 border border-signal-teal/20 text-signal-teal flex items-center justify-center shadow-[0_0_10px_rgba(25,217,232,0.2)]">
                <FolderKanban className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="font-display text-3xl font-bold text-bone">
                  {stats.totalProjects}
                </span>
                <span className="inline-flex items-center text-[11px] font-semibold text-signal-teal bg-signal-teal/10 px-1.5 py-0.5 rounded-full border border-signal-teal/30">
                  ↑ 100% activos
                </span>
              </div>
              <p className="text-[11px] text-fog mt-1">Espacios registrados</p>
            </div>
            <NeonSparkline
              points={[2, 3, 4, 3, 5, 4, stats.totalProjects || 6]}
              color="#19D9E8"
              gradientId="sparkline-cyan"
            />
          </motion.div>

          {/* Card 2: Sprints en Curso */}
          <motion.div
            initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
            animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            className="p-5 rounded-cards bg-carbon border border-graphite/80 hover:border-pulse-green/40 shadow-[0_4px_20px_rgba(0,0,0,0.35)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.5),0_0_15px_rgba(48,217,155,0.1)] transition-all duration-200 flex flex-col justify-between relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-fog">Sprints en Curso</span>
              <div className="w-8 h-8 rounded-full bg-pulse-green/10 border border-pulse-green/20 text-pulse-green flex items-center justify-center shadow-[0_0_10px_rgba(48,217,155,0.2)]">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="font-display text-3xl font-bold text-bone">
                  {stats.activeSprintsCount}
                </span>
                <span className="inline-flex items-center text-[11px] font-semibold text-pulse-green bg-pulse-green/10 px-1.5 py-0.5 rounded-full border border-pulse-green/30">
                  ↑ Activo
                </span>
              </div>
              <p className="text-[11px] text-fog mt-1">
                {stats.activeSprintsCount === 1 ? 'Sprint activo' : 'Sprints activos'}
              </p>
            </div>
            <NeonSparkline
              points={[1, 1, 2, 2, 3, 2, stats.activeSprintsCount || 3]}
              color="#30D99B"
              gradientId="sparkline-green"
            />
          </motion.div>

          {/* Card 3: Historias de Usuario */}
          <motion.div
            initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
            animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
            transition={{ duration: 0.26 }}
            className="p-5 rounded-cards bg-carbon border border-graphite/80 hover:border-signal-teal/40 shadow-[0_4px_20px_rgba(0,0,0,0.35)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.5),0_0_15px_rgba(25,217,232,0.1)] transition-all duration-200 flex flex-col justify-between relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-fog">Historias de Usuario</span>
              <div className="w-8 h-8 rounded-full bg-signal-teal/10 border border-signal-teal/20 text-signal-teal flex items-center justify-center shadow-[0_0_10px_rgba(25,217,232,0.2)]">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="font-display text-3xl font-bold text-bone">
                  {stats.completedStories}
                </span>
                <span className="text-[13px] text-fog">/ {stats.totalStories}</span>
                <span className="inline-flex items-center text-[11px] font-semibold text-pulse-green bg-pulse-green/10 px-1.5 py-0.5 rounded-full border border-pulse-green/30">
                  ↑{' '}
                  {stats.totalStories > 0
                    ? `${Math.round((stats.completedStories / stats.totalStories) * 100)}%`
                    : '0%'}
                </span>
              </div>
              <p className="text-[11px] text-pulse-green mt-1 font-medium">
                {stats.totalStories > 0
                  ? `${Math.round((stats.completedStories / stats.totalStories) * 100)}% completadas`
                  : 'Sin historias'}
              </p>
            </div>
            <NeonSparkline
              points={[2, 4, 3, 6, 8, 7, stats.completedStories || 10]}
              color="#19D9E8"
              gradientId="sparkline-stories"
            />
          </motion.div>

          {/* Card 4: Entrega de Puntos */}
          <motion.div
            initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
            animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="p-5 rounded-cards bg-carbon border border-graphite/80 hover:border-iris-violet/40 shadow-[0_4px_20px_rgba(0,0,0,0.35)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.5),0_0_15px_rgba(168,85,247,0.1)] transition-all duration-200 flex flex-col justify-between relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-fog">Entrega de Puntos</span>
              <div className="w-8 h-8 rounded-full bg-iris-violet/10 border border-iris-violet/20 text-iris-violet flex items-center justify-center shadow-[0_0_10px_rgba(168,85,247,0.2)]">
                <Zap className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="font-display text-3xl font-bold text-bone">
                  {stats.completedPoints}
                </span>
                <span className="text-[13px] text-fog">/ {stats.totalPoints} pts</span>
                <span className="inline-flex items-center text-[11px] font-semibold text-lavender bg-iris-violet/15 px-1.5 py-0.5 rounded-full border border-iris-violet/30">
                  ↑ {stats.overallVelocity}%
                </span>
              </div>
              <p className="text-[11px] text-fog mt-1">
                {stats.overallVelocity}% de velocidad global
              </p>
            </div>
            <NeonSparkline
              points={[5, 8, 12, 10, 15, 14, stats.completedPoints || 18]}
              color="#A855F7"
              gradientId="sparkline-purple"
            />
          </motion.div>
        </div>
      )}

      {/* Middle Visual Analytics Row (Matching Aether Analytics Chart Layout) */}
      {!loading && projects.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Chart 1: Sprint Velocity Trend Area Chart (Aether Analytics Area Chart style) */}
          <div className="lg:col-span-8 p-5 rounded-cards bg-carbon border border-graphite/80 shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[14px] font-semibold text-bone">Rendimiento y Burndown del Sprint</h3>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold font-display text-bone">
                    {stats.completedPoints} pts entregados
                  </span>
                  <span className="inline-flex items-center text-[11px] font-semibold text-signal-teal bg-signal-teal/10 px-1.5 py-0.5 rounded-full border border-signal-teal/30">
                    ↑ {stats.overallVelocity}% ritmo
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-obsidian border border-graphite text-[11px] text-fog">
                <span>Diario</span>
              </div>
            </div>

            {/* Glowing Neon Area Chart SVG */}
            <div className="relative h-44 w-full">
              <svg viewBox="0 0 500 140" className="w-full h-full overflow-visible" aria-label="Gráfico de Rendimiento">
                <defs>
                  <linearGradient id="chartGradientCyan" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#19D9E8" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#19D9E8" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Horizontal reference grid lines */}
                <line x1="0" y1="30" x2="500" y2="30" stroke="#1C293D" strokeDasharray="3 3" />
                <line x1="0" y1="70" x2="500" y2="70" stroke="#1C293D" strokeDasharray="3 3" />
                <line x1="0" y1="110" x2="500" y2="110" stroke="#1C293D" strokeDasharray="3 3" />

                {/* Area fill */}
                <path
                  d="M 0 110 Q 50 85, 100 95 T 200 65 T 300 45 T 400 35 T 500 20 L 500 140 L 0 140 Z"
                  fill="url(#chartGradientCyan)"
                />
                {/* Glowing neon stroke */}
                <path
                  d="M 0 110 Q 50 85, 100 95 T 200 65 T 300 45 T 400 35 T 500 20"
                  fill="none"
                  stroke="#19D9E8"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  style={{ filter: 'drop-shadow(0 0 8px #19D9E8)' }}
                />
                {/* Highlight Point */}
                <circle cx="400" cy="35" r="4" fill="#19D9E8" stroke="#070D16" strokeWidth="2" style={{ filter: 'drop-shadow(0 0 6px #19D9E8)' }} />
                <circle cx="500" cy="20" r="5" fill="#FFFFFF" stroke="#19D9E8" strokeWidth="2.5" style={{ filter: 'drop-shadow(0 0 8px #19D9E8)' }} />
              </svg>
            </div>
            <div className="flex justify-between items-center text-[11px] text-fog font-mono pt-2 border-t border-graphite/70">
              <span>Día 1</span>
              <span>Día 4</span>
              <span>Día 8</span>
              <span>Día 11</span>
              <span>Día 14 (Cierre)</span>
            </div>
          </div>

          {/* Chart 2: Donut Chart - Distribución del Trabajo (Direct match to Aether Analytics Donut) */}
          <div className="lg:col-span-4 p-5 rounded-cards bg-carbon border border-graphite/80 shadow-[0_4px_20px_rgba(0,0,0,0.35)] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[14px] font-semibold text-bone">Distribución del Trabajo</h3>
              <span className="text-[11px] text-signal-teal hover:underline cursor-pointer">Detalle</span>
            </div>

            <div className="flex items-center justify-center gap-4 py-2">
              {/* SVG Donut */}
              <div className="relative w-32 h-32 shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  {/* Background track */}
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#1C293D" strokeWidth="12" />
                  {/* Segment 1: Hecho (Emerald #30D99B) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="none"
                    stroke="#30D99B"
                    strokeWidth="12"
                    strokeDasharray="238"
                    strokeDashoffset={238 - (238 * (stats.overallVelocity || 20)) / 100}
                    style={{ filter: 'drop-shadow(0 0 6px rgba(48,217,155,0.4))' }}
                  />
                  {/* Segment 2: En Progreso (Violet #A855F7) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="none"
                    stroke="#A855F7"
                    strokeWidth="12"
                    strokeDasharray="238"
                    strokeDashoffset={238 - 60}
                    style={{ filter: 'drop-shadow(0 0 6px rgba(168,85,247,0.4))' }}
                  />
                  {/* Segment 3: En Revisión (Cyan #19D9E8) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="none"
                    stroke="#19D9E8"
                    strokeWidth="12"
                    strokeDasharray="238"
                    strokeDashoffset={238 - 30}
                    style={{ filter: 'drop-shadow(0 0 6px rgba(25,217,232,0.4))' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                  <span className="text-[10px] text-fog uppercase">Total</span>
                  <span className="text-base font-bold text-bone font-mono leading-none">
                    {stats.totalPoints} pts
                  </span>
                </div>
              </div>

              {/* Donut Legend */}
              <div className="space-y-1.5 text-[11px] min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-pulse-green shadow-[0_0_6px_#30D99B] shrink-0" />
                  <span className="text-fog truncate">Hecho</span>
                  <span className="font-mono text-bone ml-auto">{stats.overallVelocity}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-signal-teal shadow-[0_0_6px_#19D9E8] shrink-0" />
                  <span className="text-fog truncate">En Revisión</span>
                  <span className="font-mono text-bone ml-auto">18%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-iris-violet shadow-[0_0_6px_#A855F7] shrink-0" />
                  <span className="text-fog truncate">En Progreso</span>
                  <span className="font-mono text-bone ml-auto">25%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-ash shrink-0" />
                  <span className="text-fog truncate">Por Hacer</span>
                  <span className="font-mono text-bone ml-auto">
                    {Math.max(0, 100 - stats.overallVelocity - 43)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-graphite/70 flex items-center justify-between text-[11px] text-fog">
              <span>Flujo de Tareas</span>
              <span className="text-pulse-green font-medium">Equilibrado</span>
            </div>
          </div>
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
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-bone flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-signal-teal" />
              <span>Espacios de Trabajo Scrum</span>
            </h2>
            <span className="text-[12px] text-fog">{projects.length} registrados</span>
          </div>

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
                  className="group rounded-cards bg-carbon border border-graphite/80 hover:border-signal-teal/40 hover:shadow-[0_8px_30px_rgba(0,0,0,0.5),0_0_20px_rgba(25,217,232,0.08)] transition-all duration-200 p-5 flex flex-col justify-between gap-5 relative overflow-hidden"
                >
                  {/* Subtle top indicator bar */}
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-signal-teal via-iris-violet to-pulse-green opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                  <div className="space-y-3">
                    {/* Top metadata */}
                    <div className="flex items-center justify-between gap-2 text-[12px]">
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Square Logo Glyph matching Aether Core/Pro style */}
                        <div className="w-7 h-7 rounded-lg bg-signal-teal/15 border border-signal-teal/30 flex items-center justify-center text-signal-teal font-mono font-bold text-xs shadow-[0_0_8px_rgba(25,217,232,0.25)] shrink-0">
                          {project.code.slice(0, 2)}
                        </div>
                        <span className="font-mono font-semibold text-signal-teal bg-signal-teal/10 px-1.5 py-0.5 rounded text-[11px] border border-signal-teal/20">
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
                      className="text-left block w-full group/btn focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-teal/50 rounded-inputs"
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
                  <div className="space-y-2.5 pt-3.5 border-t border-graphite/70">
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
                    <div className="h-1.5 w-full rounded-pills bg-obsidian overflow-hidden border border-graphite/50">
                      <motion.div
                        initial={shouldReduceMotion ? false : { width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className="h-full bg-gradient-to-r from-signal-teal via-iris-violet to-pulse-green rounded-pills shadow-[0_0_8px_rgba(25,217,232,0.5)]"
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
                          icon={<Kanban className="w-3 h-3 text-signal-teal" />}
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
          <div className="flex justify-end gap-2.5 pt-2 border-t border-graphite/70">
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

            <div className="divide-y divide-graphite max-h-64 overflow-y-auto border-t border-graphite/70 pt-1">
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
          <div className="flex justify-end gap-2.5 pt-2 border-t border-graphite/70">
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
