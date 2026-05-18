import { useMemo, useState, type ReactNode } from 'react';
import type { OwnedPage, ReportBundle } from '../types/report';
import { Card, SectionTitle } from './ui';

const unique = (values: string[]) => Array.from(new Set(values.filter(Boolean))).sort();
type SortKey = keyof Pick<OwnedPage, 'url' | 'journeyCategory' | 'geoScore' | 'clarity' | 'semanticDepth' | 'structure' | 'evidence' | 'freshness' | 'faqReadiness'> | 'relatedQueries';
type SortState = { key: SortKey; direction: 'asc' | 'desc' };

function Controls({ children }: { children: ReactNode }) {
  return <div className="mb-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">{children}</div>;
}

export function QueryDiagnostics() {
  // Kept for backward compatibility. The visible dashboard now uses QueryWorkbench as the single query view.
  return <Card><SectionTitle eyebrow="Query diagnostics" title="Query diagnostics have moved into Query workbench">Open the Query workbench tab for query-level AI visibility, competitors, winning source types and leading citation domains.</SectionTitle></Card>;
}

export function OwnedUrlReadiness({ report, onOpenCms }: { report: ReportBundle; onOpenCms?: (url: string) => void }) {
  const [search, setSearch] = useState('');
  const [journey, setJourney] = useState('All');
  const [scope, setScope] = useState('All audited inventory URLs');
  const [sort, setSort] = useState<SortState>({ key: 'geoScore', direction: 'asc' });
  const journeys = useMemo(() => unique(report.ownedPages.map((p) => p.journeyCategory)), [report.ownedPages]);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = report.ownedPages.filter((page) => {
      const matchesSearch = !term || [page.url, page.title, page.journeyCategory, ...page.relatedQueries.map((q) => q.query), ...page.diagnostics].join(' ').toLowerCase().includes(term);
      const matchesJourney = journey === 'All' || page.journeyCategory === journey;
      const matchesScope = scope === 'All audited inventory URLs' || (scope === 'Mapped to current query portfolio' ? Boolean(page.queryMapped || page.relatedQueries.length) : !(page.queryMapped || page.relatedQueries.length));
      return matchesSearch && matchesJourney && matchesScope;
    });
    return [...rows].sort((a, b) => {
      const dir = sort.direction === 'asc' ? 1 : -1;
      const av = sort.key === 'relatedQueries' ? a.relatedQueries.length : a[sort.key] ?? 0;
      const bv = sort.key === 'relatedQueries' ? b.relatedQueries.length : b[sort.key] ?? 0;
      if (typeof av === 'string' || typeof bv === 'string') return String(av).localeCompare(String(bv)) * dir;
      return (Number(av) - Number(bv)) * dir;
    });
  }, [report.ownedPages, search, journey, scope, sort]);

  function toggle(key: SortKey) {
    setSort((current) => current.key === key ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' });
  }

  return (
    <Card>
      <SectionTitle eyebrow="Owned URL GEO readiness" title={`Owned-page readiness records (${filtered.length}/${report.ownedPages.length})`}>
        Site-level readiness includes inventory URLs selected from sitemap/robots plus query-mapped pages. Use the scope filter to separate broad inventory readiness from pages mapped to the current query portfolio.
      </SectionTitle>
      <Controls>
        <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Search URL, title, query, gap..." value={search} onChange={(event) => setSearch(event.target.value)} />
        <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" value={journey} onChange={(event) => setJourney(event.target.value)}>
          <option>All</option>{journeys.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" value={scope} onChange={(event) => setScope(event.target.value)}>
          <option>All audited inventory URLs</option>
          <option>Mapped to current query portfolio</option>
          <option>Inventory only</option>
        </select>
      </Controls>
      <OwnedTable pages={filtered} sort={sort} onSort={toggle} onOpenCms={onOpenCms} />
      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filtered.slice(0, 12).map((page) => <OwnedPageCard key={`${page.url}-diag`} page={page} />)}
      </div>
    </Card>
  );
}

function SortHeader({ label, sortKey, sort, onSort }: { label: string; sortKey: SortKey; sort: SortState; onSort: (key: SortKey) => void }) {
  const arrow = sort.key === sortKey ? (sort.direction === 'asc' ? '↑' : '↓') : '↕';
  return <button type="button" className="inline-flex items-center gap-1 font-semibold" onClick={() => onSort(sortKey)}>{label} <span>{arrow}</span></button>;
}

function OwnedTable({ pages, sort, onSort, onOpenCms }: { pages: OwnedPage[]; sort: SortState; onSort: (key: SortKey) => void; onOpenCms?: (url: string) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="px-3 py-3"><SortHeader label="Owned URL" sortKey="url" sort={sort} onSort={onSort} /></th>
            <th className="px-3 py-3"><SortHeader label="Journey" sortKey="journeyCategory" sort={sort} onSort={onSort} /></th>
            <th className="px-3 py-3"><SortHeader label="Score /120" sortKey="geoScore" sort={sort} onSort={onSort} /></th>
            <th className="px-3 py-3"><SortHeader label="Clarity" sortKey="clarity" sort={sort} onSort={onSort} /></th>
            <th className="px-3 py-3"><SortHeader label="Depth" sortKey="semanticDepth" sort={sort} onSort={onSort} /></th>
            <th className="px-3 py-3"><SortHeader label="Structured data" sortKey="structure" sort={sort} onSort={onSort} /></th>
            <th className="px-3 py-3"><SortHeader label="E-E-A-T" sortKey="evidence" sort={sort} onSort={onSort} /></th>
            <th className="px-3 py-3"><SortHeader label="Freshness" sortKey="freshness" sort={sort} onSort={onSort} /></th>
            <th className="px-3 py-3"><SortHeader label="FAQ" sortKey="faqReadiness" sort={sort} onSort={onSort} /></th>
            <th className="px-3 py-3"><SortHeader label="Related queries" sortKey="relatedQueries" sort={sort} onSort={onSort} /></th>
            <th className="px-3 py-3">Technical signals</th><th className="px-3 py-3">CMS</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {pages.map((page) => (
            <tr key={page.url} className="align-top">
              <td className="max-w-sm px-3 py-4 font-medium text-slate-950"><p className="break-all">{page.url}</p>{page.title && <p className="mt-1 text-xs text-slate-500">{page.title}</p>}<p className="mt-1 text-[11px] uppercase tracking-wide text-slate-400">{page.queryMapped ? 'Query mapped' : 'Inventory only'} · {page.inventorySource || 'sitemap_inventory'}</p></td>
              <td className="max-w-xs px-3 py-4 text-slate-600">{page.journeyCategory}</td>
              <td className="px-3 py-4 font-semibold text-slate-950">{page.geoScore}</td><td className="px-3 py-4">{page.clarity}</td><td className="px-3 py-4">{page.semanticDepth}</td><td className="px-3 py-4">{page.structure}</td><td className="px-3 py-4">{page.evidence}</td><td className="px-3 py-4">{page.freshness}</td><td className="px-3 py-4">{page.faqReadiness ?? 0}</td><td className="px-3 py-4">{page.relatedQueries.length}</td>
              <td className="px-3 py-4"><TechnicalSignals page={page} /></td>
              <td className="px-3 py-4"><button onClick={() => onOpenCms?.(page.url)} className="rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white">Open CMS</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OwnedPageCard({ page }: { page: OwnedPage }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
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
  );
}


function TechnicalSignals({ page }: { page: OwnedPage }) {
  const tech = page.technicalSignals || {};
  const schemaTypes = tech.schemaTypes || [];
  const jsonLdQuality = tech.jsonLdPresent
    ? (schemaTypes.length >= 2 ? 'Present · good quality' : 'Present · partial')
    : 'Missing';
  const tone = jsonLdQuality.startsWith('Present · good') ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
    : jsonLdQuality.startsWith('Present') || jsonLdQuality.startsWith('Partial') ? 'bg-amber-50 text-amber-800 border-amber-100'
    : 'bg-red-50 text-red-800 border-red-100';
  const supporting = [
    tech.canonicalUrl ? 'canonical' : '',
    tech.metaDescriptionPresent ? 'meta description' : '',
    tech.crawlStatus === 'success' ? 'crawled' : '',
    tech.wordCount ? `${tech.wordCount} words` : ''
  ].filter(Boolean);
  return (
    <div className="min-w-[210px] space-y-1">
      <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold ${tone}`}>JSON-LD: {jsonLdQuality}</span>
      {schemaTypes.length ? <p className="text-[11px] leading-4 text-slate-500">Schema: {schemaTypes.slice(0, 3).join(', ')}{schemaTypes.length > 3 ? '…' : ''}</p> : null}
      {supporting.length ? <p className="text-[11px] leading-4 text-slate-500">{supporting.join(' · ')}</p> : null}
    </div>
  );
}
