# DefenceIQ — AI Agent Decision Reasoning & Governance Specification

This document details the multi-agent orchestration architecture, tool permission envelopes, prompt-injection defense mechanisms, and evidence provenance verification rules implemented in the DefenceIQ operations platform.

---

## 1. Multi-Agent State Graph Architecture

The platform executes a deterministic, acyclic state graph orchestrating four bounded agents and one governance gate:

```
[ Ingest Adapter ]
        │
        ▼
[ Alert Triage Agent ] ──(If Low / Benign)──> [ Closed as Noise ]
        │ (If Escalate)
        ▼
[ Threat Intelligence Agent ]
        │
        ▼
[ Forensics & Evidence Agent ]
        │
        ▼
[ Response Planner Agent ]
        │
        ▼
[ Human Approval Gate ] ──(Analyst Sign-off)──> [ Enforce & Resolve ]
```

### State Transition Matrix

| Current Node | Transition Condition | Target Node | Rationale |
|---|---|---|---|
| `triage` | `escalate == true` | `intel` | Incident pattern matches known adversary signature or high-risk anomaly. |
| `triage` | `escalate == false` | `None` (`closed_noise`) | Low-signal alert or verified benign behavior (e.g., traveling employee, internal scanner). |
| `intel` | Unconditional | `forensics` | Enrichment must precede forensic reconstruction to inform indicator correlation. |
| `forensics` | Unconditional | `response` | Remediation planning requires validated forensic timeline and citation check. |
| `response` | Unconditional | `gate` | All proposed containment actions must pass through risk tiering and approval checks. |
| `gate` | All futures resolved | `None` (`resolved`) | Workflow concludes with incident report synthesis and audit finalization. |

---

## 2. Specialized Agent Profiles & Tool Allowlists

Each agent operates under a strictly enforced least-privilege capability envelope defined in the `ALLOW` configuration (`main.py`):

```python
ALLOW = {
    "triage": {"query_history"},
    "intel": {"lookup_ip", "mitre_map"},
    "forensics": {"query_logs"},
    "response": {
        "tag_alert", "add_comment",
        "disable_account", "force_password_reset",
        "block_ip", "isolate_host"
    }
}
```

Any attempt by an agent to invoke a tool outside its whitelist immediately aborts execution, raises a `PermissionError`, and records an immutable `tool_denied` event in the audit ledger.

### Agent Responsibilities

#### 1. Alert Triage Agent
- **Allowed Tools**: `query_history`
- **Objective**: Rapidly separate critical indicators from benign background noise.
- **Decision Logic**:
  - Checks if the source IP matches the verified corporate vulnerability scanner (`10.0.0.5`) or backup infrastructure (`192.0.2.10`). If matched, escalates to `false`, confidence `0.05`.
  - Analyzes event type baselines: `bruteforce_then_success` (0.90), `large_outbound_transfer` (0.80), `failed_login_burst` (0.70), `impossible_travel` (0.75).
  - Cross-references user mobility history via `query_history(user)`. For traveling personnel (e.g., `neha.s`), reduces score by 0.40 and classifies as benign.

#### 2. Threat Intelligence Agent
- **Allowed Tools**: `lookup_ip`, `mitre_map`
- **Objective**: Contextualize indicators of compromise (IOCs) with reputation scores and standard tactics.
- **Enrichment Logic**:
  - Evaluates external IP reputation against simulated threat intelligence databases (simulating AbuseIPDB, VirusTotal, and AlienVault OTX).
  - Maps alert behavior to MITRE ATT&CK framework IDs (e.g., `T1110.001` Brute Force, `T1078` Valid Accounts, `T1041` Exfiltration Over C2).

#### 3. Forensics & Evidence Agent
- **Allowed Tools**: `query_logs`
- **Objective**: Reconstruct end-to-end incident timelines from raw telemetry and validate claims.
- **Defense-in-Depth Measures**:
  - **Prompt Injection Quarantine**: Log streams are treated as adversarial untrusted input. Regex scanner `INJECTION` identifies malicious instructions (e.g., `IGNORE ALL PREVIOUS INSTRUCTIONS`, `disable_firewall`).
  - Quarantined lines are permanently excised from the evidence graph and audit-logged as `injection_quarantined`.
  - **Red-Team Simulation**: Automatically simulates a hijacked agent attempting an illegal containment tool (`disable_firewall`), verifying that the permission gate halts the rogue action.
  - **Citation Provenance Check**: Every claim asserted by the agent must cite concrete, verified log record IDs (`L001`–`L049`). Claims lacking valid citations are rejected from the report.

#### 4. Response Planner Agent
- **Allowed Tools**: `tag_alert`, `add_comment`, `disable_account`, `force_password_reset`, `block_ip`, `isolate_host`
- **Objective**: Formulate surgical remediation proposals based on corroborated evidence.
- **Risk Tiering**:
  - **Low-Risk Actions** (`tag_alert`, `add_comment`): Executed automatically without human friction.
  - **High-Risk Containment Actions** (`block_ip`, `disable_account`, `force_password_reset`, `isolate_host`): Execution is strictly halted at the runtime engine level until explicit analyst approval is received.

---

## 3. Human Approval Gate (`gate`)

The human-in-the-loop gate is an architectural boundary enforced via Python `asyncio.Future` promises:

1. When a high-risk action is proposed, an unresolved Future is assigned to key `{alert_id}:{action_index}`.
2. The workflow pauses execution indefinitely. The alert status transitions to `awaiting_approval`.
3. An analyst reviews the proposed action, arguments, and supporting evidence in the UI.
4. Calling `POST /api/approve/{key}?ok=true` sets the future result to `True`, executing the containment adapter.
5. Calling `POST /api/approve/{key}?ok=false` sets the future result to `False`, aborting execution and recording an analyst rejection in the append-only ledger.
