// Flow-Through Analysis Component (YTD and Last Week)

import { useState, useMemo } from 'react';
import { FlowThroughDeal } from '../types';
import { formatCurrency, formatDate } from '../utils/calculations';

interface FlowThroughAnalysisProps {
  ytdData: FlowThroughDeal[];
  lastWeekData: FlowThroughDeal[];
}

type SortField = 'propertyAddress' | 'county' | 'lender' | 'upb' | 'complaintDate';
type SortDirection = 'asc' | 'desc';

function FlowThroughTable({
  title,
  data,
  exportFileName,
}: {
  title: string;
  data: FlowThroughDeal[];
  exportFileName: string;
}) {
  const [sortField, setSortField] = useState<SortField>('complaintDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const sortedData = useMemo(() => {
    const sorted = [...data].sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (sortField) {
        case 'propertyAddress':
          aValue = a.propertyAddress;
          bValue = b.propertyAddress;
          break;
        case 'county':
          aValue = a.county;
          bValue = b.county;
          break;
        case 'lender':
          aValue = a.lender;
          bValue = b.lender;
          break;
        case 'upb':
          aValue = a.upb;
          bValue = b.upb;
          break;
        case 'complaintDate':
          aValue = a.complaintDate.getTime();
          bValue = b.complaintDate.getTime();
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
      setSortDirection(field === 'complaintDate' ? 'desc' : 'asc');
    }
  };

  const exportToCSV = () => {
    const headers = ['Property Address', 'County', 'Lender', 'UPB', 'Complaint Date'];
    const rows = sortedData.map(row => [
      row.propertyAddress,
      row.county,
      row.lender,
      row.upb.toString(),
      formatDate(row.complaintDate),
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exportFileName}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="sort-icon">↕</span>;
    return <span className="sort-icon">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  const summary = useMemo(() => {
    const totalDeals = data.length;
    const totalUPB = data.reduce((sum, row) => sum + row.upb, 0);
    return { totalDeals, totalUPB };
  }, [data]);

  return (
    <div className="flow-through-table">
      <div className="card-header">
        <h3>{title}</h3>
        <div className="header-actions">
          <span className="summary-badge">
            {summary.totalDeals} deals • {formatCurrency(summary.totalUPB)}
          </span>
          <button onClick={exportToCSV} className="export-button">
            Export CSV
          </button>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="empty-state">No data available</div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('propertyAddress')} className="sortable">
                  Property Address <SortIcon field="propertyAddress" />
                </th>
                <th onClick={() => handleSort('county')} className="sortable">
                  County <SortIcon field="county" />
                </th>
                <th onClick={() => handleSort('lender')} className="sortable">
                  Lender <SortIcon field="lender" />
                </th>
                <th onClick={() => handleSort('upb')} className="sortable">
                  UPB <SortIcon field="upb" />
                </th>
                <th onClick={() => handleSort('complaintDate')} className="sortable">
                  Complaint Date <SortIcon field="complaintDate" />
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((row, idx) => (
                <tr key={idx}>
                  <td>{row.propertyAddress}</td>
                  <td>{row.county}</td>
                  <td>{row.lender}</td>
                  <td className="currency-cell">{formatCurrency(row.upb)}</td>
                  <td>{formatDate(row.complaintDate)}</td>
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
  return (
    <div className="dashboard-card">
      <div className="card-header">
        <h2>Deals Meeting Criteria</h2>
      </div>
      <div className="flow-through-container">
        <FlowThroughTable
          title="Year-to-Date (YTD): All Deals Meeting Criteria"
          data={ytdData}
          exportFileName="flow-through-ytd"
        />
        <FlowThroughTable
          title="Last Week: Deals Meeting Criteria (Last 7 Days)"
          data={lastWeekData}
          exportFileName="flow-through-last-week"
        />
      </div>
    </div>
  );
}
