# DefenceIQ Frontend — Architecture & Implementation Plan

## Backend Contract Verification (`main.py`)

Every frontend service and data model was built against verified endpoints in `main.py`:

| Route | Contract & Payload Semantics | Error States & Constraints |
|---|---|---|
| `GET /api/alerts` | Returns JSON array of alerts from SQLite `alerts` table merged with `raw` scenario attributes. Schema: `id, status, severity, confidence, report, type, user, src_ip, host, desc, t`. Note that `t` is a scenario minute offset, not an epoch timestamp. Ground-truth `label` is excluded by the server. | Empty array until `/api/scenario/run` is called. |
| `GET /api/audit?alert_id=` | Returns append-only log events ordered by auto-increment `n`. Row fields: `n, ts, alert_id, agent, kind, msg, data` (JSON parsed). When `alert_id` query param is present, filters to single incident. | Returns empty list if no matching events. |
| `POST /api/scenario/run` | Triggers background asyncio task executing all 7 attacks in `SCENARIO` staggered by 0.3s. Returns `{started: 7}`. | **409 Conflict** (`Scenario already ran. Restart the server to replay it.`) if alerts table already contains data. |
| `POST /api/approve/{key}?ok=` | Resumes paused `asyncio.Future` in `PENDING` dictionary for key `{alert_id}:{index}`. Query param `ok=true` runs containment; `ok=false` records rejection. | **404 Not Found** (`No such pending approval`) if key was already resolved or invalid. |
| `GET /api/eval` | Computes classification confusion matrix across `SCENARIO`. Returns `alerts, true_pos, false_pos, false_neg, true_neg, detection_rate, false_positive_rate, avg_triage_ms, manual_baseline_min_per_alert, note`. | Derived metric `precision = TP / (TP + FP)` calculated client-side with explicit *Derived* label. |
| `WS /ws` | Starlette WebSocket broadcasting audit events in real time. Payloads match audit schema minus `n`. | Server does not replay historical events on connect; frontend fetches `GET /api/audit` upon connection/reconnection and de-duplicates by composite key `ts|alert_id|kind|msg`. |

---

## Architectural Principles

1. **Evidence-First Forensic Workspace**:
   - Replaces generic cyber dashboard widgets (excessive cards, neon green glows, non-functional gauges) with an editorial forensic instrument.
   - Distinctive typography: Editorial serif (`Newsreader Variable`) for incident case headers, modern sans-serif (`Instrument Sans Variable`) for high-legibility interface copy, and monospaced (`JetBrains Mono Variable`) for hashes, IPs, timestamps, log identifiers, and technical parameters.

2. **The Evidence Spine**:
   - Signature visual timeline connecting all 7 incident stages:
     `Event Received` → `Triage Performed` → `Threat Intelligence Enriched` → `Forensic Investigation` → `Evidence Validated` → `Response Recommendation` → `Human Decision Recorded`.
   - Each milestone node reflects actual backend execution state (`completed`, `active`, `pending`, `skipped`) with timestamp, responsible agent, and expandable audit details.

3. **Strict Provenance & Transparency**:
   - Every simulated capability is explicitly disclosed in the interface (e.g., *Simulated local lookup*, *Rule-based provenance*, *Simulated action*).
   - Global context bar persistently displays `SYNTHETIC SCENARIO` to ensure no demonstration fixture is mistaken for a production integration.

---

## Technology Selection

- **UI Framework**: React 19 + TypeScript (strict mode with `noUncheckedIndexedAccess`, `noImplicitOverride`).
- **Build System**: Vite 8 with `@tailwindcss/vite` (Tailwind CSS v4 `@theme` design tokens).
- **Navigation**: React Router 8 (`BrowserRouter`, `Routes`, `Route`, `NavLink`, `useParams`).
- **Icons**: `lucide-react`.
- **State Management**: Zero heavyweight external stores; single lightweight React Context (`LiveStore`) coordinating alerts, audit log, and reconnecting WebSocket with exponential backoff.
- **Client Services**: Native Fetch API with custom `ApiError` class, native WebSocket with automatic reconnect.

