import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { apiFetch } from './lib/api';
import { LoginView } from './components/LoginView';
import { AppShell, type ActiveRoute } from './components/AppShell';
import { DashboardView } from './components/DashboardView';
import { BacklogView } from './components/BacklogView';
import { SprintsView } from './components/SprintsView';
import { KanbanView } from './components/KanbanView';
import { MetricsView } from './components/MetricsView';
import { StoryModal } from './components/StoryModal';
import { CommandPalette } from './components/CommandPalette';
import { OnboardingModal } from './components/OnboardingModal';
import { ThemeModal } from './components/ThemeModal';
import { Button } from './components/ui';
import type {
  AppNotification,
  ProjectSummary,
  Sprint,
  SprintMetricRow,
  TaskItem,
  User,
  UserStory,
} from './types/scrum';

function parseLocation(): { route: ActiveRoute; projectId: number | null } {
  const pathname = window.location.pathname;
  const match = pathname.match(/^\/projects\/(\d+)\/(backlog|sprints|kanban|metrics)$/);
  if (match) {
    return {
      projectId: Number(match[1]),
      route: match[2] as ActiveRoute,
    };
  }
  return { route: 'dashboard', projectId: null };
}

function WorkspaceApp() {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const shouldReduceMotion = useReducedMotion();

  const initialLoc = useMemo(() => parseLocation(), []);
  const [route, setRoute] = useState<ActiveRoute>(initialLoc.route);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(initialLoc.projectId);

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState('');

  // Active Project Workspace data
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [stories, setStories] = useState<UserStory[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [metrics, setMetrics] = useState<SprintMetricRow[]>([]);

  // Story Modal & Command Palette
  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<UserStory | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);

  // Onboarding & Theme Modals
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [themeModalOpen, setThemeModalOpen] = useState(false);

  // Auto-launch onboarding on first login if not completed
  useEffect(() => {
    if (user?.id && !authLoading) {
      try {
        const completed = localStorage.getItem(`agile_velocity_onboarding_completed_${user.id}`);
        if (!completed) {
          setOnboardingOpen(true);
        }
      } catch {
        // storage unavailable
      }
    }
  }, [user?.id, authLoading]);

  const navigate = useCallback((nextRoute: ActiveRoute, projectId?: number) => {
    setRoute(nextRoute);
    if (projectId !== undefined) {
      setSelectedProjectId(projectId);
    }
    const nextUrl =
      nextRoute === 'dashboard' || !projectId
        ? '/dashboard'
        : `/projects/${projectId}/${nextRoute}`;
    if (window.location.pathname !== nextUrl) {
      window.history.pushState({}, '', nextUrl);
    }
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const parsed = parseLocation();
      setRoute(parsed.route);
      setSelectedProjectId(parsed.projectId);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Global Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen((o) => !o);
      } else if (e.key === 'Escape') {
        setCommandOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const loadDashboardData = useCallback(async () => {
    if (!user) return;
    setProjectsLoading(true);
    setProjectsError('');
    try {
      const [projRes, usersRes, notifRes] = await Promise.all([
        apiFetch<{ projects: ProjectSummary[] }>('/api/v1/projects'),
        apiFetch<{ users: User[] }>('/api/v1/users'),
        apiFetch<{ notifications: AppNotification[] }>('/api/v1/notifications'),
      ]);
      setProjects(projRes.projects);
      setUsers(usersRes.users);
      setNotifications(notifRes.notifications);
    } catch (err: any) {
      setProjectsError(err?.message || 'No se pudo conectar con el servidor');
    } finally {
      setProjectsLoading(false);
    }
  }, [user]);

  const loadProjectWorkspace = useCallback(
    async (projectId: number) => {
      if (!user) return;
      setWorkspaceLoading(true);
      try {
        const [wsRes, notifRes] = await Promise.all([
          apiFetch<{
            project: ProjectSummary;
            sprints: Sprint[];
            stories: UserStory[];
            tasks: TaskItem[];
            metrics: SprintMetricRow[];
          }>(`/api/v1/projects/${projectId}/workspace`),
          apiFetch<{ notifications: AppNotification[] }>('/api/v1/notifications'),
        ]);
        setSprints(wsRes.sprints);
        setStories(wsRes.stories);
        setTasks(wsRes.tasks);
        setMetrics(wsRes.metrics);
        setNotifications(notifRes.notifications);
        setProjects((prev) => {
          const idx = prev.findIndex((p) => p.id === wsRes.project.id);
          if (idx === -1) return [...prev, wsRes.project];
          const copy = [...prev];
          copy[idx] = wsRes.project;
          return copy;
        });
      } catch (err: any) {
        showToast(err?.message || 'Error al cargar el proyecto', 'error');
        navigate('dashboard');
      } finally {
        setWorkspaceLoading(false);
      }
    },
    [user, showToast, navigate]
  );

  // Sync URL on login/logout
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      if (window.location.pathname !== '/login') {
        window.history.replaceState({}, '', '/login');
      }
      return;
    }

    if (window.location.pathname === '/' || window.location.pathname === '/login') {
      window.history.replaceState({}, '', '/dashboard');
      setRoute('dashboard');
    }
    loadDashboardData();
  }, [user, authLoading, loadDashboardData]);

  useEffect(() => {
    if (user && selectedProjectId && route !== 'dashboard') {
      loadProjectWorkspace(selectedProjectId);
    }
  }, [user, selectedProjectId, route, loadProjectWorkspace]);

  const handleMarkNotificationsRead = async (notificationId?: number) => {
    try {
      const res = await apiFetch<{ notifications: AppNotification[] }>(
        '/api/v1/notifications/read',
        {
          method: 'POST',
          body: JSON.stringify(notificationId ? { notificationId } : {}),
        }
      );
      setNotifications(res.notifications);
    } catch {
      // ignore silently
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-void flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-iris-violet border-t-transparent animate-spin" />
        <span className="text-[12px] text-fog font-mono">Cargando Agile Velocity...</span>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  const currentProject =
    selectedProjectId ? projects.find((p) => p.id === selectedProjectId) ?? null : null;

  const canUseAi =
    currentProject !== null &&
    (currentProject.myRole === 'ADMIN' ||
      currentProject.myRole === 'PRODUCT_OWNER' ||
      currentProject.myRole === 'SCRUM_MASTER');

  const canCreateStory =
    currentProject !== null &&
    (currentProject.myRole === 'ADMIN' || currentProject.myRole === 'PRODUCT_OWNER');

  const refreshAll = async () => {
    await loadDashboardData();
    if (selectedProjectId && route !== 'dashboard') {
      await loadProjectWorkspace(selectedProjectId);
    }
  };

  const primaryHeaderAction =
    currentProject && route === 'backlog' && canCreateStory ? (
      <Button
        variant="primary"
        size="sm"
        onClick={() => {
          setEditingStory(null);
          setStoryModalOpen(true);
        }}
        icon={<Plus className="w-3.5 h-3.5" />}
      >
        Nueva historia
      </Button>
    ) : null;

  return (
    <>
      <AppShell
        route={route}
        projects={projects}
        currentProject={currentProject}
        notifications={notifications}
        onNavigate={(nextRoute, pid) => navigate(nextRoute, pid ?? selectedProjectId ?? undefined)}
        onMarkNotificationsRead={handleMarkNotificationsRead}
        onOpenCommandPalette={() => setCommandOpen(true)}
        onOpenOnboarding={() => setOnboardingOpen(true)}
        onOpenThemeModal={() => setThemeModalOpen(true)}
        primaryAction={primaryHeaderAction}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={`${route}-${selectedProjectId ?? 'global'}`}
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="w-full"
          >
            {route === 'dashboard' || !currentProject ? (
              <DashboardView
                projects={projects}
                users={users}
                loading={projectsLoading}
                loadError={projectsError}
                onRetry={loadDashboardData}
                onOpenProject={(pid, target = 'backlog') => navigate(target, pid)}
                onRefreshProjects={loadDashboardData}
              />
            ) : route === 'backlog' ? (
              <BacklogView
                project={currentProject}
                sprints={sprints}
                stories={stories}
                tasks={tasks}
                loading={workspaceLoading}
                onNewStory={() => {
                  setEditingStory(null);
                  setStoryModalOpen(true);
                }}
                onEditStory={(st) => {
                  setEditingStory(st);
                  setStoryModalOpen(true);
                }}
                onGoToSprints={() => navigate('sprints', currentProject.id)}
                onRefresh={refreshAll}
              />
            ) : route === 'sprints' ? (
              <SprintsView
                project={currentProject}
                sprints={sprints}
                stories={stories}
                onGoToKanban={() => navigate('kanban', currentProject.id)}
                onRefresh={refreshAll}
              />
            ) : route === 'kanban' ? (
              <KanbanView
                project={currentProject}
                sprints={sprints}
                stories={stories}
                tasks={tasks}
                allUsers={users}
                loading={workspaceLoading}
                onGoToSprints={() => navigate('sprints', currentProject.id)}
                onRefresh={refreshAll}
              />
            ) : (
              <MetricsView
                project={currentProject}
                metrics={metrics}
                tasks={tasks}
                sprints={sprints}
                stories={stories}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </AppShell>

      {currentProject && (
        <StoryModal
          open={storyModalOpen}
          projectId={currentProject.id}
          canUseAi={canUseAi}
          editingStory={editingStory}
          onClose={() => setStoryModalOpen(false)}
          onSaved={refreshAll}
        />
      )}

      <CommandPalette
        open={commandOpen}
        projects={projects}
        currentProject={currentProject}
        onClose={() => setCommandOpen(false)}
        onNavigate={(nextRoute, pid) => navigate(nextRoute, pid)}
        onQuickCreateStory={
          canCreateStory
            ? () => {
                setEditingStory(null);
                setStoryModalOpen(true);
              }
            : undefined
        }
      />

      <OnboardingModal
        open={onboardingOpen}
        user={user}
        onClose={() => setOnboardingOpen(false)}
      />

      <ThemeModal
        open={themeModalOpen}
        onClose={() => setThemeModalOpen(false)}
      />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <WorkspaceApp />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
