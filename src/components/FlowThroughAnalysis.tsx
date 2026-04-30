import { useState, useMemo } from 'react';
import { FlowThroughDeal } from '../types';
import { formatCurrency, formatDate } from '../utils/calculations';
import { PropertyDetailModal } from './PropertyDetailModal';

interface FlowThroughAnalysisProps {
  ytdData: FlowThroughDeal[];
  lastWeekData: FlowThroughDeal[];
}

type SortField = 'propertyAddress' | 'county' | 'lender' | 'upb' | 'complaintDate' | 'emailSent';

function upbClass(upb: number) {
  if (upb >= 750000) return 'upb-high';
  if (upb >= 500000) return 'upb-mid';
  return '';
}

function FlowThroughTable({
  title,
  data,
  exportFileName,
  onAddressClick,
}: {
  title: string;
  data: FlowThroughDeal[];
  exportFileName: string;
  onAddressClick: (deal: FlowThroughDeal) => void;
}) {
  const [sortField, setSortField] = useState<SortField>('complaintDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      let av: number | string, bv: number | string;
      switch (sortField) {
        case 'propertyAddress': av = a.propertyAddress; bv = b.propertyAddress; break;
        case 'county':          av = a.county;          bv = b.county;          break;
        case 'lender':          av = a.lender;          bv = b.lender;          break;
        case 'upb':             av = a.upb;             bv = b.upb;             break;
        case 'complaintDate':   av = a.complaintDate.getTime(); bv = b.complaintDate.getTime(); break;
        case 'emailSent':       av = a.emailSent || ''; bv = b.emailSent || ''; break;
        default: return 0;
      }
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [data, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir(field === 'complaintDate' ? 'desc' : 'asc'); }
  };

  const SortIcon = ({ field }: { field: SortField }) => (
    <span className="sort-icon">{sortField !== field ? '↕' : sortDir === 'asc' ? '↑' : '↓'}</span>
  );

  const exportToCSV = () => {
    const headers = ['Property Address', 'County', 'Lender', 'UPB', 'Complaint Date', 'Email Sent', 'Attorney Name', 'Attorney Email'];
    const rows = sorted.map(r => [r.propertyAddress, r.county, r.lender, r.upb.toString(), formatDate(r.complaintDate), r.emailSent || '', r.plaintiffAttorneyName || '', r.plaintiffAttorneyEmail || '']);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
      download: `${exportFileName}-${new Date().toISOString().split('T')[0]}.csv`,
    });
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const { totalDeals, totalUPB } = useMemo(() => ({
    totalDeals: data.length,
    totalUPB: data.reduce((s, r) => s + r.upb, 0),
  }), [data]);

  return (
    <div className="flow-through-table">
      <div className="card-header">
        <h3>{title}</h3>
        <div className="header-actions">
          <span className="summary-badge">{totalDeals} deals &bull; {formatCurrency(totalUPB)}</span>
          <button onClick={exportToCSV} className="export-button">Export CSV</button>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="empty-state-box">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-text">No deals found for this period</div>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('propertyAddress')} className="sortable">
                  Property Address <SortIcon field="propertyAddress" />
                </th>
                <th onClick={() => handleSort('county')} className="sortable">County <SortIcon field="county" /></th>
                <th onClick={() => handleSort('lender')} className="sortable">Lender <SortIcon field="lender" /></th>
                <th onClick={() => handleSort('upb')} className="sortable text-right">UPB <SortIcon field="upb" /></th>
                <th onClick={() => handleSort('complaintDate')} className="sortable text-right">Date <SortIcon field="complaintDate" /></th>
                <th onClick={() => handleSort('emailSent')} className="sortable text-center">Email Sent <SortIcon field="emailSent" /></th>
                <th>Sent To</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, idx) => (
                <tr key={idx}>
                  <td>
                    <button className="address-link" onClick={() => onAddressClick(row)}>
                      {row.propertyAddress}
                    </button>
                  </td>
                  <td>{row.county}</td>
                  <td>{row.lender}</td>
                  <td className={`text-right currency-cell ${upbClass(row.upb)}`}>{formatCurrency(row.upb)}</td>
                  <td className="text-right">{formatDate(row.complaintDate)}</td>
                  <td className="text-center">
                    {row.emailSent
                      ? <span className={`email-sent-badge ${row.emailSent.toLowerCase().includes('success') || row.emailSent.toLowerCase().includes('yes') || row.emailSent === 'TRUE' ? 'email-sent-yes' : 'email-sent-no'}`}>
                          {row.emailSent}
                        </span>
                      : <span className="email-sent-badge email-sent-no">No</span>
                    }
                  </td>
                  <td className="sent-to-cell">
                    {row.plaintiffAttorneyName && <div className="attorney-name">{row.plaintiffAttorneyName}</div>}
                    {row.plaintiffAttorneyEmail && <div className="attorney-email">{row.plaintiffAttorneyEmail}</div>}
                    {!row.plaintiffAttorneyName && !row.plaintiffAttorneyEmail && <span className="text-muted">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function FlowThroughAnalysis({ ytdData, lastWeekData }: FlowThroughAnalysisProps) {
  const [selectedDeal, setSelectedDeal] = useState<FlowThroughDeal | null>(null);

  return (
    <>
      <div className="dashboard-card">
        <div className="card-header"><h2>Deals Meeting Criteria</h2></div>
        <div className="flow-through-container">
          <FlowThroughTable
            title="Year-to-Date: All Deals Meeting Criteria"
            data={ytdData}
            exportFileName="flow-through-ytd"
            onAddressClick={setSelectedDeal}
          />
          <FlowThroughTable
            title="Last 7 Days: Deals Meeting Criteria"
            data={lastWeekData}
            exportFileName="flow-through-last-week"
            onAddressClick={setSelectedDeal}
          />
        </div>
      </div>

      {selectedDeal && (
        <PropertyDetailModal
          deal={selectedDeal}
          onClose={() => setSelectedDeal(null)}
        />
      )}
    </>
  );
}
