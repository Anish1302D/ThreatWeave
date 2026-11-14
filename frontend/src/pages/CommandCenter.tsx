/* ── Command Center — analyst's operational starting point ─────────── */

import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  ArrowRight,
  Play,
  Loader2,
  ShieldAlert,
  ChevronRight,
  FlaskConical,
  Shield,
  Lock,
} from 'lucide-react';
import { useLive } from '../state/LiveStore';
import { useToasts } from '../state/ToastStore';
import { runScenario, ApiError } from '../services/api';
import type { Alert, AuditEvent } from '../types';
import { isEscalated, severityRank } from '../types';
import { derivePendingApprovals, pendingOnly } from '../lib/derive';
import { formatRelativeTime, truncate } from '../lib/format';
import { SeverityBadge } from '../components/SeverityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/StateIndicators';

/* ── Pipeline stage definitions ──────────────────────────────────── */

interface PipelineStage {
  step: string;
  key: string;
  label: string;
  subtitle: string;
  agents: string[];
}

const PIPELINE_STAGES: PipelineStage[] = [
  { step: '01', key: 'ingest',    label: 'Ingest',    subtitle: 'Payload intake',   agents: ['ingest'] },
  { step: '02', key: 'triage',    label: 'Triage',    subtitle: 'Noise filter',     agents: ['triage'] },
  { step: '03', key: 'intel',     label: 'Intel',     subtitle: 'IOC & MITRE',      agents: ['intel'] },
  { step: '04', key: 'forensics', label: 'Forensics', subtitle: 'Log citations',    agents: ['forensics'] },
  { step: '05', key: 'response',  label: 'Response',  subtitle: 'Action plan',      agents: ['response'] },
  { step: '06', key: 'approval',  label: 'Approval',  subtitle: 'Human gate',       agents: ['gate', 'analyst'] },
  { step: '07', key: 'audit',     label: 'Audit',     subtitle: 'Immutable log',    agents: ['system'] },
];

function stageStatus(stage: PipelineStage, audit: AuditEvent[]): 'completed' | 'active' | 'pending' {
  const matching = audit.filter(e => stage.agents.includes(e.agent));
  if (matching.length === 0) return 'pending';
  const lastTs = matching[matching.length - 1]!.ts;
  const hasLaterEvents = audit.some(e => !stage.agents.includes(e.agent) && e.ts > lastTs);
  return hasLaterEvents ? 'completed' : 'active';
}

function stageEventCount(stage: PipelineStage, audit: AuditEvent[]): number {
  return audit.filter(e => stage.agents.includes(e.agent)).length;
}

function agentBadgeStyle(agent: string): string {
  switch (agent) {
    case 'triage':    return 'text-blue bg-blue/10 border-blue/25';
    case 'intel':     return 'text-amber bg-amber/10 border-amber/25';
    case 'forensics': return 'text-teal bg-teal/10 border-teal/25';
    case 'response':  return 'text-ivory-dim bg-surface border-border';
    case 'gate':      return 'text-amber bg-amber/12 border-amber/30';
    case 'analyst':   return 'text-teal bg-teal/12 border-teal/30';
    default:          return 'text-secondary bg-surface/60 border-border-subtle';
  }
}

/* ── Component ───────────────────────────────────────────────────── */

export function CommandCenter() {
  const { alerts, audit, wsStatus, refreshAlerts, refreshAudit } = useLive();
  const { addToast } = useToasts();
  const [launching, setLaunching] = useState(false);

  const handleLaunch = useCallback(async () => {
    setLaunching(true);
    try {
      const result = await runScenario();
      addToast('success', `Scenario started with ${result.started} alerts`);
      await Promise.all([refreshAlerts(), refreshAudit()]);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        addToast('warning', err.detail);
      } else {
        addToast('error', err instanceof Error ? err.message : 'Failed to launch scenario');
      }
    } finally {
      setLaunching(false);
    }
  }, [addToast, refreshAlerts, refreshAudit]);

  const stats = useMemo(() => {
    const total = alerts.length;
    const escalated = alerts.filter(isEscalated).length;
    const closedNoise = alerts.filter(a => a.status === 'closed_noise').length;
    const pending = pendingOnly(derivePendingApprovals(audit)).length;
    const resolved = alerts.filter((a: Alert) => a.status === 'resolved').length;
    const highSev = alerts.filter(a => a.severity === 'high').length;
    const medSev = alerts.filter(a => a.severity === 'medium').length;
    const lowSev = alerts.filter(a => a.severity === 'low').length;
    const quarantined = audit.filter(e => e.kind === 'injection_quarantined').length;
    const denied = audit.filter(e => e.kind === 'tool_denied').length;
    const uniqueIps = new Set(alerts.map(a => a.src_ip).filter(Boolean)).size;
    const uniqueHosts = new Set(alerts.map(a => a.host).filter(Boolean)).size;
    return {
      total,
      escalated,
      closedNoise,
      pending,
      resolved,
      highSev,
      medSev,
      lowSev,
      quarantined,
      denied,
      uniqueIps,
      uniqueHosts,
    };
  }, [alerts, audit]);

  const recentAlerts = useMemo(() => {
    return [...alerts]
      .filter((a: Alert) => a.status !== 'closed_noise')
      .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
      .slice(0, 6);
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
      count: stageEventCount(stage, audit),
    }));
  }, [audit]);

  const escalationRate = stats.total > 0 ? Math.round((stats.escalated / stats.total) * 100) : 0;
  const resolutionRate = stats.escalated > 0 ? Math.round((stats.resolved / stats.escalated) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* ── Page Header + Quick Actions ───────────────────────────── */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.14em] text-tertiary mb-1">
            <span>SOC Operations</span>
            <span>·</span>
            <span className={wsStatus === 'connected' ? 'text-teal' : 'text-amber'}>
              {wsStatus === 'connected' ? 'Telemetry Stream Live' : 'Stream Connecting'}
            </span>
          </div>
          <h1 className="text-2xl font-serif text-ivory tracking-tight">Command Center</h1>
          <p className="text-sm text-secondary mt-0.5">
            Real-time overview of telemetry triage, evidence validation, and human approval gates
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {stats.pending > 0 && (
            <Link
              to="/approvals"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold bg-amber text-ink hover:bg-amber-dim transition-colors"
            >
              <ShieldAlert size={14} />
              Review {stats.pending} Pending Gate{stats.pending > 1 ? 's' : ''}
            </Link>
          )}
          {alerts.length === 0 ? (
            <button
              onClick={() => void handleLaunch()}
              disabled={launching}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold bg-amber text-ink hover:bg-amber-dim transition-colors disabled:opacity-60 cursor-pointer"
            >
              {launching ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              {launching ? 'Launching Scenario…' : 'Launch Simulated Attack'}
            </button>
          ) : (
            <Link
              to="/scenario"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-medium bg-surface hover:bg-surface-hover text-ivory border border-border transition-colors"
            >
              <FlaskConical size={13} className="text-amber" />
              Scenario Lab
            </Link>
          )}
        </div>
      </header>

      {/* ── Operational Status Banner ─────────────────────────────── */}
      {alerts.length === 0 ? (
        <div className="panel-card px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-2 border-l-amber">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-lg bg-amber/10 border border-amber/30 flex items-center justify-center text-amber shrink-0 mt-0.5">
              <FlaskConical size={17} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-medium text-ivory">Pipeline Ready — Awaiting Telemetry</h2>
                <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface border border-border-subtle text-tertiary">
                  Standby
                </span>
              </div>
              <p className="text-xs text-secondary mt-1 max-w-2xl leading-relaxed">
                Start the 7-alert synthetic enterprise attack scenario to observe multi-agent triage, threat intelligence enrichment, prompt-injection quarantine, and human approval gates live.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 pl-12 md:pl-0">
            <Link
              to="/scenario"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-secondary hover:text-ivory bg-surface/60 hover:bg-surface border border-border transition-colors"
            >
              Inspect Lab &amp; Eval
              <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      ) : (
        <div className="panel-card px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border-l-2 border-l-teal">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-teal/12 border border-teal/30 flex items-center justify-center text-teal shrink-0">
              <Activity size={15} />
            </div>
            <div className="text-xs">
              <span className="font-medium text-ivory">Scenario Active:</span>{' '}
              <span className="text-secondary">
                <span className="font-mono text-ivory tabular-nums">{alerts.length}</span> alerts ingested ·{' '}
                <span className="font-mono text-teal tabular-nums">{stats.closedNoise}</span> filtered as benign noise ·{' '}
                <span className="font-mono text-amber tabular-nums">{stats.escalated}</span> escalated for investigation.
              </span>
            </div>
          </div>
          <Link
            to="/incidents"
            className="text-xs font-medium text-blue hover:underline inline-flex items-center gap-1"
          >
            Open Incidents Queue <ArrowRight size={12} />
          </Link>
        </div>
      )}

      {/* ── Top KPI Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          icon={<Activity size={16} />}
          tone="blue"
          label="Total Alerts Ingested"
          value={stats.total}
          subtext={
            stats.total > 0
              ? `${stats.closedNoise} closed noise · ${stats.escalated} escalated`
              : 'No alerts ingested yet'
          }
          progress={stats.total > 0 ? 100 : 0}
        />
        <KpiCard
          icon={<AlertTriangle size={16} />}
          tone="amber"
          label="Escalated Incidents"
          value={stats.escalated}
          subtext={
            stats.total > 0
              ? `${escalationRate}% escalation rate across scenario`
              : 'Awaiting triage classification'
          }
          progress={escalationRate}
          to={stats.escalated > 0 ? '/incidents' : undefined}
        />
        <KpiCard
          icon={<ClipboardCheck size={16} />}
          tone={stats.pending > 0 ? 'amber' : 'neutral'}
          label="Pending Approvals"
          value={stats.pending}
          subtext={
            stats.pending > 0
              ? 'High-risk containment paused at gate'
              : 'No actions waiting for sign-off'
          }
          highlight={stats.pending > 0}
          to={stats.pending > 0 ? '/approvals' : undefined}
        />
        <KpiCard
          icon={<CheckCircle2 size={16} />}
          tone="teal"
          label="Resolved Incidents"
          value={stats.resolved}
          subtext={
            stats.escalated > 0
              ? `${resolutionRate}% of escalated incidents resolved`
              : 'Post-gate containment complete'
          }
          progress={resolutionRate}
        />
      </div>

      {/* ── Processing Pipeline Stepper ───────────────────────────── */}
      <section className="panel-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-ivory">Processing Pipeline</h2>
            <p className="text-xs text-tertiary mt-0.5">
              Deterministic multi-agent orchestration state graph with engine-enforced approval gate
            </p>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-tertiary">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal" /> Completed
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber animate-pulse" /> Active
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-border" /> Standby
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {pipelineStatuses.map((s) => {
            const isCompleted = s.status === 'completed';
            const isActive = s.status === 'active';
            return (
              <div
                key={s.key}
                className={`relative rounded-md border px-3 py-2.5 transition-colors ${
                  isActive
                    ? 'bg-amber/8 border-amber/40'
                    : isCompleted
                    ? 'bg-teal/6 border-teal/30'
                    : 'bg-ink-deep/65 border-border-subtle'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-[10px] text-tertiary">{s.step}</span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isCompleted
                        ? 'bg-teal'
                        : isActive
                        ? 'bg-amber animate-pulse'
                        : 'bg-border'
                    }`}
                  />
                </div>
                <p className={`text-xs font-medium ${s.status === 'pending' ? 'text-ivory-dim' : 'text-ivory'}`}>
                  {s.label}
                </p>
                <p className="text-[11px] text-tertiary truncate mt-0.5">{s.subtitle}</p>
                <div className="mt-2 pt-1.5 border-t border-border-subtle/70 flex items-center justify-between text-[10px] font-mono">
                  <span className={isActive ? 'text-amber' : isCompleted ? 'text-teal' : 'text-tertiary'}>
                    {isActive ? 'Active' : isCompleted ? 'Done' : 'Idle'}
                  </span>
                  <span className="text-tertiary tabular-nums">{s.count} ev</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Telemetry Mix & Guardrails Strip ──────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Severity Breakdown */}
        <div className="panel-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-medium text-ivory-dim uppercase tracking-wider font-mono">
              Severity Mix
            </h3>
            <span className="text-[11px] font-mono text-tertiary tabular-nums">
              {stats.total} alerts
            </span>
          </div>
          <div className="h-2 rounded-full bg-ink-deep overflow-hidden flex gap-0.5 mb-3 border border-border-subtle">
            {stats.total > 0 ? (
              <>
                {stats.highSev > 0 && (
                  <div
                    className="bg-vermilion h-full transition-all"
                    style={{ width: `${(stats.highSev / stats.total) * 100}%` }}
                  />
                )}
                {stats.medSev > 0 && (
                  <div
                    className="bg-amber h-full transition-all"
                    style={{ width: `${(stats.medSev / stats.total) * 100}%` }}
                  />
                )}
                {stats.lowSev > 0 && (
                  <div
                    className="bg-secondary/50 h-full transition-all"
                    style={{ width: `${(stats.lowSev / stats.total) * 100}%` }}
                  />
                )}
              </>
            ) : (
              <div className="w-full h-full bg-surface/40" />
            )}
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="panel-inset px-2.5 py-1.5 flex items-center justify-between">
              <span className="text-vermilion text-[11px]">High</span>
              <span className="font-mono text-ivory tabular-nums">{stats.highSev}</span>
            </div>
            <div className="panel-inset px-2.5 py-1.5 flex items-center justify-between">
              <span className="text-amber text-[11px]">Med</span>
              <span className="font-mono text-ivory tabular-nums">{stats.medSev}</span>
            </div>
            <div className="panel-inset px-2.5 py-1.5 flex items-center justify-between">
              <span className="text-secondary text-[11px]">Low</span>
              <span className="font-mono text-ivory tabular-nums">{stats.lowSev}</span>
            </div>
          </div>
        </div>

        {/* Security Guardrails */}
        <div className="panel-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-medium text-ivory-dim uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Shield size={12} className="text-teal" />
              Agent Guardrails
            </h3>
            <span className="text-[10px] font-mono text-teal bg-teal/10 border border-teal/25 rounded px-1.5 py-0.5">
              Enforced
            </span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="panel-inset px-3 py-1.5 flex items-center justify-between">
              <span className="text-secondary">Prompt Injections Quarantined</span>
              <span className={`font-mono tabular-nums ${stats.quarantined > 0 ? 'text-vermilion font-semibold' : 'text-ivory'}`}>
                {stats.quarantined}
              </span>
            </div>
            <div className="panel-inset px-3 py-1.5 flex items-center justify-between">
              <span className="text-secondary">Unauthorized Tool Calls Blocked</span>
              <span className={`font-mono tabular-nums ${stats.denied > 0 ? 'text-vermilion font-semibold' : 'text-ivory'}`}>
                {stats.denied}
              </span>
            </div>
          </div>
        </div>

        {/* Observed Telemetry Scope */}
        <div className="panel-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-medium text-ivory-dim uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Lock size={12} className="text-blue" />
              Attack Surface Scope
            </h3>
            <span className="text-[10px] font-mono text-tertiary">Observed entities</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="panel-inset px-3 py-1.5 flex items-center justify-between">
              <span className="text-secondary">Unique Source IPs</span>
              <span className="font-mono text-ivory tabular-nums">{stats.uniqueIps}</span>
            </div>
            <div className="panel-inset px-3 py-1.5 flex items-center justify-between">
              <span className="text-secondary">Targeted Hosts / Gateways</span>
              <span className="font-mono text-ivory tabular-nums">{stats.uniqueHosts}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Two-Column Main Content ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Alerts Requiring Attention */}
        <section className="panel-card flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-ink/40">
            <div>
              <h2 className="text-sm font-semibold text-ivory">Alerts Requiring Attention</h2>
              <p className="text-[11px] text-tertiary">Prioritized by severity and triage escalation</p>
            </div>
            {alerts.length > 0 && (
              <Link
                to="/incidents"
                className="text-xs text-blue hover:underline flex items-center gap-1 font-medium shrink-0"
              >
                View all <ArrowRight size={12} />
              </Link>
            )}
          </div>

          <div className="divide-y divide-border-subtle flex-1">
            {recentAlerts.length === 0 ? (
              <EmptyState
                title="No actionable alerts"
                description="All alerts are either unloaded or closed as benign noise. Launch the scenario to populate live investigations."
                action={
                  alerts.length === 0 ? (
                    <button
                      onClick={() => void handleLaunch()}
                      disabled={launching}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-surface hover:bg-surface-hover text-ivory border border-border transition-colors cursor-pointer"
                    >
                      <Play size={12} className="text-amber" />
                      Launch Simulated Attack
                    </button>
                  ) : undefined
                }
              />
            ) : (
              recentAlerts.map((a: Alert) => (
                <Link
                  key={a.id}
                  to={`/investigation/${a.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-surface-hover/65 transition-colors group"
                >
                  <span className="font-mono text-xs text-blue bg-blue/10 border border-blue/25 rounded px-1.5 py-0.5 whitespace-nowrap shrink-0">
                    {a.id}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-ivory-dim group-hover:text-ivory truncate transition-colors">
                      {a.desc}
                    </p>
                    <p className="text-[11px] font-mono text-tertiary truncate mt-0.5">
                      {a.host} · {a.src_ip}{a.user ? ` · ${a.user}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <SeverityBadge severity={a.severity} />
                    <StatusBadge status={a.status} />
                    <ChevronRight size={14} className="text-tertiary group-hover:text-ivory transition-colors" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        {/* Recent Audit Activity */}
        <section className="panel-card flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-ink/40">
            <div>
              <h2 className="text-sm font-semibold text-ivory">Recent Audit Activity</h2>
              <p className="text-[11px] text-tertiary">Append-only real-time agent &amp; analyst event stream</p>
            </div>
            {audit.length > 0 && (
              <Link
                to="/audit"
                className="text-xs text-blue hover:underline flex items-center gap-1 font-medium shrink-0"
              >
                Full ledger <ArrowRight size={12} />
              </Link>
            )}
          </div>

          <div className="divide-y divide-border-subtle flex-1">
            {recentAudit.length === 0 ? (
              <EmptyState
                title="No audit events"
                description="Live WebSocket trace events and tool invocations will stream here as soon as the pipeline runs."
              />
            ) : (
              recentAudit.map((e: AuditEvent, i) => (
                <div key={`${e.ts}-${e.kind}-${i}`} className="px-4 py-2.5 flex items-center gap-2.5 text-xs hover:bg-surface-hover/40 transition-colors">
                  <span className="font-mono text-[11px] text-tertiary whitespace-nowrap w-16 shrink-0 tabular-nums">
                    {formatRelativeTime(e.ts)}
                  </span>
                  <span className={`font-mono text-[10px] border rounded px-1.5 py-0.5 whitespace-nowrap shrink-0 capitalize ${agentBadgeStyle(e.agent)}`}>
                    {e.agent}
                  </span>
                  <span className="font-mono text-[11px] text-tertiary whitespace-nowrap shrink-0">
                    {e.kind}
                  </span>
                  <span className="text-secondary truncate flex-1" title={e.msg}>
                    {truncate(e.msg, 72)}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

/* ── KPI Card Sub-Component ──────────────────────────────────────── */

interface KpiCardProps {
  icon: React.ReactNode;
  tone: 'blue' | 'amber' | 'teal' | 'neutral';
  label: string;
  value: number;
  subtext: string;
  progress?: number;
  highlight?: boolean;
  to?: string;
}

const TONE_ICON: Record<KpiCardProps['tone'], string> = {
  blue:    'bg-blue/12 text-blue border-blue/25',
  amber:   'bg-amber/12 text-amber border-amber/30',
  teal:    'bg-teal/12 text-teal border-teal/25',
  neutral: 'bg-surface text-secondary border-border',
};

const TONE_BAR: Record<KpiCardProps['tone'], string> = {
  blue:    'bg-blue',
  amber:   'bg-amber',
  teal:    'bg-teal',
  neutral: 'bg-tertiary',
};

function KpiCard({ icon, tone, label, value, subtext, progress, highlight, to }: KpiCardProps) {
  const inner = (
    <div
      className={`panel-card p-4 h-full flex flex-col justify-between transition-colors ${
        highlight ? 'border-amber/45 bg-amber/[0.04]' : ''
      } ${to ? 'hover:border-secondary/60' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-secondary">{label}</p>
          <p className="text-2xl font-serif text-ivory mt-1.5 leading-none tabular-nums">
            {value}
          </p>
        </div>
        <div className={`w-8 h-8 rounded-md border flex items-center justify-center shrink-0 ${TONE_ICON[tone]}`}>
          {icon}
        </div>
      </div>

      <div className="mt-3.5 space-y-2">
        {progress !== undefined && (
          <div className="h-1 w-full rounded-full bg-ink-deep overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${TONE_BAR[tone]}`}
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        )}
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <span className="text-tertiary truncate">{subtext}</span>
          {to && <ArrowRight size={12} className="text-amber shrink-0" />}
        </div>
      </div>
    </div>
  );

  return to ? <Link to={to} className="block">{inner}</Link> : inner;
}
