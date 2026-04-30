import { useMemo } from 'react';
import { FourWeekRollUpWeekly } from '../types';
import { formatCurrency } from '../utils/calculations';

interface CountyHeatmapProps {
  data: FourWeekRollUpWeekly[];
}

export function CountyHeatmap({ data }: CountyHeatmapProps) {
  const sorted = useMemo(() =>
    [...data]
      .filter(d => d.totalMeetsCriteria > 0)
      .sort((a, b) => b.totalUPBMeetsCriteria - a.totalUPBMeetsCriteria)
      .slice(0, 12),
    [data]
  );

  if (sorted.length === 0) {
    return (
      <div className="dashboard-card">
        <div className="card-header"><h2>County Activity — 4-Week (Criteria)</h2></div>
        <div className="empty-state">No county activity in the last 4 weeks</div>
      </div>
    );
  }

  const maxUPB = sorted[0].totalUPBMeetsCriteria;

  return (
    <div className="dashboard-card">
      <div className="card-header">
        <h2>County Activity — 4-Week (Criteria)</h2>
        <span className="summary-badge">{sorted.length} active counties</span>
      </div>
      <div className="county-heatmap">
        {sorted.map((row, idx) => {
          const pct = maxUPB > 0 ? (row.totalUPBMeetsCriteria / maxUPB) * 100 : 0;
          const alpha = 0.15 + (pct / 100) * 0.75;
          const rank = idx + 1;
          return (
            <div key={row.county} className="heatmap-row">
              <div className="heatmap-rank" style={{
                backgroundColor: rank <= 3 ? 'var(--primary-color)' : 'var(--border-color)',
                color: rank <= 3 ? '#fff' : 'var(--text-secondary)',
              }}>
                {rank}
              </div>
              <div className="heatmap-name">{row.county}</div>
              <div className="heatmap-bar-wrap">
                <div
                  className="heatmap-bar"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: `rgba(37, 99, 235, ${alpha})`,
                    border: `1px solid rgba(37, 99, 235, ${Math.min(1, alpha + 0.15)})`,
                  }}
                />
              </div>
              <div className="heatmap-stats">
                <span className="heatmap-count">{row.totalMeetsCriteria} deals</span>
                <span className="heatmap-upb">{formatCurrency(row.totalUPBMeetsCriteria)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
