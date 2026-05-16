import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, RefreshCcw, Upload } from 'lucide-react';
import { ExecutiveReport } from './components/ExecutiveReport';
import { VisibilityMatrix } from './components/VisibilityMatrix';
import { Trend } from './components/Trend';
import { QueryDiagnostics, OwnedUrlReadiness } from './components/Diagnostics';
import { Recommendations, ActionChecklist } from './components/Recommendations';
import { RefreshPanel } from './components/RefreshPanel';
import { fetchLatestReport } from './lib/api';
import { exportElementToPdf } from './lib/pdf';
import { normaliseReport } from './lib/normaliseReport';
import type { ReportBundle } from './types/report';
import { mockReport } from './data/mockReport';

type Tab = 'executive' | 'matrix' | 'queries' | 'owned' | 'recommendations' | 'actions' | 'refresh';

const tabs: Array<{ id: Tab; label: string }> = [
  { id: 'executive', label: 'Executive report' },
  { id: 'matrix', label: 'Visibility & trend' },
  { id: 'queries', label: 'Query diagnostics' },
  { id: 'owned', label: 'Owned URLs' },
  { id: 'recommendations', label: 'CMS / PR' },
  { id: 'actions', label: 'Action checklist' },
  { id: 'refresh', label: 'Refresh control' }
];

export default function App() {
  const [report, setReport] = useState<ReportBundle>(mockReport);
  const [activeTab, setActiveTab] = useState<Tab>('executive');
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const brand = import.meta.env.VITE_DEFAULT_BRAND || report.brand;
  const market = import.meta.env.VITE_DEFAULT_MARKET || report.market;

  useEffect(() => {
    void loadLatest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadLatest() {
    setLoading(true);
    try {
      const latest = await fetchLatestReport(brand, market);
      setReport(latest);
    } finally {
      setLoading(false);
    }
  }

  async function onUpload(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    const json = JSON.parse(text);
    setReport(normaliseReport(json));
  }

  const fileName = useMemo(() => `${report.brand}_${report.market}_${report.runId}_ai_visibility_report.pdf`.replaceAll(' ', '_'), [report]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur no-print">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">AI Search Visibility</p>
            <h1 className="text-xl font-semibold text-slate-950">GEO Intelligence Dashboard</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={loadLatest} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
              <RefreshCcw size={16} /> {loading ? 'Loading...' : 'Load latest'}
            </button>
            <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
              <Upload size={16} /> Upload report JSON
            </button>
            <input ref={fileRef} className="hidden" type="file" accept="application/json,.json" onChange={(e) => void onUpload(e.target.files?.[0])} />
            <button onClick={() => void exportElementToPdf('report-root', fileName)} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-sm font-semibold text-white">
              <Download size={16} /> Download PDF
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 pb-3">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${activeTab === tab.id ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-700'}`}>
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <main id="report-root" className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        {activeTab === 'executive' && <ExecutiveReport report={report} />}
        {activeTab === 'matrix' && <><VisibilityMatrix report={report} /><Trend report={report} /></>}
        {activeTab === 'queries' && <QueryDiagnostics report={report} />}
        {activeTab === 'owned' && <OwnedUrlReadiness report={report} />}
        {activeTab === 'recommendations' && <Recommendations report={report} />}
        {activeTab === 'actions' && <ActionChecklist report={report} />}
        {activeTab === 'refresh' && <RefreshPanel brand={report.brand} market={report.market} />}
      </main>
    </div>
  );
}
