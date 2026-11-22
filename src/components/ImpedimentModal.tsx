import React, { useEffect, useState } from 'react';
import {
  AlertOctagon,
  CheckCircle2,
  Clock,
  User,
  Plus,
  ShieldAlert,
  Send,
  X,
  AlertTriangle,
  History,
} from 'lucide-react';
import { Modal, Button, Textarea, Badge } from './ui';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { Impediment, TaskItem } from '../types/scrum';

interface ImpedimentModalProps {
  open: boolean;
  task: TaskItem | null;
  projectId: number;
  myRole?: string;
  onClose: () => void;
  onRefresh: () => Promise<void>;
}

export function ImpedimentModal({
  open,
  task,
  projectId,
  myRole,
  onClose,
  onRefresh,
}: ImpedimentModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [impediments, setImpediments] = useState<Impediment[]>(task?.impediments || []);
  const [loading, setLoading] = useState(false);
  const [newDescription, setNewDescription] = useState('');
  const [reporting, setReporting] = useState(false);
  const [reportError, setReportError] = useState('');

  // Resolution state by impedimentId
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [resolutionComment, setResolutionComment] = useState('');
  const [resolving, setResolving] = useState(false);

  const canResolve = myRole === 'SCRUM_MASTER';
  const canReport = myRole === 'DEVELOPER' || myRole === 'SCRUM_MASTER';

  const fetchImpediments = async () => {
    if (!task) return;
    setLoading(true);
    try {
      const res = await apiFetch<{ impediments: Impediment[] }>(
        `/api/v1/tasks/${task.id}/impediments`
      );
      setImpediments(res.impediments || []);
    } catch (err: any) {
      showToast(err?.message || 'Error al cargar los impedimentos de la tarea', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && task) {
      fetchImpediments();
      setNewDescription('');
      setReportError('');
      setResolvingId(null);
      setResolutionComment('');
    }
  }, [open, task?.id]);

  const handleReportImpediment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;
    const trimmed = newDescription.trim();
    if (trimmed.length < 5) {
      setReportError('La descripción del impedimento debe contener al menos 5 caracteres');
      return;
    }
    if (trimmed.length > 500) {
      setReportError('La descripción no puede exceder 500 caracteres');
      return;
    }

    setReporting(true);
    setReportError('');
    try {
      await apiFetch(`/api/v1/tasks/${task.id}/impediments`, {
        method: 'POST',
        body: JSON.stringify({ description: trimmed }),
      });
      showToast(`Impedimento registrado en ${task.code}. La tarea está ahora bloqueada.`, 'warning');
      setNewDescription('');
      await fetchImpediments();
      await onRefresh();
    } catch (err: any) {
      setReportError(err?.message || 'Error al registrar el impedimento');
    } finally {
      setReporting(false);
    }
  };

  const handleResolveImpediment = async (impedimentId: number) => {
    if (!canResolve) return;
    setResolving(true);
    try {
      await apiFetch(`/api/v1/impediments/${impedimentId}/resolve`, {
        method: 'PATCH',
        body: JSON.stringify({
          resolutionComment: resolutionComment.trim() || undefined,
        }),
      });
      showToast('Impedimento resuelto exitosamente por el Scrum Master', 'success');
      setResolvingId(null);
      setResolutionComment('');
      await fetchImpediments();
      await onRefresh();
    } catch (err: any) {
      showToast(err?.message || 'Error al resolver el impedimento', 'error');
    } finally {
      setResolving(false);
    }
  };

  if (!task) return null;

  const openImpediments = impediments.filter((i) => i.status === 'OPEN');
  const resolvedImpediments = impediments.filter((i) => i.status === 'RESOLVED');

  const formatDateTime = (isoString?: string | null) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleString('es-ES', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Impedimentos y Bloqueos — ${task.code}`}
      size="lg"
    >
      <div className="space-y-6">
        {/* Task summary header */}
        <div className="p-3.5 rounded-cards bg-carbon border border-graphite/80 flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[12px] font-semibold text-signal-teal bg-signal-teal/10 px-2 py-0.5 rounded">
                {task.code}
              </span>
              <span className="text-xs font-mono text-fog">ID: {task.id}</span>
              {openImpediments.length > 0 ? (
                <Badge variant="danger" size="sm" shape="pill" dot>
                  Bloqueada ({openImpediments.length})
                </Badge>
              ) : (
                <Badge variant="success" size="sm" shape="pill" dot>
                  Sin Bloqueos Activos
                </Badge>
              )}
            </div>
            <p className="text-[13px] text-bone font-medium leading-snug">
              {task.description}
            </p>
          </div>
        </div>

        {/* Warning banner if blocked */}
        {openImpediments.length > 0 && (
          <div className="p-3 rounded-inputs bg-coral-red/10 border border-coral-red/30 flex items-start gap-2.5 text-[12px] text-coral-red">
            <AlertOctagon className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Tarea con impedimentos activos (RF5 / HU #9)</p>
              <p className="text-mist mt-0.5">
                Esta tarea no puede ser movida a la columna <strong>Hecho</strong> hasta que el Scrum Master o Administrador resuelva todos los bloqueos registrados.
              </p>
            </div>
          </div>
        )}

        {/* SECTION 1: Active Open Impediments */}
        <div className="space-y-3">
          <h4 className="text-[12px] font-semibold text-bone flex items-center gap-1.5 uppercase tracking-wider">
            <AlertTriangle className="w-3.5 h-3.5 text-coral-red" />
            Impedimentos Activos ({openImpediments.length})
          </h4>

          {loading ? (
            <div className="p-4 rounded-inputs bg-carbon/50 border border-graphite text-center text-xs text-fog">
              Cargando historial de impedimentos...
            </div>
          ) : openImpediments.length === 0 ? (
            <div className="p-3.5 rounded-inputs bg-carbon/40 border border-graphite/60 text-center text-[12px] text-fog">
              No hay bloqueos activos en esta tarea. El flujo de trabajo puede continuar normalmente.
            </div>
          ) : (
            <div className="space-y-3">
              {openImpediments.map((imp) => {
                const isResolvingThis = resolvingId === imp.id;
                return (
                  <div
                    key={imp.id}
                    className="p-3.5 rounded-cards bg-carbon border border-coral-red/40 space-y-3 shadow-subtle"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-[13px] text-bone font-medium leading-relaxed">
                          {imp.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-fog">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            Reportado por: <strong className="text-mist">{imp.creatorName}</strong>
                          </span>
                          <span className="text-ash">·</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDateTime(imp.createdAt)}
                          </span>
                        </div>
                      </div>
                      <Badge variant="danger" size="sm">
                        Abierto
                      </Badge>
                    </div>

                    {/* Resolution Section */}
                    {canResolve ? (
                      <div className="pt-2 border-t border-graphite/60">
                        {isResolvingThis ? (
                          <div className="space-y-2 bg-obsidian/60 p-3 rounded-inputs border border-graphite">
                            <label className="block text-[11px] font-semibold text-signal-teal uppercase tracking-wider">
                              Resolución del Scrum Master (RF6 / HU #9)
                            </label>
                            <Textarea
                              value={resolutionComment}
                              onChange={(e) => setResolutionComment(e.target.value)}
                              placeholder="Describe la solución o acuerdo alcanzado para desbloquear la tarea (opcional)..."
                              rows={2}
                              className="text-[12px]"
                            />
                            <div className="flex items-center justify-end gap-2 pt-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setResolvingId(null);
                                  setResolutionComment('');
                                }}
                              >
                                Cancelar
                              </Button>
                              <Button
                                variant="primary"
                                size="sm"
                                loading={resolving}
                                onClick={() => handleResolveImpediment(imp.id)}
                                icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                              >
                                Confirmar y Desbloquear
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-end">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setResolvingId(imp.id);
                                setResolutionComment('');
                              }}
                              icon={<CheckCircle2 className="w-3.5 h-3.5 text-pulse-green" />}
                            >
                              Resolver como Scrum Master
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="pt-1 text-[11px] text-fog italic">
                        Solo el Scrum Master del proyecto puede resolver y desbloquear este impedimento (RF6 / HU #9).
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION 2: Form to Report New Impediment */}
        {canReport ? (
          <form onSubmit={handleReportImpediment} className="space-y-3 pt-2 border-t border-graphite/60">
            <div className="flex items-center justify-between">
              <h4 className="text-[12px] font-semibold text-bone flex items-center gap-1.5 uppercase tracking-wider">
                <Plus className="w-3.5 h-3.5 text-signal-teal" />
                Reportar Nuevo Impedimento
              </h4>
              <span className="text-[11px] text-fog">Roles Developer y Scrum Master</span>
            </div>

            <Textarea
              value={newDescription}
              onChange={(e) => {
                setNewDescription(e.target.value);
                if (reportError) setReportError('');
              }}
              placeholder="Describe con claridad el bloqueo técnico, dependencia externa o problema que impide continuar esta tarea..."
              rows={3}
              error={reportError}
              className="text-[13px]"
            />

            <div className="flex items-center justify-between">
              <p className="text-[11px] text-fog">
                Al reportar el impedimento, la tarea se marcará como <strong>Bloqueada</strong> en el tablero Kanban.
              </p>
              <Button
                type="submit"
                variant="danger"
                size="sm"
                loading={reporting}
                disabled={newDescription.trim().length < 5}
                icon={<AlertOctagon className="w-3.5 h-3.5" />}
              >
                Registrar Bloqueo
              </Button>
            </div>
          </form>
        ) : (
          <div className="p-3 rounded-inputs bg-carbon/50 border border-graphite text-center text-[12px] text-fog">
            Modo lectura: Solo los roles Developer y Scrum Master del proyecto pueden registrar nuevos impedimentos (RF5 / HU #9).
          </div>
        )}

        {/* SECTION 3: Resolved Impediments History (Trazabilidad RF5 / RF6) */}
        {resolvedImpediments.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-graphite/60">
            <h4 className="text-[12px] font-semibold text-fog flex items-center gap-1.5 uppercase tracking-wider">
              <History className="w-3.5 h-3.5" />
              Historial de Impedimentos Resueltos ({resolvedImpediments.length})
            </h4>

            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {resolvedImpediments.map((imp) => (
                <div
                  key={imp.id}
                  className="p-3 rounded-inputs bg-carbon/50 border border-graphite/60 space-y-1.5 text-[12px]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-mist line-through leading-snug">{imp.description}</p>
                    <Badge variant="success" size="sm">
                      Resuelto
                    </Badge>
                  </div>
                  {imp.resolutionComment && (
                    <p className="text-signal-teal bg-signal-teal/5 p-2 rounded border border-signal-teal/20 text-[11px]">
                      <strong>Solución:</strong> {imp.resolutionComment}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-fog">
                    <span>Reportó: {imp.creatorName} ({formatDateTime(imp.createdAt)})</span>
                    <span>·</span>
                    <span>
                      Resuelto por: <strong>{imp.resolverName || 'Scrum Master'}</strong> ({formatDateTime(imp.resolvedAt)})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-graphite">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
