# Frontend v21 — Executive Brand Topic Scorecard

Adds a stage-1 frontend-derived executive topic scorecard under the Executive Report KPI cards.

The table uses `executive.brandTopicScorecard` when present in the report bundle. If not present, it derives rows from `queryWorkbench`, `queries`, `ownedPages`, citations and trend state.

This is intentionally frontend-compatible only. Stage 2 should emit `executive.brandTopicScorecard` directly from the Auditor workflow/repo for fully evidence-backed scoring and CMO comments.
