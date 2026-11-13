/* ── Global live-data store: alerts + audit + WS status ──────────── */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Alert, AuditEvent } from '../types';
import { fetchAlerts, fetchAudit } from '../services/api';
import { createWsClient, type WsStatus } from '../services/websocket';
import { eventKey } from '../lib/derive';

interface LiveState {
  alerts: Alert[];
  audit: AuditEvent[];
  wsStatus: WsStatus;
  apiReachable: boolean | null;
  refreshAlerts: () => Promise<void>;
  refreshAudit: () => Promise<void>;
}

const LiveCtx = createContext<LiveState | null>(null);

export function useLive(): LiveState {
  const ctx = useContext(LiveCtx);
  if (!ctx) throw new Error('useLive must be used within <LiveProvider>');
  return ctx;
}

export function LiveProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [wsStatus, setWsStatus] = useState<WsStatus>('connecting');
  const [apiReachable, setApiReachable] = useState<boolean | null>(null);

  // De-dup set for WS events
  const seenKeys = useRef(new Set<string>());
  // Debounce timer for alert refresh
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshAlerts = useCallback(async () => {
    try {
      const data = await fetchAlerts();
      setAlerts(data);
      setApiReachable(true);
    } catch {
      setApiReachable(false);
    }
  }, []);

  const refreshAudit = useCallback(async () => {
    try {
      const data = await fetchAudit();
      // Rebuild de-dup set
      seenKeys.current = new Set(data.map(eventKey));
      setAudit(data);
      setApiReachable(true);
    } catch {
      setApiReachable(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    void refreshAlerts();
    void refreshAudit();
  }, [refreshAlerts, refreshAudit]);

  // WebSocket — merge events, debounce alert refresh
  useEffect(() => {
    const client = createWsClient({
      onStatus: setWsStatus,
      onEvent: (e) => {
        const k = eventKey(e);
        if (seenKeys.current.has(k)) return; // duplicate
        seenKeys.current.add(k);
        setAudit(prev => [...prev, e]);

        // Debounce alert refresh — new events may change status
        if (refreshTimer.current) clearTimeout(refreshTimer.current);
        refreshTimer.current = setTimeout(() => void refreshAlerts(), 500);
      },
    });
    return () => {
      client.close();
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [refreshAlerts]);

  const value = useMemo<LiveState>(
    () => ({ alerts, audit, wsStatus, apiReachable, refreshAlerts, refreshAudit }),
    [alerts, audit, wsStatus, apiReachable, refreshAlerts, refreshAudit],
  );

  return <LiveCtx value={value}>{children}</LiveCtx>;
}

