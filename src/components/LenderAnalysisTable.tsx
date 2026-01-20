// Lender Analysis Table Component

import { LenderAnalysis } from '../types';
import { formatCurrency } from '../utils/calculations';

interface LenderAnalysisTableProps {
  data: LenderAnalysis[];
}

export function LenderAnalysisTable({ data }: LenderAnalysisTableProps) {
  if (data.length === 0) {
    return <div className="empty-state">No lender data available</div>;
  }

  return (
    <div className="table-container">
      <h2>Lender Analysis (Criteria Only)</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th>Lender / Plaintiff</th>
            <th>YTD Complaints</th>
            <th>YTD UPB</th>
            <th>Current Month Complaints</th>
            <th>Current Month UPB</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={index}>
              <td>{row.lender}</td>
              <td>{row.ytdComplaints.toLocaleString()}</td>
              <td>{formatCurrency(row.ytdUPB)}</td>
              <td>{row.currentMonthComplaints.toLocaleString()}</td>
              <td>{formatCurrency(row.currentMonthUPB)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

