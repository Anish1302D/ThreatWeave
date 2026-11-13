/* ── Evaluation result from GET /api/eval ──────────────────────── */

export interface EvalResult {
  alerts: number;
  true_pos: number;
  false_pos: number;
  false_neg: number;
  true_neg: number;
  detection_rate: number;
  false_positive_rate: number;
  avg_triage_ms: number;
  manual_baseline_min_per_alert: number;
  note: string;
}

