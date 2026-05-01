import { useMemo, useState } from 'react';
import { ProcessedComplaint } from '../types';
import { formatCurrency, formatDate, meetsCriteria } from '../utils/calculations';
import { startOfMonth, startOfYear, subDays, subMonths } from 'date-fns';

interface KPISummaryCardsProps {
  complaints: ProcessedComplaint[];
}

interface CardProps {
  label: string;
  value: string;
  subLabel: string;
  trend?: number;
  trendLabel?: string;
  accent: 'blue' | 'green' | 'amber';
  selected: boolean;
  onClick: () => void;
}

type DealSortField = 'property' | 'county' | 'lender' | 'upb' | 'date';

function upbClass(upb: number) {
  if (upb >= 750000) return 'upb-high';
  if (upb >= 500000) return 'upb-mid';
  return '';
}

function KPICard({ label, value, subLabel, trend, trendLabel, accent, selected, onClick }: CardProps) {
  const accentColor = accent === 'blue'
    ? 'var(--primary-color)'
    : accent === 'green'
    ? 'var(--success-color)'
    : 'var(--warning-color)';

  return (
    <div className={`kpi-card kpi-card-clickable${selected ? ' kpi-card-selected' : ''}`} onClick={onClick}>
      <div className="kpi-accent-bar" style={{ backgroundColor: accentColor }} />
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-sublabel">{subLabel}</div>
      {trend !== undefined && (
        <div className={`kpi-trend ${trend >= 0 ? 'kpi-trend-up' : 'kpi-trend-down'}`}>
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
          {trendLabel && <span className="kpi-trend-context"> {trendLabel}</span>}
        </div>
      )}
      <div className="kpi-click-hint">Click to view details →</div>
    </div>
  );
}

function PageCountCard({ ytd, priorMonth, mtd, priorMonthName }: {
  ytd: number; priorMonth: number; mtd: number; priorMonthName: string;
}) {
  return (
    <div className="kpi-card kpi-page-count-card">
      <div className="kpi-accent-bar" style={{ backgroundColor: 'var(--primary-color)' }} />
      <div className="kpi-label">Pages Processed</div>
      <div className="kpi-page-stats">
        <div className="kpi-page-stat">
          <div className="kpi-page-stat-value">{ytd.toLocaleString()}</div>
          <div className="kpi-page-stat-label">YTD</div>
        </div>
        <div className="kpi-page-stat-divider" />
        <div className="kpi-page-stat">
          <div className="kpi-page-stat-value">{priorMonth.toLocaleString()}</div>
          <div className="kpi-page-stat-label">{priorMonthName}</div>
        </div>
        <div className="kpi-page-stat-divider" />
        <div className="kpi-page-stat">
          <div className="kpi-page-stat-value">{mtd.toLocaleString()}</div>
          <div className="kpi-page-stat-label">MTD</div>
        </div>
      </div>
      <div className="kpi-sublabel">All filings regardless of criteria</div>
    </div>
  );
}

export function KPISummaryCards({ complaints }: KPISummaryCardsProps) {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [dealSortField, setDealSortField] = useState<DealSortField>('upb');
  const [dealSortDir, setDealSortDir] = useState<'asc' | 'desc'>('desc');

  const { metrics, cardDeals } = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const yearStart = startOfYear(now);
    const thisWeekStart = subDays(now, 7);
    const lastWeekStart = subDays(now, 14);
    const priorMonthStart = startOfMonth(subMonths(now, 1));

    // Page counts use ALL rows (billed per page regardless of validity)
    const pages = (from: Date, to?: Date) =>
      complaints.reduce((sum, c) => {
        if (!c.complaintDate) return sum;
        const d = c.complaintDate instanceof Date ? c.complaintDate : new Date(c.complaintDate);
        if (d < from || (to && d >= to)) return sum;
        return sum + (typeof c.pageCount === 'number' && !isNaN(c.pageCount) ? c.pageCount : 0);
      }, 0);

    const valid = complaints.filter(c => c.isValid && !c.isDuplicate);

    const inRange = (c: ProcessedComplaint, from: Date, to?: Date) => {
      if (!c.complaintDate) return false;
      const d = c.complaintDate instanceof Date ? c.complaintDate : new Date(c.complaintDate);
      return d >= from && (!to || d < to);
    };

    const mtdAll = valid.filter(c => inRange(c, monthStart));
    const mtdCriteria = mtdAll.filter(meetsCriteria);
    const mtdUPB = mtdCriteria.reduce((s, c) => s + (typeof c.upb === 'number' && !isNaN(c.upb) ? c.upb : 0), 0);

    const ytdCriteria = valid.filter(c => inRange(c, yearStart) && meetsCriteria(c));
    const thisWeekDeals = valid.filter(c => inRange(c, thisWeekStart) && meetsCriteria(c));
    const lastWeekDeals = valid.filter(c => inRange(c, lastWeekStart, thisWeekStart) && meetsCriteria(c));

    const wow = lastWeekDeals.length === 0
      ? (thisWeekDeals.length > 0 ? 100 : 0)
      : Math.round(((thisWeekDeals.length - lastWeekDeals.length) / lastWeekDeals.length) * 100);

    const pageMetrics = {
      ytd:        pages(yearStart),
      priorMonth: pages(priorMonthStart, monthStart),
      mtd:        pages(monthStart),
    };

    return {
      metrics: { mtdAll: mtdAll.length, mtdCriteria: mtdCriteria.length, mtdUPB, ytdCriteria: ytdCriteria.length, thisWeek: thisWeekDeals.length, wow, pageMetrics },
      cardDeals: { mtdAll, mtdCriteria, ytdCriteria, thisWeek: thisWeekDeals },
    };
  }, [complaints]);

  const selectedDeals = useMemo(() => {
    if (!selectedCard) return [];
    const raw = cardDeals[selectedCard as keyof typeof cardDeals] ?? [];
    const mapped = raw.map(c => ({
      propertyAddress: c.propertyAddress || 'Unknown',
      county: c.normalizedCounty || c.county || 'Unknown',
      lender: c.normalizedLender || c.lender || c.plaintiff || 'Unknown',
      upb: typeof c.upb === 'number' && !isNaN(c.upb) ? c.upb : 0,
      complaintDate: c.complaintDate,
    }));
    return [...mapped].sort((a, b) => {
      if (dealSortField === 'property') return dealSortDir === 'asc' ? a.propertyAddress.localeCompare(b.propertyAddress) : b.propertyAddress.localeCompare(a.propertyAddress);
      if (dealSortField === 'county')   return dealSortDir === 'asc' ? a.county.localeCompare(b.county) : b.county.localeCompare(a.county);
      if (dealSortField === 'lender')   return dealSortDir === 'asc' ? a.lender.localeCompare(b.lender) : b.lender.localeCompare(a.lender);
      if (dealSortField === 'date') {
        const aT = a.complaintDate ? new Date(a.complaintDate).getTime() : 0;
        const bT = b.complaintDate ? new Date(b.complaintDate).getTime() : 0;
        return dealSortDir === 'asc' ? aT - bT : bT - aT;
      }
      return dealSortDir === 'asc' ? a.upb - b.upb : b.upb - a.upb;
    });
  }, [selectedCard, cardDeals, dealSortField, dealSortDir]);

  const handleDealSort = (field: DealSortField) => {
    if (dealSortField === field) setDealSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setDealSortField(field); setDealSortDir(field === 'upb' || field === 'date' ? 'desc' : 'asc'); }
  };

  const SortIcon = ({ field }: { field: DealSortField }) => (
    <span className="sort-icon">{dealSortField !== field ? '↕' : dealSortDir === 'asc' ? '↑' : '↓'}</span>
  );

  const totalUPB = useMemo(() => selectedDeals.reduce((s, d) => s + d.upb, 0), [selectedDeals]);

  const cardLabels: Record<string, string> = {
    mtdAll: `${new Date().toLocaleString('en-US', { month: 'long' })} — All Complaints`,
    mtdCriteria: `${new Date().toLocaleString('en-US', { month: 'long' })} — Criteria Deals`,
    ytdCriteria: `${new Date().getFullYear()} YTD — Criteria Deals`,
    thisWeek: 'This Week — Criteria Deals',
  };

  const month = new Date().toLocaleString('en-US', { month: 'long' });
  const year = new Date().getFullYear();
  const priorMonthName = subMonths(new Date(), 1).toLocaleString('en-US', { month: 'short' });

  const toggle = (key: string) => setSelectedCard(prev => prev === key ? null : key);

  return (
    <>
      <div className="kpi-grid">
        <KPICard
          label={`${month} Complaints`}
          value={metrics.mtdAll.toLocaleString()}
          subLabel="All valid filings this month"
          accent="blue"
          selected={selectedCard === 'mtdAll'}
          onClick={() => toggle('mtdAll')}
        />
        <KPICard
          label={`${month} Criteria Deals`}
          value={metrics.mtdCriteria.toLocaleString()}
          subLabel="Meets criteria this month"
          accent="green"
          selected={selectedCard === 'mtdCriteria'}
          onClick={() => toggle('mtdCriteria')}
        />
        <KPICard
          label={`${month} Criteria UPB`}
          value={formatCurrency(metrics.mtdUPB)}
          subLabel="UPB meeting criteria MTD"
          accent="blue"
          selected={selectedCard === 'mtdCriteria'}
          onClick={() => toggle('mtdCriteria')}
        />
        <KPICard
          label={`${year} YTD Criteria`}
          value={metrics.ytdCriteria.toLocaleString()}
          subLabel="Total deals meeting criteria YTD"
          accent="green"
          selected={selectedCard === 'ytdCriteria'}
          onClick={() => toggle('ytdCriteria')}
        />
        <KPICard
          label="This Week"
          value={metrics.thisWeek.toLocaleString()}
          subLabel="Criteria deals, last 7 days"
          trend={metrics.wow}
          trendLabel="vs prior week"
          accent={metrics.wow >= 0 ? 'green' : 'amber'}
          selected={selectedCard === 'thisWeek'}
          onClick={() => toggle('thisWeek')}
        />
        <PageCountCard
          ytd={metrics.pageMetrics.ytd}
          priorMonth={metrics.pageMetrics.priorMonth}
          mtd={metrics.pageMetrics.mtd}
          priorMonthName={priorMonthName}
        />
      </div>

      {selectedCard && (
        <>
          <div className="side-panel-overlay" onClick={() => setSelectedCard(null)} />
          <div className="side-panel">
            <div className="side-panel-header">
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                  {cardLabels[selectedCard]}
                </h3>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {selectedDeals.length} filing{selectedDeals.length !== 1 ? 's' : ''}
                  {totalUPB > 0 && <> &bull; {formatCurrency(totalUPB)} total UPB</>}
                </div>
              </div>
              <button className="side-panel-close" onClick={() => setSelectedCard(null)}>✕ Close</button>
            </div>
            <div className="side-panel-body">
              {selectedDeals.length === 0 ? (
                <div className="empty-state">No filings found.</div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th onClick={() => handleDealSort('property')} className="sortable">Property Address <SortIcon field="property" /></th>
                      <th onClick={() => handleDealSort('county')} className="sortable">County <SortIcon field="county" /></th>
                      <th onClick={() => handleDealSort('lender')} className="sortable">Lender <SortIcon field="lender" /></th>
                      <th onClick={() => handleDealSort('upb')} className="sortable text-right">UPB <SortIcon field="upb" /></th>
                      <th onClick={() => handleDealSort('date')} className="sortable text-right">Date <SortIcon field="date" /></th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedDeals.map((deal, idx) => (
                      <tr key={idx}>
                        <td>{deal.propertyAddress}</td>
                        <td>{deal.county}</td>
                        <td>{deal.lender}</td>
                        <td className={`text-right currency-cell ${upbClass(deal.upb)}`}>{formatCurrency(deal.upb)}</td>
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
