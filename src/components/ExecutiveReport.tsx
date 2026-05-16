import type { ReportBundle } from '../types/report';
import { Card, MetricCard, SectionTitle } from './ui';

export function ExecutiveReport({ report }: { report: ReportBundle }) {
  const metrics = report.executive.headlineMetrics;
  return (
    <div className="space-y-5">
      <Card className="!bg-slate-950 !text-white">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-300">Executive summary</p>
        <h1 className="mt-3 max-w-5xl text-3xl font-semibold tracking-tight md:text-5xl">
          {report.executive.summary}
        </h1>
        <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-300">
          <span>Run: {report.runId}</span>
          <span>Evidence date: {report.evidenceDate}</span>
          <span>Market: {report.market}</span>
          {report.parserMeta && <span>Parsed: {report.parserMeta.queryCount} queries · {report.parserMeta.ownedPageCount} owned pages</span>}
        </div>
      </Card>

      {report.parserMeta?.warnings?.length ? (
        <Card className="border-amber-200 bg-amber-50">
          <SectionTitle eyebrow="Parser notes" title="Uploaded file parsed with caveats" />
          <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-amber-900">
            {report.parserMeta.warnings.map((warning) => <li key={warning}>{warning}</li>)}
          </ul>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-5">
        <MetricCard label="AI visibility score" value={`${metrics.brandScore.toFixed(1)} / 100`} note="Uploaded executive KPI" />
        <MetricCard label="Queries audited" value={metrics.queryCount ?? report.queries.length} note="Full query portfolio parsed" />
        <MetricCard label="Owned pages" value={metrics.ownedPageCount ?? report.ownedPages.length} note="Owned readiness records parsed" />
        <MetricCard label="Target URL citations" value={metrics.ownedTargetCitations} note="Owned target pages cited directly" />
        <MetricCard label="External sources" value={metrics.externalSourceCount ?? 0} note="External evidence sources collected" />
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <MetricCard label="Owned domain citations" value={metrics.ownedDomainCitations} note="Nissan domain or ecosystem citations" />
        <MetricCard label="Competitor-led queries" value={metrics.competitorLedQueries} note="Competitors lead answer influence" />
        <MetricCard label="External-led queries" value={metrics.externalLedQueries} note="External sources lead answers" />
        <MetricCard label="Avg owned GEO" value={`${(metrics.averageOwnedGeoScore120 ?? 0).toFixed(1)} / 120`} note="6 × 20 owned-page readiness" />
        <MetricCard label="External influence" value={`${(metrics.averageExternalCitationInfluenceScore ?? 0).toFixed(1)}`} note="External citation influence score" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Narrative title="What is happening" items={report.executive.whatIsHappening} />
        <Narrative title="Why it is happening" items={report.executive.whyNow} />
        <Narrative title="Priority actions" items={report.executive.priorityActions} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {report.executive.riskIfNoAction && <Narrative title="Risk if no action" items={[report.executive.riskIfNoAction]} />}
        {report.executive.recommendedNextSteps?.length ? <Narrative title="Recommended next steps" items={report.executive.recommendedNextSteps} /> : null}
      </div>
    </div>
  );
}

function Narrative({ title, items }: { title: string; items: string[] }) {
  return (
    <Card>
      <SectionTitle title={title} />
      <div className="space-y-3">
        {items.length ? items.map((item) => (
          <p key={item} className="rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">
            {item}
          </p>
        )) : <p className="text-sm text-slate-500">No data supplied in uploaded output.</p>}
      </div>
    </Card>
  );
}
