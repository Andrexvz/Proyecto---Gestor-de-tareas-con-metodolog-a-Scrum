import React, { useState } from 'react';
import { Layers, Plus, Pencil, Trash2, Check, AlertCircle, Palette } from 'lucide-react';
import { Modal, Input, Textarea, Button, Badge } from './ui';
import { apiFetch } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { ConfirmDialog } from './UIHelpers';
import type { Epic } from '../types/scrum';

export interface EpicManagerModalProps {
  open: boolean;
  projectId: number;
  epics: Epic[];
  canManage: boolean;
  onClose: () => void;
  onRefresh: () => Promise<void>;
}

const PRESET_COLORS = [
  { hex: '#8B5CF6', label: 'Violeta Iris' },
  { hex: '#06B6D4', label: 'Verde/Azul Teal' },
  { hex: '#10B981', label: 'Verde Pulso' },
  { hex: '#F59E0B', label: 'Ámbar Cálido' },
  { hex: '#F43F5E', label: 'Rosa Coral' },
  { hex: '#6366F1', label: 'Índigo' },
  { hex: '#EC4899', label: 'Fucsia' },
  { hex: '#0EA5E9', label: 'Azul Cielo' },
];

export function EpicManagerModal({
  open,
  projectId,
  epics,
  canManage,
  onClose,
  onRefresh,
}: EpicManagerModalProps) {
  const { showToast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [editingEpicId, setEditingEpicId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [colorHex, setColorHex] = useState('#8B5CF6');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Epic | null>(null);
  const [deleting, setDeleting] = useState(false);

  const resetForm = () => {
    setIsEditing(false);
    setEditingEpicId(null);
    setName('');
    setDescription('');
    setColorHex('#8B5CF6');
    setErrorMsg(null);
  };

  const handleStartCreate = () => {
    resetForm();
    setIsEditing(true);
  };

  const handleStartEdit = (epic: Epic) => {
    setIsEditing(true);
    setEditingEpicId(epic.id);
    setName(epic.name);
    setDescription(epic.description);
    setColorHex(epic.colorHex);
    setErrorMsg(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName || cleanName.length < 3) {
      setErrorMsg('El nombre de la Épica debe tener al menos 3 caracteres');
      return;
    }
    if (cleanName.length > 100) {
      setErrorMsg('El nombre de la Épica no puede exceder 100 caracteres');
      return;
    }
    const cleanHex = colorHex.trim().toUpperCase();
    if (!/^#([0-9A-F]{3}|[0-9A-F]{6})$/.test(cleanHex)) {
      setErrorMsg('El color debe tener un formato hexadecimal válido (ej: #8B5CF6)');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    try {
      if (editingEpicId) {
        await apiFetch(`/api/v1/epics/${editingEpicId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: cleanName,
            description: description.trim(),
            colorHex: cleanHex,
          }),
        });
        showToast('Épica actualizada correctamente', 'success');
      } else {
        await apiFetch(`/api/v1/projects/${projectId}/epics`, {
          method: 'POST',
          body: JSON.stringify({
            name: cleanName,
            description: description.trim(),
            colorHex: cleanHex,
          }),
        });
        showToast('Épica creada correctamente', 'success');
      }
      await onRefresh();
      resetForm();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al guardar la Épica');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/v1/epics/${deleteTarget.id}`, { method: 'DELETE' });
      showToast('Épica eliminada. Las historias asociadas se conservaron en el Backlog.', 'info');
      setDeleteTarget(null);
      await onRefresh();
    } catch (err: any) {
      showToast(err?.message || 'Error al eliminar la Épica', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Gestión de Épicas del Proyecto"
        description="Agrupa y clasifica historias de usuario en grandes iniciativas de negocio (RF3, HU #4)."
        size="lg"
      >
        <div className="space-y-6">
          {/* Header Action / Form Trigger */}
          <div className="flex items-center justify-between pb-2 border-b border-graphite/60">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-iris-violet" />
              <span className="text-xs font-semibold text-bone">
                Épicas Registradas ({epics.length})
              </span>
            </div>
            {canManage && !isEditing && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleStartCreate}
                icon={<Plus className="w-3.5 h-3.5" />}
              >
                Nueva Épica
              </Button>
            )}
          </div>

          {/* Create / Edit Form */}
          {isEditing && (
            <form
              onSubmit={handleSave}
              className="p-4 rounded-cards bg-carbon border border-iris-violet/40 shadow-glow space-y-4"
            >
              <div className="flex items-center justify-between pb-1 border-b border-graphite/50">
                <span className="text-xs font-semibold text-iris-violet flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5" />
                  {editingEpicId ? 'Editar Épica' : 'Nueva Épica'}
                </span>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-fog hover:text-bone text-xs cursor-pointer font-medium"
                >
                  Cancelar
                </button>
              </div>

              {errorMsg && (
                <div className="p-2.5 rounded-inputs bg-coral-red/10 border border-coral-red/30 text-coral-red text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-3">
                <Input
                  label="Nombre de la Épica *"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Seguridad y Autenticación Central"
                  required
                />

                <Textarea
                  label="Descripción de la iniciativa"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe el alcance y objetivo estratégico de esta Épica..."
                  rows={2}
                  maxLength={250}
                />

                {/* Color Palette Selector */}
                <div>
                  <label className="block text-[12px] font-medium text-mist mb-1.5">
                    Color Distintivo *
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setColorHex(c.hex)}
                        className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer flex items-center justify-center ${
                          colorHex.toUpperCase() === c.hex.toUpperCase()
                            ? 'scale-110 border-paper shadow-md'
                            : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.label}
                      >
                        {colorHex.toUpperCase() === c.hex.toUpperCase() && (
                          <Check className="w-3.5 h-3.5 text-paper stroke-[3]" />
                        )}
                      </button>
                    ))}

                    <div className="flex items-center gap-1 ml-2 pl-2 border-l border-graphite">
                      <span className="text-[11px] text-fog font-mono">Hex:</span>
                      <input
                        type="text"
                        value={colorHex}
                        onChange={(e) => setColorHex(e.target.value)}
                        placeholder="#8B5CF6"
                        maxLength={7}
                        className="w-20 px-2 py-1 rounded bg-obsidian border border-graphite text-[11px] font-mono text-bone focus:outline-none focus:border-iris-violet uppercase"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="secondary" size="sm" type="button" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button variant="primary" size="sm" type="submit" loading={saving}>
                  {editingEpicId ? 'Actualizar Épica' : 'Guardar Épica'}
                </Button>
              </div>
            </form>
          )}

          {/* Epics List */}
          {epics.length === 0 ? (
            <div className="p-6 text-center rounded-cards bg-carbon border border-graphite/60">
              <Layers className="w-8 h-8 text-fog mx-auto mb-2 opacity-50" />
              <p className="text-xs font-medium text-mist">
                No hay Épicas creadas en este proyecto todavía.
              </p>
              <p className="text-[11px] text-fog mt-1">
                Las Épicas permiten vincular y categorizar los requerimientos del Product Backlog.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 max-h-72 overflow-y-auto pr-1">
              {epics.map((epic) => (
                <div
                  key={epic.id}
                  className="p-3 rounded-cards bg-carbon border border-graphite flex items-center justify-between gap-3 hover:border-graphite/80 transition-colors"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 mt-0.5 border border-paper/20"
                      style={{ backgroundColor: epic.colorHex }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-bone truncate">
                          {epic.name}
                        </span>
                        <span
                          className="px-1.5 py-0.2 rounded text-[10px] font-mono border"
                          style={{
                            borderColor: `${epic.colorHex}40`,
                            color: epic.colorHex,
                            backgroundColor: `${epic.colorHex}12`,
                          }}
                        >
                          {epic.colorHex}
                        </span>
                      </div>
                      {epic.description && (
                        <p className="text-[11px] text-fog line-clamp-1 mt-0.5">
                          {epic.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(epic)}
                        className="p-1.5 rounded hover:bg-graphite text-fog hover:text-bone transition-colors"
                        title="Editar Épica"
                        aria-label="Editar Épica"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(epic)}
                        className="p-1.5 rounded hover:bg-coral-red/10 text-fog hover:text-coral-red transition-colors"
                        title="Eliminar Épica"
                        aria-label="Eliminar Épica"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="¿Eliminar Épica?"
        description={`¿Estás seguro de que deseas eliminar la Épica "${deleteTarget?.name}"? Las historias de usuario vinculadas permanecerán en el Product Backlog pero perderán la referencia a esta Épica.`}
        confirmLabel="Eliminar Épica"
        cancelLabel="Conservar"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
