/* ── Incident Explorer — searchable, filterable alert browser ───── */

import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Search, ArrowUpDown } from 'lucide-react';
import { useLive } from '../state/LiveStore';
import type { Alert, AlertStatus, Severity } from '../types';
import { severityRank } from '../types';
import { SeverityBadge } from '../components/SeverityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/StateIndicators';

type SortKey = 'severity' | 'time';

const STATUS_OPTIONS: { value: AlertStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'investigating', label: 'Investigating' },
  { value: 'awaiting_approval', label: 'Awaiting Approval' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed_noise', label: 'Closed' },
];

const SEV_OPTIONS: { value: Severity | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

export function IncidentExplorer() {
  const { alerts } = useLive();
  const [query, setQuery] = useState('');
  const [sevFilter, setSevFilter] = useState<Severity | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<AlertStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortKey>('severity');

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
        return b.t - a.t;
      });
  }, [alerts, query, sevFilter, statusFilter, sortBy]);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-serif text-ivory">Incidents</h1>
        <p className="text-sm text-secondary mt-0.5">
          {alerts.length} alert{alerts.length !== 1 ? 's' : ''} in scenario
        </p>
      </header>

      {/* ── Controls ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-tertiary" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by ID, description, IP, host, user…"
            className="w-full bg-surface border border-border rounded-md pl-8 pr-3 py-1.5 text-sm text-ivory placeholder:text-tertiary focus:border-secondary focus:outline-none transition-colors"
          />
        </div>

        {/* Severity filter */}
        <div className="flex items-center gap-1">
          {SEV_OPTIONS.map(o => (
            <button
              key={o.value}
              onClick={() => setSevFilter(o.value)}
              className={`text-[11px] px-2 py-1 rounded border transition-colors
                ${sevFilter === o.value
                  ? 'border-secondary text-ivory bg-surface'
                  : 'border-border text-tertiary hover:text-secondary hover:border-border-subtle'
                }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1 flex-wrap">
          {STATUS_OPTIONS.map(o => (
            <button
              key={o.value}
              onClick={() => setStatusFilter(o.value)}
              className={`text-[11px] px-2 py-1 rounded border transition-colors
                ${statusFilter === o.value
                  ? 'border-secondary text-ivory bg-surface'
                  : 'border-border text-tertiary hover:text-secondary hover:border-border-subtle'
                }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        {/* Sort toggle */}
        <button
          onClick={() => setSortBy(s => s === 'severity' ? 'time' : 'severity')}
          className="flex items-center gap-1 text-[11px] text-secondary border border-border rounded px-2 py-1 hover:text-ivory transition-colors shrink-0"
          title={`Sort by ${sortBy === 'severity' ? 'time' : 'severity'}`}
        >
          <ArrowUpDown size={12} />
          {sortBy === 'severity' ? 'Severity ↓' : 'Time ↓'}
        </button>
      </div>

      {/* ── Table ────────────────────────────────────────────────── */}
      {alerts.length === 0 ? (
        <EmptyState
          title="No alerts yet"
          description="Launch a scenario from the Scenario Lab to generate alerts."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No alerts match current filters"
          description="Try adjusting your search or filter criteria."
        />
      ) : (
        <div className="border border-border rounded overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-[11px] text-tertiary uppercase tracking-wider">
                <th className="text-left py-2 px-3 font-medium">ID</th>
                <th className="text-left py-2 px-3 font-medium">Description</th>
                <th className="text-left py-2 px-3 font-medium hidden md:table-cell">Type</th>
                <th className="text-left py-2 px-3 font-medium hidden lg:table-cell">Source IP</th>
                <th className="text-left py-2 px-3 font-medium hidden lg:table-cell">Host</th>
                <th className="text-left py-2 px-3 font-medium">Severity</th>
                <th className="text-left py-2 px-3 font-medium">Status</th>
                <th className="text-right py-2 px-3 font-medium hidden sm:table-cell">Conf.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filtered.map((a: Alert) => (
                <tr key={a.id} className="group hover:bg-surface-hover transition-colors">
                  <td className="py-2 px-3">
                    <Link
                      to={`/investigation/${a.id}`}
                      className="font-mono text-blue hover:underline"
                    >
                      {a.id}
                    </Link>
                  </td>
                  <td className="py-2 px-3 text-secondary group-hover:text-ivory transition-colors max-w-xs truncate">
                    {a.desc}
                  </td>
                  <td className="py-2 px-3 font-mono text-xs text-tertiary hidden md:table-cell">
                    {a.type}
                  </td>
                  <td className="py-2 px-3 font-mono text-xs text-tertiary hidden lg:table-cell">
                    {a.src_ip}
                  </td>
                  <td className="py-2 px-3 font-mono text-xs text-tertiary hidden lg:table-cell">
                    {a.host}
                  </td>
                  <td className="py-2 px-3">
                    <SeverityBadge severity={a.severity} />
                  </td>
                  <td className="py-2 px-3">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-xs text-tertiary hidden sm:table-cell">
                    {a.confidence != null ? `${Math.round(a.confidence * 100)}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

