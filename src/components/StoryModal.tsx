import React, { useEffect, useMemo, useState } from 'react';
import { Sparkles, Loader2, Plus, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { apiFetch } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { ConfirmDialog } from './UIHelpers';
import { Modal, Input, Textarea, Button, Badge } from './ui';
import type { AiGeneratedStory, Epic, StoryPriority, UserStory } from '../types/scrum';

interface StoryModalProps {
  open: boolean;
  projectId: number;
  epics?: Epic[];
  canUseAi: boolean;
  editingStory: UserStory | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

export function StoryModal({
  open,
  projectId,
  epics = [],
  canUseAi,
  editingStory,
  onClose,
  onSaved,
}: StoryModalProps) {
  const { showToast } = useToast();
  const shouldReduceMotion = useReducedMotion();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [criteria, setCriteria] = useState<string[]>(['']);
  const [newCriterionText, setNewCriterionText] = useState('');
  const [priority, setPriority] = useState<StoryPriority>('MEDIUM');
  const [storyPoints, setStoryPoints] = useState<string>('3');
  const [epicId, setEpicId] = useState<number | null>(null);

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
    setNewCriterionText('');
    if (editingStory) {
      setTitle(editingStory.title);
      setDescription(editingStory.description);
      setCriteria(
        editingStory.acceptanceCriteria.length > 0 ? [...editingStory.acceptanceCriteria] : ['']
      );
      setPriority(editingStory.priority);
      setStoryPoints(String(editingStory.storyPoints));
      setEpicId(editingStory.epicId ?? null);
    } else {
      setTitle('');
      setDescription('');
      setCriteria(['']);
      setPriority('MEDIUM');
      setStoryPoints('3');
      setEpicId(null);
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
        priority !== 'MEDIUM' ||
        epicId !== null
      );
    }
    const origCriteria = editingStory.acceptanceCriteria.join('\n');
    const currCriteria = criteria.map((c) => c.trim()).filter(Boolean).join('\n');
    return (
      title.trim() !== editingStory.title ||
      description.trim() !== editingStory.description ||
      currCriteria !== origCriteria ||
      priority !== editingStory.priority ||
      Number(storyPoints) !== editingStory.storyPoints ||
      epicId !== (editingStory.epicId ?? null)
    );
  }, [open, editingStory, title, description, criteria, priority, storyPoints, epicId]);

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
        ai: 'Ingresa al menos 5 caracteres en el título para asistir a la IA',
      }));
      return;
    }

    setFieldErrors((prev) => ({ ...prev, ai: undefined }));
    setAiGenerating(true);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);

    try {
      const res = await apiFetch<{
        draft: AiGeneratedStory & {
          suggestedStoryPoints?: number;
          suggestedPriority?: StoryPriority;
          recommendedEpicId?: number | null;
          improvements?: string[];
          dependencies?: string[];
        };
      }>('/api/v1/ai/generate-story', {
        method: 'POST',
        body: JSON.stringify({ prompt: seedText, projectId }),
        signal: controller.signal,
      });

      const {
        role,
        action,
        benefit,
        acceptanceCriteria,
        suggestedStoryPoints,
        suggestedPriority,
        recommendedEpicId,
      } = res.draft;
      setDescription(`Como ${role}, quiero ${action}, para ${benefit}.`);
      setCriteria(acceptanceCriteria.length > 0 ? acceptanceCriteria : ['']);
      if (suggestedStoryPoints !== undefined) setStoryPoints(String(suggestedStoryPoints));
      if (suggestedPriority) setPriority(suggestedPriority);
      if (recommendedEpicId !== undefined && recommendedEpicId !== null) setEpicId(recommendedEpicId);
      setAiHighlighted(true);
      showToast('Borrador completo generado con Agile Velocity AI. Revisa y ajusta antes de guardar.', 'info');
    } catch (err: any) {
      showToast(
        err?.message || 'El proveedor de IA no está configurado o no responde. Puedes continuar redactando manualmente.',
        'warning'
      );
    } finally {
      clearTimeout(timer);
      setAiGenerating(false);
    }
  };

  const handleAddCriterion = () => {
    const text = newCriterionText.trim();
    if (!text) return;
    setCriteria((prev) => [...prev.filter(Boolean), text]);
    setNewCriterionText('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: { title?: string; points?: string } = {};
    if (!title.trim()) errs.title = 'El título de la historia es obligatorio';
    const parsedPoints = Number(storyPoints);
    if (!Number.isInteger(parsedPoints) || parsedPoints < 0) {
      errs.points = 'Debe ser un número entero mayor o igual a 0';
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
        epicId: epicId || null,
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
      showToast('Historia de usuario guardada con éxito', 'success');
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
      <Modal
        open={open}
        onClose={attemptClose}
        title={editingStory ? `Editar historia · ${editingStory.code}` : 'Nueva historia de usuario'}
        description="Estructura el requerimiento según las buenas prácticas de Scrum con narrativa y criterios verificables."
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Section 1: Title + AI Assistant Button */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-[12px] font-medium text-mist">
                Título de la historia *
              </label>
              {canUseAi && (
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={handleAiAssist}
                  loading={aiGenerating}
                  icon={<Sparkles className="w-3.5 h-3.5 text-iris-violet" />}
                  className="bg-iris-violet/10 border-iris-violet/30 text-iris-violet hover:bg-iris-violet/20"
                >
                  {aiGenerating ? 'Generando borrador...' : 'Asistencia IA'}
                </Button>
              )}
            </div>
            <Input
              disabled={aiGenerating}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setFieldErrors((p) => ({ ...p, title: undefined, ai: undefined }));
              }}
              placeholder="Ej. Autenticación biométrica para banca móvil"
              error={fieldErrors.title || fieldErrors.ai}
            />
          </div>

          {/* Section 2: Narrative Description */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[12px] font-medium text-mist">
                Narrativa Scrum (Como [rol], quiero [acción], para [beneficio])
              </label>
              {aiHighlighted && (
                <Badge variant="purple" size="sm" dot>
                  Generado con IA
                </Badge>
              )}
            </div>
            <Textarea
              rows={3}
              disabled={aiGenerating}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Como usuario final, quiero autenticarme mediante mi huella dactilar, para ingresar de forma segura y rápida sin teclear contraseña."
              className={aiHighlighted ? 'border-iris-violet shadow-[0_0_0_1px_rgba(139,92,246,0.35)]' : undefined}
            />
          </div>

          {/* Section 3: Acceptance Criteria */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[12px] font-medium text-mist">
                Criterios de Aceptación ({criteria.filter((c) => c.trim()).length})
              </label>
              <span className="text-[11px] text-fog">Presiona Enter para agregar</span>
            </div>

            {/* Quick Add Criterion Input */}
            <div className="flex items-center gap-2">
              <Input
                value={newCriterionText}
                onChange={(e) => setNewCriterionText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCriterion();
                  }
                }}
                placeholder="Escribe un criterio verificable y presiona Enter..."
                className="flex-1"
              />
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={handleAddCriterion}
                disabled={!newCriterionText.trim()}
                icon={<Plus className="w-3.5 h-3.5" />}
              >
                Agregar
              </Button>
            </div>

            {/* Existing Criteria List */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {criteria.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 rounded-inputs bg-carbon border border-graphite text-[12px] group"
                >
                  <span className="font-mono text-[11px] text-fog w-5 text-center shrink-0">
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
                    className="flex-1 bg-transparent text-bone placeholder:text-ash focus:outline-none"
                  />
                  {criteria.length > 1 && (
                    <button
                      type="button"
                      disabled={aiGenerating}
                      onClick={() => setCriteria((prev) => prev.filter((_, i) => i !== idx))}
                      className="p-1 rounded text-fog hover:text-coral-red hover:bg-graphite transition-colors"
                      title="Eliminar criterio"
                      aria-label="Eliminar criterio"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Epics, Priority & Story Points */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* Epic Selector (RF3, HU #4) */}
            <div>
              <label htmlFor="story-epic-select" className="block text-[12px] font-medium text-mist mb-1.5">
                Épica Scrum
              </label>
              <select
                id="story-epic-select"
                value={epicId ?? ''}
                onChange={(e) => setEpicId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-2.5 py-1.5 bg-carbon border border-graphite rounded-inputs text-[12px] text-bone focus:outline-none focus:border-iris-violet shadow-subtle cursor-pointer h-[38px]"
              >
                <option value="" className="bg-carbon text-fog">
                  Sin Épica
                </option>
                {epics.map((ep) => (
                  <option key={ep.id} value={ep.id} className="bg-carbon text-bone">
                    {ep.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority Selector */}
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
                          : 'text-fog hover:text-paper hover:bg-graphite/40'
                      }`}
                    >
                      {labels[p]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Story Points */}
            <div>
              <label className="block text-[12px] font-medium text-mist mb-1.5">
                Story Points (Estimación Fibonacci)
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  step={1}
                  disabled={aiGenerating}
                  value={storyPoints}
                  onChange={(e) => {
                    setStoryPoints(e.target.value);
                    setFieldErrors((p) => ({ ...p, points: undefined }));
                  }}
                  className="w-20 text-center font-mono font-semibold text-iris-violet"
                />
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 5, 8, 13].map((pt) => (
                    <button
                      key={pt}
                      type="button"
                      disabled={aiGenerating}
                      onClick={() => setStoryPoints(String(pt))}
                      className={`px-2 py-1 rounded-inputs font-mono text-[11px] font-medium transition-colors ${
                        Number(storyPoints) === pt
                          ? 'bg-iris-violet/20 text-iris-violet border border-iris-violet/40 shadow-xs'
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

          {/* Modal Actions Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-graphite">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={attemptClose}
              disabled={aiGenerating || saving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={saving}
              disabled={aiGenerating}
            >
              Guardar historia
            </Button>
          </div>
        </form>
      </Modal>

      {/* Discard confirmation dialog when dirty */}
      <ConfirmDialog
        open={discardConfirmOpen}
        title="¿Descartar cambios no guardados?"
        description="Has realizado modificaciones en esta historia de usuario. Si sales ahora, los cambios no guardados se perderán."
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
