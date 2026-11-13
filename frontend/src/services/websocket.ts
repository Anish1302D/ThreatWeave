/* ── Reconnecting WebSocket client for DefenceIQ live trace ────── */

import type { AuditEvent } from '../types';

export type WsStatus = 'connecting' | 'connected' | 'disconnected';

export interface WsOptions {
  onEvent: (e: AuditEvent) => void;
  onStatus: (s: WsStatus) => void;
  /** Max reconnect delay in ms (default 8000) */
  maxDelay?: number;
}

const DEFAULT_MAX_DELAY = 8000;

export function createWsClient(opts: WsOptions): { close: () => void } {
  const maxDelay = opts.maxDelay ?? DEFAULT_MAX_DELAY;
  let ws: WebSocket | null = null;
  let attempt = 0;
  let closed = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function url(): string {
    const explicit = import.meta.env.VITE_WS_URL as string | undefined;
    if (explicit) return explicit;
    const apiBase = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/+$/, '');
    if (apiBase) {
      const wsBase = apiBase.replace(/^http/, 'ws');
      return `${wsBase}/ws`;
    }
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${location.host}/ws`;
  }

  function connect() {
    if (closed) return;
    opts.onStatus('connecting');
    ws = new WebSocket(url());

    ws.onopen = () => {
      attempt = 0;
      opts.onStatus('connected');
    };

    ws.onmessage = (msg) => {
      try {
        const parsed = JSON.parse(msg.data as string) as AuditEvent;
        if (parsed.ts && parsed.alert_id && parsed.kind) {
          opts.onEvent(parsed);
        }
      } catch {
        // Malformed frame — skip
      }
    };

    ws.onclose = () => {
      opts.onStatus('disconnected');
      scheduleReconnect();
    };

    ws.onerror = () => {
      ws?.close();
    };
  }

  function scheduleReconnect() {
    if (closed) return;
    const delay = Math.min(1000 * 2 ** attempt, maxDelay);
    attempt++;
    timer = setTimeout(connect, delay);
  }

  connect();

  return {
    close() {
      closed = true;
      if (timer) clearTimeout(timer);
      ws?.close();
    },
  };
}

