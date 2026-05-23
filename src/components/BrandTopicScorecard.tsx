import type { BrandTopicScorecardRow } from '../types/report';
import { Card, SectionTitle } from './ui';

function scoreLabel(score: number | null): string {
  if (score === null || !Number.isFinite(score)) return 'Not collected';
  return `${Math.round(score)}`;
}

function scoreTone(score: number | null): string {
  if (score === null || !Number.isFinite(score)) return 'bg-white/5 text-[var(--text-muted)] ring-1 ring-white/10';
  if (score >= 70) return 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20';
  if (score >= 45) return 'bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20';
  return 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20';
}

function directionTone(value: string): string {
  const t = value.toLowerCase();
  if (t.includes('+') || t.includes('improv') || t.includes('up')) return 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20';
  if (t.includes('-') || t.includes('down') || t.includes('declin')) return 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20';
  return 'bg-white/5 text-[var(--text-muted)] ring-1 ring-white/10';
}

export function BrandTopicScorecard({ rows }: { rows: BrandTopicScorecardRow[] }) {
  if (!rows.length) return null;
  return (
    <Card>
      <SectionTitle eyebrow="Executive topic scorecard" title="AI visibility by brand topic">
        CMO-ready view of where the brand is visible, under-represented or awaiting fresh citation evidence.
      </SectionTitle>
      <div className="mt-4 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr>
                <th className="px-4 py-3 typo-meta text-[var(--text-muted)]">Brand topic</th>
                <th className="px-4 py-3 typo-meta text-[var(--text-muted)]">AI visibility score</th>
                <th className="px-4 py-3 typo-meta text-[var(--text-muted)]">Relative position vs. key competitor</th>
                <th className="px-4 py-3 typo-meta text-[var(--text-muted)]">Avg brand sentiment</th>
                <th className="px-4 py-3 typo-meta text-[var(--text-muted)]">Comment</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.topic} className="align-top">
                  <td className="max-w-xs px-4 py-4 text-sm font-semibold text-[var(--text-primary)]">
                    {row.topic}
                    <div className="mt-1 text-xs font-normal text-[var(--text-muted)]">
                      {row.queryCount ? `${row.queryCount} queries` : 'Query count pending'}
                      {row.ownedUrlCount ? ` · ${row.ownedUrlCount} owned URLs` : ''}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${scoreTone(row.aiVisibilityScore)}`}>{scoreLabel(row.aiVisibilityScore)}</span>
                  </td>
                  <td className="max-w-sm px-4 py-4 text-sm leading-6 text-[var(--text-secondary)]">{row.relativePosition}</td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${directionTone(row.directionVsLastPeriod)}`}>{row.directionVsLastPeriod !== 'Not available' ? row.directionVsLastPeriod : 'N/A'}</span>
                  </td>
                  <td className="max-w-md px-4 py-4 text-sm leading-6 text-[var(--text-secondary)]">{row.comment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}
