/* ── Scenario Lab — synthetic demonstration environment ───────────── */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import {
  FlaskConical,
  Play,
  BarChart3,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  ArrowUpRight,
  Radio,
  Clock,
} from 'lucide-react';
import { useLive } from '../state/LiveStore';
import { useToasts } from '../state/ToastStore';
import { runScenario, fetchEval, ApiError } from '../services/api';
import type { EvalResult, AuditEvent } from '../types';
import { isEscalated, AGENT_LABELS } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { formatEpochShort } from '../lib/format';

type LaunchState = 'idle' | 'running' | 'completed' | 'error';

export function ScenarioLab() {
  const { alerts, audit, refreshAlerts, refreshAudit } = useLive();
  const { addToast } = useToasts();
  const [launchState, setLaunchState] = useState<LaunchState>('idle');
  const [evalResult, setEvalResult] = useState<EvalResult | null>(null);
  const [evalLoading, setEvalLoading] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const traceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (alerts.length > 0 && launchState === 'idle') {
      setLaunchState('completed');
    }
  }, [alerts.length, launchState]);

  useEffect(() => {
    if (autoScroll && traceRef.current) {
      traceRef.current.scrollTop = traceRef.current.scrollHeight;
    }
  }, [audit.length, autoScroll]);

  const handleLaunch = useCallback(async () => {
    setLaunchState('running');
    try {
      const result = await runScenario();
      addToast('success', `Scenario started with ${result.started} alerts`);
      setLaunchState('completed');
      await Promise.all([refreshAlerts(), refreshAudit()]);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        addToast('warning', err.detail);
        setLaunchState('completed');
      } else {
        addToast('error', err instanceof Error ? err.message : 'Failed to launch scenario');
        setLaunchState('error');
      }
    }
  }, [addToast, refreshAlerts, refreshAudit]);

  const handleEval = useCallback(async () => {
    setEvalLoading(true);
    try {
      const result = await fetchEval();
      setEvalResult(result);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to run evaluation');
    } finally {
      setEvalLoading(false);
    }
  }, [addToast]);

  const stats = useMemo(() => {
    const escalated = alerts.filter(isEscalated).length;
    const closedNoise = alerts.filter(a => a.status === 'closed_noise').length;
    const processing = alerts.filter(a => ['new', 'investigating', 'awaiting_approval'].includes(a.status)).length;
    const resolved = alerts.filter(a => a.status === 'resolved').length;
    const completed = closedNoise + resolved;
    return { total: alerts.length, escalated, closedNoise, processing, resolved, completed };
  }, [alerts]);

  const recentTrace = useMemo(() => {
    return [...audit].slice(-40);
  }, [audit]);

  const precision = evalResult && evalResult.true_pos + evalResult.false_pos > 0
    ? evalResult.true_pos / (evalResult.true_pos + evalResult.false_pos)
    : null;

  const f1Score = evalResult && precision !== null && precision + evalResult.detection_rate > 0
    ? (2 * precision * evalResult.detection_rate) / (precision + evalResult.detection_rate)
    : null;

  return (
    <div className="space-y-6">
      {/* ── Header ───────────────────────────────────────────────── */}
      <header className="space-y-3">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-tertiary mb-1">
            Simulation &amp; Benchmarking
          </p>
          <h1 className="text-2xl font-serif text-ivory tracking-tight flex items-center gap-2.5">
            <FlaskConical size={22} className="text-amber" />
            Scenario Lab
          </h1>
        </div>

        <div className="panel-card px-4 py-3 border-l-2 border-l-amber bg-amber/[0.04] flex items-start gap-3">
          <FlaskConical size={16} className="text-amber shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber uppercase tracking-wider font-mono">
              Synthetic Demonstration Environment
            </p>
            <p className="text-xs text-secondary mt-0.5 leading-relaxed">
              Executes a deterministic 7-alert enterprise attack scenario (VPN brute-force, credential compromise, lateral RDP, data exfiltration, prompt injection attempt, and benign baseline noise) against the FastAPI pipeline. All threat intelligence, host logs, and containment executions are simulated.
            </p>
          </div>
        </div>
      </header>

      {/* ── Launch + Evaluation Grid ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Scenario Execution */}
        <section className="panel-card flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-ink/40 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ivory">Scenario Execution</h2>
            <span className="text-[10px] font-mono text-tertiary uppercase">
              {stats.total > 0 ? `${stats.completed}/${stats.total} finalized` : 'Ready'}
            </span>
          </div>

          <div className="p-4 space-y-4 flex-1">
            <button
              onClick={() => void handleLaunch()}
              disabled={launchState !== 'idle' && launchState !== 'error'}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-md text-xs font-semibold transition-colors ${
                launchState === 'idle' || launchState === 'error'
                  ? 'bg-amber hover:bg-amber-dim text-ink cursor-pointer'
                  : 'bg-surface text-tertiary border border-border cursor-not-allowed'
              }`}
            >
              {launchState === 'running' && <Loader2 size={15} className="animate-spin" />}
              {launchState === 'completed' && <CheckCircle2 size={15} className="text-teal" />}
              {launchState === 'idle' && <Play size={15} />}
              {launchState === 'error' && <AlertTriangle size={15} />}
              {launchState === 'idle' && 'Launch Simulated Attack'}
              {launchState === 'running' && 'Launching 7-Alert Scenario…'}
              {launchState === 'completed' && 'Scenario Active / Launched'}
              {launchState === 'error' && 'Retry Launch'}
            </button>

            {stats.total > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <StatusRow label="Ingested" value={stats.total} />
                  <StatusRow label="Escalated" value={stats.escalated} color="text-amber" />
                  <StatusRow label="Closed Noise" value={stats.closedNoise} />
                  <StatusRow label="In Pipeline" value={stats.processing} color="text-amber" />
                  <StatusRow label="Resolved" value={stats.resolved} color="text-teal" />
                </div>

                {/* Live scenario alert roster */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-tertiary">
                    Scenario Alert Stream
                  </p>
                  <div className="panel-inset divide-y divide-border-subtle max-h-52 overflow-y-auto scrollbar-thin">
                    {alerts.map(a => (
                      <Link
                        key={a.id}
                        to={`/investigation/${a.id}`}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-surface-hover/50 transition-colors group"
                      >
                        <span className="font-mono text-blue w-11 shrink-0">{a.id}</span>
                        <span className="text-secondary group-hover:text-ivory truncate flex-1 transition-colors">
                          {a.desc}
                        </span>
                        <StatusBadge status={a.status} />
                        <ArrowUpRight size={12} className="text-tertiary group-hover:text-ivory shrink-0" />
                      </Link>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="panel-inset p-6 text-center text-xs text-tertiary">
                Click <span className="text-amber font-medium">Launch Simulated Attack</span> to replay all 7 synthetic enterprise alerts into the pipeline.
              </div>
            )}
          </div>
        </section>

        {/* Evaluation Metrics */}
        <section className="panel-card flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-ink/40 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ivory">Evaluation Metrics</h2>
            <span className="text-[10px] font-mono text-tertiary uppercase">GET /api/eval</span>
          </div>

          <div className="p-4 space-y-4 flex-1">
            <button
              onClick={() => void handleEval()}
              disabled={evalLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md text-xs font-medium bg-surface hover:bg-surface-hover border border-border text-ivory transition-colors disabled:opacity-50 cursor-pointer"
            >
              {evalLoading ? <Loader2 size={14} className="animate-spin text-amber" /> : <BarChart3 size={14} className="text-blue" />}
              Run Triage Benchmark Evaluation
            </button>

            {evalResult ? (
              <div className="space-y-3.5">
                {/* Labelled 2x2 Confusion matrix */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] font-mono text-tertiary uppercase tracking-wider">
                      Classification Confusion Matrix
                    </p>
                    <span className="text-[10px] font-mono text-tertiary tabular-nums">
                      n = {evalResult.alerts} alerts
                    </span>
                  </div>
                  <div className="panel-inset p-2.5">
                    <div className="grid grid-cols-[auto_1fr_1fr] gap-2 items-center text-center">
                      <div />
                      <div className="text-[10px] font-mono uppercase text-tertiary">Pred: Malicious</div>
                      <div className="text-[10px] font-mono uppercase text-tertiary">Pred: Benign</div>

                      <div className="text-[10px] font-mono uppercase text-tertiary text-right pr-1">Actual Mal.</div>
                      <ConfMatrixCell label="True Positive" value={evalResult.true_pos} tone="teal" />
                      <ConfMatrixCell label="False Negative" value={evalResult.false_neg} tone="vermilion" />

                      <div className="text-[10px] font-mono uppercase text-tertiary text-right pr-1">Actual Ben.</div>
                      <ConfMatrixCell label="False Positive" value={evalResult.false_pos} tone="vermilion" />
                      <ConfMatrixCell label="True Negative" value={evalResult.true_neg} tone="teal" />
                    </div>
                  </div>
                </div>

                {/* Derived metrics */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <MetricRow label="Detection rate" value={`${(evalResult.detection_rate * 100).toFixed(1)}%`} />
                  <MetricRow label="False positive rate" value={`${(evalResult.false_positive_rate * 100).toFixed(1)}%`} />
                  <MetricRow
                    label="Precision"
                    value={precision !== null ? `${(precision * 100).toFixed(1)}%` : 'N/A'}
                    tag="Derived"
                  />
                  <MetricRow
                    label="F1 score"
                    value={f1Score !== null ? `${(f1Score * 100).toFixed(1)}%` : 'N/A'}
                    tag="Derived"
                  />
                  <MetricRow label="Avg triage latency" value={`${evalResult.avg_triage_ms} ms`} />
                  <MetricRow
                    label="Manual baseline"
                    value={`${evalResult.manual_baseline_min_per_alert} min/alert`}
                    icon={<Clock size={11} className="text-tertiary" />}
                  />
                </div>

                <p className="text-[11px] text-tertiary italic leading-relaxed">{evalResult.note}</p>
              </div>
            ) : (
              <div className="panel-inset p-6 text-center text-xs text-tertiary">
                Execute the evaluation endpoint to compute confusion matrix counts, precision, recall, and triage latency across the 7 scenario alerts.
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ── Live Trace Stream Console ────────────────────────────── */}
      <section className="panel-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-ink/40 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Radio size={14} className={audit.length > 0 ? 'text-teal animate-pulse' : 'text-tertiary'} />
            <h2 className="text-sm font-semibold text-ivory">Live Agent Trace Console</h2>
            <span className="text-[10px] font-mono text-tertiary bg-surface border border-border-subtle rounded px-1.5 py-0.5 tabular-nums">
              {audit.length} total
            </span>
          </div>

          <button
            onClick={() => setAutoScroll(v => !v)}
            className={`text-[11px] font-mono px-2.5 py-1 rounded border transition-colors cursor-pointer ${
              autoScroll
                ? 'border-teal/35 bg-teal/10 text-teal'
                : 'border-border bg-ink-deep/60 text-tertiary hover:text-secondary'
            }`}
          >
            Auto-scroll: {autoScroll ? 'ON' : 'OFF'}
          </button>
        </div>

        <div
          ref={traceRef}
          className="bg-ink-deep/85 max-h-80 overflow-y-auto scrollbar-thin divide-y divide-border-subtle/70 font-mono"
        >
          {recentTrace.length === 0 ? (
            <div className="p-8 text-center text-xs text-tertiary font-sans">
              No events yet — launch the scenario to stream agent steps in real time.
            </div>
          ) : (
            recentTrace.map((e: AuditEvent, i: number) => (
              <TraceRow key={`${e.ts}-${e.kind}-${i}`} event={e} />
            ))
          )}
        </div>
      </section>

      {/* ── Disclaimer ───────────────────────────────────────────── */}
      <p className="text-[11px] text-tertiary text-center">
        All telemetry on this page is generated from a synthetic demonstration scenario. Evaluation metrics reflect 7 hand-labelled test alerts and are not a production benchmark.
      </p>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────────── */

function StatusRow({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="panel-inset flex items-center justify-between px-3 py-2">
      <span className="text-tertiary">{label}</span>
      <span className={`font-mono font-semibold tabular-nums ${color ?? 'text-ivory'}`}>{value}</span>
    </div>
  );
}

function ConfMatrixCell({ label, value, tone }: { label: string; value: number; tone: 'teal' | 'vermilion' }) {
  const cls = tone === 'teal'
    ? 'border-teal/30 bg-teal/8 text-teal'
    : 'border-vermilion/30 bg-vermilion/8 text-vermilion';
  return (
    <div className={`rounded-md border px-3 py-2.5 text-center ${cls}`}>
      <p className="text-xl font-mono font-semibold tabular-nums leading-none">{value}</p>
      <p className="text-[10px] text-secondary mt-1">{label}</p>
    </div>
  );
}

function MetricRow({ label, value, tag, icon }: { label: string; value: string; tag?: string; icon?: React.ReactNode }) {
  return (
    <div className="panel-inset flex items-center justify-between px-3 py-2">
      <span className="text-tertiary flex items-center gap-1.5">
        {icon}
        {label}
        {tag && (
          <span className="text-[9px] font-mono text-amber bg-amber/10 border border-amber/30 rounded px-1 py-0.5 leading-none">
            {tag}
          </span>
        )}
      </span>
      <span className="font-mono text-ivory font-medium tabular-nums">{value}</span>
    </div>
  );
}

function TraceRow({ event }: { event: AuditEvent }) {
  const kindColors: Record<string, string> = {
    tool_denied:           'text-vermilion',
    injection_quarantined: 'text-vermilion',
    red_team:              'text-vermilion',
    approval_required:     'text-amber',
    verdict:               'text-teal',
    approved:              'text-teal',
    rejected_by_analyst:   'text-vermilion',
    done:                  'text-teal',
    tool_call:             'text-blue',
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2 text-[11px] hover:bg-surface-hover/40 transition-colors">
      <span className="text-tertiary w-16 shrink-0 tabular-nums">{formatEpochShort(event.ts)}</span>
      <Link to={`/investigation/${event.alert_id}`} className="text-blue hover:underline w-12 shrink-0">
        {event.alert_id}
      </Link>
      <span className="text-secondary w-20 shrink-0 truncate capitalize" title={AGENT_LABELS[event.agent]}>
        {event.agent}
      </span>
      <span className={`w-36 shrink-0 truncate ${kindColors[event.kind] ?? 'text-secondary'}`}>
        {event.kind}
      </span>
      <span className="text-ivory-dim truncate flex-1 font-sans">{event.msg}</span>
    </div>
  );
}
