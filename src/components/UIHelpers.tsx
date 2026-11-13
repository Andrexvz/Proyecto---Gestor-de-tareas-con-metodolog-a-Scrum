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
      <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[#FDA4AF] whitespace-nowrap">
        <ArrowUp className="w-3.5 h-3.5 text-[#F43F5E]" />
        Alta
      </span>
    );
  }
  if (priority === 'MEDIUM') {
    return (
      <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[#FCD34D] whitespace-nowrap">
        <Equal className="w-3.5 h-3.5 text-[#F59E0B]" />
        Media
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[#6EE7B7] whitespace-nowrap">
      <ArrowDown className="w-3.5 h-3.5 text-[#10B981]" />
      Baja
    </span>
  );
}

export function SprintStatusText({ status }: { status: SprintStatus }) {
  if (status === 'ACTIVE') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#4EDEA3] whitespace-nowrap">
        <PlayCircle className="w-3.5 h-3.5" />
        Activo
      </span>
    );
  }
  if (status === 'PLANNING') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#B4C5FF] whitespace-nowrap">
        <Clock className="w-3.5 h-3.5" />
        Planificación
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#8D90A0] whitespace-nowrap">
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
    'bg-[#2563EB]/25 text-[#B4C5FF] border-[#3B82F6]/30',
    'bg-[#7C3AED]/25 text-[#D2BBFF] border-[#8B5CF6]/30',
    'bg-[#059669]/25 text-[#6EE7B7] border-[#10B981]/30',
    'bg-[#D97706]/25 text-[#FCD34D] border-[#F59E0B]/30',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-[2px] p-4">
      <div className="w-full max-w-md rounded-xl bg-[#171F33] border border-[#334155] p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <div
            className={`p-2 rounded-lg shrink-0 ${
              variant === 'danger' ? 'bg-[#F43F5E]/15 text-[#F43F5E]' : 'bg-[#2563EB]/15 text-[#3B82F6]'
            }`}
          >
            {variant === 'danger' ? (
              <AlertCircle className="w-5 h-5" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-[16px] font-semibold text-[#F8FAFC] leading-6">{title}</h3>
            <p className="mt-1.5 text-[13px] text-[#C3C6D7] leading-5">{description}</p>
          </div>
        </div>
        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-[13px] font-medium text-[#C3C6D7] hover:text-white hover:bg-[#222A3D] rounded-lg transition-colors whitespace-nowrap"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-[13px] font-medium text-white rounded-lg transition-colors whitespace-nowrap disabled:opacity-60 ${
              variant === 'danger'
                ? 'bg-[#DC2626] hover:bg-[#B91C1C]'
                : 'bg-[#2563EB] hover:bg-[#1D4ED8]'
            }`}
          >
            {loading ? 'Procesando...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
