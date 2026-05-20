import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 4173);
const distDir = path.join(__dirname, 'dist');

app.use(express.json({ limit: '30mb' }));

function env(...names) {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.trim()) return value.trim();
  }
  return '';
}

function cleanBase(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function bodhiBaseVariants() {
  // Bodhi PAT documentation uses https://psaisuite.com/save as the API base.
  // Keep aliases for older deployments, but always try the documented host as a safe fallback.
  const raw = cleanBase(env('BODHI_API_BASE_URL', 'BODHI_BASE_URL', 'BODHI_STUDIO_API_BASE_URL')) || 'https://psaisuite.com/save';
  const variants = [];
  const add = (value) => {
    const base = cleanBase(value);
    if (!base) return;
    variants.push(base);
    if (!base.endsWith('/save')) variants.push(`${base}/save`);
  };
  add(raw);
  add('https://psaisuite.com/save');
  // Older swagger exports used this host; keep it as a final compatibility fallback only.
  add('https://sapientaiproducts.com/save');
  return Array.from(new Set(variants));
}


function bodhiHeaders() {
  const token = env('BODHI_PAT_TOKEN', 'BODHI_PAT', 'BODHI_API_TOKEN', 'BODHI_PERSONAL_ACCESS_TOKEN');
  const headers = { Accept: 'application/json,text/plain,*/*' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function plainHeaders() {
  return { Accept: 'application/json' };
}

function parseMaybeJson(value) {
  if (value == null) return value;
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    const firstObject = trimmed.indexOf('{');
    const firstArray = trimmed.indexOf('[');
    const starts = [firstObject, firstArray].filter((idx) => idx >= 0);
    if (!starts.length) return value;
    const start = Math.min(...starts);
    const open = trimmed[start];
    const end = trimmed.lastIndexOf(open === '{' ? '}' : ']');
    if (end > start) {
      try { return JSON.parse(trimmed.slice(start, end + 1)); } catch { return value; }
    }
    return value;
  }
}

function unwrapApiPayload(payload) {
  let current = parseMaybeJson(payload);

  if (current && typeof current === 'object' && !Array.isArray(current)) {
    const reportKeys = ['frontend_report_bundle', 'report_bundle', 'bundle', 'report', 'payload', 'data'];
    for (const key of reportKeys) {
      if (!Object.prototype.hasOwnProperty.call(current, key)) continue;
      const maybeValue = current[key];
      if (typeof maybeValue !== 'string' && (!maybeValue || typeof maybeValue !== 'object')) continue;
      const parsedValue = parseMaybeJson(maybeValue);
      if (parsedValue && parsedValue !== maybeValue) return unwrapApiPayload(parsedValue);
      if (typeof maybeValue === 'object') return unwrapApiPayload(maybeValue);
    }
  }

  return current;
}

async function fetchAny(url, headers = plainHeaders()) {
  const response = await fetch(url, { headers, cache: 'no-store' });
  const contentType = response.headers.get('content-type') || '';
  const bodyText = await response.text();
  let body = bodyText;
  if (contentType.includes('application/json') || bodyText.trim().startsWith('{') || bodyText.trim().startsWith('[')) {
    body = parseMaybeJson(bodyText);
  }
  if (!response.ok) {
    const snippet = typeof body === 'string' ? body.slice(0, 260) : JSON.stringify(body).slice(0, 260);
    throw new Error(`${response.status} ${response.statusText} from ${url}${snippet ? ` :: ${snippet}` : ''}`);
  }
  return unwrapApiPayload(body);
}

function isUsefulReportPayload(payload) {
  const value = unwrapApiPayload(payload);
  if (!value || typeof value !== 'object') return false;
  if (value.schema_version === 'query_workbench.v1') return true;
  if (value.contract_version === 'page_level_cms_grouped_pr.v1') return true;
  if (value.contract_version === 'page_level_cms_grouped_pr.v2') return true;
  if (value.frontend_report_bundle) return true;
  if (value['Preview Node']) return true;
  if (Array.isArray(value.query_workbench)) return true;
  const keys = Object.keys(value);
  return keys.length === 1 && value[keys[0]] && typeof value[keys[0]] === 'object' && Boolean(value[keys[0]]['Preview Node']);
}

function outputFileCandidates() {
  const explicit = env('BODHI_OUTPUT_FILE', 'BODHI_OUTPUT_SRCFILE', 'BODHI_RUN_OUTPUT_FILE');
  const candidates = [
    explicit,
    'outputs.json',
    'output.json',
    'outputs/outputs.json',
    'outputs/output.json',
    'outputs/frontend_report_bundle.json',
    'frontend_report_bundle.json',
    'outputs/bodhi/preview_node_bundle.json',
    'outputs/query_workbench/query_workbench.json'
  ].filter(Boolean);
  return Array.from(new Set(candidates));
}

async function tryUrls(urls, headers, label) {
  const errors = [];
  for (const url of urls) {
    try {
      const payload = await fetchAny(url, headers);
      return { payload, sourceUrl: url, errors };
    } catch (error) {
      errors.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { payload: null, sourceUrl: '', errors };
}

async function tryReportUrls(urls, headers, label) {
  const errors = [];
  for (const url of urls) {
    try {
      const payload = await fetchAny(url, headers);
      const unwrapped = unwrapApiPayload(payload);
      if (isUsefulReportPayload(unwrapped)) return { payload: unwrapped, sourceUrl: url, errors };
      const keys = unwrapped && typeof unwrapped === 'object' && !Array.isArray(unwrapped)
        ? Object.keys(unwrapped).slice(0, 8).join(', ')
        : typeof unwrapped;
      errors.push(`${label}: ${url} returned JSON but not a recognised report bundle${keys ? ` (keys: ${keys})` : ''}.`);
    } catch (error) {
      errors.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { payload: null, sourceUrl: '', errors };
}

async function listTaskRuns(base, taskId) {
  const url = `${base}/api/v1/tasks/${encodeURIComponent(taskId)}/runs`;
  const runs = await fetchAny(url, bodhiHeaders());
  return Array.isArray(runs) ? runs : [];
}

function sortRuns(runs) {
  return [...runs].sort((a, b) => {
    const statusWeight = (run) => run?.status === 'completed' ? 2 : run?.status === 'in-progress' ? 1 : 0;
    const timeOf = (run) => Date.parse(run?.completedAt || run?.startedAt || run?.createdAt || 0) || 0;
    return statusWeight(b) - statusWeight(a) || timeOf(b) - timeOf(a);
  });
}

async function fetchRunFile(base, runId, srcfile) {
  const url = `${base}/api/v1/tasks/runs/${encodeURIComponent(runId)}/files?srcfile=${encodeURIComponent(srcfile)}`;
  return { payload: await fetchAny(url, bodhiHeaders()), sourceUrl: url };
}

async function fetchRunMemory(base, runId) {
  const url = `${base}/api/v1/runs/${encodeURIComponent(runId)}/memory`;
  const files = await fetchAny(url, bodhiHeaders());
  if (!Array.isArray(files)) return { payload: null, sourceUrl: url };
  const preferred = files.find((item) => /frontend_report_bundle|outputs?\.json|preview_node_bundle/i.test(String(item?.file || '')))
    || files.find((item) => item?.content && String(item.content).includes('frontend_report_bundle'))
    || files.find((item) => item?.content && String(item.content).includes('query_workbench.v1'));
  if (!preferred) return { payload: null, sourceUrl: url };
  return { payload: unwrapApiPayload(preferred.content), sourceUrl: `${url}#${preferred.file || 'memory'}` };
}

async function fetchBodhiLatest() {
  const direct = env('BODHI_LATEST_RUN_URL', 'BODHI_OUTPUT_URL');
  const headers = bodhiHeaders();
  const errors = [];

  if (direct) {
    try {
      const payload = await fetchAny(direct, headers);
      if (isUsefulReportPayload(payload)) return { payload, sourceUrl: direct, errors };
      errors.push(`Bodhi direct URL returned JSON but not a recognised report bundle: ${direct}`);
    } catch (error) {
      errors.push(`Bodhi direct URL: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const bases = bodhiBaseVariants();
  const taskId = env('BODHI_TASK_ID');
  const explicitRunId = env('BODHI_RUN_ID');
  const fileCandidates = outputFileCandidates();

  if (!env('BODHI_PAT_TOKEN', 'BODHI_PAT', 'BODHI_API_TOKEN', 'BODHI_PERSONAL_ACCESS_TOKEN')) {
    errors.push('BODHI_PAT_TOKEN is not configured. Create a Bodhi PAT with tasks:read scope and store it as a Railway secret.');
  }
  if (!taskId && !explicitRunId && !direct) {
    errors.push('BODHI_TASK_ID is not configured. Set BODHI_TASK_ID so the server can list latest runs.');
  }
  if (!bases.length) return { payload: null, sourceUrl: '', errors: ['BODHI_API_BASE_URL is not configured. Set it to https://psaisuite.com/save.'] };

  for (const base of bases) {
    const runIds = [];
    if (explicitRunId) runIds.push(explicitRunId);

    if (taskId && !explicitRunId) {
      try {
        const runs = sortRuns(await listTaskRuns(base, taskId));
        for (const run of runs.slice(0, 5)) {
          const id = run?.id || run?.runId;
          if (id) runIds.push(id);
        }
      } catch (error) {
        errors.push(`Bodhi task runs ${base}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    for (const runId of Array.from(new Set(runIds))) {
      for (const srcfile of fileCandidates) {
        try {
          const result = await fetchRunFile(base, runId, srcfile);
          if (isUsefulReportPayload(result.payload)) return { payload: result.payload, sourceUrl: result.sourceUrl, errors };
          errors.push(`Bodhi run file ${srcfile} for ${runId} was found but was not a recognised report bundle.`);
        } catch (error) {
          errors.push(`Bodhi run file ${srcfile}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      try {
        const result = await fetchRunMemory(base, runId);
        if (result.payload && isUsefulReportPayload(result.payload)) return { payload: result.payload, sourceUrl: result.sourceUrl, errors };
      } catch (error) {
        errors.push(`Bodhi run memory ${runId}: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Last resort: run detail can contain exec_metadata in some deployments.
      const runDetailCandidates = [];
      if (taskId) runDetailCandidates.push(`${base}/api/v1/tasks/${encodeURIComponent(taskId)}/runs/${encodeURIComponent(runId)}`);
      runDetailCandidates.push(`${base}/api/v1/runs/${encodeURIComponent(runId)}`);
      const detail = await tryUrls(runDetailCandidates, headers, 'Bodhi run detail');
      errors.push(...detail.errors);
      if (detail.payload && isUsefulReportPayload(detail.payload)) return { payload: detail.payload, sourceUrl: detail.sourceUrl, errors };
    }
  }

  return { payload: null, sourceUrl: '', errors };
}

function candidateEvidenceUrls(req) {
  const base = cleanBase(env('EVIDENCE_SERVICE_URL', 'VITE_EVIDENCE_SERVICE_URL', 'VITE_API_BASE_URL', 'BODHI_EVIDENCE_SERVICE_URL'));
  if (!base) return [];

  const brand = String(req.query.brand || process.env.DEFAULT_BRAND || 'Nissan');
  const market = String(req.query.market || process.env.DEFAULT_MARKET || 'Japan');
  const domain = String(req.query.domain || process.env.DEFAULT_DOMAIN || '');
  const explicitRunId = String(req.query.runId || req.query.run_id || '').trim();
  const paramsObj = domain ? { brand, market, domain } : { brand, market };
  const params = new URLSearchParams(paramsObj).toString();
  const urls = [];
  // Load latest must mean "latest successful report" for the selected
  // brand/market. Do not let stale Railway env vars such as EVIDENCE_RUN_ID pin
  // the dashboard to an old or in-progress run. Explicit runId query params are
  // still supported for diagnostics.
  urls.push(`${base}/reports/latest-successful?${params}`);
  urls.push(`${base}/runs/latest/report-bundle?${params}`);
  if (explicitRunId) {
    urls.push(`${base}/runs/${encodeURIComponent(explicitRunId)}/report-bundle`);
  }
  urls.push(`${base}/runs/latest/bodhi-compact?${params}`);
  urls.push(`${base}/runs/latest/compact?${params}`);
  urls.push(`${base}/runs/latest?${params}`);
  return Array.from(new Set(urls));
}


function evidenceBase() {
  return cleanBase(env('EVIDENCE_SERVICE_URL', 'VITE_EVIDENCE_SERVICE_URL', 'VITE_API_BASE_URL', 'BODHI_EVIDENCE_SERVICE_URL'));
}

function normaliseRefreshPayload(body = {}) {
  const bool = (value, fallback = false) => {
    if (typeof value === 'boolean') return value;
    if (value == null || value === '') return fallback;
    return ['true', '1', 'yes', 'y', 'on'].includes(String(value).toLowerCase());
  };
  const num = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  };
  return {
    brand: String(body.brand || process.env.DEFAULT_BRAND || 'Nissan'),
    market: String(body.market || process.env.DEFAULT_MARKET || 'Japan'),
    domain: String(body.domain || process.env.DEFAULT_DOMAIN || 'https://www.nissan.co.jp'),
    run_mode: String(body.runMode || body.run_mode || 'reuse_existing_evidence'),
    query_portfolio_mode: String(body.queryPortfolioMode || body.query_portfolio_mode || 'reuse'),
    query_portfolio_id: String(body.queryPortfolioId || body.query_portfolio_id || ''),
    source_run_id: String(body.sourceRunId || body.source_run_id || ''),
    sitemap_url: String(body.sitemapUrl || body.sitemap_url || ''),
    seed_topics: String(body.seedTopics || body.seed_topics || ''),
    topic_count: num(body.topicCount ?? body.topic_count, 8),
    queries_per_topic: num(body.queriesPerTopic ?? body.queries_per_topic, 6),
    language: String(body.language || 'English'),
    portfolio_goal: String(body.portfolioGoal || body.portfolio_goal || 'AI answer visibility audit query portfolio.'),
    query_limit: num(body.queryLimit ?? body.query_limit, 50),
    max_owned_pages_per_query: num(body.maxOwnedPagesPerQuery ?? body.max_owned_pages_per_query, 3),
    max_external_citations_per_query: num(body.maxExternalCitationsPerQuery ?? body.max_external_citations_per_query, 3),
    max_owned_urls: num(body.maxOwnedInventoryUrls ?? body.max_owned_inventory_urls ?? body.maxOwnedUrls ?? body.max_owned_urls, String(body.runMode || body.run_mode || '') === 'full_refresh' ? 100 : 60),
    max_owned_inventory_urls: num(body.maxOwnedInventoryUrls ?? body.max_owned_inventory_urls ?? body.maxOwnedUrls ?? body.max_owned_urls, String(body.runMode || body.run_mode || '') === 'full_refresh' ? 100 : 60),
    max_external_urls: num(body.maxExternalUrls ?? body.max_external_urls, String(body.runMode || body.run_mode || '') === 'full_refresh' ? 150 : 30),
    enable_serpapi: bool(body.enableSerpapi ?? body.enable_serpapi, false),
    run_serpapi: bool(body.enableSerpapi ?? body.enable_serpapi ?? body.run_serpapi, false),
    enable_owned_crawl: bool(body.enableOwnedCrawl ?? body.enable_owned_crawl, true),
    crawl_owned: bool(body.enableOwnedCrawl ?? body.enable_owned_crawl ?? body.crawl_owned, true),
    enable_external_crawl: bool(body.enableExternalCrawl ?? body.enable_external_crawl, false),
    crawl_external: bool(body.enableExternalCrawl ?? body.enable_external_crawl ?? body.crawl_external, false),
    trigger_auditor: bool(body.triggerAuditor ?? body.trigger_auditor, true),
    requested_by: 'ai-visibility-frontend',
    note: 'Evidence refresh is executed by Railway evidence service. Frontend continues to load latest successful report until a new successful bundle is available.'
  };
}

app.get('/api/bodhi/status', (_req, res) => {
  const hasToken = Boolean(env('BODHI_PAT_TOKEN', 'BODHI_PAT', 'BODHI_API_TOKEN', 'BODHI_PERSONAL_ACCESS_TOKEN'));
  res.json({
    configured: hasToken && Boolean(env('BODHI_TASK_ID') || env('BODHI_RUN_ID') || env('BODHI_LATEST_RUN_URL', 'BODHI_OUTPUT_URL')),
    apiBaseCandidates: bodhiBaseVariants(),
    hasToken,
    hasTaskId: Boolean(env('BODHI_TASK_ID')),
    hasRunId: Boolean(env('BODHI_RUN_ID')),
    outputFile: env('BODHI_OUTPUT_FILE', 'BODHI_OUTPUT_SRCFILE', 'BODHI_RUN_OUTPUT_FILE') || 'outputs.json',
    requiredScopeForLoadLatest: 'tasks:read',
    tokenExpiryNote: 'Bodhi PAT tokens expire after 2 days; rotate them in Railway secrets.'
  });
});

app.get('/api/bodhi/latest', async (req, res) => {
  const allErrors = [];

  const evidenceUrls = candidateEvidenceUrls(req);
  if (evidenceUrls.length) {
    const evidence = await tryReportUrls(evidenceUrls, plainHeaders(), 'Evidence service');
    allErrors.push(...evidence.errors);
    if (evidence.payload) {
      res.setHeader('X-Report-Source', 'evidence-service');
      res.setHeader('X-Report-Source-Url', evidence.sourceUrl);
      res.json(evidence.payload);
      return;
    }
  }

  const bodhi = await fetchBodhiLatest();
  allErrors.push(...bodhi.errors);
  if (bodhi.payload) {
    res.setHeader('X-Report-Source', 'bodhi');
    res.setHeader('X-Report-Source-Url', bodhi.sourceUrl);
    res.json(bodhi.payload);
    return;
  }

  res.status(502).json({
    error: 'Unable to fetch latest successful evidence report. Manual JSON upload is still available as a fallback.',
    expectedBodhiEnv: ['BODHI_API_BASE_URL=https://psaisuite.com/save', 'BODHI_PAT_TOKEN with tasks:read scope', 'BODHI_TASK_ID', 'BODHI_RUN_ID optional', 'BODHI_OUTPUT_FILE optional'],
    errors: allErrors.slice(-12)
  });
});


app.get('/api/evidence/reports/history', async (req, res) => {
  const base = evidenceBase();
  if (!base) { res.status(503).json({ error: 'EVIDENCE_SERVICE_URL is not configured on the frontend Railway service.' }); return; }
  const params = new URLSearchParams({ brand: String(req.query.brand || process.env.DEFAULT_BRAND || 'Nissan'), market: String(req.query.market || process.env.DEFAULT_MARKET || 'Japan'), limit: String(req.query.limit || '30') });
  try {
    const response = await fetch(`${base}/reports/history?${params.toString()}`, { headers: { Accept: 'application/json' }, cache: 'no-store' });
    const text = await response.text();
    res.status(response.status).type(response.headers.get('content-type') || 'application/json').send(text);
  } catch (error) { res.status(502).json({ error: error instanceof Error ? error.message : String(error), evidenceServiceUrl: base }); }
});

app.get('/api/evidence/reports/:runId', async (req, res) => {
  const base = evidenceBase();
  if (!base) { res.status(503).json({ error: 'EVIDENCE_SERVICE_URL is not configured on the frontend Railway service.' }); return; }
  try {
    const response = await fetch(`${base}/reports/${encodeURIComponent(req.params.runId)}`, { headers: { Accept: 'application/json' }, cache: 'no-store' });
    const text = await response.text();
    res.status(response.status).type(response.headers.get('content-type') || 'application/json').send(text);
  } catch (error) { res.status(502).json({ error: error instanceof Error ? error.message : String(error), evidenceServiceUrl: base }); }
});

app.post('/api/evidence/refresh', async (req, res) => {
  const base = evidenceBase();
  if (!base) {
    res.status(503).json({ error: 'EVIDENCE_SERVICE_URL is not configured on the frontend Railway service.' });
    return;
  }

  const payload = normaliseRefreshPayload(req.body || {});
  try {
    const response = await fetch(`${base}/refresh/evidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload)
    });
    const text = await response.text();
    res.status(response.status).type(response.headers.get('content-type') || 'application/json').send(text);
  } catch (error) {
    res.status(502).json({ error: error instanceof Error ? error.message : String(error), evidenceServiceUrl: base });
  }
});

app.get('/api/evidence/status', async (req, res) => {
  const base = evidenceBase();
  if (!base) {
    res.status(503).json({ error: 'EVIDENCE_SERVICE_URL is not configured on the frontend Railway service.' });
    return;
  }

  const brand = String(req.query.brand || process.env.DEFAULT_BRAND || 'Nissan');
  const market = String(req.query.market || process.env.DEFAULT_MARKET || 'Japan');
  const runId = String(req.query.runId || req.query.run_id || '').trim();
  const params = new URLSearchParams({ brand, market }).toString();
  try {
    const statusUrl = runId ? `${base}/runs/${encodeURIComponent(runId)}/status` : `${base}/runs/status?${params}`;
    const response = await fetch(statusUrl, {
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    });
    const text = await response.text();
    res.status(response.status).type(response.headers.get('content-type') || 'application/json').send(text);
  } catch (error) {
    res.status(502).json({ error: error instanceof Error ? error.message : String(error), evidenceServiceUrl: base });
  }
});

// Compatibility endpoint for older frontend builds. It now routes through the v3 evidence refresh contract.
app.post('/api/evidence/full-refresh', async (req, res) => {
  req.body = normaliseRefreshPayload({ ...(req.body || {}), runMode: 'full_refresh' });
  const base = evidenceBase();
  if (!base) {
    res.status(503).json({ error: 'EVIDENCE_SERVICE_URL is not configured on the frontend Railway service.' });
    return;
  }
  try {
    const response = await fetch(`${base}/refresh/evidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(req.body)
    });
    const text = await response.text();
    res.status(response.status).type(response.headers.get('content-type') || 'application/json').send(text);
  } catch (error) {
    res.status(502).json({ error: error instanceof Error ? error.message : String(error), evidenceServiceUrl: base });
  }
});

app.use(express.static(distDir));
app.use((_req, res) => res.sendFile(path.join(distDir, 'index.html')));
app.listen(port, '0.0.0.0', () => console.log(`AI visibility frontend listening on ${port}`));
