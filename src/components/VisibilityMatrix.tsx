import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import type { ReportBundle } from '../types/report';
import { Card, SectionTitle } from './ui';

export function VisibilityMatrix({ report }: { report: ReportBundle }) {
  const data = report.visibility.brandVsCompetitors;
  return (
    <Card>
      <SectionTitle eyebrow="Brand visibility matrix" title="Competitors lead where citation share and answer visibility converge">
        Use this view to isolate which brands are shaping the answer layer, not just appearing in the market.
      </SectionTitle>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-80 rounded-2xl bg-slate-50 p-3">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="visibility" name="Visibility" unit="" domain={[40, 100]} />
              <YAxis dataKey="citationShare" name="Citation share" unit="%" domain={[0, 50]} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter name="Brands" data={data} fill="#0f172a" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <div className="h-80 rounded-2xl bg-slate-50 p-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} />
              <YAxis dataKey="name" type="category" width={70} />
              <Tooltip />
              <Legend />
              <Bar dataKey="visibility" name="Visibility" fill="#334155" />
              <Bar dataKey="citationShare" name="Citation share" fill="#94a3b8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}
