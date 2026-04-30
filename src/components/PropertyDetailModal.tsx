import { useEffect, useState } from 'react';
import { FlowThroughDeal } from '../types';
import { formatCurrency, formatDate } from '../utils/calculations';

interface Props {
  deal: FlowThroughDeal;
  onClose: () => void;
}

interface GeoResult { lat: number | null; lon: number | null; }
interface PropertyInfo {
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
  yearBuilt?: number;
  propertyType?: string;
  lastSalePrice?: number;
  lastSaleDate?: string;
  assessedValue?: number;
}
interface Comp {
  id: string;
  formattedAddress: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
  price?: number;
  removedDate?: string;
  listedDate?: string;
  status?: string;
  distance?: number;
  correlation?: number;
}

export function PropertyDetailModal({ deal, onClose }: Props) {
  const [geo, setGeo] = useState<GeoResult | null>(null);
  const [propInfo, setPropInfo] = useState<PropertyInfo | null>(null);
  const [comps, setComps] = useState<Comp[]>([]);
  const [compsRequested, setCompsRequested] = useState(false);
  const [compsLoading, setCompsLoading] = useState(false);
  const [compsError, setCompsError] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Geocode address for map
  useEffect(() => {
    fetch(`/api/geocode?address=${encodeURIComponent(deal.propertyAddress + ', NY')}`)
      .then(r => r.json())
      .then(setGeo)
      .catch(() => setGeo({ lat: null, lon: null }));
  }, [deal.propertyAddress]);

  const fetchComps = () => {
    setCompsLoading(true);
    setCompsError(null);
    fetch(`/api/comps?address=${encodeURIComponent(deal.propertyAddress)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setPropInfo(data.property ?? null);
        setComps(data.comps ?? []);
      })
      .catch(err => setCompsError(err.message))
      .finally(() => setCompsLoading(false));
  };

  const mapUrl = geo?.lat && geo?.lon
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${geo.lon - 0.008},${geo.lat - 0.008},${geo.lon + 0.008},${geo.lat + 0.008}&layer=mapnik&marker=${geo.lat},${geo.lon}`
    : null;

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

            {/* Key metrics */}
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

              {propInfo?.propertyType && (
                <div className="prop-detail-item">
                  <div className="prop-detail-label">Property Type</div>
                  <div className="prop-detail-value">{propInfo.propertyType}</div>
                </div>
              )}
              {propInfo?.yearBuilt && (
                <div className="prop-detail-item">
                  <div className="prop-detail-label">Year Built</div>
                  <div className="prop-detail-value">{propInfo.yearBuilt}</div>
                </div>
              )}
              {propInfo?.squareFootage && (
                <div className="prop-detail-item">
                  <div className="prop-detail-label">Sq Footage</div>
                  <div className="prop-detail-value">{propInfo.squareFootage.toLocaleString()} sqft</div>
                </div>
              )}
              {propInfo?.bedrooms != null && (
                <div className="prop-detail-item">
                  <div className="prop-detail-label">Bed / Bath</div>
                  <div className="prop-detail-value">{propInfo.bedrooms} bd / {propInfo.bathrooms ?? '—'} ba</div>
                </div>
              )}
              {propInfo?.lastSalePrice && (
                <div className="prop-detail-item">
                  <div className="prop-detail-label">Last Sale</div>
                  <div className="prop-detail-value">
                    {formatCurrency(propInfo.lastSalePrice)}
                    {propInfo.lastSaleDate && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: 6 }}>{propInfo.lastSaleDate.slice(0, 7)}</span>}
                  </div>
                </div>
              )}
              {propInfo?.assessedValue && (
                <div className="prop-detail-item">
                  <div className="prop-detail-label">Assessed Value</div>
                  <div className="prop-detail-value">{formatCurrency(propInfo.assessedValue)}</div>
                </div>
              )}
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

        {/* Comps section */}
        <div className="prop-comps-section">
          <h3 className="prop-comps-title">
            Comparable Sales
            <span className="prop-comps-source">via Rentcast · 5-mile radius</span>
          </h3>

          {!compsRequested && (
            <div className="prop-comps-prompt">
              <button
                className="find-comps-btn"
                onClick={() => { setCompsRequested(true); fetchComps(); }}
              >
                Find Comps
              </button>
              <span className="prop-comps-hint">Pulls recent sales within 5 miles from Rentcast</span>
            </div>
          )}

          {compsRequested && compsLoading && (
            <div className="prop-comps-loading">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="skel" style={{ height: 40, marginBottom: 6, borderRadius: 4 }} />
              ))}
            </div>
          )}

          {compsRequested && !compsLoading && compsError && (
            <div className="prop-comps-error">
              {compsError.includes('RENTCAST_API_KEY')
                ? 'Add RENTCAST_API_KEY to your Vercel environment variables to enable comps.'
                : `Could not load comps: ${compsError}`}
            </div>
          )}

          {compsRequested && !compsLoading && !compsError && comps.length === 0 && (
            <div className="empty-state">No comparable sales found within 5 miles.</div>
          )}

          {compsRequested && !compsLoading && !compsError && comps.length > 0 && (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Address</th>
                    <th className="text-right">Sale Price</th>
                    <th className="text-right">Sq Ft</th>
                    <th className="text-right">Bed/Bath</th>
                    <th className="text-right">Sold Date</th>
                    <th className="text-right">Distance</th>
                  </tr>
                </thead>
                <tbody>
                  {comps.map(comp => (
                    <tr key={comp.id}>
                      <td>{comp.formattedAddress}</td>
                      <td className={`text-right currency-cell ${comp.price && comp.price >= 750000 ? 'upb-high' : comp.price && comp.price >= 500000 ? 'upb-mid' : ''}`}>
                        {comp.price ? formatCurrency(comp.price) : '—'}
                      </td>
                      <td className="text-right">{comp.squareFootage ? comp.squareFootage.toLocaleString() : '—'}</td>
                      <td className="text-right">{comp.bedrooms != null ? `${comp.bedrooms}/${comp.bathrooms ?? '—'}` : '—'}</td>
                      <td className="text-right">{comp.removedDate ? comp.removedDate.slice(0, 10) : comp.listedDate ? comp.listedDate.slice(0, 10) : '—'}</td>
                      <td className="text-right">{comp.distance != null ? `${comp.distance.toFixed(2)} mi` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
