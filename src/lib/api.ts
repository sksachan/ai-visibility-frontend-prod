import { normaliseReport } from './normaliseReport';
import type { ReportBundle } from '../types/report';

async function readJsonResponse(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return await response.json();
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(text.slice(0, 240) || `${response.status} ${response.statusText}`);
  }
}

export type ReportHistoryRun = { run_id: string; brand?: string; market?: string; domain?: string; completed_at_epoch?: number; created_at_epoch?: number; query_count?: number; citation_count?: number; owned_pages_scoreable?: number; owned_inventory_selected?: number; owned_query_mapped_unique?: number; external_pages_scoreable?: number; crawl_success_rate?: number; serpapi_enabled?: boolean; source_run_id?: string; portfolio_id?: string; ai_hygiene?: unknown };

export async function fetchLatestReport(brand: string, market: string): Promise<ReportBundle> {
  const params = new URLSearchParams({ brand, market });
  const response = await fetch(`/api/bodhi/latest?${params.toString()}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store'
  });

  const payload = await readJsonResponse(response);
  if (!response.ok) {
    const detail = payload?.error || payload?.message || `${response.status} ${response.statusText}`;
    const sourceErrors = Array.isArray(payload?.errors) ? ` ${payload.errors.slice(-2).join(' | ')}` : '';
    throw new Error(`${detail}${sourceErrors}`.trim());
  }

  return normaliseReport(payload);
}



export async function fetchReportByRunId(runId: string): Promise<ReportBundle> {
  const response = await fetch(`/api/evidence/reports/${encodeURIComponent(runId)}`, { headers: { Accept: 'application/json' }, cache: 'no-store' });
  const payload = await readJsonResponse(response);
  if (!response.ok) throw new Error(payload?.error || payload?.message || `${response.status} ${response.statusText}`);
  return normaliseReport(payload);
}

export async function fetchReportHistory(brand: string, market: string): Promise<ReportHistoryRun[]> {
  const params = new URLSearchParams({ brand, market, limit: '30' });
  const response = await fetch(`/api/evidence/reports/history?${params.toString()}`, { headers: { Accept: 'application/json' }, cache: 'no-store' });
  const payload = await readJsonResponse(response);
  if (!response.ok) throw new Error(payload?.error || payload?.message || `${response.status} ${response.statusText}`);
  return Array.isArray(payload?.runs) ? payload.runs : [];
}

export type RefreshEvidencePayload = {
  brand: string;
  market: string;
  domain: string;
  runMode: string;
  queryPortfolioMode: string;
  queryPortfolioId?: string;
  sourceRunId?: string;
  sitemapUrl?: string;
  seedTopics?: string;
  topicCount?: number;
  queriesPerTopic?: number;
  language?: string;
  portfolioGoal?: string;
  queryLimit: number;
  maxOwnedPagesPerQuery: number;
  maxExternalCitationsPerQuery: number;
  maxOwnedUrls?: number;
  maxOwnedInventoryUrls?: number;
  maxExternalUrls?: number;
  enableSerpapi: boolean;
  enableOwnedCrawl: boolean;
  enableExternalCrawl: boolean;
  triggerAuditor: boolean;
};

export type RefreshEvidenceResult = {
  runId?: string;
  jobId?: string;
  targetRunId?: string;
  status?: string;
  message?: string;
  evidenceRunId?: string;
  raw?: unknown;
};

export type RunStatusSummary = {
  active?: boolean;
  status?: string;
  stage?: string;
  runId?: string;
  jobId?: string;
  targetRunId?: string;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  latestSuccessfulRunId?: string;
  latestSuccessfulAt?: string;
  runs?: Array<Record<string, unknown>>;
  raw?: unknown;
};

export async function refreshEvidence(payload: RefreshEvidencePayload): Promise<RefreshEvidenceResult> {
  const response = await fetch('/api/evidence/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await readJsonResponse(response);
  if (!response.ok) {
    const detail = data?.error || data?.message || `${response.status} ${response.statusText}`;
    throw new Error(detail);
  }
  return {
    runId: String(data.run_id ?? data.runId ?? data.evidence_run_id ?? data.evidenceRunId ?? data.target_run_id ?? data.targetRunId ?? data.id ?? ''),
    jobId: String(data.job_id ?? data.jobId ?? data.id ?? ''),
    targetRunId: String(data.target_run_id ?? data.targetRunId ?? data.evidence_run_id ?? data.evidenceRunId ?? ''),
    evidenceRunId: String(data.evidence_run_id ?? data.evidenceRunId ?? data.target_run_id ?? data.targetRunId ?? data.run_id ?? data.runId ?? ''),
    status: String(data.status ?? data.stage ?? data.state ?? 'started'),
    message: data.message ? String(data.message) : undefined,
    raw: data
  };
}

export async function fetchRefreshStatus(brand: string, market: string, runId?: string): Promise<RunStatusSummary> {
  const params = new URLSearchParams({ brand, market });
  if (runId) params.set('runId', runId);
  const response = await fetch(`/api/evidence/status?${params.toString()}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store'
  });
  const data = await readJsonResponse(response);
  if (!response.ok) {
    const detail = data?.error || data?.message || `${response.status} ${response.statusText}`;
    throw new Error(detail);
  }

  const runs = Array.isArray(data?.runs) ? data.runs : Array.isArray(data) ? data : [];
  const terminal = new Set(['success', 'successful', 'completed', 'succeeded', 'report_bundle_ready', 'failed', 'error', 'cancelled', 'canceled']);
  const isActive = (run: Record<string, unknown>) => {
    const value = String(run.stage ?? run.status ?? run.state ?? '').toLowerCase();
    return value ? !terminal.has(value) : false;
  };
  const activeRun = runs.find((run: Record<string, unknown>) => isActive(run)) || (!terminal.has(String(data?.stage ?? data?.status ?? data?.state ?? '').toLowerCase()) ? data : null);
  const latestSuccess = runs.find((run: Record<string, unknown>) => ['success', 'successful', 'completed', 'succeeded', 'report_bundle_ready'].includes(String(run.status ?? run.state ?? run.stage ?? '').toLowerCase()));

  return {
    active: Boolean(activeRun),
    status: String(activeRun?.status ?? activeRun?.state ?? data?.status ?? data?.state ?? ''),
    stage: String(activeRun?.stage ?? data?.stage ?? activeRun?.status ?? data?.status ?? ''),
    runId: String(activeRun?.run_id ?? activeRun?.runId ?? data?.run_id ?? data?.runId ?? data?.target_run_id ?? data?.targetRunId ?? data?.evidence_run_id ?? data?.evidenceRunId ?? ''),
    jobId: String(activeRun?.job_id ?? activeRun?.jobId ?? data?.job_id ?? data?.jobId ?? ''),
    startedAt: String(activeRun?.started_at ?? activeRun?.startedAt ?? data?.started_at ?? data?.startedAt ?? ''),
    completedAt: String(data?.completed_at ?? data?.completedAt ?? ''),
    failedAt: String(data?.failed_at ?? data?.failedAt ?? ''),
    latestSuccessfulRunId: String(latestSuccess?.run_id ?? latestSuccess?.runId ?? data?.latest_successful_run_id ?? data?.latestSuccessfulRunId ?? data?.latest_successful_report_run_id ?? ''),
    latestSuccessfulAt: String(latestSuccess?.completed_at ?? latestSuccess?.completedAt ?? data?.latest_successful_at ?? data?.latestSuccessfulAt ?? ''),
    runs,
    raw: data
  };
}

// Kept as a compatibility wrapper for older components/imports.
export async function triggerFullRefresh(payload: { brand: string; market: string; domain: string; auditSize: number; evidenceMode: string; ownedUrlDiscovery: string; externalEvidence: string }): Promise<{ jobId: string }> {
  const result = await refreshEvidence({
    brand: payload.brand,
    market: payload.market,
    domain: payload.domain,
    runMode: payload.externalEvidence === 'refresh_serp_evidence' ? 'fresh_ai_citations' : 'reuse_existing_evidence',
    queryPortfolioMode: payload.evidenceMode === 'generate_synthetic_queries' ? 'synthetic' : payload.evidenceMode === 'upload_query_portfolio' ? 'manual' : 'reuse',
    queryLimit: payload.auditSize,
    maxOwnedPagesPerQuery: 3,
    maxExternalCitationsPerQuery: 3,
    maxOwnedInventoryUrls: 60,
    maxOwnedUrls: 60,
    maxExternalUrls: 150,
    enableSerpapi: payload.externalEvidence === 'refresh_serp_evidence',
    enableOwnedCrawl: payload.ownedUrlDiscovery !== 'previous_inventory',
    enableExternalCrawl: payload.externalEvidence === 'crawl_external_citations',
    triggerAuditor: true
  });
  return { jobId: result.jobId || result.runId || `job-${Date.now()}` };
}
