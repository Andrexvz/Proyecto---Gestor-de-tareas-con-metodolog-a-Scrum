import React, { useEffect, useState } from 'react';
import {
  LayoutGrid,
  ListTodo,
  CalendarRange,
  Kanban,
  BarChart3,
  Bell,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  CheckCheck,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { UserAvatar, formatRoleLabel } from './UIHelpers';
import type { AppNotification, ProjectSummary } from '../types/scrum';

export type ActiveRoute = 'dashboard' | 'backlog' | 'sprints' | 'kanban' | 'metrics';

interface AppShellProps {
  route: ActiveRoute;
  projects: ProjectSummary[];
  currentProject: ProjectSummary | null;
  notifications: AppNotification[];
  onNavigate: (route: ActiveRoute, projectId?: number) => void;
  onMarkNotificationsRead: (notificationId?: number) => void;
  onOpenCommandPalette: () => void;
  primaryAction?: React.ReactNode;
  children?: React.ReactNode;
}

export function AppShell({
  route,
  projects,
  currentProject,
  notifications,
  onNavigate,
  onMarkNotificationsRead,
  onOpenCommandPalette,
  primaryAction,
  children,
}: AppShellProps) {
  const { user, logout } = useAuth();
  const shouldReduceMotion = useReducedMotion();

  // Persist sidebar collapsed state
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('agile_velocity_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('agile_velocity_sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (notifOpen) setNotifOpen(false);
        if (mobileMenuOpen) setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [notifOpen, mobileMenuOpen]);

  const unreadCount = notifications.filter((n) => !n.readStatus).length;

  const projectNavItems: Array<{
    id: ActiveRoute;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'backlog', label: 'Product Backlog', icon: ListTodo },
    { id: 'sprints', label: 'Sprints', icon: CalendarRange },
    { id: 'kanban', label: 'Tablero Kanban', icon: Kanban },
    { id: 'metrics', label: 'Métricas', icon: BarChart3 },
  ];

  const routeLabelMap: Record<ActiveRoute, string> = {
    dashboard: 'Proyectos',
    backlog: 'Product Backlog',
    sprints: 'Planificación de Sprints',
    kanban: 'Tablero Kanban',
    metrics: 'Métricas y Velocidad',
  };

  const isMac =
    typeof navigator !== 'undefined' &&
    /Mac|iPod|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

  const renderSidebarContent = (isMobile = false) => {
    const isDashboardActive = route === 'dashboard';

    return (
      <div className="flex flex-col h-full bg-carbon border-r border-graphite select-none">
        {/* Brand header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-graphite shrink-0">
          <button
            type="button"
            onClick={() => {
              onNavigate('dashboard');
              if (isMobile) setMobileMenuOpen(false);
            }}
            className="flex items-center gap-2.5 min-w-0 text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-violet/50 rounded-inputs p-1"
          >
            <div className="w-7 h-7 rounded-inputs bg-iris-violet flex items-center justify-center text-paper font-display font-bold text-xs shrink-0 shadow-sm transition-transform group-hover:scale-105">
              AV
            </div>
            {(!collapsed || isMobile) && (
              <span className="font-display font-semibold text-[15px] text-bone tracking-tight whitespace-nowrap truncate group-hover:text-paper transition-colors">
                Agile Velocity
              </span>
            )}
          </button>

          {!isMobile ? (
            <button
              type="button"
              onClick={toggleCollapsed}
              className="p-1.5 rounded-inputs text-fog hover:text-paper hover:bg-graphite transition-all shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-violet/50"
              title={collapsed ? 'Expandir barra (Ctrl+B)' : 'Contraer barra'}
              aria-label="Alternar barra lateral"
            >
              {collapsed ? (
                <PanelLeftOpen className="w-4 h-4 transition-transform hover:scale-110" />
              ) : (
                <PanelLeftClose className="w-4 h-4 transition-transform hover:scale-110" />
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="p-1.5 rounded-inputs text-fog hover:text-paper hover:bg-graphite transition-colors"
              aria-label="Cerrar menú"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav
          className="flex-1 overflow-y-auto px-2.5 py-4 space-y-6"
          aria-label="Navegación principal"
        >
          {/* Main Workspace Navigation */}
          <div className="space-y-1">
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  onNavigate('dashboard');
                  if (isMobile) setMobileMenuOpen(false);
                }}
                aria-current={isDashboardActive ? 'page' : undefined}
                className={`relative w-full flex items-center gap-2.5 px-3 py-2 rounded-inputs text-[13px] font-medium transition-colors whitespace-nowrap group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-violet/50 ${
                  isDashboardActive ? 'text-paper' : 'text-mist hover:text-paper hover:bg-graphite/40'
                }`}
              >
                {/* Motion sliding indicator */}
                {isDashboardActive && (
                  <motion.div
                    layoutId="activeNavIndicator"
                    className="absolute inset-0 rounded-inputs bg-iris-violet/15 border border-iris-violet/30 shadow-subtle -z-0"
                    transition={
                      shouldReduceMotion
                        ? { duration: 0 }
                        : { type: 'spring', stiffness: 400, damping: 32 }
                    }
                  />
                )}
                <LayoutGrid className="w-4 h-4 shrink-0 relative z-10 transition-transform group-hover:scale-105" />
                {(!collapsed || isMobile) && (
                  <span className="relative z-10 font-medium">Proyectos</span>
                )}
              </button>

              {/* Tooltip for collapsed sidebar */}
              {collapsed && !isMobile && (
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-md bg-obsidian border border-graphite text-[12px] font-medium text-paper whitespace-nowrap shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50">
                  Proyectos
                </div>
              )}
            </div>
          </div>

          {/* Active Project Navigation items */}
          {currentProject && (
            <div className="space-y-1.5">
              {(!collapsed || isMobile) && (
                <div className="px-3 pb-1">
                  <p className="text-[11px] font-semibold text-fog truncate uppercase tracking-wider">
                    {currentProject.name}
                  </p>
                </div>
              )}
              {projectNavItems.map((item) => {
                const Icon = item.icon;
                const active = route === item.id;

                return (
                  <div key={item.id} className="relative group">
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate(item.id, currentProject.id);
                        if (isMobile) setMobileMenuOpen(false);
                      }}
                      aria-current={active ? 'page' : undefined}
                      className={`relative w-full flex items-center gap-2.5 px-3 py-2 rounded-inputs text-[13px] font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-violet/50 ${
                        active
                          ? 'text-paper'
                          : 'text-mist hover:text-paper hover:bg-graphite/40'
                      }`}
                    >
                      {/* Motion sliding indicator */}
                      {active && (
                        <motion.div
                          layoutId="activeNavIndicator"
                          className="absolute inset-0 rounded-inputs bg-iris-violet/15 border border-iris-violet/30 shadow-subtle -z-0"
                          transition={
                            shouldReduceMotion
                              ? { duration: 0 }
                              : { type: 'spring', stiffness: 400, damping: 32 }
                          }
                        />
                      )}
                      <Icon className="w-4 h-4 shrink-0 relative z-10 transition-transform group-hover:scale-105" />
                      {(!collapsed || isMobile) && (
                        <span className="relative z-10">{item.label}</span>
                      )}
                    </button>

                    {/* Tooltip for collapsed sidebar */}
                    {collapsed && !isMobile && (
                      <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-md bg-obsidian border border-graphite text-[12px] font-medium text-paper whitespace-nowrap shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50">
                        {item.label}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Workspaces list */}
          {(!collapsed || isMobile) && projects.length > 0 && (
            <div className="space-y-1 pt-2 border-t border-graphite">
              <p className="px-3 py-1 text-[11px] font-semibold text-fog uppercase tracking-wider">
                Espacios de trabajo
              </p>
              {projects.map((p) => {
                const isSelected = currentProject?.id === p.id && route !== 'dashboard';
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onNavigate(route === 'dashboard' ? 'kanban' : route, p.id);
                      if (isMobile) setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-inputs text-[12px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-violet/50 ${
                      isSelected
                        ? 'text-paper bg-obsidian border border-graphite shadow-xs'
                        : 'text-fog hover:text-mist hover:bg-obsidian/60'
                    }`}
                  >
                    <span className="truncate">{p.name}</span>
                    <span className="font-mono text-[10px] text-ash ml-2 shrink-0">
                      {p.code}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </nav>

        {/* User profile footer */}
        {user && (
          <div className="p-3 border-t border-graphite shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <UserAvatar name={user.fullName} size="md" />
                {(!collapsed || isMobile) && (
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-bone truncate">{user.fullName}</p>
                    <p className="text-[11px] text-fog truncate">
                      {currentProject
                        ? formatRoleLabel(currentProject.myRole)
                        : user.globalRole === 'ADMIN'
                        ? 'Administrador'
                        : user.title || 'Miembro Scrum'}
                    </p>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={logout}
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
                className="p-1.5 rounded-inputs text-fog hover:text-coral-red hover:bg-graphite transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-red/50"
              >
                <LogOut className="w-4 h-4 transition-transform hover:scale-110" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-void text-mist flex selection:bg-iris-violet/30">
      {/* Desktop Sidebar with animated width */}
      <aside
        className={`hidden md:block shrink-0 transition-[width] duration-200 ease-in-out ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        <div className="sticky top-0 h-screen">{renderSidebarContent(false)}</div>
      </aside>

      {/* Mobile Sidebar Drawer with Motion */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden flex">
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-void/80 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />
            {/* Sliding Drawer */}
            <motion.div
              initial={shouldReduceMotion ? { opacity: 0 } : { x: '-100%' }}
              animate={shouldReduceMotion ? { opacity: 1 } : { x: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className="relative w-64 max-w-[80vw] h-full z-10 shadow-2xl"
            >
              {renderSidebarContent(true)}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content Shell */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navigation Bar */}
        <header className="sticky top-0 z-30 h-14 bg-void/90 backdrop-blur-md border-b border-graphite px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-1.5 rounded-inputs text-mist hover:text-paper hover:bg-graphite transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-violet/50"
              aria-label="Abrir navegación móvil"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-1.5 text-[13px] min-w-0" aria-label="Miga de pan">
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="text-fog hover:text-paper transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:underline"
              >
                Proyectos
              </button>
              {currentProject && route !== 'dashboard' && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-ash shrink-0" />
                  <button
                    type="button"
                    onClick={() => onNavigate('backlog', currentProject.id)}
                    className="text-mist hover:text-paper transition-colors truncate max-w-[140px] sm:max-w-[220px] focus-visible:outline-none focus-visible:underline"
                  >
                    {currentProject.name}
                  </button>
                  <ChevronRight className="w-3.5 h-3.5 text-ash shrink-0" />
                  <span className="font-semibold text-bone whitespace-nowrap truncate">
                    {routeLabelMap[route]}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Quick Actions & Notifications */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onOpenCommandPalette}
              className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-inputs bg-carbon border border-graphite hover:border-smoke text-[12px] text-fog hover:text-mist transition-all whitespace-nowrap shrink-0 shadow-subtle hover:bg-graphite/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-violet/50"
              title="Abrir paleta de comandos"
            >
              <Search className="w-3.5 h-3.5 text-fog" />
              <span>Buscar o navegar</span>
              <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded-sm bg-graphite text-mist border border-graphite/80">
                {isMac ? '⌘K' : 'Ctrl K'}
              </kbd>
            </button>

            {/* Notifications Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen((o) => !o)}
                className="relative p-2 rounded-inputs bg-carbon border border-graphite hover:border-smoke text-mist hover:text-paper transition-all shadow-subtle hover:bg-graphite/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-violet/50"
                aria-label={`Notificaciones ${unreadCount > 0 ? `(${unreadCount} no leídas)` : ''}`}
                aria-expanded={notifOpen}
              >
                <Bell className="w-4 h-4 transition-transform hover:scale-105" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-pills bg-iris-violet text-paper font-mono text-[10px] font-bold flex items-center justify-center shadow-md animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {notifOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setNotifOpen(false)}
                      aria-hidden="true"
                    />
                    <motion.div
                      initial={
                        shouldReduceMotion
                          ? { opacity: 0 }
                          : { opacity: 0, y: -8, scale: 0.96 }
                      }
                      animate={
                        shouldReduceMotion
                          ? { opacity: 1 }
                          : { opacity: 1, y: 0, scale: 1 }
                      }
                      exit={
                        shouldReduceMotion
                          ? { opacity: 0 }
                          : { opacity: 0, y: -8, scale: 0.96 }
                      }
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                      className="absolute right-0 mt-2 w-80 sm:w-96 rounded-cards bg-obsidian/95 backdrop-blur-md border border-graphite shadow-2xl z-50 overflow-hidden"
                      role="dialog"
                      aria-label="Panel de notificaciones"
                    >
                      <div className="px-4 py-3 border-b border-graphite flex items-center justify-between">
                        <span className="text-[13px] font-semibold text-bone">
                          Notificaciones ({unreadCount} sin leer)
                        </span>
                        {unreadCount > 0 && (
                          <button
                            type="button"
                            onClick={() => onMarkNotificationsRead()}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-signal-teal hover:text-paper transition-colors"
                          >
                            <CheckCheck className="w-3.5 h-3.5" />
                            Marcar leídas
                          </button>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto divide-y divide-graphite">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-8 text-center text-[12px] text-fog">
                            No tienes notificaciones pendientes.
                          </div>
                        ) : (
                          notifications.map((n) => (
                            <button
                              key={n.id}
                              type="button"
                              onClick={() => onMarkNotificationsRead(n.id)}
                              className={`w-full text-left px-4 py-3 hover:bg-graphite/40 transition-colors ${
                                n.readStatus ? 'opacity-60' : 'bg-iris-violet/5'
                              }`}
                            >
                              <p className="text-[12px] text-mist leading-5">{n.message}</p>
                              <p className="mt-1 font-mono text-[10px] text-fog">
                                {new Date(n.createdAt).toLocaleString('es-ES', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </button>
                          ))
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {primaryAction && <div className="shrink-0">{primaryAction}</div>}
          </div>
        </header>

        {/* Content View */}
        <main className="flex-1 p-4 sm:p-6 max-w-[1600px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
