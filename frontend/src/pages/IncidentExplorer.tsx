/* ── Incident Explorer — searchable, filterable alert browser ───── */

import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Search, ArrowUpDown, ChevronRight, X, Play, Filter } from 'lucide-react';
import { useLive } from '../state/LiveStore';
import type { Alert, AlertStatus, Severity } from '../types';
import { severityRank, isEscalated } from '../types';
import { SeverityBadge } from '../components/SeverityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/StateIndicators';

type SortKey = 'severity' | 'time' | 'id';

const STATUS_OPTIONS: { value: AlertStatus | 'all'; label: string }[] = [
  { value: 'all',               label: 'All' },
  { value: 'new',               label: 'New' },
  { value: 'investigating',     label: 'Investigating' },
  { value: 'awaiting_approval', label: 'Awaiting Approval' },
  { value: 'resolved',          label: 'Resolved' },
  { value: 'closed_noise',      label: 'Closed Noise' },
];

const SEV_OPTIONS: { value: Severity | 'all'; label: string }[] = [
  { value: 'all',    label: 'All' },
  { value: 'high',   label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low',    label: 'Low' },
];

export function IncidentExplorer() {
  const { alerts } = useLive();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [sevFilter, setSevFilter] = useState<Severity | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<AlertStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortKey>('severity');

  const summary = useMemo(() => ({
    escalated: alerts.filter(isEscalated).length,
    awaiting: alerts.filter(a => a.status === 'awaiting_approval').length,
    high: alerts.filter(a => a.severity === 'high').length,
    noise: alerts.filter(a => a.status === 'closed_noise').length,
  }), [alerts]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return alerts
      .filter((a: Alert) => {
        if (q && ![a.id, a.desc, a.src_ip, a.host, a.user, a.type].some(f => f.toLowerCase().includes(q))) return false;
        if (sevFilter !== 'all' && a.severity !== sevFilter) return false;
        if (statusFilter !== 'all' && a.status !== statusFilter) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'severity') return severityRank(b.severity) - severityRank(a.severity);
        if (sortBy === 'time') return b.t - a.t;
        return a.id.localeCompare(b.id);
      });
  }, [alerts, query, sevFilter, statusFilter, sortBy]);

  const hasActiveFilters = query !== '' || sevFilter !== 'all' || statusFilter !== 'all';

  const clearFilters = () => {
    setQuery('');
    setSevFilter('all');
    setStatusFilter('all');
  };

  const cycleSort = () => {
    setSortBy(s => (s === 'severity' ? 'time' : s === 'time' ? 'id' : 'severity'));
  };

  return (
    <div className="space-y-5">
      {/* ── Header & Quick Telemetry Chips ───────────────────────── */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-tertiary mb-1">
            Alert Queue
          </p>
          <h1 className="text-2xl font-serif text-ivory tracking-tight">Incidents</h1>
          <p className="text-sm text-secondary mt-0.5">
            {alerts.length} alert{alerts.length !== 1 ? 's' : ''} ingested across current scenario
          </p>
        </div>

        {alerts.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="panel-inset px-2.5 py-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-vermilion" />
              <span className="text-tertiary">High Sev:</span>
              <span className="font-mono text-ivory tabular-nums">{summary.high}</span>
            </span>
            <span className="panel-inset px-2.5 py-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber" />
              <span className="text-tertiary">Awaiting Approval:</span>
              <span className="font-mono text-ivory tabular-nums">{summary.awaiting}</span>
            </span>
            <span className="panel-inset px-2.5 py-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
              <span className="text-tertiary">Closed Noise:</span>
              <span className="font-mono text-ivory tabular-nums">{summary.noise}</span>
            </span>
          </div>
        )}
      </header>

      {/* ── Filter Toolbar ───────────────────────────────────────── */}
      <div className="panel-card p-3.5 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Filter by alert ID, description, IP, host, user, or vector…"
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

          <div className="flex flex-wrap items-center gap-2">
            {/* Severity segmented pills */}
            <div className="flex items-center gap-1 bg-ink-deep/75 border border-border-subtle rounded-md p-0.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-tertiary px-2">
                Sev
              </span>
              {SEV_OPTIONS.map(o => (
                <button
                  key={o.value}
                  onClick={() => setSevFilter(o.value)}
                  className={`text-[11px] px-2.5 py-1 rounded transition-colors cursor-pointer ${
                    sevFilter === o.value
                      ? 'bg-surface text-ivory font-medium shadow-sm'
                      : 'text-tertiary hover:text-secondary'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>

            {/* Sort toggle */}
            <button
              onClick={cycleSort}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-secondary bg-ink-deep/75 border border-border rounded-md px-2.5 py-1.5 hover:text-ivory hover:border-secondary/60 transition-colors shrink-0 cursor-pointer"
              title="Cycle sort order"
            >
              <ArrowUpDown size={12} />
              Sort: {sortBy === 'severity' ? 'Severity ↓' : sortBy === 'time' ? 'Offset ↓' : 'ID ↑'}
            </button>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 text-[11px] text-amber hover:underline px-1.5 cursor-pointer"
              >
                <Filter size={11} />
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Status pills row */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-border-subtle/70">
          <span className="text-[10px] font-mono uppercase tracking-wider text-tertiary mr-1">
            Status:
          </span>
          {STATUS_OPTIONS.map(o => (
            <button
              key={o.value}
              onClick={() => setStatusFilter(o.value)}
              className={`text-[11px] px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                statusFilter === o.value
                  ? 'border-amber/40 bg-amber/10 text-ivory font-medium'
                  : 'border-transparent text-tertiary hover:text-secondary hover:bg-surface/40'
              }`}
            >
              {o.label}
            </button>
          ))}
          <span className="flex-1" />
          <span className="text-[11px] font-mono text-tertiary tabular-nums">
            Showing {filtered.length} of {alerts.length}
          </span>
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────────────── */}
      {alerts.length === 0 ? (
        <div className="panel-card">
          <EmptyState
            title="No alerts ingested yet"
            description="Launch the synthetic attack scenario from Scenario Lab or Command Center to populate the alert queue."
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
      ) : filtered.length === 0 ? (
        <div className="panel-card">
          <EmptyState
            title="No alerts match current filters"
            description="Adjust your severity, status, or search filters to view alerts."
            action={
              <button
                onClick={clearFilters}
                className="text-xs font-medium text-ivory bg-surface hover:bg-surface-hover border border-border rounded-md px-3 py-1.5 transition-colors cursor-pointer"
              >
                Clear all filters
              </button>
            }
          />
        </div>
      ) : (
        <div className="panel-card overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border bg-ink/55 text-[10px] font-mono text-tertiary uppercase tracking-wider">
                  <th className="text-left py-2.5 px-4 font-medium whitespace-nowrap">Alert ID</th>
                  <th className="text-left py-2.5 px-4 font-medium">Description &amp; Principal</th>
                  <th className="text-left py-2.5 px-4 font-medium whitespace-nowrap hidden md:table-cell">Detection Type</th>
                  <th className="text-left py-2.5 px-4 font-medium whitespace-nowrap hidden lg:table-cell">Source IP</th>
                  <th className="text-left py-2.5 px-4 font-medium whitespace-nowrap hidden lg:table-cell">Host</th>
                  <th className="text-left py-2.5 px-4 font-medium whitespace-nowrap">Severity</th>
                  <th className="text-left py-2.5 px-4 font-medium whitespace-nowrap">Status</th>
                  <th className="text-right py-2.5 px-4 font-medium whitespace-nowrap hidden sm:table-cell">Confidence</th>
                  <th className="w-8 py-2.5 pr-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filtered.map((a: Alert) => {
                  const confPct = a.confidence != null ? Math.round(a.confidence * 100) : null;
                  return (
                    <tr
                      key={a.id}
                      onClick={() => navigate(`/investigation/${a.id}`)}
                      className="group hover:bg-surface-hover/65 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Link
                          to={`/investigation/${a.id}`}
                          onClick={e => e.stopPropagation()}
                          className="font-mono text-xs text-blue bg-blue/10 border border-blue/25 rounded px-2 py-0.5 hover:bg-blue/20 transition-colors"
                        >
                          {a.id}
                        </Link>
                      </td>
                      <td className="py-3 px-4 max-w-sm">
                        <p className="text-xs sm:text-sm text-ivory-dim group-hover:text-ivory font-medium truncate transition-colors">
                          {a.desc}
                        </p>
                        <p className="text-[11px] font-mono text-tertiary mt-0.5 truncate">
                          {a.user ? `user: ${a.user}` : 'system / unauthenticated'} · t+{a.t}m
                        </p>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-secondary whitespace-nowrap hidden md:table-cell">
                        <span className="bg-ink-deep/80 border border-border-subtle rounded px-2 py-0.5">
                          {a.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-secondary whitespace-nowrap hidden lg:table-cell">
                        {a.src_ip}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-secondary whitespace-nowrap hidden lg:table-cell">
                        {a.host}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <SeverityBadge severity={a.severity} />
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusBadge status={a.status} />
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-right hidden sm:table-cell">
                        {confPct != null ? (
                          <div className="inline-flex items-center justify-end gap-2">
                            <div className="w-12 h-1.5 bg-ink-deep rounded-full overflow-hidden border border-border-subtle">
                              <div
                                className={`h-full rounded-full ${
                                  confPct >= 80 ? 'bg-vermilion' : confPct >= 50 ? 'bg-amber' : 'bg-teal'
                                }`}
                                style={{ width: `${confPct}%` }}
                              />
                            </div>
                            <span className="font-mono text-xs text-ivory-dim tabular-nums w-8 text-right">
                              {confPct}%
                            </span>
                          </div>
                        ) : (
                          <span className="font-mono text-xs text-tertiary">—</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-right whitespace-nowrap">
                        <ChevronRight size={14} className="text-tertiary group-hover:text-ivory inline transition-colors" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
