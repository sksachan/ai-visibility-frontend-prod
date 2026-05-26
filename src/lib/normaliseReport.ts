import type {
  ReportBundle, ExecutiveSection, HeadlineMetrics, BrandTopicScorecardRow,
  CompetitorVisibility, SourceTypeCount, TrendPoint, QueryDiagnostic,
  OwnedPage, RecommendationModule, ActionItem, CitationExample,
  QueryWorkbenchItem, AiHygiene, CompetitorVisibilityMatrix,
} from '../types/report';

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Helpers ──────────────────────────────────────────────────────────────────

function str(v: any): string { return v == null ? '' : String(v); }
function num(v: any): number { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function arr(v: any): any[] { return Array.isArray(v) ? v : []; }
function obj(v: any): Record<string, any> { return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; }
function bool(v: any): boolean { return v === true || v === 'true' || v === 1; }

// ── Normaliser ───────────────────────────────────────────────────────────────

export function normaliseReport(raw: any): ReportBundle {
  if (!raw || typeof raw !== 'object') throw new Error('Report payload is empty or not an object.');

  // Unwrap nested wrappers
  let r: any = raw;
  for (const key of ['frontend_report_bundle', 'report_bundle', 'bundle', 'report', 'payload', 'data']) {
    if (r[key] && typeof r[key] === 'object') { r = r[key]; break; }
  }

  const runId = str(r.run_id || r.runId || '');
  const brand = str(r.brand || '');
  const market = str(r.market || '');
  const generatedAt = str(r.generated_at || r.generatedAt || new Date().toISOString());
  const evidenceDate = str(r.evidence_date || r.evidenceDate || generatedAt.slice(0, 10));

  // Executive
  const exec = obj(r.executive || r.executive_summary || r.executiveSummary);
  const hm = obj(exec.headline_metrics || exec.headlineMetrics);
  const headlineMetrics: HeadlineMetrics = {
    brandScore: num(hm.ai_visibility_score ?? hm.brandScore ?? hm.brand_score),
    ownedTargetCitations: num(hm.owned_target_page_citations ?? hm.ownedTargetCitations ?? hm.owned_target_citations),
    ownedDomainCitations: num(hm.owned_domain_citations ?? hm.ownedDomainCitations),
    competitorLedQueries: num(hm.competitor_led_query_count ?? hm.competitorLedQueries ?? hm.competitor_led_queries),
    externalLedQueries: num(hm.external_led_query_count ?? hm.externalLedQueries ?? hm.external_led_queries),
    queryCount: num(hm.query_count ?? hm.queryCount) || undefined,
    ownedPageCount: num(hm.owned_page_count ?? hm.ownedPageCount) || undefined,
    externalSourceCount: num(hm.external_source_count ?? hm.externalSourceCount) || undefined,
    averageOwnedGeoScore120: num(hm.average_owned_geo_score_120 ?? hm.averageOwnedGeoScore120) || undefined,
  };

  const scorecard: BrandTopicScorecardRow[] = arr(exec.brandTopicScorecard || exec.brand_topic_scorecard).map((s: any) => ({
    topic: str(s.topic),
    aiVisibilityScore: s.aiVisibilityScore != null ? num(s.aiVisibilityScore) : s.ai_visibility_score != null ? num(s.ai_visibility_score) : null,
    relativePosition: str(s.relativePosition || s.relative_position),
    directionVsLastPeriod: str(s.directionVsLastPeriod || s.direction_vs_last_period),
    avgBrandSentiment: str(s.avgBrandSentiment || s.avg_brand_sentiment) || undefined,
    avgBrandSentimentScore: s.avgBrandSentimentScore != null ? num(s.avgBrandSentimentScore) : s.avg_brand_sentiment_score != null ? num(s.avg_brand_sentiment_score) : undefined,
    comment: str(s.comment),
    queryCount: num(s.queryCount ?? s.query_count) || undefined,
    ownedUrlCount: num(s.ownedUrlCount ?? s.owned_url_count) || undefined,
    citationCount: num(s.citationCount ?? s.citation_count) || undefined,
  }));

  const executive: ExecutiveSection = {
    summary: str(exec.summary),
    whatIsHappening: arr(exec.what_is_happening || exec.whatIsHappening),
    whyNow: arr(exec.why_now || exec.whyNow),
    priorityActions: arr(exec.priority_actions || exec.priorityActions),
    headlineMetrics,
    brandTopicScorecard: scorecard.length ? scorecard : undefined,
  };

  // Visibility
  const vis = obj(r.visibility);
  const visibility = {
    brandScore: num(vis.brandScore ?? vis.brand_score ?? headlineMetrics.brandScore),
    ownedTargetCitations: num(vis.ownedTargetCitations ?? vis.owned_target_citations ?? headlineMetrics.ownedTargetCitations),
    ownedDomainCitations: num(vis.ownedDomainCitations ?? vis.owned_domain_citations ?? headlineMetrics.ownedDomainCitations),
    competitorLedQueries: num(vis.competitorLedQueries ?? vis.competitor_led_queries ?? headlineMetrics.competitorLedQueries),
    externalLedQueries: num(vis.externalLedQueries ?? vis.external_led_queries ?? headlineMetrics.externalLedQueries),
    brandVsCompetitors: arr(vis.brandVsCompetitors || vis.brand_vs_competitors).map((c: any): CompetitorVisibility => ({
      name: str(c.name), visibility: num(c.visibility), citationShare: num(c.citationShare ?? c.citation_share),
      sentiment: num(c.sentiment), position: c.position || 'Watchlist',
    })),
  };

  // Source landscape
  const sl = obj(r.source_landscape || r.sourceLandscape);
  const sourceLandscape = {
    sourceTypeCounts: arr(sl.source_type_counts || sl.sourceTypeCounts).map((s: any): SourceTypeCount => ({ sourceType: str(s.source_type || s.sourceType), count: num(s.count) })),
    observedNonOwnedDomains: arr(sl.observed_non_owned_domains || sl.observedNonOwnedDomains).map((d: any) => ({
      domain: str(d.domain || d.source_domain), sourceType: str(d.source_type || d.sourceType), observedCount: num(d.observed_count ?? d.observedCount ?? d.count),
      exampleUrl: str(d.example_url || d.exampleUrl) || undefined, exampleQuery: str(d.example_query || d.exampleQuery) || undefined,
    })),
    winningSourcePatterns: arr(sl.winning_source_patterns || sl.winningSourcePatterns).map((p: any) => ({
      sourceType: str(p.source_type || p.sourceType), citationCount: num(p.citation_count ?? p.citationCount), winningPattern: str(p.winning_pattern || p.winningPattern || p.pattern_type),
    })),
    sourceCitations: arr(sl.source_citations || sl.sourceCitations).map((c: any): CitationExample => normaliseCitation(c)),
  };

  // Trend
  const trend: TrendPoint[] = arr(r.trend || r.trends).map((t: any) => ({
    period: str(t.period), brandScore: num(t.brandScore ?? t.brand_score), ownedCitations: num(t.ownedCitations ?? t.owned_citations), competitorPressure: num(t.competitorPressure ?? t.competitor_pressure),
  }));

  // Query workbench
  const queryWorkbench: QueryWorkbenchItem[] = arr(r.query_workbench || r.queryWorkbench).map((q: any) => ({
    query_id: str(q.query_id || q.id || q.qid),
    query: str(q.query || q.search_query),
    query_type: str(q.query_type || q.queryType) || undefined,
    journey_category: str(q.journey_category || q.journeyCategory || q.journey_stage || q.journey),
    current_ai_visibility: q.current_ai_visibility ? {
      score: num(q.current_ai_visibility.score),
      status: str(q.current_ai_visibility.status),
      owned_target_cited: bool(q.current_ai_visibility.owned_target_cited ?? q.current_ai_visibility.ownedTargetCited),
      owned_domain_cited: bool(q.current_ai_visibility.owned_domain_cited ?? q.current_ai_visibility.ownedDomainCited),
      competitors: arr(q.current_ai_visibility.competitors),
      competitor_citation_count: num(q.current_ai_visibility.competitor_citation_count),
      top_citations: arr(q.current_ai_visibility.top_citations).map(normaliseCitation),
      brand_mentioned: q.current_ai_visibility.brand_mentioned != null ? bool(q.current_ai_visibility.brand_mentioned) : q.current_ai_visibility.brandMentioned != null ? bool(q.current_ai_visibility.brandMentioned) : undefined,
      brand_sentiment: (str(q.current_ai_visibility.brand_sentiment || q.current_ai_visibility.brandSentiment) || undefined) as 'positive' | 'neutral' | 'negative' | 'mixed' | 'not_applicable' | undefined,
      brand_sentiment_score: q.current_ai_visibility.brand_sentiment_score != null ? num(q.current_ai_visibility.brand_sentiment_score) : q.current_ai_visibility.brandSentimentScore != null ? num(q.current_ai_visibility.brandSentimentScore) : undefined,
      sentiment_evidence: str(q.current_ai_visibility.sentiment_evidence || q.current_ai_visibility.sentimentEvidence) || undefined,
    } : undefined,
    mapped_owned_urls: arr(q.mapped_owned_urls).map((m: any) => ({
      rank: num(m.rank), url: str(m.url), title: str(m.title),
      mapping_score: num(m.mapping_score), current_geo_score_120: num(m.current_geo_score_120),
      geo_gaps: arr(m.geo_gaps), geo_dimensions: m.geo_dimensions || {},
    })),
    external_top3_benchmark: arr(q.external_top3_benchmark).map(normaliseCitation),
    winning_patterns: arr(q.winning_patterns),
    cms_recommendations: arr(q.cms_recommendations),
    pr_recommendations: arr(q.pr_recommendations),
    action_items: arr(q.action_items),
    previous_run_delta: q.previous_run_delta || null,
    loop_state: str(q.loop_state) || undefined,
  }));

  // Queries (legacy diagnostic format)
  const queries: QueryDiagnostic[] = arr(r.queries || r.query_diagnostics).map((r: any): QueryDiagnostic => {
    const vis = obj(r.current_ai_visibility);
    return {
      id: str(r.id || r.query_id),
      query: str(r.query || r.search_query),
      journey: str(r.journey || r.journey_category || r.journey_stage),
      visibilityStatus: str(r.visibilityStatus || r.visibility_status || vis.status),
      ownedTargetPageCited: bool(r.ownedTargetPageCited ?? r.owned_target_page_cited ?? vis.owned_target_cited),
      ownedDomainCited: r.ownedDomainCited != null ? bool(r.ownedDomainCited) : r.owned_domain_cited != null ? bool(r.owned_domain_cited) : vis.owned_domain_cited != null ? bool(vis.owned_domain_cited) : undefined,
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
      aiVisibilityScore: num(vis.score) || undefined,
      competitorBrands: arr(vis.competitors).length ? arr(vis.competitors) : undefined,
      competitorCitationCount: num(vis.competitor_citation_count) || undefined,
      issue: str(r.issue),
      recommendedMove: str(r.recommendedMove || r.recommended_move),
    };
  });

  // Owned pages
  const ownedPages: OwnedPage[] = arr(r.owned_url_readiness || r.ownedPages || r.owned_pages).map((r: any): OwnedPage => {
    const dims = obj(r.geo_dimensions || r.geoDimensions || r.dimensions || r.dimension_scores);
    const tech = obj(r.technical_signals || r.technicalSignals);
    return {
      url: str(r.url || r.page_url || r.target_url),
      title: str(r.title || r.page_title) || undefined,
      journeyCategory: str(r.journey_category || r.journeyCategory || ''),
      mappedQuery: str(r.mappedQuery || r.mapped_query || ''),
      relatedQueries: arr(r.related_queries || r.relatedQueries).map((q: any) => ({
        id: str(q.id || q.query_id), query: str(q.query || q.text), visibilityStatus: str(q.visibility_status || q.visibilityStatus) || undefined,
      })),
      geoScore: num(r.current_geo_score_120 ?? r.geoScore ?? r.geo_score_120 ?? r.readiness_score ?? r.score_120),
      scoreBand: str(r.score_band || r.scoreBand) || undefined,
      clarity: num(dims.content_clarity ?? dims.clarity ?? r.clarity),
      semanticDepth: num(dims.semantic_depth ?? dims.semanticDepth ?? r.semanticDepth ?? r.semantic_depth),
      evidence: num(dims.eeat_signals ?? dims.evidence ?? r.evidence ?? r.eeat_signals),
      structure: num(dims.structured_data ?? dims.structure ?? r.structure ?? r.structured_data),
      freshness: num(dims.freshness_index ?? dims.freshness ?? r.freshness ?? r.freshness_index),
      authority: num(dims.authority ?? r.authority),
      faqReadiness: r.faqReadiness != null || r.faq_readiness != null || dims.faq_readiness != null ? num(r.faqReadiness ?? r.faq_readiness ?? dims.faq_readiness) : undefined,
      diagnostics: arr(r.diagnostics || r.geo_gaps),
      recommendedHtmlChanges: arr(r.recommendedHtmlChanges || r.recommended_html_changes).length ? arr(r.recommendedHtmlChanges || r.recommended_html_changes) : undefined,
      queryMapped: r.queryMapped != null ? bool(r.queryMapped) : r.query_mapped != null ? bool(r.query_mapped) : undefined,
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
        wordCount: num(tech.word_count ?? tech.wordCount) || undefined,
        markdownChars: num(tech.markdown_chars ?? tech.markdownChars) || undefined,
      },
    };
  });

  // CMS modules (page-level)
  const cmsModules: RecommendationModule[] = arr(r.page_level_cms_recommendations || r.cms_recommendations || r.cmsModules).map((r: any): RecommendationModule => ({
    title: str(r.title),
    targetUrl: str(r.target_url || r.targetUrl || r.url),
    recommendation: str(r.recommendation || r.recommended_change),
    evidencePattern: str(r.evidencePattern || r.winning_pattern_to_copy || r.evidence_pattern),
    priority: r.priority || 'Medium',
    owner: str(r.owner),
    journeyCategory: str(r.journey_category || r.journeyCategory) || undefined,
    moduleType: str(r.module_type || r.moduleType) || undefined,
    placement: str(r.placement || r.recommended_placement) || undefined,
    whyItMatters: str(r.why_it_matters || r.whyItMatters) || undefined,
    evidenceBasis: str(r.evidence_basis || r.evidenceBasis) || undefined,
    valueScore: num(r.value_score ?? r.valueScore) || undefined,
    queryCoverageCount: num(r.query_coverage_count ?? r.queryCoverageCount) || undefined,
    linkedQueryIds: arr(r.linked_queries || r.linkedQueryIds || r.linked_query_ids).map((q: any) => typeof q === 'object' ? str(q.query_id) : str(q)),
    sourceType: str(r.sourceType || r.source_type) || undefined,
    sourceRecommendationId: str(r.sourceRecommendationId || r.recommendation_id) || undefined,
    primaryQueryId: str(r.primary_query_id || r.primaryQueryId) || undefined,
    primaryQueryText: str(r.primary_query_text || r.primaryQueryText || r.query) || undefined,
    directAnswer: str(r.direct_answer || r.directAnswer) || undefined,
    faqItems: arr(r.faq_items || r.faqItems).filter((f: any) => f && (f.question || f.answer)),
    factsUsed: arr(r.facts_used || r.factsUsed),
    factsMissing: arr(r.facts_missing || r.factsMissing).map((f: any) => typeof f === 'string' ? f : str(f)),
    jsonLdTags: arr(r.json_ld_tags || r.jsonLdTags).map((t: any) => (t && typeof t === 'object') ? t : str(t)),
    intentTags: arr(r.intent_tags || r.intentTags).map((t: any) => str(t)),
    advancedGeoAsset: (r.advanced_geo_asset || r.advancedGeoAsset) as RecommendationModule['advancedGeoAsset'],
    advancedPrAssetPack: (r.advanced_pr_asset_pack || r.advancedPrAssetPack) as RecommendationModule['advancedPrAssetPack'],
    // CMS LLM merge fields
    cms_llm_merged: bool(r.cms_llm_merged),
    copyModules: arr(r.copy_modules || r.copyModules).map((m: any) => ({
      moduleId: str(m.module_id || m.moduleId),
      moduleType: str(m.module_type || m.moduleType) || undefined,
      recommendedPlacement: str(m.recommended_placement || m.recommendedPlacement) || undefined,
      heading: str(m.heading),
      introCopy: str(m.intro_copy || m.introCopy),
      bodyCopy: str(m.body_copy || m.bodyCopy),
      bullets: arr(m.bullets),
      faqItems: arr(m.faq_items || m.faqItems).filter((f: any) => f && (f.question || f.answer)),
    })),
  }));

  // PR opportunities (grouped)
  const prOpportunities: RecommendationModule[] = arr(r.grouped_pr_opportunities || r.pr_opportunities || r.prOpportunities).map((r: any): RecommendationModule => {
    // Normalise the advanced PR asset pack with new action brief fields
    const rawPack = r.advanced_pr_asset_pack || r.advancedPrAssetPack;
    const advancedPrAssetPack = rawPack ? {
      ...rawPack,
      // Ensure new PR action brief fields are passed through
      insight_summary: str(rawPack.insight_summary) || undefined,
      recommended_pr_action: str(rawPack.recommended_pr_action) || undefined,
      core_claim_to_prove: str(rawPack.core_claim_to_prove) || undefined,
      asset_concept: str(rawPack.asset_concept) || undefined,
      publishable_assets: arr(rawPack.publishable_assets),
      publisher_groups: arr(rawPack.publisher_groups).map((g: any) => ({
        group: str(g.group),
        why_it_matters: str(g.why_it_matters),
        observed_domains: arr(g.observed_domains),
        pitch_angle: str(g.pitch_angle),
        proof_required: arr(g.proof_required),
      })),
      semantic_trigger_groups: arr(rawPack.semantic_trigger_groups).map((g: any) => ({
        theme: str(g.theme),
        triggers: arr(g.triggers),
        required_evidence: arr(g.required_evidence),
      })),
      brand_data_required: arr(rawPack.brand_data_required),
      legal_review_required: arr(rawPack.legal_review_required),
      measurement_plan: arr(rawPack.measurement_plan),
    } as RecommendationModule['advancedPrAssetPack'] : undefined;

    // Use insight-led title from pack if available, otherwise fall back to generic title
    const insightTitle = rawPack?.insight_summary ? str(rawPack.insight_summary).slice(0, 120) : '';

    return {
      title: insightTitle || str(r.title || r.recommended_pr_action),
      targetUrl: str(r.target_url || r.targetUrl || ''),
      recommendation: str(rawPack?.recommended_pr_action || r.recommendation || r.recommended_pr_action),
      evidencePattern: str(r.evidencePattern || r.evidence_pattern || r.winning_pattern_to_copy || ''),
      priority: r.priority || 'Medium',
      owner: str(r.owner),
      journeyCategory: str(r.journey_category || r.journeyCategory) || undefined,
      moduleType: str(r.opportunity_type || r.moduleType) || undefined,
      whyItMatters: str(r.why_it_matters || r.whyItMatters) || undefined,
      valueScore: num(r.value_score ?? r.valueScore) || undefined,
      queryCoverageCount: num(r.query_coverage_count ?? r.queryCoverageCount) || undefined,
      linkedQueryIds: arr(r.grouped_queries || r.linkedQueryIds || r.linked_query_ids).map((q: any) => typeof q === 'object' ? str(q.query_id) : str(q)),
      targetSourceTypes: arr(r.target_source_types || r.targetSourceTypes),
      observedExternalDomains: arr(r.observed_external_domains || r.observedExternalDomains || r.target_domains_observed).map((d: any) => typeof d === 'string' ? { domain: d } : { domain: str(d.domain), count: num(d.count) || undefined }),
      sourceType: str(r.source_type || r.sourceType) || undefined,
      advancedPrAssetPack,
    };
  });

  // Action checklist
  const actionChecklist: ActionItem[] = arr(r.action_checklist || r.actionChecklist).map((a: any): ActionItem => ({
    action: str(a.action || a.title),
    owner: str(a.owner),
    priority: a.priority || 'Medium',
    effort: a.effort || 'M',
    status: a.status || 'Not started',
    source: str(a.source || a.workstream) || undefined,
    target: str(a.target || a.target_url) || undefined,
    workstream: str(a.workstream) || undefined,
    category: str(a.category) || undefined,
    valueScore: num(a.value_score ?? a.valueScore) || undefined,
    queryCoverageCount: num(a.query_coverage_count ?? a.queryCoverageCount) || undefined,
    linkedQueryIds: arr(a.linked_query_ids || a.linkedQueryIds).length ? arr(a.linked_query_ids || a.linkedQueryIds) : undefined,
    moduleType: str(a.module_type || a.moduleType) || undefined,
  }));

  // AI Hygiene
  const rawHygiene = r.ai_discoverability_hygiene || r.site_ai_hygiene || r.aiHygiene || r.ai_hygiene;
  const aiHygiene: AiHygiene | undefined = rawHygiene ? {
    priority: str(rawHygiene.priority) || undefined,
    summary: str(rawHygiene.summary) || undefined,
    robots_txt: rawHygiene.robots_txt || rawHygiene.robotsTxt,
    llms_txt: rawHygiene.llms_txt || rawHygiene.llmsTxt,
    structured_data: rawHygiene.structured_data || rawHygiene.structuredData,
  } : undefined;

  // Competitor Visibility Matrix (pass-through — already structured by backend)
  const rawCvm = r.competitor_visibility_matrix || r.competitorVisibilityMatrix;
  const competitorVisibilityMatrix: CompetitorVisibilityMatrix | undefined = rawCvm && typeof rawCvm === 'object' ? rawCvm as CompetitorVisibilityMatrix : undefined;

  return {
    runId, brand, market, generatedAt, evidenceDate,
    executive, visibility, sourceLandscape, trend,
    queries, ownedPages, cmsModules, prOpportunities, actionChecklist,
    queryWorkbench, competitorVisibilityMatrix, aiHygiene,
  };
}

function normaliseCitation(c: any): CitationExample {
  return {
    title: str(c.title || c.source_name),
    url: str(c.url || c.source_url || c.link || c.href),
    domain: str(c.domain || c.source_domain),
    sourceType: str(c.source_type || c.sourceType || c.source_category || 'other'),
    citationPosition: num(c.citation_position ?? c.citationPosition ?? c.rank) || undefined,
    snippet: str(c.snippet || c.citation_text || c.text || c.summary) || undefined,
    queryId: str(c.query_id || c.queryId) || undefined,
    query: str(c.query) || undefined,
    isCompetitor: c.is_competitor != null ? bool(c.is_competitor) : c.isCompetitor != null ? bool(c.isCompetitor) : undefined,
    isOwnedTargetPage: c.is_owned_target_page != null ? bool(c.is_owned_target_page) : c.isOwnedTargetPage != null ? bool(c.isOwnedTargetPage) : undefined,
  };
}
