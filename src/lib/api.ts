import { normaliseReport } from './normaliseReport';
import type { ReportBundle } from '../types/report';

export interface RunStatusSummary {
  active: boolean;
  stage?: string;
  status?: string;
  runId?: string;
  targetRunId?: string;
  jobId?: string;
  latestSuccessfulRunId?: string;
  raw?: Record<string, unknown>;
}

export interface ReportHistoryRun {
  run_id: string;
  brand?: string;
  market?: string;
  domain?: string;
  completed_at_epoch?: number;
  created_at_epoch?: number;
  query_count?: number;
  citation_count?: number;
  owned_pages_scoreable?: number;
  owned_inventory_selected?: number;
  external_pages_scoreable?: number;
  crawl_success_rate?: number;
  serpapi_enabled?: boolean;
  source_run_id?: string;
  run_mode?: string;
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
  errors?: string[];
  validation?: {
    valid: boolean;
    errors?: string[];
    warnings?: string[];
    stats?: { query_count?: number; topic_count?: number };
  };
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
  [key: string]: unknown;
}

async function json<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { Accept: 'application/json', ...init?.headers } });
  const text = await res.text();
  let body: unknown;
  try { body = JSON.parse(text); } catch { body = text; }
  if (!res.ok) {
    const msg = typeof body === 'object' && body && 'error' in body ? String((body as Record<string, unknown>).error) : `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }
  return body as T;
}

export async function fetchLatestReport(brand: string, market: string): Promise<ReportBundle> {
  const params = new URLSearchParams({ brand, market });
  const raw = await json<Record<string, unknown>>(`/api/bodhi/latest?${params}`);
  return normaliseReport(raw);
}

export async function fetchRefreshStatus(brand: string, market: string, runId?: string): Promise<RunStatusSummary> {
  const params = new URLSearchParams({ brand, market });
  if (runId) params.set('runId', runId);
  const raw = await json<Record<string, unknown>>(`/api/evidence/status?${params}`);
  const stage = String(raw.stage || raw.status || raw.current_stage || '');
  const active = Boolean(
    raw.active ??
    (stage && !['completed', 'success', 'successful', 'succeeded', 'report_bundle_ready', 'failed', 'error', 'cancelled', 'canceled', ''].includes(stage.toLowerCase()))
  );
  return {
    active,
    stage: stage || undefined,
    status: String(raw.status || raw.stage || '') || undefined,
    runId: String(raw.run_id || raw.target_run_id || raw.evidence_run_id || '') || undefined,
    targetRunId: String(raw.target_run_id || raw.run_id || '') || undefined,
    jobId: String(raw.job_id || '') || undefined,
    latestSuccessfulRunId: String(raw.latest_successful_run_id || raw.latest_successful || '') || undefined,
    raw,
  };
}

export async function refreshEvidence(payload: RefreshEvidencePayload): Promise<RefreshResult> {
  const body: Record<string, unknown> = { ...payload };
  if (payload.customPortfolio) body.custom_portfolio = payload.customPortfolio;
  return json<RefreshResult>('/api/evidence/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function fetchReportHistory(brand: string, market: string): Promise<ReportHistoryRun[]> {
  const params = new URLSearchParams({ limit: '50' });
  if (brand) params.set('brand', brand);
  if (market) params.set('market', market);
  const raw = await json<unknown>(`/api/evidence/reports/history?${params}`);
  if (Array.isArray(raw)) return raw as ReportHistoryRun[];
  if (raw && typeof raw === 'object' && 'runs' in raw && Array.isArray((raw as Record<string, unknown>).runs)) return (raw as Record<string, unknown>).runs as ReportHistoryRun[];
  return [];
}

export async function fetchReportByRunId(runId: string): Promise<ReportBundle> {
  const raw = await json<Record<string, unknown>>(`/api/evidence/reports/${encodeURIComponent(runId)}`);
  return normaliseReport(raw);
}

export async function deleteRun(runId: string): Promise<void> {
  await json(`/api/evidence/reports/${encodeURIComponent(runId)}`, { method: 'DELETE' });
}

export async function fetchBrandConfigs(): Promise<BrandConfig[]> {
  const raw = await json<unknown>('/api/evidence/brands');
  if (Array.isArray(raw)) return raw as BrandConfig[];
  if (raw && typeof raw === 'object' && 'configs' in raw && Array.isArray((raw as Record<string, unknown>).configs)) return (raw as Record<string, unknown>).configs as BrandConfig[];
  return [];
}

export async function saveBrandConfig(config: Partial<BrandConfig> & { brand: string; market: string }): Promise<BrandConfig> {
  return json<BrandConfig>('/api/evidence/brands', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
}

export async function deleteBrandConfig(brand: string, market: string): Promise<void> {
  await json(`/api/evidence/brands/${encodeURIComponent(brand)}/${encodeURIComponent(market)}`, { method: 'DELETE' });
}

export async function fetchPortfolioTemplate(brand: string, market: string, domain?: string): Promise<Record<string, unknown>> {
  const params = new URLSearchParams({ brand, market });
  if (domain) params.set('domain', domain);
  return json<Record<string, unknown>>(`/api/evidence/portfolios/template?${params}`);
}

export async function uploadPortfolio(portfolio: Record<string, unknown>, brand?: string, market?: string, domain?: string): Promise<Record<string, unknown>> {
  const params = new URLSearchParams();
  if (brand) params.set('brand', brand);
  if (market) params.set('market', market);
  if (domain) params.set('domain', domain);
  return json<Record<string, unknown>>(`/api/evidence/portfolios/upload?${params}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(portfolio),
  });
}

export async function validatePortfolio(portfolio: Record<string, unknown>): Promise<PortfolioValidationResult> {
  return json<PortfolioValidationResult>('/api/evidence/portfolios/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(portfolio),
  });
}
