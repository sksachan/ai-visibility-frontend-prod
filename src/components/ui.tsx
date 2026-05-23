import { clsx } from 'clsx';
import type { ReactNode } from 'react';

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={clsx('rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-5 shadow-[var(--shadow-panel)]', className)}>{children}</section>;
}

export function SectionTitle({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-4">
      {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">{eyebrow}</p>}
      <h2 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">{title}</h2>
      {children && <p className="mt-1 max-w-3xl text-sm text-[var(--text-secondary)]">{children}</p>}
    </div>
  );
}

export function MetricCard({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <Card className="p-4">
      <div className="text-3xl font-semibold text-[var(--text-primary)]">{value}</div>
      <div className="mt-1 text-sm font-medium text-[var(--text-secondary)]">{label}</div>
      {note ? <div className="mt-2 text-xs leading-5 text-[var(--text-muted)]">{note}</div> : null}
    </Card>
  );
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'high' | 'medium' | 'low' }) {
  const classes = {
    neutral: 'bg-white/5 text-[var(--text-secondary)] ring-1 ring-white/10',
    high: 'bg-red-500/10 text-red-300 ring-1 ring-red-500/20',
    medium: 'bg-amber-500/10 text-amber-200 ring-1 ring-amber-500/20',
    low: 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20'
  }[tone];
  return <span className={clsx('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold', classes)}>{children}</span>;
}
