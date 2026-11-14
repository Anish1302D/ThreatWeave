/* ── Quick Command Palette (Ctrl/Cmd + K) ────────────────────────── */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Search,
  LayoutDashboard,
  AlertTriangle,
  ShieldCheck,
  FileText,
  FlaskConical,
  ArrowRight,
  CornerDownLeft,
  X,
} from 'lucide-react';
import { useLive } from '../state/LiveStore';
import { SeverityBadge } from './SeverityBadge';
import { StatusBadge } from './StatusBadge';

interface Props {
  open: boolean;
  onClose: () => void;
}

const NAV_COMMANDS = [
  { id: 'nav-cc',        label: 'Command Center', subtitle: 'Operational pipeline overview & live metrics', to: '/command-center', icon: LayoutDashboard },
  { id: 'nav-incidents', label: 'Incidents',      subtitle: 'Searchable queue of all ingested alerts',      to: '/incidents',      icon: AlertTriangle },
  { id: 'nav-approvals', label: 'Approval Desk',  subtitle: 'Human-in-the-loop containment gate',           to: '/approvals',      icon: ShieldCheck },
  { id: 'nav-audit',     label: 'Audit Ledger',   subtitle: 'Append-only chronological audit history',      to: '/audit',          icon: FileText },
  { id: 'nav-scenario',  label: 'Scenario Lab',   subtitle: 'Synthetic attack runner & model evaluation',   to: '/scenario',       icon: FlaskConical },
];

export function CommandPalette({ open, onClose }: Props) {
  const { alerts } = useLive();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const q = query.trim().toLowerCase();

  const matchedNav = useMemo(() => {
    if (!q) return NAV_COMMANDS;
    return NAV_COMMANDS.filter(n =>
      n.label.toLowerCase().includes(q) || n.subtitle.toLowerCase().includes(q),
    );
  }, [q]);

  const matchedAlerts = useMemo(() => {
    const list = q
      ? alerts.filter(a =>
          [a.id, a.desc, a.src_ip, a.host, a.user, a.type].some(f => f.toLowerCase().includes(q)),
        )
      : alerts;
    return list.slice(0, 6);
  }, [alerts, q]);

  const go = (to: string) => {
    onClose();
    navigate(to);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 bg-black/70 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="bg-graphite border border-border rounded-xl w-full max-w-xl shadow-2xl overflow-hidden animate-[modalIn_0.14s_ease-out]"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Quick navigation"
      >
        {/* Search bar */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-ink/60">
          <Search size={15} className="text-tertiary shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                if (matchedAlerts.length > 0 && q) {
                  go(`/investigation/${matchedAlerts[0]!.id}`);
                } else if (matchedNav.length > 0) {
                  go(matchedNav[0]!.to);
                }
              }
            }}
            placeholder="Jump to workspace view or search alerts by ID, IP, host, user…"
            className="flex-1 bg-transparent text-sm text-ivory placeholder:text-tertiary focus:outline-none"
          />
          <button
            onClick={onClose}
            className="text-tertiary hover:text-ivory p-1 rounded hover:bg-surface transition-colors cursor-pointer"
            aria-label="Close search"
          >
            <X size={14} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[55vh] overflow-y-auto scrollbar-thin p-2 space-y-3">
          {matchedAlerts.length > 0 && (
            <div>
              <p className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-tertiary">
                Investigations ({matchedAlerts.length})
              </p>
              <div className="space-y-0.5">
                {matchedAlerts.map(a => (
                  <button
                    key={a.id}
                    onClick={() => go(`/investigation/${a.id}`)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left hover:bg-surface-hover transition-colors group cursor-pointer"
                  >
                    <span className="font-mono text-xs text-blue w-12 shrink-0">{a.id}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-ivory truncate">{a.desc}</p>
                      <p className="text-[11px] font-mono text-tertiary truncate">
                        {a.src_ip} · {a.host}{a.user ? ` · ${a.user}` : ''}
                      </p>
                    </div>
                    <SeverityBadge severity={a.severity} />
                    <StatusBadge status={a.status} />
                    <ArrowRight size={13} className="text-tertiary opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {matchedNav.length > 0 && (
            <div>
              <p className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-tertiary">
                Workspaces
              </p>
              <div className="space-y-0.5">
                {matchedNav.map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => go(item.to)}
                      className="w-full flex items-center gap-3 px-2.5 py-2 rounded-md text-left hover:bg-surface-hover transition-colors group cursor-pointer"
                    >
                      <div className="w-7 h-7 rounded-md bg-surface border border-border-subtle flex items-center justify-center text-secondary group-hover:text-ivory shrink-0">
                        <Icon size={14} strokeWidth={1.6} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-ivory">{item.label}</p>
                        <p className="text-[11px] text-tertiary truncate">{item.subtitle}</p>
                      </div>
                      <CornerDownLeft size={12} className="text-tertiary opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {matchedNav.length === 0 && matchedAlerts.length === 0 && (
            <div className="py-8 text-center text-xs text-tertiary">
              No workspaces or alerts match "{query}"
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-ink/50 text-[11px] text-tertiary">
          <span>Press <kbd className="font-mono px-1 py-0.5 bg-surface border border-border rounded text-[10px] text-secondary">Enter</kbd> to open top match</span>
          <span><kbd className="font-mono px-1 py-0.5 bg-surface border border-border rounded text-[10px] text-secondary">Esc</kbd> to dismiss</span>
        </div>
      </div>
    </div>
  );
}

