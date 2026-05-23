import type { ReportBundle, QueryDiagnostic, OwnedPage, RecommendationModule, ActionItem, CitationExample, SourceTypeCount, TrendPoint, BrandTopicScorecardRow } from '../types/report';

/* eslint-disable @typescript-eslint/no-explicit-any */
const str = (v: unknown): string => (v == null ? '' : String(v));
const num = (v: unknown): number => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const arr = (v: unknown): any[] => (Array.isArray(v) ? v : []);
const obj = (v: unknown): Record<string, any> => (v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, any> : {});

function normaliseCitation(r: any): CitationExample {
  return {
    title: str(r.title || r.source_name),
    url: str(r.url || r.source_url || r.link || r.href),
    domain: str(r.domain || r.source_domain),
    sourceType: str(r.sourceType || r.source_type || r.source_category || 'other'),
    citationPosition: num(r.citationPosition ?? r.citation_position ?? r.rank),
    snippet: str(r.snippet || r.citation_text || r.text || r.summary || r.content_extract),
    queryId: str(r.queryId || r.query_id),
    query: str(r.query),
    isCompetitor: Boolean(r.isCompetitor || r.is_competitor),
    isOwnedTargetPage: Boolean(r.isOwnedTargetPage || r.is_owned_target_page),
  };
}

function normaliseQuery(r: any): QueryDiagnostic {
  const vis = obj(r.current_ai_visibility || r.visibility);
  const citations = arr(vis.top_citations || r.citations || r.top_citations).map(normaliseCitation);
  return {
    id: str(r.query_id || r.id || r.qid),
    query: str(r.query || r.search_query || r.question),
    journey: str(r.journey || r.journey_category || r.journey_stage),
    visibilityStatus: str(r.visibilityStatus || r.visibility_status || vis.status),
    ownedTargetPageCited: Boolean(r.ownedTargetPageCited ?? r.owned_target_page_cited ?? vis.owned_target_cited),
    ownedDomainCited: r.ownedDomainCited != null ? Boolean(r.ownedDomainCited) : r.owned_domain_cited != null ? Boolean(r.owned_domain_cited) : vis.owned_domain_cited != null ? Boolean(vis.owned_domain_cited) : null,
    winningExternalSourceTypes: arr(r.winningExternalSourceTypes || r.winning_external_source_types),
    ownedGeoScore120: num(r.ownedGeoScore120 ?? r.owned_geo_score_120),
    externalBenchmarkScore: num(r.externalBenchmarkScore ?? r.external_benchmark_score),
    sourcePreferenceGap: num(r.sourcePreferenceGap ?? r.source_preference_gap),
    gapReasons: arr(r.gapReasons || r.gap_reasons || r.geo_gaps),
    citations,
    brandPosition: num(r.brandPosition ?? r.brand_position),
    leadingCompetitor: str(r.leadingCompetitor || r.leading_competitor),
    leadingPublisher: str(r.leadingPublisher || r.leading_publisher),
    sourceType: str(r.sourceType || r.source_type),
    citationLikelihood: num(r.citationLikelihood ?? r.citation_likelihood),
    confidence: num(r.confidence),
    aiVisibilityScore: vis.score != null ? num(vis.score) : undefined,
    competitorBrands: arr(vis.competitors || r.competitor_brands || r.competitorBrands),
    competitorCitationCount: num(vis.competitor_citation_count ?? r.competitorCitationCount ?? r.competitor_citation_count),
    issue: str(r.issue),
    recommendedMove: str(r.recommendedMove || r.recommended_move),
  };
}

function normaliseDimension(raw: any, key: string): number {
  if (raw == null) return 0;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'object' && raw !== null) {
    return num(raw.score ?? raw.value ?? raw.points ?? raw[key] ?? 0);
  }
  return num(raw);
}

function normaliseOwnedPage(r: any): OwnedPage {
  const dims = obj(r.geo_dimensions || r.dimensions || r.dimension_scores);
  const tech = obj(r.technical_signals || r.technicalSignals);
  return {
    url: str(r.url || r.page_url || r.target_url),
    title: str(r.title || r.page_title),
    journeyCategory: str(r.journeyCategory || r.journey_category || ''),
    evidenceMatchStatus: str(r.evidenceMatchStatus || r.evidence_match_status),
    mappedQuery: str(r.mappedQuery || r.mapped_query),
    relatedQueries: arr(r.relatedQueries || r.related_queries || r.mapped_queries).map((q: any) => ({
      id: str(q.id || q.query_id),
      query: str(q.query || q.text),
      visibilityStatus: str(q.visibilityStatus || q.visibility_status || q.status),
    })),
    geoScore: num(r.geoScore ?? r.current_geo_score_120 ?? r.geo_score_120 ?? r.score_120 ?? r.readiness_score ?? r.geo_readiness_score),
    scoreBand: str(r.scoreBand || r.score_band),
    clarity: normaliseDimension(dims.content_clarity ?? dims.clarity ?? r.clarity, 'content_clarity'),
    semanticDepth: normaliseDimension(dims.semantic_depth ?? dims.semanticDepth ?? r.semanticDepth ?? r.semantic_depth, 'semantic_depth'),
    evidence: normaliseDimension(dims.eeat_signals ?? dims.evidence ?? dims.eeat ?? r.evidence ?? r.eeat_signals, 'eeat_signals'),
    structure: normaliseDimension(dims.structured_data ?? dims.structure ?? r.structure ?? r.structured_data, 'structured_data'),
    freshness: normaliseDimension(dims.freshness_index ?? dims.freshness ?? r.freshness ?? r.freshness_index, 'freshness_index'),
    authority: normaliseDimension(dims.authority ?? r.authority, 'authority'),
    faqReadiness: normaliseDimension(dims.faq_readiness ?? dims.faqReadiness ?? r.faqReadiness ?? r.faq_readiness, 'faq_readiness'),
    diagnostics: arr(r.diagnostics || r.geo_gaps),
    recommendedHtmlChanges: r.recommendedHtmlChanges || r.recommended_html_changes ? arr(r.recommendedHtmlChanges || r.recommended_html_changes) : undefined,
    queryMapped: r.queryMapped != null ? Boolean(r.queryMapped) : r.query_mapped != null ? Boolean(r.query_mapped) : undefined,
    inventorySource: str(r.inventorySource || r.inventory_source) || undefined,
    scoringMethod: str(r.scoringMethod || r.scoring_method) || undefined,
    scoringNotes: str(r.scoringNotes || r.scoring_notes) || undefined,
    technicalSignals: {
      jsonLdPresent: tech.json_ld_present ?? tech.jsonLdPresent,
      schemaTypes: arr(tech.schema_types || tech.schemaTypes),
      robotsMeta: str(tech.robots_meta || tech.robotsMeta),
      canonicalUrl: str(tech.canonical_url || tech.canonicalUrl),
      metaDescriptionPresent: tech.meta_description_present ?? tech.metaDescriptionPresent,
      crawlStatus: str(tech.crawl_status || tech.crawlStatus),
      wordCount: tech.word_count ?? tech.wordCount,
      markdownChars: tech.markdown_chars ?? tech.markdownChars,
    },
  };
}

function normaliseRec(r: any): RecommendationModule {
  return {
    title: str(r.title),
    targetUrl: str(r.targetUrl || r.target_url || r.url),
    recommendation: str(r.recommendation || r.recommended_change),
    evidencePattern: str(r.evidencePattern || r.evidence_pattern || r.winning_pattern_to_copy),
    priority: (str(r.priority) || 'Medium') as RecommendationModule['priority'],
    owner: str(r.owner),
    journeyCategory: str(r.journeyCategory || r.journey_category),
    moduleType: str(r.moduleType || r.module_type),
    placement: str(r.placement || r.recommended_placement),
    introCopy: str(r.introCopy || r.intro_copy),
    bodyCopy: str(r.bodyCopy || r.body_copy),
    bulletPoints: arr(r.bulletPoints || r.bullet_points || r.bullets || r.content_requirements),
    faqItems: arr(r.faqItems || r.faq_items),
    validationRequired: arr(r.validationRequired || r.validation_required),
    claimsSafetyNotes: arr(r.claimsSafetyNotes || r.claims_safety_notes),
    whyItMatters: str(r.whyItMatters || r.why_it_matters),
    evidenceBasis: str(r.evidenceBasis || r.evidence_basis),
    targetSourceTypes: arr(r.targetSourceTypes || r.target_source_types),
    valueScore: r.valueScore ?? r.value_score,
    queryCoverageCount: r.queryCoverageCount ?? r.query_coverage_count,
    linkedQueryIds: arr(r.linkedQueryIds || r.linked_query_ids || r.linked_queries).map((q: unknown) => typeof q === 'object' ? str((q as Record<string, unknown>).query_id) : str(q)),
    sourceType: str(r.sourceType || r.source_type) || undefined,
    sourceRecommendationId: str(r.sourceRecommendationId || r.recommendation_id) || undefined,
    advancedGeoAsset: (r.advanced_geo_asset || r.advancedGeoAsset) as RecommendationModule['advancedGeoAsset'],
    advancedPrAssetPack: (r.advanced_pr_asset_pack || r.advancedPrAssetPack) as RecommendationModule['advancedPrAssetPack'],
  };
}

function normaliseAction(r: any): ActionItem {
  return {
    action: str(r.action),
    owner: str(r.owner),
    priority: (str(r.priority) || 'Medium') as ActionItem['priority'],
    effort: (str(r.effort) || 'M') as ActionItem['effort'],
    status: (str(r.status) || 'Not started') as ActionItem['status'],
    dependency: str(r.dependency),
    source: str(r.source),
    target: str(r.target || r.target_url),
    workstream: str(r.workstream),
    category: str(r.category),
    valueScore: r.valueScore ?? r.value_score,
    queryCoverageCount: r.queryCoverageCount ?? r.query_coverage_count,
    linkedQueryIds: arr(r.linkedQueryIds || r.linked_query_ids).map((q: unknown) => typeof q === 'object' ? str((q as Record<string, unknown>).query_id) : str(q)),
  };
}

function normaliseScorecard(r: any): BrandTopicScorecardRow {
  return {
    topic: str(r.topic),
    aiVisibilityScore: r.aiVisibilityScore ?? r.ai_visibility_score ?? null,
    relativePosition: str(r.relativePosition || r.relative_position),
    directionVsLastPeriod: str(r.directionVsLastPeriod || r.direction_vs_last_period),
    comment: str(r.comment),
    queryCount: r.queryCount ?? r.query_count,
    ownedUrlCount: r.ownedUrlCount ?? r.owned_url_count,
    citationCount: r.citationCount ?? r.citation_count,
  };
}

export function normaliseReport(raw: any): ReportBundle {
  if (!raw || typeof raw !== 'object') throw new Error('Report payload is empty or not an object.');

  // Unwrap nested wrappers
  let data = raw;
  for (const key of ['frontend_report_bundle', 'report_bundle', 'bundle', 'report', 'payload', 'data']) {
    if (data[key] && typeof data[key] === 'object') { data = data[key]; break; }
  }

  const exec = obj(data.executive || data.executive_report);
  const headline = obj(exec.headline_metrics || exec.headlineMetrics);
  const scorecard = arr(exec.brandTopicScorecard || exec.brand_topic_scorecard || obj(data.executive_summary).brand_topic_scorecard).map(normaliseScorecard);

  const vis = obj(data.visibility);
  const sl = obj(data.source_landscape || data.sourceLandscape);

  const sourceLandscape = {
    sourceTypeCounts: arr(sl.source_type_counts || sl.sourceTypeCounts).map((s: any): SourceTypeCount => ({ sourceType: str(s.source_type || s.sourceType), count: num(s.count) })),
    observedNonOwnedDomains: arr(sl.observed_non_owned_domains || sl.observedNonOwnedDomains).map((d: any) => ({
      domain: str(d.domain || d.source_domain),
      sourceType: str(d.source_type || d.sourceType || 'other'),
      observedCount: num(d.observed_count || d.observedCount || d.count || 1),
      exampleUrl: str(d.example_url || d.exampleUrl),
      exampleQuery: str(d.example_query || d.exampleQuery),
    })),
    winningSourcePatterns: arr(sl.winning_source_patterns || sl.winningSourcePatterns).map((p: any) => ({
      sourceType: str(p.source_type || p.sourceType),
      citationCount: num(p.citation_count || p.citationCount),
      winningPattern: str(p.winning_pattern || p.winningPattern || p.pattern_type),
    })),
    sourceCitations: arr(sl.source_citations || sl.sourceCitations).map(normaliseCitation),
  };

  const trend: TrendPoint[] = arr(data.trend || data.run_history).map((t: any) => ({
    period: str(t.period || t.run_id),
    brandScore: num(t.brandScore ?? t.brand_score ?? t.ai_visibility_score),
    ownedCitations: num(t.ownedCitations ?? t.owned_citations ?? t.owned_target_page_citations),
    competitorPressure: num(t.competitorPressure ?? t.competitor_pressure ?? t.competitor_led_query_count),
  }));

  const queries = arr(data.query_workbench || data.queries || data.query_evidence).map(normaliseQuery);
  const ownedPages = arr(data.owned_url_readiness || data.owned_readiness || data.ownedPages || data.owned_pages).map(normaliseOwnedPage);
  const cmsModules = arr(data.page_level_cms_recommendations || data.cms_recommendations || data.cmsModules).map(normaliseRec);
  const prOpportunities = arr(data.grouped_pr_opportunities || data.pr_opportunities || data.prOpportunities).map(normaliseRec);
  const actionChecklist = arr(data.action_checklist || data.actionChecklist).map(normaliseAction);

  const runId = str(data.run_id || data.runId);
  const brand = str(data.brand);
  const market = str(data.market);
  const generatedAt = str(data.generated_at || data.generatedAt);
  const evidenceDate = str(data.evidence_date || data.evidenceDate || generatedAt.slice(0, 10));

  const executive = {
    summary: str(exec.summary),
    whatIsHappening: arr(exec.what_is_happening || exec.whatIsHappening),
    whyNow: arr(exec.why_now || exec.whyNow),
    priorityActions: arr(exec.priority_actions || exec.priorityActions),
    headlineMetrics: {
      brandScore: num(headline.ai_visibility_score ?? headline.brandScore ?? headline.brand_score),
      ownedTargetCitations: num(headline.owned_target_page_citations ?? headline.ownedTargetCitations ?? headline.owned_target_citations),
      ownedDomainCitations: num(headline.owned_domain_citations ?? headline.ownedDomainCitations),
      competitorLedQueries: num(headline.competitor_led_query_count ?? headline.competitorLedQueries ?? headline.competitor_led_queries),
      externalLedQueries: num(headline.external_led_query_count ?? headline.externalLedQueries ?? headline.external_led_queries),
      queryCount: headline.query_count ?? headline.queryCount,
      ownedPageCount: headline.owned_page_count ?? headline.ownedPageCount,
      externalSourceCount: headline.external_source_count ?? headline.externalSourceCount,
      averageOwnedGeoScore120: headline.average_owned_geo_score_120 ?? headline.averageOwnedGeoScore120,
    },
    brandTopicScorecard: scorecard.length ? scorecard : undefined,
  };

  const visibility = {
    brandScore: num(vis.brandScore ?? vis.brand_score ?? executive.headlineMetrics.brandScore),
    ownedTargetCitations: num(vis.ownedTargetCitations ?? vis.owned_target_citations ?? executive.headlineMetrics.ownedTargetCitations),
    ownedDomainCitations: num(vis.ownedDomainCitations ?? vis.owned_domain_citations ?? executive.headlineMetrics.ownedDomainCitations),
    competitorLedQueries: num(vis.competitorLedQueries ?? vis.competitor_led_queries ?? executive.headlineMetrics.competitorLedQueries),
    externalLedQueries: num(vis.externalLedQueries ?? vis.external_led_queries ?? executive.headlineMetrics.externalLedQueries),
    brandVsCompetitors: arr(vis.brandVsCompetitors || vis.brand_vs_competitors || sl.competitors).map((c: any) => ({
      name: str(c.name || c.competitor),
      visibility: num(c.visibility ?? c.score),
      citationShare: num(c.citationShare ?? c.citation_share ?? c.count),
      sentiment: num(c.sentiment),
      position: str(c.position || 'Watchlist') as 'Leader' | 'Challenger' | 'Niche' | 'Watchlist',
    })),
  };

  const aiHygiene = data.ai_discoverability_hygiene || data.site_ai_hygiene || data.aiHygiene;

  const queryWorkbench = arr(data.query_workbench).length ? arr(data.query_workbench) : undefined;

  return {
    runId, brand, market, generatedAt, evidenceDate,
    executive, visibility, sourceLandscape, trend,
    queries, ownedPages, cmsModules, prOpportunities, actionChecklist,
    queryWorkbench, aiHygiene,
  };
}
