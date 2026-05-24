import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, CircleDashed, Download, PlayCircle, RefreshCcw, Save, Trash2, Upload, XCircle } from 'lucide-react';
import { fetchRefreshStatus, refreshEvidence, fetchBrandConfigs, saveBrandConfig, deleteBrandConfig, fetchPortfolioTemplate, uploadPortfolio, validatePortfolio, type RunStatusSummary, type BrandConfig, type PortfolioValidationResult } from '../lib/api';
import { WorkspacePanel, SectionHeader, DarkButton, WorkflowStage } from './ui';

const failedStages = new Set(['failed', 'error', 'cancelled', 'canceled']);
const terminalStages = new Set(['completed', 'success', 'successful', 'succeeded', 'report_bundle_ready']);

const workflowStages = [
  { key: 'portfolio', label: 'Portfolio generation' },
  { key: 'sitemap', label: 'Sitemap discovery' },
  { key: 'mapping', label: 'Owned URL mapping' },
  { key: 'ai_citations', label: 'AI citation collection' },
  { key: 'crawls', label: 'Crawl evidence' },
  { key: 'auditor', label: 'Bodhi auditor' },
  { key: 'report_ready', label: 'Report bundle' },
] as const;

type WfKey = typeof workflowStages[number]['key'];

const stageLabels: Record<string, string> = {
  accepted: 'Refresh accepted',
  portfolio_generation_queued: 'Synthetic portfolio queued',
  portfolio_generation_running: 'Generating synthetic query portfolio',
  portfolio_ui_hitl_waiting: 'Waiting for portfolio UI-node submission',
  portfolio_ui_hitl_submitted: 'Submitted portfolio UI-node form',
  portfolio_generation_completed: 'Synthetic query portfolio generated',
  sitemap_inventory_running: 'Loading sitemap inventory',
  sitemap_inventory_completed: 'Sitemap inventory loaded',
  owned_url_mapping_running: 'Mapping queries to owned URLs',
  owned_url_mapping_completed: 'Query-to-owned URL mapping completed',
  serpapi_collection_running: 'Collecting fresh AI citations',
  serpapi_collection_completed: 'AI citation collection completed',
  crawl_refresh_running: 'Refreshing crawl evidence',
  owned_crawl_running: 'Crawling owned inventory URLs',
  owned_crawl_completed: 'Owned URL crawl completed',
  external_crawl_running: 'Crawling top external citation URLs',
  external_crawl_completed: 'External citation crawl completed',
  evidence_ready: 'Evidence bundle ready',
  auditor_queued: 'Bodhi auditor queued',
  auditor_ui_hitl_waiting: 'Waiting for auditor UI-node submission',
  auditor_ui_hitl_submitted: 'Submitted auditor UI-node form',
  auditor_running: 'Bodhi auditor running',
  auditor_completed: 'Bodhi auditor completed',
  report_bundle_ready: 'Report bundle ready',
  failed: 'Refresh failed',
};

function normaliseStage(value?: string) { return String(value || '').trim().toLowerCase(); }
function niceStage(value?: string) { const key = normaliseStage(value); if (!key) return 'Status not checked yet'; return stageLabels[key] || key.replaceAll('_', ' '); }

function wfKeyForStage(stage?: string): WfKey | null {
  const s = normaliseStage(stage);
  if (!s) return null;
  if (s.startsWith('portfolio_') || s === 'accepted') return 'portfolio';
  if (s.startsWith('sitemap_')) return 'sitemap';
  if (s.startsWith('owned_url_mapping_')) return 'mapping';
  if (s.startsWith('serpapi_') || s.includes('ai_citation')) return 'ai_citations';
  if (s.includes('crawl')) return 'crawls';
  // evidence_ready means crawls are done and we're waiting for auditor — show crawls as done
  if (s === 'evidence_ready') return 'auditor';
  // Match all auditor-related stages including auditor_run_created, auditor_ui_hitl_*,
  // auditor_queued, auditor_running, auditor_completed, auditor_failed
  if (s.startsWith('auditor_') || s.startsWith('bodhi_auditor') || s === 'auditor') return 'auditor';
  if (s === 'report_bundle_ready' || terminalStages.has(s)) return 'report_ready';
  return null;
}

function runIdFrom(status: RunStatusSummary | null, fallback = '') { return status?.runId || status?.targetRunId || status?.jobId || fallback; }

function statusText(status: RunStatusSummary | null, trackedRunId: string) {
  const id = runIdFrom(status, trackedRunId);
  if (!status && trackedRunId) return `Tracking: ${trackedRunId}`;
  if (!status) return 'Status not checked yet.';
  // Error state takes precedence over everything
  if (status.errorMessage || status.status === 'failed') {
    const errMsg = status.errorMessage || niceStage(status.stage || 'failed');
    return `Failed${id ? ` \u00b7 ${id}` : ''}: ${errMsg}`;
  }
  // When backend is actively processing, show the current stage and run ID
  if (status.active) return `${niceStage(status.stage || status.status)}${id ? ` \u00b7 ${id}` : ''}`;
  // When idle (no active run), show waiting message with latest successful run info
  if (status.latestSuccessfulRunId) return `Waiting to start \u00b7 Last success: ${status.latestSuccessfulRunId}`;
  return 'Waiting to start \u00b7 No previous successful runs.';
}

function valueFromRaw(raw: unknown, keys: string[]): string {
  if (!raw || typeof raw !== 'object') return '';
  const obj = raw as Record<string, unknown>;
  for (const key of keys) { const value = obj[key]; if (typeof value === 'string' && value.trim()) return value.trim(); if (typeof value === 'number') return String(value); }
  return '';
}

export function RefreshPanel({ brand: defaultBrand, market: defaultMarket }: { brand: string; market: string }) {
  const [brand, setBrand] = useState(defaultBrand || '');
  const [market, setMarket] = useState(defaultMarket || '');
  const [domain, setDomain] = useState('');
  const [ownedDomains, setOwnedDomains] = useState('');
  const [brandTerms, setBrandTerms] = useState('');
  const [queryLimit, setQueryLimit] = useState(5);
  const [runMode, setRunMode] = useState('fresh_mapping');
  const [queryPortfolioMode, setQueryPortfolioMode] = useState('synthetic');
  const [queryPortfolioId, setQueryPortfolioId] = useState('');
  const [sourceRunId, setSourceRunId] = useState('');
  const [seedTopics, setSeedTopics] = useState('');
  const [topicCount, setTopicCount] = useState(8);
  const [queriesPerTopic, setQueriesPerTopic] = useState(6);
  const [language, setLanguage] = useState('English');
  const [portfolioGoal, setPortfolioGoal] = useState('AI answer visibility audit query portfolio.');
  const [sitemapUrl, setSitemapUrl] = useState('');
  const [maxOwnedPagesPerQuery, setMaxOwnedPagesPerQuery] = useState(3);
  const [maxExternalCitationsPerQuery, setMaxExternalCitationsPerQuery] = useState(3);
  const [maxOwnedInventoryUrls, setMaxOwnedInventoryUrls] = useState(60);
  const [maxExternalUrls, setMaxExternalUrls] = useState(150);
  const [enableSerpapi, setEnableSerpapi] = useState(false);
  const [enableOwnedCrawl, setEnableOwnedCrawl] = useState(false);
  const [enableExternalCrawl, setEnableExternalCrawl] = useState(false);
  const [triggerAuditor, setTriggerAuditor] = useState(true);
  const [trackedRunId, setTrackedRunId] = useState('');
  const [refreshResult, setRefreshResult] = useState<string | null>(null);
  const [status, setStatus] = useState<RunStatusSummary | null>(null);
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [brandConfigs, setBrandConfigs] = useState<BrandConfig[]>([]);
  const [selectedBrandKey, setSelectedBrandKey] = useState('');
  const [brandConfigsLoading, setBrandConfigsLoading] = useState(false);
  const [portfolioJson, setPortfolioJson] = useState('');
  const [portfolioValidation, setPortfolioValidation] = useState<PortfolioValidationResult | null>(null);
  const [portfolioUploading, setPortfolioUploading] = useState(false);
  const portfolioFileRef = useRef<HTMLInputElement>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [deletingConfig, setDeletingConfig] = useState(false);
  const [configNotice, setConfigNotice] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  const loadBrandConfigs = useCallback(async () => {
    setBrandConfigsLoading(true);
    try { const configs = await fetchBrandConfigs(); setBrandConfigs(configs); } catch { /* optional */ } finally { setBrandConfigsLoading(false); }
  }, []);
  useEffect(() => { void loadBrandConfigs(); }, [loadBrandConfigs]);

  function applyBrandConfig(key: string) {
    setSelectedBrandKey(key); if (!key) return;
    const config = brandConfigs.find(c => `${c.brand}__${c.market}` === key); if (!config) return;
    setBrand(config.brand); setMarket(config.market); setDomain(config.domain || '');
    setOwnedDomains(config.owned_domains?.join(', ') || ''); setBrandTerms(config.brand_terms?.join(', ') || '');
    setLanguage(config.language || 'English'); setSitemapUrl(config.default_sitemap_url || '');
    setSeedTopics(config.default_seed_topics || ''); setTopicCount(config.default_topic_count || 8);
    setQueriesPerTopic(config.default_queries_per_topic || 6); setQueryLimit(config.default_query_limit || 50);
    setPortfolioGoal(config.default_portfolio_goal || 'AI answer visibility audit query portfolio.');
  }

  async function onSaveBrandConfig() {
    if (!brand.trim() || !market.trim()) { setConfigNotice({ tone: 'error', message: 'Brand and Market are required.' }); return; }
    setSavingConfig(true); setConfigNotice(null);
    try {
      await saveBrandConfig({ brand: brand.trim(), market: market.trim(), domain: domain.trim() || undefined, owned_domains: ownedDomains.trim() ? ownedDomains.split(',').map(s => s.trim()).filter(Boolean) : [], brand_terms: brandTerms.trim() ? brandTerms.split(',').map(s => s.trim()).filter(Boolean) : [], language, default_sitemap_url: sitemapUrl.trim() || undefined, default_seed_topics: seedTopics.trim() || undefined, default_topic_count: topicCount, default_queries_per_topic: queriesPerTopic, default_query_limit: queryLimit, default_portfolio_goal: portfolioGoal.trim() || undefined });
      setConfigNotice({ tone: 'success', message: `Saved ${brand} / ${market}.` }); setSelectedBrandKey(`${brand}__${market}`); await loadBrandConfigs();
    } catch (err) { setConfigNotice({ tone: 'error', message: err instanceof Error ? err.message : 'Failed.' }); } finally { setSavingConfig(false); }
  }

  async function onDeleteBrandConfig() {
    if (!selectedBrandKey) return;
    const config = brandConfigs.find(c => `${c.brand}__${c.market}` === selectedBrandKey); if (!config) return;
    if (!window.confirm(`Delete ${config.brand} / ${config.market}?`)) return;
    setDeletingConfig(true); setConfigNotice(null);
    try { await deleteBrandConfig(config.brand, config.market); setConfigNotice({ tone: 'success', message: `Deleted.` }); setSelectedBrandKey(''); await loadBrandConfigs(); }
    catch (err) { setConfigNotice({ tone: 'error', message: err instanceof Error ? err.message : 'Failed.' }); } finally { setDeletingConfig(false); }
  }

  async function onPortfolioFileUpload(file: File | undefined) {
    if (!file) return;
    try { const text = await file.text(); setPortfolioJson(text); const parsed = JSON.parse(text); const result = await validatePortfolio(parsed); setPortfolioValidation(result); }
    catch (err) { setPortfolioValidation({ status: 'error', errors: [err instanceof Error ? err.message : 'Invalid JSON file'] }); }
    finally { if (portfolioFileRef.current) portfolioFileRef.current.value = ''; }
  }

  async function onValidatePortfolio() {
    if (!portfolioJson.trim()) return;
    try { const parsed = JSON.parse(portfolioJson); const result = await validatePortfolio(parsed); setPortfolioValidation(result); }
    catch (err) { setPortfolioValidation({ status: 'error', errors: [err instanceof Error ? err.message : 'Invalid JSON'] }); }
  }

  async function onDownloadTemplate() {
    try { const template = await fetchPortfolioTemplate(brand, market, domain); const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `portfolio_template_${brand || 'brand'}_${market || 'market'}.json`; a.click(); URL.revokeObjectURL(url); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to download template'); }
  }

  const currentStage = normaliseStage(status?.stage || status?.status);
  const currentWfKey = wfKeyForStage(currentStage);
  const wfIdx = currentWfKey ? workflowStages.findIndex(s => s.key === currentWfKey) : -1;
  // Detect failure from error fields, not just stage name
  const hasErrorMessage = Boolean(status?.errorMessage);
  const isStatusFailed = status?.status === 'failed';
  const isFailed = failedStages.has(currentStage) || currentStage.endsWith('_failed') || hasErrorMessage || isStatusFailed;
  const isDone = !isFailed && (currentStage === 'report_bundle_ready' || terminalStages.has(currentStage));
  // Determine if the backend is actively processing (not just that we have a status object)
  const isActivelyRunning = Boolean(status?.active) && !isFailed && !isDone;

  async function checkStatus() {
    setIsChecking(true); setError('');
    try {
      // First, always query by brand/market to discover the latest active run.
      // This ensures we pick up new runs even if we were tracking an old failed one.
      const brandMarketStatus = await fetchRefreshStatus(brand, market);

      // If the brand/market query found an active run, use that run's ID.
      // This handles the case where a new run started after a previous failure.
      const activeRunId = brandMarketStatus.active
        ? (brandMarketStatus.runId || brandMarketStatus.targetRunId || '')
        : '';

      // If there's an active run from brand/market query, track that one.
      // If no active run but we have a tracked ID, query that specific run for its final status.
      // If no active run and no tracked ID, just use the brand/market status.
      let finalStatus = brandMarketStatus;
      if (activeRunId && activeRunId !== trackedRunId) {
        // New active run discovered - switch to tracking it
        setTrackedRunId(activeRunId);
      } else if (!brandMarketStatus.active && trackedRunId) {
        // No active run from brand/market. If we have a tracked ID from a previous
        // submission in this session, query it for final status. But do NOT re-query
        // stale IDs on initial page load — the brand/market status already told us
        // there is no active run, so the dashboard should show idle.
        // Only query specific run if the user started it in this session (has a result).
        if (refreshResult) {
          try {
            const specificStatus = await fetchRefreshStatus(brand, market, trackedRunId);
            finalStatus = specificStatus;
          } catch {
            // If specific run query fails, fall back to brand/market status
          }
        }
        // Otherwise, clear the stale tracked ID so we don't keep polling an old run
        // and showing its error state on every dashboard load.
        else {
          setTrackedRunId('');
        }
      }

      const nextRunId = activeRunId || (finalStatus.active ? runIdFrom(finalStatus, '') : '') || '';
      if (nextRunId) setTrackedRunId(nextRunId);
      setStatus(finalStatus);
    }
    catch (err) { setError(err instanceof Error ? err.message : String(err)); } finally { setIsChecking(false); }
  }

  useEffect(() => { const initial = window.setTimeout(() => void checkStatus(), 0); const timer = window.setInterval(() => void checkStatus(), 10000); return () => { window.clearTimeout(initial); window.clearInterval(timer); }; }, [brand, market, trackedRunId]);

  async function onSubmit() {
    setIsSubmitting(true); setError(''); setRefreshResult(null);
    try {
      let customPortfolio: Record<string, unknown> | undefined;
      if (queryPortfolioMode === 'upload' && portfolioJson.trim()) { try { customPortfolio = JSON.parse(portfolioJson); } catch { setError('Invalid portfolio JSON.'); setIsSubmitting(false); return; } }
      const result = await refreshEvidence({ brand, market, domain, runMode, queryPortfolioMode, queryPortfolioId: queryPortfolioId.trim() || undefined, sourceRunId: sourceRunId.trim() || undefined, sitemapUrl: sitemapUrl.trim() || undefined, seedTopics: seedTopics.trim() || undefined, topicCount, queriesPerTopic, language, portfolioGoal, queryLimit, maxOwnedPagesPerQuery, maxExternalCitationsPerQuery, maxOwnedInventoryUrls, maxExternalUrls, enableSerpapi, enableOwnedCrawl, enableExternalCrawl, triggerAuditor, ownedDomains: ownedDomains.trim() || undefined, brandTerms: brandTerms.trim() || undefined, customPortfolio });
      const id = result.targetRunId || result.evidenceRunId || result.runId || result.jobId || '';
      if (id) setTrackedRunId(id);
      setRefreshResult(`Refresh started${id ? `: ${id}` : ''}`);
      const nextStatus = await fetchRefreshStatus(brand, market, id || undefined); setStatus(nextStatus);
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); } finally { setIsSubmitting(false); }
  }

  const inputCls = 'w-full rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)]';
  const labelCls = 'text-sm font-medium text-[var(--text-secondary)]';
  const checkCls = 'flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-secondary)]';

  return (
    <div className="space-y-4">
      {/* Workflow status bar (horizontal) */}
      <WorkspacePanel>
        <SectionHeader eyebrow="Workflow Status" title={statusText(status, trackedRunId)} />
        <div className="flex flex-wrap gap-2">
          {workflowStages.map((stage, index) => {
            // State logic:
            // 1. Failed: the stage that failed shows red
            // 2. Done (all complete): all stages green
            // 3. Actively running: stages before current = done, current = active, after = pending
            // 4. Idle (no active run, no status): all pending
            let state: 'pending' | 'active' | 'done' | 'failed';
            if (isFailed) {
              // Show stages before failed stage as done, failed stage as failed, rest as pending
              if (currentWfKey === stage.key) {
                state = 'failed';
              } else if (wfIdx >= 0 && index < wfIdx) {
                state = 'done';
              } else {
                state = 'pending';
              }
            } else if (isDone) {
              state = 'done';
            } else if (isActivelyRunning && wfIdx >= 0) {
              // Backend is actively processing - show progress
              if (index < wfIdx) {
                state = 'done';
              } else if (currentWfKey === stage.key) {
                state = 'active';
              } else {
                state = 'pending';
              }
            } else {
              // Idle or status not yet loaded
              state = 'pending';
            }
            return <WorkflowStage key={stage.key} label={stage.label} state={state} />;
          })}
        </div>
        {isActivelyRunning && (status?.runId || trackedRunId) && (
          <p className="mt-3 text-xs font-mono text-[var(--accent-blue)]">
            Currently running: {status?.runId || trackedRunId}
          </p>
        )}
        {isFailed && (status?.runId || trackedRunId) && (
          <p className="mt-3 text-xs font-mono text-[var(--accent-danger)]">
            Failed: {status?.runId || trackedRunId}{status?.errorMessage ? ` — ${status.errorMessage}` : ''}
          </p>
        )}
        {!isActivelyRunning && !isFailed && !isDone && trackedRunId && (
          <p className="mt-3 text-xs font-mono text-[var(--text-muted)]">Last tracked: {trackedRunId}</p>
        )}
        <div className="mt-3 flex gap-2">
          <DarkButton onClick={() => void checkStatus()} disabled={isChecking}><RefreshCcw size={13} /> {isChecking ? 'Checking...' : 'Check status'}</DarkButton>
        </div>
      </WorkspacePanel>

      {/* Brand config */}
      <WorkspacePanel>
        <SectionHeader eyebrow="Brand Configuration" title="Select or configure brand" />
        <div className="flex items-center gap-2">
          <select className={inputCls + ' flex-1'} value={selectedBrandKey} onChange={(e) => applyBrandConfig(e.target.value)}>
            <option value="">Select a saved brand</option>
            {brandConfigs.map((c) => <option key={`${c.brand}__${c.market}`} value={`${c.brand}__${c.market}`}>{c.brand} / {c.market}{c.domain ? ` (${c.domain})` : ''}</option>)}
          </select>
          <DarkButton onClick={() => void loadBrandConfigs()} disabled={brandConfigsLoading}><RefreshCcw size={13} /></DarkButton>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <DarkButton onClick={() => void onSaveBrandConfig()} disabled={savingConfig || !brand.trim() || !market.trim()}><Save size={13} /> {savingConfig ? 'Saving\u2026' : 'Save config'}</DarkButton>
          {selectedBrandKey && <DarkButton onClick={() => void onDeleteBrandConfig()} disabled={deletingConfig}><Trash2 size={13} /> Delete</DarkButton>}
          {configNotice && <span className={`text-xs font-medium ${configNotice.tone === 'success' ? 'text-[var(--accent-success)]' : 'text-[var(--accent-danger)]'}`}>{configNotice.message}</span>}
        </div>
      </WorkspacePanel>

      {/* Refresh form */}
      <WorkspacePanel>
        <SectionHeader eyebrow="Refresh Evidence" title="Start a new evidence run" />
        <div className="grid gap-3 md:grid-cols-3">
          <label className={labelCls}>Brand<input className={inputCls + ' mt-1'} value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. Toyota" /></label>
          <label className={labelCls}>Market<input className={inputCls + ' mt-1'} value={market} onChange={(e) => setMarket(e.target.value)} placeholder="e.g. Germany" /></label>
          <label className={labelCls}>Domain<input className={inputCls + ' mt-1'} value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="e.g. https://www.toyota.de" /></label>
          <label className={labelCls + ' md:col-span-2'}>Owned domains<input className={inputCls + ' mt-1'} value={ownedDomains} onChange={(e) => setOwnedDomains(e.target.value)} placeholder="comma-separated" /><span className="mt-1 block text-xs text-[var(--text-muted)]">Auto-derived from domain if blank.</span></label>
          <label className={labelCls}>Brand terms<input className={inputCls + ' mt-1'} value={brandTerms} onChange={(e) => setBrandTerms(e.target.value)} placeholder="comma-separated" /></label>
          <label className={labelCls}>Run mode<select className={inputCls + ' mt-1'} value={runMode} onChange={(e) => setRunMode(e.target.value)}><option value="fresh_mapping">Portfolio + mapping</option><option value="reuse_existing_evidence">Reuse evidence</option><option value="refresh_owned_pages">Refresh owned</option><option value="refresh_external_pages">Refresh external</option><option value="fresh_ai_citations">Fresh AI citations</option><option value="full_refresh">Full refresh</option></select></label>
          <label className={labelCls}>Portfolio mode<select className={inputCls + ' mt-1'} value={queryPortfolioMode} onChange={(e) => setQueryPortfolioMode(e.target.value)}><option value="synthetic">Synthetic</option><option value="upload">Upload custom</option><option value="manual">Manual ID</option><option value="reuse">Reuse existing</option></select></label>
          <label className={labelCls}>Portfolio ID<input className={inputCls + ' mt-1'} value={queryPortfolioId} onChange={(e) => setQueryPortfolioId(e.target.value)} placeholder="Optional" /></label>
        </div>

        {queryPortfolioMode === 'upload' && (
          <div className="mt-3 rounded-[var(--radius-md)] border border-amber-500/30 bg-amber-500/8 p-4 space-y-3">
            <div className="flex items-center justify-between"><p className="text-sm font-semibold text-amber-300">Custom portfolio</p><DarkButton onClick={() => void onDownloadTemplate()}><Download size={13} /> Template</DarkButton></div>
            <div className="flex items-center gap-2"><DarkButton onClick={() => portfolioFileRef.current?.click()}><Upload size={13} /> Upload JSON</DarkButton><input ref={portfolioFileRef} className="hidden" type="file" accept="application/json,.json" onChange={(e) => void onPortfolioFileUpload(e.target.files?.[0])} /><span className="text-xs text-[var(--text-muted)]">or paste below</span></div>
            <textarea className={inputCls + ' min-h-24 font-mono text-xs'} value={portfolioJson} onChange={(e) => { setPortfolioJson(e.target.value); setPortfolioValidation(null); }} placeholder='{"topics": [...], "queries": [...]}' />
            <div className="flex items-center gap-2"><DarkButton variant="primary" onClick={() => void onValidatePortfolio()} disabled={!portfolioJson.trim()}>Validate</DarkButton>{portfolioValidation && <span className={`text-xs font-medium ${portfolioValidation.status === 'error' ? 'text-[var(--accent-danger)]' : 'text-[var(--accent-success)]'}`}>{portfolioValidation.status === 'error' ? (portfolioValidation.errors || [])[0] : portfolioValidation.validation?.valid ? `Valid - ${portfolioValidation.validation.stats?.query_count || 0} queries` : (portfolioValidation.errors || portfolioValidation.validation?.errors || []).slice(0, 2).join('; ')}</span>}</div>
          </div>
        )}

        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <label className={labelCls + ' md:col-span-2'}>Reuse run ID<input className={inputCls + ' mt-1'} value={sourceRunId} onChange={(e) => setSourceRunId(e.target.value)} placeholder="Optional" /></label>
          <label className={labelCls}>Topics<input type="number" min={1} max={20} className={inputCls + ' mt-1'} value={topicCount} onChange={(e) => setTopicCount(Number(e.target.value))} /></label>
          <label className={labelCls}>Queries/topic<input type="number" min={1} max={20} className={inputCls + ' mt-1'} value={queriesPerTopic} onChange={(e) => setQueriesPerTopic(Number(e.target.value))} /></label>
          <label className={labelCls}>Query limit<input type="number" min={1} max={100} className={inputCls + ' mt-1'} value={queryLimit} onChange={(e) => setQueryLimit(Number(e.target.value))} /></label>
          <label className={labelCls}>Max owned URLs per query<input type="number" min={1} max={10} className={inputCls + ' mt-1'} value={maxOwnedPagesPerQuery} onChange={(e) => setMaxOwnedPagesPerQuery(Number(e.target.value))} /><span className="mt-1 block text-xs text-[var(--text-muted)]">Per-query cap: how many owned pages to map for each query. Used for CMS and opportunity mapping.</span></label>
          <label className={labelCls}>Max external citation URLs per query<input type="number" min={1} max={10} className={inputCls + ' mt-1'} value={maxExternalCitationsPerQuery} onChange={(e) => setMaxExternalCitationsPerQuery(Number(e.target.value))} /><span className="mt-1 block text-xs text-[var(--text-muted)]">Per-query cap: crawl top N external citations for each query.</span></label>
          <label className={labelCls}>Max owned inventory URLs overall<input type="number" min={1} max={500} className={inputCls + ' mt-1'} value={maxOwnedInventoryUrls} onChange={(e) => setMaxOwnedInventoryUrls(Number(e.target.value))} /><span className="mt-1 block text-xs text-[var(--text-muted)]">Global cap: site-level inventory sample from sitemap. These pages are crawled and GEO scored even if not mapped to a query.</span></label>
          <label className={labelCls}>Max external URLs crawled overall<input type="number" min={1} max={500} className={inputCls + ' mt-1'} value={maxExternalUrls} onChange={(e) => setMaxExternalUrls(Number(e.target.value))} /><span className="mt-1 block text-xs text-[var(--text-muted)]">Global cap: deduped external citation pages across the whole run. 150 supports 50 queries × 3 citations.</span></label>
          <label className={labelCls}>Language<input className={inputCls + ' mt-1'} value={language} onChange={(e) => setLanguage(e.target.value)} /></label>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-4">
          <label className={checkCls}><input type="checkbox" checked={enableSerpapi} onChange={(e) => setEnableSerpapi(e.target.checked)} className="accent-[var(--accent-blue)]" /> SerpAPI</label>
          <label className={checkCls}><input type="checkbox" checked={enableOwnedCrawl} onChange={(e) => setEnableOwnedCrawl(e.target.checked)} className="accent-[var(--accent-blue)]" /> Owned crawl</label>
          <label className={checkCls}><input type="checkbox" checked={enableExternalCrawl} onChange={(e) => setEnableExternalCrawl(e.target.checked)} className="accent-[var(--accent-blue)]" /> External crawl</label>
          <label className={checkCls}><input type="checkbox" checked={triggerAuditor} onChange={(e) => setTriggerAuditor(e.target.checked)} className="accent-[var(--accent-blue)]" /> Auditor</label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <DarkButton variant="primary" onClick={() => void onSubmit()} disabled={isSubmitting}><PlayCircle size={15} /> {isSubmitting ? 'Starting\u2026' : 'Start refresh'}</DarkButton>
          {refreshResult && <span className="text-sm font-medium text-[var(--accent-success)]">{refreshResult}</span>}
          {error && <span className="text-sm font-medium text-[var(--accent-danger)]">{error}</span>}
        </div>
      </WorkspacePanel>
    </div>
  );
}
