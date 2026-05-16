import type { ActionItem, CitationExample, OwnedPage, QueryDiagnostic, RecommendationModule, ReportBundle, Severity, SourceTypeCount, Status } from '../types/report';

type AnyRecord = Record<string, any>;

const asRecord = (value: unknown): AnyRecord => (value && typeof value === 'object' && !Array.isArray(value) ? value as AnyRecord : {});
const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? value as T[] : []);
const firstDefined = (...values: unknown[]) => values.find((value) => value !== undefined && value !== null && value !== '');

function asString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (typeof value === 'string') {
    const match = value.replace(',', '').match(/-?\d+(\.\d+)?/);
    if (match) {
      const parsed = Number(match[0]);
      return Number.isFinite(parsed) ? parsed : fallback;
    }
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  try { return JSON.parse(trimmed); } catch { /* continue */ }

  const firstBrace = trimmed.indexOf('{');
  const firstBracket = trimmed.indexOf('[');
  const startCandidates = [firstBrace, firstBracket].filter((idx) => idx >= 0);
  if (!startCandidates.length) return value;
  const start = Math.min(...startCandidates);
  const end = trimmed.lastIndexOf(trimmed[start] === '{' ? '}' : ']');
  if (end > start) {
    try { return JSON.parse(trimmed.slice(start, end + 1)); } catch { return value; }
  }
  return value;
}

function unwrapRun(raw: unknown): AnyRecord {
  const root = asRecord(parseMaybeJson(raw));
  const keys = Object.keys(root);
  if (keys.length === 1 && asRecord(root[keys[0]]).start && asRecord(root[keys[0]])['Preview Node']) return asRecord(root[keys[0]]);
  return root;
}

function nodeData(run: AnyRecord, nodeName: string): AnyRecord {
  return asRecord(asRecord(run[nodeName]).data);
}

function parseNodeJson(run: AnyRecord, nodeName: string, field: 'stdout' | 'response' = 'stdout'): AnyRecord {
  return asRecord(parseMaybeJson(nodeData(run, nodeName)[field]));
}

function parsePreviewTile(run: AnyRecord, tileId: string): AnyRecord {
  const tiles = asArray<AnyRecord>(asRecord(nodeData(run, 'Preview Node').layout).tiles);
  const tile = tiles.find((item) => item.i === tileId || item.id === tileId);
  return asRecord(parseMaybeJson(asRecord(asRecord(tile).data).default));
}

function textToList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => asString(item).trim()).filter(Boolean);
  const text = asString(value).trim();
  if (!text) return [];
  return text.split(/\n|•|;(?=\s)|\.(?=\s+[A-Z0-9])/g).map((x) => x.replace(/^[-*\d.)\s]+/, '').trim()).filter((x) => x.length > 4);
}

function priority(value: unknown): Severity {
  const text = asString(value, 'Medium').toLowerCase();
  if (text.includes('p1') || text.includes('high') || text.includes('urgent')) return 'High';
  if (text.includes('p3') || text.includes('low')) return 'Low';
  return 'Medium';
}

function effort(value: unknown): 'S' | 'M' | 'L' {
  const text = asString(value, 'M').toLowerCase();
  if (text.startsWith('s') || text.includes('small')) return 'S';
  if (text.startsWith('l') || text.includes('large')) return 'L';
  return 'M';
}

function status(value: unknown): Status {
  const text = asString(value, 'Not started').toLowerCase();
  if (text.includes('done') || text.includes('complete')) return 'Done';
  if (text.includes('not started') || text.includes('todo') || text.includes('backlog')) return 'Not started';
  if (text.includes('progress') || text === 'started') return 'In progress';
  return 'Not started';
}

function bool(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return ['true', 'yes', '1'].includes(value.toLowerCase());
  return Boolean(value);
}

function mapCitation(item: AnyRecord): CitationExample {
  return {
    title: asString(firstDefined(item.title, item.source_name, item.name), 'Untitled source'),
    url: asString(firstDefined(item.url, item.source_url, item.link), ''),
    domain: asString(firstDefined(item.domain, item.source_domain), ''),
    sourceType: asString(firstDefined(item.source_type, item.sourceType), 'unknown'),
    citationPosition: asNumber(firstDefined(item.citation_position, item.position), undefined as unknown as number),
    snippet: asString(firstDefined(item.snippet, item.text, item.summary), ''),
    isCompetitor: bool(item.is_competitor),
    isOwnedTargetPage: bool(item.is_owned_target_page)
  };
}

function citationGroups(citations: AnyRecord[]): Map<string, CitationExample[]> {
  const groups = new Map<string, CitationExample[]>();
  for (const citation of citations) {
    const id = asString(citation.query_id);
    if (!id) continue;
    const next = groups.get(id) ?? [];
    next.push(mapCitation(citation));
    groups.set(id, next);
  }
  return groups;
}

function parseRecord(value: unknown): AnyRecord {
  return asRecord(parseMaybeJson(value));
}

function parseList(value: unknown): AnyRecord[] {
  const parsed = parseMaybeJson(value);
  if (Array.isArray(parsed)) return parsed as AnyRecord[];
  const rec = asRecord(parsed);
  return asArray<AnyRecord>(firstDefined(rec.rows, rec.queries, rec.items, rec.modules, rec.opportunities, rec.patterns));
}

function queryKey(row: AnyRecord): string {
  return asString(firstDefined(row.query_id, row.id, row.qid)).toLowerCase() || asString(row.query).toLowerCase();
}

function mergeByQueryId(primary: AnyRecord[], ...extras: AnyRecord[][]): AnyRecord[] {
  const indexes = extras.map((rows) => {
    const map = new Map<string, AnyRecord>();
    rows.forEach((row) => {
      const key = queryKey(row);
      if (key) map.set(key, row);
    });
    return map;
  });
  return primary.map((row) => {
    const key = queryKey(row);
    return Object.assign({}, ...indexes.map((idx) => idx.get(key) ?? {}), row);
  });
}

function deriveObservedDomains(sources: AnyRecord[]): Array<{ domain: string; sourceType: string; observedCount: number; exampleUrl?: string; exampleQuery?: string }> {
  const map = new Map<string, { domain: string; sourceType: string; observedCount: number; exampleUrl?: string; exampleQuery?: string }>();
  for (const source of sources) {
    if (bool(source.is_owned_target_page)) continue;
    const domain = asString(firstDefined(source.domain, source.source_domain));
    const url = asString(firstDefined(source.url, source.source_url, source.link));
    const key = domain || url;
    if (!key) continue;
    const existing = map.get(key);
    if (existing) {
      existing.observedCount += 1;
    } else {
      map.set(key, {
        domain: key,
        sourceType: asString(firstDefined(source.source_type, source.sourceType, source.source_category), 'unknown'),
        observedCount: asNumber(firstDefined(source.observed_count, source.count), 1),
        exampleUrl: url,
        exampleQuery: asString(source.query)
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.observedCount - a.observedCount);
}

function leadingDomain(citations: CitationExample[]): string {
  return citations.find((item) => item.domain)?.domain ?? citations.find((item) => item.url)?.url ?? 'Not cited in uploaded evidence';
}

function leadingCompetitor(citations: CitationExample[]): string {
  return citations.find((item) => item.isCompetitor)?.domain ?? 'No competitor source flagged';
}

function visibilityOrder(statusText: string): number {
  const text = statusText.toLowerCase();
  if (text.includes('target')) return 1;
  if (text.includes('owned_domain')) return 2;
  if (text.includes('brand')) return 3;
  if (text.includes('competitor')) return 4;
  if (text.includes('external')) return 5;
  return 0;
}

function mapQueries(prPayload: AnyRecord): QueryDiagnostic[] {
  const rows = asArray<AnyRecord>(firstDefined(prPayload.query_level_source_gaps, prPayload.query_evidence, prPayload.rows, prPayload.queries));
  const citationsByQuery = citationGroups(asArray<AnyRecord>(prPayload.representative_citation_examples));
  return rows.map((row, index) => {
    const embeddedCitations = asArray<AnyRecord>(firstDefined(row.citations, row.representative_citations, row.representative_citation_examples, row.external_sources, row.sources)).map(mapCitation);
    const citations = citationsByQuery.get(asString(row.query_id)) ?? embeddedCitations;
    const gapReasons = textToList(row.gap_reasons);
    const statusText = asString(row.visibility_status, 'unknown');
    const extScore = asNumber(firstDefined(row.external_benchmark_score, row.external_citation_influence_score));
    const ownedScore = asNumber(firstDefined(row.owned_geo_score_120, row.owned_score_120));
    const competitorBrands = Object.keys(asRecord(row.competitor_brands_detected));
    const winningTypes = asArray<string>(row.winning_external_source_types).length
      ? asArray<string>(row.winning_external_source_types)
      : Array.from(new Set(citations.map((citation) => citation.sourceType).filter(Boolean))).slice(0, 6);
    const queryType = asString(row.query_type);
    return {
      id: asString(row.query_id, `q${String(index + 1).padStart(3, '0')}`),
      query: asString(row.query, 'Query not supplied'),
      journey: asString(firstDefined(row.brand_topic_category, row.journey_category, row.category), 'Unclassified'),
      visibilityStatus: statusText,
      ownedTargetPageCited: bool(row.owned_target_page_cited),
      ownedDomainCited: row.owned_domain_cited === null || row.owned_domain_cited === undefined ? null : bool(row.owned_domain_cited),
      winningExternalSourceTypes: winningTypes,
      ownedGeoScore120: ownedScore,
      externalBenchmarkScore: extScore,
      sourcePreferenceGap: asNumber(row.source_preference_gap, Math.max(0, extScore - ownedScore)),
      gapReasons,
      citations,
      brandPosition: visibilityOrder(statusText),
      leadingCompetitor: competitorBrands.length ? competitorBrands.join(', ') : leadingCompetitor(citations),
      leadingPublisher: leadingDomain(citations),
      sourceType: winningTypes[0] ?? 'Not available',
      citationLikelihood: Math.round(Math.min(100, Math.max(0, extScore || asNumber(row.ai_visibility_score)))),
      confidence: Math.round(Math.min(100, Math.max(0, Math.abs(extScore - ownedScore) + 50))),
      issue: gapReasons[0] ?? (queryType ? `${queryType} query with ${statusText} visibility` : 'No query-level gap reason supplied'),
      recommendedMove: statusText.includes('competitor')
        ? 'Create owned answer block and comparative evidence for this query.'
        : statusText.includes('external')
          ? 'Strengthen owned citation-readiness and third-party evidence coverage.'
          : statusText.includes('owned_domain')
            ? 'Convert owned-domain mention into exact target-page citation with visible answer blocks.'
            : 'Improve extractability of the mapped owned page.'
    };
  });
}

function mapOwnedPages(cmsPayload: AnyRecord): OwnedPage[] {
  return asArray<AnyRecord>(firstDefined(cmsPayload.pages, cmsPayload.owned_readiness, cmsPayload.owned_pages, cmsPayload.rows)).map((page, index) => {
    const readiness = Object.keys(asRecord(page.owned_geo_readiness)).length ? asRecord(page.owned_geo_readiness) : page;
    const dimensions = asRecord(firstDefined(readiness.dimensions, page.dimensions));
    const related = asArray<AnyRecord>(firstDefined(page.related_query_evidence, page.related_queries, page.mapped_queries));
    const htmlChanges = asArray<AnyRecord>(firstDefined(page.recommended_html_changes, page.recommended_content_changes, page.recommendations));
    const citations = asArray<AnyRecord>(firstDefined(page.representative_citations_from_related_queries, page.representative_citations, page.citations)).map(mapCitation);
    const gaps = textToList(firstDefined(readiness.dimension_gaps, page.dimension_gaps, page.strict_diagnostics, page.diagnostics));
    const extract = asRecord(page.owned_page_extract);
    return {
      url: asString(firstDefined(page.page_url, page.url, page.target_url), `owned-page-${index + 1}`),
      title: asString(firstDefined(extract.title, page.title, page.page_title), ''),
      journeyCategory: asString(firstDefined(page.journey_category, page.brand_topic_category), 'Unclassified'),
      evidenceMatchStatus: asString(firstDefined(page.evidence_match_status, page.crawl_status, page.extraction_status), ''),
      mappedQuery: related.length ? `${related.length} related mapped queries` : 'No related query supplied',
      relatedQueries: related.map((query) => ({
        id: asString(query.query_id),
        query: asString(query.query),
        visibilityStatus: asString(query.visibility_status)
      })),
      geoScore: asNumber(firstDefined(readiness.score_120, readiness.geo_readiness_score, page.score_120)),
      scoreBand: asString(readiness.score_band, ''),
      clarity: asNumber(dimensions.content_clarity),
      semanticDepth: asNumber(dimensions.semantic_depth),
      evidence: asNumber(dimensions.eeat_signals),
      structure: asNumber(dimensions.structured_data),
      freshness: asNumber(dimensions.freshness_index),
      authority: asNumber(dimensions.eeat_signals),
      faqReadiness: asNumber(dimensions.faq_readiness),
      diagnostics: gaps.length ? gaps : ['No dimension gaps supplied'],
      recommendedHtmlChanges: htmlChanges.map((change) => asString(firstDefined(change.proposed_heading, change.cms_module_type, change.recommendation_id))).filter(Boolean),
      representativeCitations: citations
    };
  });
}

function mapCmsModules(cmsResponse: AnyRecord): RecommendationModule[] {
  return asArray<AnyRecord>(cmsResponse.modules).map((module, index) => {
    const content = asRecord(module.cms_ready_content);
    const evidence = asRecord(module.evidence_basis);
    return {
      title: asString(firstDefined(content.headline, module.proposed_heading), `CMS module ${index + 1}`),
      targetUrl: asString(module.page_url),
      recommendation: asString(firstDefined(module.module_purpose, content.intro_copy, content.body_copy), 'No CMS recommendation text supplied'),
      evidencePattern: asString(firstDefined(evidence.external_winning_pattern, evidence.owned_page_gap), 'No evidence pattern supplied'),
      priority: priority(module.priority),
      owner: 'CMS / Product / Legal',
      journeyCategory: asString(module.journey_category),
      moduleType: asString(module.cms_module_type),
      placement: asString(module.placement),
      introCopy: asString(content.intro_copy),
      bodyCopy: asString(content.body_copy),
      bulletPoints: asArray<string>(content.bullet_points),
      faqItems: asArray<{ question: string; answer: string }>(content.faq_items),
      validationRequired: asArray<string>(module.validation_required),
      claimsSafetyNotes: asArray<string>(module.claims_safety_notes),
      evidenceBasis: asString(firstDefined(evidence.owned_page_gap, evidence.external_winning_pattern))
    };
  });
}

function mapPrActions(prResponse: AnyRecord): RecommendationModule[] {
  return asArray<AnyRecord>(firstDefined(prResponse.recommended_actions, prResponse.opportunities, prResponse.actions, prResponse.pr_opportunities)).map((item, index) => ({
    title: `${asString(item.priority, 'P2')} · ${asString(firstDefined(item.journey_category, item.brand_topic_category), `PR opportunity ${index + 1}`)}`,
    targetUrl: asArray<string>(item.target_source_types).join(', ') || 'External source coverage',
    recommendation: asString(firstDefined(item.recommended_pr_action, item.action, item.recommendation), 'No PR action supplied'),
    evidencePattern: asString(firstDefined(item.evidence_basis, item.why_it_matters, item.notes), 'No PR evidence basis supplied'),
    priority: priority(item.priority),
    owner: 'PR / Communications',
    journeyCategory: asString(firstDefined(item.journey_category, item.brand_topic_category)),
    whyItMatters: asString(item.why_it_matters),
    evidenceBasis: asString(item.evidence_basis),
    targetSourceTypes: asArray<string>(item.target_source_types)
  }));
}

function mapSourceTypeCounts(sourceCounts: AnyRecord): SourceTypeCount[] {
  return Object.entries(sourceCounts)
    .map(([sourceType, count]) => ({ sourceType, count: asNumber(count) }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);
}

function makeActions(cmsModules: RecommendationModule[], prModules: RecommendationModule[], actionMeta: AnyRecord): ActionItem[] {
  const cmsActions = cmsModules.map((item): ActionItem => ({
    action: `Publish CMS module: ${item.title}`,
    owner: 'CMS',
    priority: item.priority,
    effort: item.claimsSafetyNotes?.length ? 'M' : 'S',
    status: 'Not started',
    dependency: item.validationRequired?.join(', ') || 'Product / Legal',
    source: 'CMS Content Generator'
  }));
  const prActions = prModules.map((item): ActionItem => ({
    action: item.recommendation,
    owner: 'PR',
    priority: item.priority,
    effort: item.priority === 'High' ? 'M' : 'S',
    status: 'Not started',
    dependency: item.targetSourceTypes?.join(', ') || 'Publisher outreach',
    source: 'PR Publisher Opportunity Generator'
  }));

  const expectedCount = asNumber(actionMeta.item_count);
  const actions = [...cmsActions, ...prActions];
  return expectedCount && actions.length > expectedCount ? actions.slice(0, expectedCount) : actions;
}


function mapActionChecklist(raw: unknown): ActionItem[] {
  const source = asRecord(raw);
  const rows = asArray<AnyRecord>(Array.isArray(raw) ? raw : firstDefined(source.items, source.action_checklist, source.actions));
  return rows.map((item): ActionItem => ({
    action: asString(firstDefined(item.action, item.recommendation, item.task), 'No action text supplied'),
    owner: asString(firstDefined(item.owner, item.workstream), 'Unassigned'),
    priority: priority(item.priority),
    effort: effort(item.effort),
    status: status(item.status),
    dependency: asString(firstDefined(item.dependency, asArray<string>(item.target_source_types).join(', '), item.brand_topic_category, item.page_url), ''),
    source: asString(firstDefined(item.workstream, item.source), 'Action Checklist Generator')
  }));
}

function mapFrontendPreviewBundle(source: AnyRecord): ReportBundle | null {
  const schema = asString(source.schema_version);
  const looksLikeBundle = schema.includes('frontend_report_bundle') || Array.isArray(source.query_evidence) || Array.isArray(source.owned_readiness) || Array.isArray(source.cms_ready_content_modules);
  if (!looksLikeBundle) return null;

  const metadata = asRecord(source.metadata);
  const executiveReport = parseRecord(firstDefined(source.executive_report, source.executive));
  const kpis = asRecord(firstDefined(source.executive_kpis, executiveReport.headline_metrics));
  const visibility = asRecord(source.visibility);
  const sourceLandscapeRaw = asRecord(source.source_landscape);

  const queryEvidenceRows = asArray<AnyRecord>(firstDefined(source.query_evidence, visibility.matrix, visibility.query_evidence, source.query_level_source_gaps, source.queries));
  const benchmarkRows = asArray<AnyRecord>(firstDefined(visibility.source_preference_benchmark, visibility.owned_vs_external_gap_analysis, source.source_preference_benchmark));
  const gapRows = asArray<AnyRecord>(firstDefined(visibility.owned_vs_external_gap_analysis, source.owned_vs_external_gap_analysis));
  const scoreRows = asArray<AnyRecord>(firstDefined(visibility.scores, source.visibility_scores));
  const mergedQueryRows = mergeByQueryId(queryEvidenceRows.length ? queryEvidenceRows : scoreRows, benchmarkRows, gapRows, scoreRows);

  const sourceRows = asArray<AnyRecord>(firstDefined(sourceLandscapeRaw.sources, source.sources));
  const representativeCitations = asArray<AnyRecord>(firstDefined(source.representative_citation_examples, visibility.representative_citation_examples));
  const queries = mapQueries({ query_level_source_gaps: mergedQueryRows, representative_citation_examples: representativeCitations });

  const ownedPages = mapOwnedPages({ pages: firstDefined(source.owned_readiness, source.owned_pages) });
  const cmsModules = mapCmsModules({ modules: firstDefined(source.cms_ready_content_modules, source.cms_modules, asRecord(source.cms_ready_content_modules).modules) });
  const prSynthesis = parseRecord(source.pr_strategy_synthesis);
  const prOpportunities = mapPrActions({ recommended_actions: firstDefined(source.pr_opportunities, prSynthesis.recommended_actions, prSynthesis.opportunities) });
  const actionChecklist = mapActionChecklist(firstDefined(source.action_checklist, asRecord(source.action_checklist).items));
  const sourceTypeCounts = mapSourceTypeCounts(asRecord(firstDefined(sourceLandscapeRaw.source_type_counts, sourceLandscapeRaw.sourceTypeCounts)));

  const explicitDomains = asArray<AnyRecord>(firstDefined(sourceLandscapeRaw.observed_non_owned_domains, source.observed_non_owned_domains)).map((item) => ({
    domain: asString(item.domain),
    sourceType: asString(firstDefined(item.source_type, item.sourceType)),
    observedCount: asNumber(firstDefined(item.observed_count, item.count)),
    exampleUrl: asString(item.example_url),
    exampleQuery: asString(item.example_query)
  }));
  const observedNonOwnedDomains = explicitDomains.length ? explicitDomains : deriveObservedDomains(sourceRows);

  const winningSourcePatterns = asArray<AnyRecord>(firstDefined(source.external_benchmark_patterns, visibility.external_benchmark_patterns, sourceLandscapeRaw.winning_source_patterns, source.winning_source_patterns)).map((item) => ({
    sourceType: asString(firstDefined(item.source_type, item.sourceType)),
    citationCount: asNumber(firstDefined(item.citation_count, item.count)),
    winningPattern: asString(firstDefined(item.winning_pattern, item.pattern, item.notes))
  }));

  const validation = asRecord(source.validation);
  const warnings: string[] = [];
  if (!queries.length) warnings.push('Preview bundle did not include query_evidence rows.');
  if (!ownedPages.length) warnings.push('Preview bundle did not include owned_readiness rows.');
  if (!cmsModules.length) warnings.push('Preview bundle did not include cms_ready_content_modules.');
  if (!actionChecklist.length) warnings.push('Preview bundle did not include full action_checklist items.');
  if (typeof source.executive_report === 'string' && !Object.keys(executiveReport).length) warnings.push('Executive report was embedded as text but could not be parsed as JSON.');

  const brand = asString(firstDefined(metadata.brand, source.brand, executiveReport.brand), 'Unknown brand');
  const market = asString(firstDefined(metadata.market, source.market, executiveReport.market), 'Unknown market');
  const generatedAt = asString(firstDefined(metadata.generated_at, metadata.generatedAt, source.generated_at, validation.generated_at), new Date().toISOString());
  const runId = asString(firstDefined(metadata.run_id, metadata.evidence_run_id, source.run_id), `${brand}_${market}_preview_bundle`);

  return {
    runId,
    brand,
    market,
    generatedAt,
    evidenceDate: generatedAt.slice(0, 10),
    executive: {
      summary: asString(firstDefined(executiveReport.executive_takeaway, executiveReport.summary, source.executive_takeaway), 'No executive takeaway supplied in preview bundle.'),
      whatIsHappening: textToList(executiveReport.what_is_happening),
      whyNow: textToList(firstDefined(executiveReport.why_it_is_happening, executiveReport.why_now)),
      priorityActions: textToList(executiveReport.priority_actions),
      riskIfNoAction: asString(executiveReport.risk_if_no_action),
      recommendedNextSteps: textToList(executiveReport.recommended_next_steps),
      methodologyCaveats: textToList(firstDefined(executiveReport.methodology_caveats, source.methodology_and_caveats, source.methodology)),
      headlineMetrics: {
        brandScore: asNumber(firstDefined(kpis.average_ai_visibility_score, kpis.ai_visibility_score, visibility.brandScore)),
        ownedTargetCitations: asNumber(kpis.owned_target_page_citations),
        ownedDomainCitations: asNumber(kpis.owned_domain_citations),
        competitorLedQueries: asNumber(firstDefined(kpis.competitor_led_query_count, kpis.aggregate_competitor_led_queries)),
        externalLedQueries: asNumber(kpis.external_led_query_count),
        queryCount: asNumber(kpis.query_count, queries.length),
        ownedPageCount: asNumber(kpis.owned_page_count, ownedPages.length),
        externalSourceCount: asNumber(kpis.external_source_count),
        averageOwnedGeoScore120: asNumber(kpis.average_owned_geo_score_120),
        averageExternalBenchmarkScore: asNumber(kpis.average_external_benchmark_score),
        averageExternalCitationInfluenceScore: asNumber(kpis.average_external_citation_influence_score),
        brandMentionOnlyQueries: asNumber(kpis.brand_or_model_mention_only_query_count),
        ownedDomainOnlyQueries: asNumber(kpis.owned_domain_only_query_count),
        queriesWithCompetitorPresence: asNumber(kpis.queries_with_competitor_presence)
      }
    },
    visibility: {
      brandScore: asNumber(firstDefined(kpis.average_ai_visibility_score, kpis.ai_visibility_score, visibility.brandScore)),
      ownedTargetCitations: asNumber(kpis.owned_target_page_citations),
      ownedDomainCitations: asNumber(kpis.owned_domain_citations),
      competitorLedQueries: asNumber(firstDefined(kpis.competitor_led_query_count, kpis.aggregate_competitor_led_queries)),
      externalLedQueries: asNumber(kpis.external_led_query_count),
      brandVsCompetitors: []
    },
    sourceLandscape: { sourceTypeCounts, observedNonOwnedDomains, winningSourcePatterns },
    trend: [],
    queries,
    ownedPages,
    cmsModules,
    prOpportunities,
    actionChecklist,
    parserMeta: {
      source: 'bodhi-output',
      parsedAt: new Date().toISOString(),
      queryCount: queries.length,
      ownedPageCount: ownedPages.length,
      cmsModuleCount: cmsModules.length,
      prOpportunityCount: prOpportunities.length,
      actionCount: actionChecklist.length,
      warnings
    }
  };
}

function mapCanonicalReport(source: AnyRecord): ReportBundle | null {
  if (!source.executive || !source.visibility || !Array.isArray(source.queries)) return null;
  return source as ReportBundle;
}

export function normaliseReport(raw: unknown): ReportBundle {
  const root = asRecord(parseMaybeJson(raw));
  const frontendRoot = mapFrontendPreviewBundle(root);
  if (frontendRoot) return frontendRoot;

  const canonical = mapCanonicalReport(root);
  if (canonical) return canonical;

  const run = unwrapRun(root);
  const frontendPreview = mapFrontendPreviewBundle(parsePreviewTile(run, 'frontend_report_bundle'));
  if (frontendPreview) return frontendPreview;

  const ui = asRecord(nodeData(run, 'UI Node').response);
  const executiveReport = parseNodeJson(run, 'Executive Insight Synthesiser', 'response');
  const executivePayload = parseNodeJson(run, 'Executive LLM Payload Builder');
  const previewReport = parsePreviewTile(run, 'final_report');
  const prPayload = parseNodeJson(run, 'PR Publisher LLM Payload Builder');
  const prResponse = parseNodeJson(run, 'PR Publisher Opportunity Generator', 'response') || parsePreviewTile(run, 'pr');
  const cmsPayload = parseNodeJson(run, 'CMS LLM Payload Reader');
  const cmsBuilder = parseNodeJson(run, 'CMS LLM Payload Builder - All High Confidence Pages');
  const cmsResponse = parseNodeJson(run, 'CMS Content Generator', 'response');
  const actionMeta = parseNodeJson(run, 'Action Checklist Generator');
  const validation = parsePreviewTile(run, 'validation');

  const kpis = asRecord(firstDefined(executiveReport.headline_metrics, executivePayload.executive_kpis, previewReport.headline_metrics));
  const queries = mapQueries(prPayload);
  const ownedPages = mapOwnedPages(Object.keys(cmsPayload).length ? cmsPayload : { pages: cmsBuilder.pages });
  const cmsModules = mapCmsModules(cmsResponse);
  const prOpportunities = mapPrActions(prResponse);
  const embeddedActionChecklist = mapActionChecklist(actionMeta);
  const actionChecklist = embeddedActionChecklist.length ? embeddedActionChecklist : makeActions(cmsModules, prOpportunities, actionMeta);
  const sourceTypeCounts = mapSourceTypeCounts(asRecord(firstDefined(prPayload.source_type_counts, executivePayload.source_landscape?.source_type_counts)));
  const observedNonOwnedDomains = asArray<AnyRecord>(prPayload.observed_non_owned_domains).map((item) => ({
    domain: asString(item.domain),
    sourceType: asString(item.source_type),
    observedCount: asNumber(item.observed_count),
    exampleUrl: asString(item.example_url),
    exampleQuery: asString(item.example_query)
  }));
  const winningSourcePatterns = asArray<AnyRecord>(prPayload.winning_source_patterns).map((item) => ({
    sourceType: asString(item.source_type),
    citationCount: asNumber(item.citation_count),
    winningPattern: asString(item.winning_pattern)
  }));

  const warnings: string[] = [];
  if (!queries.length) warnings.push('No full query evidence array was found in the uploaded file.');
  if (!ownedPages.length) warnings.push('No owned page readiness pages were found in the uploaded file.');
  if (!cmsModules.length) warnings.push('No CMS Content Generator modules were found in the uploaded file.');
  if (!prOpportunities.length) warnings.push('No PR Publisher Opportunity Generator actions were found in the uploaded file.');
  if (!Object.keys(kpis).length) warnings.push('No executive KPI object was found in the uploaded file.');
  if (actionMeta.item_count && actionChecklist.length !== asNumber(actionMeta.item_count)) {
    warnings.push(`Action checklist payload was not embedded; dashboard is showing ${actionChecklist.length} actions derived from CMS/PR outputs while Bodhi reported ${actionMeta.item_count} checklist items.`);
  }

  if (!queries.length && !ownedPages.length && !cmsModules.length && !prOpportunities.length) {
    throw new Error('This JSON does not contain a recognised Bodhi dashboard, query evidence, owned page, CMS, or PR payload.');
  }

  const brand = asString(firstDefined(executiveReport.brand, executivePayload.brand, ui.brand, prPayload.brand), 'Unknown brand');
  const market = asString(firstDefined(executiveReport.market, executivePayload.market, ui.market, prPayload.market), 'Unknown market');
  const startedAt = asString(asRecord(nodeData(run, 'start')).startTime);
  const endedAt = asString(asRecord(nodeData(run, 'End')).endTime);
  const runId = Object.keys(root).length === 1 ? Object.keys(root)[0] : asString(firstDefined(ui.evidence_run_id, executivePayload.run_id), `${brand}_${market}_uploaded_run`);

  return {
    runId,
    brand,
    market,
    generatedAt: endedAt || startedAt || new Date().toISOString(),
    evidenceDate: (endedAt || startedAt || new Date().toISOString()).slice(0, 10),
    executive: {
      summary: asString(firstDefined(executiveReport.executive_takeaway, previewReport.executive_takeaway), 'No executive takeaway supplied in uploaded output.'),
      whatIsHappening: textToList(executiveReport.what_is_happening),
      whyNow: textToList(firstDefined(executiveReport.why_it_is_happening, executiveReport.why_now)),
      priorityActions: textToList(executiveReport.priority_actions),
      riskIfNoAction: asString(executiveReport.risk_if_no_action),
      recommendedNextSteps: textToList(executiveReport.recommended_next_steps),
      methodologyCaveats: textToList(firstDefined(executiveReport.methodology_caveats, executivePayload.methodology_note)),
      headlineMetrics: {
        brandScore: asNumber(firstDefined(kpis.average_ai_visibility_score, kpis.ai_visibility_score)),
        ownedTargetCitations: asNumber(kpis.owned_target_page_citations),
        ownedDomainCitations: asNumber(kpis.owned_domain_citations),
        competitorLedQueries: asNumber(firstDefined(kpis.competitor_led_query_count, kpis.aggregate_competitor_led_queries)),
        externalLedQueries: asNumber(kpis.external_led_query_count),
        queryCount: asNumber(kpis.query_count, queries.length),
        ownedPageCount: asNumber(kpis.owned_page_count, ownedPages.length),
        externalSourceCount: asNumber(kpis.external_source_count),
        averageOwnedGeoScore120: asNumber(kpis.average_owned_geo_score_120),
        averageExternalBenchmarkScore: asNumber(kpis.average_external_benchmark_score),
        averageExternalCitationInfluenceScore: asNumber(kpis.average_external_citation_influence_score),
        brandMentionOnlyQueries: asNumber(kpis.brand_or_model_mention_only_query_count),
        ownedDomainOnlyQueries: asNumber(kpis.owned_domain_only_query_count),
        queriesWithCompetitorPresence: asNumber(kpis.queries_with_competitor_presence)
      }
    },
    visibility: {
      brandScore: asNumber(firstDefined(kpis.average_ai_visibility_score, kpis.ai_visibility_score)),
      ownedTargetCitations: asNumber(kpis.owned_target_page_citations),
      ownedDomainCitations: asNumber(kpis.owned_domain_citations),
      competitorLedQueries: asNumber(firstDefined(kpis.competitor_led_query_count, kpis.aggregate_competitor_led_queries)),
      externalLedQueries: asNumber(kpis.external_led_query_count),
      brandVsCompetitors: []
    },
    sourceLandscape: {
      sourceTypeCounts,
      observedNonOwnedDomains,
      winningSourcePatterns
    },
    trend: [],
    queries,
    ownedPages,
    cmsModules,
    prOpportunities,
    actionChecklist,
    parserMeta: {
      source: 'bodhi-output',
      parsedAt: new Date().toISOString(),
      queryCount: queries.length,
      ownedPageCount: ownedPages.length,
      cmsModuleCount: cmsModules.length,
      prOpportunityCount: prOpportunities.length,
      actionCount: actionChecklist.length,
      warnings: [
        ...warnings,
        ...textToList(asRecord(asArray<AnyRecord>(asRecord(validation).files)[2]).missing_files).map((item) => `Validation missing file: ${item}`)
      ]
    }
  };
}
