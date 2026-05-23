/**
 * PdfReport — Dedicated A4-safe print layout for PDF export.
 *
 * This component renders a light-background, fixed-width report
 * designed for html2canvas/jsPDF capture. It avoids:
 * - oklab, oklch, color-mix, Tailwind opacity color utilities
 * - SVG chart overflow, horizontally scrolling tables
 * - Scroll containers, sticky rails, offscreen overflow
 *
 * All colors use plain hex/rgb values safe for html2canvas.
 */
import type { ReportBundle } from '../types/report';

const S = {
  page: { width: 794, padding: 40, background: '#ffffff', color: '#1a1a1a', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 13, lineHeight: 1.6 } as const,
  h1: { fontSize: 22, fontWeight: 700, color: '#0a0a0a', marginBottom: 8, borderBottom: '2px solid #e5e7eb', paddingBottom: 8 } as const,
  h2: { fontSize: 16, fontWeight: 600, color: '#1a1a1a', marginTop: 24, marginBottom: 8 } as const,
  h3: { fontSize: 14, fontWeight: 600, color: '#374151', marginTop: 16, marginBottom: 6 } as const,
  meta: { fontSize: 11, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
  card: { border: '1px solid #e5e7eb', borderRadius: 6, padding: 16, marginBottom: 12, background: '#f9fafb' } as const,
  pill: (tone: 'green' | 'amber' | 'red' | 'gray') => ({
    display: 'inline-block', padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
    background: tone === 'green' ? '#d1fae5' : tone === 'amber' ? '#fef3c7' : tone === 'red' ? '#fee2e2' : '#f3f4f6',
    color: tone === 'green' ? '#065f46' : tone === 'amber' ? '#92400e' : tone === 'red' ? '#991b1b' : '#4b5563',
  }),
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 11 },
  th: { textAlign: 'left' as const, padding: '6px 8px', borderBottom: '2px solid #d1d5db', fontSize: 10, color: '#6b7280', textTransform: 'uppercase' as const },
  td: { padding: '6px 8px', borderBottom: '1px solid #e5e7eb', verticalAlign: 'top' as const },
  pageBreak: { pageBreakBefore: 'always' as const, marginTop: 32 },
};

function scoreTone(score: number | null): 'green' | 'amber' | 'red' | 'gray' {
  if (score === null || !Number.isFinite(score)) return 'gray';
  if (score >= 70) return 'green';
  if (score >= 45) return 'amber';
  return 'red';
}

export function PdfReport({ report }: { report: ReportBundle }) {
  const exec = report.executive;
  const hm = exec.headlineMetrics;
  const scorecard = exec.brandTopicScorecard ?? [];
  const queries = report.queryWorkbench ?? report.queries ?? [];
  const owned = report.ownedPages ?? [];
  const cms = report.cmsModules ?? [];
  const pr = report.prOpportunities ?? [];
  const actions = report.actionChecklist ?? [];

  return (
    <div style={{ ...S.page, width: S.page.width, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <p style={S.meta}>AI Brand Visibility Intelligence</p>
        <h1 style={S.h1}>{report.brand} / {report.market} — AEO/GEO Audit Report</h1>
        <p style={{ fontSize: 11, color: '#6b7280' }}>Run: {report.runId} · Generated: {report.generatedAt || report.evidenceDate}</p>
      </div>

      {/* Executive Summary */}
      <div style={S.card}>
        <h2 style={{ ...S.h2, marginTop: 0 }}>Executive Summary</h2>
        <p style={{ fontSize: 13, color: '#374151' }}>{exec.summary}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 16 }}>
          <MetricBox label="AI Visibility" value={`${hm.brandScore.toFixed(1)}/100`} />
          <MetricBox label="Queries" value={String(hm.queryCount ?? queries.length)} />
          <MetricBox label="Owned Pages" value={String(hm.ownedPageCount ?? owned.length)} />
          <MetricBox label="Owned Target Citations" value={String(hm.ownedTargetCitations)} />
          <MetricBox label="Competitor-Led" value={String(hm.competitorLedQueries)} />
          <MetricBox label="External-Led" value={String(hm.externalLedQueries)} />
          <MetricBox label="Avg GEO Score" value={`${(hm.averageOwnedGeoScore120 ?? 0).toFixed(1)}/120`} />
          <MetricBox label="CMS Modules" value={String(cms.length)} />
          <MetricBox label="PR Opportunities" value={String(pr.length)} />
        </div>
      </div>

      {/* Brand Topic Scorecard */}
      {scorecard.length > 0 && (
        <div style={S.pageBreak}>
          <h2 style={S.h2}>Brand Topic Scorecard</h2>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Topic</th>
                <th style={S.th}>Score</th>
                <th style={S.th}>Relative Position</th>
                <th style={S.th}>Comment</th>
              </tr>
            </thead>
            <tbody>
              {scorecard.map((row) => (
                <tr key={row.topic}>
                  <td style={{ ...S.td, fontWeight: 600 }}>{row.topic}<br /><span style={{ fontSize: 10, color: '#9ca3af' }}>{row.queryCount ?? 0} queries</span></td>
                  <td style={S.td}><span style={S.pill(scoreTone(row.aiVisibilityScore))}>{row.aiVisibilityScore !== null ? Math.round(row.aiVisibilityScore) : 'N/A'}</span></td>
                  <td style={{ ...S.td, maxWidth: 200 }}>{row.relativePosition}</td>
                  <td style={{ ...S.td, maxWidth: 250, fontSize: 11 }}>{row.comment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Query Summary */}
      <div style={S.pageBreak}>
        <h2 style={S.h2}>Query Summary ({queries.length} queries)</h2>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Query</th>
              <th style={S.th}>Score</th>
              <th style={S.th}>Status</th>
              <th style={S.th}>Journey</th>
              <th style={S.th}>Competitors</th>
            </tr>
          </thead>
          <tbody>
            {(Array.isArray(queries) ? queries : []).slice(0, 50).map((q: unknown, i: number) => {
              const qr = q as Record<string, unknown>;
              const vis = (qr.current_ai_visibility || {}) as Record<string, unknown>;
              const qText = String(qr.query || '');
              const score = Number(vis.score ?? qr.aiVisibilityScore ?? 0);
              const status = String(vis.status || qr.visibilityStatus || 'N/A');
              const journey = String(qr.journey_category || qr.journey || '');
              const comps = (Array.isArray(vis.competitors) ? vis.competitors : []).join(', ');
              return (
                <tr key={String(qr.query_id || qr.id || i)}>
                  <td style={{ ...S.td, maxWidth: 250, fontSize: 11 }}>{qText}</td>
                  <td style={S.td}><span style={S.pill(scoreTone(score))}>{Math.round(score)}</span></td>
                  <td style={{ ...S.td, fontSize: 10 }}>{status.replace(/_/g, ' ')}</td>
                  <td style={{ ...S.td, fontSize: 10 }}>{journey}</td>
                  <td style={{ ...S.td, fontSize: 10 }}>{comps || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Owned URL Readiness */}
      <div style={S.pageBreak}>
        <h2 style={S.h2}>Owned URL Readiness ({owned.length} pages)</h2>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>URL</th>
              <th style={S.th}>GEO Score</th>
              <th style={S.th}>Clarity</th>
              <th style={S.th}>Depth</th>
              <th style={S.th}>Structured</th>
              <th style={S.th}>E-E-A-T</th>
              <th style={S.th}>Freshness</th>
              <th style={S.th}>FAQ</th>
            </tr>
          </thead>
          <tbody>
            {owned.slice(0, 30).map((page) => (
              <tr key={page.url}>
                <td style={{ ...S.td, maxWidth: 200, fontSize: 10, wordBreak: 'break-all' }}>{page.url}</td>
                <td style={S.td}><span style={S.pill(page.geoScore >= 80 ? 'green' : page.geoScore >= 50 ? 'amber' : 'red')}>{page.geoScore}/120</span></td>
                <td style={{ ...S.td, textAlign: 'center' }}>{page.clarity}</td>
                <td style={{ ...S.td, textAlign: 'center' }}>{page.semanticDepth}</td>
                <td style={{ ...S.td, textAlign: 'center' }}>{page.structure}</td>
                <td style={{ ...S.td, textAlign: 'center' }}>{page.evidence}</td>
                <td style={{ ...S.td, textAlign: 'center' }}>{page.freshness}</td>
                <td style={{ ...S.td, textAlign: 'center' }}>{page.faqReadiness ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CMS Recommendations */}
      <div style={S.pageBreak}>
        <h2 style={S.h2}>Content Insights ({cms.length} recommendations)</h2>
        {cms.slice(0, 15).map((rec, i) => (
          <div key={`cms-${i}`} style={{ ...S.card, pageBreakInside: 'avoid' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ ...S.h3, marginTop: 0 }}>{rec.title}</h3>
                {rec.targetUrl && <p style={{ fontSize: 10, color: '#6b7280', wordBreak: 'break-all' }}>{rec.targetUrl}</p>}
              </div>
              <span style={S.pill(rec.priority === 'High' ? 'red' : rec.priority === 'Medium' ? 'amber' : 'gray')}>{rec.priority}</span>
            </div>
            <p style={{ marginTop: 8, fontSize: 12, color: '#374151' }}>{rec.recommendation}</p>
            {rec.directAnswer && <p style={{ marginTop: 6, fontSize: 11, color: '#1e40af', fontStyle: 'italic' }}>Direct answer: {rec.directAnswer}</p>}
            {rec.queryCoverageCount ? <p style={{ marginTop: 4, fontSize: 10, color: '#6b7280' }}>{rec.queryCoverageCount} linked queries · Value score: {rec.valueScore ?? 'N/A'}</p> : null}
          </div>
        ))}
      </div>

      {/* PR Recommendations */}
      <div style={S.pageBreak}>
        <h2 style={S.h2}>PR & Brand Insights ({pr.length} opportunities)</h2>
        {pr.slice(0, 10).map((rec, i) => (
          <div key={`pr-${i}`} style={{ ...S.card, pageBreakInside: 'avoid' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h3 style={{ ...S.h3, marginTop: 0 }}>{rec.title}</h3>
              <span style={S.pill(rec.priority === 'High' ? 'red' : 'amber')}>{rec.priority}</span>
            </div>
            <p style={{ marginTop: 8, fontSize: 12, color: '#374151' }}>{rec.recommendation}</p>
            {rec.queryCoverageCount ? <p style={{ marginTop: 4, fontSize: 10, color: '#6b7280' }}>{rec.queryCoverageCount} linked queries</p> : null}
          </div>
        ))}
      </div>

      {/* Action Checklist */}
      <div style={S.pageBreak}>
        <h2 style={S.h2}>Action Checklist ({actions.length} actions)</h2>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Action</th>
              <th style={S.th}>Priority</th>
              <th style={S.th}>Owner</th>
              <th style={S.th}>Effort</th>
              <th style={S.th}>Queries</th>
            </tr>
          </thead>
          <tbody>
            {actions.slice(0, 30).map((item, i) => (
              <tr key={`action-${i}`}>
                <td style={{ ...S.td, maxWidth: 300, fontSize: 11 }}>{item.action}</td>
                <td style={S.td}><span style={S.pill(item.priority === 'High' ? 'red' : item.priority === 'Medium' ? 'amber' : 'gray')}>{item.priority}</span></td>
                <td style={{ ...S.td, fontSize: 10 }}>{item.owner}</td>
                <td style={{ ...S.td, fontSize: 10 }}>{item.effort}</td>
                <td style={{ ...S.td, fontSize: 10 }}>{item.queryCoverageCount ?? item.linkedQueryIds?.length ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Appendix / Methodology */}
      <div style={S.pageBreak}>
        <h2 style={S.h2}>Appendix — Methodology</h2>
        <div style={{ fontSize: 11, color: '#4b5563', lineHeight: 1.7 }}>
          <p><strong>AI Visibility Score (0-100):</strong> Measures how visible the brand is in AI-generated answers. Factors: owned page citation (50pts), GEO readiness (15pts), external citation evidence (15pts), competitor presence penalty (-20pts max), status adjustment.</p>
          <p style={{ marginTop: 8 }}><strong>GEO Readiness Score (0-120):</strong> Page-intrinsic score across 6 dimensions (20pts each): Content Clarity, Semantic Depth, Structured Data, E-E-A-T Signals, Freshness Index, FAQ Readiness.</p>
          <p style={{ marginTop: 8 }}><strong>Source Classification:</strong> Citations are classified as owned_brand_ecosystem, competitor_owned, publisher_review, authority_body, partner_infrastructure, forum_social_video, aggregator_marketplace, finance_or_insurance, or other.</p>
          <p style={{ marginTop: 8 }}><strong>CMS Recommendations:</strong> Aggregated at page level from query-level patterns. Prioritised by query coverage, evidence value, and GEO gap.</p>
          <p style={{ marginTop: 8 }}><strong>PR Opportunities:</strong> Grouped by external source pattern and query cluster. Not tied to owned URLs.</p>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 32, paddingTop: 12, borderTop: '1px solid #e5e7eb', fontSize: 10, color: '#9ca3af', textAlign: 'center' }}>
        AI Brand Visibility Intelligence — {report.brand} / {report.market} — {new Date().toLocaleDateString()}
      </div>
    </div>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 6, padding: '8px 14px', minWidth: 100 }}>
      <p style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      <p style={{ fontSize: 16, fontWeight: 700, color: '#0a0a0a', marginTop: 2 }}>{value}</p>
    </div>
  );
}
