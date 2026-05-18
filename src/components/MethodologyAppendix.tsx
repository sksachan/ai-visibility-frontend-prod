import type { ReportBundle } from '../types/report';
import { Card, SectionTitle } from './ui';

const sections = [
  { title: 'How to use this report', items: ['Start with the executive summary to identify visibility gaps and priority workstreams.', 'Use Query Workbench to inspect the exact prompts, citations, competitors and mapped owned pages.', 'Use Owned URLs and CMS tabs to convert evidence into page-level implementation work.', 'Use PR and Action Checklist to coordinate external-source coverage and execution ownership.'] },
  { title: 'AI Visibility scoring logic', items: ['Scores combine owned target-page citation, owned-domain citation, citation count, competitor pressure, external-source dependence and confidence.', 'A low score means the brand is absent, displaced by competitors, or visible only through weak domain-level mentions.', 'Scores should be compared across repeat runs using the same query portfolio rather than treated as a static universal benchmark.'] },
  { title: 'Owned-page GEO readiness logic', items: ['GEO readiness evaluates answer-first clarity, semantic depth, evidence/E-E-A-T, structured data, freshness, authority and FAQ extractability.', 'The score is strict: official pages do not automatically receive high marks unless the page is extractable, specific and evidence-backed.', 'Crawled content, page metadata, schema signals and mapped query fit are used to differentiate page quality.'] },
  { title: 'Analysis and recommendation flow', items: ['The evidence service builds or reuses a query portfolio, maps owned URLs from the sitemap inventory, collects or reuses AI citations, crawls owned/external pages, and passes a compact bundle to the Auditor.', 'The Auditor compares query visibility, owned-page readiness and external source patterns, then generates CMS, PR and action backlog recommendations.', 'The dashboard shows executive synthesis first, then operator drilldowns for validation and delivery.'] },
  { title: 'AI discoverability hygiene', items: ['Robots.txt, LLMs.txt and JSON-LD/schema coverage are treated as site-level AI readiness controls.', 'LLMs.txt is not mandatory for all AI systems, but it is useful as an explicit guidance layer for AI crawlers and agentic retrieval systems.', 'Structured data coverage is reported as a page coverage percentage and as page-level technical signals.'] },
  { title: 'Limitations', items: ['AI answers are dynamic. Treat each run as an evidence sample, not a permanent truth.', 'Citation evidence depends on the selected query portfolio, market settings, SerpAPI availability, crawl success and source accessibility.', 'Recommendations are implementation briefs and should still be validated by product, legal, SEO and brand teams before publishing.'] }
];

export function MethodologyAppendix({ report }: { report: ReportBundle }) {
  const hygiene = report.aiHygiene;
  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle eyebrow="Appendix" title="Methodology and product guide">
          A compact guide to interpret the report, scoring logic, evidence flow and recommendation outputs for executive and operator users.
        </SectionTitle>
      </Card>
      {hygiene && (
        <Card className="border-slate-200 bg-white">
          <SectionTitle eyebrow="Current run hygiene snapshot" title="AI discoverability controls" />
          <div className="grid gap-3 md:grid-cols-4 text-sm">
            <Badge label="Robots.txt" value={hygiene.robots_txt?.status || 'not supplied'} />
            <Badge label="LLMs.txt" value={hygiene.llms_txt?.status || 'not supplied'} />
            <Badge label="JSON-LD/schema" value={`${hygiene.structured_data?.pages_with_json_ld ?? 0}/${hygiene.structured_data?.owned_pages_total ?? 0} pages`} />
            <Badge label="Priority" value={hygiene.priority || 'not supplied'} />
          </div>
          {hygiene.summary && <p className="mt-3 text-sm leading-6 text-slate-700">{hygiene.summary}</p>}
        </Card>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        {sections.map((section) => (
          <Card key={section.title}>
            <SectionTitle title={section.title} />
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
              {section.items.map((item) => <li key={item} className="rounded-xl bg-slate-50 p-3">{item}</li>)}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Badge({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 font-semibold text-slate-900">{value}</p></div>;
}
