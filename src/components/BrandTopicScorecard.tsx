import type { BrandTopicScorecardRow } from '../types/report';
import { Card, SectionTitle } from './ui';

function scoreLabel(score: number | null): string {
  if (score === null || !Number.isFinite(score)) return 'Not collected';
  return `${Math.round(score)}`;
}

function scoreTone(score: number | null): string {
  if (score === null || !Number.isFinite(score)) return 'bg-slate-100 text-slate-600';
  if (score >= 70) return 'bg-emerald-50 text-emerald-700';
  if (score >= 45) return 'bg-amber-50 text-amber-700';
  return 'bg-rose-50 text-rose-700';
}

function directionTone(value: string): string {
  const text = value.toLowerCase();
  if (text.includes('+') || text.includes('improv') || text.includes('up')) return 'bg-emerald-50 text-emerald-700';
  if (text.includes('-') || text.includes('down') || text.includes('declin')) return 'bg-rose-50 text-rose-700';
  return 'bg-slate-100 text-slate-600';
}

export function BrandTopicScorecard({ rows }: { rows: BrandTopicScorecardRow[] }) {
  if (!rows.length) return null;
  return (
    <Card>
      <SectionTitle eyebrow="Executive topic scorecard" title="AI visibility by brand topic">
        CMO-ready view of where the brand is visible, under-represented or awaiting fresh citation evidence.
      </SectionTitle>
      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">Brand topic</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">AI visibility score</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">Relative position vs. key competitor</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">Direction vs. last period</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">Comment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.map((row) => (
                <tr key={row.topic} className="align-top">
                  <td className="max-w-xs px-4 py-4 text-sm font-semibold text-slate-950">
                    {row.topic}
                    <div className="mt-1 text-xs font-normal text-slate-500">
                      {row.queryCount ? `${row.queryCount} queries` : 'Query count pending'}
                      {row.ownedUrlCount ? ` · ${row.ownedUrlCount} owned URLs` : ''}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${scoreTone(row.aiVisibilityScore)}`}>{scoreLabel(row.aiVisibilityScore)}</span>
                  </td>
                  <td className="max-w-sm px-4 py-4 text-sm leading-6 text-slate-700">{row.relativePosition}</td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${directionTone(row.directionVsLastPeriod)}`}>{row.directionVsLastPeriod}</span>
                  </td>
                  <td className="max-w-md px-4 py-4 text-sm leading-6 text-slate-700">{row.comment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}
