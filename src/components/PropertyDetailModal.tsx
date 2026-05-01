import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FlowThroughDeal } from '../types';
import { formatCurrency, formatDate } from '../utils/calculations';

// ── Leaflet icon fix (bundlers strip the default asset resolution) ───────────
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const numberedIcon = (n: number, active: boolean) =>
  L.divIcon({
    className: '',
    html: `<div class="map-pin${active ? ' map-pin-active' : ''}"><span>${n}</span></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -30],
  });

// ── Fly to a position when it changes ────────────────────────────────────────
function MapFlyTo({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap();
  const prev = useRef<string>('');
  useEffect(() => {
    const key = `${lat},${lon}`;
    if (key !== prev.current) {
      prev.current = key;
      map.flyTo([lat, lon], 16, { duration: 0.6 });
    }
  }, [lat, lon, map]);
  return null;
}

// ── Fit all markers in view on first render ───────────────────────────────────
function MapFitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (fitted.current || positions.length === 0) return;
    fitted.current = true;
    if (positions.length === 1) {
      map.setView(positions[0], 15);
    } else {
      map.fitBounds(L.latLngBounds(positions), { padding: [40, 40] });
    }
  }, [positions, map]);
  return null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
interface Props { deal: FlowThroughDeal; onClose: () => void; }
interface GeoResult { lat: number | null; lon: number | null; }

function splitCell(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(';').map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

// "336/366 Main St, City" → ["336 Main St, City", "366 Main St, City"]
function expandSlashAddresses(addrs: string[]): string[] {
  const out: string[] = [];
  for (const addr of addrs) {
    const m = addr.match(/^(\d+)\/(\d+)(\s.+)/);
    if (m) {
      out.push(m[1] + m[3]);
      out.push(m[2] + m[3]);
    } else {
      out.push(addr);
    }
  }
  return out;
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

// ── Single-property valuation rows ────────────────────────────────────────────
interface SingleValuationProps {
  medianSqFt: string | undefined; meanSqFt: string | undefined;
  medianLot: string | undefined;  meanLot: string | undefined;
  ltvMedianSqFt: number | string | undefined; ltvMeanSqFt: number | string | undefined;
  ltvMedianLot: number | string | undefined;  ltvMeanLot: number | string | undefined;
  upb: number;
}

function SingleValuation({ medianSqFt, meanSqFt, medianLot, meanLot,
  ltvMedianSqFt, ltvMeanSqFt, ltvMedianLot, ltvMeanLot, upb }: SingleValuationProps) {
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
        const hasSheetLtv = sheetLtv !== undefined && sheetLtv !== null && sheetLtv !== '-' && sheetLtv !== '';
        const ratio = hasSheetLtv
          ? (typeof sheetLtv === 'number' ? sheetLtv : parseFloat(sheetLtv as string))
          : upb / amount;
        const ltvStr = `${(ratio * 100).toFixed(1)}%${hasSheetLtv ? '' : ' *'}`;
        return (
          <div key={label} className="val-row">
            <div className="val-label">{label}</div>
            <div className="val-amount">{formatCurrency(amount)}</div>
            <div className="val-vs-upb">
              {amount >= upb
                ? <span className="val-tag val-tag-green">▲ {formatCurrency(amount - upb)} above UPB</span>
                : <span className="val-tag val-tag-red">▼ {formatCurrency(upb - amount)} below UPB</span>}
            </div>
            <div className={`val-ltv ${ltvRiskClass(ratio)}`}
              title={!hasSheetLtv ? 'Calculated: UPB ÷ estimated value' : undefined}>
              {ltvStr}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Multi-property valuation ──────────────────────────────────────────────────
function MultiPropertyValuation({ label, values }: { label: string; values: (number | null)[] }) {
  if (values.filter((v): v is number => v !== null).length === 0) return null;
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

function SummaryRow({ label, totalValue, upb }: { label: string; totalValue: number | null; upb: number }) {
  if (totalValue === null) return null;
  const ratio = upb / totalValue;
  return (
    <div className="val-summary-row">
      <div className="val-label">{label}</div>
      <div className="val-amount">{formatCurrency(totalValue)}</div>
      <div className="val-vs-upb">
        {totalValue >= upb
          ? <span className="val-tag val-tag-green">▲ {formatCurrency(totalValue - upb)} above UPB</span>
          : <span className="val-tag val-tag-red">▼ {formatCurrency(upb - totalValue)} below UPB</span>}
      </div>
      <div className={`val-ltv ${ltvRiskClass(ratio)}`}>{(ratio * 100).toFixed(1)}%</div>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────
export function PropertyDetailModal({ deal, onClose }: Props) {
  const [geoResults, setGeoResults] = useState<(GeoResult | null)[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const addresses   = expandSlashAddresses(splitCell(deal.propertyAddress));
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

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Geocode each address in parallel
  useEffect(() => {
    setGeoResults([]);
    setSelectedIdx(0);
    const targets = addresses.length > 0 ? addresses : [deal.propertyAddress];
    Promise.all(
      targets.map(addr =>
        fetch(`/api/geocode?address=${encodeURIComponent(addr + ', NY')}`)
          .then(r => r.json())
          .catch(() => ({ lat: null, lon: null }))
      )
    ).then(setGeoResults);
  }, [deal.propertyAddress]); // eslint-disable-line react-hooks/exhaustive-deps

  const validPositions = geoResults
    .map((g, i) => (g?.lat && g?.lon ? { pos: [g.lat, g.lon] as [number, number], idx: i } : null))
    .filter((x): x is { pos: [number, number]; idx: number } => x !== null);

  const selectedGeo = geoResults[selectedIdx];
  const hasMap = validPositions.length > 0;
  const mapLoading = geoResults.length === 0;

  // Valuation aggregates
  const parsedMedianSqFts = medianSqFts.map(parseVal);
  const parsedMeanSqFts   = meanSqFts.map(parseVal);
  const parsedMedianLots  = medianLots.map(parseVal);
  const parsedMeanLots    = meanLots.map(parseVal);

  const sumIfComplete = (arr: (number | null)[]) => {
    if (arr.length < propertyCount || arr.some(v => v === null)) return null;
    return (arr as number[]).reduce((a, b) => a + b, 0);
  };

  const totalMedianSqFt = sumIfComplete(parsedMedianSqFts);
  const totalMeanSqFt   = sumIfComplete(parsedMeanSqFts);
  const totalMedianLot  = sumIfComplete(parsedMedianLots);
  const totalMeanLot    = sumIfComplete(parsedMeanLots);
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

            {/* Address list — clickable for multi-property */}
            {isMulti && (
              <div className="prop-address-list">
                <div className="prop-address-list-label">Properties in this filing</div>
                {addresses.map((addr, i) => {
                  const geo = geoResults[i];
                  const geocoded = geo?.lat && geo?.lon;
                  return (
                    <div
                      key={i}
                      className={`prop-address-list-item${selectedIdx === i ? ' prop-address-selected' : ''}${geocoded ? ' prop-address-clickable' : ''}`}
                      onClick={() => { if (geocoded) setSelectedIdx(i); }}
                      title={geocoded ? 'Click to view on map' : 'Address could not be mapped'}
                    >
                      <span className={`prop-address-num${selectedIdx === i ? ' prop-address-num-active' : ''}`}>{i + 1}</span>
                      <span className="prop-address-text">{addr}</span>
                      {geocoded
                        ? <span className="prop-address-map-icon" title="Mapped">📍</span>
                        : <span className="prop-address-no-map" title="Not mapped">—</span>}
                    </div>
                  );
                })}
                {validPositions.length > 1 && (
                  <div className="prop-address-hint">Click an address to focus the map</div>
                )}
              </div>
            )}
          </div>

          {/* Right column — Leaflet map */}
          <div className="prop-modal-right">
            {mapLoading ? (
              <div className="prop-map-placeholder">Loading map…</div>
            ) : !hasMap ? (
              <div className="prop-map-placeholder">Map unavailable for this address</div>
            ) : (
              <MapContainer
                key={deal.propertyAddress}
                center={validPositions[0].pos}
                zoom={15}
                className="prop-map-leaflet"
                scrollWheelZoom={false}
                zoomControl={true}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                <MapFitBounds positions={validPositions.map(v => v.pos)} />
                {selectedGeo?.lat && selectedGeo?.lon && (
                  <MapFlyTo lat={selectedGeo.lat} lon={selectedGeo.lon} />
                )}
                {validPositions.map(({ pos, idx }) => (
                  <Marker
                    key={idx}
                    position={pos}
                    icon={isMulti ? numberedIcon(idx + 1, idx === selectedIdx) : defaultIcon}
                    eventHandlers={{ click: () => setSelectedIdx(idx) }}
                  >
                    <Popup>{addresses[idx] ?? deal.propertyAddress}</Popup>
                  </Marker>
                ))}
              </MapContainer>
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
                <div className="val-multi-grid">
                  <MultiPropertyValuation label="Median ($/sq ft)"  values={parsedMedianSqFts} />
                  <MultiPropertyValuation label="Mean ($/sq ft)"    values={parsedMeanSqFts}   />
                  <MultiPropertyValuation label="Median (lot size)" values={parsedMedianLots}  />
                  <MultiPropertyValuation label="Mean (lot size)"   values={parsedMeanLots}    />
                </div>
                {[totalMedianSqFt, totalMeanSqFt, totalMedianLot, totalMeanLot].some(v => v !== null) ? (
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
                ) : (
                  <div className="val-incomplete-note">
                    Combined collateral totals unavailable — valuation data is missing for one or more properties in this filing.
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="prop-valuation-subtitle">
                  Automated comparables &bull; vs. UPB of {formatCurrency(deal.upb)} &bull; * LTV calculated (UPB ÷ estimate)
                </div>
                <SingleValuation
                  medianSqFt={medianSqFts[0]} meanSqFt={meanSqFts[0]}
                  medianLot={medianLots[0]}   meanLot={meanLots[0]}
                  ltvMedianSqFt={ltvMedSqFts[0]} ltvMeanSqFt={ltvMeanSqFts[0]}
                  ltvMedianLot={ltvMedLots[0]}   ltvMeanLot={ltvMeanLots[0]}
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
