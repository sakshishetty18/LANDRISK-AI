import { useState } from 'react';

const NAV_ITEMS = [
  'Home', 'Dashboard', 'Projects', 'Land Parcels', 'Land Owners',
  'Documents', 'Compensation', 'Legal Status', 'R&R', 'Possession',
  'GIS Map', 'AI Risk Assessment', 'Alerts', 'Reports', 'Administration',
];

interface HeaderProps {
  activePage: string;
  onNavigate: (page: string) => void;
}

export default function Header({ activePage, onNavigate }: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <header className="w-full sticky top-0 z-50 shadow-sm" style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.15)' }}>
      {/* Top strip */}
      <div style={{ background: '#f0f0f0', borderBottom: '1px solid #d1d5db' }} className="px-4 py-1 flex items-center justify-between">
        <span style={{ fontSize: '12px', color: '#555' }}>
          Government of India &nbsp;|&nbsp; Ministry of Road Transport and Highways &nbsp;|&nbsp; <span style={{ color: '#1a4c96', fontWeight: 600 }}>e-Governance Portal</span>
        </span>
        <div style={{ fontSize: '11px', color: '#555' }} className="flex gap-4">
          <span>Screen Reader Access</span>
          <span>|</span>
          <span>Skip to Main Content</span>
          <span>|</span>
          <span style={{ fontWeight: 600 }}>A- &nbsp; A &nbsp; A+</span>
          <span>|</span>
          <span>हिन्दी</span>
          <span>|</span>
          <span>English</span>
        </div>
      </div>

      {/* Main header */}
      <div style={{ background: 'white', borderBottom: '1px solid #d1d5db' }} className="px-4 py-3">
        <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-4">
            {/* Government emblem placeholder */}
            <div style={{
              width: 64, height: 64, background: '#1a4c96',
              borderRadius: '50%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', flexShrink: 0, border: '2px solid #0f3070'
            }}>
              <div style={{ textAlign: 'center', color: 'white' }}>
                <div style={{ fontSize: '20px', lineHeight: 1 }}>⚖</div>
                <div style={{ fontSize: '7px', fontWeight: 700, marginTop: 2, letterSpacing: '0.05em' }}>EMBLEM</div>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#555', fontWeight: 500 }}>GOVERNMENT OF INDIA | MINISTRY OF ROAD TRANSPORT AND HIGHWAYS</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#1a4c96', letterSpacing: '0.05em', lineHeight: 1.1 }}>
                LANDRISK-AI
              </div>
              <div style={{ fontSize: '12px', color: '#1a2744', fontWeight: 600, marginTop: 2 }}>
                Predictive Analytics and Risk Assessment System
              </div>
              <div style={{ fontSize: '11px', color: '#555' }}>
                for Land Acquisition Delays &nbsp;|&nbsp; Version 2.1.0
              </div>
            </div>
          </div>

          {/* Right utilities */}
          <div className="flex items-center gap-3">
            {searchOpen && (
              <input
                className="form-input"
                style={{ width: 220 }}
                placeholder="Search projects, parcels..."
                autoFocus
                onBlur={() => setSearchOpen(false)}
              />
            )}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              style={{ background: 'none', border: '1px solid #d1d5db', padding: '5px 10px', borderRadius: 2, cursor: 'pointer', fontSize: 12, color: '#1a2744' }}
            >
              🔍 Search
            </button>
            <button style={{ background: 'none', border: '1px solid #d1d5db', padding: '5px 10px', borderRadius: 2, cursor: 'pointer', fontSize: 12, color: '#1a2744' }}>
              ♿ Accessibility
            </button>
            <button style={{ background: 'none', border: '1px solid #d1d5db', padding: '5px 10px', borderRadius: 2, cursor: 'pointer', fontSize: 12, color: '#1a2744' }}>
              ❓ Help
            </button>
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                style={{ background: 'none', border: '1px solid #d1d5db', padding: '5px 10px', borderRadius: 2, cursor: 'pointer', fontSize: 12, color: '#1a2744', position: 'relative' }}
              >
                🔔 Alerts
                <span style={{
                  position: 'absolute', top: -4, right: -4, background: '#dc2626',
                  color: 'white', borderRadius: '50%', width: 16, height: 16,
                  fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700
                }}>5</span>
              </button>
              {notifOpen && (
                <div style={{
                  position: 'absolute', right: 0, top: '110%', width: 280,
                  background: 'white', border: '1px solid #d1d5db', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  zIndex: 100, borderRadius: 2
                }}>
                  <div style={{ padding: '8px 12px', background: '#1a4c96', color: 'white', fontSize: 12, fontWeight: 600 }}>
                    Recent Alerts (5 Unread)
                  </div>
                  {[
                    { label: 'NH-001: Compensation overdue — 45 days', level: 'red' },
                    { label: 'MH-005: Legal case filed in High Court', level: 'orange' },
                    { label: 'KA-003: Document mismatch detected', level: 'orange' },
                    { label: 'TN-002: Possession delayed — 30 days', level: 'red' },
                    { label: 'GJ-007: R&R pending review', level: 'orange' },
                  ].map((n, i) => (
                    <div key={i} style={{ padding: '7px 12px', borderBottom: '1px solid #f3f4f6', fontSize: 12, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ color: n.level === 'red' ? '#dc2626' : '#ea580c', marginTop: 1 }}>●</span>
                      <span>{n.label}</span>
                    </div>
                  ))}
                  <div style={{ padding: '6px 12px', textAlign: 'center' }}>
                    <button className="action-link" style={{ fontSize: 12 }} onClick={() => { setNotifOpen(false); onNavigate('Alerts'); }}>
                      View All Alerts →
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', border: '1px solid #d1d5db', borderRadius: 2, cursor: 'pointer' }}>
              <div style={{
                width: 28, height: 28, background: '#1a4c96', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 700
              }}>RK</div>
              <div style={{ fontSize: 12 }}>
                <div style={{ fontWeight: 600, color: '#1a2744' }}>Rajesh Kumar</div>
                <div style={{ color: '#6b7280', fontSize: 11 }}>Project Director</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation bar */}
      <nav style={{ background: '#1a4c96', borderBottom: '2px solid #0f3070' }}>
        <div className="max-w-screen-2xl mx-auto flex overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {NAV_ITEMS.map(item => (
            <button
              key={item}
              onClick={() => onNavigate(item)}
              className={`nav-link ${activePage === item ? 'active' : ''}`}
              style={{ color: 'white', background: 'none', border: 'none', outline: 'none' }}
            >
              {item}
            </button>
          ))}
        </div>
      </nav>
    </header>
  );
}
