/* ── Investigation Workspace — the centrepiece of DefenceIQ ─────── */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Navigate, Link } from 'react-router';
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
} from 'lucide-react';
import { useLive } from '../state/LiveStore';
import { fetchAudit } from '../services/api';
import type { AuditEvent } from '../types';
import { AGENT_LABELS, INVESTIGATION_AGENTS } from '../types';
import { SeverityBadge } from '../components/SeverityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingState, ErrorState, EmptyState } from '../components/StateIndicators';
import {
  buildSpine,
  deriveIntel,
  deriveTimeline,
  deriveActions,
  deriveAgentStatuses,
  type SpineEntry,
  type DerivedAction,
} from '../lib/derive';
import { formatEpochShort } from '../lib/format';

/* ── Kind → color mapping ────────────────────────────────────────── */
function kindColor(kind: string): string {
  switch (kind) {
    case 'tool_call': return 'border-blue/40 text-blue';
    case 'verdict': return 'border-teal/40 text-teal';
    case 'tool_denied':
    case 'injection_quarantined':
    case 'red_team': return 'border-vermilion/40 text-vermilion';
    case 'approval_required': return 'border-amber/40 text-amber';
    case 'citation_check':
    case 'timeline': return 'border-teal/40 text-teal';
    case 'approved': return 'border-teal/40 text-teal';
    case 'rejected':
    case 'rejected_by_analyst': return 'border-vermilion/40 text-vermilion';
    default: return 'border-border text-secondary';
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
  const { alerts, audit: globalAudit } = useLive();
  const [localAudit, setLocalAudit] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch alert-specific audit events
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

  // Merge WS events for this alert
  const alertEvents = useMemo(() => {
    const fromGlobal = globalAudit.filter(e => e.alert_id === alertId);
    const localKeys = new Set(localAudit.map(e => `${e.ts}|${e.kind}|${e.msg}`));
    const newFromWs = fromGlobal.filter(e => !localKeys.has(`${e.ts}|${e.kind}|${e.msg}`));
    return [...localAudit, ...newFromWs].sort((a, b) => a.ts - b.ts);
  }, [localAudit, globalAudit, alertId]);

  if (!alertId) return <Navigate to="/incidents" replace />;

  const alert = alerts.find(a => a.id === alertId);

  if (loading && localAudit.length === 0) return <LoadingState message="Loading investigation…" />;
  if (!alert && alerts.length > 0) return <ErrorState message={`Alert ${alertId} not found`} onRetry={loadAudit} />;
  if (!alert) return <LoadingState message="Waiting for alert data…" />;

  return (
    <div className="space-y-5">
      {/* ── Incident Header ──────────────────────────────────────── */}
      <IncidentHeader alert={alert} />

      {/* ── Two-column layout ────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-5">
        {/* LEFT COLUMN */}
        <div className="space-y-5 min-w-0">
          <InvestigationSummary alert={alert} events={alertEvents} />
          <EvidenceSpine alert={alert} events={alertEvents} />
          <EvidenceExplorer events={alertEvents} />
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-5">
          <AgentActivity events={alertEvents} />
          <ThreatIntel events={alertEvents} />
          <ResponseRecommendations events={alertEvents} />
        </div>
      </div>

      {error && <p className="text-xs text-vermilion">{error}</p>}
    </div>
  );
}

/* ── Incident Header ─────────────────────────────────────────────── */
function IncidentHeader({ alert }: { alert: NonNullable<ReturnType<typeof useLive>['alerts'][number]> }) {
  return (
    <header className="border border-border rounded-lg p-4">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className="font-mono text-xs text-tertiary">{alert.id}</span>
        <SeverityBadge severity={alert.severity} />
        <StatusBadge status={alert.status} />
      </div>
      <h2 className="text-lg font-serif text-ivory text-balance leading-snug mb-3">
        {alert.desc}
      </h2>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs">
        <MetaField label="Source IP" value={alert.src_ip} mono />
        <MetaField label="Host" value={alert.host} mono />
        <MetaField label="User" value={alert.user || '—'} />
        <MetaField label="Type" value={alert.type} mono />
        <MetaField label="Scenario offset" value={`t+${alert.t}m`} mono />
        {alert.confidence != null && (
          <div className="flex items-center gap-1.5">
            <span className="text-tertiary">Confidence</span>
            <div className="w-16 h-1.5 bg-surface rounded-full overflow-hidden">
              <div
                className="h-full bg-amber rounded-full"
                style={{ width: `${Math.round(alert.confidence * 100)}%` }}
              />
            </div>
            <span className="font-mono text-secondary">{Math.round(alert.confidence * 100)}%</span>
          </div>
        )}
      </div>
    </header>
  );
}

function MetaField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-tertiary">{label}</span>
      <span className={`text-secondary ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

/* ── Investigation Summary ───────────────────────────────────────── */
function InvestigationSummary({ alert, events }: { alert: NonNullable<ReturnType<typeof useLive>['alerts'][number]>; events: AuditEvent[] }) {
  const triageVerdict = events.find(e => e.agent === 'triage' && e.kind === 'verdict');
  const citationCheck = events.find(e => e.agent === 'forensics' && e.kind === 'citation_check');

  let uncertainty = 'Investigation in progress.';
  if (alert.status === 'awaiting_approval') uncertainty = 'Pending analyst decision on proposed response actions.';
  else if (alert.status === 'closed_noise') uncertainty = 'Closed as noise during triage — no further investigation required.';
  else if (alert.status === 'resolved') uncertainty = 'Investigation completed and actions resolved.';

  return (
    <section>
      <h3 className="text-sm font-medium text-ivory mb-3">Investigation Summary</h3>
      <div className="space-y-2">
        <SummaryRow
          label="What happened"
          content={alert.desc}
          variant="observation"
        />
        {triageVerdict && (
          <SummaryRow
            label="Why it was flagged"
            content={triageVerdict.msg}
            variant="assessment"
          />
        )}
        {citationCheck && (
          <SummaryRow
            label="What the system established"
            content={citationCheck.msg}
            variant="observation"
          />
        )}
        <SummaryRow
          label="Current status"
          content={uncertainty}
          variant="observation"
        />
      </div>
    </section>
  );
}

function SummaryRow({ label, content, variant }: { label: string; content: string; variant: 'observation' | 'assessment' }) {
  const borderColor = variant === 'assessment' ? 'border-l-amber' : 'border-l-teal';
  const tag = variant === 'assessment' ? 'Agent assessment' : 'System observation';
  const tagColor = variant === 'assessment' ? 'text-amber' : 'text-teal';

  return (
    <div className={`border-l-2 ${borderColor} pl-3 py-1.5`}>
      <div className="flex items-center gap-2 mb-0.5">
        <span className="text-xs font-medium text-ivory">{label}</span>
        <span className={`text-[10px] ${tagColor} uppercase tracking-wider`}>{tag}</span>
      </div>
      <p className="text-sm text-secondary">{content}</p>
    </div>
  );
}

/* ── Evidence Spine (signature feature) ──────────────────────────── */
function EvidenceSpine({ alert, events }: { alert: NonNullable<ReturnType<typeof useLive>['alerts'][number]>; events: AuditEvent[] }) {
  const spine = useMemo(() => buildSpine(events, alert), [events, alert]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (stage: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(stage)) next.delete(stage); else next.add(stage);
      return next;
    });
  };

  return (
    <section>
      <h3 className="text-sm font-medium text-ivory mb-3">Evidence Spine</h3>
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[11px] top-3 bottom-3 w-px bg-border-subtle" />

        <div className="space-y-0">
          {spine.map((entry, i) => (
            <SpineNode
              key={entry.stage}
              entry={entry}
              isLast={i === spine.length - 1}
              isExpanded={expanded.has(entry.stage)}
              onToggle={() => toggle(entry.stage)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function SpineNode({ entry, isLast: _isLast, isExpanded, onToggle }: {
  entry: SpineEntry;
  isLast: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const nodeColors: Record<SpineEntry['status'], string> = {
    completed: 'bg-teal border-teal',
    active: 'bg-amber border-amber animate-pulse',
    pending: 'bg-transparent border-secondary',
    skipped: 'bg-transparent border-tertiary',
  };

  const textColors: Record<SpineEntry['status'], string> = {
    completed: 'text-ivory',
    active: 'text-amber',
    pending: 'text-secondary',
    skipped: 'text-tertiary line-through',
  };

  const hasEvents = entry.events.length > 0;

  return (
    <div className="relative pl-8 pb-3">
      {/* Node dot */}
      <div
        className={`absolute left-[7px] top-1 w-[9px] h-[9px] rounded-full border-2 ${nodeColors[entry.status]}`}
      />

      {/* Content */}
      <button
        onClick={hasEvents ? onToggle : undefined}
        className={`w-full text-left flex items-center gap-2 group ${hasEvents ? 'cursor-pointer' : 'cursor-default'}`}
        disabled={!hasEvents}
      >
        <span className={`text-sm font-medium ${textColors[entry.status]}`}>
          {entry.label}
        </span>
        {entry.ts && (
          <span className="text-[11px] font-mono text-tertiary">
            {formatEpochShort(entry.ts)}
          </span>
        )}
        <span className="text-[10px] text-tertiary capitalize">
          {AGENT_LABELS[entry.agent as keyof typeof AGENT_LABELS] ?? entry.agent}
        </span>
        <span className="flex-1" />
        {entry.status === 'completed' && <span className="text-[10px] text-teal">✓</span>}
        {entry.status === 'active' && <span className="text-[10px] text-amber">◆</span>}
        {entry.status === 'pending' && <span className="text-[10px] text-secondary">○</span>}
        {entry.status === 'skipped' && <span className="text-[10px] text-tertiary">—</span>}
        {hasEvents && (
          isExpanded
            ? <ChevronDown size={12} className="text-tertiary" />
            : <ChevronRight size={12} className="text-tertiary" />
        )}
      </button>

      {entry.detail && !isExpanded && (
        <p className="text-xs text-secondary mt-0.5 truncate">{entry.detail}</p>
      )}

      {/* Expanded events */}
      {isExpanded && hasEvents && (
        <div className="mt-2 border border-border rounded divide-y divide-border-subtle">
          {entry.events.map((e, i) => (
            <div key={`${e.ts}-${i}`} className="px-3 py-1.5 flex gap-2 text-xs">
              <span className="font-mono text-tertiary w-16 shrink-0">{formatEpochShort(e.ts)}</span>
              <span className="text-secondary w-14 shrink-0">{e.agent}</span>
              <span className={`font-mono border rounded px-1 py-0 shrink-0 ${kindColor(e.kind)}`}>
                {e.kind}
              </span>
              <span className="text-secondary truncate">{e.msg}</span>
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

  if (timeline.length === 0 && !citationCheck) {
    return (
      <section>
        <h3 className="text-sm font-medium text-ivory mb-3">Evidence Explorer</h3>
        <EmptyState
          icon={<FileSearch size={24} strokeWidth={1} />}
          title="No forensic evidence"
          description="Alert was closed during triage — no forensic investigation was performed."
        />
      </section>
    );
  }

  return (
    <section>
      <h3 className="text-sm font-medium text-ivory mb-3">Evidence Explorer</h3>

      {citationCheck && (
        <div className="flex items-center gap-2 mb-3 text-xs">
          <span className="text-teal">✓ Provenance validated</span>
          <span className="text-tertiary">—</span>
          <span className="text-secondary">{citationCheck.msg}</span>
          <span className="text-[10px] text-tertiary border border-border rounded px-1">Rule-based</span>
        </div>
      )}

      {timeline.length > 0 && (
        <div className="border border-border rounded divide-y divide-border-subtle">
          {timeline.map((line, i) => {
            const match = line.match(/^(L\d+)\s+t\+(\d+)m\s+(\S+):\s+(.+)$/);
            if (!match) return (
              <div key={i} className="px-3 py-1.5 text-xs text-secondary font-mono">{line}</div>
            );
            const [, logId, offset, eventType, desc] = match;
            return (
              <div key={i} className="px-3 py-1.5 flex gap-3 text-xs items-baseline">
                <span className="font-mono text-teal w-10 shrink-0">{logId}</span>
                <span className="font-mono text-tertiary w-12 shrink-0">t+{offset}m</span>
                <span className="font-mono text-secondary w-24 shrink-0">{eventType}</span>
                <span className="text-secondary">{desc}</span>
              </div>
            );
          })}
        </div>
      )}
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
    <section>
      <h3 className="text-sm font-medium text-ivory mb-3 flex items-center gap-1.5">
        <Bot size={14} className="text-secondary" />
        Agent Activity
      </h3>
      <div className="space-y-2">
        {statuses.map(s => {
          const Icon = AGENT_ICONS[s.agent] ?? Shield;
          const dotColor = s.eventCount === 0 ? 'bg-tertiary'
            : s.hasErrors ? 'bg-vermilion'
            : ['verdict', 'proposal', 'timeline', 'citation_check'].includes(s.lastKind) ? 'bg-teal'
            : 'bg-amber';
          const isOpen = expanded.has(s.agent);
          const agentEvents = events.filter(e => e.agent === s.agent);

          return (
            <div key={s.agent} className="border border-border rounded">
              <button
                onClick={() => toggle(s.agent)}
                className="w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-surface-hover transition-colors"
              >
                <Icon size={14} className="text-secondary shrink-0" />
                <span className={`w-2 h-2 rounded-full ${dotColor} shrink-0`} />
                <span className="text-xs font-medium text-ivory flex-1">{s.label}</span>
                <span className="text-[10px] font-mono text-tertiary">{s.eventCount} events</span>
                {s.hasErrors && <AlertTriangle size={10} className="text-vermilion" />}
                {isOpen ? <ChevronDown size={12} className="text-tertiary" /> : <ChevronRight size={12} className="text-tertiary" />}
              </button>
              {!isOpen && s.lastMsg && (
                <p className="px-3 pb-2 text-[11px] text-tertiary truncate">{s.lastMsg}</p>
              )}
              {isOpen && agentEvents.length > 0 && (
                <div className="border-t border-border-subtle divide-y divide-border-subtle max-h-48 overflow-y-auto scrollbar-thin">
                  {agentEvents.map((e, i) => (
                    <div key={`${e.ts}-${i}`} className="px-3 py-1.5 text-[11px] flex gap-2">
                      <span className="font-mono text-tertiary w-16 shrink-0">{formatEpochShort(e.ts)}</span>
                      <span className={`font-mono border rounded px-1 shrink-0 ${kindColor(e.kind)}`}>{e.kind}</span>
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
    <section>
      <h3 className="text-sm font-medium text-ivory mb-3 flex items-center gap-1.5">
        <Network size={14} className="text-secondary" />
        Threat Intelligence
      </h3>
      {!intel ? (
        <p className="text-xs text-tertiary">No enrichment data available for this alert.</p>
      ) : (
        <div className="border border-border rounded p-3 space-y-3">
          {intel.ip && (
            <div>
              <span className="text-[10px] text-tertiary uppercase tracking-wider">IP Address</span>
              <p className="font-mono text-sm text-ivory">{intel.ip}</p>
            </div>
          )}
          <div>
            <span className="text-[10px] text-tertiary uppercase tracking-wider">AbuseIPDB Score</span>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    intel.abuseipdb >= 80 ? 'bg-vermilion'
                    : intel.abuseipdb >= 50 ? 'bg-amber'
                    : 'bg-teal'
                  }`}
                  style={{ width: `${intel.abuseipdb}%` }}
                />
              </div>
              <span className="font-mono text-xs text-secondary">{intel.abuseipdb}/100</span>
            </div>
          </div>
          <div className="flex gap-4">
            <div>
              <span className="text-[10px] text-tertiary uppercase tracking-wider">OTX Pulses</span>
              <p className="font-mono text-sm text-ivory">{intel.otxPulses}</p>
            </div>
            {intel.tags.length > 0 && (
              <div className="flex-1">
                <span className="text-[10px] text-tertiary uppercase tracking-wider">Tags</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {intel.tags.map(tag => (
                    <span key={tag} className="text-[10px] font-mono text-secondary border border-border rounded px-1.5 py-0.5">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          {intel.mitreId && intel.mitreId !== 'n/a' && (
            <div>
              <span className="text-[10px] text-tertiary uppercase tracking-wider">MITRE ATT&CK</span>
              <p className="text-sm">
                <span className="font-mono text-amber">{intel.mitreId}</span>
                <span className="text-secondary ml-1.5">{intel.mitreName}</span>
              </p>
            </div>
          )}
          <p className="text-[10px] text-tertiary italic">
            Source: Simulated local lookup (rule-based)
          </p>
        </div>
      )}
    </section>
  );
}

/* ── Response Recommendations sidebar ────────────────────────────── */
function ResponseRecommendations({ events }: { events: AuditEvent[] }) {
  const actions = useMemo(() => deriveActions(events), [events]);

  return (
    <section>
      <h3 className="text-sm font-medium text-ivory mb-3 flex items-center gap-1.5">
        <ShieldCheck size={14} className="text-secondary" />
        Response Actions
      </h3>
      {actions.length === 0 ? (
        <p className="text-xs text-tertiary">No response actions proposed for this alert.</p>
      ) : (
        <div className="border border-border rounded divide-y divide-border-subtle">
          {actions.map((action: DerivedAction, i: number) => (
            <div key={`${action.name}-${i}`} className="px-3 py-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs text-ivory">{action.name}</span>
                <ActionStatusBadge action={action} />
                <span className="text-[10px] text-tertiary border border-border rounded px-1">Simulated</span>
              </div>
              <div className="flex flex-wrap gap-x-2 text-[11px]">
                {Object.entries(action.args).map(([k, v]) => (
                  <span key={k} className="font-mono text-tertiary">
                    {k}=<span className="text-secondary">{String(v)}</span>
                  </span>
                ))}
              </div>
              {action.approved === null && (
                <Link
                  to="/approvals"
                  className="inline-flex items-center gap-1 text-[11px] text-amber hover:underline mt-1"
                >
                  Review in Approval Desk <ExternalLink size={10} />
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ActionStatusBadge({ action }: { action: DerivedAction }) {
  if (action.autoRun) {
    return <span className="text-[10px] text-teal border border-teal/30 rounded px-1">Auto-executed</span>;
  }
  if (action.approved === true) {
    return <span className="text-[10px] text-teal border border-teal/30 rounded px-1">Approved</span>;
  }
  if (action.approved === false) {
    return <span className="text-[10px] text-vermilion border border-vermilion/30 rounded px-1">Rejected</span>;
  }
  return <span className="text-[10px] text-amber border border-amber/30 rounded px-1">Pending approval</span>;
}
