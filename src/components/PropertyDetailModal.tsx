import { useEffect, useState } from 'react';
import { FlowThroughDeal } from '../types';
import { formatCurrency, formatDate } from '../utils/calculations';

interface Props {
  deal: FlowThroughDeal;
  onClose: () => void;
}

interface GeoResult { lat: number | null; lon: number | null; }

// Split a multi-value cell on semicolons, trim whitespace/newlines from each part
function splitCell(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(';').map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

// Parse a currency string like "$467,022.00" → number, or null if zero/unparseable
function parseVal(raw: string | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[$,]/g, '').trim();
  const n = parseFloat(cleaned);
  return isNaN(n) || n === 0 ? null : n;
}

// Format a decimal LTV ratio like 0.815 → "81.5%", or null if unavailable
function formatLTV(raw: number | string | undefined): string | null {
  if (raw === undefined || raw === null || raw === '-' || raw === '') return null;
  const n = typeof raw === 'number' ? raw : parseFloat(raw as string);
  return isNaN(n) ? null : `${(n * 100).toFixed(1)}%`;
}

function ltvRiskClass(raw: number | string | undefined): string {
  if (raw === undefined || raw === null || raw === '-' || raw === '') return '';
  const n = typeof raw === 'number' ? raw : parseFloat(raw as string);
  if (isNaN(n)) return '';
  if (n > 1)   return 'ltv-high';
  if (n > 0.8) return 'ltv-mid';
  return 'ltv-low';
}

interface PropertyValuationProps {
  medianSqFt: string | undefined;
  meanSqFt: string | undefined;
  medianLot: string | undefined;
  meanLot: string | undefined;
  ltvMedianSqFt: number | string | undefined;
  ltvMeanSqFt: number | string | undefined;
  ltvMedianLot: number | string | undefined;
  ltvMeanLot: number | string | undefined;
  upb: number;
}

function PropertyValuation({
  medianSqFt, meanSqFt, medianLot, meanLot,
  ltvMedianSqFt, ltvMeanSqFt, ltvMedianLot, ltvMeanLot,
  upb,
}: PropertyValuationProps) {
  const rows: { label: string; raw: string | undefined; ltv: number | string | undefined }[] = [
    { label: 'Median ($/sq ft)',  raw: medianSqFt, ltv: ltvMedianSqFt },
    { label: 'Mean ($/sq ft)',    raw: meanSqFt,   ltv: ltvMeanSqFt   },
    { label: 'Median (lot size)', raw: medianLot,  ltv: ltvMedianLot  },
    { label: 'Mean (lot size)',   raw: meanLot,    ltv: ltvMeanLot    },
  ];

  const hasAny = rows.some(r => parseVal(r.raw) !== null);

  if (!hasAny) {
    // Show a reason if available (e.g. "Not processed", "sq. footage not found")
    const reason = [medianSqFt, meanSqFt].find(v => v && v !== '$0.00');
    return (
      <div className="val-no-data">
        {reason ? reason : 'No valuation data available'}
      </div>
    );
  }

  return (
    <div className="prop-valuation-rows">
      {rows.map(({ label, raw, ltv }) => {
        const amount = parseVal(raw);
        if (amount === null) return null;
        const ltvStr = formatLTV(ltv);
        const riskClass = ltvRiskClass(ltv);
        return (
          <div key={label} className="val-row">
            <div className="val-label">{label}</div>
            <div className="val-amount">{formatCurrency(amount)}</div>
            <div className="val-vs-upb">
              {amount > upb
                ? <span className="val-tag val-tag-green">▲ {formatCurrency(amount - upb)} above UPB</span>
                : <span className="val-tag val-tag-red">▼ {formatCurrency(upb - amount)} below UPB</span>
              }
            </div>
            <div className={`val-ltv ${riskClass}`}>
              {ltvStr ?? '—'}
            </div>
          </div>
        );
      })}
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

  // Split all multi-value cells into per-property arrays
  const addresses    = splitCell(deal.propertyAddress);
  const medianSqFts  = splitCell(deal.valuationMedianSqFt);
  const meanSqFts    = splitCell(deal.valuationMeanSqFt);
  const medianLots   = splitCell(deal.valuationMedianLot);
  const meanLots     = splitCell(deal.valuationMeanLot);
  const ltvMedSqFts  = splitCell(typeof deal.ltvMedianSqFt === 'number' ? String(deal.ltvMedianSqFt) : deal.ltvMedianSqFt);
  const ltvMeanSqFts = splitCell(typeof deal.ltvMeanSqFt  === 'number' ? String(deal.ltvMeanSqFt)  : deal.ltvMeanSqFt);
  const ltvMedLots   = splitCell(typeof deal.ltvMedianLot === 'number' ? String(deal.ltvMedianLot) : deal.ltvMedianLot);
  const ltvMeanLots  = splitCell(typeof deal.ltvMeanLot   === 'number' ? String(deal.ltvMeanLot)   : deal.ltvMeanLot);

  const propertyCount = Math.max(addresses.length, 1);
  const isMulti = propertyCount > 1;

  // Check if any valuation data exists across all properties
  const hasValuation = [...medianSqFts, ...meanSqFts].some(v => parseVal(v) !== null);

  return (
    <div className="prop-modal-overlay" onClick={onClose}>
      <div className="prop-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="prop-modal-header">
          <div>
            <h2 className="prop-modal-address">
              {isMulti ? `${propertyCount} Properties` : deal.propertyAddress}
            </h2>
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

            {/* Address list for multi-property */}
            {isMulti && (
              <div className="prop-address-list">
                <div className="prop-address-list-label">Properties in this filing</div>
                {addresses.map((addr, i) => (
                  <div key={i} className="prop-address-list-item">
                    <span className="prop-address-num">{i + 1}</span>
                    {addr}
                  </div>
                ))}
              </div>
            )}
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
        {(hasValuation || medianSqFts.length > 0) && (
          <div className="prop-valuation-section">
            <div className="prop-valuation-title">Property Valuation Estimates</div>
            <div className="prop-valuation-subtitle">
              Automated comparables &bull; vs. UPB of {formatCurrency(deal.upb)}
            </div>

            {isMulti ? (
              // One block per property
              Array.from({ length: propertyCount }).map((_, i) => (
                <div key={i} className="prop-valuation-property-block">
                  <div className="prop-valuation-property-label">
                    <span className="prop-address-num">{i + 1}</span>
                    {addresses[i] ?? `Property ${i + 1}`}
                  </div>
                  <PropertyValuation
                    medianSqFt={medianSqFts[i]}
                    meanSqFt={meanSqFts[i]}
                    medianLot={medianLots[i]}
                    meanLot={meanLots[i]}
                    ltvMedianSqFt={ltvMedSqFts[i]}
                    ltvMeanSqFt={ltvMeanSqFts[i]}
                    ltvMedianLot={ltvMedLots[i]}
                    ltvMeanLot={ltvMeanLots[i]}
                    upb={deal.upb}
                  />
                </div>
              ))
            ) : (
              <PropertyValuation
                medianSqFt={medianSqFts[0]}
                meanSqFt={meanSqFts[0]}
                medianLot={medianLots[0]}
                meanLot={meanLots[0]}
                ltvMedianSqFt={ltvMedSqFts[0]}
                ltvMeanSqFt={ltvMeanSqFts[0]}
                ltvMedianLot={ltvMedLots[0]}
                ltvMeanLot={ltvMeanLots[0]}
                upb={deal.upb}
              />
            )}
          </div>
        )}

      </div>
    </div>
  );
}
