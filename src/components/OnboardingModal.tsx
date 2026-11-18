import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Layers,
  Kanban,
  BarChart3,
  CalendarRange,
  ListTodo,
  Briefcase,
  Rocket,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  X,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Button } from './ui';
import type { User } from '../types/scrum';

interface OnboardingModalProps {
  open: boolean;
  user: User | null;
  onClose: () => void;
}

interface StepData {
  title: string;
  subtitle: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  summary: string;
  points: string[];
  tip?: string;
}

const ONBOARDING_STEPS: StepData[] = [
  {
    title: 'Bienvenido a Agile Velocity',
    subtitle: 'Gestión de proyectos ágil con metodología Scrum',
    badge: 'Paso 1 · Introducción',
    icon: Rocket,
    color: 'text-iris-violet bg-iris-violet/15 border-iris-violet/30',
    summary:
      'Agile Velocity está diseñada para acelerar la entrega de valor mediante Scrum riguroso, trazabilidad completa y una interfaz intuitiva con estética Premium Dark.',
    points: [
      'Ciclos iterativos e incrementales para responder rápidamente al cambio.',
      'Roles claros: Scrum Master, Product Owner, Desarrolladores y Administradores.',
      'Control total de proyectos, historias, sprints y tareas desde una sola plataforma.',
    ],
    tip: 'Puedes abrir esta guía en cualquier momento desde el botón de ayuda en la barra superior.',
  },
  {
    title: 'Espacios de Trabajo y Proyectos',
    subtitle: 'Estructuración modular de iniciativas y equipos',
    badge: 'Paso 2 · Proyectos',
    icon: Briefcase,
    color: 'text-signal-teal bg-signal-teal/15 border-signal-teal/30',
    summary:
      'Cada proyecto cuenta con su propio código mnemotécnico (ej. AV, CRM), equipo asignado con roles RBAC y configuración independiente.',
    points: [
      'Crea nuevos proyectos y define su descripción, estado y miembros autorizados.',
      'Los administradores tienen control total sobre los proyectos de la organización.',
      'Navega rápidamente entre proyectos usando el selector de la barra superior o Ctrl+K.',
    ],
    tip: 'Usa la paleta de comandos (Ctrl+K) para cambiar de proyecto en un segundo.',
  },
  {
    title: 'Product Backlog y Priorización',
    subtitle: 'El inventario vivo de valor de tu producto',
    badge: 'Paso 3 · Backlog',
    icon: ListTodo,
    color: 'text-lavender bg-lavender/15 border-lavender/30',
    summary:
      'El Backlog almacena todos los requisitos y mejoras del producto. Es administrado y priorizado continuamente por el Product Owner.',
    points: [
      'Clasifica historias con el esquema MoSCoW: Must Have, Should Have, Could Have y Won’t Have.',
      'Filtra en tiempo real por prioridad, estado de asignación o texto de búsqueda.',
      'Distingue qué historias están listas para el siguiente Sprint y cuáles ya están en ejecución.',
    ],
    tip: 'Prioriza primero las historias «Must Have» para asegurar el producto mínimo viable (MVP).',
  },
  {
    title: 'Historias de Usuario y Asistencia IA',
    subtitle: 'Requisitos centrados en el valor para el usuario final',
    badge: 'Paso 4 · Historias',
    icon: Sparkles,
    color: 'text-lavender bg-iris-violet/20 border-iris-violet/40',
    summary:
      'Las historias de usuario siguen la estructura canónica ágil y cuentan con asistencia de inteligencia artificial para enriquecer su redacción.',
    points: [
      'Estructura estándar: «Como [rol], quiero [acción] para [beneficio esperado]».',
      'Criterios de aceptación verificables en formato lista numerada.',
      'El asistente IA genera borradores completos que puedes revisar y editar antes de guardar.',
    ],
    tip: 'La IA sugiere criterios de aceptación, pero el equipo siempre tiene la decisión final.',
  },
  {
    title: 'Story Points y Estimación Relativa',
    subtitle: 'Mide la complejidad y esfuerzo relativo, no horas',
    badge: 'Paso 5 · Estimación',
    icon: Layers,
    color: 'text-amber-alert bg-amber-alert/15 border-amber-alert/30',
    summary:
      'La metodología Scrum utiliza Story Points para estimar el tamaño del trabajo en lugar de estimaciones rígidas en tiempo.',
    points: [
      'Escala canónica de Fibonacci: 1, 2, 3, 5, 8, 13 y 21 puntos.',
      'La estimación es acordada por el equipo de desarrollo durante el refinamiento.',
      'Historias con 13 o 21 puntos deben dividirse en historias más pequeñas y manejables.',
    ],
    tip: 'Un Story Point refleja incertidumbre, complejidad y esfuerzo en comparación con una historia base.',
  },
  {
    title: 'Planificación de Sprints',
    subtitle: 'Iteraciones temporales con un objetivo claro',
    badge: 'Paso 6 · Sprints',
    icon: CalendarRange,
    color: 'text-pulse-green bg-pulse-green/15 border-pulse-green/30',
    summary:
      'Un Sprint es un contenedor temporal (típicamente 1 a 4 semanas) donde el equipo se compromete a entregar un incremento de producto potencialmente desplegable.',
    points: [
      'Define el Sprint Goal: el propósito fundamental que guía todas las decisiones del Sprint.',
      'Regla Scrum estricta: sólo puede haber un Sprint activo simultáneamente por proyecto.',
      'Planifica historias desde el Backlog viendo la suma acumulada de Story Points.',
    ],
    tip: 'Al finalizar un Sprint, ciérralo formalmente para alimentar las métricas históricas de velocidad.',
  },
  {
    title: 'Tablero Kanban Interactivo',
    subtitle: 'Flujo visual y arrastre Drag & Drop en tiempo real',
    badge: 'Paso 7 · Kanban',
    icon: Kanban,
    color: 'text-signal-teal bg-signal-teal/15 border-signal-teal/30',
    summary:
      'El tablero Kanban visualiza el progreso diario de las tareas del Sprint activo en cuatro columnas estándar de flujo de trabajo.',
    points: [
      '4 columnas canónicas: Por Hacer, En Progreso, En Revisión y Hecho.',
      'Arrastra y suelta tareas fluidamente entre columnas para actualizar su estado al instante.',
      'Sincronización automática: cuando todas las tareas de una historia se completan, la historia pasa a «Hecho».',
    ],
    tip: 'Mantén pocas tareas en «En Progreso» para respetar el principio WIP (Work In Progress).',
  },
  {
    title: 'Métricas y Velocidad del Equipo',
    subtitle: 'Mejora continua fundamentada en datos transparentes',
    badge: 'Paso 8 · Métricas',
    icon: BarChart3,
    color: 'text-iris-violet bg-iris-violet/15 border-iris-violet/30',
    summary:
      'Evalúa el rendimiento histórico de tu equipo con gráficos analíticos de velocidad y distribución de tareas.',
    points: [
      'Gráfico de velocidad: compara los Story Points comprometidos vs completados por Sprint.',
      'Tasa de efectividad porcentual para proyectar la capacidad de futuros Sprints con precisión.',
      'Distribución de estados y análisis de tendencia burndown para la retrospectiva del equipo.',
    ],
    tip: 'Usa estas métricas en la Sprint Retrospective para identificar mejoras en el proceso.',
  },
];

export function OnboardingModal({ open, user, onClose }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  // Reset to step 0 when reopened
  useEffect(() => {
    if (open) {
      setCurrentStep(0);
    }
  }, [open]);

  const step = ONBOARDING_STEPS[currentStep];
  const StepIcon = step.icon;
  const isFirst = currentStep === 0;
  const isLast = currentStep === ONBOARDING_STEPS.length - 1;

  const markCompleted = () => {
    if (user?.id) {
      try {
        localStorage.setItem(`agile_velocity_onboarding_completed_${user.id}`, 'true');
      } catch {
        // storage disabled
      }
    }
    onClose();
  };

  const handleNext = () => {
    if (isLast) {
      markCompleted();
    } else {
      setCurrentStep((prev) => Math.min(prev + 1, ONBOARDING_STEPS.length - 1));
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-modal-title"
    >
      <motion.div
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 }}
        animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
        exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="relative w-full max-w-xl bg-carbon border border-graphite rounded-cards shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header with Progress Bar */}
        <div className="p-5 pb-3 border-b border-graphite">
          <div className="flex items-center justify-between gap-3 mb-3">
            <span className="px-2 py-0.5 rounded-pills bg-obsidian border border-graphite text-[11px] font-mono text-lavender">
              {step.badge}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-fog font-medium">
                Paso {currentStep + 1} de {ONBOARDING_STEPS.length}
              </span>
              <button
                type="button"
                onClick={markCompleted}
                className="p-1 rounded-inputs text-fog hover:text-paper hover:bg-obsidian transition-colors"
                aria-label="Cerrar tutorial"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Progress bar line */}
          <div className="w-full h-1 bg-obsidian rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-iris-violet to-lavender"
              initial={false}
              animate={{
                width: `${((currentStep + 1) / ONBOARDING_STEPS.length) * 100}%`,
              }}
              transition={{ duration: 0.25 }}
            />
          </div>
        </div>

        {/* Content Body with Step Animation */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: 14 }}
              animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -14 }}
              transition={{ duration: 0.18 }}
              className="space-y-4"
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-11 h-11 rounded-inputs border flex items-center justify-center shrink-0 shadow-subtle ${step.color}`}
                >
                  <StepIcon className="w-6 h-6" />
                </div>
                <div>
                  <h2
                    id="onboarding-modal-title"
                    className="text-lg font-bold text-bone tracking-tight font-display"
                  >
                    {step.title}
                  </h2>
                  <p className="text-[13px] text-fog mt-0.5">{step.subtitle}</p>
                </div>
              </div>

              <p className="text-[13px] text-mist leading-relaxed bg-obsidian/70 p-3.5 rounded-inputs border border-graphite/80">
                {step.summary}
              </p>

              <div className="space-y-2 pt-1">
                <h4 className="text-[12px] font-semibold text-bone uppercase tracking-wider">
                  Conceptos Clave
                </h4>
                <div className="space-y-2">
                  {step.points.map((pt, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-[12px] text-mist">
                      <CheckCircle2 className="w-4 h-4 text-signal-teal shrink-0 mt-0.5" />
                      <span className="leading-snug">{pt}</span>
                    </div>
                  ))}
                </div>
              </div>

              {step.tip && (
                <div className="p-3 rounded-inputs bg-iris-violet/10 border border-iris-violet/25 text-[12px] text-lavender flex items-start gap-2">
                  <span className="font-semibold text-paper shrink-0">Consejo ágil:</span>
                  <span className="leading-snug">{step.tip}</span>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        <div className="p-4 px-6 border-t border-graphite bg-obsidian/50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={markCompleted}
            className="text-[12px] text-fog hover:text-mist transition-colors underline-offset-2 hover:underline focus:outline-none"
          >
            Omitir tutorial
          </button>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePrev}
              disabled={isFirst}
              icon={<ChevronLeft className="w-4 h-4" />}
            >
              Anterior
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleNext}
              rightIcon={!isLast ? <ChevronRight className="w-4 h-4" /> : undefined}
            >
              {isLast ? '¡Empezar ahora!' : 'Siguiente'}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
