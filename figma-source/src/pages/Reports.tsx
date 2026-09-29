import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

const stateRisk = [
  { state: 'Rajasthan', critical: 3, high: 2, medium: 4, low: 5 },
  { state: 'Maharashtra', critical: 1, high: 3, medium: 2, low: 4 },
  { state: 'Karnataka', critical: 2, high: 2, medium: 3, low: 6 },
  { state: 'Tamil Nadu', critical: 1, high: 2, medium: 4, low: 3 },
  { state: 'Gujarat', critical: 0, high: 1, medium: 3, low: 5 },
  { state: 'Uttar Pradesh', critical: 1, high: 1, medium: 2, low: 7 },
];

const compProgress = [
  { month: 'Jun', paid: 420, pending: 580 },
  { month: 'Jul', paid: 560, pending: 460 },
  { month: 'Aug', paid: 390, pending: 640 },
  { month: 'Sep', paid: 680, pending: 520 },
  { month: 'Oct', paid: 720, pending: 480 },
];

const riskDist = [
  { name: 'Critical', value: 8, color: '#dc2626' },
  { name: 'High', value: 14, color: '#ea580c' },
  { name: 'Medium', value: 22, color: '#ca8a04' },
  { name: 'Low', value: 36, color: '#16a34a' },
];

const reports = [
  { name: 'Project Status Report', desc: 'Overall status of all 80 projects across 12 states.', generated: '29-Oct-2025' },
  { name: 'Land Acquisition Progress Report', desc: 'Stage-wise progress for land acquisition activities.', generated: '28-Oct-2025' },
  { name: 'Compensation Monitoring Report', desc: 'Compensation assessment and payment status — all cases.', generated: '29-Oct-2025' },
  { name: 'Legal Status Report', desc: 'Active legal cases, court orders, and compliance actions.', generated: '27-Oct-2025' },
  { name: 'AI Risk Assessment Report', desc: 'ML-based risk predictions and SHAP factor analysis.', generated: '29-Oct-2025' },
  { name: 'Delay Prediction Report', desc: 'Predicted delays by project, stage, and district.', generated: '28-Oct-2025' },
  { name: 'District-wise Summary Report', desc: 'District-level land acquisition and risk summary.', generated: '25-Oct-2025' },
  { name: 'State-wise Consolidated Report', desc: 'State-wise acquisition progress and risk overview.', generated: '25-Oct-2025' },
];

export default function Reports() {
  return (
    <div>
      <div style={{ background: '#1a4c96', color: 'white', padding: '12px 24px' }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>Analytics & Reports</div>
        <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>
          Data analytics, visual reports, and downloadable reports for monitoring and review.
        </div>
      </div>

      <div className="p-4 max-w-screen-2xl mx-auto" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', padding: '5px 12px', borderRadius: 2, fontSize: 12, color: '#92400e' }}>
          ⚠ <strong>DEMONSTRATION DATA</strong>
        </div>

        {/* Charts row */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
          <div className="gov-card p-4">
            <div className="gov-section-title">State-wise Risk Distribution</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stateRisk} margin={{ top: 0, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="state" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="critical" name="Critical" stackId="a" fill="#dc2626" />
                <Bar dataKey="high" name="High" stackId="a" fill="#ea580c" />
                <Bar dataKey="medium" name="Medium" stackId="a" fill="#ca8a04" />
                <Bar dataKey="low" name="Low" stackId="a" fill="#16a34a" radius={[1,1,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="gov-card p-4">
            <div className="gov-section-title">Risk Distribution</div>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={riskDist} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false} fontSize={11}>
                  {riskDist.map(entry => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="gov-card p-4">
            <div className="gov-section-title">Compensation Progress (Crores ₹)</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={compProgress} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="paid" name="Paid (₹ Cr)" fill="#16a34a" radius={[1,1,0,0]} />
                <Bar dataKey="pending" name="Pending (₹ Cr)" fill="#ea580c" radius={[1,1,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Legal + R&R summary */}
          <div className="gov-card p-4">
            <div className="gov-section-title">Key Metrics Summary</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'Document Verification', total: 4218, done: 3610, pct: 85.6 },
                { label: 'Legal Cases Resolved', total: 284, done: 72, pct: 25.4 },
                { label: 'R&R Completion', total: 8742, done: 5210, pct: 59.6 },
                { label: 'Possession Completed', total: 4218, done: 3120, pct: 73.9 },
              ].map(m => (
                <div key={m.label} style={{ padding: '10px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 2 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#1a2744' }}>{m.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#1a4c96', marginTop: 4 }}>{m.pct}%</div>
                  <div style={{ background: '#e5e7eb', height: 5, borderRadius: 1, marginTop: 6 }}>
                    <div style={{ height: 5, width: `${m.pct}%`, background: m.pct > 70 ? '#16a34a' : m.pct > 40 ? '#ca8a04' : '#dc2626', borderRadius: 1 }}></div>
                  </div>
                  <div style={{ fontSize: 10, color: '#6b7280', marginTop: 3 }}>{m.done.toLocaleString()} / {m.total.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Reports table */}
        <div className="gov-card p-4">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div className="gov-section-title" style={{ marginBottom: 0 }}>Available Reports</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <select className="form-input">
                <option>As on: 29-Oct-2025</option>
              </select>
              <button className="gov-btn gov-btn-secondary gov-btn-sm">Schedule Report</button>
            </div>
          </div>
          <table className="gov-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Report Name</th>
                <th>Description</th>
                <th>Last Generated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r, i) => (
                <tr key={r.name}>
                  <td style={{ color: '#6b7280' }}>{i + 1}</td>
                  <td style={{ fontWeight: 600, color: '#1a2744' }}>{r.name}</td>
                  <td style={{ color: '#6b7280' }}>{r.desc}</td>
                  <td>{r.generated}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="gov-btn gov-btn-secondary gov-btn-sm">View</button>
                      <button className="gov-btn gov-btn-primary gov-btn-sm">Download PDF</button>
                      <button className="gov-btn gov-btn-secondary gov-btn-sm">Export Excel</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
