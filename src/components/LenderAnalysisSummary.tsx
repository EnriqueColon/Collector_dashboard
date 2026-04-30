import { useMemo, useState } from 'react';
import { LenderCriteriaSummary, ProcessedComplaint } from '../types';
import { formatCurrency, formatDate, meetsCriteria } from '../utils/calculations';
import { normalizeLender } from '../utils/normalization';

interface LenderAnalysisSummaryProps {
  data: LenderCriteriaSummary[];
  complaints: ProcessedComplaint[];
  topCount?: number;
}

type DealSortField = 'property' | 'county' | 'upb' | 'percent' | 'date';

function upbClass(upb: number) {
  if (upb >= 750000) return 'upb-high';
  if (upb >= 500000) return 'upb-mid';
  return '';
}

export function LenderAnalysisSummary({ data, complaints, topCount = 10 }: LenderAnalysisSummaryProps) {
  const [selectedLender, setSelectedLender] = useState<string | null>(null);
  const [dealSortField, setDealSortField] = useState<DealSortField>('upb');
  const [dealSortDir, setDealSortDir] = useState<'asc' | 'desc'>('desc');

  const topByComplaints = useMemo(() =>
    [...data].sort((a, b) => b.totalComplaints - a.totalComplaints).slice(0, topCount),
    [data, topCount]
  );

  const lenderDeals = useMemo(() => {
    if (!selectedLender) return [];
    const deals = complaints
      .filter(r => r.isValid && !r.isDuplicate && meetsCriteria(r))
      .filter(r => normalizeLender(r.normalizedLender || r.lender || r.plaintiff) === selectedLender)
      .map(r => ({
        propertyAddress: r.propertyAddress || 'Unknown',
        county: r.normalizedCounty || r.county || 'Unknown',
        upb: typeof r.upb === 'number' && !isNaN(r.upb) ? r.upb : 0,
        complaintDate: r.complaintDate,
      }));

    return [...deals].sort((a, b) => {
      if (dealSortField === 'property') return dealSortDir === 'asc' ? a.propertyAddress.localeCompare(b.propertyAddress) : b.propertyAddress.localeCompare(a.propertyAddress);
      if (dealSortField === 'county') return dealSortDir === 'asc' ? a.county.localeCompare(b.county) : b.county.localeCompare(a.county);
      if (dealSortField === 'date') {
        const aT = a.complaintDate ? new Date(a.complaintDate).getTime() : 0;
        const bT = b.complaintDate ? new Date(b.complaintDate).getTime() : 0;
        return dealSortDir === 'asc' ? aT - bT : bT - aT;
      }
      return dealSortDir === 'asc' ? a.upb - b.upb : b.upb - a.upb;
    });
  }, [complaints, selectedLender, dealSortField, dealSortDir]);

  const handleDealSort = (field: DealSortField) => {
    if (dealSortField === field) {
      setDealSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setDealSortField(field);
      setDealSortDir(field === 'property' || field === 'county' ? 'asc' : 'desc');
    }
  };

  const SortIcon = ({ field }: { field: DealSortField }) => (
    <span className="sort-icon">{dealSortField !== field ? '↕' : dealSortDir === 'asc' ? '↑' : '↓'}</span>
  );

  const lenderTotalUPB = useMemo(() => lenderDeals.reduce((s, d) => s + d.upb, 0), [lenderDeals]);

  if (data.length === 0) {
    return (
      <div className="dashboard-card">
        <div className="card-header"><h2>Lender Analysis (Meets Criteria)</h2></div>
        <div className="empty-state">No lender data available</div>
      </div>
    );
  }

  return (
    <>
      <div className="dashboard-card">
        <div className="card-header">
          <h2>Lender Analysis (Meets Criteria)</h2>
          <span className="summary-badge">{topByComplaints.length} top lenders</span>
        </div>

        <div className="analysis-table-card">
          <h3>Top Lenders by Complaints — click a name to see deals</h3>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>Lender</th>
                  <th className="text-right">Complaints</th>
                  <th className="text-right">Total UPB</th>
                </tr>
              </thead>
              <tbody>
                {topByComplaints.length === 0 ? (
                  <tr><td colSpan={4} className="empty-state">No data</td></tr>
                ) : (
                  topByComplaints.map((row, idx) => (
                    <tr key={`${row.lender}-${idx}`} className={selectedLender === row.lender ? 'row-selected' : ''}>
                      <td className="rank-cell">
                        <span className={`rank-badge ${idx < 3 ? 'rank-top' : ''}`}>{idx + 1}</span>
                      </td>
                      <td>
                        <button className="link-button" onClick={() => setSelectedLender(row.lender === selectedLender ? null : row.lender)}>
                          {row.lender}
                        </button>
                      </td>
                      <td className="text-right">{row.totalComplaints.toLocaleString()}</td>
                      <td className={`text-right currency-cell ${upbClass(row.totalUPB)}`}>{formatCurrency(row.totalUPB)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Side panel */}
      {selectedLender && (
        <>
          <div className="side-panel-overlay" onClick={() => setSelectedLender(null)} />
          <div className="side-panel">
            <div className="side-panel-header">
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                  {selectedLender}
                </h3>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {lenderDeals.length} deal{lenderDeals.length !== 1 ? 's' : ''} meeting criteria
                  {lenderTotalUPB > 0 && <> &bull; {formatCurrency(lenderTotalUPB)} total UPB</>}
                </div>
              </div>
              <button className="side-panel-close" onClick={() => setSelectedLender(null)}>✕ Close</button>
            </div>

            <div className="side-panel-body">
              {lenderDeals.length === 0 ? (
                <div className="empty-state">No deals found for this lender.</div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th onClick={() => handleDealSort('property')} className="sortable">
                        Property Address <SortIcon field="property" />
                      </th>
                      <th onClick={() => handleDealSort('county')} className="sortable">
                        County <SortIcon field="county" />
                      </th>
                      <th onClick={() => handleDealSort('upb')} className="sortable text-right">
                        UPB <SortIcon field="upb" />
                      </th>
                      <th onClick={() => handleDealSort('percent')} className="sortable text-right">
                        % of Total <SortIcon field="percent" />
                      </th>
                      <th onClick={() => handleDealSort('date')} className="sortable text-right">
                        Date <SortIcon field="date" />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lenderDeals.map((deal, idx) => (
                      <tr key={`${deal.propertyAddress}-${idx}`}>
                        <td>{deal.propertyAddress}</td>
                        <td>{deal.county}</td>
                        <td className={`text-right currency-cell ${upbClass(deal.upb)}`}>{formatCurrency(deal.upb)}</td>
                        <td className="text-right">
                          {lenderTotalUPB > 0 ? `${Math.round((deal.upb / lenderTotalUPB) * 100)}%` : '0%'}
                        </td>
                        <td className="text-right">{formatDate(deal.complaintDate)}</td>
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
