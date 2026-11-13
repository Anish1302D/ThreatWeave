/* ── Approval-related types, derived from audit events ─────────── */

import type { AuditEvent } from './audit';

/** A pending approval request — derived from `gate/approval_required` events. */
export interface ApprovalRequest {
  key: string;            // "A-103:2"
  alertId: string;
  action: string;         // "block_ip", "disable_account", etc.
  args: Record<string, unknown>;
  msg: string;
  ts: number;
  /** Set once the analyst responds */
  decision?: 'approved' | 'rejected';
  decisionTs?: number;
}

/** Extract approval info from a gate/approval_required audit event */
export function approvalFromEvent(e: AuditEvent): ApprovalRequest | null {
  if (e.kind !== 'approval_required') return null;
  const d = e.data as { key?: string; action?: string; args?: Record<string, unknown> };
  if (!d.key || !d.action) return null;
  return {
    key: d.key,
    alertId: e.alert_id,
    action: d.action,
    args: d.args ?? {},
    msg: e.msg,
    ts: e.ts,
  };
}

