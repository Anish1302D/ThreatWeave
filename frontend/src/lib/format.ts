/* ── Shared formatting utilities ──────────────────────────────────── */

export function formatEpoch(epoch: number): string {
  if (!epoch || epoch < 1e9) return '—';
  return new Date(epoch * 1000).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function formatEpochShort(epoch: number): string {
  if (!epoch || epoch < 1e9) return '—';
  return new Date(epoch * 1000).toLocaleString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function formatRelativeTime(epoch: number): string {
  if (!epoch || epoch < 1e9) return '—';
  const diff = Date.now() / 1000 - epoch;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function statusLabel(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

export function pluralize(n: number, singular: string, plural?: string): string {
  return `${n} ${n === 1 ? singular : (plural ?? singular + 's')}`;
}

