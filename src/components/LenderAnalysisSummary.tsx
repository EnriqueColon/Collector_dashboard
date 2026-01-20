// Lender Analysis Summary - Meets Criteria only

import { useMemo, useState } from 'react';
import { LenderCriteriaSummary, ProcessedComplaint } from '../types';
import { formatCurrency, formatDate, meetsCriteria } from '../utils/calculations';
import { normalizeLender } from '../utils/normalization';

interface LenderAnalysisSummaryProps {
  data: LenderCriteriaSummary[];
  complaints: ProcessedComplaint[];
  topCount?: number;
}

export function LenderAnalysisSummary({ data, complaints, topCount = 10 }: LenderAnalysisSummaryProps) {
  const [selectedLender, setSelectedLender] = useState<string | null>(null);
  const [dealSortField, setDealSortField] = useState<'property' | 'county' | 'upb' | 'percent' | 'date'>('upb');
  const [dealSortDirection, setDealSortDirection] = useState<'asc' | 'desc'>('desc');

  const topByComplaints = useMemo(() => {
    return [...data]
      .sort((a, b) => b.totalComplaints - a.totalComplaints)
      .slice(0, topCount);
  }, [data, topCount]);

  const lenderDeals = useMemo(() => {
    if (!selectedLender) return [];
    const deals = complaints
      .filter(row => row.isValid && !row.isDuplicate && meetsCriteria(row))
      .filter(row => {
        const lender = normalizeLender(row.normalizedLender || row.lender || row.plaintiff);
        return lender === selectedLender;
      })
      .map(row => ({
        propertyAddress: row.propertyAddress || 'Unknown',
        county: row.normalizedCounty || row.county || 'Unknown',
        lender: selectedLender,
        upb: typeof row.upb === 'number' && !isNaN(row.upb) ? row.upb : 0,
        complaintDate: row.complaintDate,
      }));

    const getSortValue = (deal: typeof deals[number]) => {
      switch (dealSortField) {
        case 'property':
          return deal.propertyAddress;
        case 'county':
          return deal.county;
        case 'date':
          return deal.complaintDate ? new Date(deal.complaintDate).getTime() : 0;
        case 'percent':
        case 'upb':
        default:
          return deal.upb;
      }
    };

    return [...deals].sort((a, b) => {
      const aValue = getSortValue(a);
      const bValue = getSortValue(b);

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return dealSortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return dealSortDirection === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });
  }, [complaints, selectedLender, dealSortField, dealSortDirection]);

  const handleDealSort = (field: typeof dealSortField) => {
    if (dealSortField === field) {
      setDealSortDirection(dealSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setDealSortField(field);
      setDealSortDirection(field === 'property' || field === 'county' ? 'asc' : 'desc');
    }
  };

  const SortIndicator = ({ field }: { field: typeof dealSortField }) => {
    if (dealSortField !== field) return <span className="sort-icon">↕</span>;
    return <span className="sort-icon">{dealSortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  const lenderTotalUPB = useMemo(() => {
    return lenderDeals.reduce((sum, deal) => sum + deal.upb, 0);
  }, [lenderDeals]);

  if (data.length === 0) {
    return (
      <div className="dashboard-card">
        <div className="card-header">
          <h2>Lender Analysis (Meets Criteria)</h2>
        </div>
        <div className="empty-state">No lender data available</div>
      </div>
    );
  }

  return (
    <div className="dashboard-card">
      <div className="card-header">
        <h2>Lender Analysis (Meets Criteria)</h2>
      </div>

      <div className="analysis-table-card">
        <h3>Top Lenders by Complaints (Meets Criteria)</h3>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Lender</th>
                <th className="text-right">Complaints</th>
                <th className="text-right">Total UPB</th>
              </tr>
            </thead>
            <tbody>
              {topByComplaints.map((row, idx) => (
                <tr key={`${row.lender}-${idx}`}>
                  <td>
                    <button
                      className="link-button"
                      onClick={() => setSelectedLender(row.lender)}
                    >
                      {row.lender}
                    </button>
                  </td>
                  <td className="text-right">{row.totalComplaints.toLocaleString()}</td>
                  <td className="text-right currency-cell">{formatCurrency(row.totalUPB)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedLender && (
        <div className="modal-overlay" onClick={() => setSelectedLender(null)}>
          <div
            className="modal-card"
            onClick={event => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h3>{selectedLender}</h3>
                <div className="modal-subtitle">
                  Deals that meet criteria: {lenderDeals.length.toLocaleString()}
                </div>
              </div>
              <button className="modal-close" onClick={() => setSelectedLender(null)}>
                Close
              </button>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th onClick={() => handleDealSort('property')} className="sortable">
                      Property Address <SortIndicator field="property" />
                    </th>
                    <th onClick={() => handleDealSort('county')} className="sortable">
                      County <SortIndicator field="county" />
                    </th>
                    <th onClick={() => handleDealSort('upb')} className="sortable text-right">
                      UPB <SortIndicator field="upb" />
                    </th>
                    <th onClick={() => handleDealSort('percent')} className="sortable text-right">
                      % of Lender UPB <SortIndicator field="percent" />
                    </th>
                    <th onClick={() => handleDealSort('date')} className="sortable text-right">
                      Complaint Date <SortIndicator field="date" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lenderDeals.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="empty-state">
                        No deals found for this lender.
                      </td>
                    </tr>
                  ) : (
                    lenderDeals.map((deal, idx) => (
                      <tr key={`${deal.propertyAddress}-${idx}`}>
                        <td>{deal.propertyAddress}</td>
                        <td>{deal.county}</td>
                        <td className="text-right currency-cell">{formatCurrency(deal.upb)}</td>
                        <td className="text-right">
                          {lenderTotalUPB > 0
                            ? `${Math.round((deal.upb / lenderTotalUPB) * 100)}%`
                            : '0%'}
                        </td>
                        <td className="text-right">{formatDate(deal.complaintDate)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
