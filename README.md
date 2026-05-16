# AI Search Visibility Frontend

Standalone React + Tailwind dashboard for AI visibility / GEO audit reporting. It is designed for Railway deployment and can run in two modes:

1. Mock mode using the included sample report bundle.
2. API mode using your Railway evidence-service endpoints.

## Local setup

```bash
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5173`.

## Railway deployment

Create a new Railway service from this folder or GitHub repo. Railway should detect the `nixpacks.toml` file.

Set these environment variables:

```bash
VITE_EVIDENCE_API_BASE_URL=https://your-evidence-service.up.railway.app
VITE_DEFAULT_BRAND=Nissan
VITE_DEFAULT_MARKET=Japan
```

Build command:

```bash
npm run build
```

Start command:

```bash
npm run start
```

## Expected evidence-service endpoints

The app is wired for:

```text
GET /runs/latest?brand=&market=
GET /runs/{run_id}/dashboard
GET /runs/{run_id}/trend
POST /jobs/full-refresh
GET /jobs/{job_id}
```

If these endpoints are not available yet, the app falls back to the included mock bundle.

## Upload mode

Use "Upload report JSON" in the header to load a completed Bodhi/Railway report bundle from a local JSON file. The parser accepts either:

- the canonical report bundle schema used in this app, or
- a loose Bodhi-style object with top-level arrays/objects such as `queries`, `owned_pages`, `cms_modules`, `pr_opportunities`, and `action_checklist`.

## PDF export

The `Download PDF` button exports the current report DOM using `html2canvas` and `jspdf`. For production-grade, multi-page board packs, replace this later with a server-side Playwright export endpoint.
