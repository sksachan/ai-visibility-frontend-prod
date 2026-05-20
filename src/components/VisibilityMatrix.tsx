import { useMemo, useState } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis, Cell, LabelList } from 'recharts';
import type { CitationExample, ReportBundle } from '../types/report';
import { Card, SectionTitle } from './ui';

const label = (value: string) => value.replaceAll('_', ' ');
const palette = ['#0f172a', '#334155', '#475569', '#64748b', '#94a3b8', '#1e293b', '#475569', '#64748b'];

type Point = { x: number; sourceType: string; domain: string; count: number; url?: string; query?: string };
type AxisMode = 'sourceType' | 'domain';

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
  const [axisMode, setAxisMode] = useState<AxisMode>('sourceType');
  const [tableSearch, setTableSearch] = useState('');
  const [sortBy, setSortBy] = useState('count_desc');
  const axisValues = useMemo(() => Array.from(new Set(domainsAll.map((d) => axisMode === 'domain' ? d.domain : d.sourceType).filter(Boolean))).sort(), [domainsAll, axisMode]);
  const data: Point[] = useMemo(() => domainsAll.map((domain) => ({
    x: Math.max(0, axisValues.indexOf(axisMode === 'domain' ? domain.domain : domain.sourceType)),
    sourceType: domain.sourceType,
    domain: domain.domain,
    count: domain.observedCount || 1,
    url: domain.exampleUrl,
    query: domain.exampleQuery
  })), [domainsAll, axisValues, axisMode]);
  const tableRows = useMemo(() => {
    const grouped = new Map<string, CitationExample & { count: number }>();
    citations.forEach((item) => {
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

  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle eyebrow="Source landscape" title="External and competitor sources are shaping the citation layer">
          Each dot is a citation domain. The y-axis shows citation count; switch the x-axis between source type and source domain.
        </SectionTitle>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button onClick={() => setAxisMode('sourceType')} className={`rounded-xl px-3 py-2 text-sm font-semibold ${axisMode === 'sourceType' ? 'bg-slate-950 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}>X-axis: source type</button>
          <button onClick={() => setAxisMode('domain')} className={`rounded-xl px-3 py-2 text-sm font-semibold ${axisMode === 'domain' ? 'bg-slate-950 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}>X-axis: domain</button>
        </div>
        <div className="h-[34rem] rounded-2xl bg-slate-50 p-3">
          {data.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 90 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="x" type="number" domain={[-0.5, Math.max(0.5, axisValues.length - 0.5)]} ticks={axisValues.map((_, index) => index)} tickFormatter={(value) => label(axisValues[Number(value)] ?? '')} angle={-35} textAnchor="end" interval={0} height={90} />
                <YAxis dataKey="count" name="Citation count" label={{ value: 'Citation count', angle: -90, position: 'insideLeft' }} />
                <ZAxis dataKey="count" range={[80, 420]} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const point = payload[0].payload as Point;
                  return <div className="max-w-xs rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-sm"><p className="font-semibold text-slate-950">{point.domain}</p><p className="text-slate-600">{label(point.sourceType)} · {point.count} citations</p>{point.query ? <p className="mt-1 text-xs text-slate-500">{point.query}</p> : null}</div>;
                }} />
                <Scatter data={data} name="Citation domains">
                  <LabelList dataKey="domain" position="top" className="fill-slate-600 text-[10px]" />
                  {data.map((point) => <Cell key={`${point.domain}-${point.sourceType}`} fill={palette[point.x % palette.length]} />)}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          ) : <Empty>No observed non-owned domain array was found in the uploaded file.</Empty>}
        </div>
      </Card>
      <Card>
        <SectionTitle eyebrow="Citation evidence" title={`Captured source citations (${tableRows.length})`}>
          Source type, domain and citation text evidence captured from AI citation responses.
        </SectionTitle>
        <div className="mb-4 grid gap-3 md:grid-cols-2">
          <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Search source, query, snippet..." value={tableSearch} onChange={(event) => setTableSearch(event.target.value)} />
          <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="count_desc">Sort: citation count</option>
            <option value="domain">Sort: domain</option>
            <option value="type">Sort: source type</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead><tr className="text-left text-xs uppercase tracking-wide text-slate-500"><th className="px-3 py-3">Type</th><th className="px-3 py-3">Domain</th><th className="px-3 py-3">Query</th><th className="px-3 py-3">Citation evidence</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {tableRows.slice(0, 200).map((item, index) => (
                <tr key={`${item.url}-${item.queryId}-${index}`} className="align-top">
                  <td className="px-3 py-4">{label(item.sourceType || 'unknown')}</td>
                  <td className="px-3 py-4"><p className="font-semibold text-slate-900">{item.domain || 'not supplied'}</p>{item.url && <p className="break-all text-xs text-slate-500">{item.url}</p>}</td>
                  <td className="px-3 py-4"><p className="font-mono text-xs text-slate-500">{item.queryId}</p><p className="max-w-xs text-slate-700">{item.query}</p></td>
                  <td className="max-w-lg px-3 py-4 text-slate-700"><p className="font-medium text-slate-900">{item.title}</p>{item.snippet ? <p className="mt-1">{item.snippet}</p> : <p className="mt-1 text-slate-400">Citation text not supplied.</p>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Empty({ children }: { children: string }) {
  return <div className="flex h-full items-center justify-center text-center text-sm text-slate-500">{children}</div>;
}
