import { useState } from 'react';

const comparisonData = [
  { field: 'Owner Name', db: 'Ramaiah Gowda S/o Narayana', doc: 'Ramaiah Gowda S/o Narayana', result: 'MATCH' },
  { field: 'Survey Number', db: '148/3B', doc: '148/3B', result: 'MATCH' },
  { field: 'Village', db: 'Hosahalli', doc: 'Hosahalli', result: 'MATCH' },
  { field: 'Taluk', db: 'Kolar', doc: 'Kolar', result: 'MATCH' },
  { field: 'District', db: 'Kolar', doc: 'Kolar', result: 'MATCH' },
  { field: 'Land Area', db: '2.10 Acres', doc: '2.85 Acres', result: 'MISMATCH' },
  { field: 'Document Date', db: '—', doc: '14-Feb-2019', result: 'INFO' },
  { field: 'Document Type', db: 'Sale Deed', doc: 'Sale Deed', result: 'MATCH' },
  { field: 'Registration No.', db: 'KL-2019-014872', doc: 'KL-2019-014872', result: 'MATCH' },
  { field: 'Sub-Registrar Office', db: 'Kolar', doc: 'Kolar', result: 'MATCH' },
];

const docQueue = [
  { id: 'DV-001', parcel: 'P-00126', type: 'Sale Deed', owner: 'Ramaiah Gowda', status: 'Mismatch Detected', uploaded: '28-Oct-2025' },
  { id: 'DV-002', parcel: 'P-00128', type: 'Patta', owner: 'Lakshmamma', status: 'Pending Review', uploaded: '27-Oct-2025' },
  { id: 'DV-003', parcel: 'P-00131', type: 'RTC Extract', owner: 'Venkatesh B.', status: 'Verified', uploaded: '26-Oct-2025' },
  { id: 'DV-004', parcel: 'P-00133', type: 'Mutation Certificate', owner: 'Prabha Devi', status: 'AI Processing', uploaded: '29-Oct-2025' },
  { id: 'DV-005', parcel: 'P-00135', type: 'Gift Deed', owner: 'Hanumegowda', status: 'Pending Review', uploaded: '25-Oct-2025' },
];

export default function DocumentVerification() {
  const [selectedDoc, setSelectedDoc] = useState('DV-001');

  const statusColor: Record<string, string> = {
    'Mismatch Detected': '#dc2626',
    'Pending Review': '#ea580c',
    'Verified': '#16a34a',
    'AI Processing': '#1a4c96',
  };

  return (
    <div>
      <div style={{ background: '#1a4c96', color: 'white', padding: '12px 24px' }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>AI-Assisted Document Verification</div>
        <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>
          Upload documents for automated extraction, comparison, and mismatch detection. Officer review and final verification required.
        </div>
      </div>

      <div className="p-4 max-w-screen-2xl mx-auto" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', padding: '6px 14px', borderRadius: 2, fontSize: 12, color: '#92400e' }}>
          ⚠ <strong>DEMONSTRATION DATA</strong> — AI-assisted verification. Final verification and all legal decisions must be performed by the authorized officer.
        </div>

        {/* Workflow steps */}
        <div className="gov-card p-4">
          <div className="gov-section-title">Verification Workflow</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto' }}>
            {['Upload Document','AI Information Extraction','Database Comparison','Mismatch Detection','Officer Review','Verification Decision'].map((step, i) => {
              const active = i <= 3;
              return (
                <div key={step} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{
                    background: active ? '#1a4c96' : '#f5f5f5',
                    border: `1px solid ${active ? '#1a4c96' : '#d1d5db'}`,
                    color: active ? 'white' : '#6b7280',
                    borderRadius: 2, padding: '7px 14px', textAlign: 'center', minWidth: 110
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 600 }}>{i + 1}. {step}</div>
                    <div style={{ fontSize: 10, marginTop: 2, opacity: 0.8 }}>
                      {active ? (i < 3 ? '✓ Done' : 'Current') : 'Awaiting'}
                    </div>
                  </div>
                  {i < 5 && <div style={{ width: 20, height: 2, background: active ? '#1a4c96' : '#d1d5db', flexShrink: 0 }}></div>}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 12 }}>
          {/* Document queue */}
          <div className="gov-card p-4">
            <div className="gov-section-title">Document Queue</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {docQueue.map(d => (
                <div
                  key={d.id}
                  onClick={() => setSelectedDoc(d.id)}
                  style={{
                    padding: '8px 10px', border: '1px solid',
                    borderColor: selectedDoc === d.id ? '#1a4c96' : '#e5e7eb',
                    background: selectedDoc === d.id ? '#e8eef8' : 'white',
                    borderRadius: 2, cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#1a4c96' }}>{d.id}</span>
                    <span style={{ fontSize: 10, color: statusColor[d.status] || '#6b7280', fontWeight: 600 }}>●</span>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{d.owner}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>{d.type} · {d.parcel}</div>
                  <div style={{ fontSize: 10, color: statusColor[d.status] || '#6b7280', marginTop: 3, fontWeight: 600 }}>{d.status}</div>
                </div>
              ))}
              <div style={{ marginTop: 8 }}>
                <div style={{ background: '#f5f5f5', border: '2px dashed #d1d5db', borderRadius: 2, padding: '20px', textAlign: 'center', cursor: 'pointer' }}>
                  <div style={{ fontSize: 24, color: '#d1d5db' }}>📄</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Click to Upload Document</div>
                  <div style={{ fontSize: 10, color: '#9ca3af' }}>PDF, JPEG, PNG — Max 10 MB</div>
                </div>
              </div>
            </div>
          </div>

          {/* Verification detail */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Document preview + extracted info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="gov-card p-4">
                <div className="gov-section-title">Document Preview — DV-001</div>
                <div style={{ background: '#f5f5f5', border: '1px solid #d1d5db', borderRadius: 2, height: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  <svg width="160" height="200" viewBox="0 0 160 200" style={{ border: '1px solid #e5e7eb', boxShadow: '2px 2px 6px rgba(0,0,0,0.1)' }}>
                    <rect width="160" height="200" fill="white" />
                    <rect x="8" y="8" width="144" height="184" fill="none" stroke="#1a4c96" strokeWidth="1" />
                    <text x="80" y="28" textAnchor="middle" fontSize="7" fontWeight="700" fill="#1a2744">GOVERNMENT OF KARNATAKA</text>
                    <text x="80" y="38" textAnchor="middle" fontSize="6" fill="#6b7280">Department of Stamps and Registration</text>
                    <line x1="15" y1="44" x2="145" y2="44" stroke="#1a4c96" strokeWidth="0.5" />
                    <text x="80" y="56" textAnchor="middle" fontSize="8" fontWeight="700" fill="#1a4c96">SALE DEED</text>
                    <text x="80" y="66" textAnchor="middle" fontSize="6" fill="#6b7280">Reg. No: KL-2019-014872</text>
                    {[80, 94, 108, 122, 136, 150, 164, 178].map((y, i) => (
                      <line key={i} x1="15" y1={y} x2={i < 6 ? 145 : 100} y2={y} stroke="#e5e7eb" strokeWidth="0.5" />
                    ))}
                    <text x="15" y="78" fontSize="5" fill="#374151">Owner: Ramaiah Gowda S/o Narayana</text>
                    <text x="15" y="92" fontSize="5" fill="#374151">Survey No: 148/3B, Hosahalli Village</text>
                    <text x="15" y="106" fontSize="5" fill="#374151">Area: 2.85 Acres (as per document)</text>
                    <rect x="15" y="140" width="40" height="30" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="0.5" />
                    <text x="35" y="158" textAnchor="middle" fontSize="5" fill="#6b7280">SEAL</text>
                    <rect x="100" y="140" width="45" height="30" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="0.5" />
                    <text x="122" y="158" textAnchor="middle" fontSize="5" fill="#6b7280">SIGNATURE</text>
                    <text x="15" y="192" fontSize="5" fill="#6b7280">Date: 14-Feb-2019</text>
                  </svg>
                  <div style={{ position: 'absolute', top: 6, right: 6, fontSize: 10, color: '#6b7280', background: 'rgba(255,255,255,0.9)', padding: '2px 6px', border: '1px solid #d1d5db', borderRadius: 2 }}>SAMPLE DOC</div>
                </div>
                <div style={{ marginTop: 8, fontSize: 12, display: 'flex', gap: 6 }}>
                  <button className="gov-btn gov-btn-secondary gov-btn-sm">Zoom</button>
                  <button className="gov-btn gov-btn-secondary gov-btn-sm">Download</button>
                  <button className="gov-btn gov-btn-secondary gov-btn-sm">Rotate</button>
                </div>
              </div>

              <div className="gov-card p-4">
                <div className="gov-section-title">AI Extracted Information</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '6px 10px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 2 }}>
                  <span style={{ fontSize: 18 }}>🤖</span>
                  <div style={{ fontSize: 12 }}>
                    <div style={{ fontWeight: 600, color: '#1d4ed8' }}>AI Extraction Complete</div>
                    <div style={{ color: '#1a2744' }}>Confidence: 94.2% · Model: DocAI v2.1</div>
                  </div>
                </div>
                <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                  <tbody>
                    {[
                      ['Owner Name', 'Ramaiah Gowda S/o Narayana'],
                      ['Survey Number', '148/3B'],
                      ['Village', 'Hosahalli'],
                      ['Taluk', 'Kolar'],
                      ['District', 'Kolar'],
                      ['Land Area', '2.85 Acres'],
                      ['Document Date', '14-Feb-2019'],
                      ['Document Type', 'Sale Deed'],
                      ['Reg. No.', 'KL-2019-014872'],
                    ].map(([k, v]) => (
                      <tr key={k} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '5px 0', color: '#6b7280', width: '45%', fontSize: 12 }}>{k}</td>
                        <td style={{ padding: '5px 0', fontWeight: 500, fontSize: 12 }}>{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Comparison table */}
            <div className="gov-card p-4">
              <div className="gov-section-title">Database vs. Document Comparison</div>
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', padding: '6px 12px', borderRadius: 2, marginBottom: 10, fontSize: 12, color: '#b91c1c', fontWeight: 600 }}>
                ⚠ 1 MISMATCH DETECTED — Field: Land Area. Difference: +0.75 Acres. Requires Officer Review.
              </div>
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Database Record</th>
                    <th>Document</th>
                    <th>Verification Result</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map(row => (
                    <tr key={row.field}>
                      <td style={{ fontWeight: 500 }}>{row.field}</td>
                      <td>{row.db}</td>
                      <td style={{ fontWeight: row.result === 'MISMATCH' ? 700 : 400, color: row.result === 'MISMATCH' ? '#dc2626' : 'inherit' }}>
                        {row.doc}
                      </td>
                      <td>
                        {row.result === 'MATCH' && <span className="status-badge badge-match">✓ MATCH</span>}
                        {row.result === 'MISMATCH' && <span className="status-badge badge-mismatch">✗ MISMATCH</span>}
                        {row.result === 'INFO' && <span className="status-badge badge-inprogress">INFO</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Officer action */}
            <div className="gov-card p-4">
              <div className="gov-section-title">Officer Review & Verification Decision</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#1a2744', display: 'block', marginBottom: 4 }}>Officer Remarks</label>
                  <textarea className="form-input" style={{ width: '100%', height: 80, resize: 'vertical' }} placeholder="Enter remarks regarding discrepancy..." />
                  <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                    <button className="gov-btn gov-btn-primary">Accept with Note</button>
                    <button className="gov-btn" style={{ background: '#dc2626', color: 'white', padding: '6px 16px', fontSize: 13, borderRadius: 2, border: 'none', cursor: 'pointer' }}>Reject Document</button>
                    <button className="gov-btn gov-btn-secondary">Request Re-upload</button>
                  </div>
                </div>
                <div style={{ padding: '10px 14px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 2, fontSize: 12 }}>
                  <div style={{ fontWeight: 700, color: '#92400e', marginBottom: 6 }}>IMPORTANT NOTICE</div>
                  <p style={{ color: '#92400e', lineHeight: 1.6 }}>
                    AI-assisted verification is an automated pre-screening tool only. It does not constitute legal verification.
                    Final verification, approval, and all legal decisions regarding land documents must be performed exclusively by
                    the <strong>authorized officer</strong> as per the Right to Fair Compensation and Transparency in Land Acquisition,
                    Rehabilitation and Resettlement Act, 2013.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
