# QA fixes v10

## Fixed

1. Load latest no longer calls the Railway evidence service directly from the browser. The browser calls `/api/bodhi/latest` only. The Node/Express server tries Bodhi first and then server-side evidence-service fallback, avoiding CORS failures.
2. `/api/bodhi/latest` now has a resilient fallback order:
   - Bodhi direct URL if `BODHI_LATEST_RUN_URL` is provided.
   - Bodhi workflow/task/run candidate endpoints when `BODHI_API_BASE_URL`, `BODHI_WORKFLOW_ID`, `BODHI_TASK_ID`, and/or `BODHI_RUN_ID` are provided.
   - Evidence-service fallback via `EVIDENCE_SERVICE_URL` or compatible env names.
3. Railway preview/start now uses `node server.js`, so API routes are available in production even when Railway invokes `npm run preview`.
4. Download PDF now sanitises modern CSS color functions such as `oklch()`, `oklab()`, `lch()`, `lab()` and `color()` in the html2canvas clone before rendering.
5. Refresh Evidence API calls now go through the same-origin Express proxy to avoid future CORS errors.

## Validated

- `npm install`: passed
- `npm run build`: passed
- `npm run lint`: passed

## Railway env guidance

Recommended minimum production env for fallback while Bodhi endpoint is finalised:

```text
EVIDENCE_SERVICE_URL=https://ai-visibility-evidence-service-production.up.railway.app
EVIDENCE_RUN_ID=nissan_japan_full_inventory_hobby_v1
```

For direct Bodhi loading, use either:

```text
BODHI_LATEST_RUN_URL=<direct JSON output URL>
BODHI_PAT_TOKEN=<token>
```

or:

```text
BODHI_API_BASE_URL=<Bodhi API base URL>
BODHI_WORKFLOW_ID=<workflow id>
BODHI_TASK_ID=<task id, optional if workflow endpoint works>
BODHI_RUN_ID=<run id, optional if latest endpoint works>
BODHI_PAT_TOKEN=<token>
```
