import { useMemo, useState, useEffect } from 'react';
import type { ActionItem, RecommendationModule, ReportBundle, CmsCopyModule } from '../types/report';
import { Badge, Card, SectionTitle } from './ui';

const tone = (priority: string) => priority === 'High' ? 'high' : priority === 'Medium' ? 'medium' : 'low';
const unique = (values: string[]) => Array.from(new Set(values.filter(Boolean))).sort();
const label = (value = '') => value.replaceAll('_', ' ');

export function Recommendations({ report }: { report: ReportBundle }) {
  return <CmsRecommendations report={report} />;
}

export function CmsRecommendations({ report, highlightUrl }: { report: ReportBundle; highlightUrl?: string }) {
  return <RecommendationPanel title={`Page-level CMS recommendations (${report.cmsModules.length})`} eyebrow="Content remediation" items={report.cmsModules} type="cms" highlightUrl={highlightUrl} />;
}

export function PrRecommendations({ report }: { report: ReportBundle }) {
  return <RecommendationPanel title={`Grouped PR opportunities (${report.prOpportunities.length})`} eyebrow="External evidence" items={report.prOpportunities} type="pr" />;
}

function RecommendationPanel({ title, eyebrow, items, type, highlightUrl }: { title: string; eyebrow: string; items: RecommendationModule[]; type: 'cms' | 'pr'; highlightUrl?: string }) {
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState('All');
  const [journey, setJourney] = useState('All');
  const [sortBy, setSortBy] = useState('priority');
  const journeys = useMemo(() => unique(items.map((item) => item.journeyCategory ?? '')), [items]);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = items.filter((item) => {
      const matchesSearch = !term || [item.title, item.targetUrl, item.recommendation, item.evidencePattern, item.journeyCategory, ...(item.targetSourceTypes ?? []), ...(item.linkedQueryIds ?? []), ...(item.observedExternalDomains ?? []).map((d) => d.domain)].join(' ').toLowerCase().includes(term);
      const matchesPriority = priority === 'All' || item.priority === priority;
      const matchesJourney = journey === 'All' || item.journeyCategory === journey;
      return matchesSearch && matchesPriority && matchesJourney;
    });
    const priorityWeight = { High: 3, Medium: 2, Low: 1 } as const;
    return [...rows].sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'journey') return (a.journeyCategory ?? '').localeCompare(b.journeyCategory ?? '');
      if (sortBy === 'coverage') return (b.queryCoverageCount ?? 0) - (a.queryCoverageCount ?? 0);
      if (sortBy === 'value') return (b.valueScore ?? 0) - (a.valueScore ?? 0);
      return priorityWeight[b.priority] - priorityWeight[a.priority] || (b.queryCoverageCount ?? 0) - (a.queryCoverageCount ?? 0);
    });
  }, [items, search, priority, journey, sortBy]);

  useEffect(() => {
    if (!highlightUrl) return;
    const node = document.getElementById(`cms-${encodeURIComponent(highlightUrl)}`);
    node?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightUrl, filtered.length]);

  return (
    <Card>
      <SectionTitle eyebrow={eyebrow} title={`${title} · showing ${filtered.length}`}>
        {type === 'cms'
          ? 'CMS is tracked at owned-page level. Each card aggregates linked queries and shows copy-ready modules for the highest-value page changes.'
          : 'PR is tracked separately from owned URLs. Each card groups queries by external source pattern and prioritises opportunities that can influence multiple queries.'}
      </SectionTitle>
      <div className="mb-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder={type === 'cms' ? 'Search page, module, query ID...' : 'Search source type, domain, query ID...'} value={search} onChange={(event) => setSearch(event.target.value)} />
        <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" value={priority} onChange={(event) => setPriority(event.target.value)}>
          <option>All</option><option>High</option><option>Medium</option><option>Low</option>
        </select>
        <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" value={journey} onChange={(event) => setJourney(event.target.value)}>
          <option>All</option>{journeys.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
          <option value="priority">Sort: priority</option><option value="coverage">Sort: query coverage</option><option value="value">Sort: value score</option><option value="journey">Sort: journey</option><option value="title">Sort: title</option>
        </select>
      </div>
      <div className="space-y-4">
        {filtered.length ? filtered.map((item) => <RecommendationCard key={`${item.sourceRecommendationId}-${item.title}-${item.targetUrl}`} item={item} type={type} highlighted={!!highlightUrl && item.targetUrl === highlightUrl} />) : <p className="text-sm text-slate-500">No {title.toLowerCase()} match the current filters.</p>}
      </div>
    </Card>
  );
}

function RecommendationCard({ item, type, highlighted }: { item: RecommendationModule; type: 'cms' | 'pr'; highlighted?: boolean }) {
  return (
    <div id={type === 'cms' ? `cms-${encodeURIComponent(item.targetUrl)}` : undefined} className={`rounded-2xl border p-4 ${highlighted ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-200' : 'border-slate-200 bg-slate-50'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-950">{item.title}</h3>
          {item.journeyCategory && <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{item.journeyCategory}</p>}
        </div>
        <Badge tone={tone(item.priority)}>{item.priority}</Badge>
      </div>
      <p className="mt-2 break-all text-sm text-slate-500">Owner: {item.owner} · {type === 'pr' ? 'Source group' : 'Target page'}: {item.targetUrl || 'Grouped opportunity'}</p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
        {item.queryCoverageCount ? <span className="rounded-full bg-white px-2 py-1">{item.queryCoverageCount} linked queries</span> : null}
        {item.valueScore ? <span className="rounded-full bg-white px-2 py-1">Value score {item.valueScore}</span> : null}
        {item.moduleType ? <span className="rounded-full bg-white px-2 py-1">{label(item.moduleType)}</span> : null}
      </div>
      {type === 'cms' ? <CmsCardBody item={item} /> : <PrCardBody item={item} />}
      {item.linkedQueryIds?.length ? <p className="mt-3 text-xs text-slate-500">Linked queries: {item.linkedQueryIds.slice(0, 18).join(', ')}{item.linkedQueryIds.length > 18 ? '…' : ''}</p> : null}
      {item.validationRequired?.length ? <p className="mt-2 text-xs text-slate-500">Validation required: {item.validationRequired.join(', ')}</p> : null}
    </div>
  );
}

function CmsCardBody({ item }: { item: RecommendationModule }) {
  const modules = item.copyModules?.length ? item.copyModules.slice(0, 3) : fallbackCmsModules(item);
  return (
    <div className="mt-4 space-y-3">
      {modules.map((module, index) => <CmsCopyBlock key={`${module.moduleId}-${index}`} module={module} item={item} index={index} />)}
      <details className="rounded-xl bg-white p-3 text-xs leading-5 text-slate-600">
        <summary className="cursor-pointer font-semibold text-slate-900">How value score is calculated</summary>
        <p className="mt-2">Value score combines query coverage, low current AI visibility, competitor/external-led status, page GEO gap, priority, and availability of reusable winning patterns. Higher scores indicate page changes expected to move more linked queries and improve both page GEO score and query-level AI visibility on rerun.</p>
      </details>
      <p className="rounded-xl bg-white p-3 text-xs leading-5 text-slate-600"><span className="font-semibold text-slate-900">Evidence basis:</span> {item.evidencePattern}</p>
    </div>
  );
}

function CmsCopyBlock({ module, item, index }: { module: CmsCopyModule; item: RecommendationModule; index: number }) {
  const element = item.htmlElement || '<section class="geo-answer-module">';
  return (
    <div className="rounded-xl bg-white p-3 text-sm leading-6 text-slate-700">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">CMS copy recommendation {index + 1} · HTML element/component</p>
      <code className="mt-1 block break-all rounded-lg bg-slate-100 p-2 text-xs text-slate-800">{module.recommendedPlacement || item.placement || element}</code>
      <p className="mt-3 font-semibold text-slate-950">{module.heading || item.title}</p>
      {module.introCopy ? <p className="mt-2"><span className="font-semibold text-slate-900">Intro copy:</span> {module.introCopy}</p> : null}
      {module.bodyCopy ? <p className="mt-2"><span className="font-semibold text-slate-900">Body copy:</span> {module.bodyCopy}</p> : <p className="mt-2">{item.recommendation}</p>}
      {module.bullets?.length ? <ul className="mt-2 list-disc space-y-1 pl-5">{module.bullets.slice(0, 5).map((point) => <li key={point}>{point}</li>)}</ul> : null}
      {module.faqItems?.length ? (
        <details className="mt-2 rounded-lg bg-slate-50 p-2">
          <summary className="cursor-pointer font-semibold text-slate-900">FAQ copy</summary>
          {module.faqItems.slice(0, 3).map((faq) => <div key={faq.question} className="mt-2"><p className="font-semibold text-slate-900">{faq.question}</p><p>{faq.answer}</p></div>)}
        </details>
      ) : null}
    </div>
  );
}

function fallbackCmsModules(item: RecommendationModule): CmsCopyModule[] {
  return [{
    moduleId: `${item.sourceRecommendationId || item.title}-fallback`,
    moduleType: item.moduleType,
    recommendedPlacement: item.placement || item.htmlElement || '<section class="geo-answer-module">',
    heading: item.title,
    introCopy: item.recommendation,
    bodyCopy: '',
    bullets: item.bulletPoints?.slice(0, 4) ?? [],
    faqItems: []
  }];
}

function PrCardBody({ item }: { item: RecommendationModule }) {
  return (
    <div className="mt-4 space-y-3">
      <p className="rounded-xl bg-white p-3 text-sm leading-6 text-slate-700">{item.recommendation}</p>
      {item.whyItMatters ? <p className="rounded-xl bg-white p-3 text-sm leading-6 text-slate-700"><span className="font-semibold text-slate-900">Why it matters:</span> {item.whyItMatters}</p> : null}
      {item.evidenceBasis || item.evidencePattern ? <p className="rounded-xl bg-white p-3 text-sm leading-6 text-slate-600"><span className="font-semibold text-slate-900">Evidence basis:</span> {item.evidenceBasis || item.evidencePattern}</p> : null}
      {item.observedExternalDomains?.length ? <p className="text-xs text-slate-500">Observed domains: {item.observedExternalDomains.slice(0, 10).map((d) => `${d.domain}${d.count ? ` (${d.count})` : ''}`).join(', ')}</p> : null}
      <details className="rounded-xl bg-white p-3 text-xs leading-5 text-slate-600">
        <summary className="cursor-pointer font-semibold text-slate-900">How value score is calculated</summary>
        <p className="mt-2">Value score combines grouped query coverage, source-type influence, external-led or competitor-led status, citation-domain concentration, and priority. PR actions are not tied to owned URLs; success is tracked by grouped-query AI visibility movement, reduced external-led/competitor-led counts, and improved owned or neutral-source citation mix after rerun.</p>
      </details>
    </div>
  );
}

export function ActionChecklist({ report }: { report: ReportBundle }) {
  const [search, setSearch] = useState('');
  const [workstream, setWorkstream] = useState('All');
  const [priority, setPriority] = useState('All');
  const [sortBy, setSortBy] = useState('priority');
  const workstreams = useMemo(() => unique(report.actionChecklist.map((item) => item.workstream || item.source || '')), [report.actionChecklist]);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = report.actionChecklist.filter((item) => {
      const matchesSearch = !term || [item.action, item.owner, item.dependency, item.target, item.category, item.source, ...(item.targetSourceTypes ?? [])].join(' ').toLowerCase().includes(term);
      const matchesWorkstream = workstream === 'All' || item.workstream === workstream || item.source === workstream;
      const matchesPriority = priority === 'All' || item.priority === priority;
      return matchesSearch && matchesWorkstream && matchesPriority;
    });
    const priorityWeight = { High: 3, Medium: 2, Low: 1 } as const;
    return [...rows].sort((a, b) => {
      if (sortBy === 'target') return (a.target ?? '').localeCompare(b.target ?? '');
      if (sortBy === 'category') return (a.category ?? '').localeCompare(b.category ?? '');
      if (sortBy === 'coverage') return (b.queryCoverageCount ?? 0) - (a.queryCoverageCount ?? 0);
      return priorityWeight[b.priority] - priorityWeight[a.priority] || (b.queryCoverageCount ?? 0) - (a.queryCoverageCount ?? 0);
    });
  }, [report.actionChecklist, search, workstream, priority, sortBy]);

  return (
    <Card>
      <SectionTitle eyebrow="Action checklist" title={`Explicit Bodhi action checklist (${filtered.length}/${report.actionChecklist.length})`}>
        CMS actions are tracked at owned-page level. PR actions are tracked separately by grouped query/source opportunity and are not tied to owned URLs.
      </SectionTitle>
      <div className="mb-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Search action, target, category..." value={search} onChange={(event) => setSearch(event.target.value)} />
        <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" value={workstream} onChange={(event) => setWorkstream(event.target.value)}>
          <option>All</option>{workstreams.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" value={priority} onChange={(event) => setPriority(event.target.value)}>
          <option>All</option><option>High</option><option>Medium</option><option>Low</option>
        </select>
        <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
          <option value="priority">Sort: priority</option><option value="coverage">Sort: query coverage</option><option value="target">Sort: target</option><option value="category">Sort: category</option>
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-3 py-3">Action</th><th className="px-3 py-3">Target / source group</th><th className="px-3 py-3">Category / source type</th><th className="px-3 py-3">Linked queries</th><th className="px-3 py-3">Owner</th><th className="px-3 py-3">Priority</th><th className="px-3 py-3">Effort</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Workstream</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((item, index) => <ActionRow key={`${item.source}-${item.target}-${item.action}-${index}`} item={item} />)}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ActionRow({ item }: { item: ActionItem }) {
  return (
    <tr className="align-top">
      <td className="max-w-md px-3 py-4 font-medium leading-6 text-slate-950">{item.action}</td>
      <td className="max-w-md px-3 py-4 break-all text-slate-600">{item.target || '—'}</td>
      <td className="max-w-xs px-3 py-4 text-slate-600">{label(item.category || item.dependency || item.targetSourceTypes?.join(', ') || '')}</td>
      <td className="px-3 py-4 text-slate-600">{item.queryCoverageCount || item.linkedQueryIds?.length || '—'}</td>
      <td className="px-3 py-4 text-slate-600">{item.owner}</td>
      <td className="px-3 py-4"><Badge tone={tone(item.priority)}>{item.priority}</Badge></td>
      <td className="px-3 py-4 text-slate-600">{item.effort}</td>
      <td className="px-3 py-4 text-slate-600">{item.status}</td>
      <td className="px-3 py-4 text-slate-500">{item.workstream || item.source}</td>
    </tr>
  );
}
