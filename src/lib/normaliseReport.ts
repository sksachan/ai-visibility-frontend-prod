import type {
  ReportBundle, ExecutiveSection, HeadlineMetrics, QueryDiagnostic,
  OwnedPage, RecommendationModule, ActionItem, CompetitorVisibility,
  SourceTypeCount, TrendPoint, CitationExample, AiHygiene,
  QueryWorkbenchItem, BrandTopicScorecardRow, CmsCopyModule,
} from '../types/report';

// ── Helpers ──────────────────────────────────────────────────────────────────

function str(v: unknown): string { return typeof v === 'string' ? v : String(v ?? ''); }
function num(v: unknown): number { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function arr<T>(v: unknown): T[] { return Array.isArray(v) ? v : []; }
function obj(v: unknown): Record<string, unknown> { return v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {}; }
function bool(v: unknown): boolean { return v === true || v === 'true' || v === 1; }

function first<T>(record: Record<string, unknown>, ...keys: string[]): T | undefined {
  for (const k of keys) if (record[k] !== undefined && record[k] !== null) return record[k] as T;
  return undefined;
}

// ── Main normaliser ─────────────────────────────────────────────────────────

export function normaliseReport(raw: unknown): ReportBundle {
  const r = obj(raw);

  // Unwrap common wrappers
  const payload = unwrap(r);
  const p = obj(payload);

  // Top-level identifiers
  const runId = str(p.run_id ?? p.runId ?? p.evidence_run_id ?? '');
  const brand = str(p.brand ?? '');
  const market = str(p.market ?? '');
  const generatedAt = str(p.generated_at ?? p.generatedAt ?? p.created_at ?? new Date().toISOString());
  const evidenceDate = str(p.evidence_date ?? p.evidenceDate ?? generatedAt.slice(0, 10));

  // Executive
  const exec = obj(p.executive ?? p.executive_summary ?? {});
  const hm = obj(exec.headline_metrics ?? exec.headlineMetrics ?? p.headline_metrics ?? {});
  const headlineMetrics = parseHeadlineMetrics(hm);
  const executive = parseExecutive(exec, headlineMetrics, p);

  // Visibility
  const vis = obj(p.visibility ?? {});
  const visibility = {
    brandScore: num(vis.brandScore ?? vis.brand_score ?? headlineMetrics.brandScore),
    ownedTargetCitations: num(vis.ownedTargetCitations ?? vis.owned_target_citations ?? headlineMetrics.ownedTargetCitations),
    ownedDomainCitations: num(vis.ownedDomainCitations ?? vis.owned_domain_citations ?? headlineMetrics.ownedDomainCitations),
    competitorLedQueries: num(vis.competitorLedQueries ?? vis.competitor_led_queries ?? headlineMetrics.competitorLedQueries),
    externalLedQueries: num(vis.externalLedQueries ?? vis.external_led_queries ?? headlineMetrics.externalLedQueries),
    brandVsCompetitors: arr<Record<string, unknown>>(vis.brandVsCompetitors ?? vis.brand_vs_competitors ?? vis.competitors ?? []).map(parseCompetitor),
  };

  // Source landscape
  const sl = obj(p.source_landscape ?? p.sourceLandscape ?? {});
  const sourceLandscape = {
    sourceTypeCounts: arr<Record<string, unknown>>(sl.source_type_counts ?? sl.sourceTypeCounts ?? []).map(parseSourceTypeCount),
    observedNonOwnedDomains: arr<Record<string, unknown>>(sl.observed_non_owned_domains ?? sl.observedNonOwnedDomains ?? []).map((d) => ({
      domain: str(d.domain ?? d.source_domain),
      sourceType: str(d.source_type ?? d.sourceType),
      observedCount: num(d.observed_count ?? d.observedCount ?? d.count),
      exampleUrl: str(d.example_url ?? d.exampleUrl ?? ''),
      exampleQuery: str(d.example_query ?? d.exampleQuery ?? ''),
    })),
    winningSourcePatterns: arr<Record<string, unknown>>(sl.winning_source_patterns ?? sl.winningSourcePatterns ?? []).map((w) => ({
      sourceType: str(w.source_type ?? w.sourceType),
      citationCount: num(w.citation_count ?? w.citationCount ?? w.count),
      winningPattern: str(w.winning_pattern ?? w.winningPattern ?? w.pattern),
    })),
    sourceCitations: arr<Record<string, unknown>>(sl.source_citations ?? sl.sourceCitations ?? []).map(parseCitation),
  };

  // Trend
  const trend = arr<Record<string, unknown>>(p.trend ?? p.trends ?? []).map(parseTrend);

  // Queries
  const queries = arr<Record<string, unknown>>(p.queries ?? p.query_diagnostics ?? []).map(parseQuery);

  // Owned pages — from owned_url_readiness (canonical) or owned_pages
  const ownedPages = arr<Record<string, unknown>>(p.owned_url_readiness ?? p.ownedPages ?? p.owned_pages ?? []).map(parseOwnedPage);

  // CMS modules
  const cmsModules = arr<Record<string, unknown>>(p.page_level_cms_recommendations ?? p.cmsModules ?? p.cms_modules ?? p.cms_recommendations ?? []).map(parseRecommendation);

  // PR opportunities
  const prOpportunities = arr<Record<string, unknown>>(p.grouped_pr_opportunities ?? p.prOpportunities ?? p.pr_opportunities ?? p.pr_recommendations ?? []).map(parseRecommendation);

  // Action checklist
  const actionChecklist = arr<Record<string, unknown>>(p.action_checklist ?? p.actionChecklist ?? p.actions ?? []).map(parseAction);

  // Query workbench
  const qw = arr<Record<string, unknown>>(p.query_workbench ?? p.queryWorkbench ?? []);
  const queryWorkbench = qw.length ? qw.map(parseQueryWorkbenchItem) : undefined;

  // AI hygiene
  const hyg = p.ai_discoverability_hygiene ?? p.site_ai_hygiene ?? p.aiHygiene;
  const aiHygiene = hyg ? parseAiHygiene(obj(hyg)) : undefined;

  return {
    runId, brand, market, generatedAt, evidenceDate,
    executive, visibility, sourceLandscape, trend,
    queries, ownedPages, cmsModules, prOpportunities, actionChecklist,
    queryWorkbench, aiHygiene,
  };
}

// ── Unwrap nested wrappers ──────────────────────────────────────────────────

function unwrap(r: Record<string, unknown>): Record<string, unknown> {
  const wrapperKeys = ['frontend_report_bundle', 'report_bundle', 'bundle', 'report', 'payload', 'data', 'Preview Node'];
  for (const key of wrapperKeys) {
    const v = r[key];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      return unwrap(v as Record<string, unknown>);
    }
    if (typeof v === 'string') {
      try { const parsed = JSON.parse(v); if (parsed && typeof parsed === 'object') return unwrap(parsed); } catch { /* skip */ }
    }
  }
  // Check for single-key wrapper
  const keys = Object.keys(r);
  if (keys.length === 1) {
    const inner = r[keys[0]];
    if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
      const innerObj = inner as Record<string, unknown>;
      if (innerObj['Preview Node'] || innerObj.query_workbench || innerObj.schema_version) {
        return unwrap(innerObj);
      }
    }
  }
  return r;
}

// ── Parsers ─────────────────────────────────────────────────────────────────

function parseHeadlineMetrics(hm: Record<string, unknown>): HeadlineMetrics {
  return {
    brandScore: num(hm.brand_score ?? hm.brandScore ?? hm.ai_visibility_score),
    ownedTargetCitations: num(hm.owned_target_citations ?? hm.ownedTargetCitations),
    ownedDomainCitations: num(hm.owned_domain_citations ?? hm.ownedDomainCitations),
    competitorLedQueries: num(hm.competitor_led_queries ?? hm.competitorLedQueries),
    externalLedQueries: num(hm.external_led_queries ?? hm.externalLedQueries),
    queryCount: first(hm, 'query_count', 'queryCount') != null ? num(first(hm, 'query_count', 'queryCount')) : undefined,
    ownedPageCount: first(hm, 'owned_page_count', 'ownedPageCount') != null ? num(first(hm, 'owned_page_count', 'ownedPageCount')) : undefined,
    averageOwnedGeoScore120: first(hm, 'average_owned_geo_score_120', 'averageOwnedGeoScore120') != null ? num(first(hm, 'average_owned_geo_score_120', 'averageOwnedGeoScore120')) : undefined,
  };
}

function parseExecutive(exec: Record<string, unknown>, hm: HeadlineMetrics, p: Record<string, unknown>): ExecutiveSection {
  const scorecard = arr<Record<string, unknown>>(exec.brand_topic_scorecard ?? exec.brandTopicScorecard ?? p.brand_topic_scorecard ?? []);
  return {
    summary: str(exec.summary ?? exec.executive_summary ?? ''),
    whatIsHappening: arr<string>(exec.what_is_happening ?? exec.whatIsHappening ?? []),
    whyNow: arr<string>(exec.why_now ?? exec.whyNow ?? []),
    priorityActions: arr<string>(exec.priority_actions ?? exec.priorityActions ?? []),
    riskIfNoAction: str(exec.risk_if_no_action ?? exec.riskIfNoAction ?? ''),
    headlineMetrics: hm,
    brandTopicScorecard: scorecard.length ? scorecard.map(parseScorecardRow) : undefined,
  };
}

function parseScorecardRow(r: Record<string, unknown>): BrandTopicScorecardRow {
  return {
    topic: str(r.topic),
    aiVisibilityScore: r.ai_visibility_score != null ? num(r.ai_visibility_score) : null,
    relativePosition: str(r.relative_position ?? r.relativePosition),
    directionVsLastPeriod: str(r.direction_vs_last_period ?? r.directionVsLastPeriod),
    comment: str(r.comment),
  };
}

function parseCompetitor(r: Record<string, unknown>): CompetitorVisibility {
  return {
    name: str(r.name ?? r.brand),
    visibility: num(r.visibility ?? r.visibility_score),
    citationShare: num(r.citation_share ?? r.citationShare),
    sentiment: num(r.sentiment ?? r.sentiment_score),
    position: (str(r.position ?? r.market_position) || 'Watchlist') as CompetitorVisibility['position'],
  };
}

function parseSourceTypeCount(r: Record<string, unknown>): SourceTypeCount {
  return { sourceType: str(r.source_type ?? r.sourceType), count: num(r.count ?? r.citation_count) };
}

function parseTrend(r: Record<string, unknown>): TrendPoint {
  return {
    period: str(r.period ?? r.week ?? r.date),
    brandScore: num(r.brand_score ?? r.brandScore ?? r.ai_visibility_score),
    ownedCitations: num(r.owned_citations ?? r.ownedCitations ?? r.owned_domain_citations),
    competitorPressure: num(r.competitor_pressure ?? r.competitorPressure),
  };
}

function parseCitation(r: Record<string, unknown>): CitationExample {
  return {
    title: str(r.title ?? r.page_title),
    url: str(r.url ?? r.source_url),
    domain: str(r.domain ?? r.source_domain),
    sourceType: str(r.source_type ?? r.sourceType),
    citationPosition: r.citation_position != null ? num(r.citation_position) : undefined,
    snippet: str(r.snippet ?? r.text ?? ''),
    queryId: str(r.query_id ?? r.queryId ?? ''),
    query: str(r.query ?? ''),
  };
}

function parseQuery(r: Record<string, unknown>): QueryDiagnostic {
  const vis = obj(r.current_ai_visibility ?? r.visibility ?? {});
  return {
    id: str(r.query_id ?? r.id),
    query: str(r.query),
    journey: str(r.journey || r.journey_category || r.journey_stage),
    visibilityStatus: str(r.visibilityStatus || r.visibility_status || vis.status),
    ownedTargetPageCited: bool(r.ownedTargetPageCited ?? r.owned_target_page_cited ?? vis.owned_target_cited),
    ownedDomainCited: r.ownedDomainCited != null ? bool(r.ownedDomainCited) : r.owned_domain_cited != null ? bool(r.owned_domain_cited) : vis.owned_domain_cited != null ? bool(vis.owned_domain_cited) : null,
    winningExternalSourceTypes: arr<string>(r.winningExternalSourceTypes || r.winning_external_source_types),
    ownedGeoScore120: num(r.ownedGeoScore120 ?? r.owned_geo_score_120),
    externalBenchmarkScore: num(r.externalBenchmarkScore ?? r.external_benchmark_score),
    sourcePreferenceGap: num(r.sourcePreferenceGap ?? r.source_preference_gap),
    gapReasons: arr<string>(r.gapReasons || r.gap_reasons),
    citations: arr<Record<string, unknown>>(r.citations || vis.top_citations || []).map(parseCitation),
    brandPosition: num(r.brandPosition ?? r.brand_position),
    leadingCompetitor: str(r.leadingCompetitor ?? r.leading_competitor),
    leadingPublisher: str(r.leadingPublisher ?? r.leading_publisher),
    sourceType: str(r.sourceType ?? r.source_type),
    citationLikelihood: num(r.citationLikelihood ?? r.citation_likelihood),
    confidence: num(r.confidence),
    issue: str(r.issue ?? r.gap_summary),
    recommendedMove: str(r.recommendedMove ?? r.recommended_move ?? r.recommendation),
  };
}

function parseOwnedPage(r: Record<string, unknown>): OwnedPage {
  const dims = obj(r.geo_dimensions ?? r.geoDimensions ?? {});
  const tech = obj(r.technical_signals ?? r.technicalSignals ?? {});
  return {
    url: str(r.url ?? r.page_url),
    title: str(r.title ?? r.page_title ?? ''),
    journeyCategory: str(r.journey_category ?? r.journeyCategory ?? r.journey ?? ''),
    evidenceMatchStatus: str(r.evidence_match_status ?? r.evidenceMatchStatus ?? ''),
    mappedQuery: str(r.mapped_query ?? r.mappedQuery ?? ''),
    relatedQueries: arr<Record<string, unknown>>(r.related_queries ?? r.relatedQueries ?? r.mapped_queries ?? []).map((q) => ({
      id: str(q.query_id ?? q.id),
      query: str(q.query),
      visibilityStatus: str(q.visibility_status ?? q.visibilityStatus ?? ''),
    })),
    geoScore: num(r.current_geo_score_120 ?? r.geo_score_120 ?? r.geoScore ?? r.geo_score),
    scoreBand: str(r.score_band ?? r.scoreBand ?? ''),
    clarity: num(r.clarity ?? dims.content_clarity ?? 0),
    semanticDepth: num(r.semantic_depth ?? r.semanticDepth ?? dims.semantic_depth ?? 0),
    evidence: num(r.evidence ?? r.eeat ?? r.eeat_signals ?? dims.eeat_signals ?? 0),
    structure: num(r.structure ?? r.structured_data ?? dims.structured_data ?? 0),
    freshness: num(r.freshness ?? r.freshness_index ?? dims.freshness_index ?? 0),
    authority: num(r.authority ?? 0),
    faqReadiness: r.faq_readiness != null || r.faqReadiness != null || dims.faq_readiness != null ? num(r.faq_readiness ?? r.faqReadiness ?? dims.faq_readiness) : undefined,
    diagnostics: arr<string>(r.diagnostics || r.geo_gaps),
    recommendedHtmlChanges: arr<string>(r.recommendedHtmlChanges || r.recommended_html_changes).length ? arr<string>(r.recommendedHtmlChanges || r.recommended_html_changes) : undefined,
    queryMapped: r.queryMapped != null ? bool(r.queryMapped) : r.query_mapped != null ? bool(r.query_mapped) : undefined,
    inventorySource: str(r.inventorySource || r.inventory_source) || undefined,
    scoringMethod: str(r.scoringMethod || r.scoring_method) || undefined,
    scoringNotes: str(r.scoringNotes || r.scoring_notes) || undefined,
    technicalSignals: Object.keys(tech).length ? {
      jsonLdPresent: tech.json_ld_present != null ? bool(tech.json_ld_present) : tech.jsonLdPresent != null ? bool(tech.jsonLdPresent) : undefined,
      schemaTypes: arr<string>(tech.schema_types ?? tech.schemaTypes ?? tech.schema_types_detected ?? []),
      robotsMeta: str(tech.robots_meta ?? tech.robotsMeta ?? ''),
      canonicalUrl: str(tech.canonical_url ?? tech.canonicalUrl ?? ''),
      metaDescriptionPresent: tech.meta_description_present != null ? bool(tech.meta_description_present) : undefined,
      crawlStatus: str(tech.crawl_status ?? tech.crawlStatus ?? ''),
      wordCount: tech.word_count != null ? num(tech.word_count) : tech.wordCount != null ? num(tech.wordCount) : undefined,
      markdownChars: tech.markdown_chars != null ? num(tech.markdown_chars) : undefined,
    } : undefined,
  };
}

function parseRecommendation(r: Record<string, unknown>): RecommendationModule {
  const modules = arr<Record<string, unknown>>(r.copy_modules ?? r.copyModules ?? []);
  return {
    title: str(r.title ?? r.recommendation_title ?? r.heading),
    targetUrl: str(r.target_url ?? r.targetUrl ?? r.page_url ?? r.url ?? ''),
    recommendation: str(r.recommendation ?? r.summary ?? r.description),
    evidencePattern: str(r.evidence_pattern ?? r.evidencePattern ?? r.evidence_basis ?? ''),
    priority: (str(r.priority) || 'Medium') as 'High' | 'Medium' | 'Low',
    owner: str(r.owner ?? r.workstream ?? ''),
    journeyCategory: str(r.journey_category ?? r.journeyCategory ?? ''),
    moduleType: str(r.module_type ?? r.moduleType ?? ''),
    placement: str(r.placement ?? r.recommended_placement ?? ''),
    htmlElement: str(r.html_element ?? r.htmlElement ?? ''),
    sourceRecommendationId: str(r.source_recommendation_id ?? r.sourceRecommendationId ?? ''),
    linkedQueryIds: arr<string>(r.linked_query_ids ?? r.linkedQueryIds ?? []),
    queryCoverageCount: r.query_coverage_count != null ? num(r.query_coverage_count) : r.queryCoverageCount != null ? num(r.queryCoverageCount) : undefined,
    valueScore: r.value_score != null ? num(r.value_score) : r.valueScore != null ? num(r.valueScore) : undefined,
    targetSourceTypes: arr<string>(r.target_source_types ?? r.targetSourceTypes ?? []),
    observedExternalDomains: arr(r.observed_external_domains ?? r.observedExternalDomains ?? []),
    whyItMatters: str(r.why_it_matters ?? r.whyItMatters ?? ''),
    evidenceBasis: str(r.evidence_basis ?? r.evidenceBasis ?? ''),
    copyModules: modules.length ? modules.map(parseCopyModule) : undefined,
    bulletPoints: arr<string>(r.bullet_points ?? r.bulletPoints ?? []),
    faqItems: arr(r.faq_items ?? r.faqItems ?? []),
    validationRequired: arr<string>(r.validation_required ?? r.validationRequired ?? []),
    claimsSafetyNotes: arr<string>(r.claims_safety_notes ?? r.claimsSafetyNotes ?? []),
  };
}

function parseCopyModule(r: Record<string, unknown>): CmsCopyModule {
  return {
    moduleId: str(r.module_id ?? r.moduleId ?? ''),
    moduleType: str(r.module_type ?? r.moduleType ?? ''),
    recommendedPlacement: str(r.recommended_placement ?? r.recommendedPlacement ?? ''),
    heading: str(r.heading ?? ''),
    introCopy: str(r.intro_copy ?? r.introCopy ?? ''),
    bodyCopy: str(r.body_copy ?? r.bodyCopy ?? ''),
    bullets: arr<string>(r.bullets ?? r.bullet_points ?? []),
    faqItems: arr(r.faq_items ?? r.faqItems ?? []),
    evidenceBasis: arr<string>(r.evidence_basis ?? r.evidenceBasis ?? []),
  };
}

function parseAction(r: Record<string, unknown>): ActionItem {
  return {
    action: str(r.action ?? r.title ?? r.description),
    owner: str(r.owner ?? r.workstream ?? ''),
    priority: (str(r.priority) || 'Medium') as 'High' | 'Medium' | 'Low',
    effort: (str(r.effort) || 'M') as 'S' | 'M' | 'L',
    status: (str(r.status) || 'Not started') as 'Not started' | 'In progress' | 'Done',
    dependency: str(r.dependency ?? ''),
    source: str(r.source ?? ''),
    target: str(r.target ?? r.target_url ?? ''),
    workstream: str(r.workstream ?? ''),
    category: str(r.category ?? ''),
    targetSourceTypes: arr<string>(r.target_source_types ?? r.targetSourceTypes ?? []),
    valueScore: r.value_score != null ? num(r.value_score) : undefined,
    queryCoverageCount: r.query_coverage_count != null ? num(r.query_coverage_count) : undefined,
    linkedQueryIds: arr<string>(r.linked_query_ids ?? r.linkedQueryIds ?? []),
  };
}

function parseQueryWorkbenchItem(r: Record<string, unknown>): QueryWorkbenchItem {
  const vis = obj(r.current_ai_visibility ?? {});
  return {
    query_id: str(r.query_id),
    query: str(r.query),
    query_type: str(r.query_type ?? ''),
    journey_category: str(r.journey_category ?? ''),
    current_ai_visibility: {
      score: vis.score != null ? num(vis.score) : undefined,
      status: str(vis.status ?? ''),
      owned_target_cited: vis.owned_target_cited != null ? bool(vis.owned_target_cited) : undefined,
      owned_domain_cited: vis.owned_domain_cited != null ? bool(vis.owned_domain_cited) : undefined,
      competitors: arr<string>(vis.competitors ?? []),
      competitor_citation_count: vis.competitor_citation_count != null ? num(vis.competitor_citation_count) : undefined,
      top_citations: arr<Record<string, unknown>>(vis.top_citations ?? []).map(parseCitation),
    },
    mapped_owned_urls: arr<Record<string, unknown>>(r.mapped_owned_urls ?? []).map((u) => ({
      rank: u.rank != null ? num(u.rank) : undefined,
      url: str(u.url ?? u.page_url),
      title: str(u.title ?? u.page_title ?? ''),
      mapping_score: u.mapping_score != null ? num(u.mapping_score) : undefined,
      current_geo_score_120: u.current_geo_score_120 != null ? num(u.current_geo_score_120) : undefined,
      geo_gaps: arr<string>(u.geo_gaps ?? []),
      geo_dimensions: u.geo_dimensions ? u.geo_dimensions as Record<string, number> : undefined,
    })),
    external_top3_benchmark: arr<Record<string, unknown>>(r.external_top3_benchmark ?? []).map(parseCitation),
    winning_patterns: arr(r.winning_patterns ?? []),
    cms_recommendations: arr<Record<string, unknown>>(r.cms_recommendations ?? []).map(parseRecommendation),
    pr_recommendations: arr<Record<string, unknown>>(r.pr_recommendations ?? []).map(parseRecommendation),
    action_items: arr<Record<string, unknown>>(r.action_items ?? []).map(parseAction),
    previous_run_delta: r.previous_run_delta ? r.previous_run_delta as Record<string, unknown> : null,
    loop_state: str(r.loop_state ?? ''),
  };
}

function parseAiHygiene(r: Record<string, unknown>): AiHygiene {
  return {
    priority: str(r.priority ?? ''),
    summary: str(r.summary ?? ''),
    robots_txt: r.robots_txt ? obj(r.robots_txt) as AiHygiene['robots_txt'] : undefined,
    llms_txt: r.llms_txt ? obj(r.llms_txt) as AiHygiene['llms_txt'] : undefined,
    structured_data: r.structured_data ? obj(r.structured_data) as AiHygiene['structured_data'] : undefined,
  };
}
