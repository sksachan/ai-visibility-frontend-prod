import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CircleDashed, PlayCircle, RefreshCcw, XCircle } from 'lucide-react';
import { fetchRefreshStatus, refreshEvidence, type RunStatusSummary } from '../lib/api';
import { Card, SectionTitle } from './ui';

const terminalStages = new Set(['completed', 'success', 'successful', 'succeeded', 'report_bundle_ready', 'evidence_ready']);
const failedStages = new Set(['failed', 'error', 'cancelled', 'canceled']);

const stageLabels: Record<string, string> = {
  accepted: 'Refresh accepted',
  portfolio_generation_queued: 'Synthetic portfolio queued',
  portfolio_generation_running: 'Generating synthetic query portfolio',
  portfolio_ui_hitl_waiting: 'Waiting for Bodhi UI-node submission',
  portfolio_ui_hitl_submitted: 'Submitted Bodhi UI-node form',
  portfolio_generation_completed: 'Synthetic query portfolio generated',
  sitemap_inventory_running: 'Loading sitemap inventory',
  owned_url_mapping_running: 'Mapping queries to owned URLs',
  serpapi_collection_running: 'Collecting fresh AI citations',
  crawl_refresh_running: 'Refreshing crawl evidence',
  owned_crawl_running: 'Crawling mapped owned URLs',
  external_crawl_running: 'Crawling top external citation URLs',
  auditor_queued: 'Bodhi auditor queued',
  auditor_running: 'Bodhi auditor running',
  evidence_ready: 'Evidence refresh ready',
  report_bundle_ready: 'Report bundle ready',
  failed: 'Refresh failed'
};

function niceStage(value?: string) {
  const key = String(value || '').trim();
  if (!key) return 'Status not checked yet';
  return stageLabels[key] || key.replaceAll('_', ' ');
}

function statusText(status: RunStatusSummary | null) {
  if (!status) return 'Status not checked yet.';
  if (status.active) {
    const id = status.runId || status.jobId || 'refresh run';
    return `${niceStage(status.stage || status.status)}: ${id}. The dashboard will continue showing the last successful report until this completes.`;
  }
  if (status.latestSuccessfulRunId) return `Latest successful evidence/report run: ${status.latestSuccessfulRunId}.`;
  return 'No active refresh run detected.';
}

function StagePill({ label, state }: { label: string; state: 'pending' | 'active' | 'done' | 'failed' }) {
  const classes = {
    pending: 'border-slate-200 bg-white text-slate-500',
    active: 'border-blue-200 bg-blue-50 text-blue-800',
    done: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    failed: 'border-red-200 bg-red-50 text-red-800'
  }[state];
  const Icon = state === 'done' ? CheckCircle2 : state === 'failed' ? XCircle : CircleDashed;
  return <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${classes}`}><Icon size={13} />{label}</span>;
}

export function RefreshPanel({ brand, market }: { brand: string; market: string }) {
  const [domain, setDomain] = useState('https://www.nissan.co.jp');
  const [queryLimit, setQueryLimit] = useState(5);
  const [runMode, setRunMode] = useState('fresh_mapping');
  const [queryPortfolioMode, setQueryPortfolioMode] = useState('synthetic');
  const [queryPortfolioId, setQueryPortfolioId] = useState('');
  const [seedTopics, setSeedTopics] = useState('');
  const [topicCount, setTopicCount] = useState(8);
  const [queriesPerTopic, setQueriesPerTopic] = useState(6);
  const [language, setLanguage] = useState('English');
  const [portfolioGoal, setPortfolioGoal] = useState('AI answer visibility audit query portfolio.');
  const [sitemapUrl, setSitemapUrl] = useState('https://www.nissan.co.jp/sitemap.xml');
  const [maxOwnedPagesPerQuery, setMaxOwnedPagesPerQuery] = useState(3);
  const [maxExternalCitationsPerQuery, setMaxExternalCitationsPerQuery] = useState(3);
  const [enableSerpapi, setEnableSerpapi] = useState(false);
  const [enableOwnedCrawl, setEnableOwnedCrawl] = useState(false);
  const [enableExternalCrawl, setEnableExternalCrawl] = useState(false);
  const [triggerAuditor, setTriggerAuditor] = useState(true);
  const [refreshResult, setRefreshResult] = useState<string | null>(null);
  const [status, setStatus] = useState<RunStatusSummary | null>(null);
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const currentStage = String(status?.stage || status?.status || '').toLowerCase();
  const stageState = useMemo(() => {
    const order = ['accepted', 'portfolio_generation_running', 'portfolio_generation_completed', 'sitemap_inventory_running', 'owned_url_mapping_running', 'serpapi_collection_running', 'crawl_refresh_running', 'auditor_running', 'report_bundle_ready'];
    const idx = order.indexOf(currentStage);
    return { idx, isFailed: failedStages.has(currentStage), isDone: terminalStages.has(currentStage) };
  }, [currentStage]);

  async function checkStatus() {
    setIsChecking(true);
    setError('');
    try {
      setStatus(await fetchRefreshStatus(brand, market));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsChecking(false);
    }
  }

  useEffect(() => {
    const initial = window.setTimeout(() => void checkStatus(), 0);
    const timer = window.setInterval(() => void checkStatus(), 15000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand, market]);

  async function onSubmit() {
    setIsSubmitting(true);
    setError('');
    setRefreshResult(null);
    try {
      const result = await refreshEvidence({
        brand,
        market,
        domain,
        runMode,
        queryPortfolioMode,
        queryPortfolioId: queryPortfolioId.trim() || undefined,
        sitemapUrl: sitemapUrl.trim() || undefined,
        seedTopics: seedTopics.trim() || undefined,
        topicCount,
        queriesPerTopic,
        language,
        portfolioGoal,
        queryLimit,
        maxOwnedPagesPerQuery,
        maxExternalCitationsPerQuery,
        enableSerpapi,
        enableOwnedCrawl,
        enableExternalCrawl,
        triggerAuditor
      });
      const id = result.targetRunId || result.evidenceRunId || result.runId || result.jobId || 'new refresh run';
      setRefreshResult(`Refresh evidence started: ${id}. Load latest will continue returning the last successful report until the new run completes and is promoted.`);
      await checkStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  const statusPills = [
    ['accepted', 'Accepted'],
    ['portfolio_generation_running', 'Portfolio'],
    ['portfolio_generation_completed', 'Portfolio ready'],
    ['sitemap_inventory_running', 'Sitemap'],
    ['owned_url_mapping_running', 'Mapping'],
    ['serpapi_collection_running', 'AI citations'],
    ['crawl_refresh_running', 'Crawls'],
    ['auditor_running', 'Auditor'],
    ['report_bundle_ready', 'Report ready']
  ] as const;

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle eyebrow="Refresh Evidence" title="Start a new evidence run without replacing the current report">
          Evidence refresh is executed by the Railway evidence service. The dashboard keeps showing the last successful report while a new refresh is running.
        </SectionTitle>

        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-medium">{statusText(status)}</p>
              {status?.runId && <p className="mt-1 text-xs text-slate-500">Run ID: {status.runId}</p>}
            </div>
            <button onClick={() => void checkStatus()} disabled={isChecking} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60">
              <RefreshCcw size={16} /> {isChecking ? 'Checking...' : 'Check status'}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {statusPills.map(([stage, label], index) => {
              const state = stageState.isFailed ? (currentStage === stage ? 'failed' : 'pending') : stageState.isDone || (stageState.idx >= 0 && index < stageState.idx) ? 'done' : currentStage === stage ? 'active' : 'pending';
              return <StagePill key={stage} label={label} state={state} />;
            })}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-sm font-medium text-slate-700">Domain
            <input className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2" value={domain} onChange={(e) => setDomain(e.target.value)} />
          </label>
          <label className="text-sm font-medium text-slate-700">Run mode
            <select className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2" value={runMode} onChange={(e) => setRunMode(e.target.value)}>
              <option value="fresh_mapping">Portfolio + mapping smoke test</option>
              <option value="reuse_existing_evidence">Reuse existing evidence</option>
              <option value="refresh_owned_pages">Refresh mapped owned URLs</option>
              <option value="refresh_external_pages">Refresh existing external top-3 pages</option>
              <option value="fresh_ai_citations">Fresh AI citations / SerpAPI</option>
              <option value="full_refresh">Full refresh</option>
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">Query portfolio mode
            <select className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2" value={queryPortfolioMode} onChange={(e) => setQueryPortfolioMode(e.target.value)}>
              <option value="synthetic">Synthetic DeepResearch portfolio</option>
              <option value="reuse">Reuse latest portfolio</option>
              <option value="manual">Manual portfolio from evidence layer</option>
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">Portfolio ID optional
            <input className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2" value={queryPortfolioId} onChange={(e) => setQueryPortfolioId(e.target.value)} placeholder="portfolio_id from Railway evidence layer" />
          </label>
          <label className="text-sm font-medium text-slate-700">Topic count
            <select className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2" value={topicCount} onChange={(e) => setTopicCount(Number(e.target.value))}>
              <option value={4}>4 topics</option>
              <option value={8}>8 topics</option>
              <option value={12}>12 topics</option>
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">Queries per topic
            <select className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2" value={queriesPerTopic} onChange={(e) => setQueriesPerTopic(Number(e.target.value))}>
              <option value={3}>3</option>
              <option value={6}>6</option>
              <option value={10}>10</option>
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700 md:col-span-2">Seed topics optional
            <input className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2" value={seedTopics} onChange={(e) => setSeedTopics(e.target.value)} placeholder="EV range, charging, warranty, resale, safety..." />
          </label>
          <label className="text-sm font-medium text-slate-700">Language
            <input className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2" value={language} onChange={(e) => setLanguage(e.target.value)} />
          </label>
          <label className="text-sm font-medium text-slate-700 md:col-span-3">Portfolio goal
            <input className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2" value={portfolioGoal} onChange={(e) => setPortfolioGoal(e.target.value)} />
          </label>
          <label className="text-sm font-medium text-slate-700 md:col-span-2">Sitemap URL
            <input className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2" value={sitemapUrl} onChange={(e) => setSitemapUrl(e.target.value)} />
          </label>
          <label className="text-sm font-medium text-slate-700">Query limit
            <select className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2" value={queryLimit} onChange={(e) => setQueryLimit(Number(e.target.value))}>
              <option value={5}>5 queries smoke test</option>
              <option value={25}>25 queries</option>
              <option value={50}>50 queries</option>
              <option value={100}>100 queries</option>
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">Owned URLs per query
            <select className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2" value={maxOwnedPagesPerQuery} onChange={(e) => setMaxOwnedPagesPerQuery(Number(e.target.value))}>
              <option value={1}>1</option>
              <option value={3}>3</option>
              <option value={5}>5</option>
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">External citations per query
            <select className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2" value={maxExternalCitationsPerQuery} onChange={(e) => setMaxExternalCitationsPerQuery(Number(e.target.value))}>
              <option value={1}>1</option>
              <option value={3}>3</option>
              <option value={5}>5</option>
            </select>
          </label>
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
            <p className="mb-2 font-semibold">Evidence operations</p>
            <label className="flex items-center gap-2"><input type="checkbox" checked={enableOwnedCrawl} onChange={(e) => setEnableOwnedCrawl(e.target.checked)} /> Refresh mapped owned URLs</label>
            <label className="mt-2 flex items-center gap-2"><input type="checkbox" checked={enableExternalCrawl} onChange={(e) => setEnableExternalCrawl(e.target.checked)} /> Refresh external top-3 pages</label>
            <label className="mt-2 flex items-center gap-2"><input type="checkbox" checked={enableSerpapi} onChange={(e) => setEnableSerpapi(e.target.checked)} /> Enable SerpAPI / fresh AI citations</label>
            <label className="mt-2 flex items-center gap-2"><input type="checkbox" checked={triggerAuditor} onChange={(e) => setTriggerAuditor(e.target.checked)} /> Trigger Bodhi Auditor after evidence</label>
          </div>
          <div className="flex items-end md:col-span-3">
            <button onClick={onSubmit} disabled={isSubmitting} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 md:w-auto">
              <PlayCircle size={18} /> {isSubmitting ? 'Starting refresh...' : 'Start Refresh Evidence'}
            </button>
          </div>
        </div>

        {refreshResult && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-800">{refreshResult}</p>}
        {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-800">{error}</p>}
      </Card>

      <Card>
        <SectionTitle eyebrow="Report selection rule" title="Load latest remains last-successful only" />
        <p className="text-sm leading-6 text-slate-700">
          During a refresh, the dashboard deliberately does not switch to an in-progress or failed run. Use <span className="font-semibold">Load latest</span> after the refresh completes; it will return the newest successful report bundle only.
        </p>
      </Card>
    </div>
  );
}
