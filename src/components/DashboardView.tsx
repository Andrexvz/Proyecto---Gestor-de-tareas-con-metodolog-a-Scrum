import React, { useState } from 'react';
import {
  Plus,
  Users,
  Trash2,
  ArrowRight,
  FolderOpen,
  UserPlus,
  X,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiFetch } from '../lib/api';
import { ConfirmDialog, SprintStatusText, UserAvatar, formatRoleLabel } from './UIHelpers';
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
}

export function DashboardView({
  projects,
  users,
  loading,
  loadError,
  onRetry,
  onOpenProject,
  onRefreshProjects,
}: DashboardViewProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const isAdmin = user?.globalRole === 'ADMIN';

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-white tracking-tight">
            Proyectos Scrum
          </h1>
          <p className="mt-1 text-[13px] text-[#8D90A0]">
            Selecciona un espacio de trabajo para gestionar el Product Backlog, Sprints y Tablero Kanban.
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setUserModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#131B2E] hover:bg-[#1E293B] border border-[#334155] text-[13px] font-medium text-[#DAE2FD] transition-colors whitespace-nowrap"
            >
              <UserPlus className="w-4 h-4" />
              Registrar usuario
            </button>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-[13px] font-medium text-white transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Crear proyecto
            </button>
          </div>
        )}
      </div>

      {/* Network Error Banner */}
      {loadError && (
        <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-[#93000A]/30 border border-[#F43F5E]/40 text-[13px] text-[#FFDBD9]">
          <span>{loadError}</span>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1E293B] hover:bg-[#2D3449] text-white text-[12px] font-medium whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reintentar conexión
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-56 rounded-xl bg-[#131B2E] border border-[#1E293B] p-5 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="h-4 w-24 rounded skeleton-wave" />
                <div className="h-6 w-3/4 rounded skeleton-wave" />
                <div className="h-4 w-full rounded skeleton-wave" />
              </div>
              <div className="h-8 w-full rounded skeleton-wave" />
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-xl bg-[#0F172A] border border-[#1E293B] py-16 px-6 text-center max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-xl bg-[#171F33] border border-[#2D3449] flex items-center justify-center mx-auto text-[#8D90A0]">
            <FolderOpen className="w-6 h-6" />
          </div>
          <h2 className="mt-4 font-display text-lg font-semibold text-white">
            Todavía no hay proyectos registrados
          </h2>
          <p className="mt-1.5 text-[13px] text-[#8D90A0]">
            {isAdmin
              ? 'Crea tu primer proyecto Scrum para comenzar a estructurar el Backlog y planificar Sprints.'
              : 'Solicita a un Administrador que te asigne una membresía en un proyecto.'}
          </p>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-[13px] font-medium text-white transition-colors"
            >
              <Plus className="w-4 h-4" />
              Crear proyecto
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((project) => {
            const pct =
              project.totalPoints > 0
                ? Math.round((project.completedPoints / project.totalPoints) * 100)
                : 0;

            return (
              <div
                key={project.id}
                className="rounded-xl bg-[#131B2E] border border-[#222A3D] hover:border-[#3B82F6]/50 transition-colors p-5 flex flex-col justify-between gap-5"
              >
                <div className="space-y-3">
                  {/* Quiet unboxed metadata line */}
                  <div className="flex items-center justify-between gap-2 text-[12px] text-[#8D90A0]">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono font-medium text-[#B4C5FF]">{project.code}</span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">{formatRoleLabel(project.myRole)}</span>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setTeamProject(project)}
                          className="p-1.5 rounded-md text-[#8D90A0] hover:text-white hover:bg-[#1E293B] transition-colors"
                          title="Gestionar equipo y roles"
                        >
                          <Users className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(project)}
                          className="p-1.5 rounded-md text-[#8D90A0] hover:text-[#F43F5E] hover:bg-[#1E293B] transition-colors"
                          title="Eliminar proyecto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenProject(project.id, 'backlog')}
                    className="text-left block w-full group"
                  >
                    <h2 className="font-display text-[17px] font-semibold text-white group-hover:text-[#B4C5FF] transition-colors">
                      {project.name}
                    </h2>
                    <p className="mt-1.5 text-[13px] text-[#C3C6D7] leading-5 line-clamp-2">
                      {project.description || 'Sin descripción registrada.'}
                    </p>
                  </button>
                </div>

                {/* Progress & Active Sprint summary */}
                <div className="space-y-3 pt-4 border-t border-[#1E293B]">
                  <div className="flex items-center justify-between text-[12px]">
                    {project.activeSprint ? (
                      <div className="flex items-center gap-2 min-w-0">
                        <SprintStatusText status="ACTIVE" />
                        <span className="text-[#C3C6D7] truncate">{project.activeSprint.name}</span>
                      </div>
                    ) : (
                      <span className="text-[#8D90A0]">Sin Sprint activo</span>
                    )}
                    <span className="font-mono tabular-nums text-[#C3C6D7] shrink-0">
                      {project.completedPoints}/{project.totalPoints} pts
                    </span>
                  </div>

                  <div className="h-1.5 w-full rounded-full bg-[#0B0F17] overflow-hidden">
                    <div
                      className="h-full bg-[#2563EB] transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center -space-x-1.5">
                      {project.members.slice(0, 5).map((m) =>
                        m.user ? <UserAvatar key={m.id} name={m.user.fullName} size="xs" /> : null
                      )}
                      {project.members.length === 0 && (
                        <span className="text-[11px] text-[#64748B]">Sin miembros</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenProject(project.id, 'kanban')}
                        className="px-2.5 py-1.5 rounded-md text-[12px] font-medium text-[#C3C6D7] hover:text-white hover:bg-[#1E293B] transition-colors whitespace-nowrap"
                      >
                        Kanban
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenProject(project.id, 'backlog')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#1E293B] hover:bg-[#2563EB] text-[12px] font-medium text-white transition-colors whitespace-nowrap"
                      >
                        Backlog
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Project Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-[2px] p-4">
          <form
            onSubmit={handleCreateProject}
            className="w-full max-w-md rounded-xl bg-[#171F33] border border-[#334155] p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-white">Crear proyecto</h2>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="text-[#8D90A0] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#C3C6D7] mb-1.5">
                Nombre del proyecto *
              </label>
              <input
                type="text"
                required
                value={projName}
                onChange={(e) => setProjName(e.target.value)}
                placeholder="Ej. Pasarela de Pagos Instantáneos"
                className="w-full px-3.5 py-2 bg-[#0F172A] border border-[#334155] rounded-lg text-[13px] text-white focus:outline-none focus:border-[#3B82F6]"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#C3C6D7] mb-1.5">
                Código prefijo (opcional)
              </label>
              <input
                type="text"
                maxLength={5}
                value={projCode}
                onChange={(e) => setProjCode(e.target.value.toUpperCase())}
                placeholder="PPI"
                className="w-full px-3.5 py-2 bg-[#0F172A] border border-[#334155] rounded-lg text-[13px] font-mono text-white focus:outline-none focus:border-[#3B82F6]"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#C3C6D7] mb-1.5">
                Descripción
              </label>
              <textarea
                rows={3}
                value={projDesc}
                onChange={(e) => setProjDesc(e.target.value)}
                placeholder="Objetivo técnico y alcance del producto..."
                className="w-full px-3.5 py-2 bg-[#0F172A] border border-[#334155] rounded-lg text-[13px] text-white focus:outline-none focus:border-[#3B82F6]"
              />
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="px-4 py-2 text-[13px] text-[#C3C6D7] hover:text-white rounded-lg hover:bg-[#222A3D]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingProject}
                className="px-4 py-2 text-[13px] font-medium bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg disabled:opacity-60"
              >
                {savingProject ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Team Memberships Modal (RF-03) */}
      {currentTeamProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-[2px] p-4">
          <div className="w-full max-w-lg rounded-xl bg-[#171F33] border border-[#334155] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold text-white">
                  Equipo y Roles · {currentTeamProject.name}
                </h2>
                <p className="text-[12px] text-[#8D90A0]">
                  Cada usuario mantiene un único rol Scrum activo por proyecto.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTeamProject(null)}
                className="text-[#8D90A0] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="flex flex-col sm:flex-row gap-2.5">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : '')}
                required
                className="flex-1 px-3 py-2 bg-[#0F172A] border border-[#334155] rounded-lg text-[13px] text-white focus:outline-none focus:border-[#3B82F6]"
              >
                <option value="">Seleccionar usuario...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} ({u.email})
                  </option>
                ))}
              </select>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as ScrumRole)}
                className="px-3 py-2 bg-[#0F172A] border border-[#334155] rounded-lg text-[13px] text-white focus:outline-none focus:border-[#3B82F6]"
              >
                <option value="PRODUCT_OWNER">Product Owner</option>
                <option value="SCRUM_MASTER">Scrum Master</option>
                <option value="DEVELOPER">Developer</option>
              </select>
              <button
                type="submit"
                disabled={savingMember || !selectedUserId}
                className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-medium rounded-lg disabled:opacity-50 whitespace-nowrap"
              >
                Asignar
              </button>
            </form>

            <div className="divide-y divide-[#222A3D] max-h-64 overflow-y-auto border-t border-[#222A3D]">
              {currentTeamProject.members.length === 0 ? (
                <p className="py-6 text-center text-[12px] text-[#8D90A0]">
                  No hay miembros asignados a este proyecto todavía.
                </p>
              ) : (
                currentTeamProject.members.map((m) => (
                  <div key={m.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <UserAvatar name={m.user?.fullName || 'U'} size="sm" />
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-white truncate">
                          {m.user?.fullName}
                        </p>
                        <p className="text-[11px] text-[#8D90A0] truncate">{m.user?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[12px] text-[#B4C5FF]">
                        {formatRoleLabel(m.scrumRole)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(currentTeamProject.id, m.userId)}
                        className="text-[#8D90A0] hover:text-[#F43F5E] transition-colors"
                        title="Remover del proyecto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Register User Modal (RF-01 Admin) */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-[2px] p-4">
          <form
            onSubmit={handleRegisterUser}
            className="w-full max-w-md rounded-xl bg-[#171F33] border border-[#334155] p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-white">Registrar usuario</h2>
              <button
                type="button"
                onClick={() => setUserModalOpen(false)}
                className="text-[#8D90A0] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#C3C6D7] mb-1.5">
                Nombre completo *
              </label>
              <input
                type="text"
                required
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#0F172A] border border-[#334155] rounded-lg text-[13px] text-white"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#C3C6D7] mb-1.5">
                Correo electrónico *
              </label>
              <input
                type="email"
                required
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#0F172A] border border-[#334155] rounded-lg text-[13px] text-white"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#C3C6D7] mb-1.5">
                Contraseña temporal (mín. 8 caracteres) *
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={newUserPass}
                onChange={(e) => setNewUserPass(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#0F172A] border border-[#334155] rounded-lg text-[13px] text-white"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#C3C6D7] mb-1.5">
                Rol global
              </label>
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value as 'USER' | 'ADMIN')}
                className="w-full px-3.5 py-2 bg-[#0F172A] border border-[#334155] rounded-lg text-[13px] text-white"
              >
                <option value="USER">Usuario estándar (USER)</option>
                <option value="ADMIN">Administrador (ADMIN)</option>
              </select>
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setUserModalOpen(false)}
                className="px-4 py-2 text-[13px] text-[#C3C6D7] hover:text-white rounded-lg hover:bg-[#222A3D]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingUser}
                className="px-4 py-2 text-[13px] font-medium bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg disabled:opacity-60"
              >
                {savingUser ? 'Registrando...' : 'Registrar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Project Confirmation (RF-02) */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Eliminar ${deleteTarget?.name}`}
        description="Esta acción eliminará permanentemente el proyecto, sus Sprints, historias de usuario y tareas técnicas. ¿Deseas continuar?"
        confirmLabel="Eliminar proyecto"
        loading={deleting}
        onConfirm={handleDeleteProject}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
