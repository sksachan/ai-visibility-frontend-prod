import type { ReportBundle } from '../types/report';

export const mockReport: ReportBundle = {
  runId: 'nissan_japan_2026_05_16_full_inventory_v1',
  brand: 'Nissan',
  market: 'Japan',
  generatedAt: '2026-05-16T12:00:00Z',
  evidenceDate: '2026-05-16',
  executive: {
    summary:
      'Nissan has recognisable domain-level visibility, but the target owned pages are not consistently cited as answer evidence. Competitors and high-authority publishers are shaping the AI answer narrative across buyer journeys.',
    whatIsHappening: [
      'Brand visibility is present but not yet translating into target-page citation authority.',
      'Competitor and publisher sources lead many consideration queries where model answers need evidence.',
      'Owned pages need clearer answer-first modules, fresher proof points and citation-ready evidence blocks.'
    ],
    whyNow: [
      'AI answer engines compress discovery into a small citation set, reducing the value of being merely indexable.',
      'GEO performance is becoming a measurable marketing and PR surface across brand, product and comparison journeys.',
      'Weekly monitoring will allow the team to see which content changes influence AI answer share over time.'
    ],
    priorityActions: [
      'Add answer-first comparison and buyer-decision modules to priority model pages.',
      'Publish citation-ready proof points: specs, charging data, ownership cost, safety and third-party references.',
      'Build PR coverage around external sources that models already use as benchmark evidence.'
    ],
    headlineMetrics: {
      brandScore: 7.2,
      ownedTargetCitations: 0,
      ownedDomainCitations: 19,
      competitorLedQueries: 13,
      externalLedQueries: 11
    }
  },
  visibility: {
    brandScore: 7.2,
    ownedTargetCitations: 0,
    ownedDomainCitations: 19,
    competitorLedQueries: 13,
    externalLedQueries: 11,
    brandVsCompetitors: [
      { name: 'Toyota', visibility: 88, citationShare: 42, sentiment: 84, position: 'Leader' },
      { name: 'Honda', visibility: 79, citationShare: 34, sentiment: 78, position: 'Leader' },
      { name: 'Nissan', visibility: 72, citationShare: 19, sentiment: 75, position: 'Challenger' },
      { name: 'Mazda', visibility: 61, citationShare: 14, sentiment: 70, position: 'Niche' },
      { name: 'Subaru', visibility: 58, citationShare: 13, sentiment: 73, position: 'Watchlist' }
    ]
  },
  sourceLandscape: { sourceTypeCounts: [], observedNonOwnedDomains: [], winningSourcePatterns: [] },
  trend: [
    { period: 'W-5', brandScore: 6.4, ownedCitations: 11, competitorPressure: 72 },
    { period: 'W-4', brandScore: 6.6, ownedCitations: 13, competitorPressure: 74 },
    { period: 'W-3', brandScore: 6.9, ownedCitations: 15, competitorPressure: 76 },
    { period: 'W-2', brandScore: 7.0, ownedCitations: 18, competitorPressure: 77 },
    { period: 'W-1', brandScore: 7.1, ownedCitations: 19, competitorPressure: 78 },
    { period: 'Now', brandScore: 7.2, ownedCitations: 19, competitorPressure: 80 }
  ],
  queries: [
    {
      id: 'q1',
      query: 'best electric SUV for family in Japan',
      journey: 'Consideration',
      visibilityStatus: 'sample',
      ownedTargetPageCited: false,
      winningExternalSourceTypes: [],
      ownedGeoScore120: 0,
      externalBenchmarkScore: 0,
      sourcePreferenceGap: 0,
      gapReasons: [],
      citations: [],
      brandPosition: 3,
      leadingCompetitor: 'Toyota',
      leadingPublisher: 'EV database / automotive reviews',
      sourceType: 'Publisher-led comparison',
      citationLikelihood: 63,
      confidence: 82,
      issue: 'Nissan appears in the answer but not as the strongest evidence source.',
      recommendedMove: 'Add a comparison block with family use cases, charging range, safety and ownership proof.'
    },
    {
      id: 'q2',
      query: 'Nissan Ariya charging range and battery warranty',
      journey: 'Product validation',
      visibilityStatus: 'sample',
      ownedTargetPageCited: false,
      winningExternalSourceTypes: [],
      ownedGeoScore120: 0,
      externalBenchmarkScore: 0,
      sourcePreferenceGap: 0,
      gapReasons: [],
      citations: [],
      brandPosition: 2,
      leadingCompetitor: 'Honda',
      leadingPublisher: 'Manufacturer and review sites',
      sourceType: 'Mixed owned and external',
      citationLikelihood: 71,
      confidence: 79,
      issue: 'The product page contains specs but answer engines prefer compact factual sections.',
      recommendedMove: 'Create a citation-ready battery, charging and warranty FAQ module.'
    },
    {
      id: 'q3',
      query: 'which Japanese EV has best resale value',
      journey: 'Commercial evaluation',
      visibilityStatus: 'sample',
      ownedTargetPageCited: false,
      winningExternalSourceTypes: [],
      ownedGeoScore120: 0,
      externalBenchmarkScore: 0,
      sourcePreferenceGap: 0,
      gapReasons: [],
      citations: [],
      brandPosition: 4,
      leadingCompetitor: 'Toyota',
      leadingPublisher: 'Resale value publishers',
      sourceType: 'External benchmark',
      citationLikelihood: 48,
      confidence: 74,
      issue: 'Nissan lacks strong third-party proof for resale-value comparison queries.',
      recommendedMove: 'Develop PR outreach and owned explainer content referencing recognised resale data.'
    }
  ],
  ownedPages: [
    {
      url: 'https://www.nissan.co.jp/ARIYA/',
      journeyCategory: 'Sample',
      relatedQueries: [],
      mappedQuery: 'Nissan Ariya range charging battery warranty',
      geoScore: 72,
      clarity: 14,
      semanticDepth: 12,
      evidence: 10,
      structure: 13,
      freshness: 11,
      authority: 12,
      diagnostics: ['Strong product relevance', 'Needs answer-first summary', 'Evidence blocks are fragmented']
    },
    {
      url: 'https://www.nissan.co.jp/EV/',
      journeyCategory: 'Sample',
      relatedQueries: [],
      mappedQuery: 'best electric car Japan family charging cost',
      geoScore: 64,
      clarity: 12,
      semanticDepth: 11,
      evidence: 9,
      structure: 11,
      freshness: 10,
      authority: 11,
      diagnostics: ['Broad EV narrative', 'Comparison intent under-served', 'Statistics and citations need strengthening']
    },
    {
      url: 'https://www.nissan.co.jp/SERENA/e-POWER/',
      journeyCategory: 'Sample',
      relatedQueries: [],
      mappedQuery: 'family hybrid minivan Japan e power fuel economy',
      geoScore: 69,
      clarity: 13,
      semanticDepth: 12,
      evidence: 11,
      structure: 11,
      freshness: 10,
      authority: 12,
      diagnostics: ['Clear product story', 'Needs direct Q&A snippets', 'More third-party proof required']
    }
  ],
  cmsModules: [
    {
      title: 'Answer-first model summary module',
      targetUrl: 'https://www.nissan.co.jp/ARIYA/',
      recommendation: 'Place a 120-word direct answer at the top of the page covering range, charging, warranty, safety and family suitability.',
      evidencePattern: 'Winning sources use compact answer blocks with specific facts and comparison language.',
      priority: 'High',
      owner: 'CMS'
    },
    {
      title: 'Citation-ready FAQ block',
      targetUrl: 'https://www.nissan.co.jp/EV/',
      recommendation: 'Add marked-up FAQ entries for range, home charging, public charging, battery care and ownership cost.',
      evidencePattern: 'Models prefer structured passages that can be lifted directly into answer summaries.',
      priority: 'High',
      owner: 'SEO / Content'
    }
  ],
  prOpportunities: [
    {
      title: 'Third-party EV ownership proof',
      targetUrl: 'Priority EV pages',
      recommendation: 'Secure references from recognised automotive and ownership-cost publishers around EV cost, reliability and charging experience.',
      evidencePattern: 'External benchmark sources are currently leading comparison and validation queries.',
      priority: 'Medium',
      owner: 'PR'
    }
  ],
  actionChecklist: [
    { action: 'Add answer-first summaries to top 3 owned pages', owner: 'CMS', priority: 'High', effort: 'M', status: 'Not started' },
    { action: 'Create query-to-page mapping for all priority journeys', owner: 'SEO', priority: 'High', effort: 'S', status: 'In progress' },
    { action: 'Launch third-party evidence outreach for EV comparison topics', owner: 'PR', priority: 'Medium', effort: 'M', status: 'Not started' },
    { action: 'Set up weekly trend refresh and run history view', owner: 'Product', priority: 'Medium', effort: 'L', status: 'Not started' }
  ]
};
