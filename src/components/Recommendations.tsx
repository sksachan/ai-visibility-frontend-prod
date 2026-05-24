import { useMemo, useState, useEffect } from 'react';
import type { ActionItem, RecommendationModule, ReportBundle, CmsCopyModule, AdvancedGeoAsset, AdvancedPrAssetPack } from '../types/report';
import { Badge, WorkspacePanel, SectionHeader, DarkButton, StatusPill } from './ui';

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
  // Collect direct answer: prefer LLM-merged field first.
  // Only fall back to advancedGeoAsset.direct_answer_40_words if NO LLM module exists for this card.
  // Do NOT use advancedGeoAsset fallback if an LLM module existed but failed to merge — that hides the real issue.
  const directAnswer = item.directAnswer || (isCmsLlmMerged ? '' : (asset?.direct_answer_40_words || ''));
  const primaryQueryId = item.primaryQueryId || item.linkedQueryIds?.[0] || '';
  const primaryQueryText = item.primaryQueryText || '';
  const isCmsLlmMerged = !!item.cms_llm_merged;
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
          {/* Show LLM-generated JSON-LD tags first (from merged CMS output) */}
          {item.jsonLdTags && item.jsonLdTags.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[var(--accent-purple)]">Intent-aware JSON-LD recommendations</p>
              {item.jsonLdTags.map((tag, i) => (
                <div key={i} className="rounded-[var(--radius-sm)] border border-[var(--accent-purple)]/20 bg-[var(--accent-purple)]/5 p-2 text-xs text-[var(--text-secondary)] font-mono break-all">
                  {typeof tag === 'string' ? tag : JSON.stringify(tag, null, 2)}
                </div>
              ))}
            </div>
          )}
          {/* Show advanced asset JSON-LD if available */}
          {asset && (
            <>
              <p className="text-xs text-[var(--text-muted)]">Strategy: <span className="font-semibold text-[var(--text-secondary)]">{asset.json_ld_strategy}</span>{asset.target_anchor_id && <> · Anchor: <code className="text-xs text-[var(--accent-purple)]">{asset.target_anchor_id}</code></>}</p>
              {asset.json_ld_script && <pre className="overflow-x-auto rounded-[var(--radius-sm)] bg-[var(--bg-app)] border border-[var(--border-subtle)] p-3 text-xs text-amber-300">{asset.json_ld_script}</pre>}
              {asset.json_ld_merge_notes.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-[var(--text-muted)]">{asset.json_ld_merge_notes.map((note, i) => <li key={i}>• {note}</li>)}</ul>
              )}
            </>
          )}
          {!asset && (!item.jsonLdTags || item.jsonLdTags.length === 0) && (
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
        <>
          <p className="rounded-[var(--radius-sm)] bg-[var(--bg-panel)] p-3 text-sm leading-6 text-[var(--text-secondary)]">{item.recommendation || 'Overview content will be populated by the Bodhi PR strategy workflow node.'}</p>
          {item.whyItMatters ? <p className="rounded-[var(--radius-sm)] bg-[var(--bg-panel)] p-3 text-sm leading-6 text-[var(--text-secondary)]"><span className="font-semibold text-[var(--text-primary)]">Why it matters:</span> {item.whyItMatters}</p> : null}
          {item.observedExternalDomains?.length ? (
            <div className="rounded-[var(--radius-sm)] bg-[var(--bg-panel)] p-3">
              <p className="typo-meta text-[var(--text-muted)] mb-2">Observed External Domains</p>
              <div className="flex flex-wrap gap-1">{item.observedExternalDomains.slice(0, 10).map((d, i) => <span key={i} className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] px-2 py-1 text-xs text-[var(--text-secondary)]">{d.domain}{d.count ? ` (${d.count})` : ''}</span>)}</div>
            </div>
          ) : null}
          {item.targetSourceTypes?.length ? (
            <div className="rounded-[var(--radius-sm)] bg-[var(--bg-panel)] p-3">
              <p className="typo-meta text-[var(--text-muted)] mb-2">Target Source Types</p>
              <div className="flex flex-wrap gap-1">{item.targetSourceTypes.map((t, i) => <span key={i} className="rounded-full bg-[var(--accent-blue-soft)] border border-[var(--accent-blue)]/20 px-2 py-1 text-xs text-[var(--accent-blue)]">{label(t)}</span>)}</div>
            </div>
          ) : null}
        </>
      )}
      {activeTab === 'asset' && pack && (
        <div className="rounded-[var(--radius-sm)] bg-[var(--bg-panel)] p-3 space-y-2">
          <p className="typo-meta text-[var(--text-muted)]">Asset Pack Details</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-[var(--radius-sm)] bg-[var(--bg-card)] p-2"><p className="text-xs text-[var(--text-muted)]">Asset Name</p><p className="text-sm font-semibold text-[var(--text-primary)]">{pack.asset_name}</p></div>
            <div className="rounded-[var(--radius-sm)] bg-[var(--bg-card)] p-2"><p className="text-xs text-[var(--text-muted)]">Asset Type</p><p className="text-sm font-semibold text-[var(--text-primary)]">{pack.asset_type.replace(/_/g, ' ')}</p></div>
          </div>
          <div className="rounded-[var(--radius-sm)] bg-[var(--accent-blue-soft)] border border-[var(--accent-blue)]/20 p-2"><p className="text-xs text-[var(--accent-blue)] font-semibold">Information Gain Trigger</p><p className="text-sm text-[var(--text-secondary)]">{pack.information_gain_trigger}</p></div>
          <div className="rounded-[var(--radius-sm)] bg-[var(--bg-card)] p-2"><p className="text-xs text-[var(--text-muted)]">Suggested Headline</p><p className="text-sm font-semibold text-[var(--text-primary)] break-words">{pack.suggested_headline}</p></div>
          {pack.example_pitch_headline && pack.example_pitch_headline !== pack.suggested_headline && (
            <div className="rounded-[var(--radius-sm)] bg-[var(--bg-card)] p-2"><p className="text-xs text-[var(--text-muted)]">Example Pitch Headline</p><p className="text-sm font-semibold text-[var(--text-primary)] break-words">{pack.example_pitch_headline}</p></div>
          )}
          {pack.asset_objective && (
            <div className="rounded-[var(--radius-sm)] bg-[var(--accent-blue-soft)] border border-[var(--accent-blue)]/20 p-2"><p className="text-xs text-[var(--accent-blue)] font-semibold">Asset Objective</p><p className="text-sm text-[var(--text-secondary)]">{pack.asset_objective}</p></div>
          )}
          {pack.target_publication_angle && (
            <div className="rounded-[var(--radius-sm)] bg-[var(--bg-card)] p-2"><p className="text-xs text-[var(--text-muted)]">Target Publication Angle</p><p className="text-sm text-[var(--text-secondary)]">{pack.target_publication_angle}</p></div>
          )}
          {pack.proof_gap_addressed && (
            <div className="rounded-[var(--radius-sm)] bg-[var(--bg-card)] p-2"><p className="text-xs text-[var(--text-muted)]">Proof Gap Addressed</p><p className="text-sm text-[var(--text-secondary)]">{pack.proof_gap_addressed}</p></div>
          )}
          <div className="rounded-[var(--radius-sm)] bg-[var(--bg-card)] p-2"><p className="text-xs text-[var(--text-muted)]">Briefing Copy</p><p className="text-sm text-[var(--text-secondary)] break-words">{pack.briefing_copy}</p></div>
          {pack.priority_queries && pack.priority_queries.length > 0 && (
            <div className="rounded-[var(--radius-sm)] bg-[var(--bg-card)] p-2">
              <p className="text-xs text-[var(--text-muted)] font-semibold">Priority Queries</p>
              <ul className="mt-1 space-y-0.5">{pack.priority_queries.slice(0, 5).map((q, i) => <li key={i} className="text-xs text-[var(--text-secondary)]">{i + 1}. {q}</li>)}</ul>
            </div>
          )}
          {pack.unique_brand_data_required.length > 0 && (
            <div className="rounded-[var(--radius-sm)] bg-amber-500/10 border border-amber-500/25 p-2">
              <p className="text-xs text-amber-300 font-semibold">Brand Data Required</p>
              <ul className="mt-1 space-y-0.5">{pack.unique_brand_data_required.map((d, i) => <li key={i} className="text-xs text-[var(--text-secondary)]">• {d.replace(/_/g, ' ')}</li>)}</ul>
            </div>
          )}
        </div>
      )}
      {activeTab === 'asset' && !pack && (
        <div className="rounded-[var(--radius-sm)] bg-[var(--bg-panel)] p-3 text-sm text-[var(--text-muted)]">Asset pack details will be generated by the Bodhi PR workflow node in future runs.</div>
      )}
      {activeTab === 'publishers' && pack && (
        <div className="rounded-[var(--radius-sm)] bg-[var(--bg-panel)] p-3 space-y-2">
          <p className="typo-meta text-[var(--text-muted)]">Publisher Targets</p>
          <div className="flex flex-wrap gap-1">{pack.target_publisher_types.map((t, i) => <span key={i} className="rounded-full bg-[var(--accent-blue-soft)] border border-[var(--accent-blue)]/20 px-2 py-1 text-xs text-[var(--accent-blue)]">{t.replace(/_/g, ' ')}</span>)}</div>
          {pack.target_domains_observed.length > 0 && (
            <><p className="text-xs font-semibold text-[var(--text-muted)] mt-2">Observed Domains</p>
            <div className="flex flex-wrap gap-1">{pack.target_domains_observed.map((d, i) => <span key={i} className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] px-2 py-1 text-xs text-[var(--text-secondary)]">{d}</span>)}</div></>
          )}
        </div>
      )}
      {activeTab === 'publishers' && !pack && (
        <div className="rounded-[var(--radius-sm)] bg-[var(--bg-panel)] p-3 text-sm text-[var(--text-muted)]">Publisher target data will be generated by the Bodhi PR workflow node.</div>
      )}
      {activeTab === 'triggers' && pack && (
        <div className="rounded-[var(--radius-sm)] bg-[var(--bg-panel)] p-3 space-y-2">
          <p className="typo-meta text-[var(--text-muted)]">Semantic Triggers</p>
          <div className="flex flex-wrap gap-1">{pack.semantic_triggers.map((t, i) => <span key={i} className="rounded-full bg-purple-500/10 border border-purple-500/20 px-2 py-1 text-xs text-purple-400">{t.replace(/_/g, ' ')}</span>)}</div>
        </div>
      )}
      {activeTab === 'triggers' && !pack && (
        <div className="rounded-[var(--radius-sm)] bg-[var(--bg-panel)] p-3 text-sm text-[var(--text-muted)]">Semantic trigger data will be generated by the Bodhi PR workflow node.</div>
      )}
      {activeTab === 'requirements' && pack && (
        <div className="rounded-[var(--radius-sm)] bg-[var(--bg-panel)] p-3 space-y-2">
          <p className="typo-meta text-[var(--text-muted)]">Publisher Format Requirements</p>
          <ul className="space-y-1">{pack.publisher_format_requirements.map((r, i) => <li key={i} className="text-xs text-[var(--text-secondary)]">• {r.replace(/_/g, ' ')}</li>)}</ul>
        </div>
      )}
      {activeTab === 'requirements' && !pack && (
        <div className="rounded-[var(--radius-sm)] bg-[var(--bg-panel)] p-3 text-sm text-[var(--text-muted)]">Publisher format requirements will be generated by the Bodhi PR workflow node.</div>
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
