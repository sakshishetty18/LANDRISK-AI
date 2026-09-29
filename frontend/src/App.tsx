import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import {
  AlertCenter,
  Analytics,
  DataQuality,
  Documents,
  GenericAdmin,
  ModelMonitoring,
  Prediction,
  ProjectIntelligence,
  Projects,
  Recommendations,
  Dashboard,
  GisIntelligence,
  LandParcels,
  WorkflowRecordsPage,
  UsersAdmin,
  ProjectAggregatePage,
  PrototypeNoticePage,
  Reports,
} from "./pages";
import { Icon, Logo, Pill } from "./components";
import { AuthProvider, useAuth } from "./context/AuthContext";

export type Page =
  | "Overview"
  | "Projects"
  | "AI Prediction"
  | "GIS Intelligence"
  | "Analytics"
  | "Recommendations"
  | "Alerts"
  | "Model Monitoring"
  | "Documents"
  | "Data Quality"
  | "Land Parcels"
  | "Land Owners"
  | "Compensation"
  | "Legal Status"
  | "R&R"
  | "Possession"
  | "Reports"
  | "Administration"
  | "Users & Roles"
  | "Audit Logs"
  | "Settings";

const NAV_ROUTES: Record<Page, string> = {
  "Overview": "/dashboard",
  "Projects": "/projects",
  "AI Prediction": "/ai-risk",
  "GIS Intelligence": "/gis",
  "Analytics": "/analytics",
  "Recommendations": "/recommendations",
  "Alerts": "/alerts",
  "Model Monitoring": "/model-monitoring",
  "Documents": "/documents",
  "Data Quality": "/data-quality",
  "Land Parcels": "/parcels",
  "Land Owners": "/owners",
  "Compensation": "/compensation",
  "Legal Status": "/legal",
  "R&R": "/rr",
  "Possession": "/possession",
  "Reports": "/reports",
  "Administration": "/admin",
  "Users & Roles": "/users",
  "Audit Logs": "/audit",
  "Settings": "/settings",
};

const navigation: { label?: string; items: { name: Page; icon: string }[] }[] = [
  { items: [{ name: "Overview", icon: "grid" }] },
  {
    label: "Intelligence",
    items: [
      { name: "Projects", icon: "folder" },
      { name: "AI Prediction", icon: "spark" },
      { name: "GIS Intelligence", icon: "map" },
      { name: "Analytics", icon: "chart" },
      { name: "Recommendations", icon: "bolt" },
      { name: "Alerts", icon: "bell" },
      { name: "Model Monitoring", icon: "pulse" },
    ],
  },
  {
    label: "Data operations",
    items: [
      { name: "Documents", icon: "file" },
      { name: "Data Quality", icon: "check" },
      { name: "Land Parcels", icon: "map" },
      { name: "Land Owners", icon: "users" },
      { name: "Compensation", icon: "file" },
      { name: "Legal Status", icon: "shield" },
      { name: "R&R", icon: "users" },
      { name: "Possession", icon: "check" },
      { name: "Reports", icon: "chart" },
    ],
  },
  {
    label: "Governance",
    items: [
      { name: "Administration", icon: "shield" },
      { name: "Users & Roles", icon: "users" },
      { name: "Audit Logs", icon: "history" },
      { name: "Settings", icon: "settings" },
    ],
  },
];

function pageFromPath(pathname: string): Page {
  if (pathname.startsWith("/projects/")) return "Projects";
  if (pathname === "/" || pathname === "/dashboard") return "Overview";
  const entry = Object.entries(NAV_ROUTES).find(([, route]) => route === pathname);
  return (entry?.[0] as Page) || "Overview";
}

function Login() {
  const { login, error } = useAuth();
  const [email, setEmail] = useState("demo.officer@acquinova.gov.in");
  const [password, setPassword] = useState("acquinova");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch {
      // error surfaced via context
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-visual">
        <div className="login-grid" />
        <div className="login-brand">
          <Logo large />
          <Pill tone="blue">ACADEMIC PROJECT PROTOTYPE</Pill>
          <h1>Predictive analytics for land acquisition delays.</h1>
          <p>
            Research-use decision support combining project data, machine learning,
            and explainable risk signals.
          </p>
        </div>
      </section>
      <section className="login-form-wrap">
        <form className="login-form" onSubmit={signIn}>
          <Pill tone="green"><Icon name="lock" /> SECURE ACCESS</Pill>
          <h2>Officer sign in</h2>
          <p>Sign in to the LANDRISK-AI research prototype.</p>
          <label>EMAIL ADDRESS</label>
          <div className="input-wrap"><Icon name="mail" /><input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
          <label>PASSWORD</label>
          <div className="input-wrap"><Icon name="lock" /><input type="password" value={password} onChange={e => setPassword(e.target.value)} /></div>
          {error && <div className="form-error">{error}</div>}
          <div className="form-row">
            <label className="check-label"><input type="checkbox" defaultChecked /> Remember this device</label>
          </div>
          <button className="primary-button login-button" type="submit" disabled={loading}>
            {loading ? <><span className="loader" /> SIGNING IN</> : <>SIGN IN <Icon name="arrow" /></>}
          </button>
          <div className="security-note"><Icon name="shield" /><span><strong>Backend-validated access</strong><small>JWT authentication and role-based permissions</small></span></div>
          <div className="demo-note">ACADEMIC PROJECT PROTOTYPE · RESEARCH USE ONLY · DATA AND MODEL OUTPUTS ARE SYNTHETIC</div>
        </form>
      </section>
    </main>
  );
}

function TopNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const page = pageFromPath(location.pathname);
  const { user, logout } = useAuth();

  return (
    <header className="landrisk-header">
      <div className="academic-strip">ACADEMIC PROJECT PROTOTYPE <span>·</span> RESEARCH USE ONLY <span>·</span> SYNTHETIC DATA</div>
      <div className="landrisk-brandbar">
        <div className="landrisk-brand">
          <div className="landrisk-mark"><Icon name="map" size={25} /></div>
          <div><strong>LANDRISK-AI</strong><span>Predictive Analytics and Risk Assessment System for Land Acquisition Delays</span></div>
        </div>
        <div className="landrisk-user"><div><strong>{user?.full_name || user?.email}</strong><span>{user?.role}</span></div><button className="secondary-button" onClick={logout}><Icon name="close" /> Sign out</button></div>
      </div>
      <nav className="landrisk-nav" aria-label="Main navigation">
        {navigation.flatMap(group => group.items).map(item => (
          <button
            className={`landrisk-nav-item ${page === item.name ? "active" : ""}`}
            key={item.name}
            onClick={() => navigate(NAV_ROUTES[item.name])}
            aria-current={page === item.name ? "page" : undefined}
          ><Icon name={item.icon} size={16} /><span>{item.name}</span></button>
        ))}
      </nav>
    </header>
  );
}

function AppShell() {
  const navigate = useNavigate();

  return (
    <div className="app-shell landrisk-shell">
      <TopNavigation />
      <main className="page-content">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard onOpenGis={() => navigate("/gis")} onOpenAlerts={() => navigate("/alerts")} onSelectProject={(id) => navigate(`/projects/${id}`)} onRunPrediction={() => navigate("/ai-risk")} />} />
            <Route path="/projects" element={<Projects onSelect={(id) => navigate(`/projects/${id}`)} />} />
            <Route path="/projects/:projectId" element={<ProjectIntelligence />} />
            <Route path="/ai-risk" element={<Prediction standalone />} />
            <Route path="/prediction" element={<Navigate to="/ai-risk" replace />} />
            <Route path="/gis" element={<GisIntelligence onOpenProject={(id) => navigate(`/projects/${id}`)} />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/recommendations" element={<Recommendations />} />
            <Route path="/alerts" element={<AlertCenter />} />
            <Route path="/model-monitoring" element={<ModelMonitoring />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/data-quality" element={<DataQuality />} />
            <Route path="/compensation" element={<WorkflowRecordsPage kind="compensation" />} />
            <Route path="/legal" element={<WorkflowRecordsPage kind="legal" />} />
            <Route path="/rr" element={<WorkflowRecordsPage kind="rr" />} />
            <Route path="/possession" element={<WorkflowRecordsPage kind="possession" />} />
            <Route path="/rr-possession" element={<Navigate to="/rr" replace />} />
            <Route path="/parcels" element={<LandParcels />} />
            <Route path="/owners" element={<WorkflowRecordsPage kind="owners" />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/admin" element={<UsersAdmin />} />
            <Route path="/users" element={<UsersAdmin />} />
            <Route path="/audit" element={<GenericAdmin page="Audit Logs" />} />
            <Route path="/settings" element={<GenericAdmin page="Settings" />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
      </main>
      <footer className="landrisk-footer">LANDRISK-AI · Academic Project Prototype · Research Use Only · Synthetic data and model outputs</footer>
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="app-loading"><span className="loader" /> Loading LANDRISK-AI…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function Routed() {
  const { user, loading } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={loading ? <div className="app-loading"><span className="loader" /></div> : user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routed />
      </AuthProvider>
    </BrowserRouter>
  );
}
