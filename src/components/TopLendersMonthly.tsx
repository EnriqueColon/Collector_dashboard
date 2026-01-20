// Top Lenders Monthly Component

import { useMemo } from 'react';
import { MonthlyLenderData, MonthlyTrendSummary } from '../types';
import { formatCurrency } from '../utils/calculations';
import { format, parse } from 'date-fns';

interface TopLendersMonthlyProps {
  data: MonthlyLenderData[];
  monthlySummary: MonthlyTrendSummary[];
}

export function TopLendersMonthly({ data, monthlySummary }: TopLendersMonthlyProps) {
  const monthlyTrendData = useMemo(() => {
    const cutoffMonth = '2024-08'; // Exclude Jul 2024 and earlier
    return [...monthlySummary]
      .filter(row => row.month >= cutoffMonth)
      .map(row => ({
        ...row,
        monthLabel: format(parse(row.month, 'yyyy-MM', new Date()), 'MMM yyyy'),
      }))
      .sort((a, b) => b.month.localeCompare(a.month));
  }, [monthlySummary]);


  if (data.length === 0) {
    return (
      <div className="dashboard-card">
        <div className="card-header">
          <h2>Top Lenders (Monthly View)</h2>
        </div>
        <div className="empty-state">No lender data available</div>
      </div>
    );
  }

  return (
    <div className="dashboard-card">
      <div className="card-header">
        <h2>Monthly Trends (Totals vs Criteria)</h2>
        <div className="header-note">
          Lenders are normalized for grouping (e.g., Wilmington, JPMorgan, SIG RCRS).
        </div>
      </div>

      {/* Visualizations */}
      <div className="charts-container">
        <div className="chart-section">
          <h3>Monthly Trends (Totals vs Criteria)</h3>

          <div className="chart-subsection">
            <div className="chart-subtitle">Complaints</div>
            <div className="chart-bars grouped">
              {monthlyTrendData.map((month, idx) => {
                const maxTotal = Math.max(...monthlyTrendData.map(m => m.totalComplaints));
                const totalHeight = maxTotal > 0 ? (month.totalComplaints / maxTotal) * 100 : 0;
                const criteriaHeight = maxTotal > 0 ? (month.complaintsMeetingCriteria / maxTotal) * 100 : 0;

                return (
                  <div key={idx} className="chart-bar-group grouped">
                    <div className="chart-bar-pair">
                      <div
                        className="chart-bar series-total"
                        style={{ height: `${totalHeight}%` }}
                        title={`${month.monthLabel}: ${month.totalComplaints} total complaints`}
                      />
                      <div
                        className="chart-bar series-criteria"
                        style={{ height: `${criteriaHeight}%` }}
                        title={`${month.monthLabel}: ${month.complaintsMeetingCriteria} complaints meeting criteria`}
                      />
                    </div>
                    <div className="chart-label">{month.monthLabel}</div>
                    <div className="chart-label-secondary">
                      {month.totalComplaints > 0
                        ? `${Math.round((month.complaintsMeetingCriteria / month.totalComplaints) * 100)}%`
                        : '0%'}
                    </div>
                    <div className="chart-value">
                      {month.totalComplaints} / {month.complaintsMeetingCriteria}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="chart-subsection">
            <div className="chart-subtitle">UPB</div>
            <div className="chart-bars grouped">
              {monthlyTrendData.map((month, idx) => {
                const maxTotal = Math.max(...monthlyTrendData.map(m => m.totalUPB));
                const totalHeight = maxTotal > 0 ? (month.totalUPB / maxTotal) * 100 : 0;
                const criteriaHeight = maxTotal > 0 ? (month.upbMeetingCriteria / maxTotal) * 100 : 0;

                return (
                  <div key={idx} className="chart-bar-group grouped">
                    <div className="chart-bar-pair">
                      <div
                        className="chart-bar series-total"
                        style={{ height: `${totalHeight}%` }}
                        title={`${month.monthLabel}: ${formatCurrency(month.totalUPB)} total UPB`}
                      />
                      <div
                        className="chart-bar series-criteria"
                        style={{ height: `${criteriaHeight}%` }}
                        title={`${month.monthLabel}: ${formatCurrency(month.upbMeetingCriteria)} UPB meeting criteria`}
                      />
                    </div>
                    <div className="chart-label">{month.monthLabel}</div>
                    <div className="chart-label-secondary">
                      {month.totalUPB > 0
                        ? `${Math.round((month.upbMeetingCriteria / month.totalUPB) * 100)}%`
                        : '0%'}
                    </div>
                    <div className="chart-value">
                      {formatCurrency(month.totalUPB)} / {formatCurrency(month.upbMeetingCriteria)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
