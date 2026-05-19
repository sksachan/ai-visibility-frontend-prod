import { normaliseReport } from './normaliseReport';

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

function canonicalBundle(overrides: Record<string, unknown> = {}) {
  const mapped_owned_urls = Array.from({ length: 34 }, (_, index) => ({
    url: `https://www3.nissan.co.jp/test/page-${index + 1}.html`,
    title: '',
    current_geo_score_120: 30 + index,
    geo_dimensions: { content_clarity: 10, structured_data: index < 25 ? 2 : 0 }
  }));

  return {
    schema_version: 'query_workbench.v1',
    contract_version: 'page_level_cms_grouped_pr.v2',
    run_id: 'evidence_nissan_japan_fixture',
    brand: 'Nissan',
    market: 'Japan',
    generated_at: '2026-05-19T13:09:48Z',
    executive: {
      summary: 'Fixture report',
      headline_metrics: {
        ai_visibility_score: 11,
        query_count: 15,
        owned_page_count: 34,
        average_owned_geo_score_120: 32.5
      }
    },
    query_workbench: [{
      query_id: 'q001',
      query: 'Fixture query',
      journey_category: 'awareness',
      current_ai_visibility: { score: 0, status: 'not_observed' },
      mapped_owned_urls
    }],
    ...overrides
  };
}

const wrappedLatestLikePayload = {
  May26NissanJapanAIAuditFixture: {
    start: { status: 'success', data: { startTime: '2026-05-19T13:09:41.188Z' } },
    'Preview Node': {
      data: {
        layout: {
          tiles: [{
            i: 'frontend_report_bundle',
            data: { default: JSON.stringify(canonicalBundle()) }
          }]
        }
      }
    }
  }
};

const parsedWrapped = normaliseReport(wrappedLatestLikePayload);
assert(parsedWrapped.ownedPages.length === 34, 'wrapped Preview Node fixture should parse all 34 owned URLs');
assert(parsedWrapped.aiHygiene?.structured_data?.pages_with_json_ld === undefined, 'GEO structured_data score must not be treated as JSON-LD evidence');
assert(parsedWrapped.aiHygiene?.structured_data?.coverage_pct === undefined, 'missing explicit JSON-LD evidence should be not checked, not 0%');
assert(parsedWrapped.aiHygiene?.priority === 'not checked', 'missing explicit hygiene should be marked not checked');
assert(Boolean(parsedWrapped.parserMeta?.warnings?.some((warning) => warning.includes('not supplied'))), 'missing hygiene should emit a parser warning');

const explicitHygiene = normaliseReport(canonicalBundle({
  ai_discoverability_hygiene: {
    priority: 'low',
    robots_txt: { status: 'available', url: 'https://www.nissan.co.jp/robots.txt', sitemap_entries_count: 12 },
    llms_txt: { status: 'available', url: 'https://www.nissan.co.jp/llms.txt', chars: 1200 },
    structured_data: { owned_pages_total: 34, pages_with_schema: 7, pages_with_json_ld: 7, coverage_pct: 20.6 },
    summary: 'Explicit hygiene fixture'
  }
}));
assert(explicitHygiene.aiHygiene?.structured_data?.pages_with_json_ld === 7, 'explicit hygiene should win over derived fallback');
assert(explicitHygiene.aiHygiene?.robots_txt?.status === 'available', 'explicit robots.txt status should be preserved');
assert(!explicitHygiene.parserMeta?.warnings?.some((warning) => warning.includes('hygiene payload was not supplied')), 'explicit hygiene should not warn as missing');

const crawlSignals = normaliseReport(canonicalBundle({
  query_workbench: [{
    query_id: 'q001',
    query: 'Fixture query',
    journey_category: 'awareness',
    current_ai_visibility: { score: 0, status: 'not_observed' },
    mapped_owned_urls: [
      { url: 'https://www3.nissan.co.jp/test/with-jsonld.html', current_geo_score_120: 40, technical_signals: { json_ld_present: true, schema_types: ['FAQPage'] } },
      { url: 'https://www3.nissan.co.jp/test/without-jsonld.html', current_geo_score_120: 35, technical_signals: { json_ld_present: false } }
    ]
  }]
}));
assert(crawlSignals.aiHygiene?.structured_data?.pages_with_json_ld === 1, 'explicit per-page crawl signals should derive JSON-LD count');
assert(crawlSignals.aiHygiene?.structured_data?.coverage_pct === 50, 'explicit per-page crawl signals should derive coverage percentage');

const hygieneMissingPages = [
  { url: 'https://www3.nissan.co.jp/test/missing-1.html', title: 'Missing 1' },
  { url: 'https://www3.nissan.co.jp/test/missing-2.html', title: 'Missing 2' },
  { url: 'https://www3.nissan.co.jp/test/missing-3.html', title: 'Missing 3' },
  { url: 'https://www3.nissan.co.jp/test/missing-4.html', title: 'Missing 4' },
  { url: 'https://www3.nissan.co.jp/test/missing-5.html', title: 'Missing 5' },
  { url: 'https://www3.nissan.co.jp/test/missing-6.html', title: 'Missing 6' },
  { url: 'https://www3.nissan.co.jp/test/missing-7.html', title: 'Missing 7' }
];
const hygieneAugmented = normaliseReport(canonicalBundle({
  ai_discoverability_hygiene: {
    priority: 'high',
    robots_txt: { status: 'available' },
    llms_txt: { status: 'not found' },
    structured_data: {
      owned_pages_total: 8,
      pages_with_schema: 1,
      pages_with_json_ld: 1,
      coverage_pct: 12.5,
      schema_types_detected: [['Organization', 1]],
      pages_missing_json_ld: hygieneMissingPages
    },
    summary: 'Explicit 1/8 hygiene fixture'
  },
  query_workbench: [{
    query_id: 'q001',
    query: 'Fixture query',
    journey_category: 'awareness',
    current_ai_visibility: { score: 0, status: 'not_observed' },
    mapped_owned_urls: [
      { url: 'https://www3.nissan.co.jp/test/with-jsonld.html', current_geo_score_120: 40 },
      { url: 'https://www3.nissan.co.jp/test/missing-1.html', current_geo_score_120: 30 },
      { url: 'https://www3.nissan.co.jp/test/missing-2.html', current_geo_score_120: 25 },
      { url: 'https://www3.nissan.co.jp/test/missing-3.html', current_geo_score_120: 20 }
    ]
  }]
}));
assert(hygieneAugmented.ownedPages.length === 8, 'hygiene missing-page list should augment owned URL rows to the audited total');
assert(hygieneAugmented.ownedPages.find((page) => page.url.endsWith('/with-jsonld.html'))?.technicalSignals?.jsonLdPresent === true, 'non-missing page should be marked JSON-LD present when hygiene says 1/8 and seven URLs are missing');
assert(hygieneAugmented.ownedPages.find((page) => page.url.endsWith('/missing-7.html'))?.technicalSignals?.jsonLdPresent === false, 'hygiene-only missing pages should be represented as JSON-LD missing');
