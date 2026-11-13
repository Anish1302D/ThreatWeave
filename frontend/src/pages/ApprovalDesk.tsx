/* ── Approval Desk — human decision-making interface ──────────────── */

import { useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router';
import { ShieldCheck, ShieldX, CheckCircle2, XCircle, Inbox } from 'lucide-react';
import { useLive } from '../state/LiveStore';
import { useToasts } from '../state/ToastStore';
import { submitApproval, ApiError } from '../services/api';
import { derivePendingApprovals, pendingOnly } from '../lib/derive';
import type { ApprovalRequest } from '../types';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/StateIndicators';
import { formatEpoch } from '../lib/format';

type Tab = 'pending' | 'decided';

export function ApprovalDesk() {
  const { audit, refreshAlerts, refreshAudit } = useLive();
  const { addToast } = useToasts();
  const [tab, setTab] = useState<Tab>('pending');
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{ req: ApprovalRequest; ok: boolean } | null>(null);

  const allApprovals = useMemo(() => derivePendingApprovals(audit), [audit]);
  const pending = useMemo(() => pendingOnly(allApprovals), [allApprovals]);
  const decided = useMemo(() => allApprovals.filter(a => a.decision), [allApprovals]);

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

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-serif text-ivory">Approval Desk</h1>
        <p className="text-sm text-secondary mt-0.5">
          Review and authorize response actions proposed by the investigation pipeline
        </p>
      </header>

      {/* ── Tabs ─────────────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-border pb-px">
        <TabButton active={tab === 'pending'} onClick={() => setTab('pending')}>
          Pending ({pending.length})
        </TabButton>
        <TabButton active={tab === 'decided'} onClick={() => setTab('decided')}>
          Decided ({decided.length})
        </TabButton>
      </div>

      {/* ── Content ──────────────────────────────────────────────── */}
      {allApprovals.length === 0 ? (
        <EmptyState
          icon={<Inbox size={28} strokeWidth={1} />}
          title="No approval requests"
          description="Launch a scenario from the Scenario Lab to generate alerts that require human review."
        />
      ) : tab === 'pending' ? (
        pending.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck size={28} strokeWidth={1} />}
            title="No actions awaiting approval"
            description="All proposed actions have been reviewed."
          />
        ) : (
          <div className="space-y-2">
            {pending.map(req => (
              <ApprovalCard
                key={req.key}
                req={req}
                submitting={submitting === req.key}
                onApprove={() => setConfirmState({ req, ok: true })}
                onReject={() => setConfirmState({ req, ok: false })}
              />
            ))}
          </div>
        )
      ) : (
        decided.length === 0 ? (
          <EmptyState title="No decisions recorded yet" />
        ) : (
          <div className="space-y-2">
            {decided.map(req => (
              <DecidedCard key={req.key} req={req} />
            ))}
          </div>
        )
      )}

      {/* ── Confirmation Dialog ──────────────────────────────────── */}
      <ConfirmDialog
        open={confirmState !== null}
        title={confirmState?.ok ? 'Approve Action' : 'Reject Action'}
        description={
          confirmState
            ? `Are you sure you want to ${confirmState.ok ? 'approve' : 'reject'} ${confirmState.req.action} for ${confirmState.req.alertId}? ${
                Object.entries(confirmState.req.args).map(([k, v]) => `${k}=${String(v)}`).join(', ')
              }${!confirmState.ok ? '\n\nThis action will NOT be executed.' : '\n\nThis is a simulated action — no real system changes will occur.'}`
            : ''
        }
        confirmLabel={confirmState?.ok ? 'Approve' : 'Reject'}
        confirmVariant={confirmState?.ok ? 'default' : 'danger'}
        onConfirm={handleSubmit}
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
      className={`px-3 py-1.5 text-sm transition-colors border-b-2 -mb-px
        ${active
          ? 'text-ivory border-amber'
          : 'text-tertiary border-transparent hover:text-secondary'
        }`}
    >
      {children}
    </button>
  );
}

function ApprovalCard({ req, submitting, onApprove, onReject }: {
  req: ApprovalRequest;
  submitting: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="border border-border rounded p-3">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <Link to={`/investigation/${req.alertId}`} className="font-mono text-xs text-blue hover:underline">
          {req.alertId}
        </Link>
        <span className="font-mono text-sm font-medium text-ivory">{req.action}</span>
        <span className="text-[10px] text-tertiary border border-border rounded px-1">Simulated action</span>
      </div>
      <div className="flex flex-wrap gap-x-3 text-xs mb-2">
        {Object.entries(req.args).map(([k, v]) => (
          <span key={k} className="font-mono text-tertiary">
            {k}=<span className="text-secondary">{String(v)}</span>
          </span>
        ))}
      </div>
      <p className="text-xs text-secondary mb-2">{req.msg}</p>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono text-tertiary">{formatEpoch(req.ts)}</span>
        <div className="flex gap-2">
          <button
            onClick={onApprove}
            disabled={submitting}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-teal hover:bg-teal-dim text-ink rounded transition-colors disabled:opacity-50"
          >
            <CheckCircle2 size={12} />
            Approve
          </button>
          <button
            onClick={onReject}
            disabled={submitting}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-vermilion hover:bg-vermilion-dim text-white rounded transition-colors disabled:opacity-50"
          >
            <XCircle size={12} />
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

function DecidedCard({ req }: { req: ApprovalRequest }) {
  const isApproved = req.decision === 'approved';
  return (
    <div className="border border-border-subtle rounded p-3 opacity-80">
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <Link to={`/investigation/${req.alertId}`} className="font-mono text-xs text-blue hover:underline">
          {req.alertId}
        </Link>
        <span className="font-mono text-sm text-secondary">{req.action}</span>
        {isApproved ? (
          <span className="flex items-center gap-1 text-[10px] text-teal border border-teal/30 rounded px-1">
            <ShieldCheck size={10} /> Approved
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[10px] text-vermilion border border-vermilion/30 rounded px-1">
            <ShieldX size={10} /> Rejected
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-x-3 text-xs">
        {Object.entries(req.args).map(([k, v]) => (
          <span key={k} className="font-mono text-tertiary">
            {k}=<span className="text-secondary">{String(v)}</span>
          </span>
        ))}
      </div>
      {req.decisionTs && (
        <p className="text-[11px] font-mono text-tertiary mt-1">Decision: {formatEpoch(req.decisionTs)}</p>
      )}
    </div>
  );
}

