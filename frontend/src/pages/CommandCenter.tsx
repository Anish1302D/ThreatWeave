/* ── Command Center — analyst's operational starting point ─────────── */

import { useMemo } from 'react';
import { Link } from 'react-router';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  ArrowRight,
} from 'lucide-react';
import { useLive } from '../state/LiveStore';
import type { Alert, AuditEvent } from '../types';
import { isEscalated, severityRank } from '../types';
import { derivePendingApprovals, pendingOnly } from '../lib/derive';
import { formatRelativeTime, truncate } from '../lib/format';
import { SeverityBadge } from '../components/SeverityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/StateIndicators';

/* ── Pipeline stage definitions ──────────────────────────────────── */

interface PipelineStage {
  key: string;
  label: string;
  agents: string[];
}

const PIPELINE_STAGES: PipelineStage[] = [
  { key: 'ingest',   label: 'Ingest',   agents: ['ingest'] },
  { key: 'triage',   label: 'Triage',   agents: ['triage'] },
  { key: 'intel',    label: 'Intel',     agents: ['intel'] },
  { key: 'forensics',label: 'Forensics', agents: ['forensics'] },
  { key: 'response', label: 'Response',  agents: ['response'] },
  { key: 'approval', label: 'Approval',  agents: ['gate', 'analyst'] },
  { key: 'audit',    label: 'Audit',     agents: ['system'] },
];

/* ── Helpers ─────────────────────────────────────────────────────── */

function stageStatus(stage: PipelineStage, audit: AuditEvent[]): 'completed' | 'active' | 'pending' {
  const matching = audit.filter(e => stage.agents.includes(e.agent));
  if (matching.length === 0) return 'pending';
  // Check if a later stage has events → this one is completed
  const lastTs = matching[matching.length - 1]!.ts;
  const hasLaterEvents = audit.some(e => !stage.agents.includes(e.agent) && e.ts > lastTs);
  return hasLaterEvents ? 'completed' : 'active';
}

const STATUS_DOT: Record<string, string> = {
  completed: 'bg-teal',
  active:    'bg-amber animate-pulse',
  pending:   'bg-secondary/30',
};

/* ── Component ───────────────────────────────────────────────────── */

export function CommandCenter() {
  const { alerts, audit } = useLive();

  const stats = useMemo(() => {
    const total = alerts.length;
    const escalated = alerts.filter(isEscalated).length;
    const pending = pendingOnly(derivePendingApprovals(audit)).length;
    const resolved = alerts.filter((a: Alert) => a.status === 'resolved').length;
    return { total, escalated, pending, resolved };
  }, [alerts, audit]);

  const recentAlerts = useMemo(() => {
    return [...alerts]
      .filter((a: Alert) => a.status !== 'closed_noise')
      .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
      .slice(0, 5);
  }, [alerts]);

  const recentAudit = useMemo(() => {
    return [...audit]
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 8);
  }, [audit]);

  const pipelineStatuses = useMemo(() => {
    return PIPELINE_STAGES.map(stage => ({
      ...stage,
      status: stageStatus(stage, audit),
    }));
  }, [audit]);

  return (
    <div className="space-y-6">
      {/* ── Page heading ─────────────────────────────────────────── */}
      <header>
        <h1 className="text-xl font-serif text-ivory">Command Center</h1>
        <p className="text-sm text-secondary mt-0.5">
          Operational overview of the DefenceIQ pipeline
        </p>
      </header>

      {/* ── Scenario status ──────────────────────────────────────── */}
      <div className="border border-border rounded px-4 py-2.5 text-sm">
        {alerts.length === 0 ? (
          <span className="text-secondary">
            No scenario data.{' '}
            <Link to="/scenario" className="text-blue hover:underline">
              Launch a simulated attack from the Scenario Lab
            </Link>
            .
          </span>
        ) : (
          <span className="text-teal">
            <Activity size={14} className="inline -mt-0.5 mr-1.5" />
            Scenario active: <span className="font-mono">{alerts.length}</span> alert{alerts.length !== 1 ? 's' : ''} ingested.
          </span>
        )}
      </div>

      {/* ── Top stats row ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px border border-border rounded overflow-hidden">
        <StatCell
          icon={<Activity size={14} className="text-secondary" />}
          label="Total Alerts"
          value={stats.total}
        />
        <StatCell
          icon={<AlertTriangle size={14} className="text-amber" />}
          label="Escalated"
          value={stats.escalated}
        />
        <StatCell
          icon={<ClipboardCheck size={14} className="text-amber" />}
          label="Pending Approvals"
          value={stats.pending}
        />
        <StatCell
          icon={<CheckCircle2 size={14} className="text-teal" />}
          label="Resolved"
          value={stats.resolved}
        />
      </div>

      {/* ── Processing pipeline ──────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-medium text-ivory mb-3">Processing Pipeline</h2>
        <div className="border border-border rounded px-4 py-3 overflow-x-auto">
          <div className="flex items-center gap-0 min-w-[520px]">
            {pipelineStatuses.map((s, i) => (
              <div key={s.key} className="flex items-center">
                <div className="flex flex-col items-center gap-1">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT[s.status]}`}
                    title={s.status}
                  />
                  <span className={`text-[11px] ${s.status === 'pending' ? 'text-tertiary' : 'text-secondary'} whitespace-nowrap`}>
                    {s.label}
                  </span>
                </div>
                {i < pipelineStatuses.length - 1 && (
                  <div className="mx-3 h-px w-8 bg-border" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Two-column main content ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent alerts */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-ivory">Alerts Requiring Attention</h2>
            {alerts.length > 0 && (
              <Link
                to="/incidents"
                className="text-[11px] text-secondary hover:text-ivory flex items-center gap-1 transition-colors"
              >
                View all <ArrowRight size={10} />
              </Link>
            )}
          </div>
          <div className="border border-border rounded divide-y divide-border">
            {recentAlerts.length === 0 ? (
              <EmptyState
                title="No actionable alerts"
                description="All alerts are either unloaded or resolved."
              />
            ) : (
              recentAlerts.map((a: Alert) => (
                <Link
                  key={a.id}
                  to={`/investigation/${a.id}`}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface-hover transition-colors group"
                >
                  <span className="font-mono text-xs text-tertiary w-12 shrink-0">{a.id}</span>
                  <span className="text-sm text-secondary group-hover:text-ivory truncate flex-1 transition-colors">
                    {truncate(a.desc, 64)}
                  </span>
                  <SeverityBadge severity={a.severity} />
                  <StatusBadge status={a.status} />
                </Link>
              ))
            )}
          </div>
        </section>

        {/* Recent audit activity */}
        <section>
          <h2 className="text-sm font-medium text-ivory mb-3">Recent Audit Activity</h2>
          <div className="border border-border rounded divide-y divide-border">
            {recentAudit.length === 0 ? (
              <EmptyState
                title="No audit events"
                description="Audit events will appear once a scenario is running."
              />
            ) : (
              recentAudit.map((e: AuditEvent, i) => (
                <div key={`${e.ts}-${e.kind}-${i}`} className="px-3 py-2 flex gap-3 text-xs">
                  <span className="font-mono text-tertiary w-14 shrink-0">{formatRelativeTime(e.ts)}</span>
                  <span className="text-secondary w-16 shrink-0 truncate">{e.agent}</span>
                  <span className="font-mono text-tertiary w-20 shrink-0 truncate">{e.kind}</span>
                  <span className="text-secondary truncate flex-1">{truncate(e.msg, 80)}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

/* ── Stat cell sub-component ─────────────────────────────────────── */

interface StatCellProps {
  icon: React.ReactNode;
  label: string;
  value: number;
}

function StatCell({ icon, label, value }: StatCellProps) {
  return (
    <div className="bg-surface px-4 py-3 flex items-center gap-3">
      {icon}
      <div>
        <p className="text-lg font-serif text-ivory leading-none">{value}</p>
        <p className="text-[11px] text-tertiary mt-0.5">{label}</p>
      </div>
    </div>
  );
}
