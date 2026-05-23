import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import type { OwnedPage, ReportBundle } from '../types/report';
import { WorkspacePanel, SectionHeader, DarkButton } from './ui';

const unique = (values: string[]) => Array.from(new Set(values.filter(Boolean))).sort();
type SortKey = keyof Pick<OwnedPage, 'url' | 'geoScore' | 'clarity' | 'semanticDepth' | 'structure' | 'evidence' | 'freshness' | 'faqReadiness'> | 'relatedQueries';
type SortState = { key: SortKey; direction: 'asc' | 'desc' };
type GraphMode = 'waterfall' | 'comparison';

const dimensionLabels: Record<string, string> = {
  clarity: 'Content Clarity',
  semanticDepth: 'Semantic Depth',
  structure: 'Structured Data',
  evidence: 'E-E-A-T Signals',
  freshness: 'Freshness Index',
  faqReadiness: 'FAQ Readiness',
};
const dimensionKeys = ['clarity', 'semanticDepth', 'structure', 'evidence', 'freshness', 'faqReadiness'] as const;
const dimPalette = ['#54a2ff', '#935dff', '#00c758', '#ffea35', '#ff6568', '#9f9f9f'];

export function QueryDiagnostics() {
  return <WorkspacePanel><SectionHeader eyebrow="Query diagnostics" title="Query diagnostics have moved into Query workbench">Open the Query workbench tab for query-level AI visibility, competitors, winning source types and leading citation domains.</SectionHeader></WorkspacePanel>;
}

export function OwnedUrlReadiness({ report, onOpenCms }: { report: ReportBundle; onOpenCms?: (url: string) => void }) {
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState('All scored owned URLs');
  const [sort, setSort] = useState<SortState>({ key: 'geoScore', direction: 'asc' });
  const [graphMode, setGraphMode] = useState<GraphMode>('waterfall');
  const [tablePage, setTablePage] = useState(0);
  const TABLE_PAGE_SIZE = 5;
  const cmsUrls = useMemo(() => new Set(report.cmsModules.map((item) => normaliseUrl(item.targetUrl)).filter(Boolean)), [report.cmsModules]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = report.ownedPages.filter((page) => {
      const matchesSearch = !term || [page.url, page.title, ...page.relatedQueries.map((q) => q.query), ...page.diagnostics].join(' ').toLowerCase().includes(term);
      const hasCms = cmsUrls.has(normaliseUrl(page.url));
      const isQueryMapped = page.queryMapped === true || hasCms;
      const matchesScope = scope === 'All scored owned URLs' || (scope === 'Mapped/CMS URLs' ? isQueryMapped : !isQueryMapped);
      return matchesSearch && matchesScope;
    });
    return [...rows].sort((a, b) => {
      const dir = sort.direction === 'asc' ? 1 : -1;
      const av = sort.key === 'relatedQueries' ? a.relatedQueries.length : a[sort.key] ?? 0;
      const bv = sort.key === 'relatedQueries' ? b.relatedQueries.length : b[sort.key] ?? 0;
      if (typeof av === 'string' || typeof bv === 'string') return String(av).localeCompare(String(bv)) * dir;
      return (Number(av) - Number(bv)) * dir;
    });
  }, [report.ownedPages, cmsUrls, search, scope, sort]);

  // Waterfall chart data: average of 6 dimensions across all pages
  const waterfallData = useMemo(() => {
    const pages = filtered.length ? filtered : report.ownedPages;
    if (!pages.length) return [];
    return dimensionKeys.map((key, i) => {
      const values = pages.map((p) => Number(p[key]) || 0);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      return {
        dimension: dimensionLabels[key],
        average: Math.round(avg * 10) / 10,
        max: 20,
        fill: dimPalette[i],
      };
    });
  }, [filtered, report.ownedPages]);

  // Radar chart data: avg of 6 dimensions by journey category (brand topics)
  const radarData = useMemo(() => {
    const pages = filtered.length ? filtered : report.ownedPages;
    // Group pages by journey category
    const topicMap: Record<string, { count: number; dims: Record<string, number> }> = {};
    pages.forEach((p) => {
      const topics = new Set<string>();
      p.relatedQueries.forEach(() => {
        topics.add(p.journeyCategory || 'Unclassified');
      });
      if (!topics.size) topics.add(p.journeyCategory || 'Unclassified');
      topics.forEach((topic) => {
        if (!topicMap[topic]) topicMap[topic] = { count: 0, dims: {} };
        topicMap[topic].count++;
        dimensionKeys.forEach((k) => {
          topicMap[topic].dims[k] = (topicMap[topic].dims[k] || 0) + (Number(p[k]) || 0);
        });
      });
    });

    // Get journey categories (exclude Unclassified)
    const journeys = Object.entries(topicMap)
      .filter(([t]) => t && t !== 'Unclassified')
      .slice(0, 8);

    if (!journeys.length) return { chartData: [] as Record<string, unknown>[], journeyNames: [] as string[] };

    // Build radar data: each row is a dimension, each journey is a line
    const chartData = dimensionKeys.map((key) => {
      const row: Record<string, unknown> = { dimension: dimensionLabels[key] };
      journeys.forEach(([topic, data]) => {
        row[topic] = Math.round((data.dims[key] / data.count) * 10) / 10;
      });
      return row;
    });

    return { chartData, journeyNames: journeys.map(([t]) => t) };
  }, [filtered, report.ownedPages]);

  function toggle(key: SortKey) {
    setSort((current) => current.key === key ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' });
    setTablePage(0);
  }

  const totalPages = Math.ceil(filtered.length / TABLE_PAGE_SIZE);
  const pagedRows = filtered.slice(tablePage * TABLE_PAGE_SIZE, (tablePage + 1) * TABLE_PAGE_SIZE);

  // Compute overall GEO score from waterfall
  const overallGeo = useMemo(() => {
    const total = waterfallData.reduce((a, d) => a + d.average, 0);
    return Math.round(total * 10) / 10;
  }, [waterfallData]);

  return (
    <WorkspacePanel>
      <SectionHeader eyebrow="Owned URL GEO readiness" title={`Owned-page readiness records (${filtered.length}/${report.ownedPages.length})`}>
        Site-level readiness includes inventory URLs selected from sitemap/robots plus query-mapped CMS pages.
      </SectionHeader>

      {/* Graph section */}
      <div className="mb-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <DarkButton variant={graphMode === 'waterfall' ? 'primary' : 'default'} onClick={() => setGraphMode('waterfall')}>Dimension contributions to GEO Score</DarkButton>
          <DarkButton variant={graphMode === 'comparison' ? 'primary' : 'default'} onClick={() => setGraphMode('comparison')}>Compare by brand topics</DarkButton>
        </div>

        {graphMode === 'waterfall' && (
          <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
            <p className="mb-3 text-sm text-[var(--text-secondary)]">
              Average contribution of 6 GEO dimensions across {filtered.length || report.ownedPages.length} audited pages. Overall GEO Score: <span className="font-semibold text-[var(--text-primary)]">{overallGeo}/120</span>
            </p>
            <div className="h-72">
              {waterfallData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={waterfallData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                    <XAxis dataKey="dimension" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                    <YAxis domain={[0, 20]} label={{ value: 'Avg score /20', angle: -90, position: 'insideLeft', fill: 'var(--text-muted)' }} tick={{ fill: 'var(--text-secondary)' }} />
                    <Tooltip content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return <div className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-3 text-sm shadow-lg"><p className="font-semibold text-[var(--text-primary)]">{d.dimension}</p><p className="text-[var(--text-secondary)]">{d.average} / 20</p></div>;
                    }} />
                    <Bar dataKey="average" radius={[4, 4, 0, 0]}>
                      {waterfallData.map((d, i) => <Cell key={d.dimension} fill={dimPalette[i % dimPalette.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-[var(--text-muted)]">No owned page data available.</p>}
            </div>
          </div>
        )}

        {graphMode === 'comparison' && (
          <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
            <p className="mb-3 text-sm text-[var(--text-secondary)]">
              Average of 6 GEO dimensions by journey categories (brand topics). Each line on the radar represents a journey category average.
            </p>
            <div className="h-[28rem]">
              {radarData.chartData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData.chartData}>
                    <PolarGrid stroke="var(--border-subtle)" />
                    <PolarAngleAxis dataKey="dimension" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 20]} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                    {radarData.journeyNames.map((journey, i) => (
                      <Radar
                        key={journey}
                        name={journey}
                        dataKey={journey}
                        stroke={dimPalette[i % dimPalette.length]}
                        fill={dimPalette[i % dimPalette.length]}
                        fillOpacity={0.1}
                        strokeWidth={2}
                      />
                    ))}
                    <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }} />
                    <Tooltip
                      content={({ active, payload, label: dimLabel }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-3 text-sm shadow-lg">
                            <p className="font-semibold text-[var(--text-primary)] mb-1">{dimLabel}</p>
                            {payload.map((p) => (
                              <p key={String(p.dataKey)} className="text-[var(--text-secondary)]">
                                <span style={{ color: p.color }}>{"\u25CF"}</span> {String(p.name)}: {p.value}/20
                              </p>
                            ))}
                          </div>
                        );
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-[var(--text-muted)]">No topic data available for comparison. Pages need journey categories or related queries.</p>}
            </div>
          </div>
        )}
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <input className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)]" placeholder="Search URL, title, query, gap\u2026" value={search} onChange={(event) => { setSearch(event.target.value); setTablePage(0); }} />
        <select className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)]" value={scope} onChange={(event) => { setScope(event.target.value); setTablePage(0); }}>
          <option>All scored owned URLs</option>
          <option>Mapped/CMS URLs</option>
          <option>Inventory only</option>
        </select>
      </div>
      <OwnedTable pages={pagedRows} cmsUrls={cmsUrls} sort={sort} onSort={toggle} onOpenCms={onOpenCms} />
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-[var(--text-muted)]">
            Showing {tablePage * TABLE_PAGE_SIZE + 1}\u2013{Math.min((tablePage + 1) * TABLE_PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <DarkButton onClick={() => setTablePage((p) => Math.max(0, p - 1))} disabled={tablePage === 0}>Previous</DarkButton>
            <span className="text-xs text-[var(--text-secondary)]">{tablePage + 1} / {totalPages}</span>
            <DarkButton onClick={() => setTablePage((p) => Math.min(totalPages - 1, p + 1))} disabled={tablePage >= totalPages - 1}>Next</DarkButton>
          </div>
        </div>
      )}
    </WorkspacePanel>
  );
}

function normaliseUrl(value: string | undefined) {
  return String(value || '').trim().replace(/#.*$/, '').replace(/\/$/, '').toLowerCase();
}

function SortHeader({ label, sortKey, sort, onSort }: { label: string; sortKey: SortKey; sort: SortState; onSort: (key: SortKey) => void }) {
  const arrow = sort.key === sortKey ? (sort.direction === 'asc' ? '\u2191' : '\u2193') : '\u21D5';
  return <button type="button" className="inline-flex items-center gap-1 font-semibold text-[var(--text-muted)]" onClick={() => onSort(sortKey)}>{label} <span>{arrow}</span></button>;
}

function OwnedTable({ pages, cmsUrls, sort, onSort, onOpenCms }: { pages: OwnedPage[]; cmsUrls: Set<string>; sort: SortState; onSort: (key: SortKey) => void; onOpenCms?: (url: string) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left">
            <th className="px-3 py-3"><SortHeader label="Owned URL" sortKey="url" sort={sort} onSort={onSort} /></th>
            <th className="px-3 py-3"><SortHeader label="Score /120" sortKey="geoScore" sort={sort} onSort={onSort} /></th>
            <th className="px-3 py-3"><SortHeader label="Clarity" sortKey="clarity" sort={sort} onSort={onSort} /></th>
            <th className="px-3 py-3"><SortHeader label="Depth" sortKey="semanticDepth" sort={sort} onSort={onSort} /></th>
            <th className="px-3 py-3"><SortHeader label="Structured" sortKey="structure" sort={sort} onSort={onSort} /></th>
            <th className="px-3 py-3"><SortHeader label="E-E-A-T" sortKey="evidence" sort={sort} onSort={onSort} /></th>
            <th className="px-3 py-3"><SortHeader label="Freshness" sortKey="freshness" sort={sort} onSort={onSort} /></th>
            <th className="px-3 py-3"><SortHeader label="FAQ" sortKey="faqReadiness" sort={sort} onSort={onSort} /></th>
            <th className="px-3 py-3"><SortHeader label="Queries" sortKey="relatedQueries" sort={sort} onSort={onSort} /></th>
            <th className="px-3 py-3 typo-meta text-[var(--text-muted)]">Technical</th>
            <th className="px-3 py-3 typo-meta text-[var(--text-muted)]">CMS</th>
          </tr>
        </thead>
        <tbody>
          {pages.map((page) => (
            <tr key={page.url} className="align-top">
              <td className="max-w-sm px-3 py-4 font-medium text-[var(--text-primary)]"><p className="break-all">{page.url}</p>{page.title && <p className="mt-1 text-xs text-[var(--text-muted)]">{page.title}</p>}<p className="mt-1 typo-meta text-[var(--text-muted)]">{page.queryMapped || cmsUrls.has(normaliseUrl(page.url)) ? 'Mapped/CMS' : 'Inventory only'} \u00b7 {page.inventorySource || 'sitemap_inventory'}</p></td>
              <td className="px-3 py-4"><p className="font-semibold text-[var(--text-primary)]">{page.geoScore}</p><ScoreMethod page={page} /></td>
              <td className="px-3 py-4 text-[var(--text-secondary)]">{page.clarity}</td>
              <td className="px-3 py-4 text-[var(--text-secondary)]">{page.semanticDepth}</td>
              <td className="px-3 py-4 text-[var(--text-secondary)]">{page.structure}</td>
              <td className="px-3 py-4 text-[var(--text-secondary)]">{page.evidence}</td>
              <td className="px-3 py-4 text-[var(--text-secondary)]">{page.freshness}</td>
              <td className="px-3 py-4 text-[var(--text-secondary)]">{page.faqReadiness ?? 0}</td>
              <td className="px-3 py-4 text-[var(--text-secondary)]">{page.relatedQueries.length}</td>
              <td className="px-3 py-4"><TechnicalSignals page={page} /></td>
              <td className="px-3 py-4">{cmsUrls.has(normaliseUrl(page.url)) ? <DarkButton variant="primary" onClick={() => onOpenCms?.(page.url)}>Open CMS</DarkButton> : <span className="text-xs text-[var(--text-muted)]">No CMS copy</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function scoreMethodLabel(method?: string) {
  if (!method) return '';
  if (method.startsWith('explicit')) return 'Page GEO';
  if (method.startsWith('crawl_evidence')) return 'Crawl scored';
  if (method.startsWith('fallback_limited')) return 'Fallback';
  return method.replace(/_/g, ' ');
}

function ScoreMethod({ page }: { page: OwnedPage }) {
  const lbl = scoreMethodLabel(page.scoringMethod);
  if (!lbl) return null;
  const isFallback = page.scoringMethod?.startsWith('fallback_limited');
  const tone = isFallback ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' : 'border-[var(--border-subtle)] bg-[var(--bg-panel)] text-[var(--text-muted)]';
  return <span title={page.scoringNotes || undefined} className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tone}`}>{lbl}</span>;
}

function TechnicalSignals({ page }: { page: OwnedPage }) {
  const tech = page.technicalSignals || {};
  const schemaTypes = tech.schemaTypes || [];
  const jsonLdQuality = tech.jsonLdPresent === undefined
    ? 'Not checked'
    : tech.jsonLdPresent
      ? (schemaTypes.length >= 2 ? 'Present \u00b7 good' : 'Present \u00b7 partial')
      : 'Missing';
  const tone = jsonLdQuality.startsWith('Present \u00b7 good') ? 'status-owned-target'
    : jsonLdQuality.startsWith('Present') ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
    : jsonLdQuality.startsWith('Not checked') ? 'border-[var(--border-subtle)] bg-[var(--bg-panel)] text-[var(--text-muted)]'
    : 'border-red-500/30 bg-red-500/10 text-red-400';
  const supporting = [
    tech.canonicalUrl ? 'canonical' : '',
    tech.metaDescriptionPresent ? 'meta desc' : '',
    tech.crawlStatus === 'success' ? 'crawled' : '',
    tech.wordCount ? `${tech.wordCount} words` : ''
  ].filter(Boolean);
  return (
    <div className="min-w-[180px] space-y-1">
      <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold ${tone}`}>JSON-LD: {jsonLdQuality}</span>
      {schemaTypes.length ? <p className="text-[11px] leading-4 text-[var(--text-muted)]">Schema: {schemaTypes.slice(0, 3).join(', ')}{schemaTypes.length > 3 ? '\u2026' : ''}</p> : null}
      {supporting.length ? <p className="text-[11px] leading-4 text-[var(--text-muted)]">{supporting.join(' \u00b7 ')}</p> : null}
    </div>
  );
}
