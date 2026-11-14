/* ── Status indicator pill ────────────────────────────────────────── */

import type { AlertStatus } from '../types';

const COLORS: Record<AlertStatus, string> = {
  new:               'bg-blue/12 text-blue border-blue/30',
  investigating:     'bg-amber/12 text-amber border-amber/30',
  awaiting_approval: 'bg-amber/15 text-amber border-amber/35',
  resolved:          'bg-teal/12 text-teal border-teal/30',
  closed_noise:      'bg-surface/60 text-tertiary border-border',
};

const DOT_COLORS: Record<AlertStatus, string> = {
  new:               'bg-blue',
  investigating:     'bg-amber animate-pulse',
  awaiting_approval: 'bg-amber animate-pulse',
  resolved:          'bg-teal',
  closed_noise:      'bg-tertiary',
};

interface Props {
  status: AlertStatus;
  className?: string;
}

export function StatusBadge({ status, className = '' }: Props) {
  const label = status.replace(/_/g, ' ');
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 text-[11px] font-medium capitalize
                   border rounded-full px-2.5 py-0.5 leading-tight ${COLORS[status] ?? 'text-secondary border-border'} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${DOT_COLORS[status] ?? 'bg-tertiary'}`} />
      {label}
    </span>
  );
}
