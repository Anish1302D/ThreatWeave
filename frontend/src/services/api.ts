/* ── Typed HTTP client for the DefenceIQ FastAPI backend ────────── */

import type { Alert, AuditEvent, EvalResult } from '../types';

const BASE = import.meta.env.VITE_API_BASE ?? '';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: string,
  ) {
    super(`API ${status}: ${detail}`);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = (await res.json()) as { detail?: string };
      if (body.detail) detail = body.detail;
    } catch { /* body may not be JSON */ }
    throw new ApiError(res.status, detail);
  }
  return (await res.json()) as T;
}

/* ── Endpoints ───────────────────────────────────────────────────── */

export function fetchAlerts(): Promise<Alert[]> {
  return request<Alert[]>('/api/alerts');
}

export function fetchAudit(alertId?: string): Promise<AuditEvent[]> {
  const qs = alertId ? `?alert_id=${encodeURIComponent(alertId)}` : '';
  return request<AuditEvent[]>(`/api/audit${qs}`);
}

export function runScenario(): Promise<{ started: number }> {
  return request<{ started: number }>('/api/scenario/run', { method: 'POST' });
}

export function submitApproval(key: string, ok: boolean): Promise<void> {
  return request<void>(
    `/api/approve/${encodeURIComponent(key)}?ok=${ok}`,
    { method: 'POST' },
  );
}

export function fetchEval(): Promise<EvalResult> {
  return request<EvalResult>('/api/eval');
}

