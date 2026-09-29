const cases = [
  { id: 'LC-0041', project: 'MH-005', parcel: 'P-01022', issue: 'Title Dispute — Multiple Claimants', date: '12-Aug-2025', status: 'Pending', days: 78, next: 'Hearing — 10-Nov-2025', officer: 'D.K. Sharma, DLO' },
  { id: 'LC-0042', project: 'RJ-004', parcel: 'P-05001', issue: 'Stay Order — High Court Injunction', date: '20-Jul-2025', status: 'Critical', days: 101, next: 'HC Hearing — 05-Nov-2025', officer: 'A.S. Mehta, LAO' },
  { id: 'LC-0043', project: 'NH-001', parcel: 'P-00126', issue: 'Compensation Amount Dispute', date: '05-Sep-2025', status: 'Pending', days: 54, next: 'Officer Meeting — 08-Nov-2025', officer: 'R. Nair, DLO' },
  { id: 'LC-0044', project: 'TN-002', parcel: 'P-03210', issue: 'Objection Under Sec. 15 RFCTLARR', date: '02-Oct-2025', status: 'Pending', days: 27, next: 'Objection Hearing — 15-Nov-2025', officer: 'K. Suresh, Collector' },
  { id: 'LC-0045', project: 'AP-009', parcel: 'P-06012', issue: 'Valuation Discrepancy — ₹2.4 Cr', date: '14-Sep-2025', status: 'Pending', days: 45, next: 'Valuation Revision — 12-Nov-2025', officer: 'P. Reddy, DLO' },
  { id: 'LC-0046', project: 'GJ-007', parcel: 'P-02104', issue: 'R&R Entitlement Dispute', date: '22-Aug-2025', status: 'Resolved', days: 0, next: '—', officer: 'M.J. Shah, LAO' },
  { id: 'LC-0047', project: 'KA-003', parcel: 'P-00711', issue: 'Ownership Proof — Documents Incomplete', date: '18-Sep-2025', status: 'Pending', days: 41, next: 'Document Review — 14-Nov-2025', officer: 'S. Kumar, DLO' },
];

export default function LegalStatus() {
  const statusBadge = (s: string) => {
    const map: Record<string,string> = { Resolved: 'badge-completed', Pending: 'badge-pending', Critical: 'badge-overdue' };
    return <span className={`status-badge ${map[s] || ''}`}>{s}</span>;
  };

  return (
    <div>
      <div style={{ background: '#1a4c96', color: 'white', padding: '12px 24px' }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>Legal / Compliance Monitoring</div>
        <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>
          Track legal cases, disputes, court orders, and compliance actions across all projects.
        </div>
      </div>

      <div className="p-4 max-w-screen-2xl mx-auto" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', padding: '5px 12px', borderRadius: 2, fontSize: 12, color: '#92400e' }}>
          ⚠ <strong>DEMONSTRATION DATA</strong>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {[
            { label: 'Total Cases', value: '284', cls: '' },
            { label: 'Pending', value: '198', cls: 'orange-top' },
            { label: 'Resolved', value: '72', cls: 'green-top' },
            { label: 'Priority / Critical', value: '14', cls: 'red-top' },
          ].map(b => (
            <div key={b.label} className={`summary-box ${b.cls}`}>
              <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>{b.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#1a2744', marginTop: 4 }}>{b.value}</div>
            </div>
          ))}
        </div>

        {/* Priority alert */}
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderLeft: '3px solid #dc2626', padding: '10px 14px', borderRadius: 2 }}>
          <div style={{ fontWeight: 700, color: '#b91c1c', fontSize: 13 }}>PRIORITY ALERT — High Court Injunction Active</div>
          <div style={{ fontSize: 12, color: '#374151', marginTop: 4 }}>
            Case LC-0042 (RJ-004): Rajasthan High Court has issued a stay order on land possession activities in survey numbers 150/1 to 155/3, District Alwar.
            Hearing scheduled for <strong>05-Nov-2025</strong>. Presence of Legal Counsel mandatory.
          </div>
        </div>

        <div className="gov-card p-4">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div className="gov-section-title" style={{ marginBottom: 0 }}>Legal Cases</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <select className="form-input"><option>All Projects</option><option>NH-001</option><option>MH-005</option><option>RJ-004</option></select>
              <select className="form-input"><option>All Status</option><option>Critical</option><option>Pending</option><option>Resolved</option></select>
              <button className="gov-btn gov-btn-secondary gov-btn-sm">Export Excel</button>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="gov-table">
              <thead>
                <tr>
                  <th>Case ID</th>
                  <th>Project</th>
                  <th>Parcel</th>
                  <th>Issue / Nature</th>
                  <th>Filed Date</th>
                  <th>Current Status</th>
                  <th>Days Pending</th>
                  <th>Next Action</th>
                  <th>Responsible Officer</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {cases.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600, color: '#1a4c96' }}>{c.id}</td>
                    <td>{c.project}</td>
                    <td>{c.parcel}</td>
                    <td style={{ maxWidth: 200 }}><span title={c.issue}>{c.issue}</span></td>
                    <td>{c.date}</td>
                    <td>{statusBadge(c.status)}</td>
                    <td style={{ fontWeight: 700, color: c.days > 60 ? '#dc2626' : c.days > 0 ? '#ea580c' : '#16a34a' }}>
                      {c.days > 0 ? `${c.days} days` : '—'}
                    </td>
                    <td style={{ fontSize: 12 }}>{c.next}</td>
                    <td style={{ fontSize: 12 }}>{c.officer}</td>
                    <td><button className="action-link">View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
            Showing 7 of 284 cases
          </div>
        </div>
      </div>
    </div>
  );
}
