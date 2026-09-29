import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const RISK_COLOR: Record<string, string> = {
  Low: '#16a34a', Medium: '#ca8a04', High: '#ea580c', Critical: '#dc2626'
};

const projects = [
  { id: 'NH-001', name: 'NH-48 Bengaluru-Chennai Expressway', state: 'Karnataka', district: 'Kolar', required: '2,450 Ac', acquired: '1,890 Ac', stage: 'Compensation', risk: 'Critical', delay: '60 days', status: 'Overdue' },
  { id: 'MH-005', name: 'Nagpur–Mumbai Super Communication Expressway', state: 'Maharashtra', district: 'Wardha', required: '3,100 Ac', acquired: '2,600 Ac', stage: 'Legal', risk: 'High', delay: '35 days', status: 'Pending' },
  { id: 'TN-002', name: 'Chennai–Salem 8-Lane Expressway', state: 'Tamil Nadu', district: 'Salem', required: '1,800 Ac', acquired: '1,200 Ac', stage: 'Notification', risk: 'High', delay: '28 days', status: 'Pending' },
  { id: 'GJ-007', name: 'Delhi–Mumbai Expressway (Gujarat Section)', state: 'Gujarat', district: 'Vadodara', required: '4,200 Ac', acquired: '3,900 Ac', stage: 'R&R', risk: 'Medium', delay: '14 days', status: 'In Progress' },
  { id: 'KA-003', name: 'Ring Road Phase-III Bengaluru', state: 'Karnataka', district: 'Bengaluru Rural', required: '820 Ac', acquired: '710 Ac', stage: 'Possession', risk: 'Medium', delay: '10 days', status: 'In Progress' },
  { id: 'UP-011', name: 'Bundelkhand Expressway Extension', state: 'Uttar Pradesh', district: 'Jhansi', required: '1,600 Ac', acquired: '1,580 Ac', stage: 'Possession', risk: 'Low', delay: '0 days', status: 'Completed' },
  { id: 'RJ-004', name: 'Delhi–Amritsar–Katra Greenfield Highway', state: 'Rajasthan', district: 'Alwar', required: '2,900 Ac', acquired: '1,950 Ac', stage: 'Objection', risk: 'Critical', delay: '75 days', status: 'Overdue' },
  { id: 'AP-009', name: 'Vizag–Chennai Industrial Corridor Road', state: 'Andhra Pradesh', district: 'Nellore', required: '1,350 Ac', acquired: '1,100 Ac', stage: 'Valuation', risk: 'High', delay: '22 days', status: 'Pending' },
];

const stageData = [
  { name: 'Land ID', value: 4 },
  { name: 'Ownership', value: 6 },
  { name: 'Notification', value: 8 },
  { name: 'Objection', value: 5 },
  { name: 'Valuation', value: 9 },
  { name: 'Compensation', value: 12 },
  { name: 'R&R', value: 7 },
  { name: 'Possession', value: 11 },
  { name: 'Completed', value: 18 },
];

const riskDist = [
  { name: 'Critical', value: 8, color: '#dc2626' },
  { name: 'High', value: 14, color: '#ea580c' },
  { name: 'Medium', value: 22, color: '#ca8a04' },
  { name: 'Low', value: 36, color: '#16a34a' },
];

const alerts = [
  { level: 'Critical', project: 'RJ-004', msg: 'Objection period expired — 75 days overdue. Immediate legal intervention required.', time: '2 hrs ago' },
  { level: 'Critical', project: 'NH-001', msg: 'Compensation pending for 127 land owners — 60 days beyond deadline.', time: '5 hrs ago' },
  { level: 'High', project: 'MH-005', msg: 'Legal case filed in Nagpur High Court. Injunction hearing on 05-Nov-2025.', time: '1 day ago' },
  { level: 'High', project: 'AP-009', msg: 'Valuation discrepancy of ₹2.4 Cr detected. Officer review pending.', time: '1 day ago' },
  { level: 'High', project: 'TN-002', msg: 'Notification objection period ends in 3 days. 42 objections received.', time: '2 days ago' },
];

interface Props { onNavigate: (page: string, sub?: string) => void; }

export default function Dashboard({ onNavigate }: Props) {
  return (
    <div>
      {/* Page title */}
      <div style={{ background: '#1a4c96', color: 'white', padding: '12px 24px' }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>Land Acquisition Monitoring Dashboard</div>
        <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>
          Monitor acquisition progress and identify potential delays through data analytics and AI-assisted risk assessment.
        </div>
      </div>

      <div className="p-4 max-w-screen-2xl mx-auto" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Demo data notice */}
        <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', padding: '6px 14px', borderRadius: 2, fontSize: 12, color: '#92400e' }}>
          ⚠ &nbsp;<strong>DEMONSTRATION DATA:</strong> All data shown is sample/demo data for UI illustration only. This portal displays data from connected live databases when deployed in production.
        </div>

        {/* Summary boxes */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
          {[
            { label: 'Total Projects', value: '80', sub: '12 States', cls: '' },
            { label: 'Projects at Risk', value: '22', sub: '27.5% of Total', cls: 'orange-top' },
            { label: 'Critical Projects', value: '8', sub: 'Immediate Action', cls: 'red-top' },
            { label: 'Land Parcels', value: '1,24,870', sub: 'Total Identified', cls: '' },
            { label: 'Pending Compensation', value: '₹ 4,218 Cr', sub: '3,421 Cases', cls: 'yellow-top' },
            { label: 'Pending Legal Cases', value: '284', sub: '48 High Courts', cls: 'red-top' },
          ].map(b => (
            <div key={b.label} className={`summary-box ${b.cls}`}>
              <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{b.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#1a2744', marginTop: 4 }}>{b.value}</div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{b.sub}</div>
            </div>
          ))}
        </div>

        {/* Row 1: Risk Overview + High Risk Projects */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
          {/* Risk distribution pie */}
          <div className="gov-card p-4">
            <div className="gov-section-title">Project Risk Overview</div>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={riskDist} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false} fontSize={11}>
                  {riskDist.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
              {riskDist.map(r => (
                <span key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                  <span style={{ width: 10, height: 10, background: r.color, display: 'inline-block', borderRadius: 1 }}></span>
                  {r.name} ({r.value})
                </span>
              ))}
            </div>
          </div>

          {/* High risk projects */}
          <div className="gov-card p-4">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div className="gov-section-title" style={{ marginBottom: 0 }}>High-Risk Projects</div>
              <button className="action-link" onClick={() => onNavigate('Projects')}>View All Projects →</button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>Project ID</th>
                    <th>Project Name</th>
                    <th>State</th>
                    <th>Stage</th>
                    <th>Risk</th>
                    <th>Predicted Delay</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.filter(p => p.risk === 'Critical' || p.risk === 'High').slice(0, 5).map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600, color: '#1a4c96' }}>{p.id}</td>
                      <td style={{ maxWidth: 200 }}><span title={p.name}>{p.name.length > 36 ? p.name.slice(0, 35) + '…' : p.name}</span></td>
                      <td>{p.state}</td>
                      <td>{p.stage}</td>
                      <td><span className={`status-badge badge-${p.risk.toLowerCase()}`}>{p.risk}</span></td>
                      <td style={{ color: p.delay === '0 days' ? '#16a34a' : '#dc2626', fontWeight: 600 }}>{p.delay}</td>
                      <td><span className={`status-badge badge-${p.status.toLowerCase().replace(' ', '')}`}>{p.status}</span></td>
                      <td>
                        <button className="action-link" onClick={() => onNavigate('Projects', p.id)}>View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Row 2: Acquisition Progress bar chart + Alerts */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 12 }}>
          <div className="gov-card p-4">
            <div className="gov-section-title">Acquisition Progress by Stage</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stageData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#1a4c96" radius={[1, 1, 0, 0]} name="Projects" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="gov-card p-4">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div className="gov-section-title" style={{ marginBottom: 0 }}>Recent Alerts</div>
              <button className="action-link" onClick={() => onNavigate('Alerts')}>View All →</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {alerts.map((a, i) => (
                <div key={i} style={{
                  padding: '7px 10px',
                  border: '1px solid',
                  borderColor: a.level === 'Critical' ? '#fca5a5' : '#fed7aa',
                  background: a.level === 'Critical' ? '#fef2f2' : '#fff7ed',
                  borderRadius: 2,
                  borderLeft: `3px solid ${a.level === 'Critical' ? '#dc2626' : '#ea580c'}`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: a.level === 'Critical' ? '#b91c1c' : '#c2410c' }}>
                      {a.level.toUpperCase()} — {a.project}
                    </span>
                    <span style={{ fontSize: 10, color: '#6b7280' }}>{a.time}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#374151', marginTop: 2 }}>{a.msg}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Row 3: Full projects table */}
        <div className="gov-card p-4">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div className="gov-section-title" style={{ marginBottom: 0 }}>All Projects — Risk Status</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <select className="form-input">
                <option>All States</option>
                <option>Karnataka</option>
                <option>Maharashtra</option>
                <option>Tamil Nadu</option>
                <option>Gujarat</option>
              </select>
              <select className="form-input">
                <option>All Risk Levels</option>
                <option>Critical</option>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="gov-table">
              <thead>
                <tr>
                  <th>Project ID</th>
                  <th>Project Name</th>
                  <th>State</th>
                  <th>District</th>
                  <th>Land Required</th>
                  <th>Land Acquired</th>
                  <th>Current Stage</th>
                  <th>Risk Level</th>
                  <th>Predicted Delay</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {projects.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600, color: '#1a4c96' }}>{p.id}</td>
                    <td style={{ maxWidth: 220 }}><span title={p.name}>{p.name.length > 38 ? p.name.slice(0, 37) + '…' : p.name}</span></td>
                    <td>{p.state}</td>
                    <td>{p.district}</td>
                    <td>{p.required}</td>
                    <td>{p.acquired}</td>
                    <td>{p.stage}</td>
                    <td><span className={`status-badge badge-${p.risk.toLowerCase()}`}>{p.risk}</span></td>
                    <td style={{ fontWeight: 600, color: p.delay === '0 days' ? '#16a34a' : '#dc2626' }}>{p.delay}</td>
                    <td><span className={`status-badge badge-${p.status.toLowerCase().replace(' ', '')}`}>{p.status}</span></td>
                    <td>
                      <button className="action-link" onClick={() => onNavigate('Projects', p.id)}>Details</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
            <span>Showing 8 of 80 projects</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {[1,2,3,'...',10].map((n,i) => (
                <button key={i} style={{ padding: '2px 8px', border: '1px solid #d1d5db', background: n === 1 ? '#1a4c96' : 'white', color: n === 1 ? 'white' : '#1a2744', borderRadius: 2, fontSize: 12, cursor: 'pointer' }}>{n}</button>
              ))}
            </div>
          </div>
        </div>

        {/* GIS Map preview */}
        <div className="gov-card p-4">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div className="gov-section-title" style={{ marginBottom: 0 }}>GIS Project Map — Overview</div>
            <button className="gov-btn gov-btn-secondary gov-btn-sm" onClick={() => onNavigate('GIS Map')}>Open Full GIS →</button>
          </div>
          <div style={{ background: '#e8f4f8', border: '1px solid #b0cfe0', borderRadius: 2, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
            <svg width="100%" height="100%" viewBox="0 0 900 220" preserveAspectRatio="none" style={{ position: 'absolute', top: 0, left: 0 }}>
              {/* India outline approximate */}
              <rect width="900" height="220" fill="#d4e6f1" />
              {/* Grid lines */}
              {[0,1,2,3].map(i => <line key={i} x1={i*225} y1="0" x2={i*225} y2="220" stroke="#b0cfe0" strokeWidth="0.5" />)}
              {[0,1,2].map(i => <line key={i} x1="0" y1={i*73} x2="900" y2={i*73} stroke="#b0cfe0" strokeWidth="0.5" />)}
              {/* Project corridors */}
              <line x1="200" y1="120" x2="450" y2="140" stroke="#dc2626" strokeWidth="3" strokeDasharray="6,2" />
              <line x1="350" y1="80" x2="550" y2="130" stroke="#ea580c" strokeWidth="3" strokeDasharray="6,2" />
              <line x1="500" y1="100" x2="700" y2="90" stroke="#ca8a04" strokeWidth="3" />
              <line x1="150" y1="60" x2="300" y2="70" stroke="#16a34a" strokeWidth="3" />
              {/* Project markers */}
              {[
                { cx: 200, cy: 120, c: '#dc2626', label: 'RJ-004' },
                { cx: 350, cy: 80, c: '#dc2626', label: 'NH-001' },
                { cx: 550, cy: 130, c: '#ea580c', label: 'MH-005' },
                { cx: 500, cy: 100, c: '#ca8a04', label: 'GJ-007' },
                { cx: 700, cy: 90, c: '#ca8a04', label: 'KA-003' },
                { cx: 150, cy: 60, c: '#16a34a', label: 'UP-011' },
              ].map(m => (
                <g key={m.label}>
                  <circle cx={m.cx} cy={m.cy} r="8" fill={m.c} stroke="white" strokeWidth="2" />
                  <text x={m.cx + 11} y={m.cy + 4} fill="#1a2744" fontSize="9" fontWeight="600">{m.label}</text>
                </g>
              ))}
            </svg>
            <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(255,255,255,0.9)', border: '1px solid #d1d5db', padding: '4px 8px', borderRadius: 2, fontSize: 10 }}>
              <div style={{ fontWeight: 700, marginBottom: 2 }}>Risk Legend</div>
              {[['#dc2626','Critical'],['#ea580c','High'],['#ca8a04','Medium'],['#16a34a','Low']].map(([c,l]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 10, height: 10, background: c, display: 'inline-block', borderRadius: '50%' }}></span>
                  <span>{l}</span>
                </div>
              ))}
            </div>
            <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(255,255,255,0.9)', border: '1px solid #d1d5db', padding: '4px 8px', borderRadius: 2, fontSize: 10, color: '#92400e', fontWeight: 600 }}>
              DEMO MAP — Sample Data Only
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
