// Top Lenders Monthly Component

import { useMemo, useState } from 'react';
import { MonthlyLenderData, MonthlyTrendSummary, ProcessedComplaint } from '../types';
import { formatCurrency, formatDate, meetsCriteria } from '../utils/calculations';
import { format, parse } from 'date-fns';

interface TopLendersMonthlyProps {
  data: MonthlyLenderData[];
  monthlySummary: MonthlyTrendSummary[];
  complaints: ProcessedComplaint[];
}

type DealSortField = 'property' | 'county' | 'lender' | 'upb' | 'date';

function upbClass(upb: number) {
  if (upb >= 750000) return 'upb-high';
  if (upb >= 500000) return 'upb-mid';
  return '';
}

export function TopLendersMonthly({ data, monthlySummary, complaints }: TopLendersMonthlyProps) {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [dealSortField, setDealSortField] = useState<DealSortField>('date');
  const [dealSortDir, setDealSortDir] = useState<'asc' | 'desc'>('desc');

  const monthlyTrendData = useMemo(() => {
    const cutoffMonth = '2024-08';
    return [...monthlySummary]
      .filter(row => row.month >= cutoffMonth)
      .map(row => ({
        ...row,
        monthLabel: format(parse(row.month, 'yyyy-MM', new Date()), 'MMM yyyy'),
      }))
      .sort((a, b) => b.month.localeCompare(a.month));
  }, [monthlySummary]);

  const monthDeals = useMemo(() => {
    if (!selectedMonth) return [];
    const raw = complaints
      .filter(c => c.isValid && !c.isDuplicate)
      .filter(c => {
        if (!c.complaintDate) return false;
        const d = c.complaintDate instanceof Date ? c.complaintDate : new Date(c.complaintDate);
        return format(d, 'yyyy-MM') === selectedMonth;
      })
      .map(c => ({
        propertyAddress: c.propertyAddress || 'Unknown',
        county: c.normalizedCounty || c.county || 'Unknown',
        lender: c.normalizedLender || c.lender || c.plaintiff || 'Unknown',
        upb: typeof c.upb === 'number' && !isNaN(c.upb) ? c.upb : 0,
        complaintDate: c.complaintDate,
        meetsCriteria: meetsCriteria(c),
      }));

    return [...raw].sort((a, b) => {
      if (dealSortField === 'property') return dealSortDir === 'asc' ? a.propertyAddress.localeCompare(b.propertyAddress) : b.propertyAddress.localeCompare(a.propertyAddress);
      if (dealSortField === 'county')   return dealSortDir === 'asc' ? a.county.localeCompare(b.county) : b.county.localeCompare(a.county);
      if (dealSortField === 'lender')   return dealSortDir === 'asc' ? a.lender.localeCompare(b.lender) : b.lender.localeCompare(a.lender);
      if (dealSortField === 'date') {
        const aT = a.complaintDate ? new Date(a.complaintDate).getTime() : 0;
        const bT = b.complaintDate ? new Date(b.complaintDate).getTime() : 0;
        return dealSortDir === 'asc' ? aT - bT : bT - aT;
      }
      return dealSortDir === 'asc' ? a.upb - b.upb : b.upb - a.upb;
    });
  }, [complaints, selectedMonth, dealSortField, dealSortDir]);

  const handleDealSort = (field: DealSortField) => {
    if (dealSortField === field) setDealSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setDealSortField(field); setDealSortDir(field === 'upb' || field === 'date' ? 'desc' : 'asc'); }
  };

  const DealSortIcon = ({ field }: { field: DealSortField }) => (
    <span className="sort-icon">{dealSortField !== field ? '↕' : dealSortDir === 'asc' ? '↑' : '↓'}</span>
  );

  const monthTotalUPB = useMemo(() => monthDeals.reduce((s, d) => s + d.upb, 0), [monthDeals]);
  const selectedMonthLabel = monthlyTrendData.find(m => m.month === selectedMonth)?.monthLabel ?? selectedMonth;

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
    <>
      <div className="dashboard-card">
        <div className="card-header">
          <h2>Monthly Trends (Totals vs Criteria)</h2>
          <div className="header-note">
            Lenders are normalized for grouping (e.g., Wilmington, JPMorgan, SIG RCRS).
          </div>
        </div>

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
                  const isSelected = selectedMonth === month.month;

                  return (
                    <div
                      key={idx}
                      className={`chart-bar-group grouped clickable-bar-group${isSelected ? ' bar-group-selected' : ''}`}
                      onClick={() => setSelectedMonth(month.month === selectedMonth ? null : month.month)}
                      title={`Click to see ${month.monthLabel} filings`}
                    >
                      <div className="chart-bar-pair">
                        <div
                          className="chart-bar series-total"
                          style={{ height: `${totalHeight}%` }}
                        />
                        <div
                          className="chart-bar series-criteria"
                          style={{ height: `${criteriaHeight}%` }}
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
                  const isSelected = selectedMonth === month.month;

                  return (
                    <div
                      key={idx}
                      className={`chart-bar-group grouped clickable-bar-group${isSelected ? ' bar-group-selected' : ''}`}
                      onClick={() => setSelectedMonth(month.month === selectedMonth ? null : month.month)}
                      title={`Click to see ${month.monthLabel} filings`}
                    >
                      <div className="chart-bar-pair">
                        <div
                          className="chart-bar series-total"
                          style={{ height: `${totalHeight}%` }}
                        />
                        <div
                          className="chart-bar series-criteria"
                          style={{ height: `${criteriaHeight}%` }}
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

      {selectedMonth && (
        <>
          <div className="side-panel-overlay" onClick={() => setSelectedMonth(null)} />
          <div className="side-panel">
            <div className="side-panel-header">
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                  {selectedMonthLabel}
                </h3>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {monthDeals.length} filing{monthDeals.length !== 1 ? 's' : ''}
                  {monthTotalUPB > 0 && <> &bull; {formatCurrency(monthTotalUPB)} total UPB</>}
                </div>
              </div>
              <button className="side-panel-close" onClick={() => setSelectedMonth(null)}>✕ Close</button>
            </div>
            <div className="side-panel-body">
              {monthDeals.length === 0 ? (
                <div className="empty-state">No filings found for this month.</div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th onClick={() => handleDealSort('property')} className="sortable">Property Address <DealSortIcon field="property" /></th>
                      <th onClick={() => handleDealSort('county')} className="sortable">County <DealSortIcon field="county" /></th>
                      <th onClick={() => handleDealSort('lender')} className="sortable">Lender <DealSortIcon field="lender" /></th>
                      <th onClick={() => handleDealSort('upb')} className="sortable text-right">UPB <DealSortIcon field="upb" /></th>
                      <th onClick={() => handleDealSort('date')} className="sortable text-right">Date <DealSortIcon field="date" /></th>
                      <th className="text-center">Criteria</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthDeals.map((deal, idx) => (
                      <tr key={idx}>
                        <td>{deal.propertyAddress}</td>
                        <td>{deal.county}</td>
                        <td>{deal.lender}</td>
                        <td className={`text-right currency-cell ${upbClass(deal.upb)}`}>{formatCurrency(deal.upb)}</td>
                        <td className="text-right">{formatDate(deal.complaintDate)}</td>
                        <td className="text-center">
                          {deal.meetsCriteria
                            ? <span className="email-sent-badge email-sent-yes">✓</span>
                            : <span className="email-sent-badge email-sent-no">✗</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
