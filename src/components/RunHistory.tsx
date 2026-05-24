import { useCallback, useEffect, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { WorkspacePanel, SectionHeader, DarkButton, StatusPill } from './ui';
import { fetchReportHistory, fetchReportByRunId, deleteRun, type ReportHistoryRun } from '../lib/api';
import type { ReportBundle } from '../types/report';

export function RunHistory({ brand, market, onLoad }: { brand: string; market: string; onLoad: (report: ReportBundle, row: ReportHistoryRun) => void }) {
  const [rows, setRows] = useState<ReportHistoryRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterBrand, setFilterBrand] = useState('__all__');
  const [filterMarket, setFilterMarket] = useState('__all__');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      // Always fetch all runs so we can build filter dropdowns
      setRows(await fetchReportHistory('', ''));
    }
    catch (err) { setError(err instanceof Error ? err.message : String(err)); }
    finally { setLoading(false); }
  }, []);

  async function loadRun(row: ReportHistoryRun) {
    setLoading(true); setError('');
    try { onLoad(await fetchReportByRunId(row.run_id), row); }
    catch (err) { setError(err instanceof Error ? err.message : String(err)); }
    finally { setLoading(false); }
  }

  async function onDeleteRun(row: ReportHistoryRun) {
    if (!window.confirm(`Delete run ${row.run_id}? This cannot be undone.`)) return;
    setDeletingId(row.run_id);
    setError('');
    try {
      await deleteRun(row.run_id);
      setRows((prev) => prev.filter((r) => r.run_id !== row.run_id));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  // Build unique brand/market lists for dropdown filters
  const brands = useMemo(() => Array.from(new Set(rows.map((r) => r.brand).filter(Boolean))).sort() as string[], [rows]);
  const markets = useMemo(() => Array.from(new Set(rows.map((r) => r.market).filter(Boolean))).sort() as string[], [rows]);

  // Apply filters
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (filterBrand !== '__all__' && row.brand !== filterBrand) return false;
      if (filterMarket !== '__all__' && row.market !== filterMarket) return false;
      return true;
    });
  }, [rows, filterBrand, filterMarket]);

  return (
    <WorkspacePanel>
      <SectionHeader eyebrow="Previous successful runs" title="Load a prior dashboard-ready report">
        Select a previous run using lightweight analytics. Only dashboard-ready successful runs are listed.
      </SectionHeader>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="text-sm text-[var(--text-secondary)]">
          <span className="mr-1.5 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Brand</span>
          <select
            className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-1.5 text-sm text-[var(--text-primary)]"
            value={filterBrand}
            onChange={(e) => setFilterBrand(e.target.value)}
          >
            <option value="__all__">All brands</option>
            {brands.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </label>
        <label className="text-sm text-[var(--text-secondary)]">
          <span className="mr-1.5 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Market</span>
          <select
            className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-1.5 text-sm text-[var(--text-primary)]"
            value={filterMarket}
            onChange={(e) => setFilterMarket(e.target.value)}
          >
            <option value="__all__">All markets</option>
            {markets.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <DarkButton onClick={() => void load()}>{loading ? 'Refreshing\u2026' : 'Refresh list'}</DarkButton>
      </div>
      {error && <p className="mb-3 rounded-[var(--radius-sm)] border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">{error}</p>}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="typo-meta px-3 py-3 text-[var(--text-muted)]">Run</th>
              <th className="typo-meta px-3 py-3 text-[var(--text-muted)]">Queries</th>
              <th className="typo-meta px-3 py-3 text-[var(--text-muted)]">Citations</th>
              <th className="typo-meta px-3 py-3 text-[var(--text-muted)]">Owned scored</th>
              <th className="typo-meta px-3 py-3 text-[var(--text-muted)]">External</th>
              <th className="typo-meta px-3 py-3 text-[var(--text-muted)]">Crawl</th>
              <th className="typo-meta px-3 py-3 text-[var(--text-muted)]">Mode</th>
              <th className="typo-meta px-3 py-3 text-[var(--text-muted)]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.run_id} className="align-top">
                <td className="px-3 py-4">
                  <p className="font-mono text-xs text-[var(--text-primary)]">{row.run_id}</p>
                  {row.portfolio_id && <p className="mt-1 font-mono text-[10px] text-[var(--text-muted)]" title="Query portfolio ID">Portfolio: {row.portfolio_id}</p>}
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{formatEpoch(row.completed_at_epoch || row.created_at_epoch)}</p>
                  {row.brand && <p className="mt-1 text-xs font-semibold text-[var(--accent-blue)]">{row.brand} / {row.market}</p>}
                </td>
                <td className="px-3 py-4 text-[var(--text-secondary)]">{row.query_count ?? '\u2014'}</td>
                <td className="px-3 py-4 text-[var(--text-secondary)]">{row.citation_count ?? '\u2014'}</td>
                <td className="px-3 py-4 text-[var(--text-secondary)]">{row.owned_pages_scoreable ?? row.owned_inventory_selected ?? '\u2014'}</td>
                <td className="px-3 py-4 text-[var(--text-secondary)]">{row.external_pages_scoreable ?? '\u2014'}</td>
                <td className="px-3 py-4 text-[var(--text-secondary)]">{row.crawl_success_rate != null ? `${Math.round(Number(row.crawl_success_rate) * 100)}%` : '\u2014'}</td>
                <td className="px-3 py-4 text-xs text-[var(--text-muted)]">{row.serpapi_enabled ? 'Fresh SerpAPI' : row.source_run_id ? 'Citation reuse' : 'No AI refresh'}</td>
                <td className="px-3 py-4">
                  <div className="flex items-center gap-2">
                    <DarkButton variant="primary" onClick={() => void loadRun(row)}>Load</DarkButton>
                    <button
                      onClick={() => void onDeleteRun(row)}
                      disabled={deletingId === row.run_id}
                      className="inline-flex items-center justify-center rounded-[var(--radius-sm)] border border-red-500/20 bg-red-500/10 p-2 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors disabled:opacity-50"
                      title="Delete this run"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!filteredRows.length && !loading && <p className="text-sm text-[var(--text-muted)]">No previous successful reports found{filterBrand !== '__all__' || filterMarket !== '__all__' ? ' for the selected filters' : ''}.</p>}
    </WorkspacePanel>
  );
}

function formatEpoch(value?: number) {
  if (!value) return 'Date not supplied';
  return new Date(value * 1000).toLocaleString();
}
