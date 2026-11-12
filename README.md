# SOC-Pilot MVP

    pip install -r requirements.txt
    uvicorn main:app --reload      # open http://localhost:8000, click "Launch simulated attack"

Optional: `ANTHROPIC_API_KEY` (adds an LLM incident summary), `PACE=0.2` (faster trace), `SOCPILOT_DB=audit.db` (persist). Restart to replay the scenario.

Real in this MVP: the 4-node state graph, the approval gate (the run pauses until Approve/Reject), allow-listed tools per agent, the append-only audit log (SQLite triggers block UPDATE/DELETE), citation check, prompt-injection quarantine, WebSocket trace, eval endpoint.
Simulated: threat-intel lookups (`lookup_ip` is where AbuseIPDB/VirusTotal/OTX go), logs, remediation actions, and agent reasoning (rule-based; swap each node body for an LLM call).
Next: LangGraph checkpointing so pending approvals survive restarts, async Postgres, Next.js frontend, cost per incident.
