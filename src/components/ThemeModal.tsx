import React from 'react';
import { Moon, Sun, Laptop, Zap, EyeOff, Check, Palette } from 'lucide-react';
import { Modal, Button } from './ui';
import { useTheme, type ThemePreference, type MotionPreference } from '../context/ThemeContext';

interface ThemeModalProps {
  open: boolean;
  onClose: () => void;
}

export function ThemeModal({ open, onClose }: ThemeModalProps) {
  const { theme, setTheme, reducedMotion, setReducedMotion, effectiveTheme, isReducedMotion } =
    useTheme();

  const themeOptions: Array<{
    id: ThemePreference;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }> = [
    {
      id: 'dark',
      label: 'Modo Oscuro',
      description: 'Paleta Premium Dark Dashboard con acentos violetas e iris.',
      icon: Moon,
      badge: 'Recomendado',
    },
    {
      id: 'light',
      label: 'Modo Claro',
      description: 'Superficies claras de alto contraste para trabajo con luz diurna.',
      icon: Sun,
    },
    {
      id: 'system',
      label: 'Automático (Sistema)',
      description: 'Se adapta a la preferencia establecida en tu sistema operativo.',
      icon: Laptop,
    },
  ];

  const motionOptions: Array<{
    id: MotionPreference;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      id: 'normal',
      label: 'Animaciones completas',
      description: 'Transiciones fluidas con Motion, elevaciones y microinteracciones.',
      icon: Zap,
    },
    {
      id: 'reduced',
      label: 'Movimiento reducido',
      description: 'Minimiza animaciones y desplazamientos continuos (WCAG 2.2).',
      icon: EyeOff,
    },
    {
      id: 'system',
      label: 'Preferencia del sistema',
      description: 'Sincronizado con prefers-reduced-motion de tu sistema operativo.',
      icon: Laptop,
    },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-inputs bg-iris-violet/15 border border-iris-violet/30 flex items-center justify-center text-lavender">
            <Palette className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-bone">Personalización y Apariencia</h3>
            <p className="text-[12px] text-fog font-normal">
              Ajusta el tema visual y la accesibilidad de movimiento
            </p>
          </div>
        </div>
      }
      footer={
        <div className="flex justify-end gap-2 w-full">
          <Button variant="primary" onClick={onClose} className="px-5">
            Guardar y cerrar
          </Button>
        </div>
      }
    >
      <div className="space-y-6 py-2">
        {/* Color Theme Selector */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-[13px] font-semibold text-bone">Tema de Color</label>
            <span className="text-[11px] font-mono text-signal-teal">
              Activo: {effectiveTheme === 'dark' ? 'Oscuro' : 'Claro'}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {themeOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = theme === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTheme(opt.id)}
                  className={`w-full flex items-start gap-3 p-3 text-left rounded-cards border transition-all ${
                    isSelected
                      ? 'bg-iris-violet/10 border-iris-violet text-bone ring-1 ring-iris-violet/30'
                      : 'bg-obsidian hover:bg-graphite/40 border-graphite text-mist hover:text-bone'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-inputs flex items-center justify-center shrink-0 mt-0.5 ${
                      isSelected
                        ? 'bg-iris-violet text-paper'
                        : 'bg-carbon text-fog border border-graphite'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-bone">{opt.label}</span>
                      {opt.badge && (
                        <span className="px-1.5 py-0.5 rounded-pills bg-iris-violet/20 border border-iris-violet/40 text-[10px] font-mono text-lavender">
                          {opt.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-fog mt-0.5 leading-snug">{opt.description}</p>
                  </div>
                  <div className="shrink-0 self-center pl-2">
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        isSelected
                          ? 'border-iris-violet bg-iris-violet text-paper'
                          : 'border-graphite bg-carbon'
                      }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Motion Preference Selector */}
        <div className="space-y-2.5 pt-4 border-t border-graphite">
          <div className="flex items-center justify-between">
            <label className="text-[13px] font-semibold text-bone">Efectos y Animaciones</label>
            <span className="text-[11px] font-mono text-signal-teal">
              Estado: {isReducedMotion ? 'Movimiento mínimo' : 'Animaciones fluidas'}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {motionOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = reducedMotion === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setReducedMotion(opt.id)}
                  className={`w-full flex items-start gap-3 p-3 text-left rounded-cards border transition-all ${
                    isSelected
                      ? 'bg-iris-violet/10 border-iris-violet text-bone ring-1 ring-iris-violet/30'
                      : 'bg-obsidian hover:bg-graphite/40 border-graphite text-mist hover:text-bone'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-inputs flex items-center justify-center shrink-0 mt-0.5 ${
                      isSelected
                        ? 'bg-iris-violet text-paper'
                        : 'bg-carbon text-fog border border-graphite'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] font-semibold text-bone">{opt.label}</span>
                    <p className="text-[12px] text-fog mt-0.5 leading-snug">{opt.description}</p>
                  </div>
                  <div className="shrink-0 self-center pl-2">
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        isSelected
                          ? 'border-iris-violet bg-iris-violet text-paper'
                          : 'border-graphite bg-carbon'
                      }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}
