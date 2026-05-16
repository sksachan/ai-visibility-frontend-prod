import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, Treemap } from 'recharts';
import type { ReportBundle } from '../types/report';
import { Card, SectionTitle } from './ui';

export function VisibilityMatrix({ report }: { report: ReportBundle }) {
  const sourceCounts = report.sourceLandscape?.sourceTypeCounts ?? [];
  const domains = (report.sourceLandscape?.observedNonOwnedDomains ?? []).slice(0, 15);
  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle eyebrow="Source landscape" title="External and competitor sources are shaping the citation layer">
          This view uses source counts, observed domains and winning source patterns from the uploaded Bodhi output. No competitor mock matrix is used after upload.
        </SectionTitle>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-96 rounded-2xl bg-slate-50 p-3">
            {sourceCounts.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sourceCounts} layout="vertical" margin={{ top: 10, right: 20, left: 100, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="sourceType" type="category" width={140} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" name="Observed citations / sources" fill="#334155" />
                </BarChart>
              </ResponsiveContainer>
            ) : <Empty>No source-type count array was found in the uploaded file.</Empty>}
          </div>
          <div className="h-96 rounded-2xl bg-slate-50 p-3">
            {domains.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <Treemap data={domains.map((d) => ({ name: d.domain, size: d.observedCount || 1, sourceType: d.sourceType }))} dataKey="size" nameKey="name" aspectRatio={4 / 3} stroke="#fff" fill="#64748b" />
              </ResponsiveContainer>
            ) : <Empty>No observed non-owned domain array was found in the uploaded file.</Empty>}
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle eyebrow="Winning source patterns" title="Patterns to copy into owned pages and PR assets" />
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {(report.sourceLandscape?.winningSourcePatterns ?? []).map((pattern) => (
            <div key={pattern.sourceType} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-950">{pattern.sourceType}</div>
              <div className="mt-1 text-xs text-slate-500">Citation count: {pattern.citationCount}</div>
              <p className="mt-3 text-sm leading-6 text-slate-700">{pattern.winningPattern}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Empty({ children }: { children: string }) {
  return <div className="flex h-full items-center justify-center text-center text-sm text-slate-500">{children}</div>;
}
