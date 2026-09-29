import { useState } from 'react';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import ProjectDetail from './pages/ProjectDetail';
import LandParcels from './pages/LandParcels';
import DocumentVerification from './pages/DocumentVerification';
import Compensation from './pages/Compensation';
import LegalStatus from './pages/LegalStatus';
import GISMap from './pages/GISMap';
import AIRiskAssessment from './pages/AIRiskAssessment';
import Alerts from './pages/Alerts';
import Reports from './pages/Reports';

type Page = string;

export default function App() {
  const [activePage, setActivePage] = useState<Page>('Dashboard');
  const [selectedProject, setSelectedProject] = useState<string | undefined>(undefined);

  const navigate = (page: string, sub?: string) => {
    setActivePage(page);
    if (sub) setSelectedProject(sub);
  };

  const renderPage = () => {
    switch (activePage) {
      case 'Home':
      case 'Dashboard': return <Dashboard onNavigate={navigate} />;
      case 'Projects': return <ProjectDetail projectId={selectedProject || 'NH-001'} onNavigate={navigate} />;
      case 'Land Parcels': return <LandParcels />;
      case 'Documents': return <DocumentVerification />;
      case 'Compensation': return <Compensation />;
      case 'Legal Status': return <LegalStatus />;
      case 'GIS Map': return <GISMap />;
      case 'AI Risk Assessment': return <AIRiskAssessment />;
      case 'Alerts': return <Alerts />;
      case 'Reports': return <Reports />;
      default: return <PlaceholderPage name={activePage} onNavigate={navigate} />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', flexDirection: 'column' }}>
      <Header activePage={activePage} onNavigate={navigate} />
      <main style={{ flex: 1 }}>
        {renderPage()}
      </main>
      <footer style={{ background: '#1a2744', color: 'rgba(255,255,255,0.7)', borderTop: '2px solid #1a4c96', padding: '12px 24px', fontSize: 11, textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1600px', margin: '0 auto' }}>
          <span>LandRisk-AI v2.1.0 &nbsp;|&nbsp; Predictive Analytics and Risk Assessment System for Land Acquisition Delays</span>
          <span>Ministry of Road Transport and Highways, Government of India &nbsp;|&nbsp; Powered by NIC</span>
          <span>Last Updated: 29-Oct-2025 &nbsp;|&nbsp; <strong style={{ color: '#fcd34d' }}>DEMO DATA</strong></span>
        </div>
      </footer>
    </div>
  );
}

function PlaceholderPage({ name, onNavigate }: { name: string; onNavigate: (p: string) => void }) {
  const pageMap: Record<string, { desc: string; links: string[] }> = {
    'Land Owners': { desc: 'Land owner database with contact details, ownership verification status, and compensation records.', links: ['Land Parcels', 'Compensation', 'Documents'] },
    'R&R': { desc: 'Rehabilitation and Resettlement monitoring — entitlement status, R&R package disbursement, and resettlement site allocation.', links: ['Compensation', 'Projects', 'Alerts'] },
    'Possession': { desc: 'Possession tracking — physical possession status, joint measurement surveys, and handover records.', links: ['Projects', 'Land Parcels', 'GIS Map'] },
    'Administration': { desc: 'User management, role assignments, system configuration, audit logs, and notification settings.', links: ['Reports', 'Alerts'] },
  };
  const info = pageMap[name] || { desc: `${name} module — data entry, tracking, and reporting for this module.`, links: ['Dashboard'] };

  return (
    <div>
      <div style={{ background: '#1a4c96', color: 'white', padding: '12px 24px' }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>{name}</div>
        <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>{info.desc}</div>
      </div>
      <div className="p-4 max-w-screen-2xl mx-auto">
        <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', padding: '5px 12px', borderRadius: 2, fontSize: 12, color: '#92400e', marginBottom: 16 }}>
          ⚠ <strong>DEMONSTRATION DATA</strong>
        </div>
        <div className="gov-card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏗</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1a2744', marginBottom: 8 }}>{name} Module</div>
          <div style={{ fontSize: 13, color: '#6b7280', maxWidth: 500, margin: '0 auto 20px' }}>{info.desc}</div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            {info.links.map(l => (
              <button key={l} className="gov-btn gov-btn-secondary" onClick={() => onNavigate(l)}>Go to {l}</button>
            ))}
            <button className="gov-btn gov-btn-primary" onClick={() => onNavigate('Dashboard')}>Back to Dashboard</button>
          </div>
        </div>
      </div>
    </div>
  );
}
