import React, { useMemo, useState } from 'react';
import {
  Plus,
  Play,
  CheckSquare,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Kanban,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Target,
  Sparkles,
  Layers,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { apiFetch } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { PrioritySignal, SprintStatusText } from './UIHelpers';
import {
  Button,
  Input,
  Textarea,
  Modal,
  Badge,
  EmptyState,
} from './ui';
import type { ProjectSummary, Sprint, SprintCloseSummary, UserStory } from '../types/scrum';

interface SprintsViewProps {
  project: ProjectSummary;
  sprints: Sprint[];
  stories: UserStory[];
  onGoToKanban: () => void;
  onRefresh: () => Promise<void>;
}

export function SprintsView({
  project,
  sprints,
  stories,
  onGoToKanban,
  onRefresh,
}: SprintsViewProps) {
  const { showToast } = useToast();
  const shouldReduceMotion = useReducedMotion();

  const canManageSprints =
    project.myRole === 'ADMIN' ||
    project.myRole === 'SCRUM_MASTER' ||
    project.myRole === 'PRODUCT_OWNER';

  const activeSprint = sprints.find((s) => s.status === 'ACTIVE') ?? null;

  // Default target sprint for moving backlog items
  const defaultTargetId =
    sprints.find((s) => s.status === 'PLANNING')?.id ?? activeSprint?.id ?? null;
  const [selectedTargetSprintId, setSelectedTargetSprintId] = useState<number | null>(
    defaultTargetId
  );

  // Expanded sprints state for accordion
  const [expandedSprintIds, setExpandedSprintIds] = useState<Record<number, boolean>>(() => {
    const init: Record<number, boolean> = {};
    for (const s of sprints) {
      if (s.status === 'ACTIVE' || s.status === 'PLANNING') {
        init[s.id] = true;
      }
    }
    return init;
  });

  const toggleSprintExpanded = (id: number) => {
    setExpandedSprintIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Create Sprint modal
  const [createOpen, setCreateOpen] = useState(false);
  const [sprintName, setSprintName] = useState('');
  const [sprintGoal, setSprintGoal] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
  const [creating, setCreating] = useState(false);
  const [dateError, setDateError] = useState('');

  // Close Sprint confirmation + result summary
  const [closeModalSprint, setCloseModalSprint] = useState<Sprint | null>(null);
  const [closing, setClosing] = useState(false);
  const [closeSummary, setCloseSummary] = useState<SprintCloseSummary | null>(null);

  const backlogStories = useMemo(
    () => stories.filter((s) => s.sprintId === null),
    [stories]
  );

  const effectiveTargetId =
    selectedTargetSprintId &&
    sprints.some((s) => s.id === selectedTargetSprintId && s.status !== 'CLOSED')
      ? selectedTargetSprintId
      : sprints.find((s) => s.status === 'PLANNING')?.id ?? activeSprint?.id ?? null;

  const handleCreateSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    setDateError('');
    if (new Date(endDate) <= new Date(startDate)) {
      setDateError('La fecha de finalización debe ser estrictamente posterior a la de inicio');
      return;
    }
    setCreating(true);
    try {
      const res = await apiFetch<{ sprint: Sprint }>(`/api/v1/projects/${project.id}/sprints`, {
        method: 'POST',
        body: JSON.stringify({
          name: sprintName.trim(),
          goal: sprintGoal.trim(),
          startDate,
          endDate,
        }),
      });
      showToast('Sprint creado en estado Planificación', 'success');
      setCreateOpen(false);
      setSprintName('');
      setSprintGoal('');
      setSelectedTargetSprintId(res.sprint.id);
      setExpandedSprintIds((prev) => ({ ...prev, [res.sprint.id]: true }));
      await onRefresh();
    } catch (err: any) {
      showToast(err?.message || 'Error al crear Sprint', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleMoveStory = async (storyId: number, targetSprintId: number | null) => {
    try {
      await apiFetch(`/api/v1/stories/${storyId}/sprint`, {
        method: 'PATCH',
        body: JSON.stringify({ sprintId: targetSprintId }),
      });
      showToast(
        targetSprintId
          ? 'Historia asignada al Sprint'
          : 'Historia devuelta al Product Backlog',
        'success'
      );
      await onRefresh();
    } catch (err: any) {
      showToast(err?.message || 'No se pudo mover la historia', 'error');
    }
  };

  const handleStartSprint = async (sprintId: number) => {
    try {
      await apiFetch(`/api/v1/sprints/${sprintId}/start`, { method: 'POST' });
      showToast('Sprint iniciado exitosamente', 'success');
      await onRefresh();
    } catch (err: any) {
      showToast(err?.message || 'No se pudo iniciar el Sprint', 'error');
    }
  };

  const handleConfirmCloseSprint = async () => {
    if (!closeModalSprint) return;
    setClosing(true);
    try {
      const res = await apiFetch<{ summary: SprintCloseSummary }>(
        `/api/v1/sprints/${closeModalSprint.id}/close`,
        { method: 'POST' }
      );
      showToast('Sprint finalizado correctamente', 'success');
      setCloseModalSprint(null);
      setCloseSummary(res.summary);
      await onRefresh();
    } catch (err: any) {
      showToast(err?.message || 'Error al cerrar el Sprint', 'error');
    } finally {
      setClosing(false);
    }
  };

  const closeModalStats = useMemo(() => {
    if (!closeModalSprint) return { completed: [], incomplete: [] };
    const spStories = stories.filter((s) => s.sprintId === closeModalSprint.id);
    return {
      completed: spStories.filter((s) => s.isCompleted),
      incomplete: spStories.filter((s) => !s.isCompleted),
    };
  }, [closeModalSprint, stories]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl font-semibold text-bone tracking-tight">
              Planificación y Gestión de Sprints
            </h1>
            <Badge variant="purple" shape="pill">
              {project.code}
            </Badge>
          </div>
          <p className="mt-1 text-[13px] text-fog leading-relaxed">
            {project.name} · Estructura iteraciones temporales, asigna historias del Product Backlog y finaliza Sprints con consolidación de métricas.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {activeSprint && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onGoToKanban}
              icon={<Kanban className="w-3.5 h-3.5 text-signal-teal" />}
            >
              Ir a Kanban
            </Button>
          )}
          {canManageSprints && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setCreateOpen(true)}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              Crear Sprint
            </Button>
          )}
        </div>
      </div>

      {/* Sprint Closure Summary Banner (Step 6 User Flow) */}
      {closeSummary && (
        <motion.div
          initial={shouldReduceMotion ? {} : { opacity: 0, y: -10 }}
          animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
          className="rounded-cards bg-carbon border border-pulse-green/40 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 bottom-0 w-1 bg-pulse-green" />
          <div className="flex items-start gap-3 pl-1">
            <div className="p-2 rounded-md bg-pulse-green/10 text-pulse-green mt-0.5">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-[15px] font-semibold text-bone">
                Resumen de cierre consolidado · {closeSummary.sprintName}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-mist">
                <span>
                  Historias completadas:{' '}
                  <strong className="font-mono text-pulse-green">
                    {closeSummary.completedStoriesCount}
                  </strong>
                </span>
                <span>·</span>
                <span>
                  Devueltas al Backlog:{' '}
                  <strong className="font-mono text-amber-400">
                    {closeSummary.returnedStoriesCount}
                  </strong>
                </span>
                <span>·</span>
                <span>
                  Story Points entregados:{' '}
                  <strong className="font-mono text-pulse-green">
                    {closeSummary.deliveredPoints} / {closeSummary.plannedPoints} pts
                  </strong>
                </span>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setCloseSummary(null)}
          >
            Ocultar resumen
          </Button>
        </motion.div>
      )}

      {/* Dual Pane Planning Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Pane: Product Backlog Pool */}
        <section className="lg:col-span-5 rounded-cards bg-carbon border border-graphite overflow-hidden shadow-subtle">
          <div className="px-4 py-3.5 border-b border-graphite flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[14px] font-semibold text-bone">Product Backlog</h2>
                <Badge variant="default" size="sm">
                  {backlogStories.length}
                </Badge>
              </div>
              <p className="text-[11px] text-fog mt-0.5">
                Historias sin asignar listas para planificar
              </p>
            </div>

            {canManageSprints && sprints.some((s) => s.status !== 'CLOSED') && (
              <select
                value={effectiveTargetId ?? ''}
                onChange={(e) => setSelectedTargetSprintId(Number(e.target.value))}
                aria-label="Sprint destino para asignación"
                className="px-2.5 py-1.5 bg-obsidian border border-graphite rounded-inputs text-[12px] text-mist focus:outline-none focus:border-iris-violet max-w-[190px] shadow-subtle cursor-pointer truncate"
              >
                {sprints
                  .filter((s) => s.status !== 'CLOSED')
                  .map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.status === 'ACTIVE' ? '⚡ ' : '📋 '}
                      {sp.name}
                    </option>
                  ))}
              </select>
            )}
          </div>

          <div className="divide-y divide-graphite/60 max-h-[620px] overflow-y-auto">
            {backlogStories.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <EmptyState
                  compact
                  icon={<Layers className="w-5 h-5" />}
                  title="No hay historias pendientes"
                  description="Todas las historias han sido asignadas a Sprints de trabajo."
                />
              </div>
            ) : (
              backlogStories.map((story) => (
                <div
                  key={story.id}
                  className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-obsidian/40 transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="font-mono text-signal-teal font-semibold">
                        {story.code}
                      </span>
                      <span className="text-ash" aria-hidden="true">
                        ·
                      </span>
                      <PrioritySignal priority={story.priority} />
                      <span className="text-ash" aria-hidden="true">
                        ·
                      </span>
                      <span className="font-mono tabular-nums text-iris-violet font-semibold">
                        {story.storyPoints} pts
                      </span>
                    </div>
                    <p className="mt-1 text-[13px] font-medium text-bone truncate group-hover:text-paper">
                      {story.title}
                    </p>
                  </div>

                  {canManageSprints && effectiveTargetId && (
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => handleMoveStory(story.id, effectiveTargetId)}
                      icon={<ArrowRight className="w-3 h-3" />}
                      title="Mover al Sprint seleccionado"
                      className="shrink-0"
                    >
                      Asignar
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* Right Pane: Sprints Lifecycle List */}
        <section className="lg:col-span-7 space-y-4">
          {sprints.length === 0 ? (
            <EmptyState
              icon={<Calendar className="w-6 h-6" />}
              title="Aún no hay Sprints creados"
              description="Crea tu primer Sprint para comenzar la planificación de la iteración y asignar historias."
              action={
                canManageSprints ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setCreateOpen(true)}
                    icon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Crear primer Sprint
                  </Button>
                ) : undefined
              }
            />
          ) : (
            [...sprints]
              .sort((a, b) => {
                const order = { ACTIVE: 0, PLANNING: 1, CLOSED: 2 };
                return order[a.status] - order[b.status];
              })
              .map((sprint, index) => {
                const sprintStories = stories.filter((s) => s.sprintId === sprint.id);
                const completedStoriesCount = sprintStories.filter((s) => s.isCompleted).length;
                const totalPts = sprintStories.reduce((acc, s) => acc + (s.storyPoints || 0), 0);
                const completedPts = sprintStories
                  .filter((s) => s.isCompleted)
                  .reduce((acc, s) => acc + (s.storyPoints || 0), 0);
                const progressPct =
                  totalPts > 0 ? Math.round((completedPts / totalPts) * 100) : 0;

                const anotherActiveExists = Boolean(
                  activeSprint && activeSprint.id !== sprint.id
                );
                const isExpanded = Boolean(expandedSprintIds[sprint.id]);

                const cardBorder =
                  sprint.status === 'ACTIVE'
                    ? 'border-pulse-green/40 shadow-lg ring-1 ring-pulse-green/20'
                    : sprint.status === 'PLANNING'
                    ? 'border-iris-violet/30'
                    : 'border-graphite opacity-85';

                return (
                  <motion.div
                    key={sprint.id}
                    initial={shouldReduceMotion ? {} : { opacity: 0, y: 12 }}
                    animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, delay: Math.min(index * 0.05, 0.25) }}
                    className={`rounded-cards bg-carbon border ${cardBorder} overflow-hidden shadow-subtle transition-all`}
                  >
                    {/* Sprint Header */}
                    <div className="p-4 sm:p-5 border-b border-graphite flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => toggleSprintExpanded(sprint.id)}
                            className="flex items-center gap-1.5 text-left group"
                          >
                            <h3 className="font-display text-[16px] font-semibold text-bone group-hover:text-paper transition-colors">
                              {sprint.name}
                            </h3>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-fog group-hover:text-paper" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-fog group-hover:text-paper" />
                            )}
                          </button>
                          <SprintStatusText status={sprint.status} />
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-[12px] text-fog">
                          <span className="inline-flex items-center gap-1.5 font-mono tabular-nums text-mist">
                            <Calendar className="w-3.5 h-3.5 text-fog" />
                            {sprint.startDate} → {sprint.endDate}
                          </span>
                          <span className="text-ash" aria-hidden="true">
                            ·
                          </span>
                          <span className="font-mono tabular-nums">
                            {sprintStories.length} historias ({completedStoriesCount} listas)
                          </span>
                          <span className="text-ash" aria-hidden="true">
                            ·
                          </span>
                          <span className="font-mono tabular-nums font-semibold text-iris-violet">
                            {completedPts}/{totalPts} pts ({progressPct}%)
                          </span>
                        </div>

                        {sprint.goal && (
                          <div className="flex items-center gap-1.5 pt-0.5 text-[12px] text-mist">
                            <Target className="w-3.5 h-3.5 text-signal-teal shrink-0" />
                            <span className="truncate">{sprint.goal}</span>
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      {canManageSprints && (
                        <div className="flex items-center gap-2 shrink-0">
                          {sprint.status === 'PLANNING' && (
                            <Button
                              variant="primary"
                              size="xs"
                              disabled={anotherActiveExists}
                              onClick={() => handleStartSprint(sprint.id)}
                              title={
                                anotherActiveExists
                                  ? 'Ya existe un Sprint activo en el proyecto. Debes cerrarlo antes de iniciar otro.'
                                  : 'Iniciar este Sprint'
                              }
                              icon={<Play className="w-3.5 h-3.5" />}
                            >
                              Iniciar Sprint
                            </Button>
                          )}
                          {sprint.status === 'ACTIVE' && (
                            <>
                              <Button
                                variant="outline"
                                size="xs"
                                onClick={onGoToKanban}
                                icon={<Kanban className="w-3.5 h-3.5 text-signal-teal" />}
                              >
                                Tablero Kanban
                              </Button>
                              <Button
                                variant="primary"
                                size="xs"
                                onClick={() => setCloseModalSprint(sprint)}
                                icon={<CheckSquare className="w-3.5 h-3.5" />}
                                className="bg-pulse-green hover:bg-pulse-green/90 text-void font-semibold"
                              >
                                Finalizar Sprint
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="h-1.5 w-full bg-obsidian overflow-hidden">
                      <motion.div
                        initial={shouldReduceMotion ? false : { width: 0 }}
                        animate={{ width: `${progressPct}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className={`h-full rounded-pills ${
                          sprint.status === 'ACTIVE'
                            ? 'bg-pulse-green'
                            : sprint.status === 'CLOSED'
                            ? 'bg-graphite'
                            : 'bg-iris-violet'
                        }`}
                      />
                    </div>

                    {/* Stories inside Sprint (Accordion) */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={shouldReduceMotion ? {} : { opacity: 0, height: 0 }}
                          animate={shouldReduceMotion ? {} : { opacity: 1, height: 'auto' }}
                          exit={shouldReduceMotion ? {} : { opacity: 0, height: 0 }}
                          transition={{ duration: 0.18, ease: 'easeOut' }}
                          className="divide-y divide-graphite/40 bg-obsidian/40 border-t border-graphite"
                        >
                          {sprintStories.length === 0 ? (
                            <p className="py-6 px-4 text-center text-[12px] text-fog">
                              Sprint Backlog vacío. Asigna historias desde el panel del Product Backlog.
                            </p>
                          ) : (
                            sprintStories.map((story) => (
                              <div
                                key={story.id}
                                className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-carbon/40 transition-colors"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className="font-mono text-[11px] font-semibold text-signal-teal shrink-0">
                                    {story.code}
                                  </span>
                                  <span className="text-[13px] text-bone truncate">
                                    {story.title}
                                  </span>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                  <PrioritySignal priority={story.priority} />
                                  <span className="font-mono tabular-nums text-[12px] text-fog">
                                    {story.storyPoints} pts
                                  </span>
                                  {story.isCompleted && (
                                    <Badge variant="success" size="sm" dot>
                                      Lista
                                    </Badge>
                                  )}
                                  {canManageSprints && sprint.status !== 'CLOSED' && (
                                    <button
                                      type="button"
                                      onClick={() => handleMoveStory(story.id, null)}
                                      title="Devolver al Product Backlog"
                                      aria-label="Devolver historia al Product Backlog"
                                      className="p-1 rounded-inputs hover:bg-graphite text-fog hover:text-paper transition-colors"
                                    >
                                      <ArrowLeft className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })
          )}
        </section>
      </div>

      {/* Create Sprint Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Crear nuevo Sprint"
        description="Define el nombre de la iteración, objetivo funcional y fechas límite."
        size="md"
      >
        <form onSubmit={handleCreateSprint} className="space-y-4">
          <Input
            label="Nombre del Sprint"
            required
            value={sprintName}
            onChange={(e) => setSprintName(e.target.value)}
            placeholder="Ej. Sprint 3 — Flujo de Autenticación"
          />
          <Textarea
            label="Objetivo del Sprint (Goal)"
            rows={2}
            value={sprintGoal}
            onChange={(e) => setSprintGoal(e.target.value)}
            placeholder="Meta de negocio principal de esta iteración..."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Fecha de inicio"
              type="date"
              required
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setDateError('');
              }}
            />
            <Input
              label="Fecha de finalización"
              type="date"
              required
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setDateError('');
              }}
              error={dateError}
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-graphite">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCreateOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={creating}
            >
              Crear Sprint
            </Button>
          </div>
        </form>
      </Modal>

      {/* Transactional Close Sprint Confirmation Modal */}
      {closeModalSprint && (
        <Modal
          open={Boolean(closeModalSprint)}
          onClose={() => setCloseModalSprint(null)}
          title={`Finalizar ${closeModalSprint.name}`}
          description="Al cerrar el Sprint, se consolidarán las métricas y los Story Points logrados."
          size="md"
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-inputs bg-carbon border border-graphite flex items-center justify-between text-[13px]">
              <span>
                Historias completadas:{' '}
                <strong className="font-mono text-pulse-green">
                  {closeModalStats.completed.length}
                </strong>
              </span>
              <span>
                Historias incompletas:{' '}
                <strong className="font-mono text-amber-400">
                  {closeModalStats.incomplete.length}
                </strong>
              </span>
            </div>

            {closeModalStats.incomplete.length > 0 ? (
              <div className="p-3.5 rounded-inputs bg-amber-400/10 border border-amber-400/30 space-y-2">
                <div className="flex items-start gap-2 text-[13px] text-amber-300">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <p>
                    Este Sprint tiene historias de usuario incompletas. De acuerdo con Scrum, estas historias regresarán automáticamente al Product Backlog para ser repriorizadas.
                  </p>
                </div>
                <ul className="pl-6 list-disc text-[12px] text-mist space-y-0.5">
                  {closeModalStats.incomplete.map((st) => (
                    <li key={st.id}>
                      <span className="font-mono text-signal-teal">{st.code}</span> · {st.title}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="p-3.5 rounded-inputs bg-pulse-green/10 border border-pulse-green/30 text-[13px] text-pulse-green flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>
                  Todas las historias del Sprint tienen el 100% de sus tareas en Done. ¡Excelente entrega!
                </span>
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-2 border-t border-graphite">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCloseModalSprint(null)}
                disabled={closing}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                loading={closing}
                onClick={handleConfirmCloseSprint}
                className="bg-pulse-green hover:bg-pulse-green/90 text-void font-semibold"
              >
                Confirmar cierre
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
