import { useMemo, useState, useEffect, useCallback } from 'react';
import type { ActionItem, RecommendationModule, ReportBundle, CmsCopyModule, AdvancedGeoAsset, AdvancedPrAssetPack } from '../types/report';
import { Badge, WorkspacePanel, SectionHeader, DarkButton, StatusPill } from './ui';
import { ChevronRight, ChevronDown, Copy, Check } from 'lucide-react';

// Backward-compatible aliases
const Card = WorkspacePanel;
const SectionTitle = SectionHeader;

const tone = (priority: string) => priority === 'High' ? 'high' : priority === 'Medium' ? 'medium' : 'low';
const unique = (values: string[]) => Array.from(new Set(values.filter(Boolean))).sort();
const label = (value = '') => value.replaceAll('_', ' ');

export function Recommendations({ report }: { report: ReportBundle }) {
  return <CmsRecommendations report={report} />;
}

export function CmsRecommendations({ report, highlightUrl }: { report: ReportBundle; highlightUrl?: string }) {
  return (
    <div className="space-y-4">
      <div className="rounded-[var(--radius-sm)] border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">
        <p className="font-semibold">⚠️ Disclaimer</p>
        <p className="mt-1">Please review each recommendation with your Brand, Content, and Legal teams before making any changes to live pages.</p>
      </div>
      <RecommendationPanel title={`Content Insights — Page-level recommendations (${report.cmsModules.length})`} eyebrow="Content remediation" items={report.cmsModules} type="cms" highlightUrl={highlightUrl} />
    </div>
  );
}

export function PrRecommendations({ report }: { report: ReportBundle }) {
  return (
    <div className="space-y-4">
      <div className="rounded-[var(--radius-sm)] border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">
        <p className="font-semibold">⚠️ Disclaimer</p>
        <p className="mt-1">Please review each PR recommendation with your Brand, Content, and Legal teams before executing any external outreach or asset creation.</p>
      </div>
      <RecommendationPanel title={`PR & Brand Insights — Grouped opportunities (${report.prOpportunities.length})`} eyebrow="External evidence" items={report.prOpportunities} type="pr" />
    </div>
  );
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
          ? 'Content recommendations are tracked at owned-page level. Each card aggregates linked queries and shows copy-ready modules for the highest-value page changes.'
          : 'PR & Brand Insights are tracked separately from owned URLs. Each card groups queries by external source pattern and prioritises opportunities that can influence multiple queries.'}
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
    <div id={type === 'cms' ? `cms-${encodeURIComponent(item.targetUrl)}` : undefined} className={`rounded-[var(--radius-md)] border p-4 ${highlighted ? 'border-[var(--accent-blue)]/40 bg-[var(--accent-blue-soft)] ring-2 ring-[var(--accent-blue)]/20' : 'border-[var(--border-subtle)] bg-[var(--bg-card)]'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">{item.title}</h3>
          {item.journeyCategory && <p className="mt-1 typo-meta text-[var(--text-muted)]">{item.journeyCategory}</p>}
        </div>
        <Badge tone={tone(item.priority)}>{item.priority}</Badge>
      </div>
      <p className="mt-2 break-all text-sm text-[var(--text-muted)]">Owner: {item.owner} · {type === 'pr' ? 'Source group' : 'Target page'}: {item.targetUrl || 'Grouped opportunity'}</p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--text-muted)]">
        {item.queryCoverageCount ? <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-2 py-1">{item.queryCoverageCount} linked queries</span> : null}
        {item.valueScore ? <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-2 py-1">Value score {item.valueScore}</span> : null}
        {item.moduleType ? <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-2 py-1">{label(item.moduleType)}</span> : null}
      </div>
      {type === 'cms' ? <CmsCardBody item={item} /> : <PrCardBody item={item} />}
      {item.linkedQueryIds?.length ? <p className="mt-3 text-xs text-[var(--text-muted)]">Linked queries: {item.linkedQueryIds.slice(0, 18).join(', ')}{item.linkedQueryIds.length > 18 ? '…' : ''}</p> : null}
      {item.validationRequired?.length ? <p className="mt-2 text-xs text-[var(--text-muted)]">Validation required: {item.validationRequired.join(', ')}</p> : null}
    </div>
  );
}

function CmsCardBody({ item }: { item: RecommendationModule }) {
  const modules = item.copyModules?.length ? item.copyModules.slice(0, 3) : fallbackCmsModules(item);
  const asset = item.advancedGeoAsset;
  const [activeTab, setActiveTab] = useState<'brief' | 'jsonld' | 'facts' | 'faq'>('brief');
  const tabList = ['brief', 'jsonld', 'facts', 'faq'] as const;
  const tabLabels = { brief: 'Brief', jsonld: 'JSON-LD', facts: 'Facts Verified on Page', faq: 'FAQ' };
  // Determine if this card has LLM-merged content BEFORE using it in directAnswer resolution.
  const isCmsLlmMerged = !!item.cms_llm_merged;
  // Collect direct answer: prefer LLM-merged field first.
  // Only fall back to advancedGeoAsset.direct_answer_40_words if NO LLM module exists for this card.
  // Do NOT use advancedGeoAsset fallback if an LLM module existed but failed to merge — that hides the real issue.
  const directAnswer = item.directAnswer || (isCmsLlmMerged ? '' : (asset?.direct_answer_40_words || ''));
  const primaryQueryId = item.primaryQueryId || item.linkedQueryIds?.[0] || '';
  const primaryQueryText = item.primaryQueryText || '';
  const evidenceStatus = directAnswer && !directAnswer.includes('[Pending') && !directAnswer.includes('[Direct answer pending') ? 'verified' : 'needs validation';
  // Collect FAQ items from new schema fields, then copyModules, then item.faqItems
  const allFaqItems = (item.faqItems?.length ? item.faqItems : modules.flatMap((m) => m.faqItems || []));
  // Intent tags from new schema
  const intentTags = item.intentTags || [];
  return (
    <div className="mt-4 space-y-3">
      <div className="flex gap-1 overflow-x-auto">
        {tabList.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`whitespace-nowrap rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-semibold ${activeTab === tab ? 'bg-[var(--accent-blue)] text-white' : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
            {tabLabels[tab]}
          </button>
        ))}
      </div>
      {activeTab === 'brief' && (
        <>
          {modules.map((module, index) => <CmsCopyBlock key={`${module.moduleId}-${index}`} module={module} item={item} index={index} />)}
          {/* Direct Answer section — uses LLM-merged field first, then advanced asset, then deterministic fallback */}
          {directAnswer && (
            <div className="rounded-[var(--radius-sm)] bg-[var(--accent-blue-soft)] border border-[var(--accent-blue)]/25 p-3 text-sm">
              <div className="flex items-center justify-between">
                <p className="typo-meta text-[var(--accent-blue)]">Direct Answer</p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${evidenceStatus === 'verified' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' : 'bg-amber-500/15 text-amber-400 border border-amber-500/25'}`}>
                  Evidence: {evidenceStatus}
                </span>
              </div>
              {primaryQueryText && <p className="mt-2 text-xs text-[var(--text-muted)]">Query: <span className="font-medium text-[var(--text-secondary)]">{primaryQueryText}</span></p>}
              {primaryQueryId && !primaryQueryText && <p className="mt-2 text-xs text-[var(--text-muted)]">Query: <span className="font-medium text-[var(--text-secondary)]">{primaryQueryId}</span></p>}
              <p className="mt-2 text-[var(--text-primary)] font-medium leading-relaxed">{directAnswer}</p>
              {isCmsLlmMerged && <p className="mt-2 text-[10px] text-[var(--text-muted)]">Source: CMS LLM agent (fact-constrained)</p>}
            </div>
          )}
          {/* Intent tags */}
          {intentTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {intentTags.map((tag, i) => <span key={i} className="rounded-full bg-purple-500/10 border border-purple-500/20 px-2 py-1 text-xs text-purple-400">{tag}</span>)}
            </div>
          )}
          {/* Facts missing warning */}
          {item.factsMissing && item.factsMissing.length > 0 && (
            <div className="rounded-[var(--radius-sm)] border border-amber-500/30 bg-amber-500/10 p-3">
              <p className="typo-meta text-amber-300">Facts Missing — Recommended Copy to Add</p>
              <ul className="mt-1 space-y-0.5">{item.factsMissing.map((f, i) => <li key={i} className="text-xs text-[var(--text-secondary)]">• {f}</li>)}</ul>
            </div>
          )}
          {item.targetUrl && (
            <p className="text-xs text-[var(--text-muted)]">Target page: <a href={item.targetUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--accent-blue)] underline hover:brightness-125 break-all">{item.targetUrl}</a></p>
          )}
        </>
      )}
      {activeTab === 'jsonld' && (
        <div className="rounded-[var(--radius-sm)] bg-[var(--bg-panel)] p-3 space-y-3">
          <p className="typo-meta text-[var(--text-muted)]">JSON-LD Suggestions</p>
          {/* Show LLM-generated JSON-LD tags as beautified, collapsible JSON with copy */}
          {item.jsonLdTags && item.jsonLdTags.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-[var(--accent-purple)]">Intent-aware JSON-LD recommendations</p>
              {item.jsonLdTags.map((tag, i) => {
                const jsonObj = typeof tag === 'string' ? tryParseJson(tag) : tag;
                return (
                  <div key={i} className="rounded-[var(--radius-sm)] border border-[var(--accent-purple)]/20 bg-[var(--bg-app)] overflow-hidden">
                    <JsonLdViewer data={jsonObj} label={`JSON-LD ${i + 1}`} />
                  </div>
                );
              })}
            </div>
          )}

          {(!item.jsonLdTags || item.jsonLdTags.length === 0) && (
            <p className="text-sm text-[var(--text-muted)]">No JSON-LD data available. JSON-LD will be generated by the Bodhi CMS LLM agent in future runs.</p>
          )}
        </div>
      )}
      {activeTab === 'facts' && (
        <div className="space-y-3">
          {/* Show LLM-merged facts_used first */}
          {item.factsUsed && item.factsUsed.length > 0 && (
            <div className="rounded-[var(--radius-sm)] bg-[var(--bg-panel)] p-3">
              <p className="typo-meta text-emerald-400 mb-2">Verified Facts ({item.factsUsed.length})</p>
              <div className="space-y-2">
                {item.factsUsed.map((fact, i) => (
                  <div key={i} className="rounded-[var(--radius-sm)] border border-emerald-500/25 bg-emerald-500/8 p-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2 w-2 rounded-full bg-[var(--accent-success)]" />
                      <span className="font-semibold text-[var(--text-primary)]">{String(fact.fact || '')}</span>
                      {fact.value && <span className="text-[var(--text-secondary)]">{String(fact.value)}{fact.unit ? ` ${String(fact.unit)}` : ''}</span>}
                    </div>
                    {fact.source && <p className="mt-1 text-[var(--text-muted)]">Source: <span className="font-semibold text-[var(--text-secondary)]">{String(fact.source).replace(/_/g, ' ')}</span></p>}
                    {fact.source_context_snippet && <p className="mt-0.5 text-[var(--text-muted)] break-all">Snippet: {String(fact.source_context_snippet).slice(0, 200)}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Show advanced asset facts if available and no LLM facts */}
          {(!item.factsUsed || item.factsUsed.length === 0) && asset && <FactsDisplay facts={asset.facts_used} />}
          {/* Show facts_missing as actionable items */}
          {item.factsMissing && item.factsMissing.length > 0 && (
            <div className="rounded-[var(--radius-sm)] border border-amber-500/30 bg-amber-500/10 p-3">
              <p className="typo-meta text-amber-300 mb-2">Missing Facts — Recommended Data to Add ({item.factsMissing.length})</p>
              <p className="text-xs text-[var(--text-muted)] mb-2">These facts would strengthen the brand's AI answer but are not currently available on the target page.</p>
              <ul className="space-y-1">{item.factsMissing.map((f: string, i: number) => <li key={i} className="text-xs text-[var(--text-secondary)]">• {f}</li>)}</ul>
            </div>
          )}
          {(!item.factsUsed || item.factsUsed.length === 0) && !asset && (!item.factsMissing || item.factsMissing.length === 0) && (
            <div className="rounded-[var(--radius-sm)] bg-[var(--bg-panel)] p-3 text-sm text-[var(--text-muted)]">No verified facts data available yet. Facts will be extracted from owned page crawl evidence by the Bodhi CMS LLM agent.</div>
          )}
        </div>
      )}
      {activeTab === 'faq' && (
        <div className="rounded-[var(--radius-sm)] bg-[var(--bg-panel)] p-3 space-y-3">
          <p className="typo-meta text-[var(--text-muted)]">FAQ Suggestions (minimum 3 query-aligned)</p>
          {allFaqItems.length > 0 ? (
            <>
              {allFaqItems.slice(0, Math.max(3, allFaqItems.length)).map((faq, i) => (
                <div key={i} className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3">
                  <p className="font-semibold text-[var(--text-primary)] text-sm">{faq.question}</p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">{faq.answer}</p>
                  {faq.answer.includes('[Pending fact validation') && (
                    <p className="mt-1 text-xs text-amber-400">⚠ Recommended FAQ draft pending fact validation</p>
                  )}
                </div>
              ))}
              {allFaqItems.length < 3 && (
                <p className="text-xs text-amber-400">⚠ Only {allFaqItems.length} FAQ(s) available. Remaining FAQs are recommended drafts pending fact validation from the next evidence refresh.</p>
              )}
            </>
          ) : (
            <p className="text-sm text-amber-400">⚠ Recommended FAQ draft pending fact validation. Run a new evidence refresh to generate query-aligned FAQs from owned page facts.</p>
          )}
        </div>
      )}
    </div>
  );
}

function FactsDisplay({ facts }: { facts: Array<{ fact: string; value?: string; unit?: string; source: string; source_context_snippet: string; source_url?: string }> }) {
  if (!facts.length) return <p className="rounded-[var(--radius-sm)] bg-[var(--bg-panel)] p-3 text-sm text-[var(--text-muted)]">No verified facts available for this recommendation.</p>;
  return (
    <div className="rounded-[var(--radius-sm)] bg-[var(--bg-panel)] p-3">
      <p className="typo-meta text-[var(--text-muted)] mb-2">Verified Facts ({facts.length})</p>
      <div className="space-y-2">
        {facts.map((fact, i) => (
          <div key={i} className="rounded-[var(--radius-sm)] border border-emerald-500/25 bg-emerald-500/8 p-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-[var(--accent-success)]" />
              <span className="font-semibold text-[var(--text-primary)]">{fact.fact}</span>
              {fact.value && <span className="text-[var(--text-secondary)]">{fact.value}{fact.unit ? ` ${fact.unit}` : ''}</span>}
            </div>
            <p className="mt-1 text-[var(--text-muted)]">Source: <span className="font-semibold text-[var(--text-secondary)]">{fact.source.replace(/_/g, ' ')}</span></p>
            <p className="mt-0.5 text-[var(--text-muted)] break-all">Snippet: {fact.source_context_snippet.slice(0, 200)}</p>
            {fact.source_url && <p className="mt-0.5 text-blue-400 break-all">{fact.source_url}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function ValidationDisplay({ asset }: { asset: AdvancedGeoAsset }) {
  const hasFlags = asset.validation_flags.length > 0;
  const needsLegal = asset.legal_review_required;
  return (
    <div className="rounded-xl bg-white p-3 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Validation Status</p>
      {needsLegal && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-800">
          <span className="font-semibold">Legal Review Required</span> — This recommendation contains pricing, warranty, or compliance-sensitive claims.
        </div>
      )}
      {hasFlags ? (
        <div className="space-y-1">
          {asset.validation_flags.map((flag, i) => (
            <div key={i} className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
              <span className="font-semibold">Warning:</span> {flag}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-800">
          All facts verified. No validation issues detected.
        </div>
      )}
      <p className="text-xs text-slate-400">Language: {asset.localized_copy_language} · Impact score: {asset.expected_impact_score_10}/10</p>
    </div>
  );
}

function CmsCopyBlock({ module, item, index }: { module: CmsCopyModule; item: RecommendationModule; index: number }) {
  // Deduplicate: skip introCopy if it's identical or near-identical to bodyCopy or recommendation
  const introText = (module.introCopy || '').trim();
  const bodyText = (module.bodyCopy || '').trim();
  const recText = (item.recommendation || '').trim();
  const introIsDuplicate = !introText
    || introText === bodyText
    || introText === recText
    || (bodyText && introText.length > 20 && bodyText.startsWith(introText.slice(0, 40)));
  return (
    <div className="rounded-[var(--radius-sm)] bg-[var(--bg-panel)] p-3 text-sm leading-6 text-[var(--text-secondary)]">
      <p className="typo-meta text-[var(--text-muted)]">Content recommendation {index + 1}</p>
      <p className="mt-3 font-semibold text-[var(--text-primary)]">{module.heading || item.title}</p>
      {!introIsDuplicate && <p className="mt-2">{introText}</p>}
      {bodyText ? <p className="mt-2">{bodyText}</p> : <p className="mt-2">{recText}</p>}
      {module.bullets?.length ? <ul className="mt-2 list-disc space-y-1 pl-5">{module.bullets.slice(0, 5).map((point) => <li key={point}>{point}</li>)}</ul> : null}
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
  const pack = item.advancedPrAssetPack;
  const [activeTab, setActiveTab] = useState<'overview' | 'asset' | 'publishers' | 'triggers' | 'requirements'>('overview');
  const tabList = ['overview', 'asset', 'publishers', 'triggers', 'requirements'] as const;
  const tabLabels = { overview: 'Overview', asset: 'Asset Pack', publishers: 'Publisher Targets', triggers: 'Semantic Triggers', requirements: 'Requirements' };
  return (
    <div className="mt-4 space-y-3">
      <div className="flex gap-1 overflow-x-auto">
        {tabList.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`whitespace-nowrap rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-semibold ${activeTab === tab ? 'bg-[var(--accent-blue)] text-white' : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
            {tabLabels[tab]}
          </button>
        ))}
      </div>
      {activeTab === 'overview' && (
        <div className="rounded-[var(--radius-sm)] bg-[var(--bg-panel)] p-4 space-y-4">
          {/* Insight */}
          <div>
            <p className="typo-meta text-[var(--accent-blue)] mb-1">Insight</p>
            <p className="text-sm leading-6 text-[var(--text-secondary)]">
              {pack?.insight_summary || item.recommendation || 'AI answers are relying on external publishers for queries in this category. The brand is present in owned pages but lacks third-party proof that AI systems can cite confidently.'}
            </p>
          </div>
          {/* Recommended PR action */}
          <div>
            <p className="typo-meta text-[var(--accent-blue)] mb-1">Recommended PR action</p>
            <p className="text-sm leading-6 text-[var(--text-secondary)]">
              {pack?.recommended_pr_action || item.recommendation || 'Create a third-party-referenceable evidence package covering the key buyer queries in this category.'}
            </p>
          </div>
          {/* Expected visibility impact */}
          <div>
            <p className="typo-meta text-[var(--accent-blue)] mb-1">Expected visibility impact</p>
            <p className="text-sm leading-6 text-[var(--text-secondary)]">
              Targets {item.queryCoverageCount || item.linkedQueryIds?.length || 0} linked queries where the brand is currently external-led or competitor-led. Goal is to increase trusted external citations that mention the brand and support owned-page claims.
            </p>
          </div>
          {/* Priority queries */}
          {(pack?.priority_queries?.length || item.linkedQueryIds?.length) ? (
            <div>
              <p className="typo-meta text-[var(--accent-blue)] mb-1">Priority queries</p>
              <ul className="space-y-0.5">
                {(pack?.priority_queries || item.linkedQueryIds || []).slice(0, 8).map((q, i) => (
                  <li key={i} className="text-xs text-[var(--text-secondary)]">• {q}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {/* Proof required */}
          {(pack?.brand_data_required?.length || pack?.unique_brand_data_required?.length) ? (
            <div>
              <p className="typo-meta text-[var(--accent-blue)] mb-1">Proof required</p>
              <ul className="space-y-0.5">
                {(pack?.brand_data_required || pack?.unique_brand_data_required || []).map((d, i) => (
                  <li key={i} className="text-xs text-[var(--text-secondary)]">• {d.replace(/_/g, ' ')}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
      {activeTab === 'asset' && pack && (
        <div className="rounded-[var(--radius-sm)] bg-[var(--bg-panel)] p-4 space-y-4">
          {/* Asset Concept */}
          <div className="rounded-[var(--radius-sm)] bg-[var(--accent-blue-soft)] border border-[var(--accent-blue)]/20 p-3">
            <p className="typo-meta text-[var(--accent-blue)] mb-1">Asset Concept</p>
            <p className="text-base font-semibold text-[var(--text-primary)]">{pack.asset_concept || pack.asset_name}</p>
          </div>
          {/* Core Claim To Prove */}
          <div>
            <p className="typo-meta text-[var(--accent-purple)] mb-1">Core Claim To Prove</p>
            <p className="text-sm leading-6 text-[var(--text-secondary)]">
              {pack.core_claim_to_prove || pack.information_gain_trigger || 'The single claim the brand wants third parties to validate.'}
            </p>
          </div>
          {/* What To Publish */}
          <div>
            <p className="typo-meta text-[var(--text-muted)] mb-1">What To Publish</p>
            {pack.publishable_assets && pack.publishable_assets.length > 0 ? (
              <ul className="space-y-1">
                {pack.publishable_assets.map((a, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent-success)]"></span> {a}
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="space-y-1">
                <li className="flex items-center gap-2 text-xs text-[var(--text-secondary)]"><span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent-success)]"></span> Data-led press release</li>
                <li className="flex items-center gap-2 text-xs text-[var(--text-secondary)]"><span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent-success)]"></span> Downloadable proof sheet</li>
                <li className="flex items-center gap-2 text-xs text-[var(--text-secondary)]"><span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent-success)]"></span> Expert commentary pitch</li>
              </ul>
            )}
          </div>
          {/* What PR Should Pitch */}
          <div>
            <p className="typo-meta text-[var(--text-muted)] mb-1">What PR Should Pitch</p>
            <div className="rounded-[var(--radius-sm)] bg-[var(--bg-card)] p-3">
              <p className="text-sm font-semibold text-[var(--text-primary)] break-words">{pack.suggested_headline}</p>
              {pack.example_pitch_headline && pack.example_pitch_headline !== pack.suggested_headline && (
                <p className="mt-2 text-xs text-[var(--text-muted)]">Alternative angle: <span className="text-[var(--text-secondary)]">{pack.example_pitch_headline}</span></p>
              )}
              {pack.target_publication_angle && (
                <p className="mt-2 text-xs text-[var(--text-secondary)]">{pack.target_publication_angle}</p>
              )}
            </div>
          </div>
          {/* Brand Data Required */}
          {(pack.brand_data_required?.length || pack.unique_brand_data_required?.length) ? (
            <div className="rounded-[var(--radius-sm)] bg-amber-500/10 border border-amber-500/25 p-3">
              <p className="typo-meta text-amber-300 mb-1">Brand Data Required</p>
              <ul className="space-y-0.5">
                {(pack.brand_data_required || pack.unique_brand_data_required || []).map((d, i) => (
                  <li key={i} className="text-xs text-[var(--text-secondary)]">• {d.replace(/_/g, ' ')}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
      {activeTab === 'asset' && !pack && (
        <div className="rounded-[var(--radius-sm)] bg-[var(--bg-panel)] p-3 text-sm text-[var(--text-muted)]">Asset pack details will be generated by the Bodhi PR workflow node in future runs.</div>
      )}
      {activeTab === 'publishers' && pack && (
        <div className="rounded-[var(--radius-sm)] bg-[var(--bg-panel)] p-4 space-y-4">
          <p className="typo-meta text-[var(--text-muted)]">Publisher Targets — grouped by publisher role</p>
          {/* Render publisher_groups if available from LLM */}
          {pack.publisher_groups && pack.publisher_groups.length > 0 ? (
            <div className="space-y-3">
              {pack.publisher_groups.map((group, i) => (
                <div key={i} className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3 space-y-2">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{group.group}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{group.why_it_matters}</p>
                  {group.observed_domains.length > 0 && (
                    <div>
                      <p className="typo-meta text-[var(--text-muted)] mb-1">Observed source examples</p>
                      <div className="flex flex-wrap gap-1">
                        {group.observed_domains.map((d, j) => (
                          <span key={j} className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-2 py-1 text-xs text-[var(--text-secondary)]">{d}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="typo-meta text-[var(--accent-blue)] mb-0.5">Recommended pitch</p>
                    <p className="text-xs text-[var(--text-secondary)]">{group.pitch_angle}</p>
                  </div>
                  {group.proof_required.length > 0 && (
                    <div>
                      <p className="typo-meta text-amber-300 mb-0.5">Proof assets needed</p>
                      <ul className="space-y-0.5">
                        {group.proof_required.map((p, k) => (
                          <li key={k} className="text-xs text-[var(--text-secondary)]">• {p}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* Fallback: show flat publisher types and domains */
            <>
              <div className="flex flex-wrap gap-1">{pack.target_publisher_types.map((t, i) => <span key={i} className="rounded-full bg-[var(--accent-blue-soft)] border border-[var(--accent-blue)]/20 px-2 py-1 text-xs text-[var(--accent-blue)]">{t.replace(/_/g, ' ')}</span>)}</div>
              {pack.target_domains_observed.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-[var(--text-muted)] mt-2">Observed Domains</p>
                  <div className="flex flex-wrap gap-1">{pack.target_domains_observed.map((d, i) => <span key={i} className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] px-2 py-1 text-xs text-[var(--text-secondary)]">{d}</span>)}</div>
                </>
              )}
            </>
          )}
        </div>
      )}
      {activeTab === 'publishers' && !pack && (
        <div className="rounded-[var(--radius-sm)] bg-[var(--bg-panel)] p-3 text-sm text-[var(--text-muted)]">Publisher target data will be generated by the Bodhi PR workflow node.</div>
      )}
      {activeTab === 'triggers' && pack && (
        <div className="rounded-[var(--radius-sm)] bg-[var(--bg-panel)] p-4 space-y-4">
          <p className="typo-meta text-[var(--text-muted)]">AI Answer Hooks — semantic triggers grouped by theme</p>
          {/* Render semantic_trigger_groups if available from LLM */}
          {pack.semantic_trigger_groups && pack.semantic_trigger_groups.length > 0 ? (
            <div className="space-y-3">
              {pack.semantic_trigger_groups.map((group, i) => (
                <div key={i} className="rounded-[var(--radius-sm)] border border-purple-500/20 bg-purple-500/5 p-3 space-y-2">
                  <p className="text-sm font-semibold text-purple-400">{group.theme}</p>
                  <div>
                    <p className="typo-meta text-[var(--text-muted)] mb-1">Trigger terms</p>
                    <div className="flex flex-wrap gap-1">
                      {group.triggers.map((t, j) => (
                        <span key={j} className="rounded-full bg-purple-500/10 border border-purple-500/20 px-2 py-1 text-xs text-purple-400">{t.replace(/_/g, ' ')}</span>
                      ))}
                    </div>
                  </div>
                  {group.required_evidence.length > 0 && (
                    <div>
                      <p className="typo-meta text-amber-300 mb-0.5">Required proof</p>
                      <ul className="space-y-0.5">
                        {group.required_evidence.map((e, k) => (
                          <li key={k} className="text-xs text-[var(--text-secondary)]">• {e}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* Fallback: show flat trigger chips */
            <div className="flex flex-wrap gap-1">{pack.semantic_triggers.map((t, i) => <span key={i} className="rounded-full bg-purple-500/10 border border-purple-500/20 px-2 py-1 text-xs text-purple-400">{t.replace(/_/g, ' ')}</span>)}</div>
          )}
        </div>
      )}
      {activeTab === 'triggers' && !pack && (
        <div className="rounded-[var(--radius-sm)] bg-[var(--bg-panel)] p-3 text-sm text-[var(--text-muted)]">Semantic trigger data will be generated by the Bodhi PR workflow node.</div>
      )}
      {activeTab === 'requirements' && pack && (
        <div className="rounded-[var(--radius-sm)] bg-[var(--bg-panel)] p-4 space-y-4">
          <p className="typo-meta text-[var(--text-muted)]">PR Production Checklist</p>
          {/* Mandatory brand data */}
          {(pack.brand_data_required?.length || pack.unique_brand_data_required?.length) ? (
            <div>
              <p className="text-xs font-semibold text-[var(--text-primary)] mb-1">Mandatory brand data</p>
              <ul className="space-y-0.5">
                {(pack.brand_data_required || pack.unique_brand_data_required || []).map((d, i) => (
                  <li key={i} className="text-xs text-[var(--text-secondary)]">• {d.replace(/_/g, ' ')}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {/* Legal / compliance checks */}
          {pack.legal_review_required && pack.legal_review_required.length > 0 ? (
            <div>
              <p className="text-xs font-semibold text-[var(--text-primary)] mb-1">Legal / compliance checks</p>
              <ul className="space-y-0.5">
                {pack.legal_review_required.map((r, i) => (
                  <li key={i} className="text-xs text-[var(--text-secondary)]">• {r}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div>
              <p className="text-xs font-semibold text-[var(--text-primary)] mb-1">Legal / compliance checks</p>
              <ul className="space-y-0.5">
                <li className="text-xs text-[var(--text-secondary)]">• No unsupported comparison claims</li>
                <li className="text-xs text-[var(--text-secondary)]">• No stale incentive values</li>
                <li className="text-xs text-[var(--text-secondary)]">• All numeric claims source-linked</li>
                <li className="text-xs text-[var(--text-secondary)]">• All competitor references neutral</li>
              </ul>
            </div>
          )}
          {/* Distribution assets */}
          <div>
            <p className="text-xs font-semibold text-[var(--text-primary)] mb-1">Distribution assets</p>
            <ul className="space-y-0.5">
              {pack.publisher_format_requirements.map((r, i) => (
                <li key={i} className="text-xs text-[var(--text-secondary)]">• {r.replace(/_/g, ' ')}</li>
              ))}
            </ul>
          </div>
          {/* Measurement */}
          {pack.measurement_plan && pack.measurement_plan.length > 0 ? (
            <div>
              <p className="text-xs font-semibold text-[var(--text-primary)] mb-1">Measurement</p>
              <ul className="space-y-0.5">
                {pack.measurement_plan.map((m, i) => (
                  <li key={i} className="text-xs text-[var(--text-secondary)]">• {m}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div>
              <p className="text-xs font-semibold text-[var(--text-primary)] mb-1">Measurement</p>
              <ul className="space-y-0.5">
                <li className="text-xs text-[var(--text-secondary)]">• Track external citations mentioning the brand</li>
                <li className="text-xs text-[var(--text-secondary)]">• Track source type mix</li>
                <li className="text-xs text-[var(--text-secondary)]">• Track linked query visibility score</li>
                <li className="text-xs text-[var(--text-secondary)]">• Track whether AI answers cite new proof asset</li>
              </ul>
            </div>
          )}
        </div>
      )}
      {activeTab === 'requirements' && !pack && (
        <div className="rounded-[var(--radius-sm)] bg-[var(--bg-panel)] p-3 text-sm text-[var(--text-muted)]">PR production checklist will be generated by the Bodhi PR workflow node.</div>
      )}
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
      <div className="grid gap-3">
        {filtered.map((item, index) => <ActionRow key={`${item.source}-${item.target}-${item.action}-${index}`} item={item} />)}
      </div>
    </Card>
  );
}

function ActionRow({ item }: { item: ActionItem }) {
  const target = item.target || item.source || 'No target supplied';
  const isUrl = /^https?:\/\//i.test(target);
  const action = item.action.replace(target, '').replace(/:\s*$/, '').trim() || item.action;
  return (
    <article className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 hover:bg-[var(--bg-card-hover)] transition-colors">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={tone(item.priority)}>{item.priority}</Badge>
            <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-2 py-1 text-xs font-semibold text-[var(--text-secondary)]">Effort {item.effort}</span>
            <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-2 py-1 text-xs font-semibold text-[var(--text-secondary)]">{item.status}</span>
            {(item.workstream || item.source) && <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-2 py-1 text-xs font-semibold text-[var(--text-secondary)]">{item.workstream || item.source}</span>}
          </div>
          <h3 className="mt-3 text-base font-semibold leading-6 text-[var(--text-primary)]">{action}</h3>
          <div className="mt-3 rounded-[var(--radius-sm)] bg-[var(--bg-panel)] p-3 text-sm leading-6 text-[var(--text-secondary)]">
            <p className="typo-meta text-[var(--text-muted)]">Target</p>
            <p className={`${isUrl ? 'break-all font-mono text-xs' : 'break-words'}`}>{target}</p>
          </div>
        </div>
        <div className="grid w-full gap-2 text-sm text-slate-600 sm:grid-cols-3 xl:w-[420px] xl:grid-cols-1">
          <Meta label="Owner" value={item.owner} />
          <Meta label="Category" value={label(item.category || item.dependency || item.targetSourceTypes?.join(', ') || 'Not supplied')} />
          <Meta label="Linked queries" value={String(item.queryCoverageCount || item.linkedQueryIds?.length || 0)} />
        </div>
      </div>
    </article>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[var(--radius-sm)] bg-[var(--bg-panel)] p-3"><p className="typo-meta text-[var(--text-muted)]">{label}</p><p className="mt-1 font-semibold text-[var(--text-primary)]">{value}</p></div>;
}

/* ── JSON-LD Beautified Viewer with Collapse/Expand and Copy ──────────── */

function tryParseJson(value: unknown): unknown {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try { return JSON.parse(trimmed); } catch { return value; }
    }
    return value;
  }
  return value;
}

function JsonLdViewer({ data, label: viewerLabel }: { data: unknown; label: string }) {
  const [copied, setCopied] = useState(false);
  const jsonString = typeof data === 'object' && data !== null
    ? JSON.stringify(data, null, 2)
    : String(data);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = jsonString;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [jsonString]);

  return (
    <div>
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-card)]">
        <span className="text-xs font-semibold text-[var(--accent-purple)]">{viewerLabel}</span>
        <button
          onClick={() => void handleCopy()}
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-colors"
          title="Copy complete JSON-LD object"
        >
          {copied ? <><Check size={12} className="text-[var(--accent-success)]" /> Copied!</> : <><Copy size={12} /> Copy JSON-LD</>}
        </button>
      </div>
      <div className="p-3 font-mono text-xs leading-5 overflow-x-auto max-h-[600px] overflow-y-auto">
        {typeof data === 'object' && data !== null
          ? <CollapsibleJsonNode value={data} depth={0} />
          : <span className="text-[var(--text-secondary)]">{String(data)}</span>
        }
      </div>
    </div>
  );
}

function CollapsibleJsonNode({ value, depth, keyName }: { value: unknown; depth: number; keyName?: string }) {
  const [collapsed, setCollapsed] = useState(depth > 1);
  const indent = depth * 16;

  if (value === null) return <JsonLine indent={indent} keyName={keyName}><span className="text-[var(--text-muted)]">null</span></JsonLine>;
  if (typeof value === 'boolean') return <JsonLine indent={indent} keyName={keyName}><span className="text-[var(--accent-purple)]">{String(value)}</span></JsonLine>;
  if (typeof value === 'number') return <JsonLine indent={indent} keyName={keyName}><span className="text-[var(--accent-blue)]">{String(value)}</span></JsonLine>;
  if (typeof value === 'string') return <JsonLine indent={indent} keyName={keyName}><span className="text-[var(--accent-success)]">"{value}"</span></JsonLine>;

  if (Array.isArray(value)) {
    if (value.length === 0) return <JsonLine indent={indent} keyName={keyName}><span className="text-[var(--text-muted)]">[]</span></JsonLine>;
    return (
      <div>
        <div style={{ paddingLeft: indent }} className="flex items-center gap-1 cursor-pointer select-none hover:bg-[var(--bg-card-hover)] rounded-sm py-0.5" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <ChevronRight size={12} className="text-[var(--text-muted)] flex-shrink-0" /> : <ChevronDown size={12} className="text-[var(--text-muted)] flex-shrink-0" />}
          {keyName && <><span className="text-[var(--accent-blue)]">"{keyName}"</span><span className="text-[var(--text-muted)]">: </span></>}
          <span className="text-[var(--text-muted)]">[</span>
          {collapsed && <span className="text-[var(--text-muted)] ml-1">{value.length} item{value.length !== 1 ? 's' : ''}</span>}
          {collapsed && <span className="text-[var(--text-muted)] ml-1">]</span>}
        </div>
        {!collapsed && (
          <>
            {value.map((item, i) => (
              <div key={i}>
                <CollapsibleJsonNode value={item} depth={depth + 1} />
                {i < value.length - 1 && <span style={{ paddingLeft: (depth + 1) * 16 }} className="text-[var(--text-muted)] block">,</span>}
              </div>
            ))}
            <div style={{ paddingLeft: indent }} className="text-[var(--text-muted)]">]</div>
          </>
        )}
      </div>
    );
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return <JsonLine indent={indent} keyName={keyName}><span className="text-[var(--text-muted)]">{'{}'}</span></JsonLine>;
    return (
      <div>
        <div style={{ paddingLeft: indent }} className="flex items-center gap-1 cursor-pointer select-none hover:bg-[var(--bg-card-hover)] rounded-sm py-0.5" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <ChevronRight size={12} className="text-[var(--text-muted)] flex-shrink-0" /> : <ChevronDown size={12} className="text-[var(--text-muted)] flex-shrink-0" />}
          {keyName && <><span className="text-[var(--accent-blue)]">"{keyName}"</span><span className="text-[var(--text-muted)]">: </span></>}
          <span className="text-[var(--text-muted)]">{'{'}</span>
          {collapsed && <span className="text-[var(--text-muted)] ml-1">{entries.length} key{entries.length !== 1 ? 's' : ''}</span>}
          {collapsed && <span className="text-[var(--text-muted)] ml-1">{'}'}</span>}
        </div>
        {!collapsed && (
          <>
            {entries.map(([k, v], i) => (
              <div key={k}>
                <CollapsibleJsonNode value={v} depth={depth + 1} keyName={k} />
                {i < entries.length - 1 && <span style={{ paddingLeft: (depth + 1) * 16 }} className="text-[var(--text-muted)] block">,</span>}
              </div>
            ))}
            <div style={{ paddingLeft: indent }} className="text-[var(--text-muted)]">{'}'}</div>
          </>
        )}
      </div>
    );
  }

  return <JsonLine indent={indent} keyName={keyName}><span className="text-[var(--text-secondary)]">{String(value)}</span></JsonLine>;
}

function JsonLine({ indent, keyName, children }: { indent: number; keyName?: string; children: React.ReactNode }) {
  return (
    <div style={{ paddingLeft: indent }} className="py-0.5">
      {keyName && <><span className="text-[var(--accent-blue)]">"{keyName}"</span><span className="text-[var(--text-muted)]">: </span></>}
      {children}
    </div>
  );
}
