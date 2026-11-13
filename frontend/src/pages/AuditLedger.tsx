/* ── Audit Ledger — structured audit history ─────────────────────── */

import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Search, ChevronDown, ChevronRight } from 'lucide-react';
import { useLive } from '../state/LiveStore';
import type { AuditEvent, AgentName } from '../types';
import { AGENT_LABELS } from '../types';
import { EmptyState } from '../components/StateIndicators';
import { formatEpoch } from '../lib/format';

/* ── Kind color mapping ──────────────────────────────────────────── */
function kindBadgeClass(kind: string): string {
  switch (kind) {
    case 'tool_call': return 'border-blue/40 text-blue';
    case 'verdict': return 'border-teal/40 text-teal';
    case 'tool_denied':
    case 'injection_quarantined':
    case 'red_team': return 'border-vermilion/40 text-vermilion';
    case 'approval_required': return 'border-amber/40 text-amber';
    case 'approved': return 'border-teal/40 text-teal';
    case 'rejected':
    case 'rejected_by_analyst': return 'border-vermilion/40 text-vermilion';
    case 'alert_received': return 'border-blue/40 text-blue';
    case 'done': return 'border-teal/40 text-teal';
    default: return 'border-border text-secondary';
  }
}

const AGENT_FILTER_OPTIONS: (AgentName | 'all')[] = [
  'all', 'ingest', 'triage', 'intel', 'forensics', 'response', 'gate', 'analyst', 'system',
];

export function AuditLedger() {
  const { audit } = useLive();
  const [query, setQuery] = useState('');
  const [agentFilter, setAgentFilter] = useState<AgentName | 'all'>('all');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

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

  const hasData = (e: AuditEvent) => {
    return e.data && Object.keys(e.data).length > 0;
  };

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-serif text-ivory">Audit Ledger</h1>
        <p className="text-sm text-secondary mt-0.5">
          Append-only record of all system events, agent actions, and analyst decisions
        </p>
      </header>

      {/* ── Controls ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-tertiary" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search events…"
            className="w-full bg-surface border border-border rounded-md pl-8 pr-3 py-1.5 text-sm text-ivory placeholder:text-tertiary focus:border-secondary focus:outline-none transition-colors"
          />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {AGENT_FILTER_OPTIONS.map(a => (
            <button
              key={a}
              onClick={() => setAgentFilter(a)}
              className={`text-[11px] px-2 py-1 rounded border transition-colors capitalize
                ${agentFilter === a
                  ? 'border-secondary text-ivory bg-surface'
                  : 'border-border text-tertiary hover:text-secondary'
                }`}
            >
              {a === 'all' ? 'All' : a}
            </button>
          ))}
        </div>
      </div>

      {/* ── Event list ───────────────────────────────────────────── */}
      {audit.length === 0 ? (
        <EmptyState
          title="No audit events"
          description="Events will appear once a scenario is running."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No events match filters"
          description="Try adjusting your search or filter criteria."
        />
      ) : (
        <div className="border border-border rounded overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Header */}
            <div className="flex items-center border-b border-border px-3 py-2 text-[11px] text-tertiary uppercase tracking-wider">
              <span className="w-8 shrink-0">#</span>
              <span className="w-40 shrink-0">Timestamp</span>
              <span className="w-14 shrink-0">Alert</span>
              <span className="w-20 shrink-0">Agent</span>
              <span className="w-32 shrink-0">Kind</span>
              <span className="flex-1">Message</span>
              <span className="w-10 shrink-0" />
            </div>

            {/* Rows */}
            <div className="divide-y divide-border-subtle max-h-[calc(100vh-320px)] overflow-y-auto scrollbar-thin">
              {filtered.map((e, i) => {
                const isExpanded = expandedRows.has(i);
                const showDataToggle = hasData(e);
                return (
                  <div key={`${e.ts}-${e.kind}-${i}`}>
                    <div className="flex items-center px-3 py-1.5 text-xs hover:bg-surface-hover transition-colors">
                      <span className="w-8 shrink-0 font-mono text-tertiary">{e.n ?? '·'}</span>
                      <span className="w-40 shrink-0 font-mono text-tertiary">{formatEpoch(e.ts)}</span>
                      <span className="w-14 shrink-0">
                        <Link to={`/investigation/${e.alert_id}`} className="font-mono text-blue hover:underline">
                          {e.alert_id}
                        </Link>
                      </span>
                      <span className="w-20 shrink-0 text-secondary truncate" title={AGENT_LABELS[e.agent] ?? e.agent}>
                        {e.agent}
                      </span>
                      <span className="w-32 shrink-0">
                        <span className={`font-mono border rounded px-1 py-0 ${kindBadgeClass(e.kind)}`}>
                          {e.kind}
                        </span>
                      </span>
                      <span className="flex-1 text-secondary truncate" title={e.msg}>
                        {e.msg}
                      </span>
                      <span className="w-10 shrink-0 text-right">
                        {showDataToggle && (
                          <button
                            onClick={() => toggleRow(i)}
                            className="text-tertiary hover:text-secondary transition-colors inline-flex items-center gap-0.5"
                            title="Show event data"
                          >
                            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                          </button>
                        )}
                      </span>
                    </div>
                    {isExpanded && showDataToggle && (
                      <div className="px-3 py-2 bg-ink border-t border-border-subtle">
                        <pre className="text-[11px] font-mono text-secondary whitespace-pre-wrap overflow-x-auto">
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
      )}

      {/* ── Footer ───────────────────────────────────────────────── */}
      <p className="text-[11px] text-tertiary">
        {filtered.length} event{filtered.length !== 1 ? 's' : ''}
        {filtered.length !== audit.length ? ` of ${audit.length} total` : ''}
        {' · '}Append-only log (SQLite trigger-enforced)
      </p>
    </div>
  );
}

