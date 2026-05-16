import type { ReportBundle } from '../types/report';
import { Card, MetricCard, SectionTitle } from './ui';

export function ExecutiveReport({ report }: { report: ReportBundle }) {
  const metrics = report.executive.headlineMetrics;
  return (
    <div className="space-y-5">
      <Card className="bg-slate-950 text-white">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-300">Executive summary</p>
        <h1 className="mt-3 max-w-5xl text-3xl font-semibold tracking-tight md:text-5xl">
          {report.brand} is visible in AI answers, but owned pages are not yet winning the citation layer.
        </h1>
        <p className="mt-5 max-w-4xl text-base leading-7 text-slate-200">{report.executive.summary}</p>
        <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-300">
          <span>Run: {report.runId}</span>
          <span>Evidence date: {report.evidenceDate}</span>
          <span>Market: {report.market}</span>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-5">
        <MetricCard label="Brand score" value={metrics.brandScore.toFixed(1)} note="Composite AI visibility signal" />
        <MetricCard label="Target URL citations" value={metrics.ownedTargetCitations} note="Priority owned pages cited directly" />
        <MetricCard label="Domain citations" value={metrics.ownedDomainCitations} note="Brand domain mentioned or cited" />
        <MetricCard label="Competitor-led queries" value={metrics.competitorLedQueries} note="Competitors lead answer influence" />
        <MetricCard label="External-led queries" value={metrics.externalLedQueries} note="Publishers shape the answer" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Narrative title="What is happening" items={report.executive.whatIsHappening} />
        <Narrative title="Why now" items={report.executive.whyNow} />
        <Narrative title="Priority actions" items={report.executive.priorityActions} />
      </div>
    </div>
  );
}

function Narrative({ title, items }: { title: string; items: string[] }) {
  return (
    <Card>
      <SectionTitle title={title} />
      <div className="space-y-3">
        {items.map((item) => (
          <p key={item} className="rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">
            {item}
          </p>
        ))}
      </div>
    </Card>
  );
}
