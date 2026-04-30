import { useEffect, useState } from 'react';
import { FlowThroughDeal } from '../types';
import { formatCurrency, formatDate } from '../utils/calculations';

interface Props {
  deal: FlowThroughDeal;
  onClose: () => void;
}

interface GeoResult { lat: number | null; lon: number | null; }

function parseVal(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = parseFloat(raw.replace(/[$,]/g, ''));
  return isNaN(n) || n === 0 ? null : n;
}

function formatLTV(raw: number | string | undefined): string | null {
  if (raw === undefined || raw === null || raw === '-' || raw === '') return null;
  const n = typeof raw === 'number' ? raw : parseFloat(raw as string);
  return isNaN(n) ? null : `${(n * 100).toFixed(1)}%`;
}

function ltvRiskClass(raw: number | string | undefined): string {
  if (raw === undefined || raw === null || raw === '-' || raw === '') return '';
  const n = typeof raw === 'number' ? raw : parseFloat(raw as string);
  if (isNaN(n)) return '';
  if (n > 1) return 'ltv-high';
  if (n > 0.8) return 'ltv-mid';
  return 'ltv-low';
}

interface ValuationRowProps {
  label: string;
  value: string | undefined;
  ltv: number | string | undefined;
  upb: number;
}

function ValuationRow({ label, value, ltv, upb }: ValuationRowProps) {
  const amount = parseVal(value);
  const ltvStr = formatLTV(ltv);
  const riskClass = ltvRiskClass(ltv);

  if (amount === null) return null;

  return (
    <div className="val-row">
      <div className="val-label">{label}</div>
      <div className="val-amount">{formatCurrency(amount)}</div>
      <div className="val-vs-upb">
        {amount > upb
          ? <span className="val-tag val-tag-green">▲ {formatCurrency(amount - upb)} above UPB</span>
          : <span className="val-tag val-tag-red">▼ {formatCurrency(upb - amount)} below UPB</span>
        }
      </div>
      <div className={`val-ltv ${riskClass}`}>
        {ltvStr ? `LTV ${ltvStr}` : '—'}
      </div>
    </div>
  );
}

export function PropertyDetailModal({ deal, onClose }: Props) {
  const [geo, setGeo] = useState<GeoResult | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    fetch(`/api/geocode?address=${encodeURIComponent(deal.propertyAddress + ', NY')}`)
      .then(r => r.json())
      .then(setGeo)
      .catch(() => setGeo({ lat: null, lon: null }));
  }, [deal.propertyAddress]);

  const mapUrl = geo?.lat && geo?.lon
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${geo.lon - 0.008},${geo.lat - 0.008},${geo.lon + 0.008},${geo.lat + 0.008}&layer=mapnik&marker=${geo.lat},${geo.lon}`
    : null;

  const hasValuation = parseVal(deal.valuationMedianSqFt) !== null || parseVal(deal.valuationMeanSqFt) !== null;

  return (
    <div className="prop-modal-overlay" onClick={onClose}>
      <div className="prop-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="prop-modal-header">
          <div>
            <h2 className="prop-modal-address">{deal.propertyAddress}</h2>
            <div className="prop-modal-meta">
              {deal.county} County &bull; {deal.lender} &bull; Filed {formatDate(deal.complaintDate)}
            </div>
          </div>
          <button className="prop-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="prop-modal-body">
          {/* Left column */}
          <div className="prop-modal-left">
            <div className="prop-detail-grid">
              <div className="prop-detail-item">
                <div className="prop-detail-label">Unpaid Principal Balance</div>
                <div className="prop-detail-value upb-highlight">{formatCurrency(deal.upb)}</div>
              </div>
              <div className="prop-detail-item">
                <div className="prop-detail-label">Status</div>
                <div className="prop-detail-value">
                  <span className="prop-criteria-badge">✓ Meets Criteria</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right column — map */}
          <div className="prop-modal-right">
            {mapUrl ? (
              <iframe
                src={mapUrl}
                className="prop-map-iframe"
                title="Property location"
                loading="lazy"
              />
            ) : (
              <div className="prop-map-placeholder">
                {geo === null ? 'Loading map…' : 'Map unavailable for this address'}
              </div>
            )}
          </div>
        </div>

        {/* Valuation section */}
        {hasValuation && (
          <div className="prop-valuation-section">
            <div className="prop-valuation-title">Property Valuation Estimates</div>
            <div className="prop-valuation-subtitle">Automated comparables · vs. UPB of {formatCurrency(deal.upb)}</div>
            <div className="prop-valuation-rows">
              <ValuationRow
                label="Median ($/sq ft)"
                value={deal.valuationMedianSqFt}
                ltv={deal.ltvMedianSqFt}
                upb={deal.upb}
              />
              <ValuationRow
                label="Mean ($/sq ft)"
                value={deal.valuationMeanSqFt}
                ltv={deal.ltvMeanSqFt}
                upb={deal.upb}
              />
              <ValuationRow
                label="Median (lot size)"
                value={deal.valuationMedianLot}
                ltv={deal.ltvMedianLot}
                upb={deal.upb}
              />
              <ValuationRow
                label="Mean (lot size)"
                value={deal.valuationMeanLot}
                ltv={deal.ltvMeanLot}
                upb={deal.upb}
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
