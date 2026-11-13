/* ── Status indicator pill ────────────────────────────────────────── */

import type { AlertStatus } from '../types';

const COLORS: Record<AlertStatus, string> = {
  new:               'bg-blue/15 text-blue border-blue/25',
  investigating:     'bg-amber/15 text-amber border-amber/25',
  awaiting_approval: 'bg-amber/20 text-amber border-amber/30',
  resolved:          'bg-teal/15 text-teal border-teal/25',
  closed_noise:      'bg-secondary/10 text-tertiary border-border',
};

interface Props {
  status: AlertStatus;
  className?: string;
}

export function StatusBadge({ status, className = '' }: Props) {
  const label = status.replace(/_/g, ' ');
  return (
    <span
      className={`inline-flex text-[11px] font-medium capitalize border rounded px-1.5 py-0.5 ${COLORS[status] ?? 'text-secondary'} ${className}`}
    >
      {label}
    </span>
  );
}

