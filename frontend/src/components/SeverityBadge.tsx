/* ── Severity badge ──────────────────────────────────────────────── */

import type { Severity } from '../types';

const STYLES: Record<Severity, string> = {
  high:   'bg-vermilion/12 text-vermilion border-vermilion/35',
  medium: 'bg-amber/12 text-amber border-amber/35',
  low:    'bg-surface/80 text-secondary border-border',
};

const SHAPES: Record<Severity, string> = {
  high:   '▲',
  medium: '◆',
  low:    '●',
};

interface Props {
  severity: Severity | null;
  className?: string;
}

export function SeverityBadge({ severity, className = '' }: Props) {
  if (!severity) return <span className={`text-xs text-tertiary font-mono ${className}`}>—</span>;
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 text-[10px] font-mono font-medium uppercase tracking-wider
                   border rounded-full px-2 py-0.5 leading-tight ${STYLES[severity]} ${className}`}
    >
      <span className="text-[8px] leading-none">{SHAPES[severity]}</span>
      {severity}
    </span>
  );
}
