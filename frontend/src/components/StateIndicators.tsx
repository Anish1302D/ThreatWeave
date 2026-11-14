/* ── Empty, Loading, and Error state components ──────────────────── */

import type { ReactNode } from 'react';
import { Loader2, AlertCircle, Inbox } from 'lucide-react';

export function LoadingState({ message = 'Loading…' }: { message?: string }) {
  return (
    <div className="panel-card flex flex-col items-center justify-center py-16 px-6 text-secondary" role="status">
      <div className="w-10 h-10 rounded-lg bg-surface/80 border border-border flex items-center justify-center mb-3">
        <Loader2 size={18} className="animate-spin text-amber" />
      </div>
      <p className="text-sm text-ivory-dim font-medium">{message}</p>
      <p className="text-xs text-tertiary mt-1">Synchronizing workspace telemetry…</p>
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-11 h-11 rounded-lg bg-surface/70 border border-border-subtle flex items-center justify-center mb-3 text-tertiary">
        {icon ?? <Inbox size={20} strokeWidth={1.5} />}
      </div>
      <p className="text-sm font-medium text-ivory-dim">{title}</p>
      {description && <p className="text-xs text-tertiary mt-1 max-w-sm leading-relaxed">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="panel-card flex flex-col items-center justify-center py-14 px-6 text-center">
      <div className="w-11 h-11 rounded-lg bg-vermilion/10 border border-vermilion/30 flex items-center justify-center mb-3">
        <AlertCircle size={20} className="text-vermilion" />
      </div>
      <p className="text-sm font-medium text-vermilion mb-1">{message}</p>
      <p className="text-xs text-tertiary mb-4">Verify backend connectivity and try again.</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs font-medium text-ivory bg-surface hover:bg-surface-hover border border-border rounded-md px-3.5 py-1.5 transition-colors cursor-pointer"
        >
          Retry request
        </button>
      )}
    </div>
  );
}
