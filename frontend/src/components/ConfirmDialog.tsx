/* ── Confirmation dialog ─────────────────────────────────────────── */

import { useEffect, useRef } from 'react';
import { ShieldCheck, ShieldAlert, X } from 'lucide-react';

export interface ConfirmDetailItem {
  label: string;
  value: string;
  mono?: boolean;
}

interface Props {
  open: boolean;
  title: string;
  description: string;
  details?: ConfirmDetailItem[];
  notice?: string;
  confirmLabel: string;
  confirmVariant?: 'default' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  details,
  notice,
  confirmLabel,
  confirmVariant = 'default',
  onConfirm,
  onCancel,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) ref.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open) return null;

  const isDanger = confirmVariant === 'danger';
  const confirmClass = isDanger
    ? 'bg-vermilion hover:bg-vermilion-dim text-white'
    : 'bg-teal hover:bg-teal-dim text-ink font-semibold';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-[2px]"
      onClick={onCancel}
    >
      <div
        ref={ref}
        className="bg-graphite border border-border rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-[modalIn_0.16s_ease-out]"
        onClick={e => e.stopPropagation()}
        tabIndex={-1}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-desc"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-ink/60">
          <div className="flex items-center gap-2.5">
            <div className={`w-7 h-7 rounded-md flex items-center justify-center border ${
              isDanger
                ? 'bg-vermilion/12 border-vermilion/30 text-vermilion'
                : 'bg-teal/12 border-teal/30 text-teal'
            }`}>
              {isDanger ? <ShieldAlert size={15} /> : <ShieldCheck size={15} />}
            </div>
            <div>
              <h2 id="confirm-title" className="text-sm font-semibold text-ivory">{title}</h2>
              <p className="text-[10px] font-mono uppercase tracking-wider text-tertiary">
                Human Approval Gate
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-secondary hover:text-ivory p-1 rounded-md hover:bg-surface transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3.5">
          <p id="confirm-desc" className="text-sm text-ivory-dim leading-relaxed whitespace-pre-line">
            {description}
          </p>

          {details && details.length > 0 && (
            <div className="panel-inset divide-y divide-border-subtle">
              {details.map(item => (
                <div key={item.label} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                  <span className="text-tertiary shrink-0">{item.label}</span>
                  <span className={`text-ivory truncate ${item.mono ? 'font-mono' : ''}`}>{item.value}</span>
                </div>
              ))}
            </div>
          )}

          {notice && (
            <div className={`rounded-md px-3 py-2 text-xs border ${
              isDanger
                ? 'bg-vermilion/8 border-vermilion/25 text-vermilion'
                : 'bg-amber/8 border-amber/25 text-amber'
            }`}>
              {notice}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-border bg-ink/40">
          <button
            onClick={onCancel}
            className="px-3.5 py-1.5 text-xs font-medium text-secondary bg-surface/60 border border-border rounded-md hover:text-ivory hover:bg-surface transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
