import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import type { CitationExample, ReportBundle } from '../types/report';
import { WorkspacePanel, SectionHeader, DarkButton } from './ui';

const label = (value: string) => value.replaceAll('_', ' ');
const palette = ['#54a2ff', '#935dff', '#00c758', '#ffea35', '#ff6568', '#9f9f9f', '#54a2ff', '#935dff'];

type ChartMode = 'percentage' | 'count';

function sourceCitations(report: ReportBundle): CitationExample[] {
  if (report.sourceLandscape?.sourceCitations?.length) return report.sourceLandscape.sourceCitations;
  const rows: CitationExample[] = [];
  report.queryWorkbench?.forEach((query) => {
    const items = [...(query.external_top3_benchmark ?? []), ...(query.current_ai_visibility?.top_citations ?? [])];
    items.forEach((item) => rows.push({ ...item, queryId: query.query_id, query: query.query }));
  });
  if (rows.length) return rows;
  return report.queries.flatMap((query) => query.citations.map((item) => ({ ...item, queryId: query.id, query: query.query })));
}

export function VisibilityMatrix({ report }: { report: ReportBundle }) {
  const domainsAll = useMemo(() => report.sourceLandscape?.observedNonOwnedDomains ?? [], [report.sourceLandscape?.observedNonOwnedDomains]);
  const citations = useMemo(() => sourceCitations(report), [report]);
  const [chartMode, setChartMode] = useState<ChartMode>('percentage');
  const [tableSearch, setTableSearch] = useState('');
  const [sortBy, setSortBy] = useState('count_desc');
  const [citationPage, setCitationPage] = useState(0);
  const PAGE_SIZE = 5;

  // Build bar chart data: source type -> count/percentage
  const chartData = useMemo(() => {
    const counts: Record<string, number> = {};
    domainsAll.forEach((d) => {
      const st = d.sourceType || 'other';
      counts[st] = (counts[st] || 0) + (d.observedCount || 1);
    });
    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(counts)
      .map(([sourceType, count], i) => ({
        sourceType: label(sourceType),
        count,
        percentage: Math.round((count / total) * 100 * 10) / 10,
        fill: palette[i % palette.length],
      }))
      .sort((a, b) => b.count - a.count);
  }, [domainsAll]);

  // Filter citation table rows - exclude owned_brand_ecosystem rows without a query
  const tableRows = useMemo(() => {
    const grouped = new Map<string, CitationExample & { count: number }>();
    citations.forEach((item) => {
      // Filter out owned brand ecosystem rows without a query
      if ((item.sourceType || '').toLowerCase() === 'owned_brand_ecosystem' && !item.query?.trim()) return;
      const key = `${item.domain || item.url}|${item.sourceType}|${item.queryId || item.query}`;
      const existing = grouped.get(key);
      if (existing) existing.count += 1;
      else grouped.set(key, { ...item, count: 1 });
    });
    const term = tableSearch.trim().toLowerCase();
    return Array.from(grouped.values()).filter((item) => {
      const haystack = [item.sourceType, item.domain, item.url, item.title, item.snippet, item.queryId, item.query].join(' ').toLowerCase();
      return !term || haystack.includes(term);
    }).sort((a, b) => {
      if (sortBy === 'domain') return (a.domain || a.url).localeCompare(b.domain || b.url);
      if (sortBy === 'type') return a.sourceType.localeCompare(b.sourceType);
      return b.count - a.count;
    });
  }, [citations, tableSearch, sortBy]);

  const totalCitationPages = Math.ceil(tableRows.length / PAGE_SIZE);
  const pagedRows = tableRows.slice(citationPage * PAGE_SIZE, (citationPage + 1) * PAGE_SIZE);

  return (
    <div className="space-y-5">
      <WorkspacePanel>
        <SectionHeader eyebrow="Source landscape" title="External and competitor sources are shaping the citation layer">
          Source type distribution across all observed citations. The y-axis shows {chartMode === 'percentage' ? 'share of mix (%)' : 'total citation count'}.
        </SectionHeader>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <DarkButton variant={chartMode === 'percentage' ? 'primary' : 'default'} onClick={() => setChartMode('percentage')}>Y-axis: percentage</DarkButton>
          <DarkButton variant={chartMode === 'count' ? 'primary' : 'default'} onClick={() => setChartMode('count')}>Y-axis: citation count</DarkButton>
        </div>
        <div className="h-[28rem] rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3">
          {chartData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 70 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="sourceType" angle={-35} textAnchor="end" interval={0} height={80} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <YAxis
                  dataKey={chartMode === 'percentage' ? 'percentage' : 'count'}
                  label={{ value: chartMode === 'percentage' ? 'Share of mix (%)' : 'Citation count', angle: -90, position: 'insideLeft', fill: 'var(--text-muted)' }}
                  tick={{ fill: 'var(--text-secondary)' }}
                  domain={chartMode === 'percentage' ? [0, 100] : undefined}
                  tickFormatter={chartMode === 'percentage' ? (v: number) => `${v}%` : undefined}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-3 text-sm shadow-lg">
                        <p className="font-semibold text-[var(--text-primary)]">{d.sourceType}</p>
                        <p className="text-[var(--text-secondary)]">{d.count} citations ({d.percentage}%)</p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey={chartMode === 'percentage' ? 'percentage' : 'count'} radius={[4, 4, 0, 0]}>
                  <LabelList dataKey={chartMode === 'percentage' ? 'percentage' : 'count'} position="top" formatter={((v: string | number | boolean | null | undefined) => v == null || v === false ? '' : chartMode === 'percentage' ? `${v}%` : v) as (label: string | number | boolean | null | undefined) => string | number | boolean | null | undefined} style={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  {chartData.map((d, i) => <Cell key={d.sourceType} fill={palette[i % palette.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty>No observed non-owned domain data found.</Empty>}
        </div>
      </WorkspacePanel>
      <WorkspacePanel>
        <SectionHeader eyebrow="Citation evidence" title={`Captured source citations (${tableRows.length})`}>
          Source type, domain and citation text evidence captured from AI citation responses.
        </SectionHeader>
        <div className="mb-4 grid gap-3 md:grid-cols-2">
          <input className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)]" placeholder="Search source, query, snippet\u2026" value={tableSearch} onChange={(event) => { setTableSearch(event.target.value); setCitationPage(0); }} />
          <select className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)]" value={sortBy} onChange={(event) => { setSortBy(event.target.value); setCitationPage(0); }}>
            <option value="count_desc">Sort: citation count</option>
            <option value="domain">Sort: domain</option>
            <option value="type">Sort: source type</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead><tr className="text-left"><th className="typo-meta px-3 py-3 text-[var(--text-muted)]">Type</th><th className="typo-meta px-3 py-3 text-[var(--text-muted)]">Domain</th><th className="typo-meta px-3 py-3 text-[var(--text-muted)]">Query</th><th className="typo-meta px-3 py-3 text-[var(--text-muted)]">Citation evidence</th></tr></thead>
            <tbody>
              {pagedRows.map((item, index) => (
                <tr key={`${item.url}-${item.queryId}-${index}`} className="align-top">
                  <td className="px-3 py-4 text-[var(--text-secondary)]">{label(item.sourceType || 'unknown')}</td>
                  <td className="px-3 py-4"><p className="font-semibold text-[var(--text-primary)]">{item.domain || 'not supplied'}</p>{item.url && <p className="break-all text-xs text-[var(--text-muted)]">{item.url}</p>}</td>
                  <td className="px-3 py-4"><p className="font-mono text-xs text-[var(--text-muted)]">{item.queryId}</p><p className="max-w-xs text-[var(--text-secondary)]">{item.query}</p></td>
                  <td className="max-w-lg px-3 py-4 text-[var(--text-secondary)]"><p className="font-medium text-[var(--text-primary)]">{item.title}</p>{item.snippet ? <p className="mt-1">{item.snippet}</p> : <p className="mt-1 text-[var(--text-muted)]">Citation text not supplied.</p>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {totalCitationPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-[var(--text-muted)]">
              Showing {citationPage * PAGE_SIZE + 1}\u2013{Math.min((citationPage + 1) * PAGE_SIZE, tableRows.length)} of {tableRows.length}
            </p>
            <div className="flex items-center gap-2">
              <DarkButton onClick={() => setCitationPage((p) => Math.max(0, p - 1))} disabled={citationPage === 0}>Previous</DarkButton>
              <span className="text-xs text-[var(--text-secondary)]">{citationPage + 1} / {totalCitationPages}</span>
              <DarkButton onClick={() => setCitationPage((p) => Math.min(totalCitationPages - 1, p + 1))} disabled={citationPage >= totalCitationPages - 1}>Next</DarkButton>
            </div>
          </div>
        )}
      </WorkspacePanel>
    </div>
  );
}

function Empty({ children }: { children: string }) {
  return <div className="flex h-full items-center justify-center text-center text-sm text-[var(--text-muted)]">{children}</div>;
}
