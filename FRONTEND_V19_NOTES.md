# AI Visibility Frontend v19

Adds Phase 2 synthetic portfolio refresh controls and stage-level status display.

## Main changes

- Refresh Evidence now sends synthetic portfolio inputs to Railway Evidence Service:
  - seed topics
  - topic count
  - queries per topic
  - language
  - portfolio goal
  - trigger auditor flag
- Sends backward-compatible evidence-service flags:
  - `run_serpapi`
  - `crawl_owned`
  - `crawl_external`
  - `trigger_auditor`
- Shows stage-level refresh status:
  - portfolio generation
  - HITL submission
  - sitemap inventory
  - query-owned URL mapping
  - AI citation collection
  - crawl refresh
  - auditor run
  - report ready
- Keeps Load Latest behaviour as last-successful report only.

## Railway settings

Build Command:

```bash
npm install --include=dev --no-audit --no-fund && npm run build
```

Start Command:

```bash
npm run start
```

Required env var:

```text
EVIDENCE_SERVICE_URL=https://ai-visibility-evidence-service-production.up.railway.app
```

Keep existing Bodhi env vars for Load Latest fallback if still used.
