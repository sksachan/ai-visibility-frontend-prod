import type { ReportBundle } from '../types/report';
import { Card, MetricCard, SectionTitle } from './ui';
import { BrandTopicScorecard } from './BrandTopicScorecard';

export function ExecutiveReport({ report }: { report: ReportBundle }) {
  const metrics = report.executive.headlineMetrics;
  const score = metrics.brandScore ?? 0;
  const queryCount = metrics.queryCount ?? report.queries.length;
  const geo = metrics.averageOwnedGeoScore120 ?? 0;
  const position = score >= 60 ? 'is strongly visible' : score >= 35 ? 'has moderate AI visibility' : 'has weak AI visibility';
  const implication = score >= 60
    ? 'The priority is to defend citation quality and keep owned pages current.'
    : 'The priority is to improve owned-page extractability and strengthen external citation coverage.';
  const executiveHeadline = `${report.brand} ${position} across ${queryCount} audited queries.`;
  const executiveSubline = `AI visibility is ${score.toFixed(1)}/100 and average owned-page GEO readiness is ${geo.toFixed(1)}/120. ${implication}`;
  return (
    <div className="space-y-5">
      <Card className="!bg-slate-950 !text-white">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-300">Executive summary</p>
        <h1 className="mt-3 max-w-5xl text-3xl font-semibold tracking-tight md:text-5xl">
          {executiveHeadline}
        </h1>
        <p className="mt-4 max-w-4xl text-base leading-7 text-slate-300 md:text-lg">{executiveSubline}</p>
        <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-300">
          <span>Run: {report.runId}</span>
          <span>Evidence date: {report.evidenceDate}</span>
          <span>Market: {report.market}</span>
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

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="AI visibility score" value={`${metrics.brandScore.toFixed(1)} / 100`} />
        <MetricCard label="Queries audited" value={metrics.queryCount ?? report.queries.length} />
        <MetricCard label="Avg owned GEO" value={`${(metrics.averageOwnedGeoScore120 ?? 0).toFixed(1)} / 120`} />
        <MetricCard label="Owned pages audited" value={metrics.ownedPageCount ?? report.ownedPages.length} />
      </div>

      <AiHygieneCard report={report} />

      <BrandTopicScorecard rows={report.executive.brandTopicScorecard ?? []} />

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


function AiHygieneCard({ report }: { report: ReportBundle }) {
  const hygiene = report.aiHygiene;
  if (!hygiene) return null;
  const sd = hygiene.structured_data || {};
  const priority = String(hygiene.priority || 'medium').toLowerCase();
  const priorityClass = priority === 'high' ? 'border-red-200 bg-red-50 text-red-900' : priority === 'low' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900';
  // JSON-LD 0% means checked and absent, not field missing.
  // coverage_pct === 0 is a valid checked state; only undefined means not checked.
  const schemaCoverage = sd.coverage_pct === undefined && sd.pages_with_json_ld === undefined
    ? 'not checked'
    : `${sd.pages_with_json_ld ?? 0}/${sd.owned_pages_total ?? report.ownedPages.length} pages · ${sd.coverage_pct ?? 0}%`;
  return (
    <Card className={priorityClass}>
      <SectionTitle eyebrow="AI Discoverability Hygiene" title="Priority technical controls for AI crawler and citation readiness">
        LLMs.txt is not mandatory for all AI systems, but it is useful as an explicit guidance layer for AI crawlers and agentic retrieval systems.
      </SectionTitle>
      <div className="grid gap-3 md:grid-cols-4">
        <HygieneMetric label="Robots.txt" value={hygiene.robots_txt?.status || 'not supplied'} />
        <HygieneMetric label="LLMs.txt" value={hygiene.llms_txt?.status || 'not supplied'} />
        <HygieneMetric label="JSON-LD/schema coverage" value={schemaCoverage} />
        <HygieneMetric label="Priority" value={hygiene.priority || 'not supplied'} />
      </div>
      {hygiene.summary && <p className="mt-3 rounded-xl bg-white/60 p-3 text-sm leading-6">{hygiene.summary}</p>}
    </Card>
  );
}

function HygieneMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-white/70 p-3"><p className="text-xs uppercase tracking-wide opacity-70">{label}</p><p className="mt-1 font-semibold">{value}</p></div>;
}
