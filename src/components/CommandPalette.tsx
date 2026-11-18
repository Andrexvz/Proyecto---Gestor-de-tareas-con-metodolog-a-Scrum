import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  CheckSquare,
  FolderKanban,
  ListTodo,
  CalendarRange,
  Kanban,
  BarChart3,
  Plus,
  ArrowRight,
  CornerDownLeft,
  Command,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { ProjectSummary } from '../types/scrum';
import type { ActiveRoute } from './AppShell';

interface CommandItem {
  id: string;
  category: 'Navegación' | 'Proyecto Activo' | 'Acciones' | 'Espacios de Trabajo';
  label: string;
  hint: string;
  badge?: string;
  icon: React.ComponentType<{ className?: string }>;
  onSelect: () => void;
}

export function CommandPalette({
  open,
  projects,
  currentProject,
  onClose,
  onNavigate,
  onQuickCreateStory,
}: {
  open: boolean;
  projects: ProjectSummary[];
  currentProject: ProjectSummary | null;
  onClose: () => void;
  onNavigate: (route: ActiveRoute, projectId?: number) => void;
  onQuickCreateStory?: () => void;
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const items = useMemo<CommandItem[]>(() => {
    const list: CommandItem[] = [
      {
        id: 'go-dashboard',
        category: 'Navegación',
        label: 'Ir al Dashboard de Proyectos',
        hint: 'Vista general',
        icon: FolderKanban,
        onSelect: () => {
          onNavigate('dashboard');
          onClose();
        },
      },
      {
        id: 'go-my-work',
        category: 'Navegación',
        label: 'Ir a Mi Trabajo (Mis Tareas Asignadas)',
        hint: 'Tareas personales y seguimiento',
        badge: 'Mi Trabajo',
        icon: CheckSquare,
        onSelect: () => {
          onNavigate('my-work');
          onClose();
        },
      },
    ];

    if (currentProject) {
      list.push(
        {
          id: 'go-backlog',
          category: 'Proyecto Activo',
          label: `Product Backlog`,
          hint: currentProject.name,
          badge: 'Backlog',
          icon: ListTodo,
          onSelect: () => {
            onNavigate('backlog', currentProject.id);
            onClose();
          },
        },
        {
          id: 'go-sprints',
          category: 'Proyecto Activo',
          label: `Planificación de Sprints`,
          hint: currentProject.name,
          badge: 'Sprints',
          icon: CalendarRange,
          onSelect: () => {
            onNavigate('sprints', currentProject.id);
            onClose();
          },
        },
        {
          id: 'go-kanban',
          category: 'Proyecto Activo',
          label: `Tablero Kanban`,
          hint: currentProject.name,
          badge: 'Kanban',
          icon: Kanban,
          onSelect: () => {
            onNavigate('kanban', currentProject.id);
            onClose();
          },
        },
        {
          id: 'go-metrics',
          category: 'Proyecto Activo',
          label: `Métricas y Velocidad`,
          hint: currentProject.name,
          badge: 'Reportes',
          icon: BarChart3,
          onSelect: () => {
            onNavigate('metrics', currentProject.id);
            onClose();
          },
        }
      );

      if (
        onQuickCreateStory &&
        (currentProject.myRole === 'ADMIN' || currentProject.myRole === 'PRODUCT_OWNER')
      ) {
        list.push({
          id: 'new-story',
          category: 'Acciones',
          label: 'Nueva historia de usuario (con Asistencia IA)',
          hint: currentProject.name,
          badge: 'Crear',
          icon: Plus,
          onSelect: () => {
            onClose();
            onQuickCreateStory();
          },
        });
      }
    }

    for (const p of projects) {
      if (p.id !== currentProject?.id) {
        list.push({
          id: `switch-proj-${p.id}`,
          category: 'Espacios de Trabajo',
          label: `Abrir: ${p.name}`,
          hint: p.code,
          badge: p.code,
          icon: FolderKanban,
          onSelect: () => {
            onNavigate('backlog', p.id);
            onClose();
          },
        });
      }
    }

    return list;
  }, [projects, currentProject, onClose, onNavigate, onQuickCreateStory]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.label.toLowerCase().includes(q) ||
        i.hint.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q) ||
        (i.badge && i.badge.toLowerCase().includes(q))
    );
  }, [items, query]);

  // Reset index when search query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keep selected item scrolled into view
  useEffect(() => {
    if (!listRef.current) return;
    const selectedElement = listRef.current.querySelector(
      `[data-command-index="${selectedIndex}"]`
    ) as HTMLElement | null;
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Keyboard navigation inside the palette
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (filtered.length > 0 ? (prev + 1) % filtered.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        filtered.length > 0 ? (prev - 1 + filtered.length) % filtered.length : 0
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].onSelect();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Group filtered items by category while retaining flat index
  const groupedItems = useMemo(() => {
    const groups: { category: string; items: { item: CommandItem; flatIndex: number }[] }[] = [];
    const categoryOrder: CommandItem['category'][] = [
      'Acciones',
      'Proyecto Activo',
      'Navegación',
      'Espacios de Trabajo',
    ];

    categoryOrder.forEach((cat) => {
      const matching: { item: CommandItem; flatIndex: number }[] = [];
      filtered.forEach((item, idx) => {
        if (item.category === cat) {
          matching.push({ item, flatIndex: idx });
        }
      });
      if (matching.length > 0) {
        groups.push({ category: cat, items: matching });
      }
    });

    return groups;
  }, [filtered]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] sm:pt-[14vh] px-4">
          {/* Backdrop blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-void/80 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal Container */}
          <motion.div
            initial={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.96, y: -8 }
            }
            animate={
              shouldReduceMotion
                ? { opacity: 1 }
                : { opacity: 1, scale: 1, y: 0 }
            }
            exit={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.96, y: -8 }
            }
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="relative w-full max-w-xl rounded-cards bg-obsidian/95 backdrop-blur-lg border border-graphite shadow-2xl overflow-hidden z-10 flex flex-col max-h-[75vh]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Paleta de Comandos de Agile Velocity"
          >
            {/* Input Header */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-graphite shrink-0">
              <Search className="w-4 h-4 text-fog shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribe un comando, vista, proyecto o acción..."
                className="flex-1 bg-transparent text-[13px] text-bone placeholder:text-ash focus:outline-none"
                aria-autocomplete="list"
              />
              <div className="flex items-center gap-1.5 shrink-0">
                <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded-sm bg-carbon text-fog border border-graphite shadow-xs">
                  ESC
                </kbd>
              </div>
            </div>

            {/* Items List */}
            <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-3">
              {filtered.length === 0 ? (
                <div className="py-10 text-center">
                  <Command className="w-8 h-8 text-ash mx-auto mb-2 opacity-50" />
                  <p className="text-[13px] font-medium text-mist">
                    No se encontraron comandos
                  </p>
                  <p className="text-[12px] text-fog mt-0.5">
                    No hay resultados para «{query}». Prueba buscando "backlog", "sprints" o "kanban".
                  </p>
                </div>
              ) : (
                groupedItems.map((group) => (
                  <div key={group.category} className="space-y-1">
                    <p className="px-3 py-1 text-[11px] font-semibold text-fog tracking-wider uppercase">
                      {group.category}
                    </p>
                    <div className="space-y-0.5">
                      {group.items.map(({ item, flatIndex }) => {
                        const Icon = item.icon;
                        const isSelected = flatIndex === selectedIndex;

                        return (
                          <button
                            key={item.id}
                            data-command-index={flatIndex}
                            type="button"
                            onClick={item.onSelect}
                            onMouseEnter={() => setSelectedIndex(flatIndex)}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-inputs text-left transition-all ${
                              isSelected
                                ? 'bg-iris-violet/15 border border-iris-violet/30 text-paper shadow-sm'
                                : 'border border-transparent text-mist hover:text-paper hover:bg-graphite/40'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`p-1.5 rounded-md transition-colors ${
                                  isSelected
                                    ? 'bg-iris-violet/25 text-paper'
                                    : 'bg-carbon text-fog'
                                }`}
                              >
                                <Icon className="w-3.5 h-3.5 shrink-0" />
                              </div>
                              <div className="min-w-0 truncate">
                                <span className="text-[13px] font-medium truncate block">
                                  {item.label}
                                </span>
                                {item.hint && item.hint !== item.label && (
                                  <span className="text-[11px] text-fog block truncate">
                                    {item.hint}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 ml-3 shrink-0">
                              {item.badge && (
                                <span className="px-1.5 py-0.5 rounded-sm bg-carbon text-fog border border-graphite text-[10px] font-mono">
                                  {item.badge}
                                </span>
                              )}
                              {isSelected && (
                                <CornerDownLeft className="w-3.5 h-3.5 text-signal-teal shrink-0" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer Keyboard Navigation Shortcuts */}
            <div className="px-4 py-2 border-t border-graphite bg-carbon/60 flex items-center justify-between text-[11px] text-fog shrink-0">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1 rounded bg-graphite/60 font-mono text-[10px]">↑</kbd>
                  <kbd className="px-1 rounded bg-graphite/60 font-mono text-[10px]">↓</kbd>
                  <span>Navegar</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 rounded bg-graphite/60 font-mono text-[10px]">↵</kbd>
                  <span>Seleccionar</span>
                </span>
              </div>
              <span className="text-[11px] text-ash">Agile Velocity</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
