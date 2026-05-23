import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ScatterChart, Scatter, ZAxis } from 'recharts';
import type { CitationExample, ReportBundle } from '../types/report';
import { WorkspacePanel, SectionHeader, DarkButton } from './ui';

const label = (value: string) => value.replaceAll('_', ' ');
const palette = ['#54a2ff', '#935dff', '#00c758', '#ffea35', '#ff6568', '#9f9f9f', '#54a2ff', '#935dff'];

type XAxisMode = 'sourceType' | 'domain';
type GraphView = 'scatter' | 'journeyShare';

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
  const [xAxisMode, setXAxisMode] = useState<XAxisMode>('sourceType');
  const [graphView, setGraphView] = useState<GraphView>('scatter');
  const [tableSearch, setTableSearch] = useState('');
  const [sortBy, setSortBy] = useState('count_desc');
  const [citationPage, setCitationPage] = useState(0);
  const PAGE_SIZE = 5;

  // Scatter plot data: source type -> total citations (y-axis)
  const scatterByType = useMemo(() => {
    const counts: Record<string, number> = {};
    domainsAll.forEach((d) => {
      const st = d.sourceType || 'other';
      counts[st] = (counts[st] || 0) + (d.observedCount || 1);
    });
    return Object.entries(counts)
      .map(([sourceType, count], i) => ({
        name: label(sourceType),
        x: i,
        y: count,
        fill: palette[i % palette.length],
      }))
      .sort((a, b) => b.y - a.y);
  }, [domainsAll]);

  // Scatter plot data: domain -> total citations (y-axis)
  const scatterByDomain = useMemo(() => {
    const counts: Record<string, { count: number; sourceType: string }> = {};
    domainsAll.forEach((d) => {
      const dom = d.domain || 'unknown';
      if (!counts[dom]) counts[dom] = { count: 0, sourceType: d.sourceType || 'other' };
      counts[dom].count += d.observedCount || 1;
    });
    return Object.entries(counts)
      .map(([domain, data], i) => ({
        name: domain,
        x: i,
        y: data.count,
        sourceType: label(data.sourceType),
        fill: palette[i % palette.length],
      }))
      .sort((a, b) => b.y - a.y)
      .slice(0, 20);
  }, [domainsAll]);

  const scatterData = xAxisMode === 'sourceType' ? scatterByType : scatterByDomain;

  // Journey category share data: source type citation % by journey category
  const journeyShareData = useMemo(() => {
    const journeySourceCounts: Record<string, Record<string, number>> = {};
    const allSourceTypes = new Set<string>();
    // Use query workbench to get journey categories
    (report.queryWorkbench ?? []).forEach((q) => {
      const journey = q.journey_category || 'Unclassified';
      const cites = [...(q.current_ai_visibility?.top_citations ?? []), ...(q.external_top3_benchmark ?? [])];
      cites.forEach((c) => {
        const st = label(c.sourceType || 'other');
        allSourceTypes.add(st);
        if (!journeySourceCounts[journey]) journeySourceCounts[journey] = {};
        journeySourceCounts[journey][st] = (journeySourceCounts[journey][st] || 0) + 1;
      });
    });
    // Convert to percentage per journey
    return Object.entries(journeySourceCounts).map(([journey, sources]) => {
      const total = Object.values(sources).reduce((a, b) => a + b, 0) || 1;
      const row: Record<string, unknown> = { journey };
      allSourceTypes.forEach((st) => {
        row[st] = Math.round(((sources[st] || 0) / total) * 100 * 10) / 10;
      });
      return row;
    });
  }, [report.queryWorkbench]);

  const journeySourceTypes = useMemo(() => {
    const types = new Set<string>();
    journeyShareData.forEach((row) => {
      Object.keys(row).forEach((k) => { if (k !== 'journey' && typeof row[k] === 'number') types.add(k); });
    });
    return Array.from(types);
  }, [journeyShareData]);

  // Filter citation table rows - exclude owned_brand_ecosystem rows without a query
  const tableRows = useMemo(() => {
    const grouped = new Map<string, CitationExample & { count: number }>();
    citations.forEach((item) => {
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
        <SectionHeader eyebrow="Source landscape" title="Citation distribution across source types and domains">
          Scatter plot showing total citations by {xAxisMode === 'sourceType' ? 'source type' : 'citation domain'}. Switch between views to explore the citation landscape.
        </SectionHeader>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <DarkButton variant={graphView === 'scatter' ? 'primary' : 'default'} onClick={() => setGraphView('scatter')}>Scatter plot</DarkButton>
          <DarkButton variant={graphView === 'journeyShare' ? 'primary' : 'default'} onClick={() => setGraphView('journeyShare')}>Source type % by brand topics</DarkButton>
          {graphView === 'scatter' && (
            <>
              <span className="text-xs text-[var(--text-muted)] mx-1">|</span>
              <DarkButton variant={xAxisMode === 'sourceType' ? 'primary' : 'default'} onClick={() => setXAxisMode('sourceType')}>X: Source type</DarkButton>
              <DarkButton variant={xAxisMode === 'domain' ? 'primary' : 'default'} onClick={() => setXAxisMode('domain')}>X: Citation domains</DarkButton>
            </>
          )}
        </div>

        {graphView === 'scatter' && (
          <div className="h-[28rem] rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3">
            {scatterData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis
                    dataKey="name"
                    type="category"
                    allowDuplicatedCategory={false}
                    angle={-35}
                    textAnchor="end"
                    interval={0}
                    height={80}
                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  />
                  <YAxis
                    dataKey="y"
                    type="number"
                    label={{ value: 'Total citations', angle: -90, position: 'insideLeft', fill: 'var(--text-muted)' }}
                    tick={{ fill: 'var(--text-secondary)' }}
                  />
                  <ZAxis dataKey="y" range={[60, 400]} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-3 text-sm shadow-lg">
                          <p className="font-semibold text-[var(--text-primary)]">{d.name}</p>
                          <p className="text-[var(--text-secondary)]">{d.y} citations</p>
                          {d.sourceType && <p className="text-xs text-[var(--text-muted)]">{d.sourceType}</p>}
                        </div>
                      );
                    }}
                  />
                  <Scatter data={scatterData} fill="#54a2ff">
                    {scatterData.map((d, i) => <Cell key={d.name} fill={palette[i % palette.length]} />)}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            ) : <Empty>No observed non-owned domain data found.</Empty>}
          </div>
        )}

        {graphView === 'journeyShare' && (
          <div className="h-[28rem] rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3">
            <p className="mb-2 text-xs text-[var(--text-muted)]">Source type citation percentage share by journey categories (brand topics)</p>
            {journeyShareData.length ? (
              <ResponsiveContainer width="100%" height="95%">
                <BarChart data={journeyShareData} layout="vertical" margin={{ top: 10, right: 30, left: 120, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis dataKey="journey" type="category" width={110} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <Tooltip
                    content={({ active, payload, label: journeyLabel }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-3 text-sm shadow-lg">
                          <p className="font-semibold text-[var(--text-primary)] mb-1">{journeyLabel}</p>
                          {payload.map((p) => (
                            <p key={p.dataKey as string} className="text-[var(--text-secondary)]">
                              <span style={{ color: p.color }}>●</span> {String(p.dataKey)}: {p.value}%
                            </p>
                          ))}
                        </div>
                      );
                    }}
                  />
                  {journeySourceTypes.map((st, i) => (
                    <Bar key={st} dataKey={st} stackId="a" fill={palette[i % palette.length]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : <Empty>No journey category data available. Run analysis with query workbench data.</Empty>}
          </div>
        )}
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
