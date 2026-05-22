import { normaliseReport } from './normaliseReport';
import type { ReportBundle } from '../types/report';

// ── Types ────────────────────────────────────────────────────────────────────

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

// ── Helpers ──────────────────────────────────────────────────────────────────

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { Accept: 'application/json', ...(init?.headers || {}) },
  });
  const text = await response.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  if (!response.ok) {
    const msg = typeof body === 'object' && body !== null && 'error' in body
      ? String((body as Record<string, unknown>).error)
      : `${response.status} ${response.statusText}`;
    throw new Error(msg);
  }
  return body as T;
}

// ── Report loading ───────────────────────────────────────────────────────────

export async function fetchLatestReport(brand: string, market: string): Promise<ReportBundle> {
  const params = new URLSearchParams({ brand, market }).toString();
  const raw = await jsonFetch<Record<string, unknown>>(`/api/bodhi/latest?${params}`);
  return normaliseReport(raw);
}

// ── Refresh status ───────────────────────────────────────────────────────────

export async function fetchRefreshStatus(brand: string, market: string, runId?: string): Promise<RunStatusSummary> {
  const params = new URLSearchParams({ brand, market });
  if (runId) params.set('runId', runId);
  const raw = await jsonFetch<Record<string, unknown>>(`/api/evidence/status?${params.toString()}`);

  // Normalise the backend response into a consistent shape
  const stage = String(raw.stage || raw.status || raw.current_stage || '');
  const active = Boolean(
    raw.active ??
    (stage && !['completed', 'success', 'successful', 'succeeded', 'report_bundle_ready', 'failed', 'error', 'cancelled', 'canceled'].includes(stage.toLowerCase()))
  );

  return {
    active,
    stage,
    status: String(raw.status || raw.stage || ''),
    runId: String(raw.run_id || raw.runId || raw.target_run_id || ''),
    targetRunId: String(raw.target_run_id || raw.targetRunId || ''),
    jobId: String(raw.job_id || raw.jobId || ''),
    latestSuccessfulRunId: String(raw.latest_successful_run_id || raw.latestSuccessfulRunId || ''),
    raw,
  };
}

// ── Refresh evidence ─────────────────────────────────────────────────────────

export async function refreshEvidence(payload: RefreshEvidencePayload): Promise<RefreshResult> {
  const result = await jsonFetch<Record<string, unknown>>('/api/evidence/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return {
    targetRunId: String(result.target_run_id || result.targetRunId || ''),
    evidenceRunId: String(result.evidence_run_id || result.evidenceRunId || ''),
    runId: String(result.run_id || result.runId || ''),
    jobId: String(result.job_id || result.jobId || ''),
    ...result,
  };
}

// ── Report history ───────────────────────────────────────────────────────────

export async function fetchReportHistory(brand: string, market: string): Promise<ReportHistoryRun[]> {
  const params = new URLSearchParams({ brand, market, limit: '30' }).toString();
  const raw = await jsonFetch<unknown>(`/api/evidence/reports/history?${params}`);
  if (Array.isArray(raw)) return raw as ReportHistoryRun[];
  if (raw && typeof raw === 'object' && 'runs' in raw && Array.isArray((raw as Record<string, unknown>).runs)) {
    return (raw as Record<string, unknown>).runs as ReportHistoryRun[];
  }
  return [];
}

export async function fetchReportByRunId(runId: string): Promise<ReportBundle> {
  const raw = await jsonFetch<Record<string, unknown>>(`/api/evidence/reports/${encodeURIComponent(runId)}`);
  return normaliseReport(raw);
}

// Aliases for backward compatibility
export const fetchRunHistory = fetchReportHistory;
export const fetchRunReport = fetchReportByRunId;

// ── Brand configuration ──────────────────────────────────────────────────────

export async function fetchBrandConfigs(): Promise<BrandConfig[]> {
  const raw = await jsonFetch<unknown>('/api/evidence/brands');
  if (Array.isArray(raw)) return raw as BrandConfig[];
  if (raw && typeof raw === 'object' && 'configs' in raw && Array.isArray((raw as Record<string, unknown>).configs)) {
    return (raw as Record<string, unknown>).configs as BrandConfig[];
  }
  return [];
}

export async function saveBrandConfig(config: Partial<BrandConfig>): Promise<BrandConfig> {
  return jsonFetch<BrandConfig>('/api/evidence/brands', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
}

export async function deleteBrandConfig(brand: string, market: string): Promise<void> {
  await jsonFetch<unknown>(`/api/evidence/brands/${encodeURIComponent(brand)}/${encodeURIComponent(market)}`, {
    method: 'DELETE',
  });
}

// ── Portfolio ────────────────────────────────────────────────────────────────

export async function fetchPortfolioTemplate(brand?: string, market?: string, domain?: string): Promise<Record<string, unknown>> {
  const params = new URLSearchParams();
  if (brand) params.set('brand', brand);
  if (market) params.set('market', market);
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
