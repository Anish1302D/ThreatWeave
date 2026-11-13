/* ── Application Shell: nav rail + context bar + outlet ─────────── */

import { Outlet, NavLink, useLocation } from 'react-router';
import {
  LayoutDashboard,
  AlertTriangle,
  Search,
  ShieldCheck,
  FileText,
  FlaskConical,
  Wifi,
  WifiOff,
  Radio,
} from 'lucide-react';
import { useLive } from '../state/LiveStore';

interface NavItem {
  to: string;
  icon: typeof LayoutDashboard;
  label: string;
  disabled?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/command-center', icon: LayoutDashboard, label: 'Command Center' },
  { to: '/incidents',      icon: AlertTriangle,   label: 'Incidents' },
  { to: '/investigation',  icon: Search,          label: 'Investigation', disabled: true },
  { to: '/approvals',      icon: ShieldCheck,     label: 'Approval Desk' },
  { to: '/audit',          icon: FileText,        label: 'Audit Ledger' },
  { to: '/scenario',       icon: FlaskConical,    label: 'Scenario Lab' },
];

export function AppShell() {
  const { wsStatus } = useLive();
  const location = useLocation();

  // Derive page title from route
  const current = NAV_ITEMS.find(n => location.pathname.startsWith(n.to));
  const pageTitle = location.pathname.startsWith('/investigation/')
    ? 'Investigation Workspace'
    : (current?.label ?? 'DefenceIQ');

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Navigation Rail ─────────────────────────────────────── */}
      <nav
        className="flex flex-col w-[60px] min-w-[60px] bg-ink border-r border-border"
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Logo mark */}
        <div className="flex items-center justify-center h-12 border-b border-border">
          <div className="flex flex-col items-center gap-[3px]">
            <div className="w-[6px] h-[6px] rounded-full bg-ivory" />
            <div className="w-[6px] h-[6px] rounded-full bg-amber" />
            <div className="w-[6px] h-[6px] rounded-full border border-ivory" />
          </div>
        </div>

        {/* Nav items */}
        <div className="flex flex-col items-center gap-1 py-3 flex-1">
          {NAV_ITEMS.map(({ to, icon: Icon, label, disabled }) => {
            if (disabled) {
              return (
                <div
                  key={to}
                  className="w-10 h-10 flex items-center justify-center rounded-md text-tertiary opacity-40 cursor-not-allowed"
                  title={`${label} — select an incident first`}
                >
                  <Icon size={20} strokeWidth={1.5} />
                </div>
              );
            }
            return (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `w-10 h-10 flex items-center justify-center rounded-md transition-colors duration-150
                   ${isActive
                     ? 'bg-surface text-ivory'
                     : 'text-secondary hover:text-ivory hover:bg-surface-hover'
                   }`
                }
                title={label}
              >
                <Icon size={20} strokeWidth={1.5} />
              </NavLink>
            );
          })}
        </div>

        {/* Connection status */}
        <div className="flex items-center justify-center pb-4">
          {wsStatus === 'connected' && (
            <span title="WebSocket connected"><Wifi size={16} className="text-teal" /></span>
          )}
          {wsStatus === 'connecting' && (
            <span title="WebSocket connecting…"><Radio size={16} className="text-amber animate-pulse" /></span>
          )}
          {wsStatus === 'disconnected' && (
            <span title="WebSocket disconnected"><WifiOff size={16} className="text-vermilion" /></span>
          )}
        </div>
      </nav>

      {/* ── Main Content ────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Context bar */}
        <header className="flex items-center h-12 px-5 border-b border-border bg-ink shrink-0">
          <h1 className="text-sm font-medium text-ivory tracking-wide">{pageTitle}</h1>
          <span className="ml-3 text-[10px] font-mono uppercase tracking-[0.15em] text-tertiary border border-border-subtle rounded px-1.5 py-0.5">
            Synthetic scenario
          </span>
          <div className="flex-1" />
          <span className="text-xs text-tertiary">
            DefenceIQ <span className="text-secondary font-mono">v0.1</span>
          </span>
        </header>

        {/* Page */}
        <main className="flex-1 overflow-auto p-5 scrollbar-thin">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

