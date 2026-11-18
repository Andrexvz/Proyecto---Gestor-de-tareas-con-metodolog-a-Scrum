import React, { useEffect, useMemo, useState } from 'react';
import { Search, FolderKanban, ListTodo, CalendarRange, Kanban, BarChart3, Plus } from 'lucide-react';
import type { ProjectSummary } from '../types/scrum';
import type { ActiveRoute } from './AppShell';

interface CommandItem {
  id: string;
  label: string;
  hint: string;
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

  useEffect(() => {
    if (open) setQuery('');
  }, [open]);

  const items = useMemo<CommandItem[]>(() => {
    const list: CommandItem[] = [
      {
        id: 'go-dashboard',
        label: 'Ir al Dashboard de Proyectos',
        hint: 'Vista general',
        icon: FolderKanban,
        onSelect: () => {
          onNavigate('dashboard');
          onClose();
        },
      },
    ];

    if (currentProject) {
      list.push(
        {
          id: 'go-backlog',
          label: `Product Backlog · ${currentProject.name}`,
          hint: 'Historias de usuario',
          icon: ListTodo,
          onSelect: () => {
            onNavigate('backlog', currentProject.id);
            onClose();
          },
        },
        {
          id: 'go-sprints',
          label: `Planificación de Sprints · ${currentProject.name}`,
          hint: 'Ciclos Scrum',
          icon: CalendarRange,
          onSelect: () => {
            onNavigate('sprints', currentProject.id);
            onClose();
          },
        },
        {
          id: 'go-kanban',
          label: `Tablero Kanban · ${currentProject.name}`,
          hint: 'Ejecución de tareas',
          icon: Kanban,
          onSelect: () => {
            onNavigate('kanban', currentProject.id);
            onClose();
          },
        },
        {
          id: 'go-metrics',
          label: `Métricas y Velocidad · ${currentProject.name}`,
          hint: 'Reportes',
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
          label: 'Nueva historia de usuario (con Asistencia IA)',
          hint: currentProject.name,
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
          label: `Abrir proyecto: ${p.name}`,
          hint: p.code,
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
      (i) => i.label.toLowerCase().includes(q) || i.hint.toLowerCase().includes(q)
    );
  }, [items, query]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[14vh] bg-void/80 backdrop-blur-sm px-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-cards bg-obsidian border border-graphite shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-graphite">
          <Search className="w-4 h-4 text-fog shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ir a tablero, backlog, proyecto o crear historia..."
            className="flex-1 bg-transparent text-[13px] text-bone placeholder:text-ash focus:outline-none"
          />
          <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded-sm bg-carbon text-fog border border-graphite">
            ESC
          </kbd>
        </div>
        <div className="max-h-72 overflow-y-auto p-2 space-y-0.5">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-[12px] text-fog">
              Sin resultados para «{query}».
            </p>
          ) : (
            filtered.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.onSelect}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-inputs text-left hover:bg-graphite/60 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className="w-4 h-4 text-fog group-hover:text-signal-teal shrink-0" />
                    <span className="text-[13px] text-mist group-hover:text-paper truncate">
                      {item.label}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-fog ml-3 shrink-0">
                    {item.hint}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
