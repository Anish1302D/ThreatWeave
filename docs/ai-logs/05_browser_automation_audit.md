# DefenceIQ — Automated Browser Verification & CDP Audit Log

This document records the automated Chrome DevTools Protocol (CDP) session verifying the end-to-end functionality of the DefenceIQ React frontend and FastAPI backend.

---

## Session Metadata

- **Session Date**: 2026-11-13
- **Client Protocol**: Chrome DevTools Protocol (CDP) v1.3 / Puppeteer Core
- **Browser Binary**: Google Chrome 157.0.8103.51 (Official Build, 64-bit)
- **Target Host**: `http://localhost:5173` (Vite 8 Development Proxy)
- **Backend Host**: `http://localhost:8000` (FastAPI 0.162.4 / Uvicorn 0.54.0)

---

## Step-by-Step Execution Log

### Step 1: Initial Command Center Inspection
- **Target**: `http://localhost:5173/command-center`
- **Actions**:
  - Attached to page `5B1CEA27EBB91725D4C80E1F0ECF1207`.
  - Verified presence of navigation rail with 6 icons: Command Center, Incidents, Investigation (disabled/contextual), Approval Desk, Audit Ledger, Scenario Lab.
  - Verified WebSocket health pill: `connected` (teal).
  - Verified pipeline stages: all dots initialized in idle state.
  - Captured initial baseline state screenshot.
- **Assertion**: PASSED.

### Step 2: Scenario Lab Navigation & Attack Simulation
- **Target**: `http://localhost:5173/scenario`
- **Actions**:
  - Clicked navigation rail icon `Scenario Lab` (`/scenario`).
  - Located CTA button: `"Launch Simulated Attack"`.
  - Emitted click event initiating `POST /api/scenario/run`.
  - Observed real-time WebSocket frames streaming into the live trace window:
    - `ingest/alert_received`: Ingested 7 synthetic security events.
    - `triage/start` & `triage/verdict`: Automated heuristic classification.
    - `forensics/injection_quarantined`: Excluded prompt-injection payload in log `L049`.
    - `forensics/tool_denied`: Red-team defense halted rogue `disable_firewall` call.
    - `gate/approval_required`: Emitted containment approval keys.
- **Assertion**: PASSED.

### Step 3: Classification Benchmark Evaluation
- **Target**: `http://localhost:5173/scenario` (Evaluation panel)
- **Actions**:
  - Clicked `"Run Evaluation"` invoking `GET /api/eval`.
  - Verified Confusion Matrix rendered in 2x2 grid:
    - True Positives: 3
    - False Positives: 0
    - False Negatives: 0
    - True Negatives: 4
  - Verified calculated ratios: Detection Rate 100.0%, Precision 100.0%, False Positive Rate 0.0%.
  - Verified triage latency display: `0.005 ms`.
- **Assertion**: PASSED.

### Step 4: Incident Explorer Grid
- **Target**: `http://localhost:5173/incidents`
- **Actions**:
  - Clicked navigation rail icon `Incidents`.
  - Verified table rendered 7 rows matching `alerts` database table:
    - `A-104`: Successful login after 45 failures (HIGH, Awaiting Approval)
    - `A-105`: 2.3 GB sent to external IP (HIGH, Awaiting Approval)
    - `A-103`: 45 failed logins in 3 minutes (MEDIUM, Awaiting Approval)
    - `A-101`: 2 failed logins, then success (LOW, Closed Noise)
    - `A-102`: Port scan against DB subnet (LOW, Closed Noise)
    - `A-106`: Login from Dubai 40 min after Pune login (LOW, Closed Noise)
    - `A-107`: Nightly 8 GB backup transfer (LOW, Closed Noise)
- **Assertion**: PASSED.

### Step 5: Investigation Workspace & Signature Evidence Spine
- **Target**: `http://localhost:5173/investigation/A-104`
- **Actions**:
  - Clicked on link `A-104` from the incident table.
  - Verified incident header with severity indicator, confidence bar (90%), source IP (`203.0.113.45`), and host (`VPN-GW`).
  - Verified **Evidence Spine**:
    - Milestone 1: Event Received (completed)
    - Milestone 2: Triage Performed (completed)
    - Milestone 3: Threat Intelligence Enriched (completed)
    - Milestone 4: Forensic Investigation (completed)
    - Milestone 5: Evidence Validated (completed)
    - Milestone 6: Response Recommendation (completed)
    - Milestone 7: Human Decision Recorded (pending)
  - Verified **Evidence Explorer**: 46 cited log lines (`L001`–`L046`) tracking the brute-force progression to successful login.
  - Verified Threat Intelligence sidebar: AbuseIPDB score `97/100`, MITRE `T1078 Valid Accounts`.
- **Assertion**: PASSED.

### Step 6: Approval Desk Human Sign-off
- **Target**: `http://localhost:5173/approvals`
- **Actions**:
  - Clicked navigation rail icon `Approval Desk`.
  - Filtered to `Pending (6)` queue.
  - Selected action `disable_account` for user `rohan.k` (`A-104:3`).
  - Clicked green `"Approve"` button.
  - Verified accessible modal opened with parameter summary.
  - Clicked confirm `"Approve"`.
  - Verified network dispatch: `POST /api/approve/A-104%3A3?ok=true` → HTTP 200 OK.
  - Verified toast notification displayed: `"Action approved: disable_account for A-104"`.
  - Verified pending queue decremented to 5 and action transferred to `Decided` tab.
- **Assertion**: PASSED.

### Step 7: Audit Ledger Inspection
- **Target**: `http://localhost:5173/audit`
- **Actions**:
  - Clicked navigation rail icon `Audit Ledger`.
  - Verified 69 audit rows displayed chronologically.
  - Filtered by `analyst` agent role to view analyst decision event.
  - Expanded event row `#69` to inspect JSON payload: `{"key": "A-104:3"}`.
- **Assertion**: PASSED.

### Step 8: Command Center Operational Metrics Synchronization
- **Target**: `http://localhost:5173/command-center`
- **Actions**:
  - Returned to root dashboard.
  - Verified synchronized KPIs:
    - Total Alerts: 7
    - Escalated: 3
    - Pending Approvals: 5
    - Resolved: 0
  - Verified processing pipeline indicators reflected active progress.
- **Assertion**: PASSED.

