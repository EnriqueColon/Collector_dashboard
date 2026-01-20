// Top Lenders Monthly Component

import { useState, useMemo } from 'react';
import { MonthlyLenderData, MonthlyTrendSummary } from '../types';
import { formatCurrency } from '../utils/calculations';
import { format, parse } from 'date-fns';

interface TopLendersMonthlyProps {
  data: MonthlyLenderData[];
  monthlySummary: MonthlyTrendSummary[];
}

type SortField = 'month' | 'lender' | 'numberOfComplaints' | 'totalUPB';
type SortDirection = 'asc' | 'desc';

export function TopLendersMonthly({ data, monthlySummary }: TopLendersMonthlyProps) {
  const [sortField, setSortField] = useState<SortField>('month');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const sortedData = useMemo(() => {
    const sorted = [...data].sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (sortField) {
        case 'month':
          aValue = a.month;
          bValue = b.month;
          break;
        case 'lender':
          aValue = a.lender;
          bValue = b.lender;
          break;
        case 'numberOfComplaints':
          aValue = a.numberOfComplaints;
          bValue = b.numberOfComplaints;
          break;
        case 'totalUPB':
          aValue = a.totalUPB;
          bValue = b.totalUPB;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortDirection === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });

    return sorted;
  }, [data, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'month' ? 'desc' : 'asc');
    }
  };

  const exportToCSV = () => {
    const headers = ['Month', 'Lender', 'Number of Complaints', 'Total UPB'];
    const rows = sortedData.map(row => [
      format(parse(row.month, 'yyyy-MM', new Date()), 'MMMM yyyy'),
      row.lender,
      row.numberOfComplaints.toString(),
      row.totalUPB.toString(),
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `top-lenders-monthly-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="sort-icon">↕</span>;
    return <span className="sort-icon">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

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
