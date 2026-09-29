const cases = [
  { id: 'CP-00241', project: 'NH-001', parcel: 'P-00124', assessed: '₹ 48,24,000', paid: '₹ 0', status: 'Overdue', adate: '15-Aug-2025', pdate: '—', days: 75 },
  { id: 'CP-00242', project: 'NH-001', parcel: 'P-00126', assessed: '₹ 82,50,000', paid: '₹ 0', status: 'Overdue', adate: '18-Aug-2025', pdate: '—', days: 72 },
  { id: 'CP-00243', project: 'MH-005', parcel: 'P-01022', assessed: '₹ 1,24,50,000', paid: '₹ 0', status: 'Pending', adate: '02-Sep-2025', pdate: '—', days: 57 },
  { id: 'CP-00244', project: 'GJ-007', parcel: 'P-02104', assessed: '₹ 35,80,000', paid: '₹ 35,80,000', status: 'Completed', adate: '10-Jul-2025', pdate: '24-Jul-2025', days: 0 },
  { id: 'CP-00245', project: 'TN-002', parcel: 'P-03210', assessed: '₹ 62,10,000', paid: '₹ 0', status: 'Pending', adate: '12-Sep-2025', pdate: '—', days: 47 },
  { id: 'CP-00246', project: 'UP-011', parcel: 'P-04510', assessed: '₹ 28,40,000', paid: '₹ 28,40,000', status: 'Completed', adate: '05-May-2025', pdate: '19-May-2025', days: 0 },
  { id: 'CP-00247', project: 'RJ-004', parcel: 'P-05001', assessed: '₹ 1,08,90,000', paid: '₹ 0', status: 'Overdue', adate: '20-Jul-2025', pdate: '—', days: 101 },
  { id: 'CP-00248', project: 'AP-009', parcel: 'P-06012', assessed: '₹ 74,20,000', paid: '₹ 0', status: 'Pending', adate: '28-Sep-2025', pdate: '—', days: 31 },
  { id: 'CP-00249', project: 'KA-003', parcel: 'P-00711', assessed: '₹ 2,18,40,000', paid: '₹ 2,18,40,000', status: 'Completed', adate: '15-Jun-2025', pdate: '30-Jun-2025', days: 0 },
];

export default function Compensation() {
  const statusBadge = (s: string) => {
    const map: Record<string,string> = { Completed: 'badge-completed', Pending: 'badge-pending', Overdue: 'badge-overdue' };
    return <span className={`status-badge ${map[s] || ''}`}>{s}</span>;
  };

  return (
    <div>
      <div style={{ background: '#1a4c96', color: 'white', padding: '12px 24px' }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>Compensation Monitoring</div>
        <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>
          Track compensation assessment, payment status, and overdue cases across all projects.
        </div>
      </div>

      <div className="p-4 max-w-screen-2xl mx-auto" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', padding: '5px 12px', borderRadius: 2, fontSize: 12, color: '#92400e' }}>
          ⚠ <strong>DEMONSTRATION DATA</strong>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          {[
            { label: 'Total Cases', value: '3,421', cls: '' },
            { label: 'Completed', value: '1,842', cls: 'green-top' },
            { label: 'Pending', value: '1,124', cls: 'orange-top' },
            { label: 'Overdue (>60 days)', value: '455', cls: 'red-top' },
            { label: 'Total Pending Amount', value: '₹ 4,218 Cr', cls: 'yellow-top' },
          ].map(b => (
            <div key={b.label} className={`summary-box ${b.cls}`}>
              <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>{b.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#1a2744', marginTop: 4 }}>{b.value}</div>
            </div>
          ))}
        </div>

        <div className="gov-card p-4">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div className="gov-section-title" style={{ marginBottom: 0 }}>Compensation Cases</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <select className="form-input"><option>All Projects</option><option>NH-001</option><option>MH-005</option></select>
              <select className="form-input"><option>All Status</option><option>Overdue</option><option>Pending</option><option>Completed</option></select>
              <button className="gov-btn gov-btn-secondary gov-btn-sm">Export Excel</button>
              <button className="gov-btn gov-btn-primary gov-btn-sm">Download PDF</button>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="gov-table">
              <thead>
                <tr>
                  <th>Case ID</th>
                  <th>Project</th>
                  <th>Parcel ID</th>
                  <th>Amount Assessed</th>
                  <th>Amount Paid</th>
                  <th>Payment Status</th>
                  <th>Assessment Date</th>
                  <th>Payment Date</th>
                  <th>Days Pending</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {cases.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600, color: '#1a4c96' }}>{c.id}</td>
                    <td>{c.project}</td>
                    <td>{c.parcel}</td>
                    <td style={{ fontWeight: 500 }}>{c.assessed}</td>
                    <td style={{ color: c.status === 'Completed' ? '#16a34a' : '#dc2626', fontWeight: 500 }}>{c.paid}</td>
                    <td>{statusBadge(c.status)}</td>
                    <td>{c.adate}</td>
                    <td>{c.pdate}</td>
                    <td style={{ fontWeight: 700, color: c.days > 60 ? '#dc2626' : c.days > 0 ? '#ea580c' : '#16a34a' }}>
                      {c.days > 0 ? `${c.days} days` : '—'}
                    </td>
                    <td><button className="action-link">View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
            <span>Showing 9 of 3,421 cases</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {[1,2,3,'...',343].map((n,i) => (
                <button key={i} style={{ padding: '2px 8px', border: '1px solid #d1d5db', background: n === 1 ? '#1a4c96' : 'white', color: n === 1 ? 'white' : '#1a2744', borderRadius: 2, fontSize: 12, cursor: 'pointer' }}>{n}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
