/* ── Investigation Workspace — the centrepiece of DefenceIQ ─────── */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Navigate, Link, useNavigate } from 'react-router';
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Shield,
  ShieldAlert,
  ShieldCheck,
  FileSearch,
  Network,
  Bot,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  FileText,
  Lock,
} from 'lucide-react';
import { useLive } from '../state/LiveStore';
import { useToasts } from '../state/ToastStore';
import { fetchAudit, submitApproval, ApiError } from '../services/api';
import type { Alert, AuditEvent, ApprovalRequest } from '../types';
import { AGENT_LABELS, INVESTIGATION_AGENTS, isEscalated, severityRank } from '../types';
import { SeverityBadge } from '../components/SeverityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingState, ErrorState, EmptyState } from '../components/StateIndicators';
import { ConfirmDialog, type ConfirmDetailItem } from '../components/ConfirmDialog';
import {
  buildSpine,
  deriveIntel,
  deriveTimeline,
  deriveActions,
  derivePendingApprovals,
  pendingOnly,
  deriveAgentStatuses,
  type SpineEntry,
  type DerivedAction,
} from '../lib/derive';
import { formatEpochShort } from '../lib/format';

/* ── Kind → color mapping ────────────────────────────────────────── */
function kindColor(kind: string): string {
  switch (kind) {
    case 'tool_call':             return 'border-blue/40 bg-blue/8 text-blue';
    case 'verdict':               return 'border-teal/40 bg-teal/8 text-teal';
    case 'tool_denied':
    case 'injection_quarantined':
    case 'red_team':              return 'border-vermilion/40 bg-vermilion/10 text-vermilion';
    case 'approval_required':     return 'border-amber/40 bg-amber/10 text-amber';
    case 'citation_check':
    case 'timeline':              return 'border-teal/40 bg-teal/8 text-teal';
    case 'approved':              return 'border-teal/40 bg-teal/10 text-teal';
    case 'rejected':
    case 'rejected_by_analyst':   return 'border-vermilion/40 bg-vermilion/10 text-vermilion';
    default:                      return 'border-border bg-surface/50 text-secondary';
  }
}

/* ── Agent icons ─────────────────────────────────────────────────── */
const AGENT_ICONS: Record<string, typeof Shield> = {
  triage: ShieldAlert,
  intel: Network,
  forensics: FileSearch,
  response: ShieldCheck,
};

/* ── Main Component ──────────────────────────────────────────────── */
export function InvestigationWorkspace() {
  const { alertId } = useParams<{ alertId: string }>();
  const navigate = useNavigate();
  const { alerts, audit: globalAudit, refreshAlerts, refreshAudit } = useLive();
  const { addToast } = useToasts();
  const [localAudit, setLocalAudit] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submittingKey, setSubmittingKey] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{ req: ApprovalRequest; ok: boolean } | null>(null);

  const loadAudit = useCallback(async () => {
    if (!alertId) return;
    try {
      setLoading(true);
      const data = await fetchAudit(alertId);
      setLocalAudit(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit events');
    } finally {
      setLoading(false);
    }
  }, [alertId]);

  useEffect(() => { void loadAudit(); }, [loadAudit]);

  const alertEvents = useMemo(() => {
    const fromGlobal = globalAudit.filter(e => e.alert_id === alertId);
    const localKeys = new Set(localAudit.map(e => `${e.ts}|${e.kind}|${e.msg}`));
    const newFromWs = fromGlobal.filter(e => !localKeys.has(`${e.ts}|${e.kind}|${e.msg}`));
    return [...localAudit, ...newFromWs].sort((a, b) => a.ts - b.ts);
  }, [localAudit, globalAudit, alertId]);

  const orderedAlerts = useMemo(() => {
    return [...alerts].sort((a, b) => {
      const escDiff = Number(isEscalated(b)) - Number(isEscalated(a));
      if (escDiff !== 0) return escDiff;
      return severityRank(b.severity) - severityRank(a.severity);
    });
  }, [alerts]);

  const pendingApprovalsForAlert = useMemo(
    () => pendingOnly(derivePendingApprovals(alertEvents)),
    [alertEvents],
  );

  const handleConfirmDecision = useCallback(async () => {
    if (!confirmState) return;
    const { req, ok } = confirmState;
    setConfirmState(null);
    setSubmittingKey(req.key);
    try {
      await submitApproval(req.key, ok);
      addToast('success', `Action ${ok ? 'approved' : 'rejected'}: ${req.action} for ${req.alertId}`);
      await Promise.all([refreshAlerts(), refreshAudit(), loadAudit()]);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        addToast('warning', 'This approval has already been processed.');
      } else {
        addToast('error', err instanceof Error ? err.message : 'Approval submission failed');
      }
      await Promise.all([refreshAudit(), loadAudit()]);
    } finally {
      setSubmittingKey(null);
    }
  }, [confirmState, addToast, refreshAlerts, refreshAudit, loadAudit]);

  if (!alertId) return <Navigate to="/incidents" replace />;

  const alert = alerts.find(a => a.id === alertId);

  if (loading && localAudit.length === 0) return <LoadingState message="Loading investigation dossier…" />;
  if (!alert && alerts.length > 0) return <ErrorState message={`Alert ${alertId} not found`} onRetry={loadAudit} />;
  if (!alert) return <LoadingState message="Waiting for alert telemetry…" />;

  const confirmDetails: ConfirmDetailItem[] = confirmState
    ? [
        { label: 'Target Alert', value: confirmState.req.alertId, mono: true },
        { label: 'Tool / Action', value: confirmState.req.action, mono: true },
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
      {/* ── Case Top Navigation & Switcher ───────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <Link
            to="/incidents"
            className="inline-flex items-center gap-1.5 text-secondary hover:text-ivory bg-surface/60 hover:bg-surface border border-border rounded-md px-2.5 py-1 transition-colors"
          >
            <ArrowLeft size={13} />
            Incidents
          </Link>
          <span className="text-tertiary">/</span>
          <span className="font-mono text-ivory">{alert.id}</span>
        </div>

        {orderedAlerts.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin pb-0.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-tertiary mr-1 hidden sm:inline">
              Switch case:
            </span>
            {orderedAlerts.map(a => {
              const active = a.id === alert.id;
              return (
                <button
                  key={a.id}
                  onClick={() => navigate(`/investigation/${a.id}`)}
                  className={`font-mono text-[11px] px-2 py-1 rounded border transition-colors whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-amber/15 border-amber/40 text-amber font-medium'
                      : 'bg-ink-deep/70 border-border-subtle text-tertiary hover:text-ivory hover:border-border'
                  }`}
                  title={a.desc}
                >
                  {a.id}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Incident Dossier Header ──────────────────────────────── */}
      <IncidentHeader alert={alert} />

      {/* ── Pending Approval Callout ─────────────────────────────── */}
      {pendingApprovalsForAlert.length > 0 && (
        <div className="panel-card px-4 py-3 border-l-2 border-l-amber bg-amber/[0.04] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs">
            <ShieldAlert size={16} className="text-amber shrink-0" />
            <div>
              <span className="font-medium text-ivory">Human Approval Required:</span>{' '}
              <span className="text-secondary">
                <span className="font-mono text-amber">{pendingApprovalsForAlert.length}</span> containment action{pendingApprovalsForAlert.length > 1 ? 's' : ''} paused at the governance gate. Review in Response Actions or open the Approval Desk.
              </span>
            </div>
          </div>
          <Link
            to="/approvals"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-amber text-ink hover:bg-amber-dim transition-colors"
          >
            Open Approval Desk <ExternalLink size={12} />
          </Link>
        </div>
      )}

      {/* ── Two-column layout ────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_390px] gap-5">
        {/* LEFT COLUMN */}
        <div className="space-y-5 min-w-0">
          <InvestigationSummary alert={alert} events={alertEvents} />
          <EvidenceSpine alert={alert} events={alertEvents} />
          <EvidenceExplorer events={alertEvents} />
          {alert.report && <IncidentReportPanel report={alert.report} />}
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-5">
          <AgentActivity events={alertEvents} />
          <ThreatIntel events={alertEvents} />
          <ResponseRecommendations
            events={alertEvents}
            pendingRequests={pendingApprovalsForAlert}
            submittingKey={submittingKey}
            onDecision={(req, ok) => setConfirmState({ req, ok })}
          />
        </div>
      </div>

      {error && (
        <div className="panel-card px-4 py-2.5 border-vermilion/40 text-xs text-vermilion">
          {error}
        </div>
      )}

      {/* ── Inline Confirmation Dialog ───────────────────────────── */}
      <ConfirmDialog
        open={confirmState !== null}
        title={confirmState?.ok ? 'Approve Containment Action' : 'Reject Containment Action'}
        description={
          confirmState?.ok
            ? 'Authorizing this action releases the paused approval gate and runs the configured containment adapter.'
            : 'Rejecting this action halts execution and logs your analyst decision to the immutable audit ledger.'
        }
        details={confirmDetails}
        notice={
          confirmState?.ok
            ? 'Simulated execution mode: no external firewall, host, or directory changes will occur.'
            : 'Containment action will NOT be executed.'
        }
        confirmLabel={confirmState?.ok ? 'Approve & Execute' : 'Reject Action'}
        confirmVariant={confirmState?.ok ? 'default' : 'danger'}
        onConfirm={() => void handleConfirmDecision()}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
}

/* ── Incident Header ─────────────────────────────────────────────── */
function IncidentHeader({ alert }: { alert: Alert }) {
  const confPct = alert.confidence != null ? Math.round(alert.confidence * 100) : null;

  return (
    <header className="panel-card p-5">
      <div className="flex flex-wrap items-center gap-2.5 mb-2.5">
        <span className="font-mono text-xs text-blue bg-blue/10 border border-blue/30 rounded px-2 py-0.5">
          {alert.id}
        </span>
        <SeverityBadge severity={alert.severity} />
        <StatusBadge status={alert.status} />
        <span className="flex-1" />
        <span className="font-mono text-[11px] text-tertiary">
          Scenario offset: <span className="text-secondary">t+{alert.t}m</span>
        </span>
      </div>

      <h1 className="text-xl md:text-2xl font-serif text-ivory text-balance leading-snug mb-4">
        {alert.desc}
      </h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        <MetaCard label="Source IP" value={alert.src_ip || '—'} mono />
        <MetaCard label="Target Host" value={alert.host || '—'} mono />
        <MetaCard label="Principal / User" value={alert.user || 'Unauthenticated'} mono={Boolean(alert.user)} />
        <MetaCard label="Detection Vector" value={alert.type} mono />
        <div className="panel-inset px-3 py-2">
          <p className="text-[10px] font-mono uppercase tracking-wider text-tertiary">Triage Confidence</p>
          {confPct != null ? (
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    confPct >= 80 ? 'bg-vermilion' : confPct >= 50 ? 'bg-amber' : 'bg-teal'
                  }`}
                  style={{ width: `${confPct}%` }}
                />
              </div>
              <span className="font-mono text-xs text-ivory tabular-nums">{confPct}%</span>
            </div>
          ) : (
            <p className="font-mono text-xs text-tertiary mt-0.5">—</p>
          )}
        </div>
      </div>
    </header>
  );
}

function MetaCard({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="panel-inset px-3 py-2 min-w-0">
      <p className="text-[10px] font-mono uppercase tracking-wider text-tertiary">{label}</p>
      <p className={`text-xs text-ivory truncate mt-0.5 ${mono ? 'font-mono' : ''}`} title={value}>
        {value}
      </p>
    </div>
  );
}

/* ── Investigation Summary ───────────────────────────────────────── */
function InvestigationSummary({ alert, events }: { alert: Alert; events: AuditEvent[] }) {
  const triageVerdict = events.find(e => e.agent === 'triage' && e.kind === 'verdict');
  const citationCheck = events.find(e => e.agent === 'forensics' && e.kind === 'citation_check');

  let statusText = 'Investigation pipeline in progress.';
  if (alert.status === 'awaiting_approval') statusText = 'Paused at human approval gate pending containment decision.';
  else if (alert.status === 'closed_noise') statusText = 'Closed as benign noise during initial triage — no remediation required.';
  else if (alert.status === 'resolved') statusText = 'Investigation completed, containment decisions recorded, and case closed.';

  return (
    <section className="panel-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-ink/40 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ivory">Investigation Summary</h2>
        <span className="text-[10px] font-mono uppercase tracking-wider text-tertiary">
          Evidence Before Interpretation
        </span>
      </div>
      <div className="p-4 space-y-2.5">
        <SummaryRow label="What happened" content={alert.desc} variant="observation" />
        {triageVerdict && (
          <SummaryRow label="Why it was flagged" content={triageVerdict.msg} variant="assessment" />
        )}
        {citationCheck && (
          <SummaryRow label="What the system established" content={citationCheck.msg} variant="observation" />
        )}
        <SummaryRow label="Current operational state" content={statusText} variant="observation" />
      </div>
    </section>
  );
}

function SummaryRow({ label, content, variant }: { label: string; content: string; variant: 'observation' | 'assessment' }) {
  const borderColor = variant === 'assessment' ? 'border-l-amber' : 'border-l-teal';
  const tag = variant === 'assessment' ? 'Agent assessment' : 'System observation';
  const tagClass = variant === 'assessment'
    ? 'text-amber bg-amber/10 border-amber/25'
    : 'text-teal bg-teal/10 border-teal/25';

  return (
    <div className={`panel-inset border-l-2 ${borderColor} px-3.5 py-2.5`}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-xs font-medium text-ivory">{label}</span>
        <span className={`text-[10px] font-mono uppercase tracking-wider border rounded px-1.5 py-0.5 ${tagClass}`}>
          {tag}
        </span>
      </div>
      <p className="text-xs sm:text-sm text-secondary leading-relaxed">{content}</p>
    </div>
  );
}

/* ── Evidence Spine (signature feature) ──────────────────────────── */
function EvidenceSpine({ alert, events }: { alert: Alert; events: AuditEvent[] }) {
  const spine = useMemo(() => buildSpine(events, alert), [events, alert]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const completedCount = spine.filter(s => s.status === 'completed').length;

  const toggle = (stage: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(stage)) next.delete(stage); else next.add(stage);
      return next;
    });
  };

  return (
    <section className="panel-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-ink/40 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-ivory">Evidence Spine</h2>
          <p className="text-[11px] text-tertiary">Click any completed stage to inspect raw audit trace entries</p>
        </div>
        <span className="text-[11px] font-mono text-secondary bg-surface border border-border-subtle rounded px-2 py-0.5 tabular-nums">
          {completedCount}/{spine.length} stages
        </span>
      </div>

      <div className="p-4 relative">
        <div className="relative">
          <div className="absolute left-[11px] top-3 bottom-3 w-px bg-border" />
          <div className="space-y-1">
            {spine.map((entry) => (
              <SpineNode
                key={entry.stage}
                entry={entry}
                isExpanded={expanded.has(entry.stage)}
                onToggle={() => toggle(entry.stage)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SpineNode({ entry, isExpanded, onToggle }: {
  entry: SpineEntry;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const nodeColors: Record<SpineEntry['status'], string> = {
    completed: 'bg-teal border-teal',
    active:    'bg-amber border-amber animate-pulse',
    pending:   'bg-ink-deep border-secondary/60',
    skipped:   'bg-ink-deep border-tertiary/50',
  };

  const textColors: Record<SpineEntry['status'], string> = {
    completed: 'text-ivory',
    active:    'text-amber',
    pending:   'text-secondary',
    skipped:   'text-tertiary line-through',
  };

  const hasEvents = entry.events.length > 0;

  return (
    <div className="relative pl-8 pb-3 last:pb-0">
      <div
        className={`absolute left-[7px] top-2 w-[9px] h-[9px] rounded-full border-2 ${nodeColors[entry.status]}`}
      />

      <button
        onClick={hasEvents ? onToggle : undefined}
        className={`w-full text-left flex items-center gap-2.5 rounded-md px-2.5 py-1.5 transition-colors ${
          hasEvents ? 'hover:bg-surface-hover/55 cursor-pointer' : 'cursor-default'
        }`}
        disabled={!hasEvents}
      >
        <span className={`text-xs sm:text-sm font-medium ${textColors[entry.status]}`}>
          {entry.label}
        </span>
        {entry.ts && (
          <span className="text-[11px] font-mono text-tertiary tabular-nums">
            {formatEpochShort(entry.ts)}
          </span>
        )}
        <span className="text-[10px] font-mono text-tertiary bg-ink-deep/80 border border-border-subtle rounded px-1.5 py-0.5 hidden sm:inline">
          {AGENT_LABELS[entry.agent as keyof typeof AGENT_LABELS] ?? entry.agent}
        </span>
        <span className="flex-1" />
        <span className="text-[10px] font-mono uppercase tracking-wider">
          {entry.status === 'completed' && <span className="text-teal">Done</span>}
          {entry.status === 'active' && <span className="text-amber">Active</span>}
          {entry.status === 'pending' && <span className="text-tertiary">Pending</span>}
          {entry.status === 'skipped' && <span className="text-tertiary">Skipped</span>}
        </span>
        {hasEvents && (
          isExpanded
            ? <ChevronDown size={13} className="text-tertiary shrink-0" />
            : <ChevronRight size={13} className="text-tertiary shrink-0" />
        )}
      </button>

      {entry.detail && !isExpanded && (
        <p className="text-xs text-secondary px-2.5 mt-0.5 truncate">{entry.detail}</p>
      )}

      {isExpanded && hasEvents && (
        <div className="mt-2 ml-2.5 panel-inset divide-y divide-border-subtle overflow-hidden">
          {entry.events.map((e, i) => (
            <div key={`${e.ts}-${i}`} className="px-3 py-2 flex items-center gap-2.5 text-xs">
              <span className="font-mono text-[11px] text-tertiary w-16 shrink-0 tabular-nums">
                {formatEpochShort(e.ts)}
              </span>
              <span className="text-secondary w-16 shrink-0 truncate font-mono text-[11px]">{e.agent}</span>
              <span className={`font-mono text-[10px] border rounded px-1.5 py-0.5 shrink-0 ${kindColor(e.kind)}`}>
                {e.kind}
              </span>
              <span className="text-ivory-dim truncate">{e.msg}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Evidence Explorer ───────────────────────────────────────────── */
function EvidenceExplorer({ events }: { events: AuditEvent[] }) {
  const timeline = useMemo(() => deriveTimeline(events), [events]);
  const citationCheck = events.find(e => e.agent === 'forensics' && e.kind === 'citation_check');
  const securityEvents = useMemo(
    () => events.filter(e => ['injection_quarantined', 'tool_denied', 'red_team'].includes(e.kind)),
    [events],
  );

  return (
    <section className="panel-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-ink/40 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ivory">Evidence Explorer</h2>
        {citationCheck && (
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 text-teal font-medium bg-teal/10 border border-teal/25 rounded-full px-2 py-0.5 text-[11px]">
              <CheckCircle2 size={11} />
              Provenance validated
            </span>
            <span className="text-[10px] font-mono text-tertiary border border-border rounded px-1.5 py-0.5">
              Rule-based
            </span>
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Guardrail / Prompt-injection events */}
        {securityEvents.length > 0 && (
          <div className="rounded-lg border border-vermilion/35 bg-vermilion/[0.06] p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-vermilion">
              <Lock size={13} />
              Security Guardrail Activations ({securityEvents.length})
            </div>
            <div className="space-y-1.5">
              {securityEvents.map((e, idx) => (
                <div key={`${e.ts}-${idx}`} className="flex items-baseline gap-2 text-xs">
                  <span className="font-mono text-[10px] uppercase border border-vermilion/35 bg-vermilion/10 text-vermilion rounded px-1.5 py-0.5 shrink-0">
                    {e.kind}
                  </span>
                  <span className="text-ivory-dim">{e.msg}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {timeline.length === 0 && !citationCheck ? (
          <EmptyState
            icon={<FileSearch size={20} strokeWidth={1.5} />}
            title="No forensic evidence collected"
            description="This alert was closed as benign noise during triage — deep host log forensics were skipped."
          />
        ) : (
          <>
            {citationCheck && (
              <p className="text-xs text-secondary">{citationCheck.msg}</p>
            )}

            {timeline.length > 0 && (
              <div className="panel-inset overflow-x-auto scrollbar-thin">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border-subtle bg-surface/40 text-[10px] font-mono text-tertiary uppercase tracking-wider">
                      <th className="text-left py-2 px-3 font-medium w-16">Log ID</th>
                      <th className="text-left py-2 px-3 font-medium w-16">Offset</th>
                      <th className="text-left py-2 px-3 font-medium w-32">Event Type</th>
                      <th className="text-left py-2 px-3 font-medium">Telemetry Payload</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle/70">
                    {timeline.map((line, i) => {
                      const match = line.match(/^(L\d+)\s+t\+(\d+)m\s+(\S+):\s+(.+)$/);
                      if (!match) {
                        return (
                          <tr key={i}>
                            <td colSpan={4} className="px-3 py-2 font-mono text-secondary">{line}</td>
                          </tr>
                        );
                      }
                      const [, logId, offset, eventType, desc] = match;
                      return (
                        <tr key={i} className="hover:bg-surface-hover/40 transition-colors">
                          <td className="py-2 px-3 font-mono text-teal whitespace-nowrap">{logId}</td>
                          <td className="py-2 px-3 font-mono text-tertiary whitespace-nowrap">t+{offset}m</td>
                          <td className="py-2 px-3 font-mono text-ivory-dim whitespace-nowrap">{eventType}</td>
                          <td className="py-2 px-3 text-secondary">{desc}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

/* ── Generated Incident Report Panel ─────────────────────────────── */
function IncidentReportPanel({ report }: { report: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <section className="panel-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-ink/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-teal" />
          <h2 className="text-sm font-semibold text-ivory">Generated Incident Report</h2>
        </div>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-secondary hover:text-ivory bg-surface/60 border border-border rounded px-2 py-1 transition-colors cursor-pointer"
        >
          {copied ? <Check size={12} className="text-teal" /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="p-4">
        <pre className="panel-inset p-3.5 text-xs font-mono text-ivory-dim whitespace-pre-wrap leading-relaxed overflow-x-auto">
          {report}
        </pre>
      </div>
    </section>
  );
}

/* ── Agent Activity sidebar ──────────────────────────────────────── */
function AgentActivity({ events }: { events: AuditEvent[] }) {
  const statuses = useMemo(
    () => deriveAgentStatuses(events, [...INVESTIGATION_AGENTS]),
    [events],
  );
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (agent: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(agent)) next.delete(agent); else next.add(agent);
      return next;
    });
  };

  return (
    <section className="panel-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-ink/40 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ivory flex items-center gap-2">
          <Bot size={14} className="text-blue" />
          Agent Activity
        </h2>
        <span className="text-[10px] font-mono text-tertiary uppercase">4 Bounded Agents</span>
      </div>

      <div className="p-3 space-y-2">
        {statuses.map(s => {
          const Icon = AGENT_ICONS[s.agent] ?? Shield;
          const dotColor = s.eventCount === 0 ? 'bg-tertiary'
            : s.hasErrors ? 'bg-vermilion'
            : ['verdict', 'proposal', 'timeline', 'citation_check'].includes(s.lastKind) ? 'bg-teal'
            : 'bg-amber';
          const isOpen = expanded.has(s.agent);
          const agentEvents = events.filter(e => e.agent === s.agent);

          return (
            <div key={s.agent} className="panel-inset overflow-hidden">
              <button
                onClick={() => toggle(s.agent)}
                className="w-full px-3 py-2.5 flex items-center gap-2 text-left hover:bg-surface-hover/50 transition-colors cursor-pointer"
              >
                <Icon size={14} className="text-secondary shrink-0" />
                <span className={`w-2 h-2 rounded-full ${dotColor} shrink-0`} />
                <span className="text-xs font-medium text-ivory flex-1 truncate">{s.label}</span>
                <span className="text-[10px] font-mono text-tertiary tabular-nums">{s.eventCount} ev</span>
                {s.hasErrors && <AlertTriangle size={11} className="text-vermilion shrink-0" />}
                {isOpen
                  ? <ChevronDown size={13} className="text-tertiary shrink-0" />
                  : <ChevronRight size={13} className="text-tertiary shrink-0" />}
              </button>
              {!isOpen && s.lastMsg && (
                <p className="px-3 pb-2.5 text-[11px] text-tertiary truncate">{s.lastMsg}</p>
              )}
              {isOpen && agentEvents.length > 0 && (
                <div className="border-t border-border-subtle divide-y divide-border-subtle max-h-52 overflow-y-auto scrollbar-thin bg-ink-deep/60">
                  {agentEvents.map((e, i) => (
                    <div key={`${e.ts}-${i}`} className="px-3 py-1.5 text-[11px] flex items-center gap-2">
                      <span className="font-mono text-tertiary w-14 shrink-0 tabular-nums">{formatEpochShort(e.ts)}</span>
                      <span className={`font-mono text-[10px] border rounded px-1 shrink-0 ${kindColor(e.kind)}`}>{e.kind}</span>
                      <span className="text-secondary truncate">{e.msg}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ── Threat Intelligence sidebar ─────────────────────────────────── */
function ThreatIntel({ events }: { events: AuditEvent[] }) {
  const intel = useMemo(() => deriveIntel(events), [events]);

  return (
    <section className="panel-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-ink/40 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ivory flex items-center gap-2">
          <Network size={14} className="text-amber" />
          Threat Intelligence
        </h2>
        <span className="text-[10px] font-mono text-tertiary border border-border-subtle rounded px-1.5 py-0.5">
          Simulated
        </span>
      </div>

      <div className="p-4">
        {!intel ? (
          <p className="text-xs text-tertiary">No threat intelligence enrichment recorded for this alert.</p>
        ) : (
          <div className="space-y-3.5">
            {intel.ip && (
              <div className="panel-inset px-3 py-2 flex items-center justify-between">
                <span className="text-[10px] font-mono text-tertiary uppercase tracking-wider">Indicator IP</span>
                <span className="font-mono text-xs text-ivory font-medium">{intel.ip}</span>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono text-tertiary uppercase tracking-wider">AbuseIPDB Confidence</span>
                <span className={`font-mono text-xs font-semibold tabular-nums ${
                  intel.abuseipdb >= 80 ? 'text-vermilion' : intel.abuseipdb >= 50 ? 'text-amber' : 'text-teal'
                }`}>
                  {intel.abuseipdb}/100
                </span>
              </div>
              <div className="w-full h-2 bg-ink-deep rounded-full overflow-hidden border border-border-subtle">
                <div
                  className={`h-full rounded-full transition-all ${
                    intel.abuseipdb >= 80 ? 'bg-vermilion'
                    : intel.abuseipdb >= 50 ? 'bg-amber'
                    : 'bg-teal'
                  }`}
                  style={{ width: `${intel.abuseipdb}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="panel-inset px-3 py-2">
                <span className="text-[10px] font-mono text-tertiary uppercase tracking-wider">OTX Pulses</span>
                <p className="font-mono text-base text-ivory mt-0.5 tabular-nums">{intel.otxPulses}</p>
              </div>
              <div className="panel-inset px-3 py-2">
                <span className="text-[10px] font-mono text-tertiary uppercase tracking-wider">Reputation</span>
                <p className={`text-xs font-medium mt-1 ${
                  intel.abuseipdb >= 80 ? 'text-vermilion' : intel.abuseipdb >= 50 ? 'text-amber' : 'text-teal'
                }`}>
                  {intel.abuseipdb >= 80 ? 'Known Malicious' : intel.abuseipdb >= 50 ? 'Suspicious' : 'Benign / Clean'}
                </p>
              </div>
            </div>

            {intel.tags.length > 0 && (
              <div>
                <span className="text-[10px] font-mono text-tertiary uppercase tracking-wider">Threat Tags</span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {intel.tags.map(tag => (
                    <span key={tag} className="text-[11px] font-mono text-secondary bg-ink-deep/80 border border-border rounded px-2 py-0.5">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {intel.mitreId && intel.mitreId !== 'n/a' && (
              <div className="panel-inset px-3 py-2.5 border-l-2 border-l-amber">
                <span className="text-[10px] font-mono text-tertiary uppercase tracking-wider">MITRE ATT&amp;CK Mapping</span>
                <p className="text-xs mt-1">
                  <span className="font-mono font-semibold text-amber">{intel.mitreId}</span>
                  <span className="text-ivory-dim ml-2">{intel.mitreName}</span>
                </p>
              </div>
            )}

            <p className="text-[10px] text-tertiary italic pt-1 border-t border-border-subtle">
              Source: Simulated local lookup (rule-based reputation dataset)
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

/* ── Response Recommendations sidebar ────────────────────────────── */
function ResponseRecommendations({
  events,
  pendingRequests,
  submittingKey,
  onDecision,
}: {
  events: AuditEvent[];
  pendingRequests: ApprovalRequest[];
  submittingKey: string | null;
  onDecision: (req: ApprovalRequest, ok: boolean) => void;
}) {
  const actions = useMemo(() => deriveActions(events), [events]);

  return (
    <section className="panel-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-ink/40 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ivory flex items-center gap-2">
          <ShieldCheck size={14} className="text-teal" />
          Response Actions
        </h2>
        <span className="text-[10px] font-mono text-tertiary">
          {actions.length} proposed
        </span>
      </div>

      <div className="p-3">
        {actions.length === 0 ? (
          <p className="text-xs text-tertiary p-1">No response actions proposed for this alert.</p>
        ) : (
          <div className="space-y-2">
            {actions.map((action: DerivedAction, i: number) => {
              const matchingPending = action.approved === null && !action.autoRun
                ? pendingRequests.find(r => r.action === action.name)
                : undefined;
              const isBusy = matchingPending ? submittingKey === matchingPending.key : false;

              return (
                <div key={`${action.name}-${i}`} className="panel-inset px-3 py-2.5 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-medium text-ivory">{action.name}</span>
                    <ActionStatusBadge action={action} />
                    <span className="flex-1" />
                    <span className="text-[10px] font-mono text-tertiary border border-border-subtle rounded px-1.5 py-0.5">
                      Simulated
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 text-[11px]">
                    {Object.entries(action.args).map(([k, v]) => (
                      <span key={k} className="font-mono text-tertiary bg-surface/60 border border-border-subtle rounded px-1.5 py-0.5">
                        {k}=<span className="text-ivory-dim">{String(v)}</span>
                      </span>
                    ))}
                  </div>

                  {matchingPending && (
                    <div className="flex items-center gap-2 pt-1.5 border-t border-border-subtle">
                      <button
                        onClick={() => onDecision(matchingPending, true)}
                        disabled={isBusy}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold bg-teal hover:bg-teal-dim text-ink rounded-md transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <CheckCircle2 size={12} />
                        Approve
                      </button>
                      <button
                        onClick={() => onDecision(matchingPending, false)}
                        disabled={isBusy}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium bg-vermilion/90 hover:bg-vermilion text-white rounded-md transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <XCircle size={12} />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function ActionStatusBadge({ action }: { action: DerivedAction }) {
  if (action.autoRun) {
    return <span className="text-[10px] font-mono text-teal bg-teal/10 border border-teal/30 rounded-full px-2 py-0.5">Auto-executed</span>;
  }
  if (action.approved === true) {
    return <span className="text-[10px] font-mono text-teal bg-teal/10 border border-teal/30 rounded-full px-2 py-0.5">Approved</span>;
  }
  if (action.approved === false) {
    return <span className="text-[10px] font-mono text-vermilion bg-vermilion/10 border border-vermilion/30 rounded-full px-2 py-0.5">Rejected</span>;
  }
  return <span className="text-[10px] font-mono text-amber bg-amber/12 border border-amber/30 rounded-full px-2 py-0.5">Pending approval</span>;
}
