import type {
  ReportBundle, ExecutiveSection, HeadlineMetrics, QueryDiagnostic,
  OwnedPage, RecommendationModule, ActionItem, CitationExample,
  SourceTypeCount, TrendPoint, CompetitorVisibility, BrandTopicScorecardRow,
  AiHygiene, QueryWorkbenchItem,
} from '../types/report';

function str(v: unknown): string { return String(v ?? '').trim(); }
function num(v: unknown, fallback = 0): number { const n = Number(v); return Number.isFinite(n) ? n : fallback; }
function arr(v: unknown): unknown[] { return Array.isArray(v) ? v : []; }
function obj(v: unknown): Record<string, unknown> { return v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {}; }
function first(...vals: unknown[]): unknown { for (const v of vals) if (v != null && v !== '') return v; return undefined; }

export function normaliseReport(raw: unknown): ReportBundle {
  const r = obj(raw);
  const runId = str(first(r.run_id, r.runId, ''));
  const brand = str(first(r.brand, ''));
  const market = str(first(r.market, ''));
  const generatedAt = str(first(r.generated_at, r.generatedAt, ''));
  const evidenceDate = str(first(r.evidence_date, r.evidenceDate, generatedAt.slice(0, 10)));
  const executive = parseExecutive(r);
  const visibility = parseVisibility(r, executive);
  const sourceLandscape = parseSourceLandscape(r);
  const trend = parseTrend(r);
  const queries = parseQueries(r);
  const ownedPages = parseOwnedPages(r);
  const cmsModules = parseCmsModules(r);
  const prOpportunities = parsePrOpportunities(r);
  const actionChecklist = parseActionChecklist(r);
  const queryWorkbench = parseQueryWorkbench(r);
  const aiHygiene = parseAiHygiene(r);
  return { runId, brand, market, generatedAt, evidenceDate, executive, visibility, sourceLandscape, trend, queries, ownedPages, cmsModules, prOpportunities, actionChecklist, queryWorkbench, aiHygiene };
}

function parseExecutive(r: Record<string, unknown>): ExecutiveSection {
  const exec = obj(first(r.executive, r.executive_report, r.executive_summary, {}));
  const hm = obj(first(exec.headline_metrics, exec.headlineMetrics, r.headline_metrics, {}));
  const scorecard = arr(first(exec.brandTopicScorecard, exec.brand_topic_scorecard, (obj(r.executive_summary) as Record<string,unknown>).brand_topic_scorecard, [])).map((row) => {
    const s = obj(row);
    return {
      topic: str(first(s.topic, '')),
      aiVisibilityScore: s.aiVisibilityScore != null ? num(s.aiVisibilityScore) : s.ai_visibility_score != null ? num(s.ai_visibility_score) : null,
      relativePosition: str(first(s.relativePosition, s.relative_position, '')),
      directionVsLastPeriod: str(first(s.directionVsLastPeriod, s.direction_vs_last_period, '')),
      comment: str(first(s.comment, '')),
      queryCount: num(first(s.queryCount, s.query_count, 0)),
      ownedUrlCount: num(first(s.ownedUrlCount, s.owned_url_count, 0)),
      citationCount: num(first(s.citationCount, s.citation_count, 0)),
    } as BrandTopicScorecardRow;
  });
  const headlineMetrics: HeadlineMetrics = {
    brandScore: num(first(hm.ai_visibility_score, hm.brandScore, hm.brand_score, hm.average_ai_visibility, 0)),
    ownedTargetCitations: num(first(hm.owned_target_page_citations, hm.ownedTargetCitations, 0)),
    ownedDomainCitations: num(first(hm.owned_domain_citations, hm.ownedDomainCitations, 0)),
    competitorLedQueries: num(first(hm.competitor_led_query_count, hm.competitorLedQueries, 0)),
    externalLedQueries: num(first(hm.external_led_query_count, hm.externalLedQueries, 0)),
    queryCount: num(first(hm.query_count, hm.queryCount, 0)),
    ownedPageCount: num(first(hm.owned_page_count, hm.ownedPageCount, 0)),
    externalSourceCount: num(first(hm.external_source_count, hm.externalSourceCount, 0)),
    averageOwnedGeoScore120: num(first(hm.average_owned_geo_score_120, hm.averageOwnedGeoScore120, 0)),
  };
  return {
    summary: str(first(exec.summary, '')),
    whatIsHappening: arr(first(exec.what_is_happening, exec.whatIsHappening, [])).map(String),
    whyNow: arr(first(exec.why_now, exec.whyNow, [])).map(String),
    priorityActions: arr(first(exec.priority_actions, exec.priorityActions, [])).map(String),
    headlineMetrics,
    brandTopicScorecard: scorecard.length ? scorecard : undefined,
  };
}

function parseVisibility(r: Record<string, unknown>, exec: ExecutiveSection) {
  const vis = obj(first(r.visibility, {}));
  return {
    brandScore: num(first(vis.brandScore, vis.brand_score, exec.headlineMetrics.brandScore, 0)),
    ownedTargetCitations: num(first(vis.ownedTargetCitations, vis.owned_target_citations, exec.headlineMetrics.ownedTargetCitations, 0)),
    ownedDomainCitations: num(first(vis.ownedDomainCitations, vis.owned_domain_citations, exec.headlineMetrics.ownedDomainCitations, 0)),
    competitorLedQueries: num(first(vis.competitorLedQueries, vis.competitor_led_queries, exec.headlineMetrics.competitorLedQueries, 0)),
    externalLedQueries: num(first(vis.externalLedQueries, vis.external_led_queries, exec.headlineMetrics.externalLedQueries, 0)),
    brandVsCompetitors: arr(first(vis.brandVsCompetitors, vis.brand_vs_competitors, [])).map((c) => {
      const cv = obj(c);
      return { name: str(cv.name), visibility: num(cv.visibility), citationShare: num(cv.citationShare ?? cv.citation_share), sentiment: num(cv.sentiment), position: (str(cv.position) || 'Niche') as CompetitorVisibility['position'] };
    }),
  };
}

function parseSourceLandscape(r: Record<string, unknown>) {
  const sl = obj(first(r.source_landscape, r.sourceLandscape, {}));
  const stc = arr(first(sl.source_type_counts, sl.sourceTypeCounts, [])).map((s) => {
    const o = obj(s); return { sourceType: str(first(o.source_type, o.sourceType, '')), count: num(first(o.count, 0)) } as SourceTypeCount;
  });
  const ond = arr(first(sl.observed_non_owned_domains, sl.observedNonOwnedDomains, [])).map((d) => {
    const o = obj(d);
    return { domain: str(first(o.domain, o.source_domain, '')), sourceType: str(first(o.source_type, o.sourceType, 'other')), observedCount: num(first(o.observed_count, o.observedCount, o.count, 1)), exampleUrl: str(first(o.example_url, o.exampleUrl, '')), exampleQuery: str(first(o.example_query, o.exampleQuery, '')) };
  });
  const wsp = arr(first(sl.winning_source_patterns, sl.winningSourcePatterns, [])).map((p) => {
    const o = obj(p);
    return { sourceType: str(first(o.source_type, o.sourceType, '')), citationCount: num(first(o.citation_count, o.citationCount, 0)), winningPattern: str(first(o.winning_pattern, o.winningPattern, o.pattern_type, '')) };
  });
  const sc = arr(first(sl.source_citations, sl.sourceCitations, [])).map((c) => parseCitation(c));
  return { sourceTypeCounts: stc, observedNonOwnedDomains: ond, winningSourcePatterns: wsp, sourceCitations: sc.length ? sc : undefined };
}

function parseTrend(r: Record<string, unknown>): TrendPoint[] {
  return arr(first(r.trend, r.run_history, [])).map((t) => {
    const o = obj(t);
    return { period: str(first(o.period, '')), brandScore: num(first(o.brandScore, o.brand_score, 0)), ownedCitations: num(first(o.ownedCitations, o.owned_citations, 0)), competitorPressure: num(first(o.competitorPressure, o.competitor_pressure, 0)) };
  });
}

function parseQueries(r: Record<string, unknown>): QueryDiagnostic[] {
  const qw = arr(first(r.query_workbench, r.queryWorkbench, []));
  if (qw.length) return qw.map((q, i) => queryFromWorkbench(obj(q), i));
  return arr(first(r.queries, [])).map((q) => {
    const o = obj(q);
    const vis = obj(first(o.current_ai_visibility, {}));
    return {
      id: str(first(o.query_id, o.id, '')), query: str(first(o.query, '')),
      journey: str(first(o.journey, o.journey_category, o.journey_stage, '')),
      visibilityStatus: str(first(o.visibilityStatus, o.visibility_status, vis.status, '')),
      ownedTargetPageCited: Boolean(first(o.ownedTargetPageCited, o.owned_target_page_cited, vis.owned_target_cited, false)),
      ownedDomainCited: o.ownedDomainCited != null ? Boolean(o.ownedDomainCited) : o.owned_domain_cited != null ? Boolean(o.owned_domain_cited) : undefined,
      winningExternalSourceTypes: arr(first(o.winningExternalSourceTypes, o.winning_external_source_types, [])).map(String),
      ownedGeoScore120: num(first(o.ownedGeoScore120, o.owned_geo_score_120, 0)),
      externalBenchmarkScore: num(first(o.externalBenchmarkScore, o.external_benchmark_score, 0)),
      sourcePreferenceGap: num(first(o.sourcePreferenceGap, o.source_preference_gap, 0)),
      gapReasons: arr(first(o.gapReasons, o.gap_reasons, [])).map(String),
      citations: arr(first(o.citations, vis.top_citations, [])).map((c) => parseCitation(c)),
      brandPosition: num(first(o.brandPosition, o.brand_position, 0)),
      leadingCompetitor: str(first(o.leadingCompetitor, o.leading_competitor, '')),
      leadingPublisher: str(first(o.leadingPublisher, o.leading_publisher, '')),
      sourceType: str(first(o.sourceType, o.source_type, '')),
      citationLikelihood: num(first(o.citationLikelihood, o.citation_likelihood, 0)),
      confidence: num(first(o.confidence, 0)),
      aiVisibilityScore: num(first(o.aiVisibilityScore, o.ai_visibility_score, vis.score, 0)),
      issue: str(first(o.issue, '')), recommendedMove: str(first(o.recommendedMove, o.recommended_move, '')),
    } as QueryDiagnostic;
  });
}

function queryFromWorkbench(r: Record<string, unknown>, idx: number): QueryDiagnostic {
  const vis = obj(first(r.current_ai_visibility, {}));
  const citations = arr(first(vis.top_citations, [])).map((c) => parseCitation(c));
  const competitors = arr(first(vis.competitors, [])).map(String);
  return {
    id: str(first(r.query_id, r.id, `q${idx + 1}`)), query: str(first(r.query, '')),
    journey: str(first(r.journey_category, r.journey_stage, '')),
    visibilityStatus: str(first(vis.status, '')),
    ownedTargetPageCited: Boolean(vis.owned_target_cited),
    ownedDomainCited: vis.owned_domain_cited != null ? Boolean(vis.owned_domain_cited) : undefined,
    winningExternalSourceTypes: [], ownedGeoScore120: num(first((arr(r.mapped_owned_urls)[0] as Record<string,unknown>)?.current_geo_score_120, 0)),
    externalBenchmarkScore: 0, sourcePreferenceGap: 0, gapReasons: [], citations,
    brandPosition: 0, leadingCompetitor: competitors[0] || '', leadingPublisher: '',
    sourceType: '', citationLikelihood: 0, confidence: 0,
    aiVisibilityScore: num(first(vis.score, 0)), competitorBrands: competitors,
    competitorCitationCount: num(first(vis.competitor_citation_count, 0)),
    issue: '', recommendedMove: '',
  };
}

function parseOwnedPages(r: Record<string, unknown>): OwnedPage[] {
  return arr(first(r.owned_url_readiness, r.ownedPages, r.owned_pages, [])).map((p) => {
    const o = obj(p);
    const dims = obj(first(o.geo_dimensions, o.dimensions, o.dimension_scores, {}));
    const tech = obj(first(o.technical_signals, o.technicalSignals, {}));
    const relQ = arr(first(o.related_queries, o.relatedQueries, [])).map((q) => {
      const qo = obj(q);
      return { id: str(first(qo.id, qo.query_id, '')), query: str(first(qo.query, '')), visibilityStatus: str(first(qo.visibility_status, qo.visibilityStatus, '')) };
    });
    const dimVal = (key: string, ...alts: string[]) => {
      for (const k of [key, ...alts]) {
        const v = dims[k];
        if (v != null) {
          if (typeof v === 'object' && v !== null) return num((v as Record<string,unknown>).score ?? (v as Record<string,unknown>).value ?? 0);
          return num(v);
        }
      }
      return 0;
    };
    return {
      url: str(first(o.url, o.page_url, '')), title: str(first(o.title, o.page_title, '')),
      journeyCategory: str(first(o.journey_category, o.journeyCategory, '')),
      mappedQuery: str(first(o.mapped_query, o.mappedQuery, '')), relatedQueries: relQ,
      geoScore: num(first(o.current_geo_score_120, o.geo_score_120, o.geoScore, o.readiness_score, o.score_120, 0)),
      clarity: dimVal('content_clarity', 'clarity'), semanticDepth: dimVal('semantic_depth', 'semanticDepth'),
      structure: dimVal('structured_data', 'structure'), evidence: dimVal('eeat_signals', 'evidence', 'eeat'),
      freshness: dimVal('freshness_index', 'freshness'), authority: dimVal('authority', 'eeat_signals', 'evidence'),
      faqReadiness: dimVal('faq_readiness', 'faqReadiness'),
      diagnostics: arr(first(o.diagnostics, o.geo_gaps, [])).map(String),
      queryMapped: o.query_mapped != null ? Boolean(o.query_mapped) : o.queryMapped != null ? Boolean(o.queryMapped) : undefined,
      inventorySource: str(first(o.inventory_source, o.inventorySource, '')) || undefined,
      scoringMethod: str(first(o.scoring_method, o.scoringMethod, '')) || undefined,
      scoringNotes: str(first(o.scoring_notes, o.scoringNotes, '')) || undefined,
      technicalSignals: {
        jsonLdPresent: tech.json_ld_present != null ? Boolean(tech.json_ld_present) : tech.jsonLdPresent != null ? Boolean(tech.jsonLdPresent) : undefined,
        schemaTypes: arr(first(tech.schema_types, tech.schemaTypes, [])).map(String),
        canonicalUrl: str(first(tech.canonical_url, tech.canonicalUrl, '')) || undefined,
        crawlStatus: str(first(tech.crawl_status, tech.crawlStatus, '')) || undefined,
        wordCount: tech.word_count != null || tech.wordCount != null ? num(first(tech.word_count, tech.wordCount, 0)) : undefined,
      },
    } as OwnedPage;
  });
}

function parseCmsModules(r: Record<string, unknown>): RecommendationModule[] {
  return arr(first(r.page_level_cms_recommendations, r.cms_recommendations, r.cmsModules, [])).map((m) => parseRecommendation(m));
}

function parsePrOpportunities(r: Record<string, unknown>): RecommendationModule[] {
  return arr(first(r.grouped_pr_opportunities, r.pr_opportunities, r.prOpportunities, [])).map((m) => parseRecommendation(m));
}

function parseActionChecklist(r: Record<string, unknown>): ActionItem[] {
  return arr(first(r.action_checklist, r.actionChecklist, [])).map((a) => {
    const o = obj(a);
    return {
      action: str(first(o.action, o.title, '')), owner: str(first(o.owner, '')),
      priority: (str(first(o.priority, 'Medium')) || 'Medium') as ActionItem['priority'],
      effort: (str(first(o.effort, 'M')) || 'M') as ActionItem['effort'],
      status: (str(first(o.status, 'Not started')) || 'Not started') as ActionItem['status'],
      target: str(first(o.target, o.target_url, '')) || undefined,
      workstream: str(first(o.workstream, '')) || undefined,
      source: str(first(o.source, '')) || undefined,
      valueScore: o.value_score != null ? num(o.value_score) : undefined,
      queryCoverageCount: o.query_coverage_count != null ? num(o.query_coverage_count) : undefined,
      linkedQueryIds: arr(first(o.linked_query_ids, o.linkedQueryIds, [])).map(String).length ? arr(first(o.linked_query_ids, o.linkedQueryIds, [])).map(String) : undefined,
    } as ActionItem;
  });
}

function parseQueryWorkbench(r: Record<string, unknown>): QueryWorkbenchItem[] | undefined {
  const items = arr(first(r.query_workbench, r.queryWorkbench, []));
  if (!items.length) return undefined;
  return items.map((q) => obj(q) as unknown as QueryWorkbenchItem);
}

function parseAiHygiene(r: Record<string, unknown>): AiHygiene | undefined {
  const h = obj(first(r.ai_discoverability_hygiene, r.site_ai_hygiene, r.aiHygiene, undefined));
  if (!Object.keys(h).length) return undefined;
  return h as unknown as AiHygiene;
}

function parseCitation(raw: unknown): CitationExample {
  const c = obj(raw);
  return {
    title: str(first(c.title, c.source_name, '')), url: str(first(c.url, c.source_url, '')),
    domain: str(first(c.domain, c.source_domain, '')), sourceType: str(first(c.source_type, c.sourceType, 'other')),
    citationPosition: c.citation_position != null ? num(c.citation_position) : c.rank != null ? num(c.rank) : undefined,
    snippet: str(first(c.snippet, c.citation_text, c.text, '')) || undefined,
    queryId: str(first(c.query_id, c.queryId, '')) || undefined, query: str(first(c.query, '')) || undefined,
    isCompetitor: c.is_competitor != null ? Boolean(c.is_competitor) : undefined,
    isOwnedTargetPage: c.is_owned_target_page != null ? Boolean(c.is_owned_target_page) : undefined,
  };
}

function parseRecommendation(raw: unknown): RecommendationModule {
  const r = obj(raw);
  return {
    title: str(first(r.title, '')), targetUrl: str(first(r.target_url, r.targetUrl, '')),
    recommendation: str(first(r.recommendation, r.recommended_change, r.recommended_pr_action, '')),
    evidencePattern: str(first(r.evidence_pattern, r.evidencePattern, r.winning_pattern_to_copy, '')),
    priority: (str(first(r.priority, 'Medium')) || 'Medium') as RecommendationModule['priority'],
    owner: str(first(r.owner, '')),
    journeyCategory: str(first(r.journey_category, r.journeyCategory, '')) || undefined,
    moduleType: str(first(r.module_type, r.moduleType, '')) || undefined,
    valueScore: r.value_score != null ? num(r.value_score) : undefined,
    queryCoverageCount: r.query_coverage_count != null ? num(r.query_coverage_count) : undefined,
    linkedQueryIds: arr(first(r.linked_query_ids, r.linkedQueryIds, r.linked_queries, [])).map((q: unknown) => typeof q === 'object' ? str((q as Record<string, unknown>).query_id) : str(q)),
    sourceType: str(first(r.source_type, r.sourceType, '')) || undefined,
    sourceRecommendationId: str(first(r.recommendation_id, r.sourceRecommendationId, '')) || undefined,
    advancedGeoAsset: (r.advanced_geo_asset || r.advancedGeoAsset) as RecommendationModule['advancedGeoAsset'],
    advancedPrAssetPack: (r.advanced_pr_asset_pack || r.advancedPrAssetPack) as RecommendationModule['advancedPrAssetPack'],
  };
}
