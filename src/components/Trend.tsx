import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { ReportBundle } from '../types/report';
import { Card, SectionTitle } from './ui';

export function Trend({ report }: { report: ReportBundle }) {
  return (
    <Card>
      <SectionTitle eyebrow="Brand influence trend" title="Trend appears once dated run history is embedded or available via API">
        The uploaded Bodhi output contains a single completed run. This dashboard does not fabricate trend data after upload.
      </SectionTitle>
      {report.trend.length ? (
        <div className="h-80 rounded-2xl bg-slate-50 p-3">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={report.trend} margin={{ top: 15, right: 20, bottom: 10, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="brandScore" name="Brand score" stroke="#0f172a" strokeWidth={3} />
              <Line type="monotone" dataKey="ownedCitations" name="Owned citations" stroke="#64748b" strokeWidth={3} />
              <Line type="monotone" dataKey="competitorPressure" name="Competitor pressure" stroke="#cbd5e1" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="rounded-2xl bg-slate-50 p-5 text-sm leading-6 text-slate-600">
          No historical trend array was present in the uploaded JSON. Once weekly runs are stored, this view should read run history from the evidence service rather than using sample data.
        </div>
      )}
    </Card>
  );
}
