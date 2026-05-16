export type Severity = 'High' | 'Medium' | 'Low';
export type Status = 'Not started' | 'In progress' | 'Done';

export interface HeadlineMetrics {
  brandScore: number;
  ownedTargetCitations: number;
  ownedDomainCitations: number;
  competitorLedQueries: number;
  externalLedQueries: number;
}

export interface ExecutiveSection {
  summary: string;
  whatIsHappening: string[];
  whyNow: string[];
  priorityActions: string[];
  headlineMetrics: HeadlineMetrics;
}

export interface CompetitorVisibility {
  name: string;
  visibility: number;
  citationShare: number;
  sentiment: number;
  position: 'Leader' | 'Challenger' | 'Niche' | 'Watchlist';
}

export interface TrendPoint {
  period: string;
  brandScore: number;
  ownedCitations: number;
  competitorPressure: number;
}

export interface QueryDiagnostic {
  id: string;
  query: string;
  journey: string;
  brandPosition: number;
  leadingCompetitor: string;
  leadingPublisher: string;
  sourceType: string;
  citationLikelihood: number;
  confidence: number;
  issue: string;
  recommendedMove: string;
}

export interface OwnedPage {
  url: string;
  mappedQuery: string;
  geoScore: number;
  clarity: number;
  semanticDepth: number;
  evidence: number;
  structure: number;
  freshness: number;
  authority: number;
  diagnostics: string[];
}

export interface RecommendationModule {
  title: string;
  targetUrl: string;
  recommendation: string;
  evidencePattern: string;
  priority: Severity;
  owner: string;
}

export interface ActionItem {
  action: string;
  owner: string;
  priority: Severity;
  effort: 'S' | 'M' | 'L';
  status: Status;
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
  trend: TrendPoint[];
  queries: QueryDiagnostic[];
  ownedPages: OwnedPage[];
  cmsModules: RecommendationModule[];
  prOpportunities: RecommendationModule[];
  actionChecklist: ActionItem[];
}
