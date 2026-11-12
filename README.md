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
