const parcels = [
  { id: 'P-00124', survey: '147/2A', village: 'Krishnapura', taluk: 'Kolar', district: 'Kolar', area: '1.24 Ac', owner: 'O-4521', ownership: 'Private', acq: 'Notified', comp: 'Pending', legal: 'Clear', possession: 'Pending' },
  { id: 'P-00125', survey: '148/1', village: 'Krishnapura', taluk: 'Kolar', district: 'Kolar', area: '0.87 Ac', owner: 'O-4522', ownership: 'Private', acq: 'Awarded', comp: 'Completed', legal: 'Clear', possession: 'Taken' },
  { id: 'P-00126', survey: '148/3B', village: 'Hosahalli', taluk: 'Kolar', district: 'Kolar', area: '2.10 Ac', owner: 'O-4523', ownership: 'Private', acq: 'Notified', comp: 'Pending', legal: 'Disputed', possession: 'Pending' },
  { id: 'P-00127', survey: '149/1', village: 'Hosahalli', taluk: 'Kolar', district: 'Kolar', area: '0.55 Ac', owner: 'O-4524', ownership: 'Govt', acq: 'Awarded', comp: 'N/A', legal: 'Clear', possession: 'Taken' },
  { id: 'P-00128', survey: '150/2', village: 'Malur', taluk: 'Malur', district: 'Kolar', area: '3.20 Ac', owner: 'O-4525', ownership: 'Private', acq: 'Identified', comp: 'Pending', legal: 'Clear', possession: 'Pending' },
  { id: 'P-00129', survey: '151/1A', village: 'Malur', taluk: 'Malur', district: 'Kolar', area: '1.80 Ac', owner: 'O-4526', ownership: 'Private', acq: 'Awarded', comp: 'Overdue', legal: 'Dispute Filed', possession: 'Pending' },
  { id: 'P-00130', survey: '152/3', village: 'Srinivasapura', taluk: 'Srinivasapura', district: 'Kolar', area: '0.92 Ac', owner: 'O-4527', ownership: 'Private', acq: 'Awarded', comp: 'Completed', legal: 'Clear', possession: 'Taken' },
  { id: 'P-00131', survey: '153/2B', village: 'Srinivasapura', taluk: 'Srinivasapura', district: 'Kolar', area: '0.85 Ac', owner: 'O-4528', ownership: 'Private', acq: 'Notified', comp: 'Pending', legal: 'Clear', possession: 'Pending' },
  { id: 'P-00132', survey: '154/1', village: 'Bangarpet', taluk: 'Bangarpet', district: 'Kolar', area: '2.40 Ac', owner: 'O-4529', ownership: 'Joint', acq: 'Identified', comp: 'Pending', legal: 'Clear', possession: 'Pending' },
  { id: 'P-00133', survey: '155/4A', village: 'Bangarpet', taluk: 'Bangarpet', district: 'Kolar', area: '1.55 Ac', owner: 'O-4530', ownership: 'Private', acq: 'Awarded', comp: 'Completed', legal: 'Clear', possession: 'Taken' },
];

const statusBadge = (s: string) => {
  const map: Record<string,string> = {
    Completed: 'badge-completed', Awarded: 'badge-completed', Taken: 'badge-completed', Clear: 'badge-completed',
    'In Progress': 'badge-inprogress', Notified: 'badge-inprogress', 'N/A': 'badge-inprogress',
    Pending: 'badge-pending', Identified: 'badge-pending',
    Overdue: 'badge-overdue', Disputed: 'badge-overdue', 'Dispute Filed': 'badge-overdue',
  };
  return <span className={`status-badge ${map[s] || ''}`}>{s}</span>;
};

export default function LandParcels() {
  return (
    <div>
      <div style={{ background: '#1a4c96', color: 'white', padding: '12px 24px' }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>Land Parcels</div>
        <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>
          Detailed records for all identified land parcels across projects.
        </div>
      </div>

      <div className="p-4 max-w-screen-2xl mx-auto" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', padding: '5px 12px', borderRadius: 2, fontSize: 12, color: '#92400e' }}>
          ⚠ <strong>DEMONSTRATION DATA</strong>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          {[
            { label: 'Total Parcels', value: '1,24,870', cls: '' },
            { label: 'Possession Taken', value: '87,420', cls: 'green-top' },
            { label: 'Compensation Pending', value: '21,840', cls: 'orange-top' },
            { label: 'Legal Disputes', value: '1,284', cls: 'red-top' },
            { label: 'Govt / Forest Land', value: '14,210', cls: '' },
          ].map(b => (
            <div key={b.label} className={`summary-box ${b.cls}`}>
              <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>{b.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#1a2744', marginTop: 4 }}>{b.value}</div>
            </div>
          ))}
        </div>

        <div className="gov-card p-4">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div className="gov-section-title" style={{ marginBottom: 0 }}>Land Parcel Records</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="form-input" placeholder="Search Parcel ID / Survey No." style={{ width: 200 }} />
              <select className="form-input"><option>All Districts</option><option>Kolar</option><option>Wardha</option><option>Salem</option></select>
              <select className="form-input"><option>All Acq. Status</option><option>Identified</option><option>Notified</option><option>Awarded</option></select>
              <button className="gov-btn gov-btn-secondary gov-btn-sm">Export Excel</button>
              <button className="gov-btn gov-btn-primary gov-btn-sm">Add Parcel</button>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="gov-table">
              <thead>
                <tr>
                  <th>Parcel ID</th>
                  <th>Survey Number</th>
                  <th>Village</th>
                  <th>Taluk</th>
                  <th>District</th>
                  <th>Land Area</th>
                  <th>Owner/Party ID</th>
                  <th>Ownership Type</th>
                  <th>Acquisition Status</th>
                  <th>Compensation</th>
                  <th>Legal Status</th>
                  <th>Possession</th>
                  <th>Action</th>
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
                    <td><button className="action-link">View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
            <span>Showing 10 of 1,24,870 parcels</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {[1,2,3,'...',12487].map((n,i) => (
                <button key={i} style={{ padding: '2px 8px', border: '1px solid #d1d5db', background: n === 1 ? '#1a4c96' : 'white', color: n === 1 ? 'white' : '#1a2744', borderRadius: 2, fontSize: 12, cursor: 'pointer' }}>{n}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
