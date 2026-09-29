import { useState } from 'react';

const corridorPoints = [
  { x: 60, y: 200, label: 'Mangaluru', project: 'NH-001', risk: 'low' },
  { x: 140, y: 185, label: 'Hassan', project: 'NH-001', risk: 'medium' },
  { x: 220, y: 170, label: 'Bengaluru', project: 'NH-001', risk: 'critical' },
  { x: 310, y: 165, label: 'Kolar', project: 'NH-001', risk: 'critical' },
  { x: 390, y: 160, label: 'Krishnagiri', project: 'NH-001', risk: 'high' },
  { x: 480, y: 155, label: 'Vellore', project: 'NH-001', risk: 'medium' },
  { x: 570, y: 150, label: 'Chennai', project: 'NH-001', risk: 'low' },
];

const riskColor: Record<string, string> = {
  low: '#16a34a', medium: '#ca8a04', high: '#ea580c', critical: '#dc2626'
};

const parcels = [
  { id: 'P-00124', x: 310, y: 155, risk: 'critical', area: '1.24 Ac' },
  { id: 'P-00126', x: 330, y: 170, risk: 'critical', area: '2.10 Ac' },
  { id: 'P-00128', x: 290, y: 162, risk: 'high', area: '3.20 Ac' },
  { id: 'P-00131', x: 350, y: 158, risk: 'medium', area: '0.85 Ac' },
  { id: 'P-00133', x: 370, y: 165, risk: 'low', area: '1.55 Ac' },
  { id: 'P-01022', x: 480, y: 145, risk: 'high', area: '2.40 Ac' },
  { id: 'P-03210', x: 570, y: 140, risk: 'medium', area: '1.80 Ac' },
];

const layers = ['Project Corridors', 'Roads', 'Land Parcels', 'Project Locations', 'Risk Areas', 'Acquisition Status'];

export default function GISMap() {
  const [activeLayers, setActiveLayers] = useState(new Set(layers));
  const [tooltip, setTooltip] = useState<{ x: number; y: number; id: string; area: string; risk: string } | null>(null);

  const toggleLayer = (l: string) => {
    setActiveLayers(prev => {
      const next = new Set(prev);
      next.has(l) ? next.delete(l) : next.add(l);
      return next;
    });
  };

  return (
    <div>
      <div style={{ background: '#1a4c96', color: 'white', padding: '12px 24px' }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>Land Acquisition GIS Monitoring</div>
        <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>
          Geospatial visualization of project corridors, land parcels, and risk areas. Powered by PostGIS + Leaflet.
        </div>
      </div>

      <div className="p-4 max-w-screen-2xl mx-auto" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', padding: '5px 12px', borderRadius: 2, fontSize: 12, color: '#92400e' }}>
          ⚠ <strong>DEMONSTRATION MAP</strong> — Sample corridor: Mangaluru → Chennai (NH-48). Production deployment connects to PostGIS / Leaflet with real geospatial data.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 12 }}>
          {/* Layer panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="gov-card p-4">
              <div className="gov-section-title">Map Layers</div>
              {layers.map(l => (
                <label key={l} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 13, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={activeLayers.has(l)}
                    onChange={() => toggleLayer(l)}
                    style={{ width: 14, height: 14 }}
                  />
                  {l}
                </label>
              ))}
            </div>

            <div className="gov-card p-4">
              <div className="gov-section-title">Risk Legend</div>
              {[['#dc2626', 'Critical Risk'], ['#ea580c', 'High Risk'], ['#ca8a04', 'Medium Risk'], ['#16a34a', 'Low Risk'], ['#1a4c96', 'Acquired'], ['#d1d5db', 'Pending']].map(([c, l]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, fontSize: 12 }}>
                  <span style={{ width: 14, height: 14, background: c, display: 'inline-block', border: '1px solid rgba(0,0,0,0.15)', flexShrink: 0 }}></span>
                  {l}
                </div>
              ))}
            </div>

            <div className="gov-card p-4">
              <div className="gov-section-title">Project Filter</div>
              {['NH-001 — Blr-Chennai', 'RJ-004 — Dly-Amritsar', 'MH-005 — Ngp-Mumbai', 'TN-002 — Chn-Salem'].map(p => (
                <label key={p} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, fontSize: 12, cursor: 'pointer' }}>
                  <input type="checkbox" defaultChecked style={{ width: 12, height: 12 }} />
                  {p}
                </label>
              ))}
            </div>

            <div className="gov-card p-4">
              <div className="gov-section-title">Map Controls</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button className="gov-btn gov-btn-secondary gov-btn-sm" style={{ width: '100%' }}>🔍 Zoom In</button>
                <button className="gov-btn gov-btn-secondary gov-btn-sm" style={{ width: '100%' }}>🔍 Zoom Out</button>
                <button className="gov-btn gov-btn-secondary gov-btn-sm" style={{ width: '100%' }}>⊙ Reset View</button>
                <button className="gov-btn gov-btn-secondary gov-btn-sm" style={{ width: '100%' }}>📐 Measure</button>
                <button className="gov-btn gov-btn-primary gov-btn-sm" style={{ width: '100%' }}>⬇ Export Map</button>
              </div>
            </div>
          </div>

          {/* Map canvas */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="gov-card" style={{ position: 'relative', overflow: 'hidden' }}>
              {/* Toolbar */}
              <div style={{ background: '#f5f5f5', borderBottom: '1px solid #d1d5db', padding: '6px 12px', display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#1a2744' }}>Corridor: Mangaluru → Chennai (NH-48) — 262 km</span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                  <button className="gov-btn gov-btn-secondary gov-btn-sm">Satellite</button>
                  <button className="gov-btn gov-btn-primary gov-btn-sm">Terrain</button>
                  <button className="gov-btn gov-btn-secondary gov-btn-sm">Street</button>
                </div>
              </div>

              {/* SVG Map */}
              <div style={{ position: 'relative', height: 420, background: '#c8dde9', overflow: 'hidden' }}>
                <svg width="100%" height="420" viewBox="0 0 680 280" preserveAspectRatio="xMidYMid meet">
                  {/* Background terrain */}
                  <rect width="680" height="280" fill="#c8dde9" />
                  {/* Grid */}
                  {[0,1,2,3,4].map(i => <line key={`v${i}`} x1={i*170} y1="0" x2={i*170} y2="280" stroke="#b0cfe0" strokeWidth="0.4" />)}
                  {[0,1,2,3].map(i => <line key={`h${i}`} x1="0" y1={i*93} x2="680" y2={i*93} stroke="#b0cfe0" strokeWidth="0.4" />)}
                  {/* Land patches */}
                  <rect x="100" y="100" width="120" height="80" rx="2" fill="#d4e6b5" opacity="0.7" />
                  <rect x="250" y="120" width="100" height="70" rx="2" fill="#d4e6b5" opacity="0.6" />
                  <rect x="400" y="110" width="130" height="80" rx="2" fill="#d4e6b5" opacity="0.5" />
                  <rect x="560" y="100" width="80" height="70" rx="2" fill="#d4e6b5" opacity="0.5" />
                  {/* Water body */}
                  <ellipse cx="30" cy="190" rx="40" ry="20" fill="#7ec8e3" opacity="0.7" />
                  {/* Road background */}
                  {activeLayers.has('Roads') && (
                    <polyline
                      points={corridorPoints.map(p => `${p.x},${p.y + 10}`).join(' ')}
                      fill="none" stroke="#9ca3af" strokeWidth="10"
                    />
                  )}
                  {/* Main corridor */}
                  {activeLayers.has('Project Corridors') && (
                    <>
                      <polyline
                        points={corridorPoints.map(p => `${p.x},${p.y}`).join(' ')}
                        fill="none" stroke="#1a4c96" strokeWidth="5" opacity="0.8"
                      />
                      {/* Risk sections */}
                      <line x1="220" y1="170" x2="390" y2="160" stroke="#dc2626" strokeWidth="5" opacity="0.8" />
                    </>
                  )}
                  {/* Land parcels */}
                  {activeLayers.has('Land Parcels') && parcels.map(p => (
                    <rect
                      key={p.id}
                      x={p.x - 8} y={p.y - 6} width={16} height={12}
                      fill={riskColor[p.risk]} opacity={0.75}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, id: p.id, area: p.area, risk: p.risk })}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  ))}
                  {/* City markers */}
                  {activeLayers.has('Project Locations') && corridorPoints.map(p => (
                    <g key={p.label}>
                      <circle cx={p.x} cy={p.y} r="7" fill={riskColor[p.risk]} stroke="white" strokeWidth="2" />
                      <text x={p.x} y={p.y - 12} textAnchor="middle" fontSize="9" fill="#1a2744" fontWeight="700">{p.label}</text>
                      {p.risk === 'critical' && (
                        <circle cx={p.x} cy={p.y} r="12" fill="none" stroke="#dc2626" strokeWidth="1.5" strokeDasharray="4,2" opacity="0.8" />
                      )}
                    </g>
                  ))}
                  {/* Distance markers */}
                  {corridorPoints.slice(0, -1).map((p, i) => {
                    const next = corridorPoints[i + 1];
                    const mx = (p.x + next.x) / 2;
                    const my = (p.y + next.y) / 2 - 10;
                    return <text key={i} x={mx} y={my} textAnchor="middle" fontSize="8" fill="#6b7280">{Math.round(Math.sqrt(Math.pow(next.x - p.x, 2) + Math.pow(next.y - p.y, 2)) * 0.7)}km</text>;
                  })}
                  {/* Compass */}
                  <g transform="translate(650,30)">
                    <circle cx="0" cy="0" r="16" fill="white" stroke="#d1d5db" strokeWidth="1" />
                    <text x="0" y="-6" textAnchor="middle" fontSize="8" fontWeight="700" fill="#1a2744">N</text>
                    <line x1="0" y1="-12" x2="0" y2="12" stroke="#1a2744" strokeWidth="1" />
                    <line x1="-12" y1="0" x2="12" y2="0" stroke="#d1d5db" strokeWidth="0.5" />
                  </g>
                  {/* Scale bar */}
                  <g transform="translate(20,260)">
                    <rect width="80" height="4" fill="#1a2744" />
                    <rect x="40" width="40" height="4" fill="white" stroke="#1a2744" strokeWidth="0.5" />
                    <text x="0" y="14" fontSize="8" fill="#1a2744">0</text>
                    <text x="36" y="14" fontSize="8" fill="#1a2744">50 km</text>
                  </g>
                </svg>
                {tooltip && (
                  <div style={{
                    position: 'fixed', left: tooltip.x + 12, top: tooltip.y - 10,
                    background: 'white', border: '1px solid #d1d5db', padding: '6px 10px',
                    borderRadius: 2, fontSize: 11, boxShadow: '2px 2px 6px rgba(0,0,0,0.12)', zIndex: 999, pointerEvents: 'none'
                  }}>
                    <div style={{ fontWeight: 700, color: '#1a4c96' }}>{tooltip.id}</div>
                    <div>Area: {tooltip.area}</div>
                    <div>Risk: <span style={{ color: riskColor[tooltip.risk], fontWeight: 600, textTransform: 'capitalize' }}>{tooltip.risk}</span></div>
                  </div>
                )}
              </div>

              {/* Status bar */}
              <div style={{ background: '#f5f5f5', borderTop: '1px solid #d1d5db', padding: '4px 12px', fontSize: 11, color: '#6b7280', display: 'flex', gap: 16 }}>
                <span>Projection: WGS84 / EPSG:4326</span>
                <span>|</span>
                <span>Parcels visible: {parcels.length}</span>
                <span>|</span>
                <span>Corridor: 262 km total</span>
                <span>|</span>
                <span style={{ color: '#dc2626', fontWeight: 600 }}>Critical zone: Bengaluru–Kolar (68 km)</span>
                <span style={{ marginLeft: 'auto' }}>DEMO DATA</span>
              </div>
            </div>

            {/* Parcel summary below map */}
            <div className="gov-card p-4">
              <div className="gov-section-title">Risk Areas Summary</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                {[
                  { zone: 'Bengaluru–Kolar', km: '68 km', parcels: 1240, risk: 'critical', comp: '22%' },
                  { zone: 'Kolar–Krishnagiri', km: '54 km', parcels: 820, risk: 'high', comp: '45%' },
                  { zone: 'Krishnagiri–Vellore', km: '72 km', parcels: 980, risk: 'medium', comp: '68%' },
                  { zone: 'Vellore–Chennai', km: '68 km', parcels: 440, risk: 'low', comp: '91%' },
                ].map(z => (
                  <div key={z.zone} style={{ padding: '10px', border: `1px solid ${riskColor[z.risk]}`, borderLeft: `4px solid ${riskColor[z.risk]}`, borderRadius: 2, background: '#fafafa' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#1a2744' }}>{z.zone}</div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{z.km} · {z.parcels} parcels</div>
                    <div style={{ marginTop: 6 }}>
                      <div style={{ fontSize: 11, display: 'flex', justifyContent: 'space-between' }}>
                        <span>Acquisition</span><span style={{ fontWeight: 600 }}>{z.comp}</span>
                      </div>
                      <div style={{ background: '#e5e7eb', height: 5, borderRadius: 1, marginTop: 3 }}>
                        <div style={{ height: 5, width: z.comp, background: riskColor[z.risk], borderRadius: 1 }}></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
