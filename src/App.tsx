import { Component, useEffect, useMemo, useRef, useState } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Activity, BookOpen, BarChart3, Download, FileText, History, Layers, LayoutDashboard, Menu, RefreshCcw, Search, Settings, Upload, X, Zap } from 'lucide-react';
import { ExecutiveReport } from './components/ExecutiveReport';
import { CompetitorVisibilityMatrix } from './components/CompetitorVisibilityMatrix';
import { VisibilityMatrix } from './components/VisibilityMatrix';
import { Trend } from './components/Trend';
import { OwnedUrlReadiness } from './components/Diagnostics';
import { QueryWorkbench } from './components/QueryWorkbench';
import { ActionChecklist, CmsRecommendations, PrRecommendations } from './components/Recommendations';
import { RefreshPanel } from './components/RefreshPanel';
import { RunHistory } from './components/RunHistory';
import { MethodologyAppendix } from './components/MethodologyAppendix';
import { PdfReport } from './components/PdfReport';
import { fetchLatestReport, fetchRefreshStatus, type RunStatusSummary } from './lib/api';
import { exportReportToPdf } from './lib/pdf';
import { normaliseReport } from './lib/normaliseReport';
import type { ReportBundle } from './types/report';
import { mockReport } from './data/mockReport';
import bodhiLogo from './bodhi-mark.svg';

/* ── Error Boundary ─────────────────────────────────────────────── */
interface EBProps { children: ReactNode; fallback?: ReactNode; label?: string }
interface EBState { hasError: boolean; error: Error | null }
class ErrorBoundary extends Component<EBProps, EBState> {
  constructor(props: EBProps) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error(`[ErrorBoundary${this.props.label ? ` ${this.props.label}` : ''}]`, error, info); }
  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="rounded-[var(--radius-md)] border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          <p className="font-semibold">Section failed to render{this.props.label ? `: ${this.props.label}` : ''}</p>
          <p className="mt-1 text-xs text-red-400/70">{this.state.error?.message || 'Unknown error'}</p>
          <button onClick={() => this.setState({ hasError: false, error: null })} className="mt-2 rounded border border-red-500/30 px-3 py-1 text-xs font-semibold text-red-400 hover:bg-red-500/20">Retry</button>
        </div>
      );
    }
    return this.props.children;
  }
}

type Tab = 'executive' | 'competitors' | 'workbench' | 'matrix' | 'owned' | 'cms' | 'pr' | 'actions' | 'runs' | 'appendix' | 'refresh';
type Notice = { tone: 'success' | 'warning' | 'error'; message: string } | null;

type NavItem = { id: Tab; label: string; icon: typeof LayoutDashboard };
type NavGroup = { label: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  { label: '', items: [
    { id: 'executive', label: 'Executive Report', icon: LayoutDashboard },
  ]},
  { label: 'AEO Insights', items: [
    { id: 'competitors', label: 'Competitor Visibility', icon: BarChart3 },
    { id: 'workbench', label: 'Query Workbench', icon: Search },
    { id: 'matrix', label: 'Source Landscape', icon: Layers },
  ]},
  { label: 'GEO Insights', items: [
    { id: 'owned', label: 'Owned URLs Readiness', icon: BarChart3 },
  ]},
  { label: 'Recommendations', items: [
    { id: 'cms', label: 'Content Alignment', icon: FileText },
    { id: 'pr', label: 'PR & Brand Suggestions', icon: Zap },
    { id: 'actions', label: 'Action Checklist', icon: Activity },
  ]},
  { label: 'Onboarding', items: [
    { id: 'refresh', label: 'Start New Analysis', icon: RefreshCcw },
  ]},
];

const allTabs = navGroups.flatMap((g) => g.items);

function parseMessage(report: ReportBundle, source: string) {
  const queryCount = report.queryWorkbench?.length || report.queries.length;
  return `${source}. Parsed ${queryCount} queries, ${report.ownedPages.length} owned pages, ${report.cmsModules.length} CMS modules, ${report.prOpportunities.length} PR opportunities and ${report.actionChecklist.length} actions.`;
}

function niceStage(value?: string) {
  if (!value) return null;
  return value.replaceAll('_', ' ');
}

export default function App() {
  const [report, setReport] = useState<ReportBundle>(mockReport);
  const [activeTab, setActiveTab] = useState<Tab>('executive');
  const [highlightCmsUrl, setHighlightCmsUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [footerMessage, setFooterMessage] = useState('Dashboard will auto-load the latest successful Bodhi report when configured.');
  const [refreshStatus, setRefreshStatus] = useState<RunStatusSummary | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const brand = import.meta.env.VITE_DEFAULT_BRAND || report.brand;
  const market = import.meta.env.VITE_DEFAULT_MARKET || report.market;

  useEffect(() => {
    void loadLatest(true);
    void pollRefreshStatus();
    // Poll every 10s to keep status responsive; backend call is lightweight
    const timer = window.setInterval(() => void pollRefreshStatus(), 10000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function pollRefreshStatus() {
    try {
      const next = await fetchRefreshStatus(brand, market);
      setRefreshStatus(next);
    } catch { /* advisory — status is non-blocking */ }
  }

  async function loadLatest(isInitialLoad = false) {
    setLoading(true);
    setNotice(null);
    try {
      const latest = await fetchLatestReport(brand, market);
      setReport(latest);
      setFooterMessage(parseMessage(latest, 'Loaded latest Bodhi report'));
      if (!isInitialLoad) setNotice({ tone: 'success', message: `Loaded latest report for ${latest.brand} / ${latest.market}.` });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setFooterMessage(`Latest Bodhi report was not loaded. ${message} Manual JSON upload is available as fallback.`);
      if (!isInitialLoad) setNotice({ tone: 'error', message: `Could not load latest report. ${message}` });
    } finally {
      setLoading(false);
    }
  }

  async function onUpload(file: File | undefined) {
    if (!file) return;
    setNotice(null);
    try {
      const text = await file.text();
      if (!text.trim()) throw new Error('The selected file is empty.');
      const json = JSON.parse(text);
      const nextReport = normaliseReport(json);
      setReport(nextReport);
      setActiveTab('executive');
      setFooterMessage(parseMessage(nextReport, `Uploaded ${file.name}`));
      setNotice({ tone: 'success', message: 'Report JSON uploaded and parsed.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown parsing error';
      setNotice({ tone: 'error', message: `Upload failed: ${message}` });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function openCmsForUrl(url: string) {
    setHighlightCmsUrl(url);
    setActiveTab('cms');
    window.setTimeout(() => {
      document.getElementById(`cms-${encodeURIComponent(url)}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }

  const fileName = useMemo(() => `${report.brand}_${report.market}_${report.runId}_ai_visibility_report.pdf`.replaceAll(' ', '_'), [report]);
  const reportSections = (
    <>
      <ExecutiveReport report={report} />
      <QueryWorkbench report={report} />
      <VisibilityMatrix report={report} />
      <Trend report={report} />
      <OwnedUrlReadiness report={report} onOpenCms={openCmsForUrl} />
      <CmsRecommendations report={report} highlightUrl={highlightCmsUrl} />
      <PrRecommendations report={report} />
      <ActionChecklist report={report} />
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-app)]">
      {/* ── Left rail (fixed) ── */}
      <aside className="hidden lg:flex h-full w-56 shrink-0 flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] no-print overflow-y-auto hide-scrollbar">
        {/* Brand mark */}
        <div className="flex items-center px-4 py-3 border-b border-[var(--border-strong)]" style={{ minHeight: '49px' }}>
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)] leading-tight">AI Brand Visibility</p>
            <p className="text-sm font-semibold text-[var(--text-primary)] leading-tight">Intelligence</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 px-2 py-3">
          {navGroups.map((group, gi) => (
            <div key={gi}>
              {group.label && <p className="mt-4 mb-1 px-2 typo-meta text-[var(--text-muted)]">{group.label}</p>}
              {group.items.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-left text-[13px] font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-[var(--accent-blue-soft)] text-[var(--accent-blue)] border border-[rgba(84,162,255,0.18)]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)] border border-transparent'
                    }`}
                  >
                    <Icon size={15} /> {tab.label}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar actions */}
        <div className="border-t border-[var(--border-subtle)] px-2 py-3 space-y-0.5">
          <button onClick={() => void loadLatest(false)} className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-[13px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]">
            <RefreshCcw size={14} /> {loading ? 'Loading…' : 'Load latest'}
          </button>
          <button onClick={() => setActiveTab('runs')} className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-[13px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]">
            <History size={14} /> Previous runs
          </button>
          <button onClick={() => fileRef.current?.click()} className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-[13px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]">
            <Upload size={14} /> Upload JSON
          </button>
          <input ref={fileRef} className="hidden" type="file" accept="application/json,.json" onChange={(e) => void onUpload(e.target.files?.[0])} />
          <button onClick={() => void exportReportToPdf(report, fileName)} className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-[13px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]">
            <Download size={14} /> Download PDF
          </button>
          <button onClick={() => setActiveTab('appendix')} className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-[13px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]">
            <BookOpen size={14} /> Documentation
          </button>
        </div>
      </aside>

      {/* ── Center + Right rail wrapper ── */}
      <div className="flex flex-1 min-w-0 overflow-hidden">
        {/* ── Center: scrollable main content ── */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          {/* Top bar */}
          <header className="sticky top-0 z-20 border-b border-[var(--border-strong)] bg-[var(--bg-surface)]/95 backdrop-blur no-print">
            <div className="flex items-center justify-between gap-4 px-5 py-3" style={{ minHeight: '49px' }}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="hidden lg:flex items-center gap-2 text-[13px] text-[var(--text-muted)]">
                  <span className="font-semibold text-[var(--accent-blue)]">Powered by</span>
                  <img src={bodhiLogo} alt="Bodhi logo" className="h-4" />
                  <span>/</span>
                  <span className="text-[var(--text-secondary)]">{report.brand} · {report.market}</span>
                </div>
                {/* Mobile brand */}
                <div className="lg:hidden">
                  <p className="typo-meta text-[var(--accent-blue)]">Sapient AI Bodhi</p>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">AI Brand Visibility Intelligence</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => void loadLatest(false)} className="hidden lg:inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]">
                  <RefreshCcw size={13} /> {loading ? 'Loading…' : 'Refresh'}
                </button>
                <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-sm font-semibold text-[var(--text-secondary)]">
                  {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />} Menu
                </button>
              </div>
            </div>
            {/* Mobile menu */}
            {mobileMenuOpen && (
              <div className="px-4 pb-3 lg:hidden">
                <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-3 space-y-1">
                  {allTabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button key={tab.id} onClick={() => { setActiveTab(tab.id); setMobileMenuOpen(false); }} className={`flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium ${activeTab === tab.id ? 'bg-[var(--accent-blue-soft)] text-[var(--accent-blue)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)]'}`}>
                        <Icon size={15} /> {tab.label}
                      </button>
                    );
                  })}
                  <div className="border-t border-[var(--border-subtle)] pt-2 mt-2 space-y-1">
                    <button onClick={() => { void loadLatest(false); setMobileMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-card)]">
                      <RefreshCcw size={14} /> Load latest
                    </button>
                    <button onClick={() => { fileRef.current?.click(); setMobileMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-card)]">
                      <Upload size={14} /> Upload JSON
                    </button>
                    <button onClick={() => { void exportReportToPdf(report, fileName); setMobileMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-card)]">
                      <Download size={14} /> Download PDF
                    </button>
                  </div>
                </div>
              </div>
            )}
          </header>

          {/* Notice banner */}
          {notice && (
            <div className="px-5 pt-4 no-print">
              <div className={`rounded-[var(--radius-sm)] border px-4 py-3 text-sm font-medium ${
                notice.tone === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : notice.tone === 'warning' ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                : 'border-red-500/30 bg-red-500/10 text-red-400'
              }`}>
                {notice.message}
              </div>
            </div>
          )}

          {/* Main report area with audit-canvas background */}
          <main id="report-root" className="audit-canvas space-y-5 px-5 py-5">
            {activeTab === 'executive' && <ErrorBoundary label="Executive Report"><ExecutiveReport report={report} /></ErrorBoundary>}
            {activeTab === 'competitors' && <ErrorBoundary label="Competitor Visibility"><CompetitorVisibilityMatrix report={report} /></ErrorBoundary>}
            {activeTab === 'workbench' && <ErrorBoundary label="Query Workbench"><QueryWorkbench report={report} /></ErrorBoundary>}
            {activeTab === 'matrix' && <ErrorBoundary label="Source Landscape"><VisibilityMatrix report={report} /><Trend report={report} /></ErrorBoundary>}
            {activeTab === 'owned' && <ErrorBoundary label="Owned URL Readiness"><OwnedUrlReadiness report={report} onOpenCms={openCmsForUrl} /></ErrorBoundary>}
            {activeTab === 'cms' && <ErrorBoundary label="Content Alignment"><CmsRecommendations report={report} highlightUrl={highlightCmsUrl} /></ErrorBoundary>}
            {activeTab === 'pr' && <ErrorBoundary label="PR & Brand Suggestions"><PrRecommendations report={report} /></ErrorBoundary>}
            {activeTab === 'actions' && <ErrorBoundary label="Action Checklist"><ActionChecklist report={report} /></ErrorBoundary>}
            {activeTab === 'runs' && <ErrorBoundary label="Run History"><RunHistory brand={brand} market={market} onLoad={(next, row) => { setReport(next); setActiveTab('executive'); setFooterMessage(parseMessage(next, `Loaded previous run ${row.run_id}`)); setNotice(null); }} /></ErrorBoundary>}
            {activeTab === 'appendix' && <ErrorBoundary label="Documentation"><MethodologyAppendix /></ErrorBoundary>}
            {activeTab === 'refresh' && <ErrorBoundary label="Refresh Panel"><RefreshPanel brand={report.brand} market={report.market} /></ErrorBoundary>}
          </main>

          {/* Footer */}
          <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] px-5 py-3 text-xs text-[var(--text-muted)] no-print">
            {footerMessage}
          </footer>
        </div>

        {/* ── Right rail (fixed) ── */}
        <aside className="hidden xl:flex h-full w-64 shrink-0 flex-col border-l border-[var(--border-subtle)] bg-[var(--bg-surface)] no-print overflow-y-auto hide-scrollbar">
          <div className="p-4 space-y-4">
            {/* Run status — canonical: active=running, !active+no error=idle, error=failed */}
            <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-3">
              <p className="typo-meta text-[var(--text-muted)] mb-2">Run Status</p>
              {(() => {
                // Derive display state from the normalised RunStatusSummary.
                // Error fields always take precedence over running status.
                const hasError = Boolean(refreshStatus?.errorMessage) || refreshStatus?.status === 'failed';
                const isRunning = Boolean(refreshStatus?.active) && !hasError;
                const displayState = hasError ? 'failed' : isRunning ? 'running' : 'idle';
                return (
                  <>
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${displayState === 'failed' ? 'bg-[var(--accent-danger)]' : displayState === 'running' ? 'bg-[var(--accent-blue)] animate-pulse' : 'bg-[var(--text-muted)]'}`} />
                      <span className={`text-sm font-semibold ${displayState === 'failed' ? 'text-[var(--accent-danger)]' : displayState === 'running' ? 'text-[var(--accent-blue)]' : 'text-[var(--text-secondary)]'}`}>
                        {displayState === 'failed' ? 'Failed' : displayState === 'running' ? 'Running' : 'Idle'}
                      </span>
                    </div>
                    {/* Running: show current stage and run ID */}
                    {displayState === 'running' && refreshStatus?.stage && (
                      <p className="mt-2 text-[11px] text-[var(--accent-blue)]">{niceStage(refreshStatus.stage)}</p>
                    )}
                    {displayState === 'running' && refreshStatus?.runId && (
                      <p className="mt-1 text-[10px] font-mono text-[var(--text-muted)] break-all">Run: {refreshStatus.runId}</p>
                    )}
                    {/* Idle: show last success if available */}
                    {displayState === 'idle' && refreshStatus?.latestSuccessfulRunId && (
                      <div className="mt-2 text-[10px] text-[var(--text-muted)] break-all">
                        <p>Last success:</p>
                        <p className="font-mono mt-0.5">{refreshStatus.latestSuccessfulRunId}</p>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Latest successful run */}
            <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-3">
              <p className="typo-meta text-[var(--text-muted)] mb-2">Latest Successful Run</p>
              <p className="text-xs font-mono text-[var(--text-secondary)] break-all">{report.runId || 'None loaded'}</p>
              <p className="mt-1 text-[11px] text-[var(--text-muted)]">{report.generatedAt || report.evidenceDate || ''}</p>
            </div>

            {/* Evidence freshness */}
            <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-3">
              <p className="typo-meta text-[var(--text-muted)] mb-2">Evidence Freshness</p>
              <div className="space-y-1.5 text-xs text-[var(--text-secondary)]">
                <div className="flex justify-between"><span>Brand</span><span className="font-medium text-[var(--text-primary)]">{report.brand}</span></div>
                <div className="flex justify-between"><span>Market</span><span className="font-medium text-[var(--text-primary)]">{report.market}</span></div>
                <div className="flex justify-between"><span>Queries</span><span className="font-medium text-[var(--text-primary)]">{report.queryWorkbench?.length || report.queries?.length || 0}</span></div>
                <div className="flex justify-between"><span>Owned pages</span><span className="font-medium text-[var(--text-primary)]">{report.ownedPages.length}</span></div>
              </div>
            </div>

            {/* Quick metrics */}
            <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-3">
              <p className="typo-meta text-[var(--text-muted)] mb-2">Key Metrics</p>
              <div className="space-y-1.5 text-xs text-[var(--text-secondary)]">
                <div className="flex justify-between"><span>AI Visibility</span><span className="font-semibold text-[var(--text-primary)]">{report.executive.headlineMetrics.brandScore.toFixed(1)}/100</span></div>
                <div className="flex justify-between"><span>Avg GEO</span><span className="font-semibold text-[var(--text-primary)]">{(report.executive.headlineMetrics.averageOwnedGeoScore120 ?? 0).toFixed(1)}/120</span></div>
                <div className="flex justify-between"><span>CMS modules</span><span className="font-medium text-[var(--text-primary)]">{report.cmsModules.length}</span></div>
                <div className="flex justify-between"><span>PR opportunities</span><span className="font-medium text-[var(--text-primary)]">{report.prOpportunities.length}</span></div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* PDF off-screen render target — wrapped in error boundary so PDF issues cannot blank the dashboard */}
      <ErrorBoundary label="PDF Report" fallback={<div id="pdf-report-root" />}>
        <div id="pdf-report-root" className="fixed -left-[10000px] top-0 w-[794px]" aria-hidden="true">
          <PdfReport report={report} />
        </div>
      </ErrorBoundary>
    </div>
  );
}
