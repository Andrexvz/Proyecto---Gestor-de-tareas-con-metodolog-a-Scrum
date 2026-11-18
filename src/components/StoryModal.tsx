import React, { useEffect, useMemo, useState } from 'react';
import { Sparkles, Loader2, Plus, Trash2, X } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { ConfirmDialog } from './UIHelpers';
import type { AiGeneratedStory, StoryPriority, UserStory } from '../types/scrum';

interface StoryModalProps {
  open: boolean;
  projectId: number;
  canUseAi: boolean;
  editingStory: UserStory | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

export function StoryModal({
  open,
  projectId,
  canUseAi,
  editingStory,
  onClose,
  onSaved,
}: StoryModalProps) {
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [criteria, setCriteria] = useState<string[]>(['']);
  const [priority, setPriority] = useState<StoryPriority>('MEDIUM');
  const [storyPoints, setStoryPoints] = useState<string>('3');

  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiHighlighted, setAiHighlighted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ title?: string; points?: string; ai?: string }>({});
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFieldErrors({});
    setAiHighlighted(false);
    setDiscardConfirmOpen(false);
    if (editingStory) {
      setTitle(editingStory.title);
      setDescription(editingStory.description);
      setCriteria(
        editingStory.acceptanceCriteria.length > 0 ? [...editingStory.acceptanceCriteria] : ['']
      );
      setPriority(editingStory.priority);
      setStoryPoints(String(editingStory.storyPoints));
    } else {
      setTitle('');
      setDescription('');
      setCriteria(['']);
      setPriority('MEDIUM');
      setStoryPoints('3');
    }
  }, [open, editingStory]);

  const isDirty = useMemo(() => {
    if (!open) return false;
    if (!editingStory) {
      return (
        title.trim() !== '' ||
        description.trim() !== '' ||
        criteria.some((c) => c.trim() !== '') ||
        storyPoints !== '3' ||
        priority !== 'MEDIUM'
      );
    }
    const origCriteria = editingStory.acceptanceCriteria.join('\n');
    const currCriteria = criteria.map((c) => c.trim()).filter(Boolean).join('\n');
    return (
      title.trim() !== editingStory.title ||
      description.trim() !== editingStory.description ||
      currCriteria !== origCriteria ||
      priority !== editingStory.priority ||
      Number(storyPoints) !== editingStory.storyPoints
    );
  }, [open, editingStory, title, description, criteria, priority, storyPoints]);

  if (!open) return null;

  const attemptClose = () => {
    if (aiGenerating || saving) return;
    if (isDirty) {
      setDiscardConfirmOpen(true);
    } else {
      onClose();
    }
  };

  const handleAiAssist = async () => {
    const seedText = title.trim() || description.trim();
    if (seedText.length < 5) {
      setFieldErrors((prev) => ({
        ...prev,
        ai: 'Ingresa al menos 5 caracteres para asistir a la IA',
      }));
      return;
    }

    setFieldErrors((prev) => ({ ...prev, ai: undefined }));
    setAiGenerating(true);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await apiFetch<{ draft: AiGeneratedStory }>('/api/v1/ai/generate-story', {
        method: 'POST',
        body: JSON.stringify({ prompt: seedText, projectId }),
        signal: controller.signal,
      });

      const { role, action, benefit, acceptanceCriteria } = res.draft;
      setDescription(`Como ${role}, quiero ${action}, para ${benefit}.`);
      setCriteria(acceptanceCriteria.length > 0 ? acceptanceCriteria : ['']);
      setAiHighlighted(true);
      showToast('Borrador generado por Asistencia IA. Puedes editarlo antes de guardar.', 'info');
    } catch {
      showToast(
        'El asistente de IA no está disponible temporalmente. Puedes continuar escribiendo manualmente',
        'warning'
      );
    } finally {
      clearTimeout(timer);
      setAiGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: { title?: string; points?: string } = {};
    if (!title.trim()) errs.title = 'El título es obligatorio';
    const parsedPoints = Number(storyPoints);
    if (!Number.isInteger(parsedPoints) || parsedPoints < 0) {
      errs.points = 'Mínimo 0 puntos (entero)';
    }
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        acceptanceCriteria: criteria.map((c) => c.trim()).filter(Boolean),
        priority,
        storyPoints: parsedPoints,
      };
      if (editingStory) {
        await apiFetch(`/api/v1/stories/${editingStory.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch(`/api/v1/projects/${projectId}/stories`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      showToast('Historia de usuario guardada correctamente', 'success');
      await onSaved();
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'No se pudo guardar la historia', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-150"
        onClick={attemptClose}
      >
        <form
          onSubmit={handleSubmit}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl rounded-cards bg-obsidian border border-graphite p-6 shadow-xl space-y-5 my-auto"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-bone">
                {editingStory ? `Editar historia · ${editingStory.code}` : 'Nueva historia de usuario'}
              </h2>
              <p className="text-[12px] text-fog">
                Define el requerimiento funcional, criterios de aceptación y estimación.
              </p>
            </div>
            <button
              type="button"
              onClick={attemptClose}
              className="p-1.5 rounded-inputs text-fog hover:text-paper hover:bg-graphite"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Title + AI Assistant Trigger */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-[12px] font-medium text-mist">
                Título o idea inicial *
              </label>
              {canUseAi && (
                <button
                  type="button"
                  onClick={handleAiAssist}
                  disabled={aiGenerating || saving}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-buttons bg-lavender hover:bg-lavender/90 text-paper text-[12px] font-medium transition-all shadow-sm disabled:opacity-60 whitespace-nowrap"
                >
                  {aiGenerating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Generando historia...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Asistencia IA
                    </>
                  )}
                </button>
              )}
            </div>
            <input
              type="text"
              disabled={aiGenerating}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setFieldErrors((p) => ({ ...p, title: undefined, ai: undefined }));
              }}
              placeholder="Ej. Autenticación con huella digital para banca móvil"
              className="w-full px-3.5 py-2.5 bg-carbon border border-graphite rounded-inputs text-[13px] text-bone placeholder:text-ash focus:outline-none focus:border-iris-violet focus:ring-1 focus:ring-iris-violet disabled:opacity-60 shadow-subtle"
            />
            {fieldErrors.title && (
              <p className="text-[12px] text-coral-red">{fieldErrors.title}</p>
            )}
            {fieldErrors.ai && (
              <p className="text-[12px] text-coral-red">{fieldErrors.ai}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="block text-[12px] font-medium text-mist">
              Descripción (Como [rol], quiero [acción], para [beneficio])
            </label>
            <textarea
              rows={3}
              disabled={aiGenerating}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Como usuario móvil, quiero autenticarme mediante mi huella dactilar, para ingresar rápidamente sin escribir mi contraseña."
              className={`w-full px-3.5 py-2.5 bg-carbon rounded-inputs text-[13px] text-bone placeholder:text-ash focus:outline-none disabled:opacity-60 transition-shadow shadow-subtle ${
                aiHighlighted
                  ? 'border border-lavender shadow-[0_0_0_1px_rgba(139,92,246,0.35)]'
                  : 'border border-graphite focus:border-iris-violet focus:ring-1 focus:ring-iris-violet'
              }`}
            />
          </div>

          {/* Acceptance Criteria */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[12px] font-medium text-mist">
                Criterios de Aceptación
              </label>
              <button
                type="button"
                disabled={aiGenerating}
                onClick={() => setCriteria((prev) => [...prev, ''])}
                className="inline-flex items-center gap-1 text-[12px] text-signal-teal hover:text-paper"
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar criterio
              </button>
            </div>
            <div
              className={`space-y-2 p-3 rounded-inputs bg-carbon ${
                aiHighlighted
                  ? 'border border-lavender/70'
                  : 'border border-graphite'
              }`}
            >
              {criteria.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-ash w-5 text-right shrink-0">
                    {idx + 1}.
                  </span>
                  <input
                    type="text"
                    disabled={aiGenerating}
                    value={item}
                    onChange={(e) => {
                      const next = [...criteria];
                      next[idx] = e.target.value;
                      setCriteria(next);
                    }}
                    placeholder="Criterio verificable..."
                    className="flex-1 px-2.5 py-1.5 bg-obsidian border border-graphite rounded-inputs text-[12px] text-bone placeholder:text-ash focus:outline-none focus:border-iris-violet disabled:opacity-60"
                  />
                  {criteria.length > 1 && (
                    <button
                      type="button"
                      disabled={aiGenerating}
                      onClick={() => setCriteria((prev) => prev.filter((_, i) => i !== idx))}
                      className="p-1 text-fog hover:text-coral-red"
                      aria-label="Eliminar criterio"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Priority & Story Points */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-medium text-mist mb-1.5">
                Prioridad *
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-carbon border border-graphite rounded-inputs shadow-subtle">
                {(['HIGH', 'MEDIUM', 'LOW'] as StoryPriority[]).map((p) => {
                  const labels: Record<StoryPriority, string> = {
                    HIGH: 'Alta',
                    MEDIUM: 'Media',
                    LOW: 'Baja',
                  };
                  const active = priority === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      disabled={aiGenerating}
                      onClick={() => setPriority(p)}
                      className={`py-1.5 text-[12px] font-medium rounded-inputs transition-colors ${
                        active
                          ? 'bg-iris-violet text-paper shadow-sm'
                          : 'text-fog hover:text-paper'
                      }`}
                    >
                      {labels[p]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-mist mb-1.5">
                Story Points (≥ 0)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  step={1}
                  disabled={aiGenerating}
                  value={storyPoints}
                  onChange={(e) => {
                    setStoryPoints(e.target.value);
                    setFieldErrors((p) => ({ ...p, points: undefined }));
                  }}
                  className="w-24 px-3 py-2 bg-carbon border border-graphite rounded-inputs text-[13px] font-mono tabular-nums text-bone focus:outline-none focus:border-iris-violet shadow-subtle"
                />
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 5, 8, 13].map((pt) => (
                    <button
                      key={pt}
                      type="button"
                      disabled={aiGenerating}
                      onClick={() => setStoryPoints(String(pt))}
                      className={`px-2 py-1.5 rounded-inputs font-mono text-[11px] transition-colors ${
                        Number(storyPoints) === pt
                          ? 'bg-iris-violet/20 text-signal-teal border border-iris-violet/30 shadow-subtle'
                          : 'bg-carbon text-fog hover:text-paper border border-graphite'
                      }`}
                    >
                      {pt}
                    </button>
                  ))}
                </div>
              </div>
              {fieldErrors.points && (
                <p className="mt-1 text-[12px] text-coral-red">{fieldErrors.points}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-graphite">
            <button
              type="button"
              onClick={attemptClose}
              disabled={aiGenerating || saving}
              className="px-4 py-2 text-[13px] text-mist hover:text-paper rounded-buttons hover:bg-graphite transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={aiGenerating || saving}
              className="px-4 py-2 bg-iris-violet hover:bg-iris-violet/90 text-paper text-[13px] font-medium rounded-buttons transition-colors disabled:opacity-60 shadow-sm"
            >
              {saving ? 'Guardando...' : 'Guardar historia'}
            </button>
          </div>
        </form>
      </div>

      {/* Dirty Modal Guard (User Flow Edge Case) */}
      <ConfirmDialog
        open={discardConfirmOpen}
        title="Tienes cambios sin guardar"
        description="¿Deseas descartar los cambios realizados en esta historia de usuario?"
        confirmLabel="Descartar cambios"
        cancelLabel="Continuar editando"
        variant="danger"
        onConfirm={() => {
          setDiscardConfirmOpen(false);
          onClose();
        }}
        onCancel={() => setDiscardConfirmOpen(false)}
      />
    </>
  );
}
