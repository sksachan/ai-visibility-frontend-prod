import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import type { ReportBundle, CompetitorEntry } from '../types/report';
import { WorkspacePanel, SectionHeader, DarkButton } from './ui';

const palette = ['#54a2ff', '#935dff', '#00c758', '#ffea35', '#ff6568', '#9f9f9f', '#ff9f43', '#2ed573'];
const sourceTypeLabels: Record<string, string> = {
  competitor_owned_domain: 'Owned/Dealer',
  dealer_or_retailer: 'Dealer/Retailer',
  publisher_review: 'Publisher/Review',
  forum_social_video: 'Forum/Social',
  authority_body: 'Authority',
  partner_infrastructure: 'Partner/Infra',
  aggregator_marketplace: 'Aggregator',
  other_external: 'Other',
};

function stLabel(key: string): string {
  return sourceTypeLabels[key] || key.replaceAll('_', ' ');
}

type ViewMode = 'table' | 'chart';
type SortKey = 'ai_visibility_score' | 'queries_present' | 'citation_share_pct' | 'avg_citation_rank' | 'competitor';
type SortDir = 'asc' | 'desc';

export function CompetitorVisibilityMatrix({ report }: { report: ReportBundle }) {
  const matrix = report.competitorVisibilityMatrix;
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [sortKey, setSortKey] = useState<SortKey>('ai_visibility_score');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedCompetitor, setExpandedCompetitor] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const competitors = useMemo(() => {
    if (!matrix?.competitors?.length) return [];
    const sorted = [...matrix.competitors].sort((a, b) => {
      if (sortKey === 'competitor') {
        return sortDir === 'asc' ? a.competitor.localeCompare(b.competitor) : b.competitor.localeCompare(a.competitor);
      }
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return showAll ? sorted : sorted.slice(0, 5);
  }, [matrix, sortKey, sortDir, showAll]);

  const chartData = useMemo(() => {
    if (!matrix?.competitors?.length) return [];
    return matrix.competitors.slice(0, 8).map((c, i) => ({
      name: c.competitor,
      score: c.ai_visibility_score,
      fill: palette[i % palette.length],
    }));
  }, [matrix]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  function SortableHeader({ label, field }: { label: string; field: SortKey }) {
    const arrow = sortKey === field ? (sortDir === 'asc' ? '\u2191' : '\u2193') : '\u21D5';
    return (
      <button type="button" className="inline-flex items-center gap-1 font-semibold text-[var(--text-muted)]" onClick={() => toggleSort(field)}>
        {label} <span>{arrow}</span>
      </button>
    );
  }

  if (!matrix || !matrix.competitors?.length) {
    return (
      <WorkspacePanel>
        <SectionHeader
          eyebrow="Competitor visibility"
          title="Non-Branded Competitor Visibility Matrix"
        >
          No competitor visibility data available. Run an analysis with non-branded queries to generate the competitor matrix.
        </SectionHeader>
      </WorkspacePanel>
    );
  }

  return (
    <div className="space-y-5">
      <WorkspacePanel>
        <SectionHeader
          eyebrow={`Competitor visibility across ${matrix.brand}'s non-branded AI search universe`}
          title="Observed competitors appearing in Google AI Mode answers for the category questions the brand needs to win"
        >
          Based on {matrix.query_count_non_branded} non-branded queries out of {matrix.query_count_total} total audited queries.
          Competitors are detected from citation domains, titles, snippets, and AI answer text.
        </SectionHeader>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <DarkButton variant={viewMode === 'table' ? 'primary' : 'default'} onClick={() => setViewMode('table')}>Table view</DarkButton>
          <DarkButton variant={viewMode === 'chart' ? 'primary' : 'default'} onClick={() => setViewMode('chart')}>Chart view</DarkButton>
        </div>

        {viewMode === 'chart' && (
          <div className="mb-5 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
            <p className="mb-3 text-sm text-[var(--text-secondary)]">
              AI Visibility Score comparison across observed competitors (top 8)
            </p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="name" angle={-25} textAnchor="end" interval={0} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <YAxis domain={[0, 100]} label={{ value: 'AI Visibility Score', angle: -90, position: 'insideLeft', fill: 'var(--text-muted)' }} tick={{ fill: 'var(--text-secondary)' }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-3 text-sm shadow-lg">
                          <p className="font-semibold text-[var(--text-primary)]">{d.name}</p>
                          <p className="text-[var(--text-secondary)]">{d.score}/100</p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                    {chartData.map((d, i) => <Cell key={d.name} fill={palette[i % palette.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {viewMode === 'table' && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="px-3 py-3"><SortableHeader label="Competitor" field="competitor" /></th>
                  <th className="px-3 py-3"><SortableHeader label="AI Visibility" field="ai_visibility_score" /></th>
                  <th className="px-3 py-3"><SortableHeader label="Query Presence %" field="queries_present" /></th>
                  <th className="px-3 py-3"><SortableHeader label="Citation Share %" field="citation_share_pct" /></th>
                  <th className="px-3 py-3"><SortableHeader label="Avg Rank" field="avg_citation_rank" /></th>
                  <th className="px-3 py-3 typo-meta text-[var(--text-muted)]">Owned/Dealer %</th>
                  <th className="px-3 py-3 typo-meta text-[var(--text-muted)]">Publisher %</th>
                  <th className="px-3 py-3 typo-meta text-[var(--text-muted)]">Forum/Social %</th>
                  <th className="px-3 py-3 typo-meta text-[var(--text-muted)]">Top Domains</th>
                </tr>
              </thead>
              <tbody>
                {competitors.map((comp) => {
                  const st = comp.source_type_influence_pct || {};
                  const ownedDealerPct = (st.competitor_owned_domain || 0) + (st.dealer_or_retailer || 0);
                  const publisherPct = st.publisher_review || 0;
                  const forumPct = st.forum_social_video || 0;
                  const isExpanded = expandedCompetitor === comp.competitor;
                  return (
                    <>
                      <tr
                        key={comp.competitor}
                        className="align-top cursor-pointer hover:bg-[var(--bg-card-hover)] transition-colors"
                        onClick={() => setExpandedCompetitor(isExpanded ? null : comp.competitor)}
                      >
                        <td className="px-3 py-4 font-semibold text-[var(--text-primary)]">
                          {comp.competitor}
                          <span className="ml-1 text-xs text-[var(--text-muted)]">{isExpanded ? '\u25B2' : '\u25BC'}</span>
                        </td>
                        <td className="px-3 py-4">
                          <span className="font-semibold text-[var(--text-primary)]">{comp.ai_visibility_score}</span>
                          <span className="text-[var(--text-muted)]">/100</span>
                        </td>
                        <td className="px-3 py-4 text-[var(--text-secondary)]">{comp.query_presence_pct}%</td>
                        <td className="px-3 py-4 text-[var(--text-secondary)]">{comp.citation_share_pct}%</td>
                        <td className="px-3 py-4 text-[var(--text-secondary)]">{comp.avg_citation_rank || '\u2014'}</td>
                        <td className="px-3 py-4 text-[var(--text-secondary)]">{ownedDealerPct.toFixed(1)}%</td>
                        <td className="px-3 py-4 text-[var(--text-secondary)]">{publisherPct.toFixed(1)}%</td>
                        <td className="px-3 py-4 text-[var(--text-secondary)]">{forumPct.toFixed(1)}%</td>
                        <td className="px-3 py-4 text-xs text-[var(--text-muted)]">
                          {(comp.top_domains || []).slice(0, 3).map(d => d.domain).join(', ') || '\u2014'}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${comp.competitor}-detail`}>
                          <td colSpan={9} className="px-3 py-4 bg-[var(--bg-card)]">
                            <CompetitorDetail competitor={comp} />
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {matrix.competitors.length > 5 && (
          <div className="mt-3 flex justify-center">
            <DarkButton onClick={() => setShowAll(!showAll)}>
              {showAll ? 'Show top 5 only' : `Show all ${matrix.competitors.length} competitors`}
            </DarkButton>
          </div>
        )}
      </WorkspacePanel>
    </div>
  );
}

function CompetitorDetail({ competitor }: { competitor: CompetitorEntry }) {
  const st = competitor.source_type_influence_pct || {};
  return (
    <div className="space-y-4">
      {/* Interpretation */}
      <p className="text-sm text-[var(--text-secondary)] italic">{competitor.interpretation}</p>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Score components */}
        <div className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-3">
          <p className="typo-meta text-[var(--text-muted)] mb-2">Score Components</p>
          <div className="space-y-1.5 text-xs">
            {Object.entries(competitor.score_components || {}).map(([key, val]) => (
              <div key={key} className="flex justify-between">
                <span className="text-[var(--text-secondary)]">{key.replaceAll('_', ' ')}</span>
                <span className="font-semibold text-[var(--text-primary)]">{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Source type breakdown */}
        <div className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-3">
          <p className="typo-meta text-[var(--text-muted)] mb-2">Source Type Influence</p>
          <div className="space-y-1.5 text-xs">
            {Object.entries(st)
              .filter(([, v]) => v > 0)
              .sort(([, a], [, b]) => b - a)
              .map(([key, val]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">{stLabel(key)}</span>
                  <span className="font-semibold text-[var(--text-primary)]">{val}%</span>
                </div>
              ))}
          </div>
        </div>

        {/* Topic presence */}
        <div className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-3">
          <p className="typo-meta text-[var(--text-muted)] mb-2">Topic Presence</p>
          <div className="space-y-1.5 text-xs">
            {Object.entries(competitor.topic_presence || {})
              .sort(([, a], [, b]) => b - a)
              .slice(0, 6)
              .map(([topic, count]) => (
                <div key={topic} className="flex justify-between">
                  <span className="text-[var(--text-secondary)] truncate max-w-[180px]" title={topic}>{topic}</span>
                  <span className="font-semibold text-[var(--text-primary)]">{count}</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Top domains */}
      {(competitor.top_domains?.length ?? 0) > 0 && (
        <div className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-3">
          <p className="typo-meta text-[var(--text-muted)] mb-2">Top Driving Domains</p>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-left">
                  <th className="px-2 py-1 text-[var(--text-muted)]">Domain</th>
                  <th className="px-2 py-1 text-[var(--text-muted)]">Citations</th>
                  <th className="px-2 py-1 text-[var(--text-muted)]">Weighted Score</th>
                  <th className="px-2 py-1 text-[var(--text-muted)]">Source Type</th>
                </tr>
              </thead>
              <tbody>
                {competitor.top_domains.map((d) => (
                  <tr key={d.domain}>
                    <td className="px-2 py-1 font-medium text-[var(--text-primary)]">{d.domain}</td>
                    <td className="px-2 py-1 text-[var(--text-secondary)]">{d.citation_count}</td>
                    <td className="px-2 py-1 text-[var(--text-secondary)]">{d.weighted_citation_score}</td>
                    <td className="px-2 py-1 text-[var(--text-muted)]">{stLabel(d.source_type)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top queries */}
      {(competitor.top_queries?.length ?? 0) > 0 && (
        <div className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-3">
          <p className="typo-meta text-[var(--text-muted)] mb-2">Top Queries Where This Competitor Appears</p>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-left">
                  <th className="px-2 py-1 text-[var(--text-muted)]">Query</th>
                  <th className="px-2 py-1 text-[var(--text-muted)]">Topic</th>
                  <th className="px-2 py-1 text-[var(--text-muted)]">Citations</th>
                  <th className="px-2 py-1 text-[var(--text-muted)]">Best Rank</th>
                  <th className="px-2 py-1 text-[var(--text-muted)]">Source Types</th>
                </tr>
              </thead>
              <tbody>
                {competitor.top_queries.map((q) => (
                  <tr key={q.query_id}>
                    <td className="px-2 py-1 font-medium text-[var(--text-primary)] max-w-xs truncate" title={q.query}>{q.query}</td>
                    <td className="px-2 py-1 text-[var(--text-secondary)] max-w-[150px] truncate" title={q.topic}>{q.topic || '\u2014'}</td>
                    <td className="px-2 py-1 text-[var(--text-secondary)]">{q.citation_count}</td>
                    <td className="px-2 py-1 text-[var(--text-secondary)]">{q.best_citation_rank ?? '\u2014'}</td>
                    <td className="px-2 py-1 text-[var(--text-muted)]">{q.source_types.map(s => stLabel(s)).join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
