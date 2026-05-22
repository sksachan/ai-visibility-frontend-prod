import type {
  ReportBundle,
  ExecutiveSection,
  HeadlineMetrics,
  CompetitorVisibility,
  TrendPoint,
  QueryDiagnostic,
  OwnedPage,
  RecommendationModule,
  ActionItem,
  CitationExample,
  AiHygiene,
  BrandTopicScorecardRow,
  QueryWorkbenchItem,
  ParserMeta,
  Severity,
  Status,
} from '../types/report';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

type AnyObj = Record<string, unknown>;

function obj(value: unknown): AnyObj {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as AnyObj;
  return {};
}

function arr(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function str(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return fallback;
}

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function bool(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === 1) return true;
  if (value === 'false' || value === 0) return false;
  return fallback;
}

function severity(value: unknown): Severity {
  const s = str(value).toLowerCase();
  if (s === 'high') return 'High';
  if (s === 'low') return 'Low';
  return 'Medium';
}

function status(value: unknown): Status {
  const s = str(value).toLowerCase();
  if (s === 'done' || s === 'completed') return 'Done';
  if (s.includes('progress')) return 'In progress';
  return 'Not started';
}

function effort(value: unknown): 'S' | 'M' | 'L' {
  const s = str(value).toUpperCase();
  if (s === 'S' || s === 'SMALL') return 'S';
  if (s === 'L' || s === 'LARGE') return 'L';
  return 'M';
}

/* ------------------------------------------------------------------ */
/*  Unwrap nested payload wrappers                                     */
/* ------------------------------------------------------------------ */

function unwrap(raw: unknown): AnyObj {
  let current = raw;
  if (typeof current === 'string') {
    try { current = JSON.parse(current); } catch { /* keep */ }
  }
  const o = obj(current);
  const wrapperKeys = ['frontend_report_bundle', 'report_bundle', 'bundle', 'report', 'payload', 'data', 'Preview Node'];
  for (const key of wrapperKeys) {
    if (o[key] && typeof o[key] === 'object') return unwrap(o[key]);
    if (typeof o[key] === 'string') {
      try { return unwrap(JSON.parse(o[key] as string)); } catch { /* skip */ }
    }
  }
  const keys = Object.keys(o);
  if (keys.length === 1 && o[keys[0]] && typeof o[keys[0]] === 'object') {
    const inner = obj(o[keys[0]]);
    if (inner['Preview Node'] || inner.query_workbench || inner.schema_version) return unwrap(inner);
  }
  return o;
}

/* ------------------------------------------------------------------ */
/*  Section parsers                                                    */
/* ------------------------------------------------------------------ */

function parseHeadlineMetrics(raw: unknown): HeadlineMetrics {
  const m = obj(raw);
  return {
    brandScore: num(m.ai_visibility_score ?? m.brand_score ?? m.brandScore),
    ownedTargetCitations: num(m.owned_target_page_citations ?? m.owned_target_citations ?? m.ownedTargetCitations),
    ownedDomainCitations: num(m.owned_domain_citations ?? m.ownedDomainCitations),
    competitorLedQueries: num(m.competitor_led_query_count ?? m.competitor_led_queries ?? m.competitorLedQueries),
    externalLedQueries: num(m.external_led_query_count ?? m.external_led_queries ?? m.externalLedQueries),
    queryCount: m.query_count != null ? num(m.query_count) : m.queryCount != null ? num(m.queryCount) : undefined,
    ownedPageCount: m.owned_page_count != null ? num(m.owned_page_count) : m.ownedPageCount != null ? num(m.ownedPageCount) : undefined,
    externalSourceCount: m.external_source_count != null ? num(m.external_source_count) : m.externalSourceCount != null ? num(m.externalSourceCount) : undefined,
    averageOwnedGeoScore120: m.average_owned_geo_score_120 != null ? num(m.average_owned_geo_score_120) : m.averageOwnedGeoScore120 != null ? num(m.averageOwnedGeoScore120) : undefined,
  };
}

function parseScorecardRow(raw: unknown): BrandTopicScorecardRow {
  const r = obj(raw);
  return {
    topic: str(r.topic),
    aiVisibilityScore: r.aiVisibilityScore != null ? num(r.aiVisibilityScore) : r.ai_visibility_score != null ? num(r.ai_visibility_score) : null,
    relativePosition: str(r.relativePosition ?? r.relative_position),
    directionVsLastPeriod: str(r.directionVsLastPeriod ?? r.direction_vs_last_period),
    comment: str(r.comment),
    queryCount: r.queryCount != null ? num(r.queryCount) : r.query_count != null ? num(r.query_count) : undefined,
    ownedUrlCount: r.ownedUrlCount != null ? num(r.ownedUrlCount) : r.owned_url_count != null ? num(r.owned_url_count) : undefined,
    citationCount: r.citationCount != null ? num(r.citationCount) : r.citation_count != null ? num(r.citation_count) : undefined,
  };
}

function parseExecutive(raw: unknown): ExecutiveSection {
  const e = obj(raw);
  const metrics = parseHeadlineMetrics(e.headline_metrics ?? e.headlineMetrics ?? e);
  return {
    summary: str(e.summary),
    whatIsHappening: arr(e.what_is_happening ?? e.whatIsHappening).map(String),
    whyNow: arr(e.why_now ?? e.whyNow).map(String),
    priorityActions: arr(e.priority_actions ?? e.priorityActions).map(String),
    riskIfNoAction: e.risk_if_no_action != null ? str(e.risk_if_no_action) : e.riskIfNoAction != null ? str(e.riskIfNoAction) : undefined,
    recommendedNextSteps: e.recommended_next_steps ? arr(e.recommended_next_steps).map(String) : e.recommendedNextSteps ? arr(e.recommendedNextSteps).map(String) : undefined,
    headlineMetrics: metrics,
    brandTopicScorecard: e.brandTopicScorecard ? arr(e.brandTopicScorecard).map(parseScorecardRow) : e.brand_topic_scorecard ? arr(e.brand_topic_scorecard).map(parseScorecardRow) : undefined,
  };
}

function parseCitation(raw: unknown): CitationExample {
  const c = obj(raw);
  return {
    title: str(c.title),
    url: str(c.url ?? c.source_url),
    domain: str(c.domain ?? c.source_domain),
    sourceType: str(c.sourceType ?? c.source_type),
    citationPosition: c.citation_position != null ? num(c.citation_position) : c.citationPosition != null ? num(c.citationPosition) : c.rank != null ? num(c.rank) : undefined,
    snippet: str(c.snippet ?? c.text ?? c.citation_text),
    queryId: str(c.queryId ?? c.query_id),
    query: str(c.query),
  };
}

function parseQuery(raw: unknown): QueryDiagnostic {
  const q = obj(raw);
  const vis = obj(q.current_ai_visibility);
  return {
    id: str(q.query_id ?? q.id),
    query: str(q.query),
    journey: str(q.journey_category ?? q.journey ?? q.query_type),
    visibilityStatus: str(vis.status ?? q.visibility_status ?? q.visibilityStatus),
    ownedTargetPageCited: bool(vis.owned_target_cited ?? q.owned_target_page_cited ?? q.ownedTargetPageCited),
    ownedDomainCited: vis.owned_domain_cited != null ? bool(vis.owned_domain_cited) : q.owned_domain_cited != null ? bool(q.owned_domain_cited) : undefined,
    winningExternalSourceTypes: arr(q.winning_external_source_types ?? q.winningExternalSourceTypes).map(String),
    ownedGeoScore120: num(q.owned_geo_score_120 ?? q.ownedGeoScore120),
    externalBenchmarkScore: num(q.external_benchmark_score ?? q.externalBenchmarkScore),
    sourcePreferenceGap: num(q.source_preference_gap ?? q.sourcePreferenceGap),
    gapReasons: arr(q.gap_reasons ?? q.gapReasons).map(String),
    citations: arr(vis.top_citations ?? q.citations).map(parseCitation),
    brandPosition: num(q.brand_position ?? q.brandPosition),
    leadingCompetitor: str(q.leading_competitor ?? q.leadingCompetitor),
    leadingPublisher: str(q.leading_publisher ?? q.leadingPublisher),
    sourceType: str(q.source_type ?? q.sourceType),
    citationLikelihood: num(q.citation_likelihood ?? q.citationLikelihood),
    confidence: num(q.confidence),
    aiVisibilityScore: vis.score != null ? num(vis.score) : q.ai_visibility_score != null ? num(q.ai_visibility_score) : undefined,
    issue: str(q.issue),
    recommendedMove: str(q.recommended_move ?? q.recommendedMove),
  };
}

function parseOwnedPage(raw: unknown): OwnedPage {
  const p = obj(raw);
  const dims = obj(p.geo_dimensions ?? p.geoDimensions);
  const tech = obj(p.technical_signals ?? p.technicalSignals);
  const relatedQueries = arr(p.related_queries ?? p.relatedQueries).map((rq) => {
    const r = obj(rq);
    return { id: str(r.id ?? r.query_id), query: str(r.query), visibilityStatus: str(r.visibility_status ?? r.visibilityStatus) || undefined };
  });
  return {
    url: str(p.url),
    title: str(p.title) || undefined,
    journeyCategory: str(p.journey_category ?? p.journeyCategory ?? p.inventory_source ?? 'Uncategorised'),
    mappedQuery: str(p.mapped_query ?? p.mappedQuery),
    relatedQueries,
    geoScore: num(p.page_geo_score_120 ?? p.geo_score ?? p.geoScore ?? p.current_geo_score_120),
    scoreBand: str(p.score_band ?? p.scoreBand) || undefined,
    clarity: num(dims.clarity ?? p.clarity),
    semanticDepth: num(dims.semantic_depth ?? dims.semanticDepth ?? p.semantic_depth ?? p.semanticDepth),
    evidence: num(dims.evidence ?? p.evidence),
    structure: num(dims.structure ?? dims.structured_data ?? p.structure),
    freshness: num(dims.freshness ?? p.freshness),
    authority: num(dims.authority ?? dims.e_e_a_t ?? p.authority),
    faqReadiness: dims.faq_readiness != null ? num(dims.faq_readiness) : p.faq_readiness != null ? num(p.faq_readiness) : undefined,
    diagnostics: arr(p.diagnostics ?? p.geo_gaps).map(String),
    queryMapped: p.query_mapped != null ? bool(p.query_mapped) : p.queryMapped != null ? bool(p.queryMapped) : undefined,
    inventorySource: str(p.inventory_source ?? p.inventorySource) || undefined,
    scoringMethod: str(p.scoring_method ?? p.scoringMethod) || undefined,
    scoringNotes: str(p.scoring_notes ?? p.scoringNotes) || undefined,
    technicalSignals: Object.keys(tech).length ? {
      jsonLdPresent: tech.json_ld_present != null ? bool(tech.json_ld_present) : tech.jsonLdPresent != null ? bool(tech.jsonLdPresent) : undefined,
      schemaTypes: tech.schema_types ? arr(tech.schema_types).map(String) : tech.schemaTypes ? arr(tech.schemaTypes).map(String) : undefined,
      robotsMeta: str(tech.robots_meta ?? tech.robotsMeta) || undefined,
      canonicalUrl: str(tech.canonical_url ?? tech.canonicalUrl) || undefined,
      metaDescriptionPresent: tech.meta_description_present != null ? bool(tech.meta_description_present) : undefined,
      crawlStatus: str(tech.crawl_status ?? tech.crawlStatus) || undefined,
      wordCount: tech.word_count != null ? num(tech.word_count) : tech.wordCount != null ? num(tech.wordCount) : undefined,
      markdownChars: tech.markdown_chars != null ? num(tech.markdown_chars) : tech.markdownChars != null ? num(tech.markdownChars) : undefined,
    } : undefined,
  };
}

function parseCmsModule(raw: unknown): RecommendationModule {
  const r = obj(raw);
  return {
    title: str(r.title ?? r.recommendation_title ?? r.module_type),
    targetUrl: str(r.target_url ?? r.targetUrl ?? r.url),
    recommendation: str(r.recommendation ?? r.summary ?? r.description),
    evidencePattern: str(r.evidence_pattern ?? r.evidencePattern ?? r.evidence_basis),
    priority: severity(r.priority),
    owner: str(r.owner ?? r.workstream ?? 'CMS'),
    journeyCategory: str(r.journey_category ?? r.journeyCategory) || undefined,
    moduleType: str(r.module_type ?? r.moduleType) || undefined,
    placement: str(r.recommended_placement ?? r.placement) || undefined,
    sourceRecommendationId: str(r.source_recommendation_id ?? r.sourceRecommendationId) || undefined,
    copyModules: r.copy_modules ? arr(r.copy_modules).map((cm) => {
      const c = obj(cm);
      return {
        moduleId: str(c.module_id ?? c.moduleId) || undefined,
        moduleType: str(c.module_type ?? c.moduleType) || undefined,
        heading: str(c.heading) || undefined,
        introCopy: str(c.intro_copy ?? c.introCopy) || undefined,
        bodyCopy: str(c.body_copy ?? c.bodyCopy) || undefined,
        bullets: c.bullets ? arr(c.bullets).map(String) : undefined,
        faqItems: c.faq_items ? arr(c.faq_items).map((f) => ({ question: str(obj(f).question), answer: str(obj(f).answer) })) : undefined,
      };
    }) : undefined,
  };
}

function parsePrOpportunity(raw: unknown): RecommendationModule {
  const r = obj(raw);
  return {
    title: str(r.title ?? r.group_name ?? r.opportunity_name),
    targetUrl: str(r.target_url ?? r.targetUrl ?? ''),
    recommendation: str(r.recommendation ?? r.summary ?? r.description ?? r.strategic_rationale),
    evidencePattern: str(r.evidence_pattern ?? r.evidencePattern ?? r.evidence_basis),
    priority: severity(r.priority),
    owner: str(r.owner ?? r.workstream ?? 'PR'),
    targetSourceTypes: r.target_source_types ? arr(r.target_source_types).map(String) : undefined,
    observedExternalDomains: r.observed_external_domains ? arr(r.observed_external_domains).map((d) => ({ domain: str(obj(d).domain), count: obj(d).count != null ? num(obj(d).count) : undefined })) : undefined,
  };
}

function parseAction(raw: unknown): ActionItem {
  const a = obj(raw);
  return {
    action: str(a.action ?? a.title ?? a.description),
    owner: str(a.owner ?? a.workstream),
    priority: severity(a.priority),
    effort: effort(a.effort),
    status: status(a.status),
    category: str(a.category ?? a.workstream) || undefined,
    source: str(a.source) || undefined,
    target: str(a.target ?? a.target_url) || undefined,
  };
}

function parseHygiene(raw: unknown): AiHygiene {
  const h = obj(raw);
  const sd = obj(h.structured_data ?? h.json_ld_schema);
  return {
    priority: str(h.priority) || undefined,
    summary: str(h.summary) || undefined,
    robots_txt: h.robots_txt ? obj(h.robots_txt) as AiHygiene['robots_txt'] : undefined,
    llms_txt: h.llms_txt ? obj(h.llms_txt) as AiHygiene['llms_txt'] : undefined,
    structured_data: Object.keys(sd).length ? {
      owned_pages_total: sd.owned_pages_total != null ? num(sd.owned_pages_total) : undefined,
      pages_with_schema: sd.pages_with_schema != null ? num(sd.pages_with_schema) : undefined,
      pages_with_json_ld: sd.pages_with_json_ld != null ? num(sd.pages_with_json_ld) : undefined,
      coverage_pct: sd.coverage_pct != null ? num(sd.coverage_pct) : undefined,
    } : undefined,
  };
}

/* ------------------------------------------------------------------ */
/*  Main normaliser                                                    */
/* ------------------------------------------------------------------ */

export function normaliseReport(raw: unknown): ReportBundle {
  const data = unwrap(raw);
  const warnings: string[] = [];

  const exec = obj(data.executive ?? data.executive_summary);
  const execSummary = obj(data.executive_summary);
  const mergedExec = { ...exec };
  if (execSummary.summary && !mergedExec.summary) mergedExec.summary = execSummary.summary;
  if (execSummary.brandTopicScorecard && !mergedExec.brandTopicScorecard) mergedExec.brandTopicScorecard = execSummary.brandTopicScorecard;

  const executive = parseExecutive(mergedExec);
  const metrics = executive.headlineMetrics;

  const queryWorkbenchRaw = arr(data.query_workbench ?? data.queryWorkbench);
  const queries: QueryDiagnostic[] = queryWorkbenchRaw.map(parseQuery);
  if (!queries.length) warnings.push('No query_workbench array found in payload.');

  const ownedPagesRaw = arr(data.owned_url_readiness ?? data.ownedPages ?? data.owned_pages);
  const ownedPages: OwnedPage[] = ownedPagesRaw.map(parseOwnedPage);
  if (!ownedPages.length) warnings.push('No owned_url_readiness array found in payload.');

  const cmsRaw = arr(data.page_level_cms_recommendations ?? data.cmsModules ?? data.cms_recommendations);
  const cmsModules: RecommendationModule[] = cmsRaw.map(parseCmsModule);

  const prRaw = arr(data.grouped_pr_opportunities ?? data.prOpportunities ?? data.pr_opportunities);
  const prOpportunities: RecommendationModule[] = prRaw.map(parsePrOpportunity);

  const actionsRaw = arr(data.action_checklist ?? data.actionChecklist ?? data.actions);
  const actionChecklist: ActionItem[] = actionsRaw.map(parseAction);

  const sl = obj(data.source_landscape ?? data.sourceLandscape);
  const sourceLandscape = {
    sourceTypeCounts: arr(sl.source_type_counts ?? sl.sourceTypeCounts).map((s) => ({ sourceType: str(obj(s).source_type ?? obj(s).sourceType), count: num(obj(s).count) })),
    observedNonOwnedDomains: arr(sl.observed_non_owned_domains ?? sl.observedNonOwnedDomains).map((d) => ({
      domain: str(obj(d).domain),
      sourceType: str(obj(d).source_type ?? obj(d).sourceType),
      observedCount: num(obj(d).observed_count ?? obj(d).observedCount ?? obj(d).count),
      exampleUrl: str(obj(d).example_url ?? obj(d).exampleUrl) || undefined,
      exampleQuery: str(obj(d).example_query ?? obj(d).exampleQuery) || undefined,
    })),
    winningSourcePatterns: arr(sl.winning_source_patterns ?? sl.winningSourcePatterns).map((w) => ({
      sourceType: str(obj(w).source_type ?? obj(w).sourceType),
      citationCount: num(obj(w).citation_count ?? obj(w).citationCount),
      winningPattern: str(obj(w).winning_pattern ?? obj(w).winningPattern),
    })),
    sourceCitations: sl.source_citations ? arr(sl.source_citations).map(parseCitation) : undefined,
  };

  const trendRaw = arr(data.trend ?? data.trends);
  const trend: TrendPoint[] = trendRaw.map((t) => ({
    period: str(obj(t).period),
    brandScore: num(obj(t).brand_score ?? obj(t).brandScore),
    ownedCitations: num(obj(t).owned_citations ?? obj(t).ownedCitations),
    competitorPressure: num(obj(t).competitor_pressure ?? obj(t).competitorPressure),
  }));

  const hygieneRaw = data.ai_discoverability_hygiene ?? data.site_ai_hygiene ?? data.aiHygiene;
  const aiHygiene = hygieneRaw ? parseHygiene(hygieneRaw) : undefined;

  const queryWorkbench: QueryWorkbenchItem[] = queryWorkbenchRaw.map((qw) => qw as QueryWorkbenchItem);

  const brandVsCompetitors: CompetitorVisibility[] = arr(
    obj(data.visibility ?? data.competitor_landscape).brandVsCompetitors ??
    obj(data.visibility ?? data.competitor_landscape).brand_vs_competitors ?? []
  ).map((c) => ({
    name: str(obj(c).name ?? obj(c).brand),
    visibility: num(obj(c).visibility),
    citationShare: num(obj(c).citation_share ?? obj(c).citationShare),
    sentiment: num(obj(c).sentiment),
    position: (str(obj(c).position) || 'Watchlist') as CompetitorVisibility['position'],
  }));

  const parserMeta: ParserMeta = {
    source: data.schema_version ? 'canonical-report' : 'api-report',
    parsedAt: new Date().toISOString(),
    queryCount: queries.length,
    ownedPageCount: ownedPages.length,
    cmsModuleCount: cmsModules.length,
    prOpportunityCount: prOpportunities.length,
    actionCount: actionChecklist.length,
    warnings,
  };

  return {
    runId: str(data.run_id ?? data.runId ?? 'unknown'),
    brand: str(data.brand ?? 'Unknown'),
    market: str(data.market ?? 'Unknown'),
    domain: str(data.domain) || undefined,
    generatedAt: str(data.generated_at ?? data.generatedAt ?? new Date().toISOString()),
    evidenceDate: str(data.evidence_date ?? data.evidenceDate ?? str(data.generated_at ?? data.generatedAt).slice(0, 10)),
    schemaVersion: str(data.schema_version ?? data.schemaVersion) || undefined,
    contractVersion: str(data.contract_version ?? data.contractVersion) || undefined,
    executive,
    visibility: {
      brandScore: metrics.brandScore,
      ownedTargetCitations: metrics.ownedTargetCitations,
      ownedDomainCitations: metrics.ownedDomainCitations,
      competitorLedQueries: metrics.competitorLedQueries,
      externalLedQueries: metrics.externalLedQueries,
      brandVsCompetitors,
    },
    sourceLandscape,
    trend,
    queries,
    ownedPages,
    cmsModules,
    prOpportunities,
    actionChecklist,
    queryWorkbench,
    parserMeta,
    aiHygiene,
  };
}
