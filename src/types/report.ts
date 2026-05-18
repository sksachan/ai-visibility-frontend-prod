export type Severity = 'High' | 'Medium' | 'Low';
export type Status = 'Not started' | 'In progress' | 'Done';

export interface HeadlineMetrics {
  brandScore: number;
  ownedTargetCitations: number;
  ownedDomainCitations: number;
  competitorLedQueries: number;
  externalLedQueries: number;
  queryCount?: number;
  ownedPageCount?: number;
  externalSourceCount?: number;
  averageOwnedGeoScore120?: number;
  averageExternalBenchmarkScore?: number;
  averageExternalCitationInfluenceScore?: number;
  brandMentionOnlyQueries?: number;
  ownedDomainOnlyQueries?: number;
  queriesWithCompetitorPresence?: number;
}

export interface BrandTopicScorecardRow {
  topic: string;
  aiVisibilityScore: number | null;
  relativePosition: string;
  directionVsLastPeriod: string;
  comment: string;
  queryCount?: number;
  ownedUrlCount?: number;
  citationCount?: number;
}

export interface ExecutiveSection {
  summary: string;
  whatIsHappening: string[];
  whyNow: string[];
  priorityActions: string[];
  riskIfNoAction?: string;
  recommendedNextSteps?: string[];
  methodologyCaveats?: string[];
  headlineMetrics: HeadlineMetrics;
  brandTopicScorecard?: BrandTopicScorecardRow[];
}

export interface CompetitorVisibility {
  name: string;
  visibility: number;
  citationShare: number;
  sentiment: number;
  position: 'Leader' | 'Challenger' | 'Niche' | 'Watchlist';
}

export interface SourceTypeCount { sourceType: string; count: number; }
export interface TrendPoint { period: string; brandScore: number; ownedCitations: number; competitorPressure: number; }

export interface CitationExample {
  title: string;
  url: string;
  domain: string;
  sourceType: string;
  citationPosition?: number;
  snippet?: string;
  isCompetitor?: boolean;
  isOwnedTargetPage?: boolean;
}

export interface QueryDiagnostic {
  id: string;
  query: string;
  journey: string;
  visibilityStatus: string;
  ownedTargetPageCited: boolean;
  ownedDomainCited?: boolean | null;
  winningExternalSourceTypes: string[];
  ownedGeoScore120: number;
  externalBenchmarkScore: number;
  sourcePreferenceGap: number;
  gapReasons: string[];
  citations: CitationExample[];
  brandPosition: number;
  leadingCompetitor: string;
  leadingPublisher: string;
  sourceType: string;
  citationLikelihood: number;
  confidence: number;
  aiVisibilityScore?: number;
  competitorBrands?: string[];
  competitorCitationCount?: number;
  issue: string;
  recommendedMove: string;
}

export interface AiHygiene {
  priority?: string;
  summary?: string;
  robots_txt?: { status?: string; url?: string; sitemap_entries_count?: number };
  llms_txt?: { status?: string; url?: string; chars?: number };
  structured_data?: { owned_pages_total?: number; pages_with_schema?: number; pages_with_json_ld?: number; coverage_pct?: number; schema_types_detected?: Array<[string, number]>; pages_missing_json_ld?: Array<{ url?: string; title?: string }> };
}

export interface OwnedPage {
  url: string;
  title?: string;
  journeyCategory: string;
  evidenceMatchStatus?: string;
  mappedQuery: string;
  relatedQueries: Array<{ id: string; query: string; visibilityStatus?: string }>;
  geoScore: number;
  scoreBand?: string;
  clarity: number;
  semanticDepth: number;
  evidence: number;
  structure: number;
  freshness: number;
  authority: number;
  faqReadiness?: number;
  diagnostics: string[];
  recommendedHtmlChanges?: string[];
  representativeCitations?: CitationExample[];
  technicalSignals?: { jsonLdPresent?: boolean; schemaTypes?: string[]; robotsMeta?: string; canonicalUrl?: string; metaDescriptionPresent?: boolean; crawlStatus?: string; wordCount?: number; markdownChars?: number };
}

export interface CmsCopyModule {
  moduleId?: string;
  sourceRecommendationId?: string;
  moduleType?: string;
  recommendedPlacement?: string;
  heading?: string;
  introCopy?: string;
  bodyCopy?: string;
  bullets?: string[];
  faqItems?: Array<{ question: string; answer: string }>;
  evidenceBasis?: string[];
  externalPatternsUsed?: string[];
  validationRequired?: string[];
  geoScoreTracking?: string;
  aiVisibilityTracking?: string;
}

export interface RecommendationModule {
  title: string;
  targetUrl: string;
  recommendation: string;
  evidencePattern: string;
  priority: Severity;
  owner: string;
  journeyCategory?: string;
  moduleType?: string;
  placement?: string;
  introCopy?: string;
  bodyCopy?: string;
  bulletPoints?: string[];
  faqItems?: Array<{ question: string; answer: string }>;
  validationRequired?: string[];
  claimsSafetyNotes?: string[];
  whyItMatters?: string;
  evidenceBasis?: string;
  targetSourceTypes?: string[];
  valueScore?: number;
  queryCoverageCount?: number;
  linkedQueryIds?: string[];
  sourceType?: string;
  observedExternalDomains?: Array<{ domain: string; count?: number }>;
  sourceRecommendationId?: string;
  htmlElement?: string;
  copyModules?: CmsCopyModule[];
  trackingMetrics?: string[];
}

export interface ActionItem {
  action: string;
  owner: string;
  priority: Severity;
  effort: 'S' | 'M' | 'L';
  status: Status;
  dependency?: string;
  source?: string;
  target?: string;
  workstream?: string;
  category?: string;
  targetSourceTypes?: string[];
  valueScore?: number;
  queryCoverageCount?: number;
  linkedQueryIds?: string[];
  sourceType?: string;
  observedExternalDomains?: Array<{ domain: string; count?: number }>;
  moduleType?: string;
}

export interface QueryWorkbenchItem {
  query_id: string;
  query: string;
  query_type?: string;
  journey_category?: string;
  current_ai_visibility?: {
    score?: number;
    status?: string;
    owned_target_cited?: boolean;
    owned_domain_cited?: boolean;
    competitors?: string[];
    competitor_citation_count?: number;
    top_citations?: CitationExample[];
  };
  mapped_owned_urls?: Array<{ rank?: number; url: string; title?: string; mapping_score?: number; current_geo_score_120?: number; geo_gaps?: string[]; geo_dimensions?: Record<string, number> }>;
  external_top3_benchmark?: CitationExample[];
  winning_patterns?: Array<{ source_url?: string; source_domain?: string; source_type?: string; pattern_type?: string; owned_content_implication?: string; pr_implication?: string; evidence_basis?: string }>;
  cms_recommendations?: RecommendationModule[];
  pr_recommendations?: RecommendationModule[];
  action_items?: ActionItem[];
  previous_run_delta?: Record<string, unknown> | null;
  loop_state?: string;
}

export interface ParserMeta {
  source: 'bodhi-output' | 'canonical-report' | 'api-report' | 'sample';
  parsedAt: string;
  queryCount: number;
  ownedPageCount: number;
  cmsModuleCount: number;
  prOpportunityCount: number;
  actionCount: number;
  warnings: string[];
}

export interface ReportBundle {
  runId: string;
  brand: string;
  market: string;
  generatedAt: string;
  evidenceDate: string;
  executive: ExecutiveSection;
  visibility: {
    brandScore: number;
    ownedTargetCitations: number;
    ownedDomainCitations: number;
    competitorLedQueries: number;
    externalLedQueries: number;
    brandVsCompetitors: CompetitorVisibility[];
  };
  sourceLandscape?: {
    sourceTypeCounts: SourceTypeCount[];
    observedNonOwnedDomains: Array<{ domain: string; sourceType: string; observedCount: number; exampleUrl?: string; exampleQuery?: string }>;
    winningSourcePatterns: Array<{ sourceType: string; citationCount: number; winningPattern: string }>;
  };
  trend: TrendPoint[];
  queries: QueryDiagnostic[];
  ownedPages: OwnedPage[];
  cmsModules: RecommendationModule[];
  prOpportunities: RecommendationModule[];
  actionChecklist: ActionItem[];
  queryWorkbench?: QueryWorkbenchItem[];
  parserMeta?: ParserMeta;
  aiHygiene?: AiHygiene;
  methodology?: Record<string, unknown>;
}
