import type { ReportBundle } from '../types/report';
import { Badge, Card, SectionTitle } from './ui';

const statusTone = (value: string) => value.includes('competitor') || value.includes('external') ? 'high' : value.includes('owned_domain') ? 'medium' : value.includes('target') ? 'low' : 'neutral';

export function QueryDiagnostics({ report }: { report: ReportBundle }) {
  return (
    <Card>
      <SectionTitle eyebrow="Query diagnostics" title={`All ${report.queries.length} query-level evidence records from Bodhi output`}>
        Each card uses query_level_source_gaps and representative citations from the uploaded JSON.
      </SectionTitle>
      <div className="grid gap-4 lg:grid-cols-2">
        {report.queries.map((item) => (
          <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.id} · {item.journey}</p>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-950">{item.query}</p>
              </div>
              <Badge tone={statusTone(item.visibilityStatus)}>{item.visibilityStatus || 'unknown'}</Badge>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
              <div><dt className="text-slate-500">Owned target cited</dt><dd className="font-semibold text-slate-900">{item.ownedTargetPageCited ? 'Yes' : 'No'}</dd></div>
              <div><dt className="text-slate-500">Owned GEO /120</dt><dd className="font-semibold text-slate-900">{item.ownedGeoScore120}</dd></div>
              <div><dt className="text-slate-500">External benchmark</dt><dd className="font-semibold text-slate-900">{item.externalBenchmarkScore}</dd></div>
              <div><dt className="text-slate-500">Preference gap</dt><dd className="font-semibold text-slate-900">{item.sourcePreferenceGap}</dd></div>
            </dl>
            <div className="mt-4 text-sm leading-6 text-slate-700">
              <p><span className="font-semibold text-slate-950">Winning source types:</span> {item.winningExternalSourceTypes.join(', ') || 'Not supplied'}</p>
              <p><span className="font-semibold text-slate-950">Leading citation domain:</span> {item.leadingPublisher}</p>
            </div>
            {item.gapReasons.length ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700">
                {item.gapReasons.map((reason) => <li key={reason}>{reason}</li>)}
              </ul>
            ) : null}
            {item.citations.length ? (
              <details className="mt-3 rounded-xl bg-white p-3 text-sm text-slate-700">
                <summary className="cursor-pointer font-semibold text-slate-950">View {item.citations.length} citation examples</summary>
                <div className="mt-3 space-y-3">
                  {item.citations.slice(0, 5).map((citation) => (
                    <div key={`${item.id}-${citation.url}`} className="border-t border-slate-100 pt-3">
                      <p className="font-semibold text-slate-900">{citation.domain || citation.title}</p>
                      <p className="text-xs text-slate-500">{citation.sourceType} · position {citation.citationPosition ?? 'n/a'}</p>
                      {citation.url && <p className="break-all text-xs text-slate-500">{citation.url}</p>}
                      {citation.snippet && <p className="mt-1 text-sm leading-5 text-slate-600">{citation.snippet}</p>}
                    </div>
                  ))}
                </div>
              </details>
            ) : null}
          </div>
        ))}
      </div>
    </Card>
  );
}

export function OwnedUrlReadiness({ report }: { report: ReportBundle }) {
  return (
    <Card>
      <SectionTitle eyebrow="Owned URL GEO readiness" title={`All ${report.ownedPages.length} owned-page readiness records from Bodhi output`}>
        Scores use the uploaded owned_geo_readiness object: content clarity, semantic depth, structured data, E-E-A-T, freshness and FAQ readiness.
      </SectionTitle>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-3 py-3">Owned URL</th>
              <th className="px-3 py-3">Journey</th>
              <th className="px-3 py-3">Score /120</th>
              <th className="px-3 py-3">Clarity</th>
              <th className="px-3 py-3">Depth</th>
              <th className="px-3 py-3">Structured data</th>
              <th className="px-3 py-3">E-E-A-T</th>
              <th className="px-3 py-3">Freshness</th>
              <th className="px-3 py-3">FAQ</th>
              <th className="px-3 py-3">Related queries</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {report.ownedPages.map((page) => (
              <tr key={page.url} className="align-top">
                <td className="max-w-sm px-3 py-4 font-medium text-slate-950"><p className="break-all">{page.url}</p>{page.title && <p className="mt-1 text-xs text-slate-500">{page.title}</p>}</td>
                <td className="max-w-xs px-3 py-4 text-slate-600">{page.journeyCategory}</td>
                <td className="px-3 py-4 font-semibold text-slate-950">{page.geoScore}</td>
                <td className="px-3 py-4">{page.clarity}</td>
                <td className="px-3 py-4">{page.semanticDepth}</td>
                <td className="px-3 py-4">{page.structure}</td>
                <td className="px-3 py-4">{page.evidence}</td>
                <td className="px-3 py-4">{page.freshness}</td>
                <td className="px-3 py-4">{page.faqReadiness ?? 0}</td>
                <td className="px-3 py-4">{page.relatedQueries.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {report.ownedPages.map((page) => (
          <div key={`${page.url}-diag`} className="rounded-xl bg-slate-50 p-3">
            <p className="break-all text-sm font-semibold text-slate-900">{page.url}</p>
            <p className="mt-1 text-xs text-slate-500">{page.scoreBand || 'unbanded'} · {page.evidenceMatchStatus}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
              {page.diagnostics.map((diag) => <li key={diag}>{diag}</li>)}
            </ul>
            {page.relatedQueries.length ? (
              <details className="mt-2 text-sm text-slate-600">
                <summary className="cursor-pointer font-semibold text-slate-800">Mapped queries</summary>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {page.relatedQueries.slice(0, 5).map((query) => <li key={query.id}>{query.id}: {query.query}</li>)}
                </ul>
              </details>
            ) : null}
          </div>
        ))}
      </div>
    </Card>
  );
}
