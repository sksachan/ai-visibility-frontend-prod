import { normaliseReport } from './normaliseReport';
import type { ReportBundle } from '../types/report';

const evidenceServiceUrl = import.meta.env.VITE_EVIDENCE_SERVICE_URL || import.meta.env.VITE_API_BASE_URL || '';

export async function fetchLatestReport(brand: string, market: string): Promise<ReportBundle> {
  const bodhiParams = new URLSearchParams({ brand, market });
  try {
    const bodhiResponse = await fetch(`/api/bodhi/latest?${bodhiParams.toString()}`, { headers: { Accept: 'application/json' } });
    if (bodhiResponse.ok) {
      const payload = await bodhiResponse.json();
      return normaliseReport(payload);
    }
  } catch {
    // Fall through to evidence-service compatibility endpoints.
  }

  if (!evidenceServiceUrl) {
    throw new Error('Bodhi direct fetch is not configured and VITE_EVIDENCE_SERVICE_URL is missing. Upload a report JSON as fallback.');
  }
  const base = evidenceServiceUrl.replace(/\/$/, '');
  const params = new URLSearchParams({ brand, market });
  const urls = [
    `${base}/runs/latest/report-bundle?${params.toString()}`,
    `${base}/runs/latest/bodhi-compact?${params.toString()}`,
    `${base}/runs/latest/compact?${params.toString()}`,
    `${base}/runs/latest?${params.toString()}`,
  ];
  let lastError = '';
  for (const url of urls) {
    try {
      const response = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!response.ok) {
        lastError = `${response.status} ${response.statusText}`;
        continue;
      }
      const payload = await response.json();
      return normaliseReport(payload);
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown fetch error';
    }
  }
  throw new Error(lastError || 'No compatible latest report endpoint returned data.');
}

export async function triggerFullRefresh(payload: { brand: string; market: string; domain: string; auditSize: number; evidenceMode: string; ownedUrlDiscovery: string; externalEvidence: string }): Promise<{ jobId: string }> {
  if (!evidenceServiceUrl) {
    return { jobId: `mock-${Date.now()}` };
  }
  const base = evidenceServiceUrl.replace(/\/$/, '');
  const response = await fetch(`${base}/jobs/full-refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    return { jobId: `mock-${Date.now()}` };
  }
  const data = await response.json();
  return { jobId: String(data.job_id ?? data.jobId ?? data.id ?? `job-${Date.now()}`) };
}
