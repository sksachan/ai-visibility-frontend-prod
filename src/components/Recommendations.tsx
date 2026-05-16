import type { RecommendationModule, ReportBundle } from '../types/report';
import { Badge, Card, SectionTitle } from './ui';

const tone = (priority: string) => priority === 'High' ? 'high' : priority === 'Medium' ? 'medium' : 'low';

export function Recommendations({ report }: { report: ReportBundle }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <RecommendationPanel title="CMS recommendations" eyebrow="Content remediation" items={report.cmsModules} />
      <RecommendationPanel title="PR opportunities" eyebrow="External evidence" items={report.prOpportunities} />
    </div>
  );
}

function RecommendationPanel({ title, eyebrow, items }: { title: string; eyebrow: string; items: RecommendationModule[] }) {
  return (
    <Card>
      <SectionTitle eyebrow={eyebrow} title={title} />
      <div className="space-y-4">
        {items.map((item) => (
          <div key={`${item.title}-${item.targetUrl}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-semibold text-slate-950">{item.title}</h3>
              <Badge tone={tone(item.priority)}>{item.priority}</Badge>
            </div>
            <p className="mt-2 text-sm text-slate-500">Owner: {item.owner} · Target: {item.targetUrl}</p>
            <p className="mt-3 text-sm leading-6 text-slate-700">{item.recommendation}</p>
            <p className="mt-3 rounded-xl bg-white p-3 text-sm leading-6 text-slate-600"><span className="font-semibold text-slate-900">Winning pattern:</span> {item.evidencePattern}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function ActionChecklist({ report }: { report: ReportBundle }) {
  return (
    <Card>
      <SectionTitle eyebrow="Action checklist" title="Translate visibility gaps into owned actions, owners and delivery effort" />
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-3 py-3">Action</th>
              <th className="px-3 py-3">Owner</th>
              <th className="px-3 py-3">Priority</th>
              <th className="px-3 py-3">Effort</th>
              <th className="px-3 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {report.actionChecklist.map((item) => (
              <tr key={item.action}>
                <td className="px-3 py-4 font-medium text-slate-950">{item.action}</td>
                <td className="px-3 py-4 text-slate-600">{item.owner}</td>
                <td className="px-3 py-4"><Badge tone={tone(item.priority)}>{item.priority}</Badge></td>
                <td className="px-3 py-4 text-slate-600">{item.effort}</td>
                <td className="px-3 py-4 text-slate-600">{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
