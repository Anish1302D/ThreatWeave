/* ── Confirmation dialog ─────────────────────────────────────────── */

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant?: 'default' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open, title, description, confirmLabel, confirmVariant = 'default',
  onConfirm, onCancel,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // Trap focus
  useEffect(() => {
    if (open) ref.current?.focus();
  }, [open]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open) return null;

  const confirmClass = confirmVariant === 'danger'
    ? 'bg-vermilion hover:bg-vermilion-dim text-white'
    : 'bg-teal hover:bg-teal-dim text-ink';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onCancel}>
      <div
        ref={ref}
        className="bg-graphite border border-border rounded-lg p-5 w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}
        tabIndex={-1}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-desc"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 id="confirm-title" className="text-sm font-semibold text-ivory">{title}</h2>
          <button onClick={onCancel} className="text-secondary hover:text-ivory p-1" aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <p id="confirm-desc" className="text-sm text-secondary mb-5 leading-relaxed">{description}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm text-secondary border border-border rounded-md hover:text-ivory hover:border-secondary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

