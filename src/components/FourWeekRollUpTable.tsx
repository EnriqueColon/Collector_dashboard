// Four-Week Roll-Up Table Component

import { FourWeekRollUp } from '../types';
import { formatCurrency } from '../utils/calculations';

interface FourWeekRollUpTableProps {
  data: FourWeekRollUp[];
}

export function FourWeekRollUpTable({ data }: FourWeekRollUpTableProps) {
  if (data.length === 0) {
    return <div className="empty-state">No data available for the four-week period</div>;
  }

  return (
    <div className="table-container">
      <h2>Four-Week Roll-Up by County</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th>County</th>
            <th>Total Complaints</th>
            <th>Total UPB (All)</th>
            <th>Complaints Meeting Criteria</th>
            <th>UPB Meeting Criteria</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={index}>
              <td>{row.county}</td>
              <td>{row.totalComplaints.toLocaleString()}</td>
              <td>{formatCurrency(row.totalUPB)}</td>
              <td>{row.totalMeetsCriteria.toLocaleString()}</td>
              <td>{formatCurrency(row.totalUPBMeetsCriteria)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

