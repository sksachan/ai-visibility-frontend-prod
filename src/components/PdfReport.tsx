/**
 * Story-led PDF report.
 *
 * This component is intentionally separate from the dashboard UI. It uses
 * fixed A4-like pages, plain hex colors, simple tables and no charts so
 * html2canvas/jsPDF can export it reliably.
 */
import type { ReactNode } from 'react';
import type { ActionItem, OwnedPage, QueryWorkbenchItem, ReportBundle } from '../types/report';

const PAGE_W = 794;
const PAGE_H = 1123;

const C = {
  ink: '#111827',
  muted: '#6b7280',
  soft: '#f8fafc',
  line: '#e5e7eb',
  blue: '#2563eb',
  navy: '#0f172a',
  green: '#047857',
  amber: '#b45309',
  red: '#b91c1c',
  purple: '#6d28d9',
};

const S = {
  page: {
    width: PAGE_W,
    minHeight: PAGE_H,
    padding: '42px 48px',
    boxSizing: 'border-box' as const,
    background: '#ffffff',
    color: C.ink,
    fontFamily: 'Inter, Arial, Helvetica, sans-serif',
    fontSize: 12,
    lineHeight: 1.45,
    pageBreakAfter: 'always' as const,
  },
  eyebrow: { color: C.blue, fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase' as const },
  h1: { color: C.navy, fontSize: 28, lineHeight: 1.12, margin: '10px 0 12px', fontWeight: 800 },
  h2: { color: C.navy, fontSize: 20, lineHeight: 1.2, margin: '8px 0 10px', fontWeight: 800 },
  h3: { color: C.navy, fontSize: 14, margin: '0 0 5px', fontWeight: 800 },
  body: { color: '#334155', fontSize: 12, lineHeight: 1.55 },
  small: { color: C.muted, fontSize: 10, lineHeight: 1.4 },
  card: { border: `1px solid ${C.line}`, borderRadius: 10, background: C.soft, padding: 14 },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 10.5 },
  th: { textAlign: 'left' as const, color: C.muted, fontSize: 9, textTransform: 'uppercase' as const, letterSpacing: '0.08em', padding: '7px 8px', borderBottom: `1px solid ${C.line}` },
  td: { verticalAlign: 'top' as const, padding: '8px', borderBottom: `1px solid ${C.line}`, color: '#334155' },
};

function text(value: unknown, fallback = ''): string {
  const out = String(value ?? '').trim();
  return out || fallback;
}

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function label(value: unknown): string {
  return text(value, 'Not supplied').replaceAll('_', ' ');
}

function scoreTone(score: number | null | undefined, max = 100): 'green' | 'amber' | 'red' | 'gray' {
  if (score == null || !Number.isFinite(score)) return 'gray';
  const pct = max ? score / max : score / 100;
  if (pct >= 0.67) return 'green';
  if (pct >= 0.38) return 'amber';
  return 'red';
}

function toneColor(tone: 'green' | 'amber' | 'red' | 'gray') {
  return tone === 'green' ? C.green : tone === 'amber' ? C.amber : tone === 'red' ? C.red : C.muted;
}

function Pill({ children, tone = 'gray' }: { children: ReactNode; tone?: 'green' | 'amber' | 'red' | 'gray' }) {
  const color = toneColor(tone);
  return (
    <span style={{ display: 'inline-block', border: `1px solid ${color}`, background: '#ffffff', color, borderRadius: 999, padding: '2px 8px', fontSize: 10, fontWeight: 800 }}>
      {children}
    </span>
  );
}

function SectionTitle({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={S.eyebrow}>{eyebrow}</div>
      <h2 style={S.h2}>{title}</h2>
      {children ? <div style={S.body}>{children}</div> : null}
    </div>
  );
}

function Metric({ label: metricLabel, value, note, tone = 'gray' }: { label: string; value: string; note?: string; tone?: 'green' | 'amber' | 'red' | 'gray' }) {
  return (
    <div style={{ ...S.card, background: '#ffffff', minHeight: 68 }}>
      <div style={{ ...S.eyebrow, color: C.muted, fontSize: 8 }}>{metricLabel}</div>
      <div style={{ color: toneColor(tone), fontSize: 22, lineHeight: 1.1, fontWeight: 900, marginTop: 5 }}>{value}</div>
      {note ? <div style={{ ...S.small, marginTop: 3 }}>{note}</div> : null}
    </div>
  );
}

function Page({ number, children }: { number: number; children: ReactNode }) {
  return (
    <section className="pdf-page" style={S.page}>
      <div style={{ minHeight: PAGE_H - 110, display: 'flex', flexDirection: 'column' }}>
        {children}
        <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: `1px solid ${C.line}`, display: 'flex', justifyContent: 'space-between', ...S.small }}>
          <span>AI Brand Visibility Intelligence</span>
          <span>{number}</span>
        </div>
      </div>
    </section>
  );
}

function queryRows(report: ReportBundle): QueryWorkbenchItem[] {
  if (Array.isArray(report.queryWorkbench) && report.queryWorkbench.length) return report.queryWorkbench;
  return report.queries.map((q) => ({
    query_id: q.id,
    query: q.query,
    journey_category: q.journey,
    current_ai_visibility: {
      score: q.aiVisibilityScore ?? q.citationLikelihood ?? 0,
      status: q.visibilityStatus,
      owned_target_cited: q.ownedTargetPageCited,
      owned_domain_cited: q.ownedDomainCited ?? false,
      competitors: q.competitorBrands ?? [],
      top_citations: q.citations ?? [],
    },
    winning_patterns: q.gapReasons.map((reason) => ({ pattern_type: reason })),
  }));
}

function queryScore(q: QueryWorkbenchItem): number {
  return num(q.current_ai_visibility?.score, 0);
}

function queryStatus(q: QueryWorkbenchItem): string {
  return label(q.current_ai_visibility?.status || (q.current_ai_visibility?.owned_target_cited ? 'owned cited' : 'external led'));
}

function journey(q: QueryWorkbenchItem): string {
  return text(q.journey_category, 'Unclassified');
}

function statusTone(status: string): 'green' | 'amber' | 'red' | 'gray' {
  const s = status.toLowerCase();
  if (s.includes('owned')) return 'green';
  if (s.includes('competitor')) return 'red';
  if (s.includes('external')) return 'amber';
  return 'gray';
}

function sourceTypeCounts(report: ReportBundle) {
  const counts = report.sourceLandscape?.sourceTypeCounts ?? [];
  if (counts.length) return counts;
  const map = new Map<string, number>();
  for (const q of queryRows(report)) {
    for (const c of [...(q.current_ai_visibility?.top_citations ?? []), ...(q.external_top3_benchmark ?? [])]) {
      const key = c.sourceType || 'other';
      map.set(key, (map.get(key) ?? 0) + 1);
    }
  }
  return Array.from(map.entries()).map(([sourceType, count]) => ({ sourceType, count })).sort((a, b) => b.count - a.count);
}

function avg(values: number[]) {
  const clean = values.filter((v) => Number.isFinite(v));
  return clean.length ? clean.reduce((a, b) => a + b, 0) / clean.length : 0;
}

function dimensionRows(owned: OwnedPage[]) {
  return [
    { name: 'Content clarity', score: avg(owned.map((p) => p.clarity)), meaning: 'Direct answer is easy for AI systems to extract.' },
    { name: 'Semantic depth', score: avg(owned.map((p) => p.semanticDepth)), meaning: 'Page covers buyer scenarios, caveats and comparisons.' },
    { name: 'Structured data', score: avg(owned.map((p) => p.structure)), meaning: 'Schema and machine-readable context support retrieval.' },
    { name: 'E-E-A-T signals', score: avg(owned.map((p) => p.evidence)), meaning: 'Facts, proof, authority and validation are visible.' },
    { name: 'Freshness', score: avg(owned.map((p) => p.freshness)), meaning: 'Dates, updates and current facts are explicit.' },
    { name: 'FAQ readiness', score: avg(owned.map((p) => p.faqReadiness ?? 0)), meaning: 'Query-shaped Q&A blocks answer likely AI prompts.' },
  ];
}

function topContentPages(report: ReportBundle) {
  return [...report.ownedPages]
    .sort((a, b) => (a.geoScore - b.geoScore) || ((b.relatedQueries?.length ?? 0) - (a.relatedQueries?.length ?? 0)))
    .slice(0, 5);
}

function topCms(report: ReportBundle) {
  return [...report.cmsModules].sort((a, b) => (b.valueScore ?? 0) - (a.valueScore ?? 0)).slice(0, 5);
}

function topPr(report: ReportBundle) {
  return [...report.prOpportunities].sort((a, b) => (b.valueScore ?? 0) - (a.valueScore ?? 0)).slice(0, 3);
}

function topicQueries(report: ReportBundle, topic: string) {
  return queryRows(report)
    .filter((q) => journey(q) === topic)
    .sort((a, b) => queryScore(a) - queryScore(b))
    .slice(0, 3);
}

function Bar({ value, max = 100, color = C.blue }: { value: number; max?: number; color?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div style={{ height: 7, borderRadius: 99, background: '#e5e7eb', overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color }} />
    </div>
  );
}

export function PdfReport({ report }: { report: ReportBundle }) {
  const hm = report.executive.headlineMetrics;
  const queries = queryRows(report);
  const score = num(hm.brandScore, 0);
  const geo = num(hm.averageOwnedGeoScore120, avg(report.ownedPages.map((p) => p.geoScore)));
  const scorecard = report.executive.brandTopicScorecard ?? [];
  const sources = sourceTypeCounts(report);
  const ownedTarget = num(hm.ownedTargetCitations, 0);
  const externalLed = num(hm.externalLedQueries, 0);
  const competitorLed = num(hm.competitorLedQueries, 0);
  const topDomains = report.sourceLandscape?.observedNonOwnedDomains?.slice(0, 8) ?? [];
  const aiTone = scoreTone(score, 100);
  const geoTone = scoreTone(geo, 120);

  return (
    <div style={{ width: PAGE_W, background: '#ffffff' }}>
      <Page number={1}>
        <div style={S.eyebrow}>AI Brand Visibility Intelligence</div>
        <h1 style={S.h1}>{report.brand} / {report.market} - AEO/GEO Opportunity Report</h1>
        <p style={{ ...S.body, fontSize: 14, maxWidth: 650 }}>
          This report summarises how {report.brand} appears in AI-answer scenarios, how ready owned pages are for AI citation, and which content and PR actions can improve visibility over time.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 20 }}>
          <Metric label="AI visibility" value={`${score.toFixed(1)}/100`} note={aiTone === 'red' ? 'Weak baseline' : aiTone === 'amber' ? 'Moderate baseline' : 'Strong baseline'} tone={aiTone} />
          <Metric label="Avg GEO" value={`${geo.toFixed(1)}/120`} note="Owned-page readiness" tone={geoTone} />
          <Metric label="AI answers" value={String(hm.queryCount ?? queries.length)} note="Reviewed scenarios" />
          <Metric label="Owned pages" value={String(hm.ownedPageCount ?? report.ownedPages.length)} note="Audited/crawled" />
          <Metric label="Owned target citations" value={String(ownedTarget)} note={ownedTarget ? 'Defend and expand' : 'Critical gap'} tone={ownedTarget ? 'green' : 'red'} />
          <Metric label="Competitor-led" value={String(competitorLed)} note="Displacement risk" tone={competitorLed ? 'red' : 'green'} />
          <Metric label="External-led" value={String(externalLed)} note="Citation dependency" tone={externalLed ? 'amber' : 'green'} />
          <Metric label="Recommendations" value={`${report.cmsModules.length + report.prOpportunities.length}`} note="CMS + PR actions" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 14, marginTop: 18 }}>
          <div style={S.card}>
            <h3 style={S.h3}>Executive reading</h3>
            <p style={S.body}>{report.executive.summary || `${report.brand} has a measurable AI visibility baseline, but the opportunity is to increase owned citations, improve GEO readiness and build external proof assets.`}</p>
            <p style={{ ...S.body, marginTop: 8 }}>The goal is not a one-off score. It is a monthly optimisation programme using a validated Brand Topic and query portfolio to track movement in visibility, citation quality and content readiness.</p>
          </div>
          <div style={S.card}>
            <h3 style={S.h3}>What was reviewed</h3>
            <ul style={{ ...S.body, margin: '8px 0 0 18px', padding: 0 }}>
              <li>AI-generated brand topics and queries for an illustrative audit baseline.</li>
              <li>AI answer citations, source domains, competitor mentions and source types.</li>
              <li>Owned URLs scored for clarity, depth, schema, proof, freshness and FAQ readiness.</li>
              <li>Robots.txt, LLMs.txt and JSON-LD/schema presence where available.</li>
            </ul>
          </div>
        </div>
        <div style={{ ...S.card, marginTop: 14, borderColor: '#bfdbfe', background: '#eff6ff' }}>
          <h3 style={S.h3}>Important caveat</h3>
          <p style={S.body}>The Brand Topics and query portfolio used here are AI-generated for illustrative audit purposes. A production programme should validate topics and queries with Brand, Content, SEO and Product teams before tracking monthly trend movement.</p>
        </div>
      </Page>

      <Page number={2}>
        <SectionTitle eyebrow="How to interpret the scores" title="What good looks like">
          Scores are directional decision aids. They are most useful when tracked consistently over time against the same approved query portfolio.
        </SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={S.card}>
            <h3 style={S.h3}>AI Visibility Score /100</h3>
            <p style={S.body}>Measures how strongly the brand shapes AI-generated answers across the reviewed queries.</p>
            <Scale rows={[
              ['0-30', 'Weak', 'Brand is rarely shaping AI answers.'],
              ['31-60', 'Moderate', 'Brand appears, but citation control is limited.'],
              ['61-80', 'Strong', 'Brand is present and supported by credible evidence.'],
              ['81-100', 'Leading', 'Brand is consistently cited, trusted and well represented.'],
            ]} />
          </div>
          <div style={S.card}>
            <h3 style={S.h3}>GEO Readiness Score /120</h3>
            <p style={S.body}>Measures how ready owned pages are to be retrieved, understood and cited by AI-answer engines.</p>
            <Scale rows={[
              ['0-40', 'Weak', 'Page is unlikely to be used reliably by AI systems.'],
              ['41-80', 'Developing', 'Useful content exists but needs answer structure and proof.'],
              ['81-100', 'Good', 'Page is increasingly citation-ready.'],
              ['101-120', 'Excellent', 'Strong answer-first page with schema, proof and FAQs.'],
            ]} />
          </div>
        </div>
        <div style={{ ...S.card, marginTop: 14 }}>
          <h3 style={S.h3}>Signal hierarchy</h3>
          <table style={S.table}>
            <tbody>
              {[
                ['Owned target citation', 'Best signal: AI engines cite the intended owned page for the query.'],
                ['Owned domain citation', 'Useful signal: the brand domain appears, but not necessarily the target page.'],
                ['External-led citation', 'AI engines rely on third-party sources; PR and proof assets matter.'],
                ['Competitor-led citation', 'Competitor brands or sources shape the answer; displacement work is needed.'],
                ['GEO readiness', 'Page-level ability to supply clear, structured and verifiable answers.'],
              ].map(([k, v]) => (
                <tr key={k}><td style={{ ...S.td, width: 170, fontWeight: 800, color: C.navy }}>{k}</td><td style={S.td}>{v}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Page>

      <Page number={3}>
        <SectionTitle eyebrow="1. AI Citation Research" title="Where AI answers are being won and lost">
          This section links topic-level performance to representative AI-answer queries and the source patterns currently shaping responses.
        </SectionTitle>
        <table style={S.table}>
          <thead><tr><th style={S.th}>Brand topic</th><th style={S.th}>Score</th><th style={S.th}>Position</th><th style={S.th}>Interpretation</th></tr></thead>
          <tbody>
            {scorecard.slice(0, 6).map((row) => (
              <tr key={row.topic}>
                <td style={{ ...S.td, width: 170, fontWeight: 800, color: C.navy }}>{row.topic}<br /><span style={S.small}>{row.queryCount ?? topicQueries(report, row.topic).length} queries</span></td>
                <td style={S.td}><Pill tone={scoreTone(row.aiVisibilityScore)}>{row.aiVisibilityScore == null ? 'N/A' : `${Math.round(row.aiVisibilityScore)}/100`}</Pill></td>
                <td style={{ ...S.td, width: 190 }}>{row.relativePosition}</td>
                <td style={S.td}>{row.comment}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ ...S.card, marginTop: 14 }}>
          <h3 style={S.h3}>Topic-level takeaway</h3>
          <p style={S.body}>The core issue is usually not pure brand absence. It is whether AI engines can find extractable owned answers and corroborating third-party proof at the exact moment a buyer asks a practical question.</p>
        </div>
      </Page>

      <Page number={4}>
        <SectionTitle eyebrow="1A. Query Evidence Detail" title="Representative queries reveal the action required">
          Low-score and external-led queries are the fastest way to identify content and PR work that can move future AI answers.
        </SectionTitle>
        <table style={S.table}>
          <thead><tr><th style={S.th}>ID</th><th style={S.th}>Representative query</th><th style={S.th}>Pattern</th><th style={S.th}>Score</th><th style={S.th}>Next action</th></tr></thead>
          <tbody>
            {[...queries].sort((a, b) => queryScore(a) - queryScore(b)).slice(0, 8).map((q) => {
              const status = queryStatus(q);
              const firstPattern = q.winning_patterns?.[0];
              const action = firstPattern?.owned_content_implication || firstPattern?.pr_implication || 'Add a direct answer, supporting facts and source-ready proof for this query.';
              return (
                <tr key={q.query_id}>
                  <td style={{ ...S.td, fontWeight: 800 }}>{q.query_id}</td>
                  <td style={{ ...S.td, width: 260 }}>{q.query}</td>
                  <td style={S.td}><Pill tone={statusTone(status)}>{status}</Pill></td>
                  <td style={S.td}>{Math.round(queryScore(q))}/100</td>
                  <td style={S.td}>{action}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p style={{ ...S.small, marginTop: 10 }}>Use the online Query Workbench for the full query portfolio and citation-level evidence.</p>
      </Page>

      <Page number={5}>
        <SectionTitle eyebrow="2. Owned Content and GEO Readiness" title="Owned pages need answer-first modules, not only SEO copy">
          GEO readiness indicates whether owned content can be understood, trusted and cited by AI answer engines.
        </SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {dimensionRows(report.ownedPages).map((d) => (
            <div key={d.name} style={S.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <h3 style={S.h3}>{d.name}</h3>
                <Pill tone={scoreTone(d.score, 20)}>{d.score.toFixed(1)}/20</Pill>
              </div>
              <Bar value={d.score} max={20} color={toneColor(scoreTone(d.score, 20))} />
              <p style={{ ...S.small, marginTop: 7 }}>{d.meaning}</p>
            </div>
          ))}
        </div>
        <div style={{ ...S.card, marginTop: 14 }}>
          <h3 style={S.h3}>What good looks like</h3>
          <p style={S.body}>A strong GEO page gives a concise answer near the top, supports it with verified facts, uses schema/JSON-LD to expose meaning, answers follow-up questions and shows clear recency or authority signals.</p>
        </div>
      </Page>

      <Page number={6}>
        <SectionTitle eyebrow="2A. Content Opportunities" title="Highest-value owned page fixes">
          Prioritise pages where weak GEO dimensions overlap with multiple linked queries or commercial intent.
        </SectionTitle>
        <table style={S.table}>
          <thead><tr><th style={S.th}>Page</th><th style={S.th}>GEO</th><th style={S.th}>Priority gaps</th><th style={S.th}>Recommended module</th></tr></thead>
          <tbody>
            {topContentPages(report).map((page) => {
              const rec = topCms(report).find((item) => item.targetUrl === page.url);
              const gaps = page.diagnostics?.length ? page.diagnostics.slice(0, 2).join('; ') : page.scoreBand || 'Improve answer extractability';
              return (
                <tr key={page.url}>
                  <td style={{ ...S.td, width: 240, fontWeight: 800, color: C.navy }}>{page.title || page.url}<br /><span style={{ ...S.small, wordBreak: 'break-all' }}>{page.url}</span></td>
                  <td style={S.td}><Pill tone={scoreTone(page.geoScore, 120)}>{Math.round(page.geoScore)}/120</Pill></td>
                  <td style={S.td}>{gaps}</td>
                  <td style={S.td}>{rec?.title || rec?.moduleType || 'Answer summary + FAQ + structured facts'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Page>

      <Page number={7}>
        <SectionTitle eyebrow="3. External Citation and PR Strategy" title="External proof is the missing layer in the visibility system">
          AI answer engines rely on third-party corroboration. Owned content improvements should be paired with external proof assets that publishers and AI systems can reference.
        </SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {sources.slice(0, 4).map((source) => <Metric key={source.sourceType} label={label(source.sourceType)} value={String(source.count)} note="Observed citations" />)}
        </div>
        <div style={{ ...S.card, marginTop: 14 }}>
          <h3 style={S.h3}>Citation landscape insight</h3>
          <p style={S.body}>If AI engines repeatedly choose external domains, the brand needs more than page copy. It needs source-ready evidence, proof points and publication angles that credible third parties can cite.</p>
          {topDomains.length ? <p style={{ ...S.small, marginTop: 8 }}>Observed domains: {topDomains.map((d) => d.domain).join(', ')}</p> : null}
        </div>
        <table style={{ ...S.table, marginTop: 12 }}>
          <thead><tr><th style={S.th}>Priority</th><th style={S.th}>PR strategy</th><th style={S.th}>Asset to create</th><th style={S.th}>Success measure</th></tr></thead>
          <tbody>
            {topPr(report).map((rec, index) => {
              const pack = rec.advancedPrAssetPack;
              return (
                <tr key={`${rec.title}-${index}`}>
                  <td style={{ ...S.td, fontWeight: 900 }}>{index + 1}</td>
                  <td style={{ ...S.td, fontWeight: 800, color: C.navy }}>{pack?.recommended_pr_action || rec.title}</td>
                  <td style={S.td}>{pack?.asset_concept || pack?.asset_objective || rec.recommendation}</td>
                  <td style={S.td}>{pack?.measurement_plan?.[0] || `${rec.queryCoverageCount ?? 0} linked queries improve citation quality.`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Page>

      <Page number={8}>
        <SectionTitle eyebrow="4. High-value Action Roadmap" title="A sequenced operating plan">
          This turns the audit into a recurring optimisation programme for Brand, Content, SEO and PR teams.
        </SectionTitle>
        <table style={S.table}>
          <thead><tr><th style={S.th}>Timeframe</th><th style={S.th}>Decision / action</th><th style={S.th}>Owner</th><th style={S.th}>Expected outcome</th></tr></thead>
          <tbody>
            {roadmap(report).map((row) => (
              <tr key={row.timeframe + row.action}>
                <td style={{ ...S.td, width: 80, fontWeight: 900, color: C.blue }}>{row.timeframe}</td>
                <td style={{ ...S.td, fontWeight: 800, color: C.navy }}>{row.action}</td>
                <td style={S.td}>{row.owner}</td>
                <td style={S.td}>{row.outcome}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ ...S.card, marginTop: 14 }}>
          <h3 style={S.h3}>Recommended cadence</h3>
          <p style={S.body}>Run the audit monthly against a validated query portfolio. Use the same Brand Topics and queries to measure progress in owned citation share, AI visibility, sentiment, GEO readiness and external proof coverage.</p>
        </div>
        {report.actionChecklist.length ? (
          <div style={{ ...S.card, marginTop: 14 }}>
            <h3 style={S.h3}>Immediate checklist highlights</h3>
            <ul style={{ ...S.body, margin: '8px 0 0 18px', padding: 0 }}>
              {report.actionChecklist.slice(0, 5).map((item: ActionItem, i) => <li key={`${item.action}-${i}`}>{item.action} ({item.owner}, {item.priority})</li>)}
            </ul>
          </div>
        ) : null}
      </Page>
    </div>
  );
}

function Scale({ rows }: { rows: Array<[string, string, string]> }) {
  return (
    <table style={{ ...S.table, marginTop: 10 }}>
      <tbody>
        {rows.map(([range, band, meaning]) => (
          <tr key={range}>
            <td style={{ ...S.td, width: 58, fontWeight: 900, color: C.navy }}>{range}</td>
            <td style={{ ...S.td, width: 78, fontWeight: 800 }}>{band}</td>
            <td style={S.td}>{meaning}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function roadmap(report: ReportBundle) {
  const topPage = topContentPages(report)[0];
  const topPrRec = topPr(report)[0];
  return [
    { timeframe: '0-30 days', action: 'Validate Brand Topic and Query Portfolio', owner: 'Brand, SEO, Content', outcome: 'Stable measurement baseline for monthly tracking.' },
    { timeframe: '0-30 days', action: topPage ? `Improve priority owned page: ${topPage.title || topPage.url}` : 'Improve top owned pages', owner: 'CMS, Product Content', outcome: 'Higher GEO readiness and answer extractability.' },
    { timeframe: '31-60 days', action: topPrRec?.advancedPrAssetPack?.recommended_pr_action || topPrRec?.title || 'Create one external proof asset', owner: 'PR, Communications', outcome: 'More trusted third-party corroboration.' },
    { timeframe: '31-60 days', action: 'Set measurement cadence', owner: 'Digital Analytics', outcome: 'Monthly dashboard comparing visibility, sentiment and GEO readiness.' },
    { timeframe: '61-90 days', action: 'Rerun and compare deltas', owner: 'AI Visibility Programme', outcome: 'Evidence-led backlog and programme governance.' },
  ];
}
