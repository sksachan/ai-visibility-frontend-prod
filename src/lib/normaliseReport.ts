import { mockReport } from '../data/mockReport';
import type { ReportBundle } from '../types/report';

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
const asNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const asString = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : fallback);

export function normaliseReport(raw: unknown): ReportBundle {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>;

  if (obj.runId && obj.executive && obj.visibility && Array.isArray(obj.queries)) {
    return obj as ReportBundle;
  }

  const visibility = obj.visibility ?? {};
  const executive = obj.executive ?? obj.summary ?? {};

  return {
    ...mockReport,
    runId: asString(obj.run_id ?? obj.runId, mockReport.runId),
    brand: asString(obj.brand, mockReport.brand),
    market: asString(obj.market, mockReport.market),
    generatedAt: asString(obj.generated_at ?? obj.generatedAt, new Date().toISOString()),
    evidenceDate: asString(obj.evidence_date ?? obj.evidenceDate, mockReport.evidenceDate),
    executive: {
      summary: asString(executive.summary ?? obj.executive_summary, mockReport.executive.summary),
      whatIsHappening: asArray<string>(executive.what_is_happening ?? executive.whatIsHappening).length
        ? asArray<string>(executive.what_is_happening ?? executive.whatIsHappening)
        : mockReport.executive.whatIsHappening,
      whyNow: asArray<string>(executive.why_now ?? executive.whyNow).length
        ? asArray<string>(executive.why_now ?? executive.whyNow)
        : mockReport.executive.whyNow,
      priorityActions: asArray<string>(executive.priority_actions ?? executive.priorityActions).length
        ? asArray<string>(executive.priority_actions ?? executive.priorityActions)
        : mockReport.executive.priorityActions,
      headlineMetrics: {
        brandScore: asNumber(executive.headline_metrics?.brand_score ?? visibility.brand_score, mockReport.executive.headlineMetrics.brandScore),
        ownedTargetCitations: asNumber(executive.headline_metrics?.owned_target_citations ?? visibility.owned_target_citations, mockReport.executive.headlineMetrics.ownedTargetCitations),
        ownedDomainCitations: asNumber(executive.headline_metrics?.owned_domain_citations ?? visibility.owned_domain_citations, mockReport.executive.headlineMetrics.ownedDomainCitations),
        competitorLedQueries: asNumber(executive.headline_metrics?.competitor_led_queries ?? visibility.competitor_led_queries, mockReport.executive.headlineMetrics.competitorLedQueries),
        externalLedQueries: asNumber(executive.headline_metrics?.external_led_queries ?? visibility.external_led_queries, mockReport.executive.headlineMetrics.externalLedQueries)
      }
    },
    visibility: {
      brandScore: asNumber(visibility.brand_score, mockReport.visibility.brandScore),
      ownedTargetCitations: asNumber(visibility.owned_target_citations, mockReport.visibility.ownedTargetCitations),
      ownedDomainCitations: asNumber(visibility.owned_domain_citations, mockReport.visibility.ownedDomainCitations),
      competitorLedQueries: asNumber(visibility.competitor_led_queries, mockReport.visibility.competitorLedQueries),
      externalLedQueries: asNumber(visibility.external_led_queries, mockReport.visibility.externalLedQueries),
      brandVsCompetitors: asArray<any>(visibility.brand_vs_competitors ?? visibility.brandVsCompetitors).length
        ? asArray<any>(visibility.brand_vs_competitors ?? visibility.brandVsCompetitors)
        : mockReport.visibility.brandVsCompetitors
    },
    trend: asArray<any>(obj.trend).length ? asArray<any>(obj.trend) : mockReport.trend,
    queries: asArray<any>(obj.queries).length ? asArray<any>(obj.queries) : mockReport.queries,
    ownedPages: asArray<any>(obj.owned_pages ?? obj.ownedPages).length ? asArray<any>(obj.owned_pages ?? obj.ownedPages) : mockReport.ownedPages,
    cmsModules: asArray<any>(obj.cms_modules ?? obj.cmsModules).length ? asArray<any>(obj.cms_modules ?? obj.cmsModules) : mockReport.cmsModules,
    prOpportunities: asArray<any>(obj.pr_opportunities ?? obj.prOpportunities).length ? asArray<any>(obj.pr_opportunities ?? obj.prOpportunities) : mockReport.prOpportunities,
    actionChecklist: asArray<any>(obj.action_checklist ?? obj.actionChecklist).length ? asArray<any>(obj.action_checklist ?? obj.actionChecklist) : mockReport.actionChecklist
  };
}
