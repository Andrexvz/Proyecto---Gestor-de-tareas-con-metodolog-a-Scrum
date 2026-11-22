import React, { useEffect, useState } from 'react';
import { ShieldCheck, RefreshCw, Filter, Calendar, User as UserIcon } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { Modal, Button, Badge, SkeletonLoader } from './ui';
import type { AuditAction, AuditLog } from '../types/scrum';

interface AuditLogModalProps {
  open: boolean;
  onClose: () => void;
}

export function AuditLogModal({ open, onClose }: AuditLogModalProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string>('ALL');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const url =
        selectedAction === 'ALL'
          ? '/api/v1/audit-logs?limit=100'
          : `/api/v1/audit-logs?action=${selectedAction}&limit=100`;
      const res = await apiFetch<{ auditLogs: AuditLog[] }>(url);
      setLogs(res.auditLogs || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchLogs();
    }
  }, [open, selectedAction]);

  const getActionBadgeVariant = (action: AuditAction): 'default' | 'purple' | 'info' | 'success' => {
    switch (action) {
      case 'USER_CREATED':
      case 'USER_LOGIN':
        return 'info';
      case 'ROLE_CHANGED':
        return 'purple';
      case 'SPRINT_STARTED':
      case 'SPRINT_CLOSED':
        return 'success';
      case 'IMPEDIMENT_REPORTED':
      case 'IMPEDIMENT_RESOLVED':
        return 'default';
      case 'TASK_COMMENT_ADDED':
        return 'purple';
      default:
        return 'default';
    }
  };

  const getActionLabel = (action: AuditAction): string => {
    switch (action) {
      case 'USER_CREATED':
        return 'Usuario Registrado';
      case 'USER_LOGIN':
        return 'Inicio de Sesión';
      case 'ROLE_CHANGED':
        return 'Cambio de Rol';
      case 'SPRINT_STARTED':
        return 'Sprint Iniciado';
      case 'SPRINT_CLOSED':
        return 'Sprint Cerrado';
      case 'IMPEDIMENT_REPORTED':
        return 'Impedimento Reportado';
      case 'IMPEDIMENT_RESOLVED':
        return 'Impedimento Resuelto';
      case 'TASK_COMMENT_ADDED':
        return 'Comentario de Tarea';
      default:
        return action;
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registro de Auditoría y Seguridad (RNF-06)"
      description="Historial inmutable de eventos críticos del sistema: altas de usuario, inicios de sesión, cambios de rol, inicio/cierre de sprints y gestión de impedimentos."
      size="xl"
    >
      <div className="space-y-4">
        {/* Controls: Filter & Refresh */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-inputs bg-carbon border border-graphite">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-fog shrink-0" />
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="bg-obsidian border border-graphite rounded-inputs px-2.5 py-1.5 text-[12px] text-paper focus:outline-none focus:border-iris-violet cursor-pointer"
            >
              <option value="ALL">Todos los eventos</option>
              <option value="USER_CREATED">Altas de usuario</option>
              <option value="USER_LOGIN">Inicios de sesión</option>
              <option value="ROLE_CHANGED">Cambios de rol</option>
              <option value="SPRINT_STARTED">Inicio de Sprint</option>
              <option value="SPRINT_CLOSED">Cierre de Sprint</option>
              <option value="IMPEDIMENT_REPORTED">Impedimentos reportados</option>
              <option value="IMPEDIMENT_RESOLVED">Impedimentos resueltos</option>
              <option value="TASK_COMMENT_ADDED">Comentarios técnicos</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[12px] text-fog font-mono">
              {logs.length} registro{logs.length === 1 ? '' : 's'}
            </span>
            <Button
              type="button"
              variant="secondary"
              size="xs"
              onClick={fetchLogs}
              loading={loading}
              icon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Actualizar
            </Button>
          </div>
        </div>

        {/* Logs table */}
        <div className="border border-graphite rounded-inputs overflow-hidden max-h-[460px] overflow-y-auto">
          {loading ? (
            <div className="p-6 space-y-3">
              <SkeletonLoader height={28} />
              <SkeletonLoader height={28} />
              <SkeletonLoader height={28} />
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-fog text-[13px]">
              No se encontraron registros de auditoría para el filtro seleccionado.
            </div>
          ) : (
            <table className="w-full text-left text-[12px]">
              <thead className="bg-carbon/80 text-mist uppercase font-semibold text-[11px] border-b border-graphite sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">Fecha y Hora</th>
                  <th className="py-2.5 px-3">Evento</th>
                  <th className="py-2.5 px-3">Usuario / Actor</th>
                  <th className="py-2.5 px-3">Entidad</th>
                  <th className="py-2.5 px-3">Detalles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-graphite/60 bg-carbon/30">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-carbon/70 transition-colors">
                    <td className="py-2.5 px-3 whitespace-nowrap font-mono text-fog text-[11px]">
                      {new Date(log.timestamp).toLocaleString('es-ES', {
                        dateStyle: 'short',
                        timeStyle: 'medium',
                      })}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <Badge variant={getActionBadgeVariant(log.action)} size="sm" shape="pill">
                        {getActionLabel(log.action)}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap font-medium text-bone">
                      {log.userName || 'Sistema'}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap font-mono text-signal-teal text-[11px]">
                      {log.entityType} #{log.entityId}
                    </td>
                    <td className="py-2.5 px-3 text-mist max-w-xs sm:max-w-md break-words">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-graphite text-[11px] text-fog">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-signal-teal" />
            Almacenamiento seguro e inmutable. No modificable desde la interfaz (RNF-06).
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
