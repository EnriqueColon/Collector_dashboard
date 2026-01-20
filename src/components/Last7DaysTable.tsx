// Last 7 Days Complaints Component

import { useState, useMemo } from 'react';
import { Last7DaysComplaint } from '../types';
import { formatCurrency, formatDate } from '../utils/calculations';

interface Last7DaysTableProps {
  data: Last7DaysComplaint[];
}

type SortField = 'propertyAddress' | 'lender' | 'totalUPB' | 'complaintDate';
type SortDirection = 'asc' | 'desc';

export function Last7DaysTable({ data }: Last7DaysTableProps) {
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
        case 'lender':
          aValue = a.lender;
          bValue = b.lender;
          break;
        case 'totalUPB':
          aValue = a.totalUPB;
          bValue = b.totalUPB;
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
    const headers = ['Property Address', 'Lender', 'Total UPB', 'Complaint Date'];
    const rows = sortedData.map(row => [
      row.propertyAddress,
      row.lender,
      row.totalUPB.toString(),
      formatDate(row.complaintDate),
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `last-7-days-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="sort-icon">↕</span>;
    return <span className="sort-icon">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  const summary = useMemo(() => {
    const totalComplaints = data.length;
    const totalUPB = data.reduce((sum, row) => sum + row.totalUPB, 0);
    return { totalComplaints, totalUPB };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="dashboard-card">
        <div className="card-header">
          <h2>Loans Meeting Criteria – Last 7 Days</h2>
        </div>
        <div className="empty-state">No complaints in the last 7 days</div>
      </div>
    );
  }

  return (
    <div className="dashboard-card">
      <div className="card-header">
        <h2>Loans Meeting Criteria – Last 7 Days</h2>
        <button onClick={exportToCSV} className="export-button">
          Export CSV
        </button>
      </div>

      {/* Summary */}
      <div className="summary-box">
        <div className="summary-item">
          <span className="summary-label">Total Complaints:</span>
          <span className="summary-value">{summary.totalComplaints}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Total UPB:</span>
          <span className="summary-value">{formatCurrency(summary.totalUPB)}</span>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('propertyAddress')} className="sortable">
                Property Address <SortIcon field="propertyAddress" />
              </th>
              <th onClick={() => handleSort('lender')} className="sortable">
                Lender <SortIcon field="lender" />
              </th>
              <th onClick={() => handleSort('totalUPB')} className="sortable">
                Total UPB <SortIcon field="totalUPB" />
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
                <td>{row.lender}</td>
                <td className="currency-cell">{formatCurrency(row.totalUPB)}</td>
                <td>{formatDate(row.complaintDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
