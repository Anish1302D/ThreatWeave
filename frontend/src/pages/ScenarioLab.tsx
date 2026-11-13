/* ── Scenario Lab — synthetic demonstration environment ───────────── */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlaskConical,
  Play,
  BarChart3,
  CheckCircle2,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { useLive } from '../state/LiveStore';
import { useToasts } from '../state/ToastStore';
import { runScenario, fetchEval, ApiError } from '../services/api';
import type { EvalResult, AuditEvent } from '../types';
import { isEscalated } from '../types';
import { AGENT_LABELS } from '../types';
import { formatEpochShort } from '../lib/format';

type LaunchState = 'idle' | 'running' | 'completed' | 'error';

export function ScenarioLab() {
  const { alerts, audit } = useLive();
  const { addToast } = useToasts();
  const [launchState, setLaunchState] = useState<LaunchState>('idle');
  const [evalResult, setEvalResult] = useState<EvalResult | null>(null);
  const [evalLoading, setEvalLoading] = useState(false);
  const traceRef = useRef<HTMLDivElement>(null);

  // If alerts already exist, mark as completed
  useEffect(() => {
    if (alerts.length > 0 && launchState === 'idle') {
      setLaunchState('completed');
    }
  }, [alerts.length, launchState]);

  // Auto-scroll trace
  useEffect(() => {
    if (traceRef.current) {
      traceRef.current.scrollTop = traceRef.current.scrollHeight;
    }
  }, [audit.length]);

  const handleLaunch = useCallback(async () => {
    setLaunchState('running');
    try {
      const result = await runScenario();
      addToast('success', `Scenario started with ${result.started} alerts`);
      setLaunchState('completed');
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        addToast('warning', err.detail);
        setLaunchState('completed');
      } else {
        addToast('error', err instanceof Error ? err.message : 'Failed to launch scenario');
        setLaunchState('error');
      }
    }
  }, [addToast]);

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
    return { total: alerts.length, escalated, closedNoise, processing, resolved };
  }, [alerts]);

  const recentTrace = useMemo(() => {
    return [...audit].sort((a, b) => b.ts - a.ts).slice(0, 25);
  }, [audit]);

  return (
    <div className="space-y-6">
      {/* ── Header ───────────────────────────────────────────────── */}
      <header>
        <h1 className="text-xl font-serif text-ivory flex items-center gap-2">
          <FlaskConical size={20} className="text-amber" />
          Scenario Lab
        </h1>
        <div className="mt-2 border border-amber/30 rounded px-3 py-2 bg-amber/5">
          <p className="text-sm text-amber font-medium">Synthetic Demonstration Environment</p>
          <p className="text-xs text-secondary mt-0.5">
            This lab runs a pre-defined 7-alert enterprise attack scenario against the prototype backend.
            All threat intelligence, logs, and remediation actions are simulated.
          </p>
        </div>
      </header>

      {/* ── Launch + Status ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Launch */}
        <section className="border border-border rounded p-4">
          <h2 className="text-sm font-medium text-ivory mb-3">Scenario Execution</h2>
          <button
            onClick={handleLaunch}
            disabled={launchState !== 'idle' && launchState !== 'error'}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-md text-sm font-medium transition-colors
              ${launchState === 'idle' || launchState === 'error'
                ? 'bg-amber hover:bg-amber-dim text-ink cursor-pointer'
                : 'bg-surface text-tertiary cursor-not-allowed'
              }`}
          >
            {launchState === 'running' && <Loader2 size={16} className="animate-spin" />}
            {launchState === 'completed' && <CheckCircle2 size={16} />}
            {launchState === 'idle' && <Play size={16} />}
            {launchState === 'error' && <AlertTriangle size={16} />}
            {launchState === 'idle' && 'Launch Simulated Attack'}
            {launchState === 'running' && 'Launching…'}
            {launchState === 'completed' && 'Scenario Launched'}
            {launchState === 'error' && 'Retry Launch'}
          </button>

          {/* Execution status */}
          {stats.total > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <StatusRow label="Total alerts" value={stats.total} />
              <StatusRow label="Escalated" value={stats.escalated} color="text-amber" />
              <StatusRow label="Dismissed" value={stats.closedNoise} />
              <StatusRow label="Processing" value={stats.processing} color="text-amber" />
              <StatusRow label="Resolved" value={stats.resolved} color="text-teal" />
            </div>
          )}
          {stats.total === 0 && launchState === 'idle' && (
            <p className="text-xs text-tertiary mt-3 text-center">No scenario data yet</p>
          )}
        </section>

        {/* Evaluation */}
        <section className="border border-border rounded p-4">
          <h2 className="text-sm font-medium text-ivory mb-3">Evaluation Metrics</h2>
          <button
            onClick={handleEval}
            disabled={evalLoading}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-md text-sm border border-border text-secondary hover:text-ivory hover:border-secondary transition-colors disabled:opacity-50"
          >
            {evalLoading ? <Loader2 size={14} className="animate-spin" /> : <BarChart3 size={14} />}
            Run Evaluation
          </button>

          {evalResult && (
            <div className="mt-4 space-y-3">
              {/* Confusion matrix */}
              <div>
                <p className="text-[10px] text-tertiary uppercase tracking-wider mb-1.5">Confusion Matrix</p>
                <div className="grid grid-cols-2 gap-px rounded overflow-hidden border border-border">
                  <ConfMatrixCell label="True Positive" value={evalResult.true_pos} color="text-teal" />
                  <ConfMatrixCell label="False Positive" value={evalResult.false_pos} color="text-vermilion" />
                  <ConfMatrixCell label="False Negative" value={evalResult.false_neg} color="text-vermilion" />
                  <ConfMatrixCell label="True Negative" value={evalResult.true_neg} color="text-teal" />
                </div>
              </div>

              {/* Derived metrics */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <MetricRow label="Detection rate" value={`${(evalResult.detection_rate * 100).toFixed(1)}%`} />
                <MetricRow label="FP rate" value={`${(evalResult.false_positive_rate * 100).toFixed(1)}%`} />
                <MetricRow
                  label="Precision"
                  value={evalResult.true_pos + evalResult.false_pos > 0
                    ? `${((evalResult.true_pos / (evalResult.true_pos + evalResult.false_pos)) * 100).toFixed(1)}%`
                    : 'N/A'
                  }
                  tag="Derived"
                />
                <MetricRow label="Recall" value={`${(evalResult.detection_rate * 100).toFixed(1)}%`} />
                <MetricRow label="Avg triage" value={`${evalResult.avg_triage_ms} ms`} />
                <MetricRow label="Manual baseline" value={`${evalResult.manual_baseline_min_per_alert} min/alert`} />
              </div>

              <p className="text-[11px] text-tertiary italic">{evalResult.note}</p>
            </div>
          )}
        </section>
      </div>

      {/* ── Live trace ───────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-medium text-ivory mb-3">Live Agent Trace</h2>
        <div
          ref={traceRef}
          className="border border-border rounded max-h-80 overflow-y-auto scrollbar-thin divide-y divide-border-subtle"
        >
          {recentTrace.length === 0 ? (
            <div className="p-4 text-center text-xs text-tertiary">
              No events yet — launch the scenario to see the agent trace.
            </div>
          ) : (
            recentTrace.map((e: AuditEvent, i: number) => (
              <TraceRow key={`${e.ts}-${e.kind}-${i}`} event={e} />
            ))
          )}
        </div>
      </section>

      {/* ── Disclaimer ───────────────────────────────────────────── */}
      <p className="text-[10px] text-tertiary text-center">
        All data on this page is generated from a synthetic demonstration scenario.
        Metrics are evaluated against 7 hand-labelled alerts and are not a production benchmark.
      </p>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────────── */

function StatusRow({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="flex items-center justify-between bg-surface rounded px-2 py-1.5">
      <span className="text-tertiary">{label}</span>
      <span className={`font-mono font-medium ${color ?? 'text-ivory'}`}>{value}</span>
    </div>
  );
}

function ConfMatrixCell({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-surface px-3 py-2 text-center">
      <p className={`text-lg font-mono font-medium ${color}`}>{value}</p>
      <p className="text-[10px] text-tertiary">{label}</p>
    </div>
  );
}

function MetricRow({ label, value, tag }: { label: string; value: string; tag?: string }) {
  return (
    <div className="flex items-center justify-between bg-surface rounded px-2 py-1.5">
      <span className="text-tertiary flex items-center gap-1">
        {label}
        {tag && <span className="text-[9px] text-amber border border-amber/30 rounded px-0.5">{tag}</span>}
      </span>
      <span className="font-mono text-ivory">{value}</span>
    </div>
  );
}

function TraceRow({ event }: { event: AuditEvent }) {
  const kindColors: Record<string, string> = {
    tool_denied: 'text-vermilion',
    injection_quarantined: 'text-vermilion',
    red_team: 'text-vermilion',
    approval_required: 'text-amber',
    verdict: 'text-teal',
    approved: 'text-teal',
    rejected_by_analyst: 'text-vermilion',
    done: 'text-teal',
  };

  return (
    <div className="flex items-baseline gap-2 px-3 py-1.5 text-[11px] hover:bg-surface-hover transition-colors">
      <span className="font-mono text-tertiary w-16 shrink-0">{formatEpochShort(event.ts)}</span>
      <span className="text-secondary w-14 shrink-0 truncate" title={AGENT_LABELS[event.agent]}>
        {event.agent}
      </span>
      <span className={`font-mono w-28 shrink-0 truncate ${kindColors[event.kind] ?? 'text-secondary'}`}>
        {event.kind}
      </span>
      <span className="text-secondary truncate">{event.msg}</span>
    </div>
  );
}
