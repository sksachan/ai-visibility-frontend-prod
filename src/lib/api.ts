import { normaliseReport } from './normaliseReport';
import type { ReportBundle } from '../types/report';

/* ── Shared types ─────────────────────────────────────────────────────────── */

export interface RunStatusSummary {
  active: boolean;
  stage?: string;
  status?: string;
  runId?: string;
  targetRunId?: string;
  jobId?: string;
  latestSuccessfulRunId?: string;
  errorMessage?: string;
  raw?: Record<string, unknown>;
}

export interface ReportHistoryRun {
  run_id: string;
  brand?: string;
  market?: string;
  domain?: string;
  status?: string;
  stage?: string;
  query_count?: number;
  citation_count?: number;
  owned_pages_scoreable?: number;
  owned_inventory_selected?: number;
  external_pages_scoreable?: number;
  crawl_success_rate?: number;
  serpapi_enabled?: boolean;
  source_run_id?: string;
  portfolio_id?: string;
  created_at_epoch?: number;
  completed_at_epoch?: number;
}

export interface BrandConfig {
  config_id?: string;
  brand: string;
  market: string;
  domain?: string;
  owned_domains?: string[];
  brand_terms?: string[];
  language?: string;
  default_sitemap_url?: string;
  default_seed_topics?: string;
  default_topic_count?: number;
  default_queries_per_topic?: number;
  default_query_limit?: number;
  default_portfolio_goal?: string;
}

export interface PortfolioValidationResult {
  status: string;
  validation?: { valid: boolean; errors?: string[]; warnings?: string[]; stats?: { query_count?: number; topic_count?: number } };
  errors?: string[];
}

export interface RefreshEvidencePayload {
  brand: string;
  market: string;
  domain?: string;
  runMode?: string;
  queryPortfolioMode?: string;
  queryPortfolioId?: string;
  sourceRunId?: string;
  sitemapUrl?: string;
  seedTopics?: string;
  topicCount?: number;
  queriesPerTopic?: number;
  language?: string;
  portfolioGoal?: string;
  queryLimit?: number;
  maxOwnedPagesPerQuery?: number;
  maxExternalCitationsPerQuery?: number;
  maxOwnedInventoryUrls?: number;
  maxExternalUrls?: number;
  enableSerpapi?: boolean;
  enableOwnedCrawl?: boolean;
  enableExternalCrawl?: boolean;
  triggerAuditor?: boolean;
  ownedDomains?: string;
  brandTerms?: string;
  customPortfolio?: Record<string, unknown>;
}

export interface RefreshResult {
  targetRunId?: string;
  evidenceRunId?: string;
  runId?: string;
  jobId?: string;
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

async function jsonOrThrow(res: Response): Promise<unknown> {
  const text = await res.text();
  let body: unknown;
  try { body = JSON.parse(text); } catch { body = text; }
  if (!res.ok) {
    const msg = typeof body === 'object' && body !== null && 'error' in body
      ? String((body as Record<string, unknown>).error)
      : `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }
  return body;
}

/* ── API functions ────────────────────────────────────────────────────────── */

export async function fetchLatestReport(brand: string, market: string): Promise<ReportBundle> {
  const params = new URLSearchParams({ brand, market });
  const res = await fetch(`/api/bodhi/latest?${params}`);
  const json = await jsonOrThrow(res);
  return normaliseReport(json);
}

export async function fetchRefreshStatus(brand: string, market: string, runId?: string): Promise<RunStatusSummary> {
  const params = new URLSearchParams({ brand, market });
  if (runId) params.set('runId', runId);
  const res = await fetch(`/api/evidence/status?${params}`);
  const raw = await jsonOrThrow(res) as Record<string, unknown>;

  // The backend /runs/status returns { status: 'ok', latest_successful_run_id, active_run: {...}, runs: [...] }
  // When querying a specific runId, it returns the run status directly.
  // We need to extract the active run data from the nested active_run object when present.
  const activeRun = (raw.active_run && typeof raw.active_run === 'object') ? raw.active_run as Record<string, unknown> : null;

  // For specific run queries, the response IS the run status directly (has stage/run_id at top level).
  // For brand/market queries, the active run is nested inside active_run.
  const isDirectRunStatus = Boolean(raw.stage || raw.current_stage) && raw.status !== 'ok';
  const source = isDirectRunStatus ? raw : (activeRun || raw);

  const stage = String(source.stage || source.current_stage || '');
  const status = String(source.status || '');
  const terminalStages = ['completed', 'success', 'successful', 'succeeded', 'report_bundle_ready', 'failed', 'error'];
  const isTerminal = terminalStages.includes(stage.toLowerCase()) || terminalStages.includes(status.toLowerCase());

  // Detect error fields that indicate a terminal failure regardless of status value.
  // The backend may return status: "running" with auditor_error present — that is contradictory.
  // Error fields always take precedence over running status.
  const errorFields = ['auditor_error', 'portfolio_error', 'bodhi_error', 'error'];
  const hasErrorField = errorFields.some(key => {
    const val = source[key];
    return val !== undefined && val !== null && val !== '' && val !== false;
  });
  const hasFailed = source.failed === true || source.failed === 'true';
  const hasFailedStage = stage.toLowerCase().endsWith('_failed');
  const isErrorState = hasErrorField || hasFailed || hasFailedStage;

  // Extract the specific error message for display
  const errorMessage = isErrorState
    ? String(source.auditor_error || source.portfolio_error || source.bodhi_error || source.error || `Stage: ${stage}`)
    : undefined;

  // Override order: error > done > running
  // If any error condition exists, the run is NOT active and should show as failed.
  const effectiveStage = isErrorState
    ? (hasFailedStage ? stage : (hasErrorField ? (stage || 'auditor_failed') : stage))
    : stage;

  // active = true only when the backend returns an active_run that is NOT in a terminal state
  // AND there are no error fields present.
  const active = !isErrorState && (
    (activeRun !== null && !isTerminal) || (isDirectRunStatus && Boolean(stage) && !isTerminal)
  );

  return {
    active,
    stage: effectiveStage || undefined,
    status: isErrorState ? 'failed' : status,
    runId: String(source.run_id || source.runId || source.target_run_id || ''),
    targetRunId: String(source.target_run_id || source.run_id || ''),
    jobId: String(source.job_id || source.jobId || ''),
    latestSuccessfulRunId: String(raw.latest_successful_run_id || raw.latestSuccessfulRunId || ''),
    errorMessage,
    raw,
  };
}

export async function fetchReportHistory(brand: string, market: string): Promise<ReportHistoryRun[]> {
  const params = new URLSearchParams({ limit: '30' });
  if (brand) params.set('brand', brand);
  if (market) params.set('market', market);
  const res = await fetch(`/api/evidence/reports/history?${params}`);
  const data = await jsonOrThrow(res);
  return Array.isArray(data) ? data : (data as Record<string, unknown>).runs as ReportHistoryRun[] ?? [];
}

export async function fetchReportByRunId(runId: string): Promise<ReportBundle> {
  const res = await fetch(`/api/evidence/reports/${encodeURIComponent(runId)}`);
  const json = await jsonOrThrow(res);
  return normaliseReport(json);
}

export async function deleteRun(runId: string): Promise<void> {
  const res = await fetch(`/api/evidence/reports/${encodeURIComponent(runId)}`, { method: 'DELETE' });
  await jsonOrThrow(res);
}

export async function refreshEvidence(payload: RefreshEvidencePayload): Promise<RefreshResult> {
  const res = await fetch('/api/evidence/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return await jsonOrThrow(res) as RefreshResult;
}

/* ── Brand config ─────────────────────────────────────────────────────────── */

export async function fetchBrandConfigs(): Promise<BrandConfig[]> {
  const res = await fetch('/api/evidence/brands');
  const data = await jsonOrThrow(res);
  if (Array.isArray(data)) return data;
  const obj = data as Record<string, unknown>;
  const list = obj.brands ?? obj.configs ?? obj.data ?? [];
  return Array.isArray(list) ? list as BrandConfig[] : [];
}

export async function saveBrandConfig(config: Partial<BrandConfig> & { brand: string; market: string }): Promise<BrandConfig> {
  const res = await fetch('/api/evidence/brands', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  return await jsonOrThrow(res) as BrandConfig;
}

export async function deleteBrandConfig(brand: string, market: string): Promise<void> {
  const res = await fetch(`/api/evidence/brands/${encodeURIComponent(brand)}/${encodeURIComponent(market)}`, { method: 'DELETE' });
  await jsonOrThrow(res);
}

/* ── Portfolio ────────────────────────────────────────────────────────────── */

export async function fetchPortfolioTemplate(brand: string, market: string, domain?: string): Promise<Record<string, unknown>> {
  const params = new URLSearchParams({ brand, market });
  if (domain) params.set('domain', domain);
  const res = await fetch(`/api/evidence/portfolios/template?${params}`);
  return await jsonOrThrow(res) as Record<string, unknown>;
}

export async function uploadPortfolio(portfolio: unknown, brand?: string, market?: string, domain?: string): Promise<Record<string, unknown>> {
  const params = new URLSearchParams();
  if (brand) params.set('brand', brand);
  if (market) params.set('market', market);
  if (domain) params.set('domain', domain);
  const res = await fetch(`/api/evidence/portfolios/upload?${params}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(portfolio),
  });
  return await jsonOrThrow(res) as Record<string, unknown>;
}

export async function validatePortfolio(portfolio: unknown): Promise<PortfolioValidationResult> {
  const res = await fetch('/api/evidence/portfolios/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(portfolio),
  });
  return await jsonOrThrow(res) as PortfolioValidationResult;
}
