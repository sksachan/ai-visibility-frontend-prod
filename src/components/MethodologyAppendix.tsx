import { Card, SectionTitle } from './ui';

const sections = [
  {
    title: '1. How to use the report',
    summary: 'Use the report as an evidence-to-action workflow, not as a passive dashboard.',
    items: [
      ['Executive report', 'Start here to understand the headline AI visibility score, priority brand topics, AI discoverability hygiene and the highest-value workstreams. Use it for CMO and senior stakeholder readouts.'],
      ['Query workbench', 'Use this to validate each audited prompt. It shows query intent, journey stage, visibility status, competitors, citation domains, winning source types and mapped owned URLs.'],
      ['Visibility & sources', 'Use this to understand the citation landscape: which external domains are shaping AI answers, what source types are winning, and where owned pages are absent.'],
      ['Owned URLs', 'Use this to prioritise page-level GEO remediation. The table shows readiness scores, dimension scores, mapped query coverage and technical signals.'],
      ['CMS, PR and Action checklist', 'Use these tabs to convert diagnosis into implementation. CMS work is tied to owned pages; PR work is grouped by external source pattern; actions are consolidated by owner, effort and priority.']
    ]
  },
  {
    title: '2. Evidence and analysis flow',
    summary: 'The pipeline creates a traceable chain from brand topics to query evidence, crawl evidence and recommendations.',
    items: [
      ['Query portfolio', 'Queries can be supplied manually, reused from a stored portfolio, or generated synthetically through the Brand Topic Query Builder. The query portfolio defines the scope of the audit.'],
      ['Owned URL mapping', 'The Evidence Service reads sitemap inventory, maps the most relevant owned URLs to each query, and keeps the configured maximum owned URLs per query.'],
      ['AI citation evidence', 'SerpAPI Google AI Mode evidence can be freshly collected or reused from a previous evidence run. Reuse mode allows CMS and crawl testing without spending new SerpAPI calls.'],
      ['Crawling', 'Owned and external pages can be crawled independently. Successful crawl evidence includes title, canonical URL, metadata, schema types, extracted text, word count and markdown size.'],
      ['Auditor synthesis', 'The Auditor consumes the compact evidence bundle and produces query diagnostics, GEO scores, CMS modules, PR opportunities and an action checklist.']
    ]
  },
  {
    title: '3. AI Visibility scoring logic',
    summary: 'The AI Visibility score estimates how strongly the brand is represented in AI answers for the selected query set.',
    items: [
      ['Owned target-page citation', 'Highest value signal. It means the exact mapped owned page is cited or strongly represented in the AI answer.'],
      ['Owned-domain citation', 'Medium value signal. It means the brand domain is present, but not necessarily the intended page. This often indicates a need to improve target-page extractability.'],
      ['Competitor displacement', 'Penalty signal. If competitors are cited or mentioned more strongly, the query is treated as contested or competitor-led.'],
      ['External-source dependency', 'If answers rely on publishers, partners, forums or third-party authorities, the report flags this as a PR/source-coverage opportunity rather than only a CMS issue.'],
      ['Interpretation', 'Scores should be compared across repeat runs using the same query portfolio and evidence settings. They are not a universal market benchmark unless the query set is controlled.']
    ]
  },
  {
    title: '4. Owned-page GEO readiness scoring logic',
    summary: 'GEO readiness measures whether an owned page is likely to be extracted, cited or used by AI answer systems.',
    items: [
      ['Answer-first clarity', 'Rewards direct, query-addressing sections with clear headings and concise answer blocks. Generic product copy scores lower.'],
      ['Semantic depth', 'Rewards useful coverage of subtopics, comparisons, constraints, trade-offs, FAQs and decision criteria relevant to the mapped query.'],
      ['Evidence and E-E-A-T', 'Rewards proof points, dates, specifications, warranties, source-backed claims, authoritativeness and validation-ready copy.'],
      ['Structured data', 'Rewards JSON-LD/schema and machine-readable context, but does not over-score pages solely because schema exists.'],
      ['Freshness and FAQ readiness', 'Rewards visible recency cues, update dates, current policy/specification references and extractable question-answer blocks.']
    ]
  },
  {
    title: '5. AI discoverability hygiene',
    summary: 'These are site-level and page-level controls that help crawlers and AI retrieval systems understand, access and trust the site.',
    items: [
      ['Robots.txt', 'Indicates whether the site exposes crawler guidance and sitemap references. Missing robots.txt is treated as a high-priority technical hygiene gap.'],
      ['LLMs.txt', 'An emerging guidance convention for AI crawlers and agentic retrieval. It is not mandatory for all AI systems, but it is useful as a curated route to important brand, product and policy pages.'],
      ['JSON-LD/schema coverage', 'The report calculates how many audited owned pages contain structured-data signals. Low coverage creates a structured-data remediation action.'],
      ['Owned URL technical signals', 'The Owned URLs table shows per-page technical signals such as schema, canonical URL, meta description and crawl status.']
    ]
  },
  {
    title: '6. Recommendation logic and limitations',
    summary: 'Recommendations are implementation briefs that should be validated before publication.',
    items: [
      ['CMS recommendations', 'Generated when owned pages need answer blocks, comparison modules, FAQs, proof points or better page structure. These are content briefs, not automatically approved copy.'],
      ['PR recommendations', 'Generated when external publishers, authorities, partners or communities are shaping AI answers. PR actions are grouped by source pattern, not by owned URL.'],
      ['Confidence and freshness', 'AI answers are dynamic. A single run is an evidence sample. Use repeat runs with the same query portfolio to assess movement.'],
      ['Governance', 'Product, legal, SEO, content and brand teams should validate claims, regulated language, specifications and external-source dependencies before implementation.']
    ]
  }
];

export function MethodologyAppendix() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        {sections.map((section) => (
          <Card key={section.title}>
            <SectionTitle title={section.title}>{section.summary}</SectionTitle>
            <div className="mt-3 space-y-3">
              {section.items.map(([label, text]) => (
                <div key={label} className="rounded-xl bg-slate-50 p-3">
                  <p className="text-sm font-semibold text-slate-950">{label}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">{text}</p>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
