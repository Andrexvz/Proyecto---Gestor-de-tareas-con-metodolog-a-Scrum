import React from 'react';
import { AlertCircle, ArrowUp, Equal, ArrowDown, CheckCircle2, Clock, PlayCircle, Archive } from 'lucide-react';
import type { ScrumRole, SprintStatus, StoryPriority, TaskStatus } from '../types/scrum';

export function formatRoleLabel(role: ScrumRole | 'ADMIN'): string {
  switch (role) {
    case 'ADMIN':
      return 'Administrador';
    case 'PRODUCT_OWNER':
      return 'Product Owner';
    case 'SCRUM_MASTER':
      return 'Scrum Master';
    case 'DEVELOPER':
      return 'Developer';
  }
}

export function PrioritySignal({ priority }: { priority: StoryPriority }) {
  if (priority === 'HIGH') {
    return (
      <span className="inline-flex items-center gap-1 text-[12px] font-medium text-coral-red whitespace-nowrap bg-coral-red/10 border border-coral-red/20 px-1.5 py-0.5 rounded-pills">
        <ArrowUp className="w-3.5 h-3.5 text-coral-red" />
        Alta
      </span>
    );
  }
  if (priority === 'MEDIUM') {
    return (
      <span className="inline-flex items-center gap-1 text-[12px] font-medium text-acid-lime whitespace-nowrap bg-acid-lime/10 border border-acid-lime/20 px-1.5 py-0.5 rounded-pills">
        <Equal className="w-3.5 h-3.5 text-acid-lime" />
        Media
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[12px] font-medium text-pulse-green whitespace-nowrap bg-pulse-green/10 border border-pulse-green/20 px-1.5 py-0.5 rounded-pills">
      <ArrowDown className="w-3.5 h-3.5 text-pulse-green" />
      Baja
    </span>
  );
}

export function SprintStatusText({ status }: { status: SprintStatus }) {
  if (status === 'ACTIVE') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-pulse-green whitespace-nowrap bg-pulse-green/10 px-2 py-0.5 rounded-pills border border-pulse-green/20">
        <PlayCircle className="w-3.5 h-3.5" />
        Activo
      </span>
    );
  }
  if (status === 'PLANNING') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-signal-teal whitespace-nowrap bg-signal-teal/10 px-2 py-0.5 rounded-pills border border-signal-teal/20">
        <Clock className="w-3.5 h-3.5" />
        Planificación
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-fog whitespace-nowrap bg-graphite/40 px-2 py-0.5 rounded-pills border border-graphite">
      <Archive className="w-3.5 h-3.5" />
      Cerrado
    </span>
  );
}

export function TaskColumnLabel(status: TaskStatus): string {
  switch (status) {
    case 'TODO':
      return 'To Do';
    case 'IN_PROGRESS':
      return 'In Progress';
    case 'TESTING':
      return 'Testing';
    case 'DONE':
      return 'Done';
  }
}

export function UserAvatar({ name, size = 'sm' }: { name: string; size?: 'xs' | 'sm' | 'md' }) {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const colors = [
    'bg-iris-violet/20 text-iris-violet border-iris-violet/30',
    'bg-lavender/20 text-lavender border-lavender/30',
    'bg-signal-teal/20 text-signal-teal border-signal-teal/30',
    'bg-pulse-green/20 text-pulse-green border-pulse-green/30',
  ];
  const colorIdx = name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % colors.length;

  const sizeClass = {
    xs: 'w-5 h-5 text-[10px]',
    sm: 'w-6 h-6 text-[11px]',
    md: 'w-8 h-8 text-[12px]',
  }[size];

  return (
    <span
      title={name}
      className={`inline-flex items-center justify-center rounded-full border font-mono font-medium shrink-0 select-none ${sizeClass} ${colors[colorIdx]}`}
    >
      {initials}
    </span>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-cards bg-obsidian border border-graphite p-6 shadow-xl space-y-4">
        <div className="flex items-start gap-3">
          <div
            className={`p-2 rounded-inputs shrink-0 ${
              variant === 'danger' ? 'bg-coral-red/15 text-coral-red' : 'bg-iris-violet/15 text-iris-violet'
            }`}
          >
            {variant === 'danger' ? (
              <AlertCircle className="w-5 h-5" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-[16px] font-semibold text-bone leading-6">{title}</h3>
            <p className="mt-1.5 text-[13px] text-mist leading-5">{description}</p>
          </div>
        </div>
        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-[13px] font-medium text-mist hover:text-paper hover:bg-graphite rounded-buttons transition-colors whitespace-nowrap"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-[13px] font-medium text-paper rounded-buttons transition-colors whitespace-nowrap disabled:opacity-60 shadow-sm ${
              variant === 'danger'
                ? 'bg-coral-red hover:bg-coral-red/90'
                : 'bg-iris-violet hover:bg-iris-violet/90'
            }`}
          >
            {loading ? 'Procesando...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
