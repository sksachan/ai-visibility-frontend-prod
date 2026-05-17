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

export async function triggerFullRefresh(payload: { brand: string; market: string; domain: string; auditSize: number; evidenceMode: string; ownedUrlDiscovery: string; externalEvidence: string }): Promise<{ jobId: string }> {
  const response = await fetch('/api/evidence/full-refresh', {
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
