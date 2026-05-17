import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 4173);
const distDir = path.join(__dirname, 'dist');

function env(...names) {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.trim()) return value.trim();
  }
  return '';
}

function authHeaders() {
  const token = env('BODHI_PAT_TOKEN', 'BODHI_PAT', 'BODHI_API_TOKEN');
  const headers = { Accept: 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    headers['X-API-Key'] = token;
  }
  return headers;
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: authHeaders() });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} from ${url}`);
  return await response.json();
}

function candidateUrls() {
  const exact = env('BODHI_LATEST_RUN_URL', 'BODHI_OUTPUT_URL');
  if (exact) return [exact];

  const base = env('BODHI_API_BASE_URL', 'BODHI_BASE_URL').replace(/\/$/, '');
  const workflowId = env('BODHI_WORKFLOW_ID');
  const taskId = env('BODHI_TASK_ID');
  const runId = env('BODHI_RUN_ID');
  if (!base) return [];

  const urls = [];
  if (workflowId && runId) {
    urls.push(`${base}/workflows/${workflowId}/runs/${runId}`);
    urls.push(`${base}/api/workflows/${workflowId}/runs/${runId}`);
    urls.push(`${base}/workflows/${workflowId}/runs/${runId}/output`);
    urls.push(`${base}/api/workflows/${workflowId}/runs/${runId}/output`);
  }
  if (workflowId) {
    urls.push(`${base}/workflows/${workflowId}/runs/latest`);
    urls.push(`${base}/api/workflows/${workflowId}/runs/latest`);
    urls.push(`${base}/workflows/${workflowId}/latest`);
    urls.push(`${base}/api/workflows/${workflowId}/latest`);
  }
  if (taskId && runId) {
    urls.push(`${base}/tasks/${taskId}/runs/${runId}`);
    urls.push(`${base}/api/tasks/${taskId}/runs/${runId}`);
  }
  if (taskId) {
    urls.push(`${base}/tasks/${taskId}/runs/latest`);
    urls.push(`${base}/api/tasks/${taskId}/runs/latest`);
  }
  if (runId) {
    urls.push(`${base}/runs/${runId}`);
    urls.push(`${base}/api/runs/${runId}`);
  }
  return Array.from(new Set(urls));
}

app.get('/api/bodhi/latest', async (_req, res) => {
  const urls = candidateUrls();
  if (!urls.length) {
    res.status(501).json({ error: 'Bodhi direct fetch is not configured. Set BODHI_API_BASE_URL plus BODHI_WORKFLOW_ID/BODHI_TASK_ID/BODHI_RUN_ID, or set BODHI_LATEST_RUN_URL.' });
    return;
  }
  const errors = [];
  for (const url of urls) {
    try {
      const payload = await fetchJson(url);
      res.json(payload);
      return;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  res.status(502).json({ error: 'Unable to fetch latest Bodhi output.', tried: urls, errors: errors.slice(-5) });
});

app.use(express.static(distDir));
app.use((_req, res) => res.sendFile(path.join(distDir, 'index.html')));
app.listen(port, '0.0.0.0', () => console.log(`AI visibility frontend listening on ${port}`));
