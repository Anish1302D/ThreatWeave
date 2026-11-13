/* ── Severity badge ──────────────────────────────────────────────── */

import type { Severity } from '../types';

const STYLES: Record<Severity, string> = {
  high: 'bg-vermilion/15 text-vermilion border-vermilion/30',
  medium: 'bg-amber/15 text-amber border-amber/30',
  low: 'bg-secondary/10 text-secondary border-secondary/20',
};

const SHAPES: Record<Severity, string> = {
  high: '▲',
  medium: '◆',
  low: '●',
};

interface Props {
  severity: Severity | null;
  className?: string;
}

export function SeverityBadge({ severity, className = '' }: Props) {
  if (!severity) return <span className={`text-xs text-tertiary ${className}`}>—</span>;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider
                   border rounded px-1.5 py-0.5 ${STYLES[severity]} ${className}`}
    >
      <span className="text-[8px] leading-none">{SHAPES[severity]}</span>
      {severity}
    </span>
  );
}

