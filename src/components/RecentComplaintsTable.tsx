// Most Recent Complaints Table Component

import { RecentComplaint } from '../types';
import { formatCurrency, formatDate } from '../utils/calculations';

interface RecentComplaintsTableProps {
  data: RecentComplaint[];
}

export function RecentComplaintsTable({ data }: RecentComplaintsTableProps) {
  if (data.length === 0) {
    return <div className="empty-state">No recent complaints found (last 15 days)</div>;
  }

  return (
    <div className="table-container">
      <h2>Most Recent Complaints (Last 15 Days, Criteria Only)</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th>Property Address</th>
            <th>County</th>
            <th>Lender / Plaintiff</th>
            <th>Total UPB</th>
            <th>Complaint Date</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={index}>
              <td>{row.propertyAddress}</td>
              <td>{row.county}</td>
              <td>{row.lender}</td>
              <td>{formatCurrency(row.upb)}</td>
              <td>{formatDate(row.complaintDate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

