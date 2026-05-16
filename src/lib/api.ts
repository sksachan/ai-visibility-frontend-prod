import { mockReport } from '../data/mockReport';
import type { ReportBundle } from '../types/report';
import { normaliseReport } from './normaliseReport';

const API_BASE_URL = import.meta.env.VITE_EVIDENCE_API_BASE_URL as string | undefined;

async function fetchJson<T>(path: string): Promise<T> {
  if (!API_BASE_URL) throw new Error('VITE_EVIDENCE_API_BASE_URL is not configured');
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) throw new Error(`API request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

export async function fetchLatestReport(brand: string, market: string): Promise<ReportBundle> {
  if (!API_BASE_URL) return mockReport;

  const latest = await fetchJson<{ run_id?: string; runId?: string }>(
    `/runs/latest?brand=${encodeURIComponent(brand)}&market=${encodeURIComponent(market)}`
  );
  const runId = latest.run_id ?? latest.runId;
  if (!runId) throw new Error('Latest run response did not include run_id');
  const dashboard = await fetchJson<unknown>(`/runs/${encodeURIComponent(runId)}/dashboard`);
  return normaliseReport(dashboard);
}

export async function triggerFullRefresh(payload: {
  brand: string;
  market: string;
  domain: string;
  auditSize: number;
  evidenceMode: string;
  ownedUrlDiscovery: string;
  externalEvidence: string;
}): Promise<{ jobId: string }> {
  if (!API_BASE_URL) return { jobId: `mock_job_${Date.now()}` };

  const response = await fetch(`${API_BASE_URL}/jobs/full-refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(`Refresh trigger failed: ${response.status}`);
  const body = await response.json();
  return { jobId: body.job_id ?? body.jobId ?? 'unknown_job' };
}
