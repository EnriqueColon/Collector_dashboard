// Current Month Table Component

import { CurrentMonthStats } from '../types';
import { formatCurrency } from '../utils/calculations';

interface CurrentMonthTableProps {
  data: CurrentMonthStats;
}

export function CurrentMonthTable({ data }: CurrentMonthTableProps) {
  return (
    <div className="table-container">
      <h2>Current Month Statistics</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th>Metric</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Total Complaints Received</td>
            <td>{data.totalComplaints.toLocaleString()}</td>
          </tr>
          <tr>
            <td>Total Complaints Meeting Criteria</td>
            <td>{data.totalMeetsCriteria.toLocaleString()}</td>
          </tr>
          <tr>
            <td>Total UPB (Meeting Criteria)</td>
            <td>{formatCurrency(data.totalUPBMeetsCriteria)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

