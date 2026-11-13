/* ── Audit event shape from GET /api/audit and WS /ws ──────────── */

export interface AuditEvent {
  n?: number;             // present in REST response, absent in WS frames
  ts: number;             // epoch seconds
  alert_id: string;
  agent: AgentName;
  kind: AuditKind;
  msg: string;
  data: Record<string, unknown>;
}

export type AgentName =
  | 'ingest'
  | 'triage'
  | 'intel'
  | 'forensics'
  | 'response'
  | 'gate'
  | 'analyst'
  | 'system';

export type AuditKind =
  | 'alert_received'
  | 'start'
  | 'tool_call'
  | 'tool_denied'
  | 'verdict'
  | 'injection_quarantined'
  | 'red_team'
  | 'citation_check'
  | 'timeline'
  | 'proposal'
  | 'approval_required'
  | 'approved'
  | 'rejected'
  | 'rejected_by_analyst'
  | 'done'
  | string;    // future-proof

/** Display-friendly labels for agents */
export const AGENT_LABELS: Record<AgentName, string> = {
  ingest: 'Ingest',
  triage: 'Alert Triage Agent',
  intel: 'Threat Intelligence Agent',
  forensics: 'Forensics & Evidence Agent',
  response: 'Response Planner Agent',
  gate: 'Approval Gate',
  analyst: 'Human Analyst',
  system: 'System',
};

/** The four specialized AI agents in the prototype */
export const INVESTIGATION_AGENTS: AgentName[] = ['triage', 'intel', 'forensics', 'response'];

