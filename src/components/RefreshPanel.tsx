import { useState } from 'react';
import { PlayCircle } from 'lucide-react';
import { triggerFullRefresh } from '../lib/api';
import { Card, SectionTitle } from './ui';

export function RefreshPanel({ brand, market }: { brand: string; market: string }) {
  const [domain, setDomain] = useState('https://www.nissan.co.jp');
  const [auditSize, setAuditSize] = useState(50);
  const [evidenceMode, setEvidenceMode] = useState('reuse_latest_queries');
  const [ownedUrlDiscovery, setOwnedUrlDiscovery] = useState('sitemap_xml');
  const [externalEvidence, setExternalEvidence] = useState('reuse_serp_evidence');
  const [jobId, setJobId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit() {
    setIsSubmitting(true);
    try {
      const result = await triggerFullRefresh({ brand, market, domain, auditSize, evidenceMode, ownedUrlDiscovery, externalEvidence });
      setJobId(result.jobId);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <SectionTitle eyebrow="Evidence refresh control" title="Trigger a new crawl or reuse latest evidence before running Bodhi">
        This is wired to `POST /jobs/full-refresh` when an evidence-service URL is configured. Otherwise it returns a mock job id.
      </SectionTitle>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="text-sm font-medium text-slate-700">Domain
          <input className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2" value={domain} onChange={(e) => setDomain(e.target.value)} />
        </label>
        <label className="text-sm font-medium text-slate-700">Audit size
          <select className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2" value={auditSize} onChange={(e) => setAuditSize(Number(e.target.value))}>
            <option value={25}>25 URLs</option>
            <option value={50}>50 URLs</option>
            <option value={100}>100 URLs</option>
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">Evidence mode
          <select className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2" value={evidenceMode} onChange={(e) => setEvidenceMode(e.target.value)}>
            <option value="reuse_latest_queries">Reuse latest queries</option>
            <option value="upload_brand_topics">Upload brand topics</option>
            <option value="upload_query_portfolio">Upload query portfolio</option>
            <option value="generate_synthetic_queries">Generate synthetic topics and queries</option>
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">Owned URL discovery
          <select className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2" value={ownedUrlDiscovery} onChange={(e) => setOwnedUrlDiscovery(e.target.value)}>
            <option value="sitemap_xml">Use sitemap XML</option>
            <option value="upload_url_list">Upload URL list</option>
            <option value="previous_inventory">Use previous inventory</option>
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">External evidence
          <select className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2" value={externalEvidence} onChange={(e) => setExternalEvidence(e.target.value)}>
            <option value="reuse_serp_evidence">Reuse Google AI Mode / SerpAPI evidence</option>
            <option value="refresh_serp_evidence">Refresh SerpAPI evidence</option>
            <option value="crawl_external_citations">Crawl external citations</option>
          </select>
        </label>
        <div className="flex items-end">
          <button onClick={onSubmit} disabled={isSubmitting} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
            <PlayCircle size={18} /> {isSubmitting ? 'Starting...' : 'Start refresh'}
          </button>
        </div>
      </div>
      {jobId && <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">Refresh job started: <span className="font-semibold">{jobId}</span></p>}
    </Card>
  );
}
