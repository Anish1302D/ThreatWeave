/* ── Application Shell: collapsible SOC sidebar + context bar + outlet ─ */

import { useEffect, useMemo, useState } from 'react';
import { Outlet, NavLink, Link, useLocation } from 'react-router';
import {
  LayoutDashboard,
  AlertTriangle,
  Search,
  ShieldCheck,
  FileText,
  FlaskConical,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Menu,
  X,
  UserCheck,
  Bell,
} from 'lucide-react';
import { useLive } from '../state/LiveStore';
import { derivePendingApprovals, pendingOnly } from '../lib/derive';
import { isEscalated, severityRank } from '../types';
import { CommandPalette } from './CommandPalette';

interface NavItem {
  key: string;
  to: string;
  matchPrefix: string;
  icon: typeof LayoutDashboard;
  label: string;
  group: 'operations' | 'governance';
  badge?: number;
  badgeTone?: 'amber' | 'neutral';
  disabled?: boolean;
  subtitle?: string;
}

export function AppShell() {
  const { alerts, audit, wsStatus, apiReachable, refreshAlerts, refreshAudit } = useLive();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Global Ctrl/Cmd + K shortcut for Command Palette
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const pendingApprovals = useMemo(
    () => pendingOnly(derivePendingApprovals(audit)).length,
    [audit],
  );

  const escalatedCount = useMemo(
    () => alerts.filter(isEscalated).length,
    [alerts],
  );

  // Pick best target alert for the Investigation nav link when not already on one
  const defaultInvestigationAlertId = useMemo(() => {
    if (alerts.length === 0) return null;
    const sorted = [...alerts].sort((a, b) => {
      const escDiff = Number(isEscalated(b)) - Number(isEscalated(a));
      if (escDiff !== 0) return escDiff;
      return severityRank(b.severity) - severityRank(a.severity);
    });
    return sorted[0]?.id ?? null;
  }, [alerts]);

  const currentInvestigationId = location.pathname.startsWith('/investigation/')
    ? location.pathname.replace('/investigation/', '')
    : defaultInvestigationAlertId;

  const navItems: NavItem[] = useMemo(() => [
    {
      key: 'command-center',
      to: '/command-center',
      matchPrefix: '/command-center',
      icon: LayoutDashboard,
      label: 'Command Center',
      group: 'operations',
    },
    {
      key: 'incidents',
      to: '/incidents',
      matchPrefix: '/incidents',
      icon: AlertTriangle,
      label: 'Incidents',
      group: 'operations',
      badge: escalatedCount > 0 ? escalatedCount : alerts.length > 0 ? alerts.length : undefined,
      badgeTone: escalatedCount > 0 ? 'amber' : 'neutral',
    },
    {
      key: 'investigation',
      to: currentInvestigationId ? `/investigation/${currentInvestigationId}` : '/incidents',
      matchPrefix: '/investigation',
      icon: Search,
      label: 'Investigation',
      group: 'operations',
      disabled: !currentInvestigationId,
      subtitle: currentInvestigationId ?? undefined,
    },
    {
      key: 'approvals',
      to: '/approvals',
      matchPrefix: '/approvals',
      icon: ShieldCheck,
      label: 'Approval Desk',
      group: 'operations',
      badge: pendingApprovals > 0 ? pendingApprovals : undefined,
      badgeTone: 'amber',
    },
    {
      key: 'audit',
      to: '/audit',
      matchPrefix: '/audit',
      icon: FileText,
      label: 'Audit Ledger',
      group: 'governance',
      badge: audit.length > 0 ? audit.length : undefined,
      badgeTone: 'neutral',
    },
    {
      key: 'scenario',
      to: '/scenario',
      matchPrefix: '/scenario',
      icon: FlaskConical,
      label: 'Scenario Lab',
      group: 'governance',
    },
  ], [escalatedCount, alerts.length, currentInvestigationId, pendingApprovals, audit.length]);

  const currentNav = navItems.find(n => location.pathname.startsWith(n.matchPrefix));
  const pageTitle = location.pathname.startsWith('/investigation/')
    ? `Investigation · ${location.pathname.replace('/investigation/', '')}`
    : (currentNav?.label ?? 'DefenceIQ');

  const handleSync = async () => {
    setSyncing(true);
    await Promise.all([refreshAlerts(), refreshAudit()]);
    setTimeout(() => setSyncing(false), 300);
  };

  const renderSidebarContent = (isCompact: boolean) => (
    <div className="flex flex-col h-full">
      {/* Brand header */}
      <div className={`flex items-center h-13 border-b border-border shrink-0 ${isCompact ? 'justify-center px-2' : 'justify-between px-3.5'}`}>
        <Link to="/command-center" className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-surface/80 border border-border flex items-center justify-center shrink-0 shadow-inner">
            <svg viewBox="0 0 32 32" className="w-5 h-5" aria-hidden="true">
              <path d="M16 5v22" stroke="#ECEAE4" strokeWidth="2" strokeLinecap="round" />
              <circle cx="16" cy="9" r="2.6" fill="#ECEAE4" />
              <circle cx="16" cy="16" r="2.6" fill="#E7B75A" />
              <circle cx="16" cy="23" r="2.6" fill="#0B1016" stroke="#ECEAE4" strokeWidth="1.6" />
              <path d="M18.6 16H25" stroke="#E7B75A" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          {!isCompact && (
            <div className="min-w-0">
              <div className="text-sm font-semibold text-ivory tracking-tight leading-none">
                DefenceIQ
              </div>
              <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-tertiary mt-1 leading-none">
                SOC Platform
              </div>
            </div>
          )}
        </Link>
        {!isCompact && (
          <button
            onClick={() => setCollapsed(true)}
            className="hidden md:flex p-1.5 rounded-md text-tertiary hover:text-ivory hover:bg-surface-hover transition-colors cursor-pointer"
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose size={15} />
          </button>
        )}
      </div>

      {/* Nav sections */}
      <div className="flex-1 overflow-y-auto scrollbar-thin py-3 px-2.5 space-y-5">
        {(['operations', 'governance'] as const).map(group => {
          const items = navItems.filter(i => i.group === group);
          return (
            <div key={group}>
              {!isCompact && (
                <p className="px-2.5 mb-1.5 text-[10px] font-mono uppercase tracking-[0.14em] text-tertiary">
                  {group === 'operations' ? 'Operations' : 'Governance & Lab'}
                </p>
              )}
              <div className="space-y-0.5">
                {items.map(({ key, to, matchPrefix, icon: Icon, label, disabled, badge, badgeTone, subtitle }) => {
                  if (disabled) {
                    return (
                      <div
                        key={key}
                        className={`flex items-center gap-2.5 rounded-md text-tertiary/50 cursor-not-allowed ${
                          isCompact ? 'justify-center h-10 w-10 mx-auto' : 'px-2.5 py-2'
                        }`}
                        title={`${label} — launch a scenario or select an alert first`}
                      >
                        <Icon size={17} strokeWidth={1.6} className="shrink-0" />
                        {!isCompact && <span className="text-xs truncate">{label}</span>}
                      </div>
                    );
                  }

                  const isActive = location.pathname.startsWith(matchPrefix);

                  return (
                    <NavLink
                      key={key}
                      to={to}
                      title={isCompact ? label : undefined}
                      className={`relative flex items-center gap-2.5 rounded-md transition-all duration-150 ${
                        isCompact ? 'justify-center h-10 w-10 mx-auto' : 'px-2.5 py-2'
                      } ${
                        isActive
                          ? 'bg-surface text-ivory shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]'
                          : 'text-secondary hover:text-ivory hover:bg-surface-hover/70'
                      }`}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-[2.5px] rounded-r bg-amber" />
                      )}
                      <Icon
                        size={17}
                        strokeWidth={isActive ? 1.9 : 1.6}
                        className={`shrink-0 ${isActive ? 'text-amber' : ''}`}
                      />
                      {!isCompact && (
                        <>
                          <span className="text-xs font-medium flex-1 truncate">{label}</span>
                          {subtitle && (
                            <span className="text-[10px] font-mono text-tertiary bg-ink-deep/80 border border-border-subtle rounded px-1.5 py-0.5">
                              {subtitle}
                            </span>
                          )}
                          {badge !== undefined && (
                            <span
                              className={`text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded-full leading-none ${
                                badgeTone === 'amber'
                                  ? 'bg-amber/15 text-amber border border-amber/30'
                                  : 'bg-ink-deep/80 text-secondary border border-border-subtle'
                              }`}
                            >
                              {badge}
                            </span>
                          )}
                        </>
                      )}
                      {isCompact && badge !== undefined && badgeTone === 'amber' && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber" />
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer: Connection telemetry + expand toggle */}
      <div className="border-t border-border p-2.5 space-y-2 shrink-0">
        {isCompact ? (
          <div className="flex flex-col items-center gap-2">
            <div
              className="w-9 h-9 rounded-md bg-ink-deep/70 border border-border-subtle flex items-center justify-center"
              title={`Stream: ${wsStatus}${apiReachable === false ? ' · API unreachable' : ''}`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  wsStatus === 'connected'
                    ? 'bg-teal'
                    : wsStatus === 'connecting'
                    ? 'bg-amber animate-pulse'
                    : 'bg-vermilion'
                }`}
              />
            </div>
            <button
              onClick={() => setCollapsed(false)}
              className="hidden md:flex p-1.5 rounded-md text-tertiary hover:text-ivory hover:bg-surface-hover transition-colors cursor-pointer"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen size={15} />
            </button>
          </div>
        ) : (
          <div className="panel-inset px-3 py-2.5 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-tertiary font-mono uppercase tracking-wider text-[10px]">Telemetry</span>
              <span
                className={`inline-flex items-center gap-1.5 font-mono text-[10px] ${
                  wsStatus === 'connected'
                    ? 'text-teal'
                    : wsStatus === 'connecting'
                    ? 'text-amber'
                    : 'text-vermilion'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    wsStatus === 'connected'
                      ? 'bg-teal'
                      : wsStatus === 'connecting'
                      ? 'bg-amber animate-pulse'
                      : 'bg-vermilion'
                  }`}
                />
                {wsStatus === 'connected' ? 'WS Live' : wsStatus === 'connecting' ? 'Connecting' : 'Offline'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-tertiary">Backend API</span>
              <span className={`font-mono text-[10px] ${apiReachable === false ? 'text-vermilion' : 'text-secondary'}`}>
                {apiReachable === false ? 'Unreachable' : apiReachable === true ? 'Healthy' : 'Checking…'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-ink-deep text-ivory">
      {/* ── Desktop Sidebar ──────────────────────────────────────── */}
      <aside
        className={`hidden md:flex flex-col bg-ink border-r border-border shrink-0 transition-[width] duration-200 ease-out ${
          collapsed ? 'w-[64px]' : 'w-[232px]'
        }`}
        role="navigation"
        aria-label="Main navigation"
      >
        {renderSidebarContent(collapsed)}
      </aside>

      {/* ── Mobile Drawer ────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-black/65" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-[240px] max-w-[80vw] bg-ink border-r border-border h-full z-10 flex flex-col">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-3 right-3 p-1 text-tertiary hover:text-ivory md:hidden cursor-pointer"
              aria-label="Close navigation"
            >
              <X size={16} />
            </button>
            {renderSidebarContent(false)}
          </aside>
        </div>
      )}

      {/* ── Main Content Column ──────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Top Operational Context Bar */}
        <header className="flex items-center justify-between gap-3 h-13 px-4 md:px-6 border-b border-border bg-ink/95 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-1.5 rounded-md text-secondary hover:text-ivory hover:bg-surface transition-colors cursor-pointer"
              aria-label="Open navigation"
            >
              <Menu size={18} />
            </button>

            <div className="flex items-center gap-2 text-xs min-w-0">
              <span className="text-tertiary hidden sm:inline">DefenceIQ</span>
              <span className="text-border hidden sm:inline">/</span>
              <span className="font-medium text-ivory truncate">{pageTitle}</span>
            </div>

            <span
              className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.12em] text-amber/90 bg-amber/8 border border-amber/25 rounded-full px-2 py-0.5 shrink-0"
              title="All telemetry, threat intelligence, and containment tools currently run against a synthetic attack scenario"
            >
              <FlaskConical size={10} />
              Synthetic Scenario
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Command palette trigger */}
            <button
              onClick={() => setPaletteOpen(true)}
              className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-ink-deep/80 border border-border text-xs text-tertiary hover:text-secondary hover:border-secondary/60 transition-colors cursor-pointer"
              title="Quick search & navigation (Ctrl+K)"
            >
              <Search size={13} />
              <span className="hidden lg:inline">Search alerts &amp; views…</span>
              <kbd className="font-mono text-[10px] text-tertiary bg-surface border border-border-subtle rounded px-1.5 py-0.5 leading-none">
                ⌘K
              </kbd>
            </button>

            {/* Pending approvals alert pill */}
            {pendingApprovals > 0 && (
              <Link
                to="/approvals"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber/12 border border-amber/35 text-amber text-xs font-medium hover:bg-amber/20 transition-colors"
              >
                <Bell size={12} className="animate-pulse" />
                <span className="font-mono tabular-nums">{pendingApprovals}</span>
                <span className="hidden sm:inline">pending</span>
              </Link>
            )}

            {/* Manual sync button */}
            <button
              onClick={() => void handleSync()}
              className="p-1.5 rounded-md border border-border-subtle bg-surface/40 text-secondary hover:text-ivory hover:border-border transition-colors cursor-pointer"
              title="Refresh alerts and audit stream"
              aria-label="Refresh telemetry"
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin text-amber' : ''} />
            </button>

            {/* Analyst identity chip */}
            <div className="hidden md:flex items-center gap-2 pl-2 border-l border-border">
              <div className="w-7 h-7 rounded-full bg-surface border border-border flex items-center justify-center text-teal">
                <UserCheck size={13} />
              </div>
              <div className="leading-none">
                <p className="text-[11px] font-medium text-ivory">SOC Analyst</p>
                <p className="text-[10px] font-mono text-tertiary mt-0.5">v0.2.0</p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Workspace Canvas */}
        <main className="flex-1 overflow-auto app-canvas p-4 md:p-6 scrollbar-thin">
          <div className="max-w-[1440px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Quick Command Palette */}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
