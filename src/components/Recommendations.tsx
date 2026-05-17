import { useMemo, useState } from 'react';
import type { ActionItem, RecommendationModule, ReportBundle } from '../types/report';
import { Badge, Card, SectionTitle } from './ui';

const tone = (priority: string) => priority === 'High' ? 'high' : priority === 'Medium' ? 'medium' : 'low';
const unique = (values: string[]) => Array.from(new Set(values.filter(Boolean))).sort();
const label = (value = '') => value.replaceAll('_', ' ');

export function Recommendations({ report }: { report: ReportBundle }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <RecommendationPanel title={`CMS recommendations (${report.cmsModules.length})`} eyebrow="Content remediation" items={report.cmsModules} type="cms" />
      <RecommendationPanel title={`PR opportunities (${report.prOpportunities.length})`} eyebrow="External evidence" items={report.prOpportunities} type="pr" />
    </div>
  );
}

function RecommendationPanel({ title, eyebrow, items, type }: { title: string; eyebrow: string; items: RecommendationModule[]; type: 'cms' | 'pr' }) {
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState('All');
  const [journey, setJourney] = useState('All');
  const [sortBy, setSortBy] = useState('priority');
  const journeys = useMemo(() => unique(items.map((item) => item.journeyCategory ?? '')), [items]);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = items.filter((item) => {
      const matchesSearch = !term || [item.title, item.targetUrl, item.recommendation, item.evidencePattern, item.journeyCategory, ...(item.targetSourceTypes ?? [])].join(' ').toLowerCase().includes(term);
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

  return (
    <Card>
      <SectionTitle eyebrow={eyebrow} title={`${title} · showing ${filtered.length}`} />
      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Search recommendation, URL, source..." value={search} onChange={(event) => setSearch(event.target.value)} />
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
      <div className="max-h-[72rem] space-y-4 overflow-y-auto pr-2">
        {filtered.length ? filtered.map((item) => <RecommendationCard key={`${item.title}-${item.targetUrl}`} item={item} type={type} />) : <p className="text-sm text-slate-500">No {title.toLowerCase()} match the current filters.</p>}
      </div>
    </Card>
  );
}

function RecommendationCard({ item, type }: { item: RecommendationModule; type: 'cms' | 'pr' }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
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
      <p className="mt-3 text-sm leading-6 text-slate-700">{item.recommendation}</p>
      {item.introCopy && <p className="mt-3 rounded-xl bg-white p-3 text-sm leading-6 text-slate-700"><span className="font-semibold text-slate-900">Intro copy:</span> {item.introCopy}</p>}
      {item.bodyCopy && (
        <details className="mt-3 rounded-xl bg-white p-3 text-sm leading-6 text-slate-700">
          <summary className="cursor-pointer font-semibold text-slate-900">View CMS body copy</summary>
          <p className="mt-2">{item.bodyCopy}</p>
        </details>
      )}
      {item.bulletPoints?.length ? <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700">{item.bulletPoints.map((point) => <li key={point}>{point}</li>)}</ul> : null}
      {item.faqItems?.length ? (
        <details className="mt-3 rounded-xl bg-white p-3 text-sm leading-6 text-slate-700">
          <summary className="cursor-pointer font-semibold text-slate-900">View FAQ item</summary>
          {item.faqItems.map((faq) => <div key={faq.question} className="mt-2"><p className="font-semibold text-slate-900">{faq.question}</p><p>{faq.answer}</p></div>)}
        </details>
      ) : null}
      {type === 'pr' && item.whyItMatters && <p className="mt-3 rounded-xl bg-white p-3 text-sm leading-6 text-slate-700"><span className="font-semibold text-slate-900">Why it matters:</span> {item.whyItMatters}</p>}
      <p className="mt-3 rounded-xl bg-white p-3 text-sm leading-6 text-slate-600"><span className="font-semibold text-slate-900">Evidence basis:</span> {item.evidencePattern}</p>
      {item.linkedQueryIds?.length ? <p className="mt-2 text-xs text-slate-500">Linked queries: {item.linkedQueryIds.slice(0, 12).join(', ')}{item.linkedQueryIds.length > 12 ? '…' : ''}</p> : null}
      {item.observedExternalDomains?.length ? <p className="mt-2 text-xs text-slate-500">Observed domains: {item.observedExternalDomains.slice(0, 6).map((d) => d.domain).join(', ')}</p> : null}
      {item.validationRequired?.length ? <p className="mt-2 text-xs text-slate-500">Validation required: {item.validationRequired.join(', ')}</p> : null}
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
