import { useCallback, useEffect, useState } from 'react';
import { Card, SectionTitle } from './ui';
import { fetchReportHistory, fetchReportByRunId, type ReportHistoryRun } from '../lib/api';
import type { ReportBundle } from '../types/report';

export function RunHistory({ brand, market, onLoad }: { brand: string; market: string; onLoad: (report: ReportBundle, row: ReportHistoryRun) => void }) {
  const [rows, setRows] = useState<ReportHistoryRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAllBrands, setShowAllBrands] = useState(true);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setRows(await fetchReportHistory(showAllBrands ? '' : brand, showAllBrands ? '' : market)); }
    catch (err) { setError(err instanceof Error ? err.message : String(err)); }
    finally { setLoading(false); }
  }, [brand, market, showAllBrands]);

  async function loadRun(row: ReportHistoryRun) {
    setLoading(true); setError('');
    try { onLoad(await fetchReportByRunId(row.run_id), row); }
    catch (err) { setError(err instanceof Error ? err.message : String(err)); }
    finally { setLoading(false); }
  }

  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  return (
    <Card>
      <SectionTitle eyebrow="Previous successful runs" title="Load a prior dashboard-ready report">
        Select a previous run using lightweight analytics. Only dashboard-ready successful runs are listed.
      </SectionTitle>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={showAllBrands} onChange={(e) => setShowAllBrands(e.target.checked)} /> Show all brands & markets</label>
        <button onClick={() => void load()} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">{loading ? 'Refreshing...' : 'Refresh list'}</button>
      </div>
      {error && <p className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead><tr className="text-left text-xs uppercase tracking-wide text-slate-500"><th className="px-3 py-3">Run</th><th className="px-3 py-3">Queries</th><th className="px-3 py-3">Citations</th><th className="px-3 py-3">Owned scored</th><th className="px-3 py-3">External</th><th className="px-3 py-3">Crawl</th><th className="px-3 py-3">Mode</th><th className="px-3 py-3">Action</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.run_id} className="align-top">
                <td className="px-3 py-4"><p className="font-mono text-xs text-slate-900">{row.run_id}</p><p className="mt-1 text-xs text-slate-500">{formatEpoch(row.completed_at_epoch || row.created_at_epoch)}</p>{showAllBrands && row.brand && <p className="mt-1 text-xs font-semibold text-blue-600">{row.brand} / {row.market}</p>}</td>
                <td className="px-3 py-4">{row.query_count ?? '—'}</td>
                <td className="px-3 py-4">{row.citation_count ?? '—'}</td>
                <td className="px-3 py-4">{row.owned_pages_scoreable ?? row.owned_inventory_selected ?? '—'}</td>
                <td className="px-3 py-4">{row.external_pages_scoreable ?? '—'}</td>
                <td className="px-3 py-4">{row.crawl_success_rate != null ? `${Math.round(Number(row.crawl_success_rate) * 100)}%` : '—'}</td>
                <td className="px-3 py-4 text-xs text-slate-600">{row.serpapi_enabled ? 'Fresh SerpAPI' : row.source_run_id ? 'Citation reuse' : 'No AI refresh'}</td>
                <td className="px-3 py-4"><button onClick={() => void loadRun(row)} className="rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white">Load this run</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && !loading && <p className="text-sm text-slate-500">No previous successful reports found.</p>}
    </Card>
  );
}

function formatEpoch(value?: number) {
  if (!value) return 'Date not supplied';
  return new Date(value * 1000).toLocaleString();
}
