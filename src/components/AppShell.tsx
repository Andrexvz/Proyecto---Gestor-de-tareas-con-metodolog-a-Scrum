import React, { useState } from 'react';
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
  children: React.ReactNode;
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
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.readStatus).length;

  const projectNavItems: Array<{ id: ActiveRoute; label: string; icon: React.ComponentType<{ className?: string }> }> = [
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

  const renderSidebarContent = (isMobile = false) => (
    <div className="flex flex-col h-full bg-[#0F172A] border-r border-[#1E293B]">
      {/* Brand header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-[#1E293B] shrink-0">
        <button
          type="button"
          onClick={() => {
            onNavigate('dashboard');
            if (isMobile) setMobileMenuOpen(false);
          }}
          className="flex items-center gap-2.5 min-w-0 text-left"
        >
          <div className="w-7 h-7 rounded-md bg-[#2563EB] flex items-center justify-center text-white font-display font-bold text-xs shrink-0">
            AV
          </div>
          {(!collapsed || isMobile) && (
            <span className="font-display font-semibold text-[15px] text-white tracking-tight whitespace-nowrap truncate">
              Agile Velocity
            </span>
          )}
        </button>

        {!isMobile ? (
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="p-1.5 rounded-md text-[#8D90A0] hover:text-white hover:bg-[#1E293B] transition-colors shrink-0"
            title={collapsed ? 'Expandir barra' : 'Contraer barra'}
            aria-label="Alternar barra lateral"
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="p-1.5 rounded-md text-[#8D90A0] hover:text-white"
            aria-label="Cerrar menú"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-4 space-y-6">
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => {
              onNavigate('dashboard');
              if (isMobile) setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors whitespace-nowrap ${
              route === 'dashboard'
                ? 'bg-[#2563EB]/15 text-white border border-[#3B82F6]/30'
                : 'text-[#C3C6D7] hover:text-white hover:bg-[#1E293B]/70'
            }`}
          >
            <LayoutGrid className="w-4 h-4 shrink-0" />
            {(!collapsed || isMobile) && <span>Proyectos</span>}
          </button>
        </div>

        {currentProject && (
          <div className="space-y-1.5">
            {(!collapsed || isMobile) && (
              <div className="px-3 pb-1">
                <p className="text-[11px] font-medium text-[#8D90A0] truncate">
                  {currentProject.name}
                </p>
              </div>
            )}
            {projectNavItems.map((item) => {
              const Icon = item.icon;
              const active = route === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onNavigate(item.id, currentProject.id);
                    if (isMobile) setMobileMenuOpen(false);
                  }}
                  title={collapsed && !isMobile ? item.label : undefined}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-[#2563EB]/15 text-white border border-[#3B82F6]/30'
                      : 'text-[#C3C6D7] hover:text-white hover:bg-[#1E293B]/70'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {(!collapsed || isMobile) && <span>{item.label}</span>}
                </button>
              );
            })}
          </div>
        )}

        {(!collapsed || isMobile) && projects.length > 0 && (
          <div className="space-y-1 pt-2 border-t border-[#1E293B]">
            <p className="px-3 py-1 text-[11px] font-medium text-[#8D90A0]">Espacios de trabajo</p>
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
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[12px] transition-colors ${
                    isSelected
                      ? 'text-white bg-[#171F33]'
                      : 'text-[#8D90A0] hover:text-[#DAE2FD] hover:bg-[#171F33]/60'
                  }`}
                >
                  <span className="truncate">{p.name}</span>
                  <span className="font-mono text-[10px] text-[#64748B] ml-2 shrink-0">
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
        <div className="p-3 border-t border-[#1E293B] shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <UserAvatar name={user.fullName} size="md" />
              {(!collapsed || isMobile) && (
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-white truncate">{user.fullName}</p>
                  <p className="text-[11px] text-[#8D90A0] truncate">
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
              className="p-1.5 rounded-md text-[#8D90A0] hover:text-[#F43F5E] hover:bg-[#1E293B] transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0B0F17] text-[#DAE2FD] flex">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:block shrink-0 transition-[width] duration-150 ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        <div className="sticky top-0 h-screen">{renderSidebarContent(false)}</div>
      </aside>

      {/* Mobile Sidebar Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-64 max-w-[80vw] h-full z-10">
            {renderSidebarContent(true)}
          </div>
        </div>
      )}

      {/* Main Content Shell */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar (Clean 3-Zone Contract: Breadcrumb | Search/Notifications | Primary CTA) */}
        <header className="sticky top-0 z-30 h-14 bg-[#0B0F17]/95 backdrop-blur border-b border-[#1E293B] px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-1.5 rounded-md text-[#C3C6D7] hover:text-white hover:bg-[#1E293B]"
              aria-label="Abrir navegación"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-1.5 text-[13px] min-w-0">
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="text-[#8D90A0] hover:text-white transition-colors whitespace-nowrap"
              >
                Proyectos
              </button>
              {currentProject && route !== 'dashboard' && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-[#475569] shrink-0" />
                  <button
                    type="button"
                    onClick={() => onNavigate('backlog', currentProject.id)}
                    className="text-[#C3C6D7] hover:text-white transition-colors truncate max-w-[140px] sm:max-w-[220px]"
                  >
                    {currentProject.name}
                  </button>
                  <ChevronRight className="w-3.5 h-3.5 text-[#475569] shrink-0" />
                  <span className="font-medium text-white whitespace-nowrap truncate">
                    {routeLabelMap[route]}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onOpenCommandPalette}
              className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0F172A] border border-[#2D3449] hover:border-[#434655] text-[12px] text-[#8D90A0] hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Buscar o navegar</span>
              <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#1E293B] text-[#C3C6D7]">
                ⌘K
              </kbd>
            </button>

            {/* Notifications Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen((o) => !o)}
                className="relative p-2 rounded-lg bg-[#0F172A] border border-[#2D3449] hover:border-[#434655] text-[#C3C6D7] hover:text-white transition-colors"
                aria-label="Notificaciones"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#2563EB] text-white font-mono text-[10px] font-semibold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setNotifOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-[#171F33] border border-[#334155] shadow-2xl z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-[#2D3449] flex items-center justify-between">
                      <span className="text-[13px] font-semibold text-white">
                        Notificaciones ({unreadCount} sin leer)
                      </span>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={() => onMarkNotificationsRead()}
                          className="inline-flex items-center gap-1 text-[11px] text-[#B4C5FF] hover:text-white"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          Marcar leídas
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-[#222A3D]">
                      {notifications.length === 0 ? (
                        <p className="px-4 py-8 text-center text-[12px] text-[#8D90A0]">
                          No tienes notificaciones pendientes.
                        </p>
                      ) : (
                        notifications.map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => onMarkNotificationsRead(n.id)}
                            className={`w-full text-left px-4 py-3 hover:bg-[#222A3D]/60 transition-colors ${
                              n.readStatus ? 'opacity-60' : 'bg-[#2563EB]/5'
                            }`}
                          >
                            <p className="text-[12px] text-[#DAE2FD] leading-5">{n.message}</p>
                            <p className="mt-1 font-mono text-[10px] text-[#8D90A0]">
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
                  </div>
                </>
              )}
            </div>

            {primaryAction && <div className="shrink-0">{primaryAction}</div>}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-[1600px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
