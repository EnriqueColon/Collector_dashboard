// Summary Page Component - Region-based aggregation

import { useMemo } from 'react';
import { RegionSummary, YearSummary } from '../types';
import { formatCurrency } from '../utils/calculations';
import { format } from 'date-fns';

interface SummaryPageProps {
  currentMonthData: RegionSummary[];
  ytdData: RegionSummary[];
  yearData: YearSummary[];
}

export function SummaryPage({ currentMonthData, ytdData, yearData }: SummaryPageProps) {
  const formatPercent = (numerator: number, denominator: number) => {
    if (!denominator || denominator <= 0) return '0%';
    return `${Math.round((numerator / denominator) * 100)}%`;
  };
  // Calculate totals for current month
  const currentMonthTotals = useMemo(() => {
    return currentMonthData.reduce(
      (acc, region) => ({
        totalComplaints: acc.totalComplaints + region.totalComplaints,
        totalUPB: acc.totalUPB + region.totalUPB,
        complaintsMeetingCriteria: acc.complaintsMeetingCriteria + region.complaintsMeetingCriteria,
        upbMeetingCriteria: acc.upbMeetingCriteria + region.upbMeetingCriteria,
      }),
      {
        totalComplaints: 0,
        totalUPB: 0,
        complaintsMeetingCriteria: 0,
        upbMeetingCriteria: 0,
      }
    );
  }, [currentMonthData]);

  // Calculate totals for YTD
  const ytdTotals = useMemo(() => {
    return ytdData.reduce(
      (acc, region) => ({
        totalComplaints: acc.totalComplaints + region.totalComplaints,
        totalUPB: acc.totalUPB + region.totalUPB,
        complaintsMeetingCriteria: acc.complaintsMeetingCriteria + region.complaintsMeetingCriteria,
        upbMeetingCriteria: acc.upbMeetingCriteria + region.upbMeetingCriteria,
      }),
      {
        totalComplaints: 0,
        totalUPB: 0,
        complaintsMeetingCriteria: 0,
        upbMeetingCriteria: 0,
      }
    );
  }, [ytdData]);

  // Calculate totals for year summary
  const yearTotals = useMemo(() => {
    return yearData.reduce(
      (acc, year) => ({
        totalComplaints: acc.totalComplaints + year.totalComplaints,
        totalUPB: acc.totalUPB + year.totalUPB,
        complaintsMeetingCriteria: acc.complaintsMeetingCriteria + year.complaintsMeetingCriteria,
        upbMeetingCriteria: acc.upbMeetingCriteria + year.upbMeetingCriteria,
      }),
      {
        totalComplaints: 0,
        totalUPB: 0,
        complaintsMeetingCriteria: 0,
        upbMeetingCriteria: 0,
      }
    );
  }, [yearData]);

  const currentMonth = format(new Date(), 'MMMM yyyy');

  const exportToCSV = (data: RegionSummary[] | YearSummary[], title: string, isYearData: boolean = false) => {
    const headers = [
      isYearData ? 'Year' : 'Region',
      'Total Complaints Collected',
      'Total UPB Collected',
      'Complaints That Meet Criteria',
      'UPB That Meets Criteria',
    ];
    
    const rows = data.map(row => [
      isYearData ? (row as YearSummary).year : (row as RegionSummary).region,
      row.totalComplaints.toString(),
      row.totalUPB.toString(),
      row.complaintsMeetingCriteria.toString(),
      row.upbMeetingCriteria.toString(),
    ]);

    // Add totals row
    let totals: string[];
    if (isYearData) {
      totals = [
        'Totals',
        yearTotals.totalComplaints.toString(),
        yearTotals.totalUPB.toString(),
        yearTotals.complaintsMeetingCriteria.toString(),
        yearTotals.upbMeetingCriteria.toString(),
      ];
    } else {
      totals = data.length > 0 ? [
        'Totals',
        currentMonthData === data 
          ? currentMonthTotals.totalComplaints.toString()
          : ytdTotals.totalComplaints.toString(),
        currentMonthData === data
          ? currentMonthTotals.totalUPB.toString()
          : ytdTotals.totalUPB.toString(),
        currentMonthData === data
          ? currentMonthTotals.complaintsMeetingCriteria.toString()
          : ytdTotals.complaintsMeetingCriteria.toString(),
        currentMonthData === data
          ? currentMonthTotals.upbMeetingCriteria.toString()
          : ytdTotals.upbMeetingCriteria.toString(),
      ] : ['Totals', '0', '0', '0', '0'];
    }
    
    rows.push(totals);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Summary</h1>
      </header>

      <main className="dashboard-content">
        {/* Year Summary Table - Above Table A */}
        <section className="dashboard-section">
          <div className="dashboard-card">
            <div className="card-header">
              <h2>Year Summary (2024, 2025)</h2>
              <button
                onClick={() => exportToCSV(yearData, 'Year Summary', true)}
                className="export-button"
              >
                Export CSV
              </button>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Year</th>
                    <th className="text-right">Total Complaints Collected</th>
                    <th className="text-right">Total UPB Collected</th>
                    <th className="text-right">Complaints That Meet Criteria</th>
                    <th className="text-right">UPB That Meets Criteria</th>
                  </tr>
                </thead>
                <tbody>
                  {yearData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="empty-state">
                        No data available
                      </td>
                    </tr>
                  ) : (
                    <>
                      {yearData.map((year, idx) => (
                        <tr key={idx}>
                          <td className="region-cell">{year.year}</td>
                          <td className="text-right">{year.totalComplaints.toLocaleString()}</td>
                          <td className="text-right currency-cell">
                            {formatCurrency(year.totalUPB)}
                          </td>
                          <td className="text-right">
                            {year.complaintsMeetingCriteria.toLocaleString()}
                            <div className="cell-subtext">
                              {formatPercent(year.complaintsMeetingCriteria, year.totalComplaints)}
                            </div>
                          </td>
                          <td className="text-right currency-cell">
                            {formatCurrency(year.upbMeetingCriteria)}
                            <div className="cell-subtext">
                              {formatPercent(year.upbMeetingCriteria, year.totalUPB)}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {/* Totals Row */}
                      <tr className="totals-row">
                        <td className="region-cell"><strong>Totals</strong></td>
                        <td className="text-right">
                          <strong>{yearTotals.totalComplaints.toLocaleString()}</strong>
                        </td>
                        <td className="text-right currency-cell">
                          <strong>{formatCurrency(yearTotals.totalUPB)}</strong>
                        </td>
                        <td className="text-right">
                          <strong>
                            {yearTotals.complaintsMeetingCriteria.toLocaleString()}
                          </strong>
                          <div className="cell-subtext">
                            {formatPercent(yearTotals.complaintsMeetingCriteria, yearTotals.totalComplaints)}
                          </div>
                        </td>
                        <td className="text-right currency-cell">
                          <strong>{formatCurrency(yearTotals.upbMeetingCriteria)}</strong>
                          <div className="cell-subtext">
                            {formatPercent(yearTotals.upbMeetingCriteria, yearTotals.totalUPB)}
                          </div>
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Table A - Current Month */}
        <section className="dashboard-section">
          <div className="dashboard-card">
            <div className="card-header">
              <h2>Table A — Current Month ({currentMonth})</h2>
              <button
                onClick={() => exportToCSV(currentMonthData, `Current Month ${currentMonth}`, false)}
                className="export-button"
              >
                Export CSV
              </button>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Region</th>
                    <th className="text-right">Total Complaints Collected</th>
                    <th className="text-right">Total UPB Collected</th>
                    <th className="text-right">Complaints That Meet Criteria</th>
                    <th className="text-right">UPB That Meets Criteria</th>
                  </tr>
                </thead>
                <tbody>
                  {currentMonthData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="empty-state">
                        No data available for current month
                      </td>
                    </tr>
                  ) : (
                    <>
                      {currentMonthData.map((region, idx) => (
                        <tr key={idx}>
                          <td className="region-cell">{region.region}</td>
                          <td className="text-right">{region.totalComplaints.toLocaleString()}</td>
                          <td className="text-right currency-cell">
                            {formatCurrency(region.totalUPB)}
                          </td>
                          <td className="text-right">
                            {region.complaintsMeetingCriteria.toLocaleString()}
                            <div className="cell-subtext">
                              {formatPercent(region.complaintsMeetingCriteria, region.totalComplaints)}
                            </div>
                          </td>
                          <td className="text-right currency-cell">
                            {formatCurrency(region.upbMeetingCriteria)}
                            <div className="cell-subtext">
                              {formatPercent(region.upbMeetingCriteria, region.totalUPB)}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {/* Totals Row */}
                      <tr className="totals-row">
                        <td className="region-cell"><strong>Totals</strong></td>
                        <td className="text-right">
                          <strong>{currentMonthTotals.totalComplaints.toLocaleString()}</strong>
                        </td>
                        <td className="text-right currency-cell">
                          <strong>{formatCurrency(currentMonthTotals.totalUPB)}</strong>
                        </td>
                        <td className="text-right">
                          <strong>
                            {currentMonthTotals.complaintsMeetingCriteria.toLocaleString()}
                          </strong>
                          <div className="cell-subtext">
                            {formatPercent(currentMonthTotals.complaintsMeetingCriteria, currentMonthTotals.totalComplaints)}
                          </div>
                        </td>
                        <td className="text-right currency-cell">
                          <strong>{formatCurrency(currentMonthTotals.upbMeetingCriteria)}</strong>
                          <div className="cell-subtext">
                            {formatPercent(currentMonthTotals.upbMeetingCriteria, currentMonthTotals.totalUPB)}
                          </div>
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Table B - Year-to-Date */}
        <section className="dashboard-section">
          <div className="dashboard-card">
            <div className="card-header">
              <h2>Table B — Year-to-Date (YTD)</h2>
              <button
                onClick={() => exportToCSV(ytdData, 'Year to Date', false)}
                className="export-button"
              >
                Export CSV
              </button>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Region</th>
                    <th className="text-right">Total Complaints Collected</th>
                    <th className="text-right">Total UPB Collected</th>
                    <th className="text-right">Complaints That Meet Criteria</th>
                    <th className="text-right">UPB That Meets Criteria</th>
                  </tr>
                </thead>
                <tbody>
                  {ytdData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="empty-state">
                        No data available for year-to-date
                      </td>
                    </tr>
                  ) : (
                    <>
                      {ytdData.map((region, idx) => (
                        <tr key={idx}>
                          <td className="region-cell">{region.region}</td>
                          <td className="text-right">{region.totalComplaints.toLocaleString()}</td>
                          <td className="text-right currency-cell">
                            {formatCurrency(region.totalUPB)}
                          </td>
                          <td className="text-right">
                            {region.complaintsMeetingCriteria.toLocaleString()}
                            <div className="cell-subtext">
                              {formatPercent(region.complaintsMeetingCriteria, region.totalComplaints)}
                            </div>
                          </td>
                          <td className="text-right currency-cell">
                            {formatCurrency(region.upbMeetingCriteria)}
                            <div className="cell-subtext">
                              {formatPercent(region.upbMeetingCriteria, region.totalUPB)}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {/* Totals Row */}
                      <tr className="totals-row">
                        <td className="region-cell"><strong>Totals</strong></td>
                        <td className="text-right">
                          <strong>{ytdTotals.totalComplaints.toLocaleString()}</strong>
                        </td>
                        <td className="text-right currency-cell">
                          <strong>{formatCurrency(ytdTotals.totalUPB)}</strong>
                        </td>
                        <td className="text-right">
                          <strong>
                            {ytdTotals.complaintsMeetingCriteria.toLocaleString()}
                          </strong>
                          <div className="cell-subtext">
                            {formatPercent(ytdTotals.complaintsMeetingCriteria, ytdTotals.totalComplaints)}
                          </div>
                        </td>
                        <td className="text-right currency-cell">
                          <strong>{formatCurrency(ytdTotals.upbMeetingCriteria)}</strong>
                          <div className="cell-subtext">
                            {formatPercent(ytdTotals.upbMeetingCriteria, ytdTotals.totalUPB)}
                          </div>
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
