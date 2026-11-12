# DefenceIQ

**AI-Powered Cybersecurity Platform for Threat Detection, Evidence-Backed Investigation & Human-Approved Response**

[![Project Stage](https://img.shields.io/badge/Project%20Stage-Early%20Prototype%20%2F%20Planning-blue.svg)](docs/DEFENCEIQ_ARCHITECTURE.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-009688.svg)](https://fastapi.tiangolo.com)
[![Team](https://img.shields.io/badge/Team-AMFinity-orange.svg)](#project-information)

---

> [!IMPORTANT]
> **Project Stage: Initial Planning & Early Prototype**  
> DefenceIQ is currently in its initial planning and early prototype development stage. This repository contains an initial functional proof-of-concept demonstrating multi-agent state graph orchestration, agent tool allowlists, prompt-injection quarantine, and human approval gates, alongside the full proposed enterprise architecture detailed in [docs/DEFENCEIQ_ARCHITECTURE.md](docs/DEFENCEIQ_ARCHITECTURE.md).

---

## Table of Contents

1. [Introduction](#introduction)
2. [Problem Statement](#problem-statement)
3. [Proposed Solution](#proposed-solution)
4. [Key Capabilities & MVP Scope](#key-capabilities--mvp-scope)
5. [Proposed System Architecture](#proposed-system-architecture)
6. [AI Agent Responsibilities & Interaction Protocol](#ai-agent-responsibilities--interaction-protocol)
7. [End-to-End Investigation Workflow](#end-to-end-investigation-workflow)
8. [Current Prototype Status & Implementation Transparency](#current-prototype-status--implementation-transparency)
9. [Technology Stack](#technology-stack)
10. [Installation and Setup](#installation-and-setup)
11. [Environment Configuration](#environment-configuration)
12. [Project Structure](#project-structure)
13. [Security, Governance & Human Approval](#security-governance--human-approval)
14. [Development Roadmap](#development-roadmap)
15. [Contribution Guidelines](#contribution-guidelines)
16. [Project Information & License](#project-information--license)

---

## Introduction

**DefenceIQ** is an AI-powered cybersecurity operations platform designed to help modern Security Operations Centers (SOCs) move from disconnected, overwhelming security alerts to unified, prioritized, and evidence-backed investigations.

In enterprise security environments, analysts are bombarded with hundreds or thousands of daily alerts from disparate sources—endpoints, network firewalls, identity providers, and cloud workloads. Most alerts lack cross-system context, leading to alert fatigue, missed lateral movement, and delayed incident containment.

DefenceIQ introduces a structured, AI-assisted investigation pipeline governed by strict safety principles:
- **Evidence before interpretation:** AI agents must explicitly cite concrete event and log identifiers for every assertion.
- **Human-in-the-loop governance:** Destructive or high-impact remediation actions are blocked at the engine level until an authorized human analyst grants explicit approval.
- **Tamper-resistant audit trails:** Every alert transition, agent query, tool execution, and analyst decision is recorded in an append-only audit log.

For the comprehensive architectural design, please review the [DefenceIQ Proposed Architecture & Technical Design Document](docs/DEFENCEIQ_ARCHITECTURE.md).

---

## Problem Statement

Modern cybersecurity operations teams face mounting structural obstacles that hinder rapid and effective incident handling:

| Problem Domain | Real-World Operational Challenge | Consequence |
|---|---|---|
| **Alert Fatigue** | SOC teams receive tens of thousands of security alerts weekly across endpoints, firewalls, and cloud services. Over 70% are low-fidelity or false positives. | Critical breaches are buried beneath noise, resulting in analyst burnout and missed attacks. |
| **Fragmented Context** | Security telemetry resides in disconnected silos (e.g., VPN logs, Active Directory, EDR, cloud audit trails). | Correlating a remote VPN brute-force attempt with an internal host transfer requires slow, manual pivoting. |
| **Investigation Dwell Time** | Analysts must manually look up IP reputations, parse raw log timestamps, and reconstruct chronological timelines. | Mean Time to Detect (MTTD) and Respond (MTTR) stretch from hours into days or weeks. |
| **Lack of Traceable Evidence** | Automated tools often generate alert verdicts without explaining *why* an event was flagged or *which* log lines substantiate the hypothesis. | Analysts cannot trust opaque recommendations, or compliance auditors reject incident reports for lack of provenance. |
| **Unsafe Autonomous SOAR** | Traditional SOAR playbooks that trigger automated isolations or account suspensions risk critical operational downtime on false alarms. | Organizations resist automation or suffer inadvertent business interruption. |

---

## Proposed Solution

DefenceIQ solves these challenges by combining structured data processing, modular AI agents, and strict human-in-the-loop controls into a unified security operations workflow:

```
[ Ingest & Normalize ] ──> [ Correlate & Enrich ] ──> [ Multi-Agent Investigation ] ──> [ Human Approval Gate ] ──> [ Enforce & Audit ]
```

### Vision
To build a resilient, explainable security operations platform where AI agents handle the mechanical heavy lifting of log querying, threat intelligence correlation, and timeline assembly—while human analysts retain complete authority over containment and remediation decisions.

### Core Objectives
1. **Multi-Source Telemetry Ingestion:** Ingest security events across endpoints, network perimeters, cloud infrastructures, and identity providers.
2. **Deterministic Correlation & Deduplication:** Connect disparate alerts into unified incident candidates using transparent, explainable correlation rules.
3. **Specialized AI Agents:** Deploy bounded agents specialized in triage, threat intelligence enrichment, digital forensics, and remediation planning.
4. **Strict Evidence Provenance:** Enforce that every investigative claim maps directly to verified raw log citations before being presented as a finding.
5. **Human-Governed Remediation:** Provide granular human approval gates ensuring no high-impact action (account disablement, host isolation, IP blocking) executes without analyst sign-off.
6. **Immutable Audit Trail:** Maintain an append-only ledger of every system event, tool invocation, and human decision for forensic defensibility and compliance.

---

## Key Capabilities & MVP Scope

### Core Capabilities

As detailed in the architecture specification, DefenceIQ establishes eight foundational capabilities:

1. **Multi-Source Event Ingestion:** Ingest raw security alerts, audit trails, and syslog records through dedicated source adapters.
2. **Schema Normalization & Entity Extraction:** Parse diverse source formats into a unified event schema while extracting key indicators of compromise (IOCs: IP addresses, account names, host identifiers, file hashes).
3. **Deterministic Correlation Engine:** Group correlated alerts across shared entities and temporal windows into unified incident candidates.
4. **Contextual Threat Intelligence Enrichment:** Automatically query external threat intelligence providers and map activities to MITRE ATT&CK framework tactics and techniques.
5. **Specialized AI Multi-Agent Orchestration:** Execute a state graph of bounded agents performing initial triage, indicator enrichment, forensic log analysis, and remediation proposal.
6. **Traceable Timeline & Evidence Graph:** Construct chronological incident timelines where every finding references validated raw telemetry.
7. **Human-in-the-Loop Approval Gate:** Protect enterprise operations by requiring human analyst authorization before executing non-trivial remediation actions.
8. **Real-Time Streaming & Immutable Audit Ledger:** Stream agent execution progress in real time via WebSockets and record all decisions in an append-only database.

### Project Scope Boundaries

To ensure verifiable engineering quality, DefenceIQ clearly defines its initial MVP boundaries:

| Dimension | In-Scope for Initial MVP | Out-of-Scope for Initial MVP |
|---|---|---|
| **Data Ingestion** | Controlled JSON event inputs, synthetic enterprise attack scenarios, and simulated log streams. | Live production connectors for all commercial SIEM/EDR vendors. |
| **Correlation** | Rule-based entity correlation (shared user, IP, host) and alert deduplication. | Complex graph neural network clustering or black-box correlation algorithms. |
| **Threat Intelligence** | Local IOC reputation lookup simulating AbuseIPDB, VirusTotal, and AlienVault OTX, plus static MITRE ATT&CK mapping. | Production enterprise TI feeds requiring paid commercial subscription tiers. |
| **Agent Reasoning** | Deterministic state graph with bounded tool allowlists and optional LLM narrative synthesis (`ANTHROPIC_API_KEY`). | Unbounded autonomous multi-agent chats or open-ended web browsing agents. |
| **Response Actions** | Automated low-risk logging/tagging; human approval gate for containment (simulated account lockout, host isolation, firewall block). | Direct execution of destructive network-wide active directory changes or physical firewall reconfigurations. |
| **Storage & Audit** | In-memory / file-based SQLite database with trigger-enforced append-only guarantees (`audit_no_update`, `audit_no_delete`). | Multi-region distributed CockroachDB/PostgreSQL clusters. |

### Target Stakeholders & User Personas

- **Tier-1 / Tier-2 SOC Analysts:** Triage high-volume alerts with immediate, citation-backed context rather than raw logs.
- **Incident Responders:** Review correlated timelines and approve or refine surgical containment proposals.
- **Security Engineering & Administrators:** Audit automated agent actions, configure tool allowlists, and inspect tamper-proof event logs.
- **Security Leadership (CISOs & SOC Managers):** Gain visibility into triage accuracy, false-positive reductions, and response latencies without risking unmonitored automation.

---

## Proposed System Architecture

DefenceIQ's architecture is organized into seven decoupled logical layers, separating event processing from presentation and governance:

```mermaid
flowchart TD
    subgraph L1["01 · Telemetry Sources"]
        S1["Endpoint & EDR Telemetry"]
        S2["Firewall & Network Alerts"]
        S3["Cloud Identity & Workloads"]
    end

    subgraph L2["02 · Ingestion & Normalization"]
        IN1["Source Ingestion Adapters"]
        IN2["Schema Normalizer & IOC Extractor"]
        IN3["Correlation & Deduplication Engine"]
    end

    subgraph L3["03 · Threat Intelligence Layer"]
        TI1["IOC Reputation (AbuseIPDB, VT, OTX)"]
        TI2["MITRE ATT&CK Mapping"]
    end

    subgraph L4["04 · AI Multi-Agent State Graph"]
        AG1["Triage Agent"]
        AG2["Threat Intel Agent"]
        AG3["Forensics Agent"]
        AG4["Response Planner Agent"]
    end

    subgraph L5["05 · Evidence & Risk Engine"]
        EV1["Citation Check & Validation"]
        EV2["Incident Timeline Builder"]
        EV3["Explainable Risk Scorer"]
    end

    subgraph L6["06 · Governance & Approval Gate"]
        G1{"Human Approval Required?"}
        G2["Auto-Execute Low Risk (Tag, Comment)"]
        G3["Analyst Decision (Approve / Reject / Defer)"]
        G4["Response Action Adapters"]
    end

    subgraph L7["07 · Audit & Presentation"]
        AU1["Append-Only Audit Ledger (SQLite / Postgres)"]
        UI1["Real-Time Analyst Workspace & WS Streaming"]
    end

    L1 --> IN1
    IN1 --> IN2 --> IN3
    IN3 --> AG1
    IN2 -.-> TI1
    TI1 --> TI2 --> AG2
    AG1 --> AG2 --> AG3 --> AG4
    AG3 --> EV1 --> EV2 --> EV3
    AG4 --> G1
    G1 -->|Low Risk Action| G2 --> G4
    G1 -->|High Risk Action| G3 --> G4
    G4 --> AU1
    G3 --> AU1
    EV2 --> UI1
    AU1 -.-> UI1
```

### Architectural Layer Summary & Detailed References

| Layer | Responsibility | Architectural Reference |
|---|---|---|
| **01 · Telemetry Ingestion** | Ingest raw event payloads from diverse security systems; validate formatting. | [Ingestion Layer](docs/DEFENCEIQ_ARCHITECTURE.md#61-data-ingestion-layer) |
| **02 · Normalization & Correlation** | Map source logs to unified schema; correlate related alerts into incident candidates. | [Normalization & Correlation](docs/DEFENCEIQ_ARCHITECTURE.md#62-normalization--correlation-layer) |
| **03 · Threat Intelligence** | Query IP/hash/domain reputations; map techniques to MITRE ATT&CK matrix. | [Threat Intelligence Layer](docs/DEFENCEIQ_ARCHITECTURE.md#64-threat-intelligence-layer) |
| **04 · AI Agent Orchestration** | Coordinate bounded agents across triage, intel, forensics, and remediation planning. | [AI Agent Layer](docs/DEFENCEIQ_ARCHITECTURE.md#63-ai-agent-layer) |
| **05 · Evidence & Risk Engine** | Enforce raw log citation checks; reconstruct chronological incident timelines. | [Evidence & Risk Engine](docs/DEFENCEIQ_ARCHITECTURE.md#65-evidence--risk-engine) |
| **06 · Response & Approval Gate** | Enforce mandatory analyst approval before executing containment actions. | [Response & Approval Layer](docs/DEFENCEIQ_ARCHITECTURE.md#66-response--approval-layer) |
| **07 · Audit & Presentation** | Maintain immutable event history via triggers; stream trace events to UI. | [Dashboard & Reporting](docs/DEFENCEIQ_ARCHITECTURE.md#67-dashboard--reporting) |

For complete technical specifications, database schema diagrams, and sequence flows, refer to [docs/DEFENCEIQ_ARCHITECTURE.md](docs/DEFENCEIQ_ARCHITECTURE.md).

---

## AI Agent Responsibilities & Interaction Protocol

Rather than relying on a single monolithic prompt, DefenceIQ divides security analysis across four specialized agents governed by an orchestrator state graph:

| Agent Role | Primary Focus | Allowlisted Tools | Primary Outputs & Safety Boundaries |
|---|---|---|---|
| **Alert Triage Agent** | First-line alert evaluation & noise filtering | `query_history` | Assigns severity (`low`, `medium`, `high`) and confidence score; makes escalation decision (`investigating` vs `closed_noise`). Cannot perform containment actions. |
| **Threat Intelligence Agent** | External IOC reputation & MITRE ATT&CK mapping | `lookup_ip`, `mitre_map` | Retrieves reputation metrics (e.g., AbuseIPDB confidence, OTX pulses) and maps behavior to ATT&CK tactics (e.g., `T1110.001`, `T1078`). Cannot query raw host logs. |
| **Forensics & Evidence Agent** | Chronological log analysis & citation enforcement | `query_logs` | Reconstructs event timeline. Quarantines prompt injection payloads. Rejects claims that do not cite valid log identifiers. |
| **Response Planner Agent** | Proportionate containment planning | `tag_alert`, `add_comment`, `disable_account`, `force_password_reset`, `block_ip`, `isolate_host` | Formulates action list. Distinguishes low-risk auto-run actions (`tag_alert`, `add_comment`) from high-risk containment actions requiring analyst approval. |
| **Agent Orchestrator** | State transitions & boundary enforcement | N/A (State Graph Engine) | Enforces deterministic execution order (`triage` -> `intel` -> `forensics` -> `response` -> `gate`), strictly manages context windows, and logs all transitions to the audit store. |

### Agent Guardrails & Principles

- **Strict Tool Allowlists:** Each agent can invoke only its explicitly designated tools. Any unauthorized tool call raises an immediate `PermissionError` and is recorded as a `tool_denied` security event.
- **Untrusted Telemetry Handling:** Log content and external intelligence are treated as untrusted data. Embedded instructions (e.g., `"ignore previous instructions"`) are detected and quarantined before reaching analytical reasoning.
- **Deterministic Handoffs:** Agents communicate through structured state envelopes containing validated findings, evidence citations, and confidence metrics rather than free-form conversational chatter.

---

## End-to-End Investigation Workflow

The lifecycle of an alert moving through DefenceIQ is governed by a deterministic sequence of state transitions:

```mermaid
sequenceDiagram
    autonumber
    actor Analyst as Security Analyst
    participant Ingest as Ingestion & DB
    participant Triage as Triage Agent
    participant Intel as Threat Intel Agent
    participant Forensics as Forensics Agent
    participant Response as Response Planner
    participant Gate as Human Approval Gate
    participant Audit as Append-Only Audit Log

    Ingest->>Triage: Ingest Alert (e.g., A-104 failed_login_burst)
    Triage->>Triage: query_history(user) -> Assess pattern
    alt Low signal / Benign
        Triage->>Ingest: Close as noise (status: closed_noise)
        Triage->>Audit: Log triage verdict & rationale
    else Escalated (High signal)
        Triage->>Intel: Escalate to investigating
        Triage->>Audit: Log escalation & confidence
        Intel->>Intel: lookup_ip(src_ip) & mitre_map(type)
        Intel->>Forensics: Forward reputation & ATT&CK mapping
        Intel->>Audit: Log IOC reputation & MITRE tags
        Forensics->>Forensics: query_logs(ip, host)
        Forensics->>Forensics: Quarantine injections & validate citations
        Forensics->>Response: Forward timeline & cited claims
        Forensics->>Audit: Log citation check & timeline
        Response->>Gate: Propose containment actions
        Gate->>Gate: Execute low-risk actions (tag_alert, add_comment)
        Gate->>Analyst: Pause run: Approval required (block_ip, isolate_host)
        Analyst->>Gate: POST /api/approve/{key} (Approve or Reject)
        alt Analyst Approved
            Gate->>Gate: Execute containment tool
            Gate->>Audit: Log execution outcome
        else Analyst Rejected
            Gate->>Audit: Log rejection decision (action halted)
        end
        Gate->>Ingest: Set status: resolved
        Gate->>Audit: Log incident completion
    end
```

### Detailed Workflow Stages

1. **Ingestion & Registration:** The alert is written to the SQLite `alerts` table with an initial status of `new`. An `alert_received` event is emitted.
2. **Triage Assessment:** The Triage Agent checks user travel history. If the source matches a known internal asset or baseline benign activity, it is closed with rationale. Otherwise, it escalates.
3. **Intelligence Enrichment:** The Threat Intel Agent checks IP reputation across threat intelligence pulse data and maps the attack type to the MITRE ATT&CK matrix.
4. **Forensic Log Reconstruction:** The Forensics Agent retrieves host and network logs, scans for adversarial prompt injections, and validates that every observation cites verified log line IDs.
5. **Remediation Planning:** The Response Agent proposes actions (e.g., block IP, isolate host, reset password, tag incident).
6. **Human Approval Gate:** Low-risk administrative actions run automatically; high-risk actions pause until a human analyst submits an approval or rejection decision.
7. **Resolution & Incident Reporting:** Once actions are executed or rejected, the incident is closed with a comprehensive markdown report and audit log summary.

---

## Current Prototype Status & Implementation Transparency

To ensure complete transparency and prevent overstating capabilities, the following matrix contrasts what is **actually implemented** in the repository's prototype against what is currently **simulated** and what is **planned** for future development:

| Capability / Subsystem | Implementation Status | Technical Mechanism in Codebase | Verification & Notes |
|---|---|---|---|
| **Four-Node Processing Workflow** | **Implemented** | `triage -> intel -> forensics -> response -> gate` state graph in `main.py` | Verified: alerts transition through deterministic graph nodes via async tasks. |
| **Human Approval Gate** | **Implemented** | Async futures paused in `gate()` until analyst calls `/api/approve/{key}` | Verified: containment actions pause indefinitely until explicit approve/reject POST. |
| **Agent Tool Allowlists** | **Implemented** | `ALLOW` dictionary lookup inside `call()` raising `PermissionError` | Verified: unauthorized tool invocations abort and log `tool_denied` events. |
| **Append-Only Audit Logging** | **Implemented** | SQLite triggers `audit_no_update` and `audit_no_delete` | Verified: SQL `UPDATE` and `DELETE` queries on `audit` table raise abort exceptions. |
| **Evidence Citation Enforcement** | **Implemented** | `citation_check` in `forensics()` cross-referencing claim IDs with log IDs | Verified: claims without verifiable log citations are filtered out from evidence. |
| **Prompt Injection Quarantine** | **Implemented** | Regex scanner `INJECTION` quarantines malicious payloads and tests red-team resistance | Verified: prompt injections in log lines are excluded from claims; red-team checks blocked. |
| **WebSocket Real-Time Trace** | **Implemented** | Starlette/FastAPI WebSocket endpoint (`/ws`) broadcasting to connected UI clients | Verified: full agent trace streamed live to browser with filtering. |
| **Evaluation Metrics Endpoint** | **Implemented** | `/api/eval` computing TP, FP, FN, TN, precision, recall, and triage latency | Verified: evaluates confusion matrix across 7 scenario alerts. |
| **Threat Intelligence Enrichment** | **Simulated / Rule-Based** | `lookup_ip()` uses hardcoded `KNOWN_BAD` and `KNOWN_GOOD` dictionaries | Simulated: mock data for AbuseIPDB and AlienVault OTX pulses. Live APIs not yet connected. |
| **Security Telemetry & Event Ingestion**| **Simulated / Rule-Based** | Static `SCENARIO` (7 alerts) and `LOGS` (49 log lines) in `main.py` | Simulated: replayable scenario rather than live syslog/webhook listener. |
| **Remediation Execution** | **Simulated / Rule-Based** | `SIM = lambda **k: f"simulated: {k}"` | Simulated: containment actions return mock strings; no active host/firewall changes. |
| **Agent Reasoning** | **Rule-Based (Optional LLM)** | Deterministic Python heuristics with optional Anthropic Claude integration (`narrate()`) | Hybrid: rule-based baseline logic with optional LLM incident summary when API key is set. |
| **Enterprise SIEM / EDR Adapters** | **Planned Architecture** | Connector interfaces specified in `docs/DEFENCEIQ_ARCHITECTURE.md` | Planned: Splunk, Elastic, CrowdStrike, and CloudTrail ingestion adapters. |
| **Production Threat Intel APIs** | **Planned Architecture** | Live HTTP clients for AbuseIPDB, VirusTotal v3, and OTX | Planned: rate-limited caching connectors with API key management. |
| **Google AI Models Integration** | **Planned Architecture** | Gemini 4 Argon, Gemini 3.8 Flash, and Gemini Embedding 2 adapters | Planned: Google AI Studio / Antigravity integration plan defined in architecture doc. |
| **Production PostgreSQL & S3 Storage** | **Planned Architecture** | Relational schema with ER diagram specified in `docs/DEFENCEIQ_ARCHITECTURE.md` | Planned: migration from in-memory SQLite to PostgreSQL and object storage. |
| **Next.js Analyst Dashboard** | **Planned Architecture** | Full-featured frontend with incident graph and multi-tenant management | Planned: evolution from single-file HTML/JS UI into enterprise web app. |

---

## Technology Stack

The technology stack spans the active prototype implementation and the planned production target:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        DEFENCEIQ TECHNOLOGY STACK                       │
├───────────────────────────────────┬────────────────────────────────────┤
│ Current Prototype Implementation  │ Target Production Architecture     │
├───────────────────────────────────┼────────────────────────────────────┤
│ • Python 3.10+ (tested on 3.14)   │ • Python 3.11+ / FastAPI Microservices│
│ • FastAPI & Starlette             │ • Google Gemini AI Models (Argon/Flash)│
│ • Uvicorn ASGI Server             │ • PostgreSQL (Relational & JSONB)  │
│ • SQLite3 with Trigger-Based Locks│ • Redis / Celery Task Queue        │
│ • Asyncio State Graph             │ • Next.js 14+ / TypeScript Dashboard│
│ • Native HTML5 / WebSocket Client │ • S3-Compatible Evidence Storage   │
│ • Optional Anthropic API Client   │ • AbuseIPDB, VirusTotal, OTX APIs  │
└───────────────────────────────────┴────────────────────────────────────┘
```
