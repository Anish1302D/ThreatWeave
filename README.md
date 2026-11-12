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
