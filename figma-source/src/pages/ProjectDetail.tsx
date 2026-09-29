const stages = [
  { name: 'Land Identification', status: 'Completed', date: '12-Mar-2024' },
  { name: 'Ownership Verification', status: 'Completed', date: '28-Apr-2024' },
  { name: 'Notification (Sec. 11)', status: 'Completed', date: '15-Jun-2024' },
  { name: 'Objection / Hearing', status: 'Overdue', date: '30-Aug-2024' },
  { name: 'Valuation (Sec. 26)', status: 'In Progress', date: '—' },
  { name: 'Compensation Award', status: 'Pending', date: '—' },
  { name: 'Rehabilitation & Resettlement', status: 'Pending', date: '—' },
  { name: 'Possession', status: 'Pending', date: '—' },
  { name: 'Acquisition Completion', status: 'Pending', date: '—' },
];

const parcels = [
  { id: 'P-00124', survey: '147/2A', village: 'Krishnapura', taluk: 'Kolar', district: 'Kolar', area: '1.24 Ac', owner: 'O-4521', ownership: 'Private', acq: 'Notified', comp: 'Pending', legal: 'Clear', possession: 'Pending' },
  { id: 'P-00125', survey: '148/1', village: 'Krishnapura', taluk: 'Kolar', district: 'Kolar', area: '0.87 Ac', owner: 'O-4522', ownership: 'Private', acq: 'Awarded', comp: 'Completed', legal: 'Clear', possession: 'Taken' },
  { id: 'P-00126', survey: '148/3B', village: 'Hosahalli', taluk: 'Kolar', district: 'Kolar', area: '2.10 Ac', owner: 'O-4523', ownership: 'Private', acq: 'Notified', comp: 'Pending', legal: 'Disputed', possession: 'Pending' },
  { id: 'P-00127', survey: '149/1', village: 'Hosahalli', taluk: 'Kolar', district: 'Kolar', area: '0.55 Ac', owner: 'O-4524', ownership: 'Govt', acq: 'Awarded', comp: 'N/A', legal: 'Clear', possession: 'Taken' },
  { id: 'P-00128', survey: '150/2', village: 'Malur', taluk: 'Malur', district: 'Kolar', area: '3.20 Ac', owner: 'O-4525', ownership: 'Private', acq: 'Identified', comp: 'Pending', legal: 'Clear', possession: 'Pending' },
];

const statusBadge = (s: string) => {
  const map: Record<string,string> = {
    Completed: 'badge-completed', Awarded: 'badge-completed', Taken: 'badge-completed', Clear: 'badge-completed',
    'In Progress': 'badge-inprogress', Notified: 'badge-inprogress',
    Pending: 'badge-pending', Identified: 'badge-pending',
    Overdue: 'badge-overdue', Disputed: 'badge-overdue',
    'N/A': 'badge-inprogress',
  };
  return <span className={`status-badge ${map[s] || ''}`}>{s}</span>;
};

interface Props { projectId?: string; onNavigate: (page: string, sub?: string) => void; }

export default function ProjectDetail({ projectId = 'NH-001', onNavigate }: Props) {
  return (
    <div>
      {/* Page title bar */}
      <div style={{ background: '#1a4c96', color: 'white', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            <button style={{ color: 'white', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontSize: 12, padding: 0 }} onClick={() => onNavigate('Projects')}>Projects</button>
            {' '}&rsaquo;{' '}Project Detail
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>
            NH-48 Bengaluru–Chennai Expressway
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="gov-btn gov-btn-secondary gov-btn-sm" onClick={() => onNavigate('AI Risk Assessment', projectId)}>AI Risk Assessment</button>
          <button className="gov-btn gov-btn-secondary gov-btn-sm" onClick={() => onNavigate('Alerts')}>View Alerts</button>
          <button className="gov-btn" style={{ background: '#16a34a', color: 'white', padding: '4px 12px', fontSize: 12, borderRadius: 2, border: 'none', cursor: 'pointer' }}>Download Report</button>
        </div>
      </div>

      <div className="p-4 max-w-screen-2xl mx-auto" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Demo notice */}
        <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', padding: '5px 12px', borderRadius: 2, fontSize: 12, color: '#92400e' }}>
          ⚠ <strong>DEMONSTRATION DATA</strong> — Project ID: {projectId}
        </div>

        {/* Project header info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="gov-card p-4">
            <div className="gov-section-title">Project Information</div>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <tbody>
                {[
                  ['Project ID', projectId],
                  ['Project Name', 'NH-48 Bengaluru–Chennai Expressway'],
                  ['Project Type', 'National Highway — Greenfield Expressway'],
                  ['Implementing Agency', 'NHAI (National Highways Authority of India)'],
                  ['State', 'Karnataka & Tamil Nadu'],
                  ['District', 'Kolar, Krishnagiri, Vellore'],
                  ['Current Stage', 'Compensation (Section 38)'],
                  ['Overall Status', <span className="status-badge badge-overdue">Overdue</span>],
                  ['Risk Level', <span className="status-badge badge-critical">Critical</span>],
                  ['Total Length', '262 km'],
                  ['Target Completion', '31-Mar-2026'],
                ].map(([k, v]) => (
                  <tr key={String(k)} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '5px 0', color: '#6b7280', width: '40%', fontWeight: 500 }}>{k}</td>
                    <td style={{ padding: '5px 0', fontWeight: 500 }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Project site image placeholder */}
          <div className="gov-card p-4">
            <div className="gov-section-title">Project Site — Image</div>
            <div style={{ background: '#e8eef8', border: '1px solid #c3d4ee', borderRadius: 2, height: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
              <svg width="100%" height="100%" viewBox="0 0 500 180" style={{ position: 'absolute', top: 0, left: 0 }}>
                {/* Sky */}
                <rect width="500" height="80" fill="#b0cfe0" />
                {/* Road */}
                <rect x="0" y="80" width="500" height="100" fill="#9ca3af" />
                {/* Road markings */}
                <line x1="250" y1="80" x2="250" y2="180" stroke="white" strokeWidth="4" strokeDasharray="15,10" />
                {/* Trees */}
                {[40,80,120,360,400,440].map(x => (
                  <g key={x}>
                    <rect x={x-3} y="60" width="6" height="25" fill="#6b7280" />
                    <circle cx={x} cy="55" r="15" fill="#16a34a" />
                  </g>
                ))}
                {/* Construction equipment */}
                <rect x="200" y="95" width="40" height="25" fill="#ca8a04" rx="2" />
                <rect x="220" y="85" width="10" height="10" fill="#ea580c" />
                {/* Land parcels markers */}
                <rect x="10" y="82" width="30" height="15" fill="#dc2626" opacity="0.6" />
                <text x="25" y="92" fill="white" fontSize="6" textAnchor="middle" fontWeight="700">P-124</text>
                <rect x="50" y="82" width="30" height="15" fill="#16a34a" opacity="0.6" />
                <text x="65" y="92" fill="white" fontSize="6" textAnchor="middle" fontWeight="700">P-125</text>
              </svg>
              <div style={{ position: 'absolute', bottom: 6, left: 6, right: 6, background: 'rgba(0,0,0,0.65)', color: 'white', padding: '3px 8px', borderRadius: 1, fontSize: 11, display: 'flex', justifyContent: 'space-between' }}>
                <span><strong>Project ID:</strong> {projectId} &nbsp;|&nbsp; <strong>Location:</strong> Krishnapura, Kolar</span>
                <span>SAMPLE IMAGE</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
              {['Road Corridor', 'Land Acquisition Site', 'Village View', 'Construction Progress'].map(label => (
                <div key={label} style={{ background: '#f5f5f5', border: '1px solid #d1d5db', borderRadius: 2, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#6b7280', cursor: 'pointer' }}>
                  📷 {label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Project overview numbers */}
        <div className="gov-card p-4">
          <div className="gov-section-title">Project Overview — Land Acquisition Summary</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
            {[
              { label: 'Total Land Required', value: '2,450 Acres', cls: '' },
              { label: 'Land Acquired', value: '1,890 Acres', cls: 'green-top' },
              { label: 'Land Pending', value: '560 Acres', cls: 'orange-top' },
              { label: 'No. of Land Parcels', value: '4,218', cls: '' },
              { label: 'Affected Persons', value: '8,742', cls: 'yellow-top' },
              { label: 'Families Displaced', value: '1,246', cls: 'red-top' },
            ].map(b => (
              <div key={b.label} className={`summary-box ${b.cls}`}>
                <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>{b.label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#1a2744', marginTop: 4 }}>{b.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Workflow */}
        <div className="gov-card p-4">
          <div className="gov-section-title">Land Acquisition Workflow — Stage Progress</div>
          <div style={{ display: 'flex', gap: 0, overflowX: 'auto', paddingBottom: 4 }}>
            {stages.map((s, i) => {
              const colors: Record<string, { bg: string; border: string; text: string }> = {
                Completed: { bg: '#dcfce7', border: '#16a34a', text: '#15803d' },
                'In Progress': { bg: '#eff6ff', border: '#1a4c96', text: '#1d4ed8' },
                Pending: { bg: '#f9fafb', border: '#d1d5db', text: '#6b7280' },
                Overdue: { bg: '#fef2f2', border: '#dc2626', text: '#b91c1c' },
              };
              const c = colors[s.status];
              return (
                <div key={s.name} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{
                    background: c.bg, border: `1px solid ${c.border}`,
                    borderRadius: 2, padding: '8px 12px', width: 120, textAlign: 'center'
                  }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: c.border, color: 'white', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 4px' }}>
                      {s.status === 'Completed' ? '✓' : i + 1}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: c.text }}>{s.name}</div>
                    <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>{s.date}</div>
                    <span className={`status-badge badge-${s.status.toLowerCase().replace(' ', '')}`} style={{ fontSize: 10, marginTop: 4, display: 'inline-block' }}>{s.status}</span>
                  </div>
                  {i < stages.length - 1 && (
                    <div style={{ width: 20, height: 2, background: i < 2 ? '#16a34a' : '#d1d5db', flexShrink: 0 }}>
                      <div style={{ width: 0, height: 0, borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderLeft: `7px solid ${i < 2 ? '#16a34a' : '#d1d5db'}`, marginLeft: 13, marginTop: -4 }}></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Land parcels table */}
        <div className="gov-card p-4">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div className="gov-section-title" style={{ marginBottom: 0 }}>Land Parcels</div>
            <button className="action-link" onClick={() => onNavigate('Land Parcels')}>View All Parcels →</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="gov-table">
              <thead>
                <tr>
                  <th>Parcel ID</th>
                  <th>Survey No.</th>
                  <th>Village</th>
                  <th>Taluk</th>
                  <th>District</th>
                  <th>Land Area</th>
                  <th>Owner/Party ID</th>
                  <th>Ownership</th>
                  <th>Acq. Status</th>
                  <th>Comp. Status</th>
                  <th>Legal Status</th>
                  <th>Possession</th>
                </tr>
              </thead>
              <tbody>
                {parcels.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600, color: '#1a4c96' }}>{p.id}</td>
                    <td>{p.survey}</td>
                    <td>{p.village}</td>
                    <td>{p.taluk}</td>
                    <td>{p.district}</td>
                    <td>{p.area}</td>
                    <td style={{ color: '#1a4c96' }}>{p.owner}</td>
                    <td>{p.ownership}</td>
                    <td>{statusBadge(p.acq)}</td>
                    <td>{statusBadge(p.comp)}</td>
                    <td>{statusBadge(p.legal)}</td>
                    <td>{statusBadge(p.possession)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
