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
  brand: string;
  market: string;
  query_count?: number;
  citation_count?: number;
  owned_pages_scoreable?: number;
  owned_inventory_selected?: number;
  external_pages_scoreable?: number;
  crawl_success_rate?: number;
  serpapi_enabled?: boolean;
  source_run_id?: string;
  completed_at_epoch?: number;
  created_at_epoch?: number;
  [key: string]: unknown;
}

export interface BrandConfig {
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
  config_id?: string;
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
  [key: string]: unknown;
}

async function jsonFetch<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { Accept: 'application/json', ...init?.headers } });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status} : ${text.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchLatestReport(brand: string, market: string): Promise<ReportBundle> {
  const params = new URLSearchParams({ brand, market }).toString();
  const raw = await jsonFetch<Record<string, unknown>>(`/api/bodhi/latest?${params}`);
  return normaliseReport(raw);
}

export async function fetchReportHistory(brand: string, market: string): Promise<ReportHistoryRun[]> {
  const params = new URLSearchParams();
  if (brand) params.set('brand', brand);
  if (market) params.set('market', market);
  params.set('limit', '50');
  const data = await jsonFetch<{ runs?: ReportHistoryRun[] }>(`/api/evidence/reports/history?${params.toString()}`);
  return data.runs ?? [];
}

export { fetchReportHistory as fetchRunHistory };

export async function fetchReportByRunId(runId: string): Promise<ReportBundle> {
  const raw = await jsonFetch<Record<string, unknown>>(`/api/evidence/reports/${encodeURIComponent(runId)}`);
  return normaliseReport(raw);
}

export { fetchReportByRunId as fetchRunReport };

export async function deleteRun(runId: string): Promise<void> {
  await jsonFetch(`/api/evidence/reports/${encodeURIComponent(runId)}`, { method: 'DELETE' });
}

export async function fetchRefreshStatus(brand: string, market: string, runId?: string): Promise<RunStatusSummary> {
  const params = new URLSearchParams({ brand, market });
  if (runId) params.set('runId', runId);
  const raw = await jsonFetch<Record<string, unknown>>(`/api/evidence/status?${params.toString()}`);
  const activeRun = (raw.active_run ?? raw.activeRun ?? null) as Record<string, unknown> | null;
  const stage = String(activeRun?.stage ?? activeRun?.status ?? raw.stage ?? raw.status ?? '').toLowerCase();
  const isActive = Boolean(activeRun) || ['queued', 'accepted', 'pending', 'running', 'in_progress', 'processing'].some((s) => stage.includes(s)) || stage.startsWith('portfolio_') || stage.startsWith('sitemap_') || stage.startsWith('owned_') || stage.startsWith('serpapi_') || stage.includes('crawl') || stage.startsWith('auditor_') || stage === 'evidence_ready';
  return {
    active: isActive && !['completed', 'success', 'successful', 'succeeded', 'report_bundle_ready', 'failed', 'error', 'cancelled', 'canceled'].includes(stage),
    stage: stage || undefined,
    status: stage || undefined,
    runId: String(activeRun?.run_id ?? activeRun?.target_run_id ?? raw.run_id ?? '').trim() || undefined,
    targetRunId: String(activeRun?.target_run_id ?? activeRun?.run_id ?? '').trim() || undefined,
    jobId: String(activeRun?.job_id ?? raw.job_id ?? '').trim() || undefined,
    latestSuccessfulRunId: String(raw.latest_successful_run_id ?? '').trim() || undefined,
    raw: raw as Record<string, unknown>,
  };
}

export async function refreshEvidence(payload: RefreshEvidencePayload): Promise<RefreshResult> {
  const body: Record<string, unknown> = { ...payload };
  const raw = await jsonFetch<Record<string, unknown>>('/api/evidence/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return {
    targetRunId: String(raw.target_run_id ?? raw.run_id ?? '').trim() || undefined,
    evidenceRunId: String(raw.evidence_run_id ?? raw.run_id ?? '').trim() || undefined,
    runId: String(raw.run_id ?? '').trim() || undefined,
    jobId: String(raw.job_id ?? '').trim() || undefined,
    ...raw,
  };
}

export async function fetchBrandConfigs(): Promise<BrandConfig[]> {
  const data = await jsonFetch<{ configs?: BrandConfig[]; brands?: BrandConfig[] }>('/api/evidence/brands');
  return data.configs ?? data.brands ?? (Array.isArray(data) ? data as unknown as BrandConfig[] : []);
}

export async function saveBrandConfig(config: Partial<BrandConfig>): Promise<BrandConfig> {
  return jsonFetch<BrandConfig>('/api/evidence/brands', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
}

export async function deleteBrandConfig(brand: string, market: string): Promise<void> {
  await jsonFetch(`/api/evidence/brands/${encodeURIComponent(brand)}/${encodeURIComponent(market)}`, { method: 'DELETE' });
}

export async function fetchPortfolioTemplate(brand: string, market: string, domain?: string): Promise<Record<string, unknown>> {
  const params = new URLSearchParams({ brand, market });
  if (domain) params.set('domain', domain);
  return jsonFetch<Record<string, unknown>>(`/api/evidence/portfolios/template?${params.toString()}`);
}

export async function uploadPortfolio(portfolio: Record<string, unknown>, brand?: string, market?: string, domain?: string): Promise<Record<string, unknown>> {
  const params = new URLSearchParams();
  if (brand) params.set('brand', brand);
  if (market) params.set('market', market);
  if (domain) params.set('domain', domain);
  return jsonFetch<Record<string, unknown>>(`/api/evidence/portfolios/upload?${params.toString()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(portfolio),
  });
}

export async function validatePortfolio(portfolio: Record<string, unknown>): Promise<PortfolioValidationResult> {
  return jsonFetch<PortfolioValidationResult>('/api/evidence/portfolios/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(portfolio),
  });
}
