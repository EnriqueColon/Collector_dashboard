// Four-Week Roll-Up Component with Weekly Breakdown

import { useState, useMemo } from 'react';
import { FourWeekRollUpWeekly } from '../types';
import { formatCurrency } from '../utils/calculations';
import { subDays, format } from 'date-fns';

interface FourWeekRollUpWeeklyTableProps {
  data: FourWeekRollUpWeekly[];
}

type SortField = 'county' | 'week1' | 'week2' | 'week3' | 'week4' | 'total';
type SortDirection = 'asc' | 'desc';

export function FourWeekRollUpWeeklyTable({ data }: FourWeekRollUpWeeklyTableProps) {
  const [sortField, setSortField] = useState<SortField>('county');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const sortedData = useMemo(() => {
    const sorted = [...data].sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (sortField) {
        case 'county':
          aValue = a.county;
          bValue = b.county;
          break;
        case 'week1':
          aValue = a.week1.totalComplaints;
          bValue = b.week1.totalComplaints;
          break;
        case 'week2':
          aValue = a.week2.totalComplaints;
          bValue = b.week2.totalComplaints;
          break;
        case 'week3':
          aValue = a.week3.totalComplaints;
          bValue = b.week3.totalComplaints;
          break;
        case 'week4':
          aValue = a.week4.totalComplaints;
          bValue = b.week4.totalComplaints;
          break;
        case 'total':
          aValue = a.totalComplaints;
          bValue = b.totalComplaints;
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
      setSortDirection('asc');
    }
  };

  const exportToCSV = () => {
    const headers = [
      'County',
      'Week 1 Complaints', 'Week 1 UPB',
      'Week 2 Complaints', 'Week 2 UPB',
      'Week 3 Complaints', 'Week 3 UPB',
      'Week 4 Complaints', 'Week 4 UPB',
      'Total Complaints', 'Total UPB',
    ];

    const rows = sortedData.map(row => [
      row.county,
      row.week1.totalComplaints.toString(),
      row.week1.totalUPB.toString(),
      row.week2.totalComplaints.toString(),
      row.week2.totalUPB.toString(),
      row.week3.totalComplaints.toString(),
      row.week3.totalUPB.toString(),
      row.week4.totalComplaints.toString(),
      row.week4.totalUPB.toString(),
      row.totalComplaints.toString(),
      row.totalUPB.toString(),
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `four-week-rollup-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getWeekLabel = (weekNum: number) => {
    const now = new Date();
    // Week 1 is most recent (last 7 days), Week 4 is oldest (28-21 days ago)
    const weekStart = subDays(now, weekNum * 7);
    return format(weekStart, 'MMM d');
  };

  const getWeekRangeLabel = (weekNum: number) => {
    const now = new Date();
    const rangeStart = subDays(now, weekNum * 7);
    const rangeEnd = weekNum === 1 ? now : subDays(now, (weekNum - 1) * 7);
    const displayEnd = weekNum === 1 ? rangeEnd : subDays(rangeEnd, 1);
    return `${format(rangeStart, 'MMM d')}–${format(displayEnd, 'MMM d')}`;
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="sort-icon">↕</span>;
    return <span className="sort-icon">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  if (data.length === 0) {
    return (
      <div className="dashboard-card">
        <div className="card-header">
          <h2>Four-Week Roll-Up (Weekly Breakdown)</h2>
        </div>
        <div className="empty-state">No data available</div>
      </div>
    );
  }

  // Calculate totals for summary
  const totals = sortedData.reduce(
    (acc, row) => ({
      week1: {
        complaints: acc.week1.complaints + row.week1.totalComplaints,
        upb: acc.week1.upb + row.week1.totalUPB,
      },
      week2: {
        complaints: acc.week2.complaints + row.week2.totalComplaints,
        upb: acc.week2.upb + row.week2.totalUPB,
      },
      week3: {
        complaints: acc.week3.complaints + row.week3.totalComplaints,
        upb: acc.week3.upb + row.week3.totalUPB,
      },
      week4: {
        complaints: acc.week4.complaints + row.week4.totalComplaints,
        upb: acc.week4.upb + row.week4.totalUPB,
      },
      total: {
        complaints: acc.total.complaints + row.totalComplaints,
        upb: acc.total.upb + row.totalUPB,
      },
    }),
    {
      week1: { complaints: 0, upb: 0 },
      week2: { complaints: 0, upb: 0 },
      week3: { complaints: 0, upb: 0 },
      week4: { complaints: 0, upb: 0 },
      total: { complaints: 0, upb: 0 },
    }
  );

  return (
    <div className="dashboard-card">
      <div className="card-header">
        <h2>Four-Week Roll-Up (Weekly Breakdown)</h2>
        <button onClick={exportToCSV} className="export-button">
          Export CSV
        </button>
      </div>

      {/* Summary Visual */}
      <div className="summary-chart">
        <div className="chart-bars">
          {[1, 2, 3, 4].map(week => {
            const weekData = totals[`week${week}` as keyof typeof totals];
            const maxUpb = Math.max(...Object.values(totals).map(w => w.upb));
            const height = maxUpb > 0 ? (weekData.upb / maxUpb) * 100 : 0;

            return (
              <div key={week} className="chart-bar-group">
                <div className="chart-value">{formatCurrency(weekData.upb)}</div>
                <div className="chart-value chart-value-secondary">{weekData.complaints} complaints</div>
                <div className="chart-bar-container">
                  <div
                    className="chart-bar"
                    style={{ height: `${height}%` }}
                    title={`${getWeekRangeLabel(week)}: ${weekData.complaints} complaints, ${formatCurrency(weekData.upb)}`}
                  />
                </div>
                <div className="chart-label">{getWeekRangeLabel(week)}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('county')} className="sortable">
                County <SortIcon field="county" />
              </th>
              <th onClick={() => handleSort('week1')} className="sortable">
                Week 1 ({getWeekLabel(1)}) <SortIcon field="week1" />
              </th>
              <th onClick={() => handleSort('week2')} className="sortable">
                Week 2 ({getWeekLabel(2)}) <SortIcon field="week2" />
              </th>
              <th onClick={() => handleSort('week3')} className="sortable">
                Week 3 ({getWeekLabel(3)}) <SortIcon field="week3" />
              </th>
              <th onClick={() => handleSort('week4')} className="sortable">
                Week 4 ({getWeekLabel(4)}) <SortIcon field="week4" />
              </th>
              <th onClick={() => handleSort('total')} className="sortable">
                Total (4 Weeks) <SortIcon field="total" />
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, idx) => (
              <tr key={idx}>
                <td className="county-cell">{row.county}</td>
                <td>
                  <div className="week-cell">
                    <span className="complaint-count">{row.week1.totalComplaints}</span>
                    <span className="upb-amount">{formatCurrency(row.week1.totalUPB)}</span>
                  </div>
                </td>
                <td>
                  <div className="week-cell">
                    <span className="complaint-count">{row.week2.totalComplaints}</span>
                    <span className="upb-amount">{formatCurrency(row.week2.totalUPB)}</span>
                  </div>
                </td>
                <td>
                  <div className="week-cell">
                    <span className="complaint-count">{row.week3.totalComplaints}</span>
                    <span className="upb-amount">{formatCurrency(row.week3.totalUPB)}</span>
                  </div>
                </td>
                <td>
                  <div className="week-cell">
                    <span className="complaint-count">{row.week4.totalComplaints}</span>
                    <span className="upb-amount">{formatCurrency(row.week4.totalUPB)}</span>
                  </div>
                </td>
                <td className="total-cell">
                  <div className="week-cell">
                    <span className="complaint-count">{row.totalComplaints}</span>
                    <span className="upb-amount">{formatCurrency(row.totalUPB)}</span>
                  </div>
                </td>
              </tr>
            ))}
            <tr className="totals-row">
              <td className="county-cell"><strong>Total</strong></td>
              <td>
                <div className="week-cell">
                  <span className="complaint-count"><strong>{totals.week1.complaints}</strong></span>
                  <span className="upb-amount"><strong>{formatCurrency(totals.week1.upb)}</strong></span>
                </div>
              </td>
              <td>
                <div className="week-cell">
                  <span className="complaint-count"><strong>{totals.week2.complaints}</strong></span>
                  <span className="upb-amount"><strong>{formatCurrency(totals.week2.upb)}</strong></span>
                </div>
              </td>
              <td>
                <div className="week-cell">
                  <span className="complaint-count"><strong>{totals.week3.complaints}</strong></span>
                  <span className="upb-amount"><strong>{formatCurrency(totals.week3.upb)}</strong></span>
                </div>
              </td>
              <td>
                <div className="week-cell">
                  <span className="complaint-count"><strong>{totals.week4.complaints}</strong></span>
                  <span className="upb-amount"><strong>{formatCurrency(totals.week4.upb)}</strong></span>
                </div>
              </td>
              <td className="total-cell">
                <div className="week-cell">
                  <span className="complaint-count"><strong>{totals.total.complaints}</strong></span>
                  <span className="upb-amount"><strong>{formatCurrency(totals.total.upb)}</strong></span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
