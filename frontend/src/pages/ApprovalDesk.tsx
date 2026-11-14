/* ── Approval Desk — human decision-making interface ──────────────── */

import { useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router';
import {
  ShieldCheck,
  ShieldX,
  CheckCircle2,
  XCircle,
  Inbox,
  ArrowUpRight,
  Lock,
  Play,
} from 'lucide-react';
import { useLive } from '../state/LiveStore';
import { useToasts } from '../state/ToastStore';
import { submitApproval, ApiError } from '../services/api';
import { derivePendingApprovals, pendingOnly } from '../lib/derive';
import type { Alert, ApprovalRequest } from '../types';
import { ConfirmDialog, type ConfirmDetailItem } from '../components/ConfirmDialog';
import { SeverityBadge } from '../components/SeverityBadge';
import { EmptyState } from '../components/StateIndicators';
import { formatEpoch } from '../lib/format';

type Tab = 'pending' | 'decided';

const ACTION_SCOPE: Record<string, string> = {
  block_ip:             'Perimeter / Firewall Block',
  disable_account:      'Identity / Account Lockout',
  force_password_reset: 'Identity / Credential Reset',
  isolate_host:         'Endpoint / Network Isolation',
};

export function ApprovalDesk() {
  const { alerts, audit, refreshAlerts, refreshAudit } = useLive();
  const { addToast } = useToasts();
  const [tab, setTab] = useState<Tab>('pending');
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{ req: ApprovalRequest; ok: boolean } | null>(null);

  const alertMap = useMemo(
    () => new Map<string, Alert>(alerts.map(a => [a.id, a])),
    [alerts],
  );

  const allApprovals = useMemo(() => derivePendingApprovals(audit), [audit]);
  const pending = useMemo(() => pendingOnly(allApprovals), [allApprovals]);
  const decided = useMemo(() => allApprovals.filter(a => a.decision), [allApprovals]);
  const approvedCount = useMemo(() => decided.filter(a => a.decision === 'approved').length, [decided]);
  const rejectedCount = useMemo(() => decided.filter(a => a.decision === 'rejected').length, [decided]);

  const handleSubmit = useCallback(async () => {
    if (!confirmState) return;
    const { req, ok } = confirmState;
    setConfirmState(null);
    setSubmitting(req.key);
    try {
      await submitApproval(req.key, ok);
      addToast('success', `Action ${ok ? 'approved' : 'rejected'}: ${req.action} for ${req.alertId}`);
      await Promise.all([refreshAlerts(), refreshAudit()]);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        addToast('warning', 'This approval has already been processed.');
      } else {
        addToast('error', err instanceof Error ? err.message : 'Approval failed');
      }
      await refreshAudit();
    } finally {
      setSubmitting(null);
    }
  }, [confirmState, addToast, refreshAlerts, refreshAudit]);

  const confirmAlert = confirmState ? alertMap.get(confirmState.req.alertId) : undefined;
  const confirmDetails: ConfirmDetailItem[] = confirmState
    ? [
        { label: 'Target Alert', value: `${confirmState.req.alertId}${confirmAlert ? ` — ${confirmAlert.desc}` : ''}` },
        { label: 'Containment Tool', value: confirmState.req.action, mono: true },
        {
          label: 'Parameters',
          value: Object.entries(confirmState.req.args).map(([k, v]) => `${k}=${String(v)}`).join(', ') || 'None',
          mono: true,
        },
        { label: 'Execution Mode', value: 'Simulated adapter (safe)' },
      ]
    : [];

  return (
    <div className="space-y-5">
      {/* ── Header + Governance Summary ───────────────────────────── */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-tertiary mb-1">
            Human-in-the-Loop Governance
          </p>
          <h1 className="text-2xl font-serif text-ivory tracking-tight">Approval Desk</h1>
          <p className="text-sm text-secondary mt-0.5">
            Review and authorize high-impact containment actions paused at the engine gate
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="panel-inset px-2.5 py-1 flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${pending.length > 0 ? 'bg-amber animate-pulse' : 'bg-tertiary'}`} />
            <span className="text-tertiary">Pending:</span>
            <span className="font-mono text-ivory tabular-nums">{pending.length}</span>
          </span>
          <span className="panel-inset px-2.5 py-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-teal" />
            <span className="text-tertiary">Approved:</span>
            <span className="font-mono text-ivory tabular-nums">{approvedCount}</span>
          </span>
          <span className="panel-inset px-2.5 py-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-vermilion" />
            <span className="text-tertiary">Rejected:</span>
            <span className="font-mono text-ivory tabular-nums">{rejectedCount}</span>
          </span>
        </div>
      </header>

      {/* ── Tabs ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-border">
        <div className="flex gap-1">
          <TabButton active={tab === 'pending'} onClick={() => setTab('pending')}>
            Pending Review ({pending.length})
          </TabButton>
          <TabButton active={tab === 'decided'} onClick={() => setTab('decided')}>
            Decision History ({decided.length})
          </TabButton>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-mono text-tertiary pb-1.5">
          <Lock size={11} className="text-teal" />
          Engine-level Future Pause
        </span>
      </div>

      {/* ── Content ──────────────────────────────────────────────── */}
      {allApprovals.length === 0 ? (
        <div className="panel-card">
          <EmptyState
            icon={<Inbox size={20} strokeWidth={1.5} />}
            title="No containment approvals queued"
            description="Launch the synthetic attack scenario to see high-impact containment actions pause for analyst authorization."
            action={
              <Link
                to="/scenario"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-medium bg-amber text-ink hover:bg-amber-dim transition-colors"
              >
                <Play size={12} />
                Open Scenario Lab
              </Link>
            }
          />
        </div>
      ) : tab === 'pending' ? (
        pending.length === 0 ? (
          <div className="panel-card">
            <EmptyState
              icon={<ShieldCheck size={20} strokeWidth={1.5} className="text-teal" />}
              title="All containment gates resolved"
              description="Every proposed high-risk action has been reviewed and recorded in the audit ledger."
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {pending.map(req => (
              <ApprovalCard
                key={req.key}
                req={req}
                alert={alertMap.get(req.alertId)}
                submitting={submitting === req.key}
                onApprove={() => setConfirmState({ req, ok: true })}
                onReject={() => setConfirmState({ req, ok: false })}
              />
            ))}
          </div>
        )
      ) : (
        decided.length === 0 ? (
          <div className="panel-card">
            <EmptyState title="No analyst decisions recorded yet" description="Approved and rejected actions will appear here." />
          </div>
        ) : (
          <div className="space-y-3">
            {decided.map(req => (
              <DecidedCard key={req.key} req={req} alert={alertMap.get(req.alertId)} />
            ))}
          </div>
        )
      )}

      {/* ── Confirmation Dialog ──────────────────────────────────── */}
      <ConfirmDialog
        open={confirmState !== null}
        title={confirmState?.ok ? 'Approve Containment Action' : 'Reject Containment Action'}
        description={
          confirmState?.ok
            ? 'Granting approval will unblock the paused workflow and execute the proposed containment adapter.'
            : 'Rejecting this proposal will cancel containment execution and log the refusal to the immutable audit ledger.'
        }
        details={confirmDetails}
        notice={
          confirmState?.ok
            ? 'This is a simulated action — no production host, firewall, or directory changes will occur.'
            : 'This action will NOT be executed.'
        }
        confirmLabel={confirmState?.ok ? 'Approve & Execute' : 'Reject Action'}
        confirmVariant={confirmState?.ok ? 'default' : 'danger'}
        onConfirm={() => void handleSubmit()}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────────── */

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-xs font-medium transition-colors border-b-2 -mb-px cursor-pointer ${
        active
          ? 'text-ivory border-amber'
          : 'text-tertiary border-transparent hover:text-secondary'
      }`}
    >
      {children}
    </button>
  );
}

function ApprovalCard({
  req,
  alert,
  submitting,
  onApprove,
  onReject,
}: {
  req: ApprovalRequest;
  alert?: Alert;
  submitting: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const scopeLabel = ACTION_SCOPE[req.action] ?? 'High-Impact Containment';

  return (
    <div className="panel-card flex flex-col justify-between overflow-hidden border-l-2 border-l-amber">
      <div className="p-4 space-y-3">
        {/* Card header */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Link
              to={`/investigation/${req.alertId}`}
              className="font-mono text-xs text-blue bg-blue/10 border border-blue/25 rounded px-2 py-0.5 hover:bg-blue/20 transition-colors"
            >
              {req.alertId}
            </Link>
            {alert && <SeverityBadge severity={alert.severity} />}
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber bg-amber/10 border border-amber/25 rounded px-1.5 py-0.5">
              High Risk
            </span>
          </div>
          <span className="text-[10px] font-mono text-tertiary border border-border-subtle rounded px-1.5 py-0.5">
            Simulated action
          </span>
        </div>

        {/* Action & Scope */}
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="font-mono text-base font-semibold text-ivory">{req.action}</h3>
            <span className="text-[11px] text-tertiary">{scopeLabel}</span>
          </div>
          {alert && (
            <p className="text-xs text-ivory-dim mt-1">{alert.desc}</p>
          )}
        </div>

        {/* Target Parameters */}
        <div className="panel-inset px-3 py-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          {Object.entries(req.args).map(([k, v]) => (
            <span key={k} className="font-mono">
              <span className="text-tertiary">{k}=</span>
              <span className="text-ivory font-medium">{String(v)}</span>
            </span>
          ))}
          {alert?.host && (
            <span className="font-mono text-tertiary">
              host=<span className="text-secondary">{alert.host}</span>
            </span>
          )}
        </div>

        <p className="text-xs text-secondary leading-relaxed">{req.msg}</p>
      </div>

      {/* Footer actions */}
      <div className="px-4 py-3 border-t border-border bg-ink/45 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-[11px]">
          <span className="font-mono text-tertiary">{formatEpoch(req.ts)}</span>
          <Link
            to={`/investigation/${req.alertId}`}
            className="inline-flex items-center gap-1 text-blue hover:underline font-medium"
          >
            Inspect Dossier <ArrowUpRight size={11} />
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onReject}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-vermilion/15 hover:bg-vermilion text-vermilion hover:text-white border border-vermilion/35 rounded-md transition-colors disabled:opacity-50 cursor-pointer"
          >
            <XCircle size={13} />
            Reject
          </button>
          <button
            onClick={onApprove}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-teal hover:bg-teal-dim text-ink rounded-md transition-colors disabled:opacity-50 cursor-pointer"
          >
            <CheckCircle2 size={13} />
            Approve
          </button>
        </div>
      </div>
    </div>
  );
}

function DecidedCard({ req, alert }: { req: ApprovalRequest; alert?: Alert }) {
  const isApproved = req.decision === 'approved';
  return (
    <div className="panel-card px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="space-y-1.5 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/investigation/${req.alertId}`}
            className="font-mono text-xs text-blue bg-blue/10 border border-blue/25 rounded px-2 py-0.5 hover:bg-blue/20 transition-colors"
          >
            {req.alertId}
          </Link>
          <span className="font-mono text-sm font-medium text-ivory">{req.action}</span>
          {isApproved ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-teal bg-teal/10 border border-teal/30 rounded-full px-2 py-0.5">
              <ShieldCheck size={11} /> Approved
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-vermilion bg-vermilion/10 border border-vermilion/30 rounded-full px-2 py-0.5">
              <ShieldX size={11} /> Rejected
            </span>
          )}
          {alert && (
            <span className="text-xs text-secondary truncate">{alert.desc}</span>
          )}
        </div>

        <div className="flex flex-wrap gap-x-3 text-xs">
          {Object.entries(req.args).map(([k, v]) => (
            <span key={k} className="font-mono text-tertiary">
              {k}=<span className="text-secondary">{String(v)}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="flex sm:flex-col items-end justify-between gap-1 shrink-0 text-right">
        {req.decisionTs && (
          <p className="text-[11px] font-mono text-tertiary whitespace-nowrap">
            {formatEpoch(req.decisionTs)}
          </p>
        )}
        <Link
          to={`/investigation/${req.alertId}`}
          className="inline-flex items-center gap-1 text-[11px] text-blue hover:underline"
        >
          View case <ArrowUpRight size={11} />
        </Link>
      </div>
    </div>
  );
}
