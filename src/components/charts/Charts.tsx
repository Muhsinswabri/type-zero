import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useProgress } from '../../hooks/useProgress';
import type { ActivityPoint, DayPoint } from '../../lib/analytics';

function cssRgb(name: string, fallback: string): string {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v ? `rgb(${v})` : fallback;
  } catch {
    return fallback;
  }
}

function useChartColors() {
  const { state } = useProgress();
  // Re-read the CSS variables whenever the theme changes.
  void state.settings.theme;
  return {
    accent: cssRgb('--c-accent', '#a3e635'),
    mute: cssRgb('--c-mute', '#9299aa'),
    line: cssRgb('--c-line', '#2a303f'),
    card: cssRgb('--c-card', '#181d28'),
    ink: cssRgb('--c-ink', '#f4f6fc'),
    good: cssRgb('--c-good', '#4ade80'),
  };
}

interface TrendProps {
  data: DayPoint[];
  metric: 'wpm' | 'accuracy';
  title: string;
}

export function TrendChart({ data, metric, title }: TrendProps) {
  const c = useChartColors();
  const unit = metric === 'wpm' ? 'WPM' : '%';
  const points = data.filter((d) => d[metric] !== null);
  const summary = `${title}: ${points.map((p) => `${p.label} ${p[metric]}${metric === 'accuracy' ? '%' : ' WPM'}`).join(', ')}.`;
  if (points.length === 0) {
    return (
      <figure className="m-0">
        <figcaption className="mb-2 text-sm font-semibold">{title}</figcaption>
        <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-mute">
          {metric === 'wpm'
            ? 'No speed data yet. Speed is recorded for sessions of at least 20 keystrokes lasting 10 seconds or more.'
            : 'No accuracy data yet.'}
        </p>
      </figure>
    );
  }
  return (
    <figure className="m-0">
      <figcaption className="mb-2 text-sm font-semibold">{title}</figcaption>
      <div role="img" aria-label={summary} className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
            <CartesianGrid stroke={c.line} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" stroke={c.mute} tick={{ fontSize: 11 }} tickLine={false} minTickGap={24} />
            <YAxis stroke={c.mute} tick={{ fontSize: 11 }} tickLine={false} domain={metric === 'accuracy' ? [0, 100] : [0, 'auto']} />
            <Tooltip
              contentStyle={{ background: c.card, border: `1px solid ${c.line}`, borderRadius: 12, color: c.ink, fontSize: 12 }}
              formatter={(value: number) => [`${value} ${unit}`, title]}
              labelFormatter={(label: string) => label}
            />
            <Line type="monotone" dataKey={metric} stroke={c.accent} strokeWidth={2.5} dot={{ r: 3, fill: c.accent }} activeDot={{ r: 5 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th>Date</th>
            <th>{unit}</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.date}>
              <td>{p.label}</td>
              <td>{p[metric]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export function ActivityChart({ data, title }: { data: ActivityPoint[]; title: string }) {
  const c = useChartColors();
  const summary = `${title}: ${data.filter((d) => d.minutes > 0).map((p) => `${p.label} ${p.minutes} minutes`).join(', ') || 'no practice'}.`;
  return (
    <figure className="m-0">
      <figcaption className="mb-2 text-sm font-semibold">{title}</figcaption>
      <div role="img" aria-label={summary} className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
            <CartesianGrid stroke={c.line} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" stroke={c.mute} tick={{ fontSize: 11 }} tickLine={false} minTickGap={24} />
            <YAxis stroke={c.mute} tick={{ fontSize: 11 }} tickLine={false} allowDecimals={false} />
            <Tooltip
              cursor={{ fill: c.line, opacity: 0.35 }}
              contentStyle={{ background: c.card, border: `1px solid ${c.line}`, borderRadius: 12, color: c.ink, fontSize: 12 }}
              formatter={(value: number) => [`${value} min`, 'Practice']}
            />
            <Bar dataKey="minutes" fill={c.accent} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th>Date</th>
            <th>Minutes</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p) => (
            <tr key={p.date}>
              <td>{p.label}</td>
              <td>{p.minutes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
