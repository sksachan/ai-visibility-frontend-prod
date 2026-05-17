# AI Brand Visibility Frontend

Standalone React + Tailwind dashboard for AEO/GEO / AI visibility reporting. The app supports two report loading modes:

1. **Primary:** server-side Bodhi latest-run fetch using a Bodhi Personal Access Token.
2. **Fallback:** manual JSON upload from a completed Bodhi workflow output.

The Bodhi PAT is never exposed to the browser. It is read only by `server.js` from Railway environment variables.

## Local setup

```bash
npm install
cp .env.example .env
npm run build
npm run start
```

Open `http://localhost:4173`.

For Vite-only local development, `npm run dev` is still available, but the Bodhi proxy endpoint only exists when `server.js` is running.

## Railway deployment

Railway should run:

```bash
npm run build && npm run preview -- --host 0.0.0.0 --port $PORT
```

`npm run preview` maps to `node server.js`, so the Express proxy and static React app run together.

## Bodhi PAT configuration

Create a PAT in Bodhi:

```text
Settings -> Personal Access Tokens -> Create Token
```

For **Load latest**, the token needs only:

```text
tasks:read
```

For a future “trigger new Bodhi run” button, use:

```text
tasks:execute
workflows:read
```

Bodhi PAT tokens expire after 2 days, so rotate the Railway secret regularly.

Set these Railway variables:

```bash
BODHI_API_BASE_URL=https://psaisuite.com/save
BODHI_PAT_TOKEN=pat_<YOUR_TOKEN>
BODHI_TASK_ID=<TASK_UUID>
BODHI_OUTPUT_FILE=outputs.json
```

Optional:

```bash
# Pin to a known completed run instead of listing latest runs.
BODHI_RUN_ID=<RUN_UUID>

# Server-side fallback if Bodhi direct fetch fails.
EVIDENCE_SERVICE_URL=https://ai-visibility-evidence-service-production.up.railway.app
EVIDENCE_RUN_ID=nissan_japan_full_inventory_hobby_v1
```

Do **not** prefix Bodhi secrets with `VITE_`; Vite variables are bundled into the browser.

## Bodhi API endpoints used

The server proxy uses the documented Studio API endpoints:

```text
GET /api/v1/tasks/{taskId}/runs
GET /api/v1/tasks/runs/{runId}/files?srcfile=outputs.json
GET /api/v1/runs/{runId}/memory             # fallback
GET /api/v1/tasks/{taskId}/runs/{runId}     # fallback
GET /api/v1/runs/{runId}                    # fallback
```

The server sends:

```text
Authorization: Bearer pat_<TOKEN>
```

## Health / config check

You can verify server-side Bodhi config without exposing secrets:

```bash
curl https://<railway-host>/api/bodhi/status
```

The response shows whether a token, task ID, run ID and output file are configured, but never returns the PAT value.

## Upload mode

Use **Upload report JSON** to load a completed Bodhi workflow output manually. This remains the fallback if Bodhi direct fetch fails or the PAT expires.

The preferred payload is the Bodhi Preview Node `frontend_report_bundle` with:

```text
schema_version = query_workbench.v1
contract_version = page_level_cms_grouped_pr.v1
```

The parser also supports full Bodhi output JSON where the Preview Node tile contains the bundle as a stringified JSON object.

## PDF export

`Download PDF` exports the full offscreen report, not only the active tab. The exporter sanitises modern CSS color functions such as `oklch()` before `html2canvas` renders the report.
