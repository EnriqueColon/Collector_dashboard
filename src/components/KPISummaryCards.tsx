import { useMemo } from 'react';
import { ProcessedComplaint } from '../types';
import { formatCurrency, meetsCriteria } from '../utils/calculations';
import { startOfMonth, startOfYear, subDays } from 'date-fns';

interface KPISummaryCardsProps {
  complaints: ProcessedComplaint[];
}

interface CardProps {
  label: string;
  value: string;
  subLabel: string;
  trend?: number;
  trendLabel?: string;
  accent: 'blue' | 'green' | 'amber';
}

function KPICard({ label, value, subLabel, trend, trendLabel, accent }: CardProps) {
  const accentColor = accent === 'blue'
    ? 'var(--primary-color)'
    : accent === 'green'
    ? 'var(--success-color)'
    : 'var(--warning-color)';

  return (
    <div className="kpi-card">
      <div className="kpi-accent-bar" style={{ backgroundColor: accentColor }} />
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-sublabel">{subLabel}</div>
      {trend !== undefined && (
        <div className={`kpi-trend ${trend >= 0 ? 'kpi-trend-up' : 'kpi-trend-down'}`}>
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
          {trendLabel && <span className="kpi-trend-context"> {trendLabel}</span>}
        </div>
      )}
    </div>
  );
}

export function KPISummaryCards({ complaints }: KPISummaryCardsProps) {
  const metrics = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const yearStart = startOfYear(now);
    const thisWeekStart = subDays(now, 7);
    const lastWeekStart = subDays(now, 14);

    const valid = complaints.filter(c => c.isValid && !c.isDuplicate);

    const inRange = (c: ProcessedComplaint, from: Date, to?: Date) => {
      if (!c.complaintDate) return false;
      const d = c.complaintDate instanceof Date ? c.complaintDate : new Date(c.complaintDate);
      return d >= from && (!to || d < to);
    };

    const mtdAll = valid.filter(c => inRange(c, monthStart));
    const mtdCriteria = mtdAll.filter(meetsCriteria);
    const mtdUPB = mtdCriteria.reduce((s, c) => s + (typeof c.upb === 'number' && !isNaN(c.upb) ? c.upb : 0), 0);

    const ytdCriteria = valid.filter(c => inRange(c, yearStart) && meetsCriteria(c));

    const thisWeek = valid.filter(c => inRange(c, thisWeekStart) && meetsCriteria(c)).length;
    const lastWeek = valid.filter(c => inRange(c, lastWeekStart, thisWeekStart) && meetsCriteria(c)).length;

    const wow = lastWeek === 0
      ? (thisWeek > 0 ? 100 : 0)
      : Math.round(((thisWeek - lastWeek) / lastWeek) * 100);

    return { mtdAll: mtdAll.length, mtdCriteria: mtdCriteria.length, mtdUPB, ytdCriteria: ytdCriteria.length, thisWeek, wow };
  }, [complaints]);

  const month = new Date().toLocaleString('en-US', { month: 'long' });
  const year = new Date().getFullYear();

  return (
    <div className="kpi-grid">
      <KPICard
        label={`${month} Complaints`}
        value={metrics.mtdAll.toLocaleString()}
        subLabel="All valid filings this month"
        accent="blue"
      />
      <KPICard
        label={`${month} Criteria Deals`}
        value={metrics.mtdCriteria.toLocaleString()}
        subLabel="Meets criteria this month"
        accent="green"
      />
      <KPICard
        label={`${month} Criteria UPB`}
        value={formatCurrency(metrics.mtdUPB)}
        subLabel="UPB meeting criteria MTD"
        accent="blue"
      />
      <KPICard
        label={`${year} YTD Criteria`}
        value={metrics.ytdCriteria.toLocaleString()}
        subLabel="Total deals meeting criteria YTD"
        accent="green"
      />
      <KPICard
        label="This Week"
        value={metrics.thisWeek.toLocaleString()}
        subLabel="Criteria deals, last 7 days"
        trend={metrics.wow}
        trendLabel="vs prior week"
        accent={metrics.wow >= 0 ? 'green' : 'amber'}
      />
    </div>
  );
}
