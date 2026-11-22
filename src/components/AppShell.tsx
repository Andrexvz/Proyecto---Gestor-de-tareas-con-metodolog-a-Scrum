import React, { useEffect, useState } from 'react';
import {
  LayoutGrid,
  CheckSquare,
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
  Palette,
  HelpCircle,
  ShieldCheck,
  Zap,
  Sparkles,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { UserAvatar, formatRoleLabel } from './UIHelpers';
import type { AppNotification, ProjectSummary } from '../types/scrum';

export type ActiveRoute = 'dashboard' | 'my-work' | 'backlog' | 'sprints' | 'kanban' | 'metrics';

interface AppShellProps {
  route: ActiveRoute;
  projects: ProjectSummary[];
  currentProject: ProjectSummary | null;
  notifications: AppNotification[];
  onNavigate: (route: ActiveRoute, projectId?: number) => void;
  onMarkNotificationsRead: (notificationId?: number) => void;
  onOpenCommandPalette: () => void;
  onOpenOnboarding?: () => void;
  onOpenThemeModal?: () => void;
  onOpenAuditModal?: () => void;
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
  onOpenOnboarding,
  onOpenThemeModal,
  onOpenAuditModal,
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
  const canViewAudit = user?.globalRole === 'ADMIN' || projects.some((p) => p.myRole === 'SCRUM_MASTER');

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
    'my-work': 'Mi Trabajo',
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
      <div className="flex flex-col h-full bg-carbon border-r border-graphite/80 select-none">
        {/* Brand header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-graphite/80 shrink-0">
          <button
            type="button"
            onClick={() => {
              onNavigate('dashboard');
              if (isMobile) setMobileMenuOpen(false);
            }}
            className="flex items-center gap-2.5 min-w-0 text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-teal/50 rounded-inputs p-1"
          >
            {/* Neon Glowing Logo Icon */}
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-signal-teal via-iris-violet to-pulse-green p-[1.5px] shadow-[0_0_15px_rgba(25,217,232,0.35)] flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
              <div className="w-full h-full bg-void rounded-[10px] flex items-center justify-center">
                <Zap className="w-4 h-4 text-signal-teal" />
              </div>
            </div>
            {(!collapsed || isMobile) && (
              <div className="min-w-0">
                <span className="font-display font-semibold text-[15px] text-bone tracking-tight whitespace-nowrap truncate group-hover:text-paper transition-colors block leading-tight">
                  Agile Velocity
                </span>
                <span className="text-[10px] text-signal-teal font-mono uppercase tracking-wider block leading-tight">
                  Scrum Manager
                </span>
              </div>
            )}
          </button>

          {!isMobile ? (
            <button
              type="button"
              onClick={toggleCollapsed}
              className="p-1.5 rounded-inputs text-fog hover:text-paper hover:bg-graphite transition-all shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-teal/50"
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
            {/* Proyectos */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  onNavigate('dashboard');
                  if (isMobile) setMobileMenuOpen(false);
                }}
                aria-current={isDashboardActive ? 'page' : undefined}
                className={`relative w-full flex items-center gap-2.5 px-3 py-2.5 rounded-inputs text-[13px] font-medium transition-all whitespace-nowrap group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-teal/50 ${
                  isDashboardActive
                    ? 'text-bone bg-signal-teal/10 border border-signal-teal/25 shadow-[0_0_12px_rgba(25,217,232,0.1)]'
                    : 'text-mist hover:text-bone hover:bg-graphite/40 border border-transparent'
                }`}
              >
                {/* Luminous Neon Vertical Indicator on Right Edge (signature Aether Analytics style) */}
                {isDashboardActive && (
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-signal-teal shadow-[0_0_10px_#19D9E8]" />
                )}
                <LayoutGrid
                  className={`w-4 h-4 shrink-0 relative z-10 transition-transform group-hover:scale-105 ${
                    isDashboardActive ? 'text-signal-teal' : 'text-fog'
                  }`}
                />
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

            {/* Mi Trabajo */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  onNavigate('my-work');
                  if (isMobile) setMobileMenuOpen(false);
                }}
                aria-current={route === 'my-work' ? 'page' : undefined}
                className={`relative w-full flex items-center gap-2.5 px-3 py-2.5 rounded-inputs text-[13px] font-medium transition-all whitespace-nowrap group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-teal/50 ${
                  route === 'my-work'
                    ? 'text-bone bg-signal-teal/10 border border-signal-teal/25 shadow-[0_0_12px_rgba(25,217,232,0.1)]'
                    : 'text-mist hover:text-bone hover:bg-graphite/40 border border-transparent'
                }`}
              >
                {route === 'my-work' && (
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-signal-teal shadow-[0_0_10px_#19D9E8]" />
                )}
                <CheckSquare
                  className={`w-4 h-4 shrink-0 relative z-10 transition-transform group-hover:scale-105 ${
                    route === 'my-work' ? 'text-signal-teal' : 'text-iris-violet'
                  }`}
                />
                {(!collapsed || isMobile) && (
                  <span className="relative z-10 font-medium">Mi Trabajo</span>
                )}
              </button>

              {/* Tooltip for collapsed sidebar */}
              {collapsed && !isMobile && (
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-md bg-obsidian border border-graphite text-[12px] font-medium text-paper whitespace-nowrap shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50">
                  Mi Trabajo
                </div>
              )}
            </div>
          </div>

          {/* Active Project Navigation items */}
          {currentProject && (
            <div className="space-y-1.5">
              {(!collapsed || isMobile) && (
                <div className="px-3 pb-1">
                  <p className="text-[11px] font-semibold text-fog truncate uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-signal-teal shadow-[0_0_6px_#19D9E8]" />
                    <span className="truncate">{currentProject.name}</span>
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
                      className={`relative w-full flex items-center gap-2.5 px-3 py-2.5 rounded-inputs text-[13px] font-medium transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-teal/50 ${
                        active
                          ? 'text-bone bg-signal-teal/10 border border-signal-teal/25 shadow-[0_0_12px_rgba(25,217,232,0.1)]'
                          : 'text-mist hover:text-bone hover:bg-graphite/40 border border-transparent'
                      }`}
                    >
                      {active && (
                        <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-signal-teal shadow-[0_0_10px_#19D9E8]" />
                      )}
                      <Icon
                        className={`w-4 h-4 shrink-0 relative z-10 transition-transform group-hover:scale-105 ${
                          active ? 'text-signal-teal' : 'text-fog'
                        }`}
                      />
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
            <div className="space-y-1 pt-3 border-t border-graphite/70">
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
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-inputs text-[12px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-teal/50 ${
                      isSelected
                        ? 'text-paper bg-obsidian border border-signal-teal/30 shadow-[0_0_10px_rgba(25,217,232,0.15)] font-semibold'
                        : 'text-fog hover:text-mist hover:bg-obsidian/60 border border-transparent'
                    }`}
                  >
                    <span className="truncate">{p.name}</span>
                    <span className="font-mono text-[10px] text-signal-teal bg-signal-teal/10 px-1.5 py-0.5 rounded ml-2 shrink-0 border border-signal-teal/20">
                      {p.code}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </nav>

        {/* Bottom Glowing Sprint / Velocity Card (Inspired by Aether Analytics "Upgrade to Pro" card) */}
        {(!collapsed || isMobile) && (
          <div className="p-3 mx-2.5 mb-3 rounded-2xl bg-gradient-to-br from-iris-violet/20 via-obsidian to-carbon border border-iris-violet/35 shadow-[0_0_20px_rgba(168,85,247,0.15)] relative overflow-hidden shrink-0">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-5 h-5 rounded-md bg-iris-violet/25 flex items-center justify-center text-iris-violet shadow-[0_0_8px_rgba(168,85,247,0.3)]">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <span className="text-[12px] font-semibold text-bone">Agile Velocity Pro</span>
            </div>
            <p className="text-[11px] text-fog leading-relaxed mb-3">
              {currentProject?.activeSprint
                ? `Sprint activo: ${currentProject.activeSprint.name}`
                : 'Gestión de Sprints, asistencia IA y métricas en tiempo real.'}
            </p>
            <button
              type="button"
              onClick={() => {
                if (currentProject) onNavigate('kanban', currentProject.id);
                else onNavigate('dashboard');
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-inputs bg-gradient-to-r from-iris-violet to-lavender/90 hover:from-iris-violet/90 hover:to-lavender text-paper text-[11px] font-semibold shadow-[0_0_12px_rgba(168,85,247,0.4)] transition-all group"
            >
              <span>{currentProject ? 'Ver Tablero' : 'Explorar'}</span>
              <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        )}

        {/* User profile footer */}
        {user && (
          <div className="p-3 border-t border-graphite/80 shrink-0 bg-carbon">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative shrink-0">
                  <UserAvatar name={user.fullName} size="md" />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-pulse-green ring-2 ring-carbon shadow-[0_0_6px_#30D99B]" />
                </div>
                {(!collapsed || isMobile) && (
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-bone truncate">{user.fullName}</p>
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
    <div className="min-h-screen bg-void text-mist flex selection:bg-signal-teal/30">
      {/* Desktop Sidebar with animated width */}
      <aside
        className={`hidden md:block shrink-0 transition-[width] duration-200 ease-in-out ${
          collapsed ? 'w-16' : 'w-64'
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
              className="fixed inset-0 bg-void/85 backdrop-blur-md"
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

      {/* Main Content Shell with Outer Subtle Glow Frame */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navigation Bar */}
        <header className="sticky top-0 z-30 h-16 bg-void/90 backdrop-blur-md border-b border-graphite/80 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-1.5 rounded-inputs text-mist hover:text-paper hover:bg-graphite transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-teal/50"
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
            {/* Integrated Search Bar styled like Aether Analytics */}
            <button
              type="button"
              onClick={onOpenCommandPalette}
              className="hidden sm:inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-inputs bg-carbon border border-graphite hover:border-signal-teal/40 text-[12px] text-fog hover:text-mist transition-all whitespace-nowrap shrink-0 shadow-subtle hover:bg-graphite/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-teal/50"
              title="Abrir paleta de comandos"
            >
              <Search className="w-3.5 h-3.5 text-signal-teal" />
              <span>Buscar o navegar</span>
              <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-graphite/90 text-signal-teal border border-graphite/80 shadow-xs">
                {isMac ? '⌘K' : 'Ctrl K'}
              </kbd>
            </button>

            {/* Theme Customization Button */}
            {onOpenThemeModal && (
              <button
                type="button"
                onClick={onOpenThemeModal}
                className="p-2 rounded-inputs bg-carbon border border-graphite hover:border-smoke text-mist hover:text-paper transition-all shadow-subtle hover:bg-graphite/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-teal/50"
                title="Personalización y apariencia"
                aria-label="Abrir personalización y tema visual"
              >
                <Palette className="w-4 h-4 text-lavender transition-transform hover:scale-105" />
              </button>
            )}

            {/* Interactive Onboarding Guide Button */}
            {onOpenOnboarding && (
              <button
                type="button"
                onClick={onOpenOnboarding}
                className="p-2 rounded-inputs bg-carbon border border-graphite hover:border-smoke text-mist hover:text-paper transition-all shadow-subtle hover:bg-graphite/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-teal/50"
                title="Guía interactiva Scrum (Onboarding)"
                aria-label="Abrir tutorial interactivo de Scrum"
              >
                <HelpCircle className="w-4 h-4 text-signal-teal transition-transform hover:scale-105" />
              </button>
            )}

            {/* Audit Log Security Button (RNF-06) */}
            {canViewAudit && onOpenAuditModal && (
              <button
                type="button"
                onClick={onOpenAuditModal}
                className="p-2 rounded-inputs bg-carbon border border-graphite hover:border-smoke text-mist hover:text-paper transition-all shadow-subtle hover:bg-graphite/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-teal/50"
                title="Registro de Auditoría y Seguridad (RNF-06)"
                aria-label="Abrir registro de auditoría"
              >
                <ShieldCheck className="w-4 h-4 text-signal-teal transition-transform hover:scale-105" />
              </button>
            )}

            {/* Notifications Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen((o) => !o)}
                className="relative p-2 rounded-inputs bg-carbon border border-graphite hover:border-smoke text-mist hover:text-paper transition-all shadow-subtle hover:bg-graphite/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-teal/50"
                aria-label={`Notificaciones ${unreadCount > 0 ? `(${unreadCount} no leídas)` : ''}`}
                aria-expanded={notifOpen}
              >
                <Bell className="w-4 h-4 transition-transform hover:scale-105" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-pills bg-coral-red text-paper font-mono text-[10px] font-bold flex items-center justify-center shadow-[0_0_8px_#F43F5E] animate-pulse">
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
                                n.readStatus ? 'opacity-60' : 'bg-signal-teal/5'
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

            {/* User Profile Pill in Topbar (Inspired by Olivia Rhye pill in Aether Analytics) */}
            {user && (
              <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-graphite/80">
                <div className="relative">
                  <UserAvatar name={user.fullName} size="sm" />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-pulse-green ring-2 ring-void shadow-[0_0_6px_#30D99B]" />
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-[12px] font-semibold text-bone leading-tight truncate">
                    {user.fullName}
                  </p>
                  <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-medium bg-iris-violet/15 text-lavender border border-iris-violet/25">
                    {user.globalRole === 'ADMIN' ? 'Admin' : currentProject ? formatRoleLabel(currentProject.myRole) : 'Scrum'}
                  </span>
                </div>
              </div>
            )}

            {primaryAction && <div className="shrink-0">{primaryAction}</div>}
          </div>
        </header>

        {/* Content View */}
        <main className="flex-1 p-4 sm:p-6 max-w-[1600px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
