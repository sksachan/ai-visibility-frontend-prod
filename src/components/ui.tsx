import { clsx } from 'clsx';
import type { ReactNode } from 'react';

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={clsx('rounded-2xl border border-slate-200 bg-white p-5 shadow-sm', className)}>{children}</section>;
}

export function SectionTitle({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-4">
      {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{eyebrow}</p>}
      <h2 className="text-xl font-semibold tracking-tight text-slate-950">{title}</h2>
      {children && <p className="mt-1 max-w-3xl text-sm text-slate-600">{children}</p>}
    </div>
  );
}

export function MetricCard({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <Card className="p-4">
      <div className="text-3xl font-semibold text-slate-950">{value}</div>
      <div className="mt-1 text-sm font-medium text-slate-700">{label}</div>
      {note ? <div className="mt-2 text-xs leading-5 text-slate-500">{note}</div> : null}
    </Card>
  );
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'high' | 'medium' | 'low' }) {
  const classes = {
    neutral: 'bg-slate-100 text-slate-700',
    high: 'bg-red-50 text-red-700',
    medium: 'bg-amber-50 text-amber-700',
    low: 'bg-emerald-50 text-emerald-700'
  }[tone];
  return <span className={clsx('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold', classes)}>{children}</span>;
}
