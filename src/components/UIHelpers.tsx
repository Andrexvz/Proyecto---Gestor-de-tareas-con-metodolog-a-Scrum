import React from 'react';
import { AlertCircle, ArrowUp, Equal, ArrowDown, CheckCircle2, Clock, PlayCircle, Archive } from 'lucide-react';
import { Badge, Button, Modal } from './ui';
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
      <Badge
        variant="danger"
        shape="pill"
        size="sm"
        icon={<ArrowUp className="w-3.5 h-3.5 text-coral-red" />}
      >
        Alta
      </Badge>
    );
  }
  if (priority === 'MEDIUM') {
    return (
      <Badge
        variant="warning"
        shape="pill"
        size="sm"
        icon={<Equal className="w-3.5 h-3.5 text-acid-lime" />}
      >
        Media
      </Badge>
    );
  }
  return (
    <Badge
      variant="success"
      shape="pill"
      size="sm"
      icon={<ArrowDown className="w-3.5 h-3.5 text-pulse-green" />}
    >
      Baja
    </Badge>
  );
}

export function SprintStatusText({ status }: { status: SprintStatus }) {
  if (status === 'ACTIVE') {
    return (
      <Badge
        variant="success"
        shape="pill"
        size="sm"
        icon={<PlayCircle className="w-3.5 h-3.5" />}
      >
        Activo
      </Badge>
    );
  }
  if (status === 'PLANNING') {
    return (
      <Badge
        variant="info"
        shape="pill"
        size="sm"
        icon={<Clock className="w-3.5 h-3.5" />}
      >
        Planificación
      </Badge>
    );
  }
  return (
    <Badge
      variant="default"
      shape="pill"
      size="sm"
      icon={<Archive className="w-3.5 h-3.5" />}
    >
      Cerrado
    </Badge>
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
  return (
    <Modal
      open={open}
      onClose={onCancel}
      size="sm"
      showCloseButton={false}
      footer={
        <div className="flex items-center justify-end gap-2.5 w-full">
          <Button
            variant="outline"
            size="md"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            size="md"
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="flex items-start gap-3">
        <div
          className={`p-2 rounded-inputs shrink-0 ${
            variant === 'danger' ? 'bg-coral-red/15 text-coral-red' : 'bg-iris-violet/15 text-iris-violet'
          }`}
          aria-hidden="true"
        >
          {variant === 'danger' ? (
            <AlertCircle className="w-5 h-5" />
          ) : (
            <CheckCircle2 className="w-5 h-5" />
          )}
        </div>
        <div className="flex-1 space-y-1">
          <h3 className="text-[15px] font-semibold text-bone leading-6">{title}</h3>
          <p className="text-[13px] text-mist leading-5">{description}</p>
        </div>
      </div>
    </Modal>
  );
}
