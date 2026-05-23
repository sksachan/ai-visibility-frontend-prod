import type {
  ReportBundle, ExecutiveSection, HeadlineMetrics, QueryDiagnostic,
  OwnedPage, RecommendationModule, ActionItem, CitationExample,
  CompetitorVisibility, SourceTypeCount, TrendPoint, AiHygiene,
  QueryWorkbenchItem, BrandTopicScorecardRow,
} from '../types/report';

/* eslint-disable @typescript-eslint/no-explicit-any */

const str = (v: unknown): string => (v == null ? '' : String(v));
const num = (v: unknown): number => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const arr = (v: unknown): any[] => (Array.isArray(v) ? v : []);
const obj = (v: unknown): Record<string, any> => (v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, any> : {});
const first = (...vals: unknown[]) => vals.find((v) => v != null && v !== '');

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
  const vis = obj(r.current_ai_visibility || r.currentAiVisibility);
  return {
    id: str(r.id || r.query_id || r.qid),
    query: str(r.query || r.search_query || r.question),
    journey: str(r.journey || r.journey_category || r.journey_stage),
    visibilityStatus: str(r.visibilityStatus || r.visibility_status || vis.status),
    ownedTargetPageCited: Boolean(r.ownedTargetPageCited ?? r.owned_target_page_cited ?? vis.owned_target_cited),
    ownedDomainCited: Boolean(r.ownedDomainCited ?? r.owned_domain_cited ?? vis.owned_domain_cited ?? false),
    winningExternalSourceTypes: arr(r.winningExternalSourceTypes || r.winning_external_source_types),
    ownedGeoScore120: num(r.ownedGeoScore120 ?? r.owned_geo_score_120),
    externalBenchmarkScore: num(r.externalBenchmarkScore ?? r.external_benchmark_score),
    sourcePreferenceGap: num(r.sourcePreferenceGap ?? r.source_preference_gap),
    gapReasons: arr(r.gapReasons || r.gap_reasons),
    citations: arr(r.citations || vis.top_citations).map(normaliseCitation),
    brandPosition: num(r.brandPosition ?? r.brand_position),
    leadingCompetitor: str(r.leadingCompetitor || r.leading_competitor),
    leadingPublisher: str(r.leadingPublisher || r.leading_publisher),
    sourceType: str(r.sourceType || r.source_type),
    citationLikelihood: num(r.citationLikelihood ?? r.citation_likelihood),
    confidence: num(r.confidence),
    aiVisibilityScore: num(vis.score ?? r.aiVisibilityScore ?? r.ai_visibility_score),
    competitorBrands: arr(vis.competitors || r.competitorBrands || r.competitor_brands),
    competitorCitationCount: num(vis.competitor_citation_count ?? r.competitorCitationCount ?? r.competitor_citation_count),
    issue: str(r.issue),
    recommendedMove: str(r.recommendedMove || r.recommended_move),
  };
}

function normaliseOwnedPage(r: any): OwnedPage {
  const dims = obj(r.geo_dimensions || r.geoDimensions || r.dimensions || r.dimension_scores);
  const tech = obj(r.technical_signals || r.technicalSignals);
  return {
    url: str(r.url || r.page_url || r.target_url),
    title: str(r.title || r.page_title),
    journeyCategory: str(r.journeyCategory || r.journey_category || 'Unclassified'),
    evidenceMatchStatus: str(r.evidenceMatchStatus || r.evidence_match_status),
    mappedQuery: str(r.mappedQuery || r.mapped_query),
    relatedQueries: arr(r.relatedQueries || r.related_queries || r.mapped_queries).map((q: any) => ({
      id: str(q.id || q.query_id),
      query: str(q.query || q.text),
      visibilityStatus: str(q.visibilityStatus || q.visibility_status),
    })),
    geoScore: num(first(r.geoScore, r.current_geo_score_120, r.geo_score_120, r.geo_readiness_score, r.readiness_score, r.score_120)),
    scoreBand: str(r.scoreBand || r.score_band) || undefined,
    clarity: num(first(r.clarity, dims.content_clarity, dims.clarity)),
    semanticDepth: num(first(r.semanticDepth, dims.semantic_depth, dims.semanticDepth)),
    evidence: num(first(r.evidence, dims.eeat_signals, dims.evidence, dims.eeat)),
    structure: num(first(r.structure, dims.structured_data, dims.structure)),
    freshness: num(first(r.freshness, dims.freshness_index, dims.freshness)),
    authority: num(first(r.authority, dims.authority, 0)),
    faqReadiness: num(first(r.faqReadiness, dims.faq_readiness, dims.faqReadiness)) || undefined,
    diagnostics: arr(r.diagnostics || r.geo_gaps),
    recommendedHtmlChanges: arr(r.recommendedHtmlChanges || r.recommended_html_changes).length ? arr(r.recommendedHtmlChanges || r.recommended_html_changes) : undefined,
    queryMapped: Boolean(r.queryMapped ?? r.query_mapped ?? false),
    inventorySource: str(r.inventorySource || r.inventory_source) || undefined,
    scoringMethod: str(r.scoringMethod || r.scoring_method) || undefined,
    scoringNotes: str(r.scoringNotes || r.scoring_notes) || undefined,
    technicalSignals: {
      jsonLdPresent: tech.json_ld_present ?? tech.jsonLdPresent,
      schemaTypes: arr(tech.schema_types || tech.schemaTypes),
      robotsMeta: str(tech.robots_meta || tech.robotsMeta) || undefined,
      canonicalUrl: str(tech.canonical_url || tech.canonicalUrl) || undefined,
      metaDescriptionPresent: tech.meta_description_present ?? tech.metaDescriptionPresent,
      crawlStatus: str(tech.crawl_status || tech.crawlStatus) || undefined,
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
    evidencePattern: str(r.evidencePattern || r.winning_pattern_to_copy || r.evidence_pattern),
    priority: (str(r.priority) || 'Medium') as RecommendationModule['priority'],
    owner: str(r.owner),
    journeyCategory: str(r.journeyCategory || r.journey_category) || undefined,
    moduleType: str(r.moduleType || r.module_type) || undefined,
    placement: str(r.placement || r.recommended_placement || r.recommendedPlacement) || undefined,
    introCopy: str(r.introCopy || r.intro_copy) || undefined,
    bodyCopy: str(r.bodyCopy || r.body_copy) || undefined,
    bulletPoints: arr(r.bulletPoints || r.bullets || r.bullet_points).length ? arr(r.bulletPoints || r.bullets || r.bullet_points) : undefined,
    faqItems: arr(r.faqItems || r.faq_items).length ? arr(r.faqItems || r.faq_items) : undefined,
    validationRequired: arr(r.validationRequired || r.validation_required).length ? arr(r.validationRequired || r.validation_required) : undefined,
    whyItMatters: str(r.whyItMatters || r.why_it_matters) || undefined,
    evidenceBasis: str(r.evidenceBasis || r.evidence_basis) || undefined,
    targetSourceTypes: arr(r.targetSourceTypes || r.target_source_types).length ? arr(r.targetSourceTypes || r.target_source_types) : undefined,
    valueScore: r.valueScore ?? r.value_score ?? undefined,
    queryCoverageCount: r.queryCoverageCount ?? r.query_coverage_count ?? undefined,
    linkedQueryIds: arr(r.linkedQueryIds || r.linked_query_ids || r.linked_queries).map((q: unknown) => typeof q === 'object' ? str((q as Record<string, unknown>).query_id) : str(q)),
    sourceType: str(r.sourceType || r.source_type) || undefined,
    sourceRecommendationId: str(r.sourceRecommendationId || r.recommendation_id) || undefined,
    advancedGeoAsset: (r.advanced_geo_asset || r.advancedGeoAsset) as RecommendationModule['advancedGeoAsset'] | undefined,
    advancedPrAssetPack: (r.advanced_pr_asset_pack || r.advancedPrAssetPack) as RecommendationModule['advancedPrAssetPack'] | undefined,
  };
}

function normaliseAction(r: any): ActionItem {
  return {
    action: str(r.action || r.title),
    owner: str(r.owner),
    priority: (str(r.priority) || 'Medium') as ActionItem['priority'],
    effort: (str(r.effort) || 'M') as ActionItem['effort'],
    status: (str(r.status) || 'Not started') as ActionItem['status'],
    dependency: str(r.dependency) || undefined,
    source: str(r.source) || undefined,
    target: str(r.target || r.target_url) || undefined,
    workstream: str(r.workstream) || undefined,
    category: str(r.category) || undefined,
    valueScore: r.valueScore ?? r.value_score ?? undefined,
    queryCoverageCount: r.queryCoverageCount ?? r.query_coverage_count ?? undefined,
    linkedQueryIds: arr(r.linkedQueryIds || r.linked_query_ids).length ? arr(r.linkedQueryIds || r.linked_query_ids) : undefined,
    moduleType: str(r.moduleType || r.module_type) || undefined,
  };
}

export function normaliseReport(raw: unknown): ReportBundle {
  const r = obj(raw);
  const exec = obj(r.executive || r.executive_summary);
  const headline = obj(exec.headline_metrics || exec.headlineMetrics);
  const vis = obj(r.visibility);
  const sl = obj(r.source_landscape || r.sourceLandscape);

  const executive: ExecutiveSection = {
    summary: str(exec.summary || r.summary),
    whatIsHappening: arr(exec.whatIsHappening || exec.what_is_happening),
    whyNow: arr(exec.whyNow || exec.why_now),
    priorityActions: arr(exec.priorityActions || exec.priority_actions),
    riskIfNoAction: str(exec.riskIfNoAction || exec.risk_if_no_action) || undefined,
    headlineMetrics: {
      brandScore: num(first(headline.ai_visibility_score, headline.brandScore, headline.brand_score, vis.brandScore, vis.brand_score)),
      ownedTargetCitations: num(first(headline.owned_target_page_citations, headline.ownedTargetCitations, vis.ownedTargetCitations)),
      ownedDomainCitations: num(first(headline.owned_domain_citations, headline.ownedDomainCitations, vis.ownedDomainCitations)),
      competitorLedQueries: num(first(headline.competitor_led_query_count, headline.competitorLedQueries, vis.competitorLedQueries)),
      externalLedQueries: num(first(headline.external_led_query_count, headline.externalLedQueries, vis.externalLedQueries)),
      queryCount: headline.query_count ?? headline.queryCount,
      ownedPageCount: headline.owned_page_count ?? headline.ownedPageCount,
      externalSourceCount: headline.external_source_count ?? headline.externalSourceCount,
      averageOwnedGeoScore120: headline.average_owned_geo_score_120 ?? headline.averageOwnedGeoScore120,
    },
    brandTopicScorecard: arr(exec.brandTopicScorecard || exec.brand_topic_scorecard || obj(r.executive_summary).brand_topic_scorecard).map((t: any): BrandTopicScorecardRow => ({
      topic: str(t.topic),
      aiVisibilityScore: t.aiVisibilityScore ?? t.ai_visibility_score ?? null,
      relativePosition: str(t.relativePosition || t.relative_position),
      directionVsLastPeriod: str(t.directionVsLastPeriod || t.direction_vs_last_period),
      comment: str(t.comment),
      queryCount: t.queryCount ?? t.query_count,
      ownedUrlCount: t.ownedUrlCount ?? t.owned_url_count,
      citationCount: t.citationCount ?? t.citation_count,
    })),
  };

  const visibility = {
    brandScore: executive.headlineMetrics.brandScore,
    ownedTargetCitations: executive.headlineMetrics.ownedTargetCitations,
    ownedDomainCitations: executive.headlineMetrics.ownedDomainCitations,
    competitorLedQueries: executive.headlineMetrics.competitorLedQueries,
    externalLedQueries: executive.headlineMetrics.externalLedQueries,
    brandVsCompetitors: arr(vis.brandVsCompetitors || vis.brand_vs_competitors || sl.competitors).map((c: any): CompetitorVisibility => ({
      name: str(c.name), visibility: num(c.visibility), citationShare: num(c.citationShare || c.citation_share || c.count),
      sentiment: num(c.sentiment), position: (str(c.position) || 'Watchlist') as CompetitorVisibility['position'],
    })),
  };

  const sourceCitations = arr(sl.source_citations || sl.sourceCitations);
  const sourceLandscape = {
    sourceTypeCounts: arr(sl.source_type_counts || sl.sourceTypeCounts).map((s: any): SourceTypeCount => ({ sourceType: str(s.source_type || s.sourceType), count: num(s.count) })),
    observedNonOwnedDomains: arr(sl.observed_non_owned_domains || sl.observedNonOwnedDomains).map((d: any) => ({
      domain: str(d.domain || d.source_domain), sourceType: str(d.source_type || d.sourceType || 'other'),
      observedCount: num(d.observed_count || d.observedCount || d.count), exampleUrl: str(d.example_url || d.exampleUrl) || undefined,
      exampleQuery: str(d.example_query || d.exampleQuery) || undefined,
    })),
    winningSourcePatterns: arr(sl.winning_source_patterns || sl.winningSourcePatterns).map((p: any) => ({
      sourceType: str(p.source_type || p.sourceType), citationCount: num(p.citation_count || p.citationCount),
      winningPattern: str(p.winning_pattern || p.winningPattern || p.pattern_type),
    })),
    sourceCitations: sourceCitations.map(normaliseCitation),
  };

  const trend = arr(r.trend || r.run_history).map((t: any): TrendPoint => ({
    period: str(t.period || t.run_id), brandScore: num(t.brandScore || t.brand_score || t.ai_visibility_score),
    ownedCitations: num(t.ownedCitations || t.owned_citations || t.owned_target_page_citations),
    competitorPressure: num(t.competitorPressure || t.competitor_pressure || t.competitor_led_query_count),
  }));

  const queries = arr(r.queries || r.query_evidence).map(normaliseQuery);
  const ownedPages = arr(r.owned_url_readiness || r.ownedPages || r.owned_readiness || r.owned_pages).map(normaliseOwnedPage);
  const cmsModules = arr(first(r.page_level_cms_recommendations, r.cms_recommendations, r.cmsModules)).map(normaliseRec);
  const prOpportunities = arr(first(r.grouped_pr_opportunities, r.pr_opportunities, r.prOpportunities)).map(normaliseRec);
  const actionChecklist = arr(r.action_checklist || r.actionChecklist).map(normaliseAction);
  const queryWorkbench: QueryWorkbenchItem[] = arr(r.query_workbench || r.queryWorkbench);

  const hygiene = obj(r.ai_discoverability_hygiene || r.aiHygiene || r.site_ai_hygiene);
  const aiHygiene: AiHygiene | undefined = Object.keys(hygiene).length ? {
    priority: str(hygiene.priority) || undefined,
    summary: str(hygiene.summary) || undefined,
    robots_txt: hygiene.robots_txt,
    llms_txt: hygiene.llms_txt,
    structured_data: hygiene.structured_data,
  } : undefined;

  const runId = str(r.run_id || r.runId);

  return {
    runId,
    brand: str(r.brand),
    market: str(r.market),
    generatedAt: str(r.generated_at || r.generatedAt),
    evidenceDate: str(r.evidence_date || r.evidenceDate || r.generated_at || r.generatedAt),
    executive, visibility, sourceLandscape, trend,
    queries, ownedPages, cmsModules, prOpportunities, actionChecklist,
    queryWorkbench, aiHygiene,
  };
}
