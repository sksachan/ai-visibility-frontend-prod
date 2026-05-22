import { normaliseReport } from './normaliseReport';
import type { ReportBundle } from '../types/report';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

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
  customPortfolio?: unknown;
}

export interface RefreshResult {
  runId?: string;
  targetRunId?: string;
  evidenceRunId?: string;
  jobId?: string;
  status?: string;
  message?: string;
  [key: string]: unknown;
}

export interface ReportHistoryRun {
  run_id: string;
  brand?: string;
  market?: string;
  status?: string;
  created_at_epoch?: number;
  completed_at_epoch?: number;
  query_count?: number;
  citation_count?: number;
  owned_pages_scoreable?: number;
  owned_inventory_selected?: number;
  external_pages_scoreable?: number;
  crawl_success_rate?: number;
  serpapi_enabled?: boolean;
  source_run_id?: string;
  [key: string]: unknown;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

async function jsonOrThrow(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();
  let body: unknown = text;
  if (contentType.includes('application/json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
    try {
      body = JSON.parse(text);
    } catch {
      // keep as text
    }
  }
  if (!response.ok) {
    const snippet = typeof body === 'string' ? body.slice(0, 300) : JSON.stringify(body).slice(0, 300);
    throw new Error(`${response.status} ${response.statusText}${snippet ? `: ${snippet}` : ''}`);
  }
  return body;
}

/* ------------------------------------------------------------------ */
/*  Report loading                                                     */
/* ------------------------------------------------------------------ */

/**
 * Fetch the latest successful report for a brand/market.
 * The Express server.js proxy tries Evidence Service first, then Bodhi.
 */
export async function fetchLatestReport(brand: string, market: string): Promise<ReportBundle> {
  const params = new URLSearchParams({ brand, market }).toString();
  const response = await fetch(`/api/bodhi/latest?${params}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  const json = await jsonOrThrow(response);
  return normaliseReport(json);
}

/**
 * Fetch a specific report by run ID (used by RunHistory).
 */
export async function fetchReportByRunId(runId: string): Promise<ReportBundle> {
  const response = await fetch(`/api/evidence/reports/${encodeURIComponent(runId)}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  const json = await jsonOrThrow(response);
  return normaliseReport(json);
}

/* ------------------------------------------------------------------ */
/*  Report history                                                     */
/* ------------------------------------------------------------------ */

export async function fetchReportHistory(brand: string, market: string): Promise<ReportHistoryRun[]> {
  const params = new URLSearchParams({ brand, market, limit: '30' }).toString();
  const response = await fetch(`/api/evidence/reports/history?${params}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  const json = await jsonOrThrow(response);
  if (Array.isArray(json)) return json as ReportHistoryRun[];
  if (json && typeof json === 'object' && 'runs' in (json as Record<string, unknown>)) {
    const runs = (json as Record<string, unknown>).runs;
    if (Array.isArray(runs)) return runs as ReportHistoryRun[];
  }
  return [];
}

/* ------------------------------------------------------------------ */
/*  Refresh status                                                     */
/* ------------------------------------------------------------------ */

export async function fetchRefreshStatus(brand: string, market: string, runId?: string): Promise<RunStatusSummary> {
  const params = new URLSearchParams({ brand, market });
  if (runId) params.set('runId', runId);
  const response = await fetch(`/api/evidence/status?${params.toString()}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  const json = await jsonOrThrow(response) as Record<string, unknown>;

  const stage = String(json.stage || json.current_stage || json.status || '');
  const activeStages = new Set([
    'accepted', 'portfolio_generation_queued', 'portfolio_generation_running',
    'portfolio_ui_hitl_waiting', 'portfolio_ui_hitl_submitted',
    'sitemap_inventory_running', 'owned_url_mapping_running',
    'serpapi_collection_running', 'crawl_refresh_running',
    'owned_crawl_running', 'external_crawl_running',
    'evidence_ready', 'auditor_queued', 'auditor_running',
    'auditor_ui_hitl_waiting', 'auditor_ui_hitl_submitted',
  ]);
  const terminalStages = new Set([
    'completed', 'success', 'successful', 'succeeded',
    'report_bundle_ready', 'failed', 'error', 'cancelled', 'canceled',
  ]);

  const isActive = activeStages.has(stage) || (!!stage && !terminalStages.has(stage) && stage !== '');

  return {
    active: json.active != null ? Boolean(json.active) : isActive,
    stage: stage || undefined,
    status: String(json.status || ''),
    runId: String(json.run_id || json.runId || ''),
    targetRunId: String(json.target_run_id || json.targetRunId || ''),
    jobId: String(json.job_id || json.jobId || ''),
    latestSuccessfulRunId: String(json.latest_successful_run_id || json.latestSuccessfulRunId || ''),
    raw: json,
  };
}

/* ------------------------------------------------------------------ */
/*  Refresh evidence                                                   */
/* ------------------------------------------------------------------ */

export async function refreshEvidence(payload: RefreshEvidencePayload): Promise<RefreshResult> {
  const response = await fetch('/api/evidence/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await jsonOrThrow(response) as Record<string, unknown>;
  return {
    runId: String(json.run_id || json.runId || ''),
    targetRunId: String(json.target_run_id || json.targetRunId || ''),
    evidenceRunId: String(json.evidence_run_id || json.evidenceRunId || ''),
    jobId: String(json.job_id || json.jobId || ''),
    status: String(json.status || ''),
    message: String(json.message || ''),
    ...json,
  };
}
