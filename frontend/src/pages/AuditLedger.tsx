/* ── Audit Ledger — structured append-only audit history ─────────── */

import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Search, ChevronDown, ChevronRight, Download, Lock, X, Copy, Check } from 'lucide-react';
import { useLive } from '../state/LiveStore';
import type { AuditEvent, AgentName } from '../types';
import { AGENT_LABELS } from '../types';
import { EmptyState } from '../components/StateIndicators';
import { formatEpoch } from '../lib/format';

/* ── Kind color mapping ──────────────────────────────────────────── */
function kindBadgeClass(kind: string): string {
  switch (kind) {
    case 'tool_call':             return 'border-blue/40 bg-blue/10 text-blue';
    case 'verdict':               return 'border-teal/40 bg-teal/10 text-teal';
    case 'tool_denied':
    case 'injection_quarantined':
    case 'red_team':              return 'border-vermilion/40 bg-vermilion/10 text-vermilion';
    case 'approval_required':     return 'border-amber/40 bg-amber/10 text-amber';
    case 'approved':              return 'border-teal/40 bg-teal/10 text-teal';
    case 'rejected':
    case 'rejected_by_analyst':   return 'border-vermilion/40 bg-vermilion/10 text-vermilion';
    case 'alert_received':        return 'border-blue/40 bg-blue/10 text-blue';
    case 'done':                  return 'border-teal/40 bg-teal/10 text-teal';
    default:                      return 'border-border bg-surface/50 text-secondary';
  }
}

const AGENT_FILTER_OPTIONS: (AgentName | 'all')[] = [
  'all', 'ingest', 'triage', 'intel', 'forensics', 'response', 'gate', 'analyst', 'system',
];

function downloadBlob(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function AuditLedger() {
  const { audit } = useLive();
  const [query, setQuery] = useState('');
  const [agentFilter, setAgentFilter] = useState<AgentName | 'all'>('all');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const agentCounts = useMemo(() => {
    const counts: Record<string, number> = { all: audit.length };
    for (const e of audit) {
      counts[e.agent] = (counts[e.agent] ?? 0) + 1;
    }
    return counts;
  }, [audit]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return audit.filter(e => {
      if (agentFilter !== 'all' && e.agent !== agentFilter) return false;
      if (q && ![e.msg, e.alert_id, e.agent, e.kind].some(f => f.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [audit, query, agentFilter]);

  const toggleRow = (idx: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const hasData = (e: AuditEvent) => Boolean(e.data && Object.keys(e.data).length > 0);

  const handleExportJson = () => {
    downloadBlob(
      'defenceiq-audit-ledger.json',
      JSON.stringify(filtered, null, 2),
      'application/json',
    );
  };

  const handleExportCsv = () => {
    const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['n', 'ts', 'timestamp_iso', 'alert_id', 'agent', 'kind', 'msg', 'data'].join(',');
    const rows = filtered.map(e => [
      e.n ?? '',
      e.ts,
      new Date(e.ts * 1000).toISOString(),
      e.alert_id,
      e.agent,
      e.kind,
      e.msg,
      JSON.stringify(e.data),
    ].map(escape).join(','));
    downloadBlob('defenceiq-audit-ledger.csv', [header, ...rows].join('\n'), 'text/csv;charset=utf-8');
  };

  const handleCopyRow = (idx: number, data: Record<string, unknown>) => {
    void navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  return (
    <div className="space-y-5">
      {/* ── Header + Export Toolbar ──────────────────────────────── */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-tertiary mb-1">
            Compliance &amp; Forensics
          </p>
          <h1 className="text-2xl font-serif text-ivory tracking-tight">Audit Ledger</h1>
          <p className="text-sm text-secondary mt-0.5">
            Append-only chronological record of every alert transition, tool invocation, and analyst decision
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-teal bg-teal/10 border border-teal/25 rounded-md px-2.5 py-1.5">
            <Lock size={12} />
            Trigger-Protected Append-Only
          </span>
          {filtered.length > 0 && (
            <>
              <button
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-surface/70 hover:bg-surface text-ivory-dim hover:text-ivory border border-border rounded-md transition-colors cursor-pointer"
              >
                <Download size={12} />
                CSV
              </button>
              <button
                onClick={handleExportJson}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-surface/70 hover:bg-surface text-ivory-dim hover:text-ivory border border-border rounded-md transition-colors cursor-pointer"
              >
                <Download size={12} />
                JSON
              </button>
            </>
          )}
        </div>
      </header>

      {/* ── Controls ─────────────────────────────────────────────── */}
      <div className="panel-card p-3.5 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search audit messages, alert IDs, tools, or kinds…"
              className="w-full bg-ink-deep/80 border border-border rounded-md pl-9 pr-8 py-1.5 text-xs text-ivory placeholder:text-tertiary focus:border-amber/60 focus:outline-none transition-colors"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-tertiary hover:text-ivory cursor-pointer"
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 flex-wrap">
            {AGENT_FILTER_OPTIONS.map(a => {
              const count = agentCounts[a] ?? 0;
              return (
                <button
                  key={a}
                  onClick={() => setAgentFilter(a)}
                  className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-md border transition-colors capitalize cursor-pointer ${
                    agentFilter === a
                      ? 'border-amber/40 bg-amber/10 text-ivory font-medium'
                      : 'border-border-subtle bg-ink-deep/60 text-tertiary hover:text-secondary hover:border-border'
                  }`}
                >
                  <span>{a === 'all' ? 'All' : a}</span>
                  {audit.length > 0 && (
                    <span className="font-mono text-[10px] text-tertiary tabular-nums">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Event Ledger Table ───────────────────────────────────── */}
      {audit.length === 0 ? (
        <div className="panel-card">
          <EmptyState
            title="No audit events recorded"
            description="Launch the synthetic attack scenario to stream real-time agent decisions and tool calls into the ledger."
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="panel-card">
          <EmptyState
            title="No audit events match current filters"
            description="Try clearing your search term or switching the agent filter."
          />
        </div>
      ) : (
        <div className="panel-card overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin max-h-[calc(100vh-300px)] overflow-y-auto">
            <div className="min-w-[720px]">
              {/* Sticky header */}
              <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-ink px-4 py-2.5 text-[10px] font-mono text-tertiary uppercase tracking-wider">
                <span className="w-9 shrink-0">#</span>
                <span className="w-44 shrink-0">Timestamp</span>
                <span className="w-16 shrink-0">Alert</span>
                <span className="w-22 shrink-0">Actor</span>
                <span className="w-40 shrink-0">Event Kind</span>
                <span className="flex-1">Message</span>
                <span className="w-8 shrink-0 text-right">Data</span>
              </div>

              {/* Rows */}
              <div className="divide-y divide-border-subtle">
                {filtered.map((e, i) => {
                  const isExpanded = expandedRows.has(i);
                  const showDataToggle = hasData(e);
                  return (
                    <div key={`${e.ts}-${e.kind}-${i}`}>
                      <div
                        onClick={showDataToggle ? () => toggleRow(i) : undefined}
                        className={`flex items-center gap-3 px-4 py-2 text-xs transition-colors ${
                          showDataToggle ? 'hover:bg-surface-hover/65 cursor-pointer' : 'hover:bg-surface-hover/35'
                        }`}
                      >
                        <span className="w-9 shrink-0 font-mono text-[11px] text-tertiary tabular-nums">
                          {e.n ?? '·'}
                        </span>
                        <span className="w-44 shrink-0 font-mono text-[11px] text-tertiary whitespace-nowrap tabular-nums">
                          {formatEpoch(e.ts)}
                        </span>
                        <span className="w-16 shrink-0 whitespace-nowrap">
                          <Link
                            to={`/investigation/${e.alert_id}`}
                            onClick={ev => ev.stopPropagation()}
                            className="font-mono text-xs text-blue hover:underline"
                          >
                            {e.alert_id}
                          </Link>
                        </span>
                        <span
                          className="w-22 shrink-0 text-secondary truncate capitalize"
                          title={AGENT_LABELS[e.agent] ?? e.agent}
                        >
                          {e.agent}
                        </span>
                        <span className="w-40 shrink-0 whitespace-nowrap">
                          <span className={`font-mono text-[10px] border rounded px-1.5 py-0.5 ${kindBadgeClass(e.kind)}`}>
                            {e.kind}
                          </span>
                        </span>
                        <span className="flex-1 text-ivory-dim truncate" title={e.msg}>
                          {e.msg}
                        </span>
                        <span className="w-8 shrink-0 text-right">
                          {showDataToggle && (
                            <button
                              onClick={ev => {
                                ev.stopPropagation();
                                toggleRow(i);
                              }}
                              className="text-tertiary hover:text-ivory transition-colors inline-flex items-center p-0.5 cursor-pointer"
                              title="Toggle structured payload"
                              aria-label="Toggle structured payload"
                            >
                              {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                            </button>
                          )}
                        </span>
                      </div>

                      {isExpanded && showDataToggle && (
                        <div className="px-4 py-3 bg-ink-deep/90 border-t border-border-subtle">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-tertiary">
                              Structured Event Payload
                            </span>
                            <button
                              onClick={() => handleCopyRow(i, e.data)}
                              className="inline-flex items-center gap-1 text-[10px] font-mono text-secondary hover:text-ivory bg-surface border border-border-subtle rounded px-2 py-0.5 cursor-pointer"
                            >
                              {copiedIdx === i ? <Check size={10} className="text-teal" /> : <Copy size={10} />}
                              {copiedIdx === i ? 'Copied' : 'Copy JSON'}
                            </button>
                          </div>
                          <pre className="text-[11px] font-mono text-ivory-dim whitespace-pre-wrap overflow-x-auto leading-relaxed">
                            {JSON.stringify(e.data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Footer ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-tertiary">
        <span className="font-mono tabular-nums">
          {filtered.length} event{filtered.length !== 1 ? 's' : ''}
          {filtered.length !== audit.length ? ` of ${audit.length} total` : ''}
        </span>
        <span>Immutable ledger protected by SQLite `audit_no_update` and `audit_no_delete` triggers</span>
      </div>
    </div>
  );
}
