/* ── Types matching the real FastAPI backend responses (main.py) ─── */

/** GET /api/alerts — each row merges the `alerts` table columns with
 *  the parsed `raw` JSON (minus the ground-truth `label`). */
export interface Alert {
  id: string;            // "A-101" .. "A-107"
  status: AlertStatus;
  severity: Severity | null;
  confidence: number | null;
  report: string | null;
  // fields from the original scenario dict:
  type: string;          // "failed_login", "port_scan", etc.
  user: string;
  src_ip: string;
  host: string;
  desc: string;
  t: number;             // scenario minute-offset, NOT epoch
}

export type AlertStatus =
  | 'new'
  | 'investigating'
  | 'awaiting_approval'
  | 'resolved'
  | 'closed_noise';

export type Severity = 'low' | 'medium' | 'high';

export function severityRank(s: Severity | null): number {
  if (s === 'high') return 3;
  if (s === 'medium') return 2;
  if (s === 'low') return 1;
  return 0;
}

export function isEscalated(a: Alert): boolean {
  return a.status !== 'new' && a.status !== 'closed_noise';
}

