/* ── Toast container ─────────────────────────────────────────────── */

import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useToasts, type ToastType } from '../state/ToastStore';

const ICONS: Record<ToastType, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
};

const COLORS: Record<ToastType, string> = {
  info: 'border-blue/40 text-blue',
  success: 'border-teal/40 text-teal',
  error: 'border-vermilion/40 text-vermilion',
  warning: 'border-amber/40 text-amber',
};

export function ToastContainer() {
  const { toasts, removeToast } = useToasts();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm" role="log" aria-live="polite">
      {toasts.map(t => {
        const Icon = ICONS[t.type];
        return (
          <div
            key={t.id}
            className={`flex items-start gap-2.5 bg-graphite/95 backdrop-blur-sm border rounded-lg px-3.5 py-2.5 shadow-2xl
                        animate-[fadeIn_0.2s_ease-out] ${COLORS[t.type]}`}
          >
            <Icon size={16} className="mt-0.5 shrink-0" />
            <p className="text-xs leading-relaxed text-ivory flex-1">{t.message}</p>
            <button
              onClick={() => removeToast(t.id)}
              className="text-secondary hover:text-ivory shrink-0 p-0.5 rounded hover:bg-surface cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
