/* ── Pure derivation functions: no side effects, no invented data ── */

import type { Alert, AuditEvent, ApprovalRequest } from '../types';
import { approvalFromEvent } from '../types';

/* ── Evidence Spine stages ───────────────────────────────────────── */

export type SpineStage =
  | 'received'
  | 'triaged'
  | 'enriched'
  | 'investigated'
  | 'validated'
  | 'response_proposed'
  | 'decision_recorded';

export interface SpineEntry {
  stage: SpineStage;
  label: string;
  agent: string;
  ts: number | null;
  status: 'completed' | 'active' | 'pending' | 'skipped';
  detail: string | null;
  events: AuditEvent[];
}

const STAGE_DEFS: { stage: SpineStage; label: string; kinds: string[]; agents: string[] }[] = [
  { stage: 'received',          label: 'Event Received',              kinds: ['alert_received'],      agents: ['ingest'] },
  { stage: 'triaged',           label: 'Triage Performed',            kinds: ['verdict'],             agents: ['triage'] },
  { stage: 'enriched',          label: 'Threat Intelligence Enriched',kinds: ['verdict'],             agents: ['intel'] },
  { stage: 'investigated',      label: 'Forensic Investigation',      kinds: ['timeline', 'citation_check'], agents: ['forensics'] },
  { stage: 'validated',         label: 'Evidence Validated',          kinds: ['citation_check'],      agents: ['forensics'] },
  { stage: 'response_proposed', label: 'Response Recommendation',     kinds: ['proposal'],            agents: ['response'] },
  { stage: 'decision_recorded', label: 'Human Decision Recorded',     kinds: ['approved', 'rejected_by_analyst', 'rejected'], agents: ['analyst', 'gate'] },
];

export function buildSpine(events: AuditEvent[], alert: Alert): SpineEntry[] {
  const isDone = alert.status === 'resolved' || alert.status === 'closed_noise';
  const isNoise = alert.status === 'closed_noise';

  return STAGE_DEFS.map(({ stage, label, kinds, agents }) => {
    const matching = events.filter(
      e => kinds.includes(e.kind) && agents.includes(e.agent),
    );
    const last = matching.at(-1);

    let status: SpineEntry['status'] = 'pending';
    if (matching.length > 0) {
      status = 'completed';
    } else if (isNoise && ['enriched', 'investigated', 'validated', 'response_proposed', 'decision_recorded'].includes(stage)) {
      status = 'skipped';
    } else if (!isDone) {
      // Check if the agent is currently active
      const agentEvents = events.filter(e => agents.includes(e.agent));
      if (agentEvents.length > 0 && !last) status = 'active';
    }

    return {
      stage,
      label,
      agent: last?.agent ?? agents[0] ?? '',
      ts: last?.ts ?? null,
      status,
      detail: last?.msg ?? null,
      events: matching,
    };
  });
}

/* ── Pending approvals ───────────────────────────────────────────── */

export function derivePendingApprovals(events: AuditEvent[]): ApprovalRequest[] {
  const map = new Map<string, ApprovalRequest>();

  for (const e of events) {
    if (e.kind === 'approval_required') {
      const req = approvalFromEvent(e);
      if (req) map.set(req.key, req);
    }
    if (e.kind === 'approved' || e.kind === 'rejected_by_analyst') {
      const key = (e.data as { key?: string }).key;
      if (key) {
        const existing = map.get(key);
        if (existing) {
          existing.decision = e.kind === 'approved' ? 'approved' : 'rejected';
          existing.decisionTs = e.ts;
        }
      }
    }
  }
  return Array.from(map.values());
}

export function pendingOnly(approvals: ApprovalRequest[]): ApprovalRequest[] {
  return approvals.filter(a => !a.decision);
}

/* ── Threat intel from audit events ──────────────────────────────── */

export interface DerivedIntel {
  ip: string;
  abuseipdb: number;
  otxPulses: number;
  tags: string[];
  mitreId: string;
  mitreName: string;
}

export function deriveIntel(events: AuditEvent[]): DerivedIntel | null {
  let ip = '';
  let abuseipdb = 0;
  let otxPulses = 0;
  let tags: string[] = [];
  let mitreId = '';
  let mitreName = '';

  for (const e of events) {
    if (e.agent !== 'intel' || e.kind !== 'tool_call') continue;
    const d = e.data as { tool?: string; result?: Record<string, unknown>; args?: Record<string, unknown> };
    if (d.tool === 'lookup_ip' && d.result) {
      ip = String(d.args?.ip ?? '');
      abuseipdb = Number(d.result.abuseipdb ?? 0);
      otxPulses = Number(d.result.otx_pulses ?? 0);
      tags = Array.isArray(d.result.tags) ? (d.result.tags as string[]) : [];
    }
    if (d.tool === 'mitre_map' && d.result) {
      const r = d.result as unknown;
      if (Array.isArray(r) && r.length >= 2) {
        mitreId = String(r[0]);
        mitreName = String(r[1]);
      }
    }
  }

  if (!ip && !mitreId) return null;
  return { ip, abuseipdb, otxPulses, tags, mitreId, mitreName };
}

/* ── Timeline from forensics ─────────────────────────────────────── */

export function deriveTimeline(events: AuditEvent[]): string[] {
  const timelineEvent = events.find(e => e.agent === 'forensics' && e.kind === 'timeline');
  if (!timelineEvent) return [];
  const t = (timelineEvent.data as { timeline?: string[] }).timeline;
  return Array.isArray(t) ? t : [];
}

/* ── Response actions from audit events ──────────────────────────── */

export interface DerivedAction {
  name: string;
  args: Record<string, unknown>;
  autoRun: boolean;
  approved: boolean | null;  // null = pending
  simulated: boolean;        // all remediation in prototype is simulated
}

export function deriveActions(events: AuditEvent[]): DerivedAction[] {
  const actions: DerivedAction[] = [];
  const approvals = derivePendingApprovals(events);
  const approvalMap = new Map(approvals.map(a => [a.key, a]));

  // Response tool_calls that came AFTER proposal = auto-run or approved
  const proposal = events.find(e => e.agent === 'response' && e.kind === 'proposal');
  if (!proposal) return [];

  const postProposal = events.filter(e => e.ts >= proposal.ts);
  const seenActions = new Set<string>();

  for (const e of postProposal) {
    if (e.agent === 'response' && e.kind === 'tool_call') {
      const d = e.data as { tool?: string; args?: Record<string, unknown> };
      if (d.tool && !seenActions.has(d.tool)) {
        seenActions.add(d.tool);
        // Check if this was auto-run or went through approval
        const wasApprovalRequired = approvals.some(a => a.action === d.tool);
        actions.push({
          name: d.tool,
          args: d.args ?? {},
          autoRun: !wasApprovalRequired,
          approved: wasApprovalRequired ? true : null,
          simulated: true,
        });
      }
    }
    if (e.agent === 'gate' && e.kind === 'rejected') {
      // Find which action was rejected
      const matchingApproval = Array.from(approvalMap.values()).find(
        a => a.decision === 'rejected' && !seenActions.has(a.action)
      );
      if (matchingApproval) {
        seenActions.add(matchingApproval.action);
        actions.push({
          name: matchingApproval.action,
          args: matchingApproval.args,
          autoRun: false,
          approved: false,
          simulated: true,
        });
      }
    }
  }

  // Add pending approvals not yet resolved
  for (const a of approvals) {
    if (!a.decision && !seenActions.has(a.action)) {
      actions.push({
        name: a.action,
        args: a.args,
        autoRun: false,
        approved: null,
        simulated: true,
      });
    }
  }

  return actions;
}

/* ── Agent status summary ────────────────────────────────────────── */

export interface AgentStatus {
  agent: string;
  label: string;
  lastKind: string;
  lastMsg: string;
  lastTs: number;
  eventCount: number;
  hasErrors: boolean;
}

export function deriveAgentStatuses(events: AuditEvent[], agents: string[]): AgentStatus[] {
  const agentLabels: Record<string, string> = {
    triage: 'Alert Triage Agent',
    intel: 'Threat Intelligence Agent',
    forensics: 'Forensics & Evidence Agent',
    response: 'Response Planner Agent',
  };

  return agents.map(agent => {
    const agentEvents = events.filter(e => e.agent === agent);
    const last = agentEvents.at(-1);
    return {
      agent,
      label: agentLabels[agent] ?? agent,
      lastKind: last?.kind ?? '',
      lastMsg: last?.msg ?? 'Not started',
      lastTs: last?.ts ?? 0,
      eventCount: agentEvents.length,
      hasErrors: agentEvents.some(e => e.kind === 'tool_denied' || e.kind === 'injection_quarantined'),
    };
  });
}

/* ── Deduplication key for WS events ─────────────────────────────── */

export function eventKey(e: AuditEvent): string {
  return `${e.ts}|${e.alert_id}|${e.kind}|${e.msg}`;
}

