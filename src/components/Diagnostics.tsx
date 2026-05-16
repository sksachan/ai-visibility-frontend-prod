import type { ReportBundle } from '../types/report';
import { Badge, Card, SectionTitle } from './ui';

export function QueryDiagnostics({ report }: { report: ReportBundle }) {
  return (
    <Card>
      <SectionTitle eyebrow="Query diagnostics" title="Query-level evidence shows where competitors and publishers are winning influence">
        Each card links the user query to the current brand position, leading external sources and recommended content move.
      </SectionTitle>
      <div className="grid gap-4 lg:grid-cols-3">
        {report.queries.map((item) => (
          <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold leading-6 text-slate-950">{item.query}</p>
              <Badge>{item.journey}</Badge>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-slate-500">Brand position</dt><dd className="font-semibold text-slate-900">#{item.brandPosition}</dd></div>
              <div><dt className="text-slate-500">Citation likelihood</dt><dd className="font-semibold text-slate-900">{item.citationLikelihood}%</dd></div>
              <div><dt className="text-slate-500">Competitor</dt><dd className="font-semibold text-slate-900">{item.leadingCompetitor}</dd></div>
              <div><dt className="text-slate-500">Confidence</dt><dd className="font-semibold text-slate-900">{item.confidence}%</dd></div>
            </dl>
            <div className="mt-4 space-y-2 text-sm leading-6 text-slate-700">
              <p><span className="font-semibold text-slate-950">Leading source:</span> {item.leadingPublisher}</p>
              <p><span className="font-semibold text-slate-950">Issue:</span> {item.issue}</p>
              <p><span className="font-semibold text-slate-950">Move:</span> {item.recommendedMove}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function OwnedUrlReadiness({ report }: { report: ReportBundle }) {
  return (
    <Card>
      <SectionTitle eyebrow="Owned URL GEO readiness" title="Owned pages need citation-ready structure, evidence and freshness signals">
        GEO score is shown as a six-dimension readiness model. Replace with your production scoring formula once the Railway bundle is available.
      </SectionTitle>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-3 py-3">Owned URL</th>
              <th className="px-3 py-3">Mapped query</th>
              <th className="px-3 py-3">GEO score</th>
              <th className="px-3 py-3">Clarity</th>
              <th className="px-3 py-3">Depth</th>
              <th className="px-3 py-3">Evidence</th>
              <th className="px-3 py-3">Structure</th>
              <th className="px-3 py-3">Freshness</th>
              <th className="px-3 py-3">Authority</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {report.ownedPages.map((page) => (
              <tr key={page.url} className="align-top">
                <td className="max-w-xs px-3 py-4 font-medium text-slate-950">{page.url}</td>
                <td className="max-w-xs px-3 py-4 text-slate-600">{page.mappedQuery}</td>
                <td className="px-3 py-4 font-semibold text-slate-950">{page.geoScore}</td>
                <td className="px-3 py-4">{page.clarity}</td>
                <td className="px-3 py-4">{page.semanticDepth}</td>
                <td className="px-3 py-4">{page.evidence}</td>
                <td className="px-3 py-4">{page.structure}</td>
                <td className="px-3 py-4">{page.freshness}</td>
                <td className="px-3 py-4">{page.authority}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {report.ownedPages.map((page) => (
          <div key={`${page.url}-diag`} className="rounded-xl bg-slate-50 p-3">
            <p className="truncate text-sm font-semibold text-slate-900">{page.url}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
              {page.diagnostics.map((diag) => <li key={diag}>{diag}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}
