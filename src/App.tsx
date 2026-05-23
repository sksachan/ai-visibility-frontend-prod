import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Download, History, Menu, RefreshCcw, Upload, X } from 'lucide-react';
import { ExecutiveReport } from './components/ExecutiveReport';
import { VisibilityMatrix } from './components/VisibilityMatrix';
import { Trend } from './components/Trend';
import { OwnedUrlReadiness } from './components/Diagnostics';
import { QueryWorkbench } from './components/QueryWorkbench';
import { ActionChecklist, CmsRecommendations, PrRecommendations } from './components/Recommendations';
import { RefreshPanel } from './components/RefreshPanel';
import { RunHistory } from './components/RunHistory';
import { MethodologyAppendix } from './components/MethodologyAppendix';
import { fetchLatestReport, fetchRefreshStatus, type RunStatusSummary } from './lib/api';
import { exportReportToPdf } from './lib/pdf';
import { normaliseReport } from './lib/normaliseReport';
import type { ReportBundle } from './types/report';
import { mockReport } from './data/mockReport';

type Tab = 'executive' | 'workbench' | 'matrix' | 'owned' | 'cms' | 'pr' | 'actions' | 'runs' | 'appendix' | 'refresh';
type Notice = { tone: 'success' | 'warning' | 'error'; message: string } | null;

type NavGroup = { label: string; items: Array<{ id: Tab; label: string }> };

const navGroups: NavGroup[] = [
  { label: '', items: [{ id: 'executive', label: 'Executive Report' }] },
  { label: 'AEO Insights', items: [
    { id: 'workbench', label: 'Query Workbench' },
    { id: 'matrix', label: 'Visibility & Sources' },
  ]},
  { label: '', items: [
    { id: 'owned', label: 'GEO Insights' },
    { id: 'cms', label: 'Content Insights' },
    { id: 'pr', label: 'PR & Brand Insights' },
    { id: 'actions', label: 'Action Checklist' },
  ]},
  { label: '', items: [{ id: 'refresh', label: 'Refresh Evidence' }] },
];

const allTabs = navGroups.flatMap((g) => g.items);

function parseMessage(report: ReportBundle, source: string) {
  return `${source}. Parsed ${report.queries.length} queries, ${report.ownedPages.length} owned pages, ${report.cmsModules.length} CMS modules, ${report.prOpportunities.length} PR opportunities and ${report.actionChecklist.length} actions.`;
}

export default function App() {
  const [report, setReport] = useState<ReportBundle>(mockReport);
  const [activeTab, setActiveTab] = useState<Tab>('executive');
  const [highlightCmsUrl, setHighlightCmsUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [footerMessage, setFooterMessage] = useState('Dashboard will auto-load the latest successful Bodhi report when configured. Upload JSON remains available as a fallback.');
  const [refreshStatus, setRefreshStatus] = useState<RunStatusSummary | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const brand = import.meta.env.VITE_DEFAULT_BRAND || report.brand;
  const market = import.meta.env.VITE_DEFAULT_MARKET || report.market;

  useEffect(() => {
    void loadLatest(true);
    void pollRefreshStatus();
    const timer = window.setInterval(() => void pollRefreshStatus(), 30000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function pollRefreshStatus() {
    try {
      setRefreshStatus(await fetchRefreshStatus(brand, market));
    } catch {
      // Status is advisory only; never block report loading or manual upload.
    }
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
      setNotice({ tone: 'success', message: 'Report JSON uploaded and parsed. See parse summary in the footer.' });
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
  const actionButtons = (
    <>
      <button onClick={() => { setActionMenuOpen(false); void loadLatest(false); }} className="inline-flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
        <RefreshCcw size={16} /> {loading ? 'Loading...' : 'Load latest'}
      </button>
      <button onClick={() => { setActionMenuOpen(false); setActiveTab('runs'); }} className="inline-flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
        <History size={16} /> Previous runs
      </button>
      <button onClick={() => { setActionMenuOpen(false); setActiveTab('appendix'); }} className="inline-flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
        <BookOpen size={16} /> Documentation
      </button>
      <button onClick={() => { setActionMenuOpen(false); fileRef.current?.click(); }} className="inline-flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
        <Upload size={16} /> Upload report JSON
      </button>
      <input ref={fileRef} className="hidden" type="file" accept="application/json,.json" onChange={(e) => void onUpload(e.target.files?.[0])} />
      <button onClick={() => { setActionMenuOpen(false); void exportReportToPdf(report, fileName); }} className="inline-flex w-full items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-sm font-semibold text-white">
        <Download size={16} /> Download PDF
      </button>
    </>
  );

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 pb-16 flex">
      {/* Vertical left sidebar navigation (issue #19) */}
      <aside className="sticky top-0 z-30 hidden h-screen w-56 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex no-print overflow-y-auto">
        <div className="px-4 py-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">AI Brand Visibility</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">Intelligence</p>
        </div>
        <nav className="flex-1 space-y-1 px-2 pb-4">
          {navGroups.map((group, gi) => (
            <div key={gi}>
              {group.label && <p className="mt-4 mb-1 px-2 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">{group.label}</p>}
              {group.items.map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
                  {tab.label}
                </button>
              ))}
            </div>
          ))}
          <div className="mt-4 border-t border-slate-100 pt-3 space-y-1">
            <button onClick={() => { void loadLatest(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-100">
              <RefreshCcw size={14} /> {loading ? 'Loading...' : 'Load latest'}
            </button>
            <button onClick={() => setActiveTab('runs' as Tab)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-100">
              <History size={14} /> Previous runs
            </button>
            <button onClick={() => setActiveTab('appendix' as Tab)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-100">
              <BookOpen size={14} /> Documentation
            </button>
            <button onClick={() => fileRef.current?.click()} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-100">
              <Upload size={14} /> Upload JSON
            </button>
            <input ref={fileRef} className="hidden" type="file" accept="application/json,.json" onChange={(e) => void onUpload(e.target.files?.[0])} />
            <button onClick={() => void exportReportToPdf(report, fileName)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-100">
              <Download size={14} /> Download PDF
            </button>
          </div>
        </nav>
      </aside>

      {/* Main content area */}
      <div className="flex-1 min-w-0">
        {/* Mobile/tablet top header */}
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur no-print lg:border-b-0">
          <div className="flex items-start justify-between gap-4 px-4 py-4">
            <div className="min-w-[200px] flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">AI Brand Visibility Intelligence</p>
              <h1 className="text-xl font-semibold text-slate-950 lg:hidden">AI Brand Visibility Intelligence</h1>
              {refreshStatus?.active && (
                <p className="mt-1 text-xs font-semibold text-amber-700">Refresh evidence is running. Showing latest successful report until completion.</p>
              )}
            </div>
            <button onClick={() => setActionMenuOpen((open) => !open)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 lg:hidden" aria-expanded={actionMenuOpen} aria-controls="dashboard-action-menu">
              {actionMenuOpen ? <X size={16} /> : <Menu size={16} />} Menu
            </button>
          </div>
          {actionMenuOpen && (
            <div id="dashboard-action-menu" className="px-4 pb-3 lg:hidden">
              <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg sm:max-w-sm sm:ml-auto">
                {actionButtons}
              </div>
            </div>
          )}
          {/* Mobile horizontal tab bar */}
          <nav className="hide-scrollbar flex gap-2 overflow-x-auto px-4 pb-3 lg:hidden">
            {allTabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${activeTab === tab.id ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-700'}`}>
                {tab.label}
              </button>
            ))}
          </nav>
        </header>

        {notice && (
          <div className="px-4 pt-4 no-print">
            <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${notice.tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : notice.tone === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
              {notice.message}
            </div>
          </div>
        )}

        <main id="report-root" className="space-y-6 px-4 py-6">
        {activeTab === 'executive' && <ExecutiveReport report={report} />}
        {activeTab === 'workbench' && <QueryWorkbench report={report} />}
        {activeTab === 'matrix' && <><VisibilityMatrix report={report} /><Trend report={report} /></>}
        {activeTab === 'owned' && <OwnedUrlReadiness report={report} onOpenCms={openCmsForUrl} />}
        {activeTab === 'cms' && <CmsRecommendations report={report} highlightUrl={highlightCmsUrl} />}
        {activeTab === 'pr' && <PrRecommendations report={report} />}
        {activeTab === 'actions' && <ActionChecklist report={report} />}
        {activeTab === 'runs' && <RunHistory brand={brand} market={market} onLoad={(next, row) => { setReport(next); setActiveTab('executive'); setFooterMessage(parseMessage(next, `Loaded previous run ${row.run_id}`)); setNotice(null); }} />}
        {activeTab === 'appendix' && <MethodologyAppendix />}
        {activeTab === 'refresh' && <RefreshPanel brand={report.brand} market={report.market} />}
      </main>

        <footer className="border-t border-slate-200 bg-white/95 px-4 py-3 text-xs font-medium text-slate-600 shadow-sm no-print mt-6">
          {footerMessage}
        </footer>
      </div>

      <div id="pdf-report-root" className="fixed -left-[10000px] top-0 w-[1200px] space-y-6 bg-slate-50 px-6 py-6" aria-hidden="true">
        {reportSections}
      </div>
    </div>
  );
}
