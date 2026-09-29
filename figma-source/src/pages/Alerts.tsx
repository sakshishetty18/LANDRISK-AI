import { useState } from 'react';

const allAlerts = [
  { id: 'ALT-001', level: 'Critical', project: 'RJ-004', reasons: ['Objection period expired — 75 days overdue', 'High Court petition filed by 12 land owners', 'Stay risk — imminent legal action'], action: 'Immediately depute LAO and legal counsel. Resolve objections within 7 days.', channels: ['Email', 'SMS', 'Dashboard'], status: 'Acknowledged', generated: '28-Oct-2025 09:10', sent: '28-Oct-2025 09:12', delivered: '28-Oct-2025 09:13', ack: '28-Oct-2025 10:45', resolved: '—' },
  { id: 'ALT-002', level: 'Critical', project: 'NH-001', reasons: ['Compensation pending for 127 owners — 60+ days', '₹ 4.82 Cr unprocessed payments', 'R&R entitlement disputes unresolved'], action: 'Expedite compensation payment. Conduct review meeting with DLO within 48 hours.', channels: ['Email', 'SMS', 'Dashboard'], status: 'Sent', generated: '28-Oct-2025 11:00', sent: '28-Oct-2025 11:02', delivered: '28-Oct-2025 11:03', ack: '—', resolved: '—' },
  { id: 'ALT-003', level: 'High', project: 'MH-005', reasons: ['HC injunction hearing — 05-Nov-2025', 'Legal case filed in Nagpur HC'], action: 'Ensure legal counsel appearance. Prepare counter-affidavit by 01-Nov-2025.', channels: ['Email', 'Dashboard'], status: 'Delivered', generated: '27-Oct-2025 14:00', sent: '27-Oct-2025 14:01', delivered: '27-Oct-2025 14:02', ack: '—', resolved: '—' },
  { id: 'ALT-004', level: 'High', project: 'AP-009', reasons: ['Valuation discrepancy ₹2.4 Cr detected', 'AI document mismatch: Land area +0.75 Ac'], action: 'Conduct physical verification of survey no. 150/2. Refer to District Valuation Officer.', channels: ['Email', 'SMS', 'Dashboard'], status: 'Resolved', generated: '26-Oct-2025 09:00', sent: '26-Oct-2025 09:01', delivered: '26-Oct-2025 09:02', ack: '26-Oct-2025 10:15', resolved: '28-Oct-2025' },
  { id: 'ALT-005', level: 'Medium', project: 'TN-002', reasons: ['Notification objection period ends in 3 days', '42 objections received — hearing not scheduled'], action: 'Schedule objection hearing within 3 days. Notify Collector office.', channels: ['Dashboard'], status: 'Generated', generated: '29-Oct-2025 08:00', sent: '—', delivered: '—', ack: '—', resolved: '—' },
];

const statusSteps = ['Generated', 'Sent', 'Delivered', 'Acknowledged', 'Resolved'];

export default function Alerts() {
  const [filter, setFilter] = useState('All');

  const filtered = filter === 'All' ? allAlerts : allAlerts.filter(a => a.level === filter);

  const levelColor: Record<string,string> = { Critical: '#dc2626', High: '#ea580c', Medium: '#ca8a04' };
  const levelBg: Record<string,string> = { Critical: '#fef2f2', High: '#fff7ed', Medium: '#fefce8' };
  const levelBorder: Record<string,string> = { Critical: '#fca5a5', High: '#fed7aa', Medium: '#fde047' };

  const stepStatus = (alert: typeof allAlerts[0], step: string) => {
    const idx = statusSteps.indexOf(step);
    const curIdx = statusSteps.indexOf(alert.status);
    if (idx < curIdx) return 'done';
    if (idx === curIdx) return 'current';
    return 'pending';
  };

  return (
    <div>
      <div style={{ background: '#1a4c96', color: 'white', padding: '12px 24px' }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>Alerts and Notifications</div>
        <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>
          System-generated alerts for risk events. Notifications dispatched via Email, SMS, and Dashboard.
        </div>
      </div>

      <div className="p-4 max-w-screen-2xl mx-auto" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', padding: '5px 12px', borderRadius: 2, fontSize: 12, color: '#92400e' }}>
          ⚠ <strong>DEMONSTRATION DATA</strong>
        </div>

        {/* Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          {[
            { label: 'Total Alerts (30d)', value: '48', cls: '' },
            { label: 'Critical', value: '12', cls: 'red-top' },
            { label: 'High', value: '18', cls: 'orange-top' },
            { label: 'Unacknowledged', value: '7', cls: 'yellow-top' },
            { label: 'Resolved', value: '24', cls: 'green-top' },
          ].map(b => (
            <div key={b.label} className={`summary-box ${b.cls}`}>
              <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>{b.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#1a2744', marginTop: 4 }}>{b.value}</div>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Filter:</span>
          {['All', 'Critical', 'High', 'Medium'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`gov-btn gov-btn-sm ${filter === f ? 'gov-btn-primary' : 'gov-btn-secondary'}`}
            >{f}</button>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button className="gov-btn gov-btn-secondary gov-btn-sm">Export Alerts</button>
            <button className="gov-btn gov-btn-primary gov-btn-sm">Mark All Acknowledged</button>
          </div>
        </div>

        {/* Alert cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(alert => (
            <div key={alert.id} style={{
              background: levelBg[alert.level],
              border: `1px solid ${levelBorder[alert.level]}`,
              borderLeft: `4px solid ${levelColor[alert.level]}`,
              borderRadius: 2,
              padding: '14px 16px'
            }}>
              {/* Alert header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: levelColor[alert.level], background: levelBorder[alert.level], padding: '2px 8px', borderRadius: 2, textTransform: 'uppercase' }}>
                    {alert.level} RISK ALERT
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1a2744' }}>{alert.id}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1a4c96' }}>Project: {alert.project}</span>
                </div>
                <span style={{ fontSize: 11, color: '#6b7280' }}>{alert.generated}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 10 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1a2744', marginBottom: 4 }}>Reasons:</div>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {alert.reasons.map((r, i) => (
                      <li key={i} style={{ fontSize: 12, color: '#374151', marginBottom: 3 }}>{r}</li>
                    ))}
                  </ul>
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#1a2744', marginBottom: 4 }}>Recommended Action:</div>
                    <div style={{ fontSize: 12, color: '#374151', background: 'rgba(255,255,255,0.6)', padding: '6px 10px', borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
                      {alert.action}
                    </div>
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#6b7280' }}>Channels:</span>
                    {alert.channels.map(c => (
                      <span key={c} style={{ fontSize: 11, background: '#e8eef8', color: '#1a4c96', padding: '2px 6px', borderRadius: 2, border: '1px solid #c3d4ee', fontWeight: 500 }}>{c}</span>
                    ))}
                  </div>
                </div>

                {/* Notification lifecycle */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1a2744', marginBottom: 8 }}>Notification Lifecycle:</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {statusSteps.map(step => {
                      const s = stepStatus(alert, step);
                      const timeMap: Record<string,string> = { Generated: alert.generated, Sent: alert.sent, Delivered: alert.delivered, Acknowledged: alert.ack, Resolved: alert.resolved };
                      return (
                        <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                            background: s === 'done' ? '#16a34a' : s === 'current' ? '#1a4c96' : '#e5e7eb',
                            border: `2px solid ${s === 'done' ? '#16a34a' : s === 'current' ? '#1a4c96' : '#d1d5db'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: s === 'pending' ? '#9ca3af' : 'white', fontSize: 10, fontWeight: 700
                          }}>
                            {s === 'done' ? '✓' : s === 'current' ? '◉' : '○'}
                          </div>
                          <div style={{ fontSize: 12 }}>
                            <span style={{ fontWeight: s === 'pending' ? 400 : 600, color: s === 'pending' ? '#9ca3af' : '#1a2744' }}>{step}</span>
                            {timeMap[step] !== '—' && timeMap[step] && (
                              <span style={{ color: '#6b7280', marginLeft: 6, fontSize: 11 }}>{timeMap[step]}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
                    {alert.status !== 'Resolved' && (
                      <>
                        <button className="gov-btn gov-btn-primary gov-btn-sm">Acknowledge</button>
                        <button className="gov-btn gov-btn-secondary gov-btn-sm">Mark Resolved</button>
                        <button className="gov-btn gov-btn-secondary gov-btn-sm">Escalate</button>
                      </>
                    )}
                    {alert.status === 'Resolved' && (
                      <span className="status-badge badge-completed">✓ Resolved</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
