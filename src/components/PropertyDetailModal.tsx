import { useEffect, useState } from 'react';
import { FlowThroughDeal } from '../types';
import { formatCurrency, formatDate } from '../utils/calculations';

interface Props {
  deal: FlowThroughDeal;
  onClose: () => void;
}

interface GeoResult { lat: number | null; lon: number | null; }

function splitCell(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(';').map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

function parseVal(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = parseFloat(raw.replace(/[$,]/g, '').trim());
  return isNaN(n) || n === 0 ? null : n;
}

function ltvRiskClass(ratio: number): string {
  if (ratio > 1)   return 'ltv-high';
  if (ratio > 0.8) return 'ltv-mid';
  return 'ltv-low';
}

// ── Single-property valuation rows (accurate UPB comparison + LTV) ──────────
interface SingleValuationProps {
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

function SingleValuation({
  medianSqFt, meanSqFt, medianLot, meanLot,
  ltvMedianSqFt, ltvMeanSqFt, ltvMedianLot, ltvMeanLot,
  upb,
}: SingleValuationProps) {
  const rows = [
    { label: 'Median ($/sq ft)',  raw: medianSqFt, sheetLtv: ltvMedianSqFt },
    { label: 'Mean ($/sq ft)',    raw: meanSqFt,   sheetLtv: ltvMeanSqFt   },
    { label: 'Median (lot size)', raw: medianLot,  sheetLtv: ltvMedianLot  },
    { label: 'Mean (lot size)',   raw: meanLot,    sheetLtv: ltvMeanLot    },
  ];

  const hasAny = rows.some(r => parseVal(r.raw) !== null);
  if (!hasAny) {
    const reason = [medianSqFt, meanSqFt].find(v => v && v !== '$0.00');
    return <div className="val-no-data">{reason ?? 'No valuation data available'}</div>;
  }

  return (
    <div className="prop-valuation-rows">
      {rows.map(({ label, raw, sheetLtv }) => {
        const amount = parseVal(raw);
        if (amount === null) return null;

        // Use sheet LTV if available, otherwise calculate
        const hasSheetLtv = sheetLtv !== undefined && sheetLtv !== null && sheetLtv !== '-' && sheetLtv !== '';
        const ratio = hasSheetLtv
          ? (typeof sheetLtv === 'number' ? sheetLtv : parseFloat(sheetLtv as string))
          : upb / amount;
        const ltvStr = `${(ratio * 100).toFixed(1)}%${hasSheetLtv ? '' : ' *'}`;
        const riskClass = ltvRiskClass(ratio);

        return (
          <div key={label} className="val-row">
            <div className="val-label">{label}</div>
            <div className="val-amount">{formatCurrency(amount)}</div>
            <div className="val-vs-upb">
              {amount >= upb
                ? <span className="val-tag val-tag-green">▲ {formatCurrency(amount - upb)} above UPB</span>
                : <span className="val-tag val-tag-red">▼ {formatCurrency(upb - amount)} below UPB</span>
              }
            </div>
            <div className={`val-ltv ${riskClass}`} title={!hasSheetLtv ? 'Calculated: UPB ÷ estimated value' : undefined}>
              {ltvStr}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Multi-property: individual property values only (no per-property UPB) ───
function MultiPropertyValuation({ label, values }: { label: string; values: (number | null)[] }) {
  const valid = values.filter((v): v is number => v !== null);
  if (valid.length === 0) return null;
  return (
    <div className="val-multi-method">
      <div className="val-multi-method-label">{label}</div>
      <div className="val-multi-method-values">
        {values.map((v, i) => (
          <div key={i} className="val-multi-prop-amount">
            <span className="prop-address-num" style={{ fontSize: '0.6rem' }}>{i + 1}</span>
            {v !== null ? formatCurrency(v) : <span className="val-no-data-inline">—</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Multi-property summary: total collateral vs total UPB ───────────────────
interface SummaryRowProps {
  label: string;
  totalValue: number | null;
  upb: number;
}

function SummaryRow({ label, totalValue, upb }: SummaryRowProps) {
  if (totalValue === null) return null;
  const ratio = upb / totalValue;
  const riskClass = ltvRiskClass(ratio);
  return (
    <div className="val-summary-row">
      <div className="val-label">{label}</div>
      <div className="val-amount">{formatCurrency(totalValue)}</div>
      <div className="val-vs-upb">
        {totalValue >= upb
          ? <span className="val-tag val-tag-green">▲ {formatCurrency(totalValue - upb)} above UPB</span>
          : <span className="val-tag val-tag-red">▼ {formatCurrency(upb - totalValue)} below UPB</span>
        }
      </div>
      <div className={`val-ltv ${riskClass}`}>{(ratio * 100).toFixed(1)}%</div>
    </div>
  );
}

// ── Main modal ───────────────────────────────────────────────────────────────
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

  const addresses   = splitCell(deal.propertyAddress);
  const medianSqFts = splitCell(deal.valuationMedianSqFt);
  const meanSqFts   = splitCell(deal.valuationMeanSqFt);
  const medianLots  = splitCell(deal.valuationMedianLot);
  const meanLots    = splitCell(deal.valuationMeanLot);
  const ltvMedSqFts  = splitCell(typeof deal.ltvMedianSqFt === 'number' ? String(deal.ltvMedianSqFt) : deal.ltvMedianSqFt);
  const ltvMeanSqFts = splitCell(typeof deal.ltvMeanSqFt  === 'number' ? String(deal.ltvMeanSqFt)  : deal.ltvMeanSqFt);
  const ltvMedLots   = splitCell(typeof deal.ltvMedianLot === 'number' ? String(deal.ltvMedianLot) : deal.ltvMedianLot);
  const ltvMeanLots  = splitCell(typeof deal.ltvMeanLot   === 'number' ? String(deal.ltvMeanLot)   : deal.ltvMeanLot);

  const propertyCount = Math.max(addresses.length, 1);
  const isMulti = propertyCount > 1;

  // Per-property parsed values (for multi summary)
  const parsedMedianSqFts = medianSqFts.map(parseVal);
  const parsedMeanSqFts   = meanSqFts.map(parseVal);
  const parsedMedianLots  = medianLots.map(parseVal);
  const parsedMeanLots    = meanLots.map(parseVal);

  const sum = (arr: (number | null)[]) => {
    const valid = arr.filter((v): v is number => v !== null);
    return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) : null;
  };

  const totalMedianSqFt = sum(parsedMedianSqFts);
  const totalMeanSqFt   = sum(parsedMeanSqFts);
  const totalMedianLot  = sum(parsedMedianLots);
  const totalMeanLot    = sum(parsedMeanLots);

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
              <iframe src={mapUrl} className="prop-map-iframe" title="Property location" loading="lazy" />
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

            {isMulti ? (
              <>
                <div className="prop-valuation-subtitle">
                  Estimated value per property &bull; Automated comparables
                </div>

                {/* Per-property values grouped by method */}
                <div className="val-multi-grid">
                  <MultiPropertyValuation label="Median ($/sq ft)"  values={parsedMedianSqFts} />
                  <MultiPropertyValuation label="Mean ($/sq ft)"    values={parsedMeanSqFts}   />
                  <MultiPropertyValuation label="Median (lot size)" values={parsedMedianLots}  />
                  <MultiPropertyValuation label="Mean (lot size)"   values={parsedMeanLots}    />
                </div>

                {/* Aggregate summary */}
                <div className="val-summary-block">
                  <div className="val-summary-title">
                    Combined Collateral vs. Total UPB ({formatCurrency(deal.upb)})
                  </div>
                  <div className="prop-valuation-rows">
                    <SummaryRow label="Total — Median ($/sq ft)"  totalValue={totalMedianSqFt} upb={deal.upb} />
                    <SummaryRow label="Total — Mean ($/sq ft)"    totalValue={totalMeanSqFt}   upb={deal.upb} />
                    <SummaryRow label="Total — Median (lot size)" totalValue={totalMedianLot}  upb={deal.upb} />
                    <SummaryRow label="Total — Mean (lot size)"   totalValue={totalMeanLot}    upb={deal.upb} />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="prop-valuation-subtitle">
                  Automated comparables &bull; vs. UPB of {formatCurrency(deal.upb)} &bull; * LTV calculated (UPB ÷ estimate)
                </div>
                <SingleValuation
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
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
