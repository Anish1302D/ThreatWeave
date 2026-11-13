/* ── Empty, Loading, and Error state components ──────────────────── */

import { Loader2, AlertCircle, Inbox } from 'lucide-react';

export function LoadingState({ message = 'Loading…' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-secondary" role="status">
      <Loader2 size={24} className="animate-spin mb-3 text-tertiary" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

export function EmptyState({ icon, title, description }: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-3 text-tertiary">
        {icon ?? <Inbox size={32} strokeWidth={1} />}
      </div>
      <p className="text-sm font-medium text-secondary">{title}</p>
      {description && <p className="text-xs text-tertiary mt-1 max-w-xs">{description}</p>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <AlertCircle size={24} className="text-vermilion mb-3" />
      <p className="text-sm text-vermilion mb-2">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs text-secondary border border-border rounded px-3 py-1 hover:text-ivory hover:border-secondary transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}

