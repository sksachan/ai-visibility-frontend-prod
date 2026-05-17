import { useMemo } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis, Cell } from 'recharts';
import type { ReportBundle } from '../types/report';
import { Card, SectionTitle } from './ui';

const label = (value: string) => value.replaceAll('_', ' ');
const palette = ['#0f172a', '#334155', '#475569', '#64748b', '#94a3b8', '#1e293b', '#475569', '#64748b'];

type Point = { x: number; sourceType: string; domain: string; count: number; url?: string; query?: string };

export function VisibilityMatrix({ report }: { report: ReportBundle }) {
  const domainsAll = useMemo(() => report.sourceLandscape?.observedNonOwnedDomains ?? [], [report.sourceLandscape?.observedNonOwnedDomains]);
  const sourceTypes = useMemo(() => Array.from(new Set(domainsAll.map((d) => d.sourceType).filter(Boolean))).sort(), [domainsAll]);
  const data: Point[] = useMemo(() => domainsAll.map((domain) => ({
    x: Math.max(0, sourceTypes.indexOf(domain.sourceType)),
    sourceType: domain.sourceType,
    domain: domain.domain,
    count: domain.observedCount || 1,
    url: domain.exampleUrl,
    query: domain.exampleQuery
  })), [domainsAll, sourceTypes]);

  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle eyebrow="Source landscape" title="External and competitor sources are shaping the citation layer">
          Each dot is a citation domain. The x-axis groups domains by source type; the y-axis shows observed citation count. This replaces the previous two-chart layout.
        </SectionTitle>
        <div className="h-[34rem] rounded-2xl bg-slate-50 p-3">
          {data.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 90 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="x" type="number" domain={[-0.5, Math.max(0.5, sourceTypes.length - 0.5)]} ticks={sourceTypes.map((_, index) => index)} tickFormatter={(value) => label(sourceTypes[Number(value)] ?? '')} angle={-35} textAnchor="end" interval={0} height={90} />
                <YAxis dataKey="count" name="Citation count" />
                <ZAxis dataKey="count" range={[80, 420]} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const point = payload[0].payload as Point;
                  return <div className="max-w-xs rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-sm"><p className="font-semibold text-slate-950">{point.domain}</p><p className="text-slate-600">{label(point.sourceType)} · {point.count} citations</p>{point.query ? <p className="mt-1 text-xs text-slate-500">{point.query}</p> : null}</div>;
                }} />
                <Scatter data={data} name="Citation domains">
                  {data.map((point) => <Cell key={`${point.domain}-${point.sourceType}`} fill={palette[point.x % palette.length]} />)}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          ) : <Empty>No observed non-owned domain array was found in the uploaded file.</Empty>}
        </div>
      </Card>
    </div>
  );
}

function Empty({ children }: { children: string }) {
  return <div className="flex h-full items-center justify-center text-center text-sm text-slate-500">{children}</div>;
}
