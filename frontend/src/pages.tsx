import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import type { Page } from "./App";
import { Donut, Icon, MetricCard, Pill, ProgressBar, RiskBadge, SectionHeader, SelectButton, Sparkline } from "./components";
import { LeafletMap } from "./components/LeafletMap";
import { useApi, formatFeatureName, riskStatus, riskTone, formatINR } from "./hooks/useApi";
import {
  analyticsApi, alertsApi, auditApi, dataQualityApi, documentsApi, gisApi, modelApi,
  adminUsersApi, parcelsApi, ownersApi, compensationApi, legalCasesApi, rrApi, possessionApi, predictionsApi, projectsApi,
  type LandParcel, type LandParcelWrite, type LandOwner, type CompensationRecord, type LegalCase, type ResettlementRecord, type PossessionRecord,
  type Project, type ProjectWrite, type MapProject, type Prediction as PredictionResult, type Alert, type StateStat,
} from "./services/api";
import { useAuth } from "./context/AuthContext";

function DemoLabel() {
  return <span className="demo-label">SYNTHETIC PROTOTYPE DATA</span>;
}

function ErrorPanel({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="panel" style={{ padding: 24, color: "var(--red, #ef4444)" }}>
      <strong>Couldn't load data:</strong> {message}
      {onRetry && <button className="secondary-button" style={{ marginLeft: 12 }} onClick={onRetry}>Retry</button>}
    </div>
  );
}

function Loading({ label = "Loading…" }: { label?: string }) {
  return <div className="panel" style={{ padding: 24, display: "flex", alignItems: "center", gap: 10 }}><span className="loader" /> {label}</div>;
}

// ---------------------------------------------------------------------------
// Shared: portfolio row = Project fields merged with its latest prediction
// ---------------------------------------------------------------------------

interface PortfolioRow {
  project_id: string;
  project_name: string;
  state: string;
  district: string;
  current_stage: string;
  risk_score: number | null;
  risk_category: string;
  probability_of_delay: number | null;
  expected_delay_days: number | null;
  compensation_pending?: number;
  legal_cases?: number;
}

function mergePortfolio(projects: Project[] | null, mapRows: MapProject[] | null): PortfolioRow[] {
  const byId = new Map((mapRows || []).map((m) => [m.project_id, m]));
  return (projects || []).map((p) => {
    const m = byId.get(p.project_id);
    return {
      project_id: p.project_id,
      project_name: p.project_name,
      state: p.state,
      district: p.district,
      current_stage: p.current_stage,
      risk_score: m?.risk_score ?? null,
      risk_category: m?.risk_category ?? "UNSCORED",
      probability_of_delay: m?.probability_of_delay ?? null,
      expected_delay_days: m?.expected_delay_days ?? null,
      compensation_pending: p.compensation_pending,
      legal_cases: p.legal_cases,
    };
  });
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export function Dashboard({
  onOpenGis, onOpenAlerts, onSelectProject, onRunPrediction,
}: {
  onOpenGis: () => void; onOpenAlerts: () => void; onSelectProject: (id: string) => void; onRunPrediction: () => void;
}) {
  const overview = useApi(() => analyticsApi.overview(), []);
  const domainOverview = useApi(() => analyticsApi.domainOverview(), []);
  const mapRows = useApi(() => gisApi.projects(), []);
  const alerts = useApi(() => alertsApi.list("NEW"), []);
  const importance = useApi(() => modelApi.featureImportance(), []);
  const projectRecords = useApi(() => projectsApi.list({ limit: 500 }), []);
  const states = useApi(() => analyticsApi.byState(), []);
  const districts = useApi(() => analyticsApi.byDistrict(), []);

  const topRisk = useMemo(
    () => [...(mapRows.data || [])].sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0)).slice(0, 6),
    [mapRows.data]
  );

  return <>
    <SectionHeader eyebrow="EXECUTIVE COMMAND CENTER" title="National Land Acquisition Intelligence" description="AI-powered early warning system for acquisition delays across India's critical infrastructure portfolio." actions={<><DemoLabel /><button className="primary-button" onClick={onRunPrediction}><Icon name="spark" /> Run prediction</button></>} />
    {overview.loading ? <Loading label="Loading portfolio overview…" /> : overview.error ? <ErrorPanel message={overview.error} onRetry={overview.reload} /> : overview.data && (
      <div className="metrics-grid">
        <MetricCard label="TOTAL PROJECTS" value={String(overview.data.total_projects)} trend="" detail="in portfolio" icon="folder" />
        <MetricCard label="AT RISK" value={String(overview.data.projects_at_risk)} trend="" detail="medium risk or above" icon="pulse" tone="amber" variant={1} />
        <MetricCard label="CRITICAL" value={String(overview.data.critical_projects)} trend="" detail="critical risk category" icon="bolt" tone="red" />
        <MetricCard label="AVG RISK SCORE" value={overview.data.average_risk_score.toFixed(1)} trend="" detail="/ 100 portfolio avg." icon="history" tone="violet" variant={1} />
        <MetricCard label="AVG PREDICTED DELAY" value={`${overview.data.average_predicted_delay.toFixed(0)} days`} trend="" detail="model estimate" icon="file" tone="cyan" />
        <MetricCard label="NEEDS INTERVENTION" value={String(overview.data.projects_requiring_intervention)} trend="" detail="high or critical risk" icon="map" tone="green" variant={1} />
      </div>
    )}
    {domainOverview.loading ? <Loading label="Loading domain record counts…" /> : domainOverview.error ? <ErrorPanel message={domainOverview.error} onRetry={domainOverview.reload} /> : domainOverview.data && <div className="metrics-grid domain-metrics">
      <MetricCard label="LAND PARCELS" value={String(domainOverview.data.total_parcels)} detail="synthetic prototype records" trend="" icon="map" tone="cyan" />
      <MetricCard label="LAND OWNERS" value={String(domainOverview.data.total_owners)} detail="linked to parcels/projects" trend="" icon="users" tone="green" />
      <MetricCard label="COMPENSATION CASES" value={String(domainOverview.data.compensation_cases)} detail={`${formatINR(domainOverview.data.compensation_pending_amount)} pending`} trend="" icon="file" tone="amber" />
      <MetricCard label="LEGAL CASES" value={String(domainOverview.data.legal_cases)} detail="case records" trend="" icon="shield" tone="red" />
      <MetricCard label="DOCUMENT REVIEW" value={String(domainOverview.data.documents_pending_review)} detail={`of ${domainOverview.data.documents} metadata/file records`} trend="" icon="file" />
      <MetricCard label="R&R RECORDS" value={String(domainOverview.data.rr_records)} detail={`${domainOverview.data.rr_completed} completed`} trend="" icon="users" tone="violet" />
      <MetricCard label="POSSESSION" value={String(domainOverview.data.possession_taken)} detail={`taken of ${domainOverview.data.possession_records} records`} trend="" icon="check" tone="green" />
    </div>}
    <div className="dashboard-primary">
      <RiskIntelligence overview={overview.data} importance={importance.data} onOpen={onRunPrediction} />
      <MiniMap points={topRisk} onOpen={onOpenGis} onSelect={onSelectProject} />
    </div>
    <DashboardSignals points={mapRows.data || []} projects={projectRecords.data || []} states={states.data || []} districts={districts.data || []} />
    <div className="dashboard-secondary">
      <PortfolioTable rows={topRisk} loading={mapRows.loading} compact onSelect={onSelectProject} onViewAll={() => onSelectProject("")} />
      <AlertsPreview alerts={alerts.data} loading={alerts.loading} onOpen={onOpenAlerts} />
    </div>
  </>;
}

function DashboardSignals({ points, projects, states, districts }: { points: MapProject[]; projects: Project[]; states: StateStat[]; districts: { state: string; district: string; project_count: number; average_risk_score: number }[] }) {
  const riskDistribution = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "UNSCORED"].map(category => ({
    category,
    count: points.filter(point => point.risk_category === category).length,
  }));
  const stages = useMemo(() => {
    const grouped = new Map<string, { count: number; acquisition: number }>();
    for (const project of projects) {
      const current = grouped.get(project.current_stage) || { count: 0, acquisition: 0 };
      current.count += 1;
      current.acquisition += project.acquisition_percentage;
      grouped.set(project.current_stage, current);
    }
    return Array.from(grouped, ([stage, values]) => ({
      stage,
      project_count: values.count,
      acquisition: values.acquisition / values.count,
    })).sort((a, b) => b.project_count - a.project_count).slice(0, 8);
  }, [projects]);

  return <div className="dashboard-signals">
    <section className="panel chart-card">
      <div className="panel-head"><div><span className="eyebrow">CURRENT MODEL SCORES</span><h3>Risk distribution</h3></div></div>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart><Pie data={riskDistribution.filter(row => row.count > 0)} dataKey="count" nameKey="category" outerRadius={78} label={({ category, count }) => `${category}: ${count}`}>
          {riskDistribution.map(row => <Cell key={row.category} fill={RISK_PIE_COLORS[row.category] || "#64748b"} />)}
        </Pie><Tooltip /></PieChart>
      </ResponsiveContainer>
      <div className="chart-foot">Based on each project's latest saved prediction.</div>
    </section>
    <section className="panel chart-card">
      <div className="panel-head"><div><span className="eyebrow">ACQUISITION STATUS</span><h3>Projects by current stage</h3></div></div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={stages} margin={{ top: 8, right: 10, left: -18, bottom: 26 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#dce2e7" />
          <XAxis dataKey="stage" tick={{ fontSize: 9, fill: "#56616b" }} angle={-25} textAnchor="end" interval={0} />
          <YAxis tick={{ fontSize: 9, fill: "#56616b" }} />
          <Tooltip />
          <Bar dataKey="project_count" name="Projects" fill="#1a4c96" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <div className="chart-foot">Portfolio average land acquired: {projects.length ? `${(projects.reduce((sum, project) => sum + project.acquisition_percentage, 0) / projects.length).toFixed(1)}%` : "—"}</div>
    </section>
    <section className="panel chart-card state-summary">
      <div className="panel-head"><div><span className="eyebrow">GEOGRAPHIC SUMMARY</span><h3>Highest average risk by state</h3></div></div>
      <div className="state-summary-list">{states.slice(0, 7).map(state => <div key={state.state}><span>{state.state}</span><strong>{state.average_risk_score.toFixed(1)}</strong><small>{state.project_count} projects</small></div>)}</div>
      <div className="chart-foot">Risk averages use projects with saved predictions.</div>
    </section>
    <section className="panel chart-card state-summary">
      <div className="panel-head"><div><span className="eyebrow">DISTRICT SUMMARY</span><h3>Highest average risk by district</h3></div></div>
      <div className="state-summary-list">{districts.slice(0, 7).map(district => <div key={`${district.state}-${district.district}`}><span>{district.district}<small>{district.state}</small></span><strong>{district.average_risk_score.toFixed(1)}</strong><small>{district.project_count} projects</small></div>)}</div>
      <div className="chart-foot">Risk averages use projects with saved predictions.</div>
    </section>
  </div>;
}

function RiskIntelligence({ overview, importance, onOpen }: { overview: any; importance: { feature: string; mean_abs_shap: number }[] | null; onOpen: () => void }) {
  const gaugeValue = overview ? Math.round(overview.average_risk_score) : 0;
  const tone = riskTone(gaugeValue > 80 ? "CRITICAL" : gaugeValue > 60 ? "HIGH" : gaugeValue > 30 ? "MEDIUM" : "LOW");
  const topDrivers = (importance || []).slice(0, 5);
  const maxImportance = Math.max(...topDrivers.map((d) => d.mean_abs_shap), 0.0001);
  return <section className="panel risk-intelligence">
    <div className="panel-head"><div><span className="eyebrow">AI ACQUISITION RISK INTELLIGENCE</span><h3>Portfolio risk assessment</h3></div><Pill tone="green"><span className="live-dot" /> LIVE MODEL</Pill></div>
    <div className="risk-content">
      <div className="gauge-wrap"><Donut value={gaugeValue} label="/ 100" tone={tone} size="large" /><RiskBadge status={riskStatus(gaugeValue > 80 ? "CRITICAL" : gaugeValue > 60 ? "HIGH" : gaugeValue > 30 ? "MEDIUM" : "LOW")} /><small>PORTFOLIO AVG. RISK SCORE</small></div>
      <div className="risk-stats">
        <div><span>PROJECTS AT RISK</span><strong>{overview?.projects_at_risk ?? "—"}</strong><small>of {overview?.total_projects ?? "—"} total</small></div>
        <div><span>AVG. PREDICTED DELAY</span><strong>{overview ? overview.average_predicted_delay.toFixed(0) : "—"} <em>days</em></strong><small>portfolio-wide model estimate</small></div>
        <div><span>CRITICAL PROJECTS</span><strong>{overview?.critical_projects ?? "—"}</strong><small>require immediate intervention</small></div>
      </div>
      <div className="risk-drivers">
        <div className="subheading">PRIMARY RISK DRIVERS (SHAP) <span>MEAN |CONTRIBUTION|</span></div>
        {topDrivers.length === 0 && <small style={{ color: "var(--muted)" }}>Run a prediction to populate model explanations.</small>}
        {topDrivers.map((d) => <div className="factor" key={d.feature}><div><span>{formatFeatureName(d.feature)}</span><strong>{(d.mean_abs_shap * 100).toFixed(1)}</strong></div><ProgressBar value={(d.mean_abs_shap / maxImportance) * 100} tone={d.mean_abs_shap / maxImportance > 0.7 ? "red" : d.mean_abs_shap / maxImportance > 0.4 ? "orange" : "amber"} /></div>)}
      </div>
    </div>
    <div className="panel-foot"><span><Icon name="spark" /> Real SHAP importance sampled from the trained classifier</span><button className="text-button" onClick={onOpen}>Explore prediction <Icon name="arrow" /></button></div>
  </section>;
}

function MiniMap({ points, onOpen, onSelect }: { points: MapProject[]; onOpen: () => void; onSelect: (id: string) => void }) {
  const highRiskCount = points.filter((p) => p.risk_category === "HIGH" || p.risk_category === "CRITICAL").length;
  const stateCount = new Set(points.map((p) => p.state)).size;
  return <section className="panel map-panel"><div className="panel-head"><div><span className="eyebrow">GEOSPATIAL INTELLIGENCE</span><h3>Top-risk project locations</h3></div><button className="icon-button" onClick={onOpen}><Icon name="external" /></button></div>
    <div className="india-map"><LeafletMap points={points} onSelect={onSelect} /></div>
    <div className="map-summary"><div><strong>{highRiskCount}</strong><span>High-risk (shown)</span></div><div><strong>{stateCount}</strong><span>States (shown)</span></div><button onClick={onOpen}>Open GIS command center <Icon name="arrow" /></button></div>
  </section>;
}

function PortfolioTable({ rows, loading, compact, onSelect, onViewAll }: { rows: PortfolioRow[]; loading?: boolean; compact?: boolean; onSelect: (id: string) => void; onViewAll?: () => void }) {
  const shown = compact ? rows.slice(0, 6) : rows;
  return <section className={`panel portfolio-panel ${compact ? "compact" : ""}`}>
    <div className="panel-head"><div><span className="eyebrow">PROJECT PORTFOLIO</span><h3>{compact ? "Priority projects" : "All acquisition projects"}</h3></div>{compact && onViewAll && <button className="text-button" onClick={onViewAll}>View all <Icon name="arrow" /></button>}</div>
    {loading ? <Loading /> : (
      <div className="table-scroll"><table><thead><tr><th>PROJECT</th><th>LOCATION</th><th>STAGE</th><th>RISK</th><th>DELAY PROB.</th><th>PREDICTED</th>{!compact && <><th>COMPENSATION PENDING</th><th>CASES</th></>}<th>STATUS</th><th /></tr></thead>
        <tbody>{shown.map((row) => <tr key={row.project_id} onClick={() => onSelect(row.project_id)}>
          <td><strong>{row.project_name}</strong><small>{row.project_id}</small></td>
          <td>{row.district}<small>{row.state}</small></td>
          <td><span className="stage">{row.current_stage}</span></td>
          <td><strong className={`risk-number risk-${row.risk_category.toLowerCase()}`}>{row.risk_score ?? "—"}</strong><small>/ 100</small></td>
          <td>{row.probability_of_delay !== null ? `${(row.probability_of_delay * 100).toFixed(1)}%` : "—"}</td>
          <td>{row.expected_delay_days !== null ? `${row.expected_delay_days.toFixed(0)} days` : "—"}</td>
          {!compact && <><td>{formatINR(row.compensation_pending)}</td><td>{row.legal_cases ?? "—"}</td></>}
          <td><RiskBadge status={riskStatus(row.risk_category)} /></td>
          <td><Icon name="chevronRight" /></td>
        </tr>)}</tbody>
      </table></div>
    )}
  </section>;
}

function AlertsPreview({ alerts, loading, onOpen }: { alerts: Alert[] | null; loading?: boolean; onOpen: () => void }) {
  const shown = (alerts || []).slice(0, 3);
  return <section className="panel alerts-preview"><div className="panel-head"><div><span className="eyebrow">INTELLIGENT ALERTS</span><h3>Requires attention</h3></div><Pill tone="red">{alerts?.length ?? 0} NEW</Pill></div>
    {loading ? <Loading /> : shown.length === 0 ? <small style={{ color: "var(--muted)", padding: 16, display: "block" }}>No new alerts.</small> : shown.map((a) => (
      <button className="alert-row" key={a.id} onClick={onOpen}>
        <span className={`alert-icon ${a.severity.toLowerCase()}`}><Icon name={a.severity === "CRITICAL" ? "bolt" : "bell"} /></span>
        <span><strong>{a.message}</strong><small>{a.alert_type.replace(/_/g, " ")}</small></span>
        <time>{new Date(a.created_at).toLocaleTimeString()}</time>
      </button>
    ))}
    <button className="view-alerts" onClick={onOpen}>View all alerts <Icon name="arrow" /></button>
  </section>;
}

// ---------------------------------------------------------------------------
// Projects list
// ---------------------------------------------------------------------------

export function Projects({ onSelect }: { onSelect: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const { user } = useAuth();
  const pageSize = 10;
  const projects = useApi(() => projectsApi.list({ limit: 500 }), []);
  const mapRows = useApi(() => gisApi.projects(), []);

  const rows = useMemo(() => mergePortfolio(projects.data, mapRows.data), [projects.data, mapRows.data]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.project_name.toLowerCase().includes(q) || r.state.toLowerCase().includes(q) || r.district.toLowerCase().includes(q) || r.project_id.toLowerCase().includes(q));
  }, [rows, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const canWrite = ["SUPER_ADMIN", "CENTRAL_ADMIN", "STATE_ADMIN", "PROJECT_OFFICER"].includes(user?.role || "");

  return <><SectionHeader eyebrow="PORTFOLIO OPERATIONS" title="Projects" description="Monitor every acquisition lifecycle, risk signal, and intervention from the live project portfolio." actions={<>{canWrite && <button className="primary-button" onClick={() => setCreating(value => !value)}><Icon name="upload" /> {creating ? "Close form" : "Add project"}</button>}<DemoLabel /></>} />
    {creating && <ProjectEditor onCancel={() => setCreating(false)} onSave={async values => { await projectsApi.create(values); await Promise.all([projects.reload(), mapRows.reload()]); setCreating(false); }} />}
    <div className="filter-bar"><div className="search-field"><Icon name="search" /><input placeholder="Search project, state or district…" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} /></div><span className="result-count">{filtered.length} PROJECTS</span></div>
    {(projects.loading || mapRows.loading) ? <Loading label="Loading projects…" /> : projects.error ? <ErrorPanel message={projects.error} onRetry={projects.reload} /> : (
      <PortfolioTable rows={pageRows} onSelect={onSelect} />
    )}
    <div className="pagination"><span>Showing {pageRows.length === 0 ? 0 : (page - 1) * pageSize + 1}–{(page - 1) * pageSize + pageRows.length} of {filtered.length} projects</span>
      <div><button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}><Icon name="chevron" /></button><span style={{ padding: "0 12px" }}>{page} / {totalPages}</span><button disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}><Icon name="chevronRight" /></button></div>
    </div>
  </>;
}

function blankProject(): ProjectWrite {
  return {
    project_id: "", project_code: "", project_name: "", project_type: "", ministry: "", implementing_agency: "",
    state: "", district: "", taluk: "", village: "", latitude: 0, longitude: 0,
    land_proposed_hectares: 0, land_acquired_hectares: 0, acquisition_percentage: 0,
    affected_families: 0, displaced_families: 0, notification_status: "Pending", notification_date: "",
    survey_status: "Not Started", survey_completion_percentage: 0, approval_status: "Pending", approval_pending_days: 0,
    award_status: "Not Started", award_date: "", compensation_assessed: 0, compensation_paid: 0,
    compensation_pending: 0, legal_cases: 0, legal_dispute_severity: "None", possession_status: "Not Started",
    possession_percentage: 0, rr_status: "Not Started", rr_completion_percentage: 0, documentation_completeness: 0,
    stakeholder_responsiveness: 0, current_stage: "Proposal", planned_completion_date: "", actual_completion_date: "",
    project_start_date: "", historical_agency_delay_rate: 0,
  };
}

function ProjectEditor({ initial, onSave, onCancel }: { initial?: ProjectWrite; onSave: (values: ProjectWrite) => Promise<void>; onCancel: () => void }) {
  const [values, setValues] = useState<ProjectWrite>(initial || blankProject());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try { await onSave(values); }
    catch (e: any) { setError(e?.response?.data?.detail || "Unable to save project."); }
    finally { setSaving(false); }
  };

  return <form className="panel project-editor" onSubmit={submit}>
    <div className="panel-head"><div><span className="eyebrow">PROJECT RECORD</span><h3>{initial ? "Update project" : "Create project"}</h3></div></div>
    <div className="project-editor-grid">{(Object.keys(values) as (keyof ProjectWrite)[]).map(key => {
      const value = values[key];
      const numeric = typeof value === "number";
      const label = String(key).replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase());
      return <label key={key}>{label}<input required={!key.endsWith("date")} type={numeric ? "number" : "text"} step={numeric ? "any" : undefined} value={value} onChange={event => setValues(previous => ({ ...previous, [key]: numeric ? Number(event.target.value) : event.target.value }))} /></label>;
    })}</div>
    {error && <div className="form-error" role="alert">{error}</div>}
    <div className="project-editor-actions"><button type="button" className="secondary-button" onClick={onCancel}>Cancel</button><button className="primary-button" disabled={saving}>{saving ? "Saving…" : "Save project"}</button></div>
  </form>;
}

// ---------------------------------------------------------------------------
// Project Intelligence (route: /projects/:projectId)
// ---------------------------------------------------------------------------

const STAGES = ["Proposal", "Scrutiny", "Approval", "Notification", "Survey", "Award", "Compensation", "Legal", "Possession", "Rehabilitation", "Closure"];

export function ProjectIntelligence() {
  const { projectId } = useParams<{ projectId: string }>();
  const project = useApi(() => projectsApi.get(projectId!), [projectId]);
  const history = useApi(() => predictionsApi.history(projectId!).catch(() => []), [projectId]);
  const [latest, setLatest] = useState<PredictionResult | null>(null);
  const [running, setRunning] = useState(false);
  const [editing, setEditing] = useState(false);
  const { user } = useAuth();

  const current = latest || (history.data && history.data[0]) || null;
  const stageIndex = project.data ? STAGES.indexOf(project.data.current_stage) : -1;

  const runPrediction = async () => {
    if (!projectId) return;
    setRunning(true);
    try {
      const result = await predictionsApi.run(projectId);
      setLatest(result);
    } finally {
      setRunning(false);
    }
  };

  const canEdit = ["SUPER_ADMIN", "CENTRAL_ADMIN", "STATE_ADMIN", "PROJECT_OFFICER"].includes(user?.role || "");
  const canDelete = ["SUPER_ADMIN", "CENTRAL_ADMIN"].includes(user?.role || "");
  const deleteProject = async () => {
    if (!projectId || !window.confirm(`Delete project ${projectId}? This cannot be undone.`)) return;
    await projectsApi.delete(projectId);
    window.location.assign("/projects");
  };

  if (project.loading) return <Loading label="Loading project…" />;
  if (project.error || !project.data) return <ErrorPanel message={project.error || "Project not found"} onRetry={project.reload} />;
  const p = project.data;

  return <>
    <SectionHeader eyebrow={`PROJECT INTELLIGENCE · ${p.project_id}`} title={p.project_name} description={`${p.state} · ${p.district} · ${p.project_type}`} actions={<>{canEdit && <button className="secondary-button" onClick={() => setEditing(value => !value)}>{editing ? "Close editor" : "Edit project"}</button>}{canDelete && <button className="secondary-button danger-action" onClick={deleteProject}>Delete</button>}<DemoLabel /><button className="primary-button" onClick={runPrediction} disabled={running}>{running ? <><span className="loader" /> ANALYZING</> : <><Icon name="spark" /> Run AI prediction</>}</button></>} />
    {editing && canEdit && <ProjectEditor initial={{ ...p }} onCancel={() => setEditing(false)} onSave={async values => { await projectsApi.update(p.project_id, values); setEditing(false); project.reload(); }} />}
    <div className="project-hero panel">
      <div className="project-risk"><Donut value={current?.risk_score ?? 0} label="/ 100" tone={riskTone(current?.risk_category)} size="large" /><div><RiskBadge status={riskStatus(current?.risk_category ?? "LOW")} /><span>AI RISK SCORE</span></div></div>
      <div className="project-stat"><span>LAND ACQUIRED</span><strong>{p.acquisition_percentage.toFixed(0)}%</strong><ProgressBar value={p.acquisition_percentage} /></div>
      <div className="project-stat"><span>CURRENT STAGE</span><strong>{p.current_stage}</strong><small>{p.affected_families} affected families</small></div>
      <div className="project-stat"><span>PLANNED COMPLETION</span><strong>{p.planned_completion_date || "—"}</strong><small>Original schedule</small></div>
      <div className="project-stat danger"><span>EXPECTED DELAY</span><strong>{current ? `${current.expected_delay_days.toFixed(0)} days` : "Run prediction"}</strong><small>{current ? `Delay probability ${(current.probability_of_delay * 100).toFixed(1)}%` : "No prediction yet"}</small></div>
    </div>
    <section className="panel project-facts"><div className="panel-head"><div><span className="eyebrow">PROJECT DATA</span><h3>Current record</h3></div></div><div className="project-facts-grid">{[
      ["Project ID", p.project_id], ["Project code", p.project_code], ["Project type", p.project_type], ["Ministry", p.ministry], ["Implementing agency", p.implementing_agency],
      ["State", p.state], ["District", p.district], ["Taluk", p.taluk], ["Village", p.village], ["Location", `${p.latitude.toFixed(5)}, ${p.longitude.toFixed(5)}`],
      ["Land proposed", `${p.land_proposed_hectares.toLocaleString()} ha`], ["Land acquired", `${p.land_acquired_hectares.toLocaleString()} ha`], ["Acquisition", `${p.acquisition_percentage}%`],
      ["Affected families", p.affected_families.toLocaleString()], ["Displaced families", p.displaced_families.toLocaleString()], ["Notification", p.notification_status], ["Survey", `${p.survey_status} · ${p.survey_completion_percentage}%`],
      ["Approval", `${p.approval_status} · ${p.approval_pending_days} days pending`], ["Award", p.award_status], ["Compensation assessed", formatINR(p.compensation_assessed)], ["Compensation paid", formatINR(p.compensation_paid)],
      ["Compensation pending", formatINR(p.compensation_pending)], ["Legal cases", p.legal_cases], ["Legal severity", p.legal_dispute_severity], ["Possession", `${p.possession_status} · ${p.possession_percentage}%`],
      ["R&R", `${p.rr_status} · ${p.rr_completion_percentage}%`], ["Documentation", `${p.documentation_completeness}%`], ["Stakeholder responsiveness", `${p.stakeholder_responsiveness}%`],
      ["Current stage", p.current_stage], ["Project start", p.project_start_date || "—"], ["Planned completion", p.planned_completion_date || "—"], ["Actual completion", p.actual_completion_date || "—"],
    ].map(([label, value]) => <div key={String(label)}><span>{label}</span><strong>{value}</strong></div>)}</div></section>
    <ProjectRelatedRecords projectId={p.project_id} />
    <section className="panel lifecycle"><div className="panel-head"><div><span className="eyebrow">ACQUISITION LIFECYCLE</span><h3>Stage sequence</h3><small>Stage completion is inferred from current stage; stage dates are not recorded by this prototype.</small></div><Pill tone="amber">{stageIndex >= 0 ? `${stageIndex + 1} OF ${STAGES.length} STAGES` : "STAGE NOT MAPPED"}</Pill></div>
      <div className="timeline">{STAGES.map((stage, i) => <div className={`timeline-step ${i < stageIndex ? "complete" : i === stageIndex ? "current" : ""}`} key={stage}><div className="timeline-node">{i < stageIndex ? <Icon name="check" /> : i + 1}</div><span>{stage}</span></div>)}</div>
    </section>
    <div className="two-column"><PredictionPanel projectId={p.project_id} embedded result={current} running={running} onRun={runPrediction} /><ExplainableAI projectId={p.project_id} result={current} /></div>
    <div className="two-column"><StageRiskPanel projectId={p.project_id} result={current} /><RecommendationPanel projectId={p.project_id} result={current} /></div>
  </>;
}

function ProjectRelatedRecords({ projectId }: { projectId: string }) {
  const related = useApi(async () => {
    const [parcels, owners, compensation, legal, documents, rr, possession] = await Promise.all([
      parcelsApi.list({ project_id: projectId, limit: 500 }),
      ownersApi.list({ project_id: projectId, limit: 500 }),
      compensationApi.list({ project_id: projectId, limit: 500 }),
      legalCasesApi.list({ project_id: projectId }),
      documentsApi.list(projectId),
      rrApi.list({ project_id: projectId }),
      possessionApi.list({ project_id: projectId }),
    ]);
    return { parcels, owners, compensation, legal, documents, rr, possession };
  }, [projectId]);
  if (related.loading) return <Loading label="Loading linked project records…" />;
  if (related.error || !related.data) return <ErrorPanel message={related.error || "Unable to load linked records"} onRetry={related.reload} />;
  const { parcels, owners, compensation, legal, documents, rr, possession } = related.data;
  const cards = [
    { title: "Land parcels", count: parcels.length, rows: parcels.slice(0, 4).map(parcel => `${parcel.parcel_id} · ${parcel.survey_number} · ${parcel.acquisition_status}`) },
    { title: "Land owners", count: owners.length, rows: owners.slice(0, 4).map(owner => `${owner.owner_name} · ${owner.ownership_share}% · ${owner.owner_id}`) },
    { title: "Compensation", count: compensation.length, rows: compensation.slice(0, 4).map(row => `${row.case_id} · pending ${formatINR(row.pending_amount)} · ${row.payment_status}`) },
    { title: "Legal cases", count: legal.length, rows: legal.slice(0, 4).map(row => `${row.case_number} · ${row.severity} · ${row.status}`) },
    { title: "Documents", count: documents.length, rows: documents.slice(0, 4).map(row => `${row.document_name} · ${row.status}`) },
    { title: "R&R", count: rr.length, rows: rr.slice(0, 4).map(row => `${row.rr_id} · ${row.status} · ${row.completion_percentage}%`) },
    { title: "Possession", count: possession.length, rows: possession.slice(0, 4).map(row => `${row.possession_id} · ${row.status} · ${row.survey_status}`) },
  ];
  return <section className="project-related-section"><div className="panel-head"><div><span className="eyebrow">LINKED DOMAIN RECORDS</span><h3>Project workflow records</h3></div><DemoLabel /></div><div className="project-related-grid">{cards.map(card => <article className="panel project-related-card" key={card.title}><div><h4>{card.title}</h4><strong>{card.count}</strong></div>{card.rows.length ? <ul>{card.rows.map(row => <li key={row}>{row}</li>)}</ul> : <small>No linked records yet.</small>}</article>)}</div></section>;
}

// ---------------------------------------------------------------------------
// Prediction (standalone page /prediction, and embedded inside Project Intelligence)
// ---------------------------------------------------------------------------

function PredictionPanel({ projectId, embedded, result, running, onRun }: { projectId: string | null; embedded?: boolean; result: PredictionResult | null; running: boolean; onRun: () => void }) {
  return <section className={`panel prediction-panel ${embedded ? "" : "standalone"}`}>
    {!embedded && <SectionHeader eyebrow="PREDICTIVE MODEL" title="AI Delay Prediction Engine" description="Generate an explainable delay forecast using project, legal, financial and administrative signals — real trained classifier + regressor, real SHAP." actions={<DemoLabel />} />}
    {!embedded && <div className="prediction-toolbar"><div><label>SELECTED PROJECT</label><SelectButton>{projectId || "Select a project from Projects"}</SelectButton></div><button className="primary-button" onClick={onRun} disabled={running || !projectId}>{running ? <><span className="loader" /> ANALYZING</> : <><Icon name="spark" /> RUN PREDICTION</>}</button></div>}
    {!result && !running && <small style={{ color: "var(--muted)", display: "block", padding: "12px 0" }}>No prediction yet — click Run AI prediction.</small>}
    {result && (
      <div className={`prediction-result ${running ? "loading" : ""}`}>
        <div className="prediction-score"><span>DELAY RISK</span><Donut value={result.risk_score} label="/ 100" tone={riskTone(result.risk_category)} size="large" /><RiskBadge status={riskStatus(result.risk_category)} /></div>
        <div className="prediction-measures">
          <div><span>Delay Probability</span><strong>{(result.probability_of_delay * 100).toFixed(1)}%</strong><ProgressBar value={result.probability_of_delay * 100} tone={riskTone(result.risk_category)} /></div>
          <div><span>Expected Delay</span><strong>{result.expected_delay_days.toFixed(0)} <em>days</em></strong><small>{result.classifier_algorithm} + {result.regressor_algorithm} · {result.model_version}</small></div>
          <div><span>Stage-wise risk (top)</span><small>{result.stage_risks.slice().sort((a, b) => b.risk_score - a.risk_score).slice(0, 3).map(s => `${s.stage} (${s.risk_score})`).join(", ")}</small></div>
        </div>
      </div>
    )}
    {result && (
      <div className="factor-list"><div className="subheading">RECOMMENDATIONS <span>PRIORITY</span></div>
        {result.recommendations.map((r) => <div className="horizontal-factor" key={r.reason}><span>{r.recommended_action}</span><small style={{ flex: 1 }}>{r.reason}</small><strong>{r.priority}</strong></div>)}
      </div>
    )}
  </section>;
}

export function Prediction({ standalone }: { standalone?: boolean }) {
  const projects = useApi(() => projectsApi.list({ limit: 500 }), []);
  const [selected, setSelected] = useState<string>("");
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [running, setRunning] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !projects.data) return projects.data || [];
    return projects.data.filter(p => p.project_name.toLowerCase().includes(q) || p.project_id.toLowerCase().includes(q));
  }, [projects.data, query]);

  const run = async () => {
    if (!selected) return;
    setRunning(true);
    try {
      const r = await predictionsApi.run(selected);
      setResult(r);
    } finally {
      setRunning(false);
    }
  };

  return <section className="panel prediction-panel standalone">
    <SectionHeader eyebrow="PREDICTIVE MODEL" title="AI Delay Prediction Engine" description="Generate an explainable delay forecast — real trained classifier + regressor, real SHAP. Select any project from the synthetic prototype portfolio." actions={<DemoLabel />} />
    <div className="prediction-toolbar">
      <div style={{ flex: 1 }}>
        <label>SELECT PROJECT</label>
        <div className="search-field"><Icon name="search" /><input placeholder="Search by name or ID…" value={query} onChange={e => setQuery(e.target.value)} /></div>
        <select value={selected} onChange={e => { setSelected(e.target.value); setResult(null); }} style={{ width: "100%", marginTop: 8, background: "transparent", color: "inherit", border: "1px solid var(--line)", borderRadius: 8, padding: "8px 10px" }}>
          <option value="">— choose a project —</option>
          {filtered.slice(0, 50).map(p => <option value={p.project_id} key={p.project_id}>{p.project_id} · {p.project_name}</option>)}
        </select>
      </div>
      <button className="primary-button" onClick={run} disabled={running || !selected}>{running ? <><span className="loader" /> ANALYZING</> : <><Icon name="spark" /> RUN PREDICTION</>}</button>
    </div>
    {result && (
      <div className={`prediction-result ${running ? "loading" : ""}`}>
        <div className="prediction-score"><span>DELAY RISK</span><Donut value={result.risk_score} label="/ 100" tone={riskTone(result.risk_category)} size="large" /><RiskBadge status={riskStatus(result.risk_category)} /></div>
        <div className="prediction-measures">
          <div><span>Delay Probability</span><strong>{(result.probability_of_delay * 100).toFixed(1)}%</strong><ProgressBar value={result.probability_of_delay * 100} tone={riskTone(result.risk_category)} /></div>
          <div><span>Expected Delay</span><strong>{result.expected_delay_days.toFixed(0)} <em>days</em></strong><small>{result.classifier_algorithm} + {result.regressor_algorithm}</small></div>
          <div><span>Model version</span><strong>{result.model_version}</strong><small>{new Date(result.created_at).toLocaleString()}</small></div>
        </div>
      </div>
    )}
    {result && <div className="factor-list"><div className="subheading">TOP SHAP DRIVERS <span>CONTRIBUTION</span></div>
      {result.top_positive_drivers.map(d => <div className="horizontal-factor" key={d.feature}><span>{formatFeatureName(d.feature)}</span><ProgressBar value={Math.min(100, Math.abs(d.contribution) * 400)} tone="red" /><strong>+{d.contribution.toFixed(3)}</strong></div>)}
      {result.top_negative_drivers.map(d => <div className="horizontal-factor" key={d.feature}><span>{formatFeatureName(d.feature)}</span><ProgressBar value={Math.min(100, Math.abs(d.contribution) * 400)} tone="green" /><strong>{d.contribution.toFixed(3)}</strong></div>)}
    </div>}
    {selected && result && <div className="prediction-extras"><ExplainableAI projectId={selected} result={result} /><StageRiskPanel projectId={selected} result={result} /><RecommendationPanel projectId={selected} result={result} /></div>}
  </section>;
}

function ExplainableAI({ projectId, result }: { projectId: string; result: PredictionResult | null }) {
  const explanation = useApi(() => result ? predictionsApi.explanation(projectId) : Promise.resolve(null), [projectId, result?.id]);
  if (!result) return <section className="panel explain-panel"><div className="panel-head"><div><span className="eyebrow">EXPLAINABLE AI · SHAP ANALYSIS</span><h3>Why is this project at risk?</h3></div></div><small style={{ color: "var(--muted)" }}>Run a prediction to see the SHAP explanation.</small></section>;
  const positives = explanation.data?.top_positive_drivers || [];
  const negatives = explanation.data?.top_negative_drivers || [];
  const all = [...positives, ...negatives];
  const maxAbs = Math.max(...all.map(d => Math.abs(d.contribution)), 0.0001);
  return <section className="panel explain-panel">
    <div className="panel-head"><div><span className="eyebrow">EXPLAINABLE AI · SHAP ANALYSIS</span><h3>Why is this project at risk?</h3></div><Pill tone="violet">MODEL-DERIVED SHAP · {explanation.data?.model_version || result.model_version}</Pill></div>
    <p className="explanation">The model predicts a <strong>{result.expected_delay_days.toFixed(0)}-day delay</strong> ({(result.probability_of_delay * 100).toFixed(1)}% probability). Positive values increase delay risk; negative values decrease it.</p>
    {explanation.loading ? <Loading label="Loading model explanation…" /> : explanation.error ? <ErrorPanel message={explanation.error} onRetry={explanation.reload} /> : all.length === 0 ? <small className="prototype-notice">No SHAP drivers were returned for this prediction.</small> : <div className="shap-chart"><div className="shap-axis" />
      {all.map(d => <div className={`shap-row ${d.contribution < 0 ? "negative" : ""}`} key={d.feature}><span>{formatFeatureName(d.feature)}</span><div><i style={{ width: `${(Math.abs(d.contribution) / maxAbs) * 90}%` }} /></div><strong>{d.contribution > 0 ? "+" : ""}{d.contribution.toFixed(3)}</strong></div>)}
    </div>}
    <div className="ai-summary"><Icon name="spark" /><p><strong>Model & version</strong>{result.classifier_algorithm} classifier + {result.regressor_algorithm} regressor, model {result.model_version}.</p></div>
  </section>;
}

function StageRiskPanel({ projectId, result }: { projectId: string; result: PredictionResult | null }) {
  const risks = useApi(() => result ? predictionsApi.stageRisks(projectId) : Promise.resolve([]), [projectId, result?.id]);
  return <section className="panel stage-risk-panel">
    <div className="panel-head"><div><span className="eyebrow">DERIVED STAGE ASSESSMENT</span><h3>Stage-wise risk</h3></div><Pill tone="amber">RULE-BASED / DERIVED</Pill></div>
    {!result ? <small className="prototype-notice">Run a prediction to calculate stage risk.</small> : risks.loading ? <Loading label="Loading stage risks…" /> : risks.error ? <ErrorPanel message={risks.error} onRetry={risks.reload} /> : <div className="stage-risk-list">{risks.data?.map(stage => <div key={stage.stage}><span>{stage.stage}</span><ProgressBar value={stage.risk_score} tone={riskTone(stage.risk_category)} /><strong>{stage.risk_score.toFixed(1)}</strong><RiskBadge status={riskStatus(stage.risk_category)} /></div>)}</div>}
  </section>;
}

function RecommendationPanel({ projectId, result }: { projectId: string; result: PredictionResult | null }) {
  const recommendations = useApi(() => result ? predictionsApi.recommendations(projectId) : Promise.resolve([]), [projectId, result?.id]);
  return <section className="panel recommendation-panel">
    <div className="panel-head"><div><span className="eyebrow">AI-ASSISTED DECISION SUPPORT</span><h3>Recommendations</h3></div><Pill tone="blue">RULE-BASED</Pill></div>
    {!result ? <small className="prototype-notice">Run a prediction to generate recommendations.</small> : recommendations.loading ? <Loading label="Loading recommendations…" /> : recommendations.error ? <ErrorPanel message={recommendations.error} onRetry={recommendations.reload} /> : <div className="recommendation-list">{recommendations.data?.map((item, index) => <article key={`${item.priority}-${index}`}><div><RiskBadge status={riskStatus(item.priority)} /><strong>{item.recommended_action}</strong></div><p>{item.reason}</p><small>Responsible role: {item.responsible_role} · Expected impact: {item.expected_impact}</small></article>)}</div>}
    <small className="prototype-notice">Decision-support output only; not an official instruction.</small>
  </section>;
}

// ---------------------------------------------------------------------------
// GIS Intelligence
// ---------------------------------------------------------------------------

export function GisIntelligence({ onOpenProject }: { onOpenProject: (id: string) => void }) {
  const [stateFilter, setStateFilter] = useState("");
  const mapRows = useApi(() => gisApi.projects(stateFilter ? { state: stateFilter } : undefined), [stateFilter]);
  const parcelRows = useApi(() => parcelsApi.list({ ...(stateFilter ? { state: stateFilter } : {}), limit: 500 }), [stateFilter]);
  const states = useMemo(() => Array.from(new Set((mapRows.data || []).map(p => p.state))).sort(), [mapRows.data]);
  const [selectedProject, setSelectedProject] = useState<MapProject | null>(null);
  const [selectedParcel, setSelectedParcel] = useState<LandParcel | null>(null);
  const [showParcels, setShowParcels] = useState(true);

  return <><SectionHeader eyebrow="GEOSPATIAL COMMAND CENTER" title="National Acquisition Risk Map" description="Explore spatial risk patterns across the synthetic prototype portfolio — real markers from the database, real risk scores from the trained model." actions={<DemoLabel />} />
    <div className="filter-bar">
      <select value={stateFilter} onChange={e => setStateFilter(e.target.value)} style={{ background: "transparent", color: "inherit", border: "1px solid var(--line)", borderRadius: 8, padding: "8px 12px" }}>
        <option value="">All states</option>
        {states.map(s => <option value={s} key={s}>{s}</option>)}
      </select>
      <span className="result-count">{mapRows.data?.length ?? 0} PROJECTS SHOWN</span>
      <label className="gis-parcel-toggle"><input type="checkbox" checked={showParcels} onChange={event => setShowParcels(event.target.checked)} /> Parcel boundaries ({parcelRows.data?.filter(parcel => parcel.geometry).length ?? 0})</label>
    </div>
    <section className="panel gis-full">
      <div className="india-map large">
        {mapRows.loading || parcelRows.loading ? <Loading label="Loading map…" /> : mapRows.error ? <ErrorPanel message={mapRows.error} onRetry={mapRows.reload} /> : parcelRows.error ? <ErrorPanel message={parcelRows.error} onRetry={parcelRows.reload} /> : (
          <LeafletMap
            points={mapRows.data || []}
            parcels={showParcels ? parcelRows.data || [] : []}
            onSelect={(id) => { const m = (mapRows.data || []).find(p => p.project_id === id); if (m) { setSelectedProject(m); setSelectedParcel(null); } }}
            onSelectParcel={(id) => { const parcel = (parcelRows.data || []).find(p => p.parcel_id === id); if (parcel) { setSelectedParcel(parcel); setSelectedProject(null); } }}
          />
        )}
      </div>
      <div className={`map-detail ${selectedProject || selectedParcel ? "" : "hidden"}`}>
        {selectedProject && <>
          <button className="close-detail" onClick={() => setSelectedProject(null)}><Icon name="close" /></button>
          <Pill tone={selectedProject.risk_category === "CRITICAL" ? "red" : selectedProject.risk_category === "HIGH" ? "amber" : "green"}>{selectedProject.risk_category} RISK</Pill>
          <h3>{selectedProject.project_name}</h3><span>{selectedProject.project_id}</span>
          <div className="detail-grid">
            <div><span>STATE</span><strong>{selectedProject.state}</strong></div>
            <div><span>DISTRICT</span><strong>{selectedProject.district}</strong></div>
            <div><span>RISK SCORE</span><strong className="red-text">{selectedProject.risk_score ?? "—"} / 100</strong></div>
            <div><span>DELAY PROB.</span><strong>{selectedProject.probability_of_delay !== null ? `${(selectedProject.probability_of_delay * 100).toFixed(1)}%` : "—"}</strong></div>
            <div><span>PREDICTED DELAY</span><strong>{selectedProject.expected_delay_days?.toFixed(0) ?? "—"} days</strong></div>
            <div><span>CURRENT STAGE</span><strong>{selectedProject.current_stage}</strong></div>
          </div>
          <button className="primary-button" onClick={() => onOpenProject(selectedProject.project_id)}>View project intelligence <Icon name="arrow" /></button>
        </>}
        {selectedParcel && <>
          <button className="close-detail" onClick={() => setSelectedParcel(null)}><Icon name="close" /></button>
          <Pill tone="blue">SYNTHETIC PARCEL RECORD</Pill>
          <h3>{selectedParcel.parcel_id}</h3><span>{selectedParcel.project_id}</span>
          <div className="detail-grid">
            <div><span>SURVEY NUMBER</span><strong>{selectedParcel.survey_number}</strong></div>
            <div><span>AREA</span><strong>{selectedParcel.area_hectares} ha</strong></div>
            <div><span>STATE</span><strong>{selectedParcel.state}</strong></div>
            <div><span>DISTRICT</span><strong>{selectedParcel.district}</strong></div>
            <div><span>ACQUISITION</span><strong>{selectedParcel.acquisition_status}</strong></div>
            <div><span>POSSESSION</span><strong>{selectedParcel.possession_status}</strong></div>
            <div><span>BOUNDARY</span><strong>{selectedParcel.geometry ? "Polygon available" : "No geometry recorded"}</strong></div>
          </div>
          <button className="primary-button" onClick={() => onOpenProject(selectedParcel.project_id)}>View project intelligence <Icon name="arrow" /></button>
        </>}
      </div>
    </section>
  </>;
}

// ---------------------------------------------------------------------------
// Analytics (Recharts)
// ---------------------------------------------------------------------------

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from "recharts";

const RISK_PIE_COLORS: Record<string, string> = { LOW: "#22c55e", MEDIUM: "#f59e0b", HIGH: "#f97316", CRITICAL: "#ef4444", UNSCORED: "#64748b" };

export function Analytics() {
  const overview = useApi(() => analyticsApi.overview(), []);
  const domains = useApi(() => analyticsApi.domainOverview(), []);
  const states = useApi(() => analyticsApi.byState(), []);
  const mapRows = useApi(() => gisApi.projects(), []);

  const riskDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    (mapRows.data || []).forEach(p => { counts[p.risk_category] = (counts[p.risk_category] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [mapRows.data]);

  const stageDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    (mapRows.data || []).forEach(p => { counts[p.current_stage] = (counts[p.current_stage] || 0) + 1; });
    return STAGES.map(s => ({ stage: s, count: counts[s] || 0 }));
  }, [mapRows.data]);

  return <><SectionHeader eyebrow="PORTFOLIO ANALYTICS" title="Acquisition Performance Analytics" description="Cross-portfolio trends computed live from the database and the trained model — nothing here is pre-rendered." actions={<DemoLabel />} />
    {domains.error ? <ErrorPanel message={domains.error} onRetry={domains.reload} /> : domains.data && <div className="metrics-grid domain-metrics">
      <MetricCard label="PARCELS" value={String(domains.data.total_parcels)} detail="linked to current projects" trend="" icon="map" tone="cyan" />
      <MetricCard label="OWNERS" value={String(domains.data.total_owners)} detail="linked to parcels" trend="" icon="users" tone="green" />
      <MetricCard label="COMPENSATION" value={String(domains.data.compensation_cases)} detail={`${formatINR(domains.data.compensation_pending_amount)} pending`} trend="" icon="file" tone="amber" />
      <MetricCard label="LEGAL CASES" value={String(domains.data.legal_cases)} detail="active prototype records" trend="" icon="shield" tone="red" />
      <MetricCard label="DOCUMENTS" value={String(domains.data.documents)} detail={`${domains.data.documents_pending_review} pending review`} trend="" icon="file" />
      <MetricCard label="R&R / POSSESSION" value={`${domains.data.rr_records} / ${domains.data.possession_records}`} detail={`${domains.data.rr_completed} R&R complete · ${domains.data.possession_taken} possession taken`} trend="" icon="check" tone="green" />
    </div>}
    <div className="analytics-grid">
      <section className="panel chart-card wide"><div className="panel-head"><div><span className="eyebrow">PORTFOLIO SIGNAL</span><h3>State-wise average risk score</h3></div></div>
        {states.loading ? <Loading /> : (
          <ResponsiveContainer width="100%" height={260}><BarChart data={states.data || []}><CartesianGrid strokeDasharray="3 3" stroke="#1c2740" /><XAxis dataKey="state" tick={{ fontSize: 10, fill: "#73809a" }} interval={0} angle={-30} textAnchor="end" height={70} /><YAxis tick={{ fontSize: 10, fill: "#73809a" }} domain={[0, 100]} /><Tooltip contentStyle={{ background: "#0e162b", border: "1px solid #1c2740" }} /><Bar dataKey="average_risk_score" fill="#6d8dff" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
        )}
        <div className="chart-foot"><span>{overview.data ? `${overview.data.projects_at_risk} projects currently at risk` : ""}</span></div>
      </section>
      <section className="panel chart-card wide"><div className="panel-head"><div><span className="eyebrow">PORTFOLIO SIGNAL</span><h3>Risk category distribution</h3></div></div>
        {mapRows.loading ? <Loading /> : (
          <ResponsiveContainer width="100%" height={260}><PieChart><Pie data={riskDistribution} dataKey="value" nameKey="name" outerRadius={90} label>{riskDistribution.map((d, i) => <Cell key={i} fill={RISK_PIE_COLORS[d.name] || "#64748b"} />)}</Pie><Tooltip contentStyle={{ background: "#0e162b", border: "1px solid #1c2740" }} /></PieChart></ResponsiveContainer>
        )}
      </section>
      <section className="panel chart-card wide"><div className="panel-head"><div><span className="eyebrow">TREND ANALYSIS</span><h3>Projects by lifecycle stage</h3></div></div>
        {mapRows.loading ? <Loading /> : (
          <ResponsiveContainer width="100%" height={260}><BarChart data={stageDistribution}><CartesianGrid strokeDasharray="3 3" stroke="#1c2740" /><XAxis dataKey="stage" tick={{ fontSize: 9, fill: "#73809a" }} interval={0} angle={-30} textAnchor="end" height={70} /><YAxis tick={{ fontSize: 10, fill: "#73809a" }} /><Tooltip contentStyle={{ background: "#0e162b", border: "1px solid #1c2740" }} /><Bar dataKey="count" fill="#22d3ee" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
        )}
      </section>
      <section className="panel chart-card wide"><div className="panel-head"><div><span className="eyebrow">PORTFOLIO SIGNAL</span><h3>Project count by state</h3></div></div>
        {states.loading ? <Loading /> : (
          <ResponsiveContainer width="100%" height={260}><BarChart data={states.data || []}><CartesianGrid strokeDasharray="3 3" stroke="#1c2740" /><XAxis dataKey="state" tick={{ fontSize: 10, fill: "#73809a" }} interval={0} angle={-30} textAnchor="end" height={70} /><YAxis tick={{ fontSize: 10, fill: "#73809a" }} /><Tooltip contentStyle={{ background: "#0e162b", border: "1px solid #1c2740" }} /><Bar dataKey="project_count" fill="#a78bfa" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
        )}
      </section>
    </div>
  </>;
}

// ---------------------------------------------------------------------------
// Recommendations — aggregated from the highest-risk projects' real recommendations
// ---------------------------------------------------------------------------

export function Recommendations() {
  const mapRows = useApi(() => gisApi.projects(), []);
  const topRisk = useMemo(() => [...(mapRows.data || [])].filter(p => p.risk_score !== null).sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0)).slice(0, 8), [mapRows.data]);
  const recs = useApi(async () => {
    const results = await Promise.all(topRisk.map(async (p) => {
      try {
        const list = await predictionsApi.recommendations(p.project_id);
        return list.map(r => ({ ...r, project_id: p.project_id, project_name: p.project_name }));
      } catch { return []; }
    }));
    return results.flat();
  }, [topRisk.map(p => p.project_id).join(",")]);

  const icons: Record<string, string> = { CRITICAL: "bolt", HIGH: "shield", MEDIUM: "users", LOW: "check" };

  return <><SectionHeader eyebrow="AI DECISION SUPPORT" title="AI Intervention Recommendations" description="Prioritized actions generated by the recommendation engine from each project's real risk factors — aggregated across the highest-risk projects in the portfolio." actions={<DemoLabel />} />
    {(mapRows.loading || recs.loading) ? <Loading label="Generating recommendations…" /> : recs.error ? <ErrorPanel message={recs.error} /> : (
      <div className="recommendations-grid">{(recs.data || []).slice(0, 12).map((r: any, i: number) => (
        <article className="panel recommendation" key={`${r.project_id}-${i}`}>
          <div className="recommendation-head"><span className={`rec-icon r${i % 4}`}><Icon name={icons[r.priority] || "bolt"} /></span><div><span className="eyebrow">{r.project_id} · {r.project_name}</span><h3>{r.recommended_action}</h3></div><RiskBadge status={riskStatus(r.priority)} /></div>
          <p className="rec-signal">{r.reason}</p>
          <div className="recommended-action"><span>RESPONSIBLE ROLE</span><strong>{r.responsible_role}</strong></div>
          <div className="impact"><Icon name="bolt" /><span>EXPECTED IMPACT<strong>{r.expected_impact}</strong></span></div>
        </article>
      ))}</div>
    )}
  </>;
}

// ---------------------------------------------------------------------------
// Alert Center
// ---------------------------------------------------------------------------

export function AlertCenter() {
  const [active, setActive] = useState("ALL");
  const alerts = useApi(() => alertsApi.list(), []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: alerts.data?.length || 0, CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    (alerts.data || []).forEach(a => { c[a.severity] = (c[a.severity] || 0) + 1; });
    return c;
  }, [alerts.data]);

  const shown = (alerts.data || []).filter(a => active === "ALL" || a.severity === active);

  const act = async (id: number, action: "acknowledge" | "resolve") => {
    if (action === "acknowledge") await alertsApi.acknowledge(id); else await alertsApi.resolve(id);
    alerts.reload();
  };

  return <><SectionHeader eyebrow="REAL-TIME EARLY WARNING" title="Intelligent Alert Center" description="Alerts generated automatically from real prediction results and project field thresholds." actions={<DemoLabel />} />
    <div className="alert-tabs">{["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map(x => <button className={active === x ? "active" : ""} onClick={() => setActive(x)} key={x}>{x}<b>{counts[x] || 0}</b></button>)}</div>
    {alerts.loading ? <Loading label="Loading alerts…" /> : (
      <section className="panel alert-list">{shown.map(a => (
        <article className="alert-item" key={a.id}>
          <span className={`alert-icon ${a.severity.toLowerCase()}`}><Icon name={a.severity === "CRITICAL" ? "bolt" : "bell"} /></span>
          <div className="alert-main"><div><RiskBadge status={riskStatus(a.severity)} /><span>{a.alert_type.replace(/_/g, " ")}</span><time>{new Date(a.created_at).toLocaleString()}</time></div><h3>{a.message}</h3><p><strong>Status:</strong> {a.status}</p></div>
          <div className="alert-actions">
            <button disabled={a.status !== "NEW"} onClick={() => act(a.id, "acknowledge")}>Acknowledge</button>
            <button className="resolve" disabled={a.status === "RESOLVED"} onClick={() => act(a.id, "resolve")}>Resolve</button>
          </div>
        </article>
      ))}</section>
    )}
  </>;
}

// ---------------------------------------------------------------------------
// Model Monitoring
// ---------------------------------------------------------------------------

export function ModelMonitoring() {
  const metrics = useApi(() => modelApi.metrics(), []);
  const versions = useApi(() => modelApi.versions(), []);
  const { user } = useAuth();
  const [retraining, setRetraining] = useState(false);

  const canRetrain = user?.role === "SUPER_ADMIN" || user?.role === "CENTRAL_ADMIN";

  const retrain = async () => {
    setRetraining(true);
    try { await modelApi.retrain(); metrics.reload(); versions.reload(); } finally { setRetraining(false); }
  };

  if (metrics.loading) return <Loading label="Loading model metrics…" />;
  if (metrics.error || !metrics.data) return <ErrorPanel message={metrics.error || "No metrics available"} onRetry={metrics.reload} />;

  const { metadata, metrics: m } = metrics.data;
  const clfBest = m.classification.all_models[m.classification.selected_model];
  const regBest = m.regression.all_models[m.regression.selected_model];

  const summary = [
    ["MODEL VERSION", metadata.model_version, metadata.classifier_algorithm],
    ["ACCURACY", `${(clfBest.accuracy * 100).toFixed(1)}%`, "classification"],
    ["PRECISION", `${(clfBest.precision * 100).toFixed(1)}%`, "classification"],
    ["RECALL", `${(clfBest.recall * 100).toFixed(1)}%`, "classification"],
    ["F1 SCORE", `${(clfBest.f1 * 100).toFixed(1)}%`, "classification"],
    ["ROC-AUC", clfBest.roc_auc.toFixed(3), "classification"],
    ["REGRESSION MAE", `${regBest.mae.toFixed(1)} days`, metadata.regressor_algorithm],
    ["REGRESSION R²", regBest.r2.toFixed(3), metadata.regressor_algorithm],
  ];

  return <><SectionHeader eyebrow="MLOPS · REAL MODEL" title="AI Model Monitoring" description="Live performance metrics computed from an actual held-out validation split — not simulated." actions={<><DemoLabel />{canRetrain && <button className="primary-button" onClick={retrain} disabled={retraining}>{retraining ? <><span className="loader" /> RETRAINING</> : <><Icon name="pulse" /> Retrain model</>}</button>}</>} />
    <div className="model-metrics">{summary.map(([l, v, d]) => <div className="panel" key={l}><span>{l}</span><strong>{v}</strong><small>{d}</small></div>)}</div>
    <div className="analytics-grid">
      <section className="panel chart-card wide"><div className="panel-head"><div><span className="eyebrow">MODEL COMPARISON</span><h3>Classification — all candidates evaluated</h3></div></div>
        <table style={{ width: "100%", fontSize: 12 }}><thead><tr><th align="left">Algorithm</th><th>Accuracy</th><th>ROC-AUC</th><th>F1</th></tr></thead><tbody>
          {Object.entries(m.classification.all_models).map(([name, mm]: [string, any]) => <tr key={name} style={{ fontWeight: name === m.classification.selected_model ? 700 : 400 }}><td>{name}{name === m.classification.selected_model && " ✓ selected"}</td><td align="center">{(mm.accuracy * 100).toFixed(1)}%</td><td align="center">{mm.roc_auc.toFixed(3)}</td><td align="center">{(mm.f1 * 100).toFixed(1)}%</td></tr>)}
        </tbody></table>
      </section>
      <section className="panel chart-card wide"><div className="panel-head"><div><span className="eyebrow">MODEL COMPARISON</span><h3>Regression — all candidates evaluated</h3></div></div>
        <table style={{ width: "100%", fontSize: 12 }}><thead><tr><th align="left">Algorithm</th><th>MAE (days)</th><th>RMSE</th><th>R²</th></tr></thead><tbody>
          {Object.entries(m.regression.all_models).map(([name, mm]: [string, any]) => <tr key={name} style={{ fontWeight: name === m.regression.selected_model ? 700 : 400 }}><td>{name}{name === m.regression.selected_model && " ✓ selected"}</td><td align="center">{mm.mae.toFixed(1)}</td><td align="center">{mm.rmse.toFixed(1)}</td><td align="center">{mm.r2.toFixed(3)}</td></tr>)}
        </tbody></table>
      </section>
    </div>
    <div className="model-info">
      <div className="panel"><Icon name="history" /><span>LAST TRAINED<strong>{new Date(metadata.trained_at).toLocaleDateString()}</strong><small>{new Date(metadata.trained_at).toLocaleTimeString()}</small></span></div>
      <div className="panel"><Icon name="grid" /><span>TRAINING DATA<strong>{metadata.dataset_size} projects</strong><small>{metadata.train_size} train / {metadata.val_size} validation</small></span></div>
      <div className="panel"><Icon name="check" /><span>PROVENANCE<strong>Synthetic prototype</strong><small>{metadata.dataset_provenance}</small></span></div>
    </div>
    <section className="panel model-version-history"><div className="panel-head"><div><span className="eyebrow">SAVED MODEL RECORDS</span><h3>Model versions</h3></div></div>
      {versions.loading ? <Loading label="Loading model versions…" /> : versions.error ? <ErrorPanel message={versions.error} onRetry={versions.reload} /> : <div className="table-scroll"><table><thead><tr><th>VERSION</th><th>CLASSIFIER</th><th>REGRESSOR</th><th>TRAINED</th><th>DATASET SIZE</th><th>ACTIVE</th></tr></thead><tbody>{(versions.data || []).map(version => <tr key={`${version.version}-${version.trained_at}`}><td>{version.version}</td><td>{version.classifier_algorithm}</td><td>{version.regressor_algorithm}</td><td>{new Date(version.trained_at).toLocaleString()}</td><td>{version.dataset_size}</td><td>{version.is_active ? "Active" : "Archived"}</td></tr>)}</tbody></table></div>}
    </section>
  </>;
}

// ---------------------------------------------------------------------------
// Data Quality
// ---------------------------------------------------------------------------

export function DataQuality() {
  const dq = useApi(() => dataQualityApi.report(), []);

  const summary = useMemo(() => {
    const rows = dq.data || [];
    if (rows.length === 0) return null;
    const avg = (key: keyof (typeof rows)[0]) => rows.reduce((s, r) => s + (typeof r[key] === "number" ? (r[key] as number) : 0), 0) / rows.length;
    return {
      completeness: avg("completeness_percentage"),
      confidence: avg("confidence_score"),
      duplicates: rows.filter(r => r.has_duplicates).length,
      invalidDates: rows.filter(r => r.has_invalid_dates).length,
      conflicting: rows.filter(r => r.has_conflicting_values).length,
    };
  }, [dq.data]);

  if (dq.loading) return <Loading label="Running data quality checks…" />;
  if (dq.error) return <ErrorPanel message={dq.error} onRetry={dq.reload} />;

  const measures = summary ? [
    ["Avg. Completeness", summary.completeness, "green"],
    ["Avg. Confidence", summary.confidence, "blue"],
  ] : [];

  return <><SectionHeader eyebrow="DATA OPERATIONS" title="Data Quality Center" description="Computed live from actual project records — completeness, duplicate detection, date validity and internal consistency checks." actions={<DemoLabel />} />
    <div className="quality-grid">
      {measures.map(([name, val, tone]) => <article className="panel quality-card" key={name as string}><Donut value={Math.round(Number(val))} label="%" tone={String(tone)} /><div><span>{name}</span><strong>{Number(val).toFixed(1)}%</strong><small>Across {dq.data?.length ?? 0} projects</small></div></article>)}
    </div>
    <div className="two-column quality-lower">
      <section className="panel"><div className="panel-head"><div><span className="eyebrow">DATA WARNINGS</span><h3>Issues requiring attention</h3></div><Pill tone="amber">{(summary?.duplicates ?? 0) + (summary?.invalidDates ?? 0) + (summary?.conflicting ?? 0)} ISSUES</Pill></div>
        {[["Duplicate records (same name/state/district)", summary?.duplicates ?? 0], ["Invalid or unparseable dates", summary?.invalidDates ?? 0], ["Conflicting values (e.g. acquired > proposed land)", summary?.conflicting ?? 0]].map(([text, num]) => (
          <div className="warning-row" key={text as string}><span>{num}</span><div><strong>{text}</strong></div></div>
        ))}
      </section>
      <section className="panel"><div className="panel-head"><div><span className="eyebrow">LOWEST CONFIDENCE PROJECTS</span><h3>Needs review</h3></div></div>
        <div className="table-scroll"><table><thead><tr><th>PROJECT</th><th>COMPLETENESS</th><th>CONFIDENCE</th><th>MISSING FIELDS</th><th>VALIDATION FLAGS</th></tr></thead><tbody>
          {[...(dq.data || [])].sort((a, b) => a.confidence_score - b.confidence_score).slice(0, 6).map(r => <tr key={r.project_id}><td>{r.project_id}</td><td>{r.completeness_percentage}%</td><td>{r.confidence_score}%</td><td>{r.missing_fields.length ? r.missing_fields.join(", ") : "None"}</td><td>{[r.has_duplicates && "Duplicate", r.has_invalid_dates && "Invalid date", r.has_conflicting_values && "Conflicting values"].filter(Boolean).join(", ") || "None"}</td></tr>)}
        </tbody></table></div>
      </section>
    </div>
  </>;
}

export function ProjectAggregatePage({ kind }: { kind: "compensation" | "legal" | "rr" }) {
  const projects = useApi(() => projectsApi.list({ limit: 500 }), []);
  const titles = {
    compensation: ["Compensation Monitoring", "Current project-level aggregate amounts; this prototype has no individual payment cases."],
    legal: ["Legal Status", "Current project-level case counts and severity; this prototype has no individual court case records."],
    rr: ["R&R and Possession", "Current project-level status and completion percentages; stage history is not recorded."],
  } as const;
  const [title, description] = titles[kind];
  return <>
    <SectionHeader eyebrow="PROJECT RECORDS" title={title} description={description} actions={<DemoLabel />} />
    {projects.loading ? <Loading label="Loading project summaries…" /> : projects.error ? <ErrorPanel message={projects.error} onRetry={projects.reload} /> : <section className="panel"><div className="table-scroll"><table><thead><tr>
      <th>PROJECT</th><th>STATE / DISTRICT</th>{kind === "compensation" && <><th>ASSESSED</th><th>PAID</th><th>PENDING</th></>}{kind === "legal" && <><th>LEGAL CASES</th><th>DISPUTE SEVERITY</th></>}{kind === "rr" && <><th>R&R STATUS</th><th>R&R COMPLETE</th><th>POSSESSION STATUS</th><th>POSSESSION</th></>}
    </tr></thead><tbody>{(projects.data || []).map(project => <tr key={project.project_id}>
      <td><strong>{project.project_name}</strong><small>{project.project_id}</small></td><td>{project.state}<small>{project.district}</small></td>
      {kind === "compensation" && <><td>{formatINR(project.compensation_assessed)}</td><td>{formatINR(project.compensation_paid)}</td><td>{formatINR(project.compensation_pending)}</td></>}
      {kind === "legal" && <><td>{project.legal_cases}</td><td>{project.legal_dispute_severity}</td></>}
      {kind === "rr" && <><td>{project.rr_status}</td><td>{project.rr_completion_percentage}%</td><td>{project.possession_status}</td><td>{project.possession_percentage}%</td></>}
    </tr>)}</tbody></table></div></section>}
  </>;
}

export function PrototypeNoticePage({ title }: { title: string }) {
  return <>
    <SectionHeader eyebrow="DATA OPERATIONS" title={title} description="This Figma concept is not connected to a parcel or land-owner data model in the current backend." actions={<DemoLabel />} />
    <section className="panel prototype-feature-notice"><Icon name="map" size={26} /><h3>Parcel-level records are not available</h3><p>The current API stores project-level coordinates and acquisition aggregates only. It does not store parcel boundaries, survey numbers, owner identities, or parcel-to-owner relationships. No sample rows are shown here as real records.</p><p>Project locations and project risk remain available in the live GIS view.</p></section>
  </>;
}

const EMPTY_PARCEL: LandParcelWrite = {
  parcel_id: "", project_id: "", survey_number: "", parcel_number: "", village: "", taluk: "", district: "", state: "",
  area_hectares: 0, acquisition_status: "IDENTIFIED", compensation_status: "PENDING", legal_status: "CLEAR",
  possession_status: "PENDING", latitude: null, longitude: null, geometry: null,
};

export function LandParcels() {
  const [projectFilter, setProjectFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<LandParcel | null>(null);
  const [form, setForm] = useState<LandParcelWrite>(EMPTY_PARCEL);
  const [geometryText, setGeometryText] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const pageSize = 10;
  const projects = useApi(() => projectsApi.list({ limit: 500 }), []);
  const parcels = useApi(() => parcelsApi.list({
    ...(projectFilter ? { project_id: projectFilter } : {}),
    ...(stateFilter ? { state: stateFilter } : {}),
    ...(statusFilter ? { acquisition_status: statusFilter } : {}),
    ...(search.trim() ? { search: search.trim() } : {}),
    limit: 500,
  }), [projectFilter, stateFilter, statusFilter, search]);
  const canWrite = ["SUPER_ADMIN", "CENTRAL_ADMIN", "STATE_ADMIN", "PROJECT_OFFICER"].includes(user?.role || "");
  const canDelete = ["SUPER_ADMIN", "CENTRAL_ADMIN"].includes(user?.role || "");
  const states = Array.from(new Set((projects.data || []).map(project => project.state))).sort();
  const rows = parcels.data || [];
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const visible = rows.slice((page - 1) * pageSize, page * pageSize);

  const startCreate = () => {
    setEditing(null);
    setForm(EMPTY_PARCEL);
    setGeometryText("");
    setFormError(null);
    setEditorOpen(true);
  };

  const startEdit = (parcel: LandParcel) => {
    setEditing(parcel);
    const { id, project_pk, created_at, updated_at, ...writeValues } = parcel;
    setForm(writeValues);
    setGeometryText(parcel.geometry ? JSON.stringify(parcel.geometry) : "");
    setFormError(null);
    setEditorOpen(true);
  };

  const saveParcel = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    let geometry: LandParcelWrite["geometry"] = null;
    if (geometryText.trim()) {
      try { geometry = JSON.parse(geometryText); }
      catch { setFormError("Polygon must be valid GeoJSON."); return; }
    }
    setSaving(true);
    try {
      if (editing) {
        const { parcel_id, project_id, ...changes } = { ...form, geometry };
        await parcelsApi.update(editing.parcel_id, changes);
      } else {
        await parcelsApi.create({ ...form, geometry });
      }
      setEditorOpen(false);
      await parcels.reload();
    } catch (error: any) {
      setFormError(error?.response?.data?.detail || "Unable to save parcel.");
    } finally { setSaving(false); }
  };

  const removeParcel = async (parcel: LandParcel) => {
    if (!window.confirm(`Delete parcel ${parcel.parcel_id}?`)) return;
    try { await parcelsApi.delete(parcel.parcel_id); await parcels.reload(); }
    catch (error: any) { setFormError(error?.response?.data?.detail || "Unable to delete parcel."); }
  };

  const exportCsv = () => {
    const columns: (keyof LandParcel)[] = ["parcel_id", "project_id", "survey_number", "parcel_number", "village", "taluk", "district", "state", "area_hectares", "acquisition_status", "compensation_status", "legal_status", "possession_status"];
    const cell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const csv = [columns.join(","), ...rows.map(row => columns.map(column => cell(row[column])).join(","))].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "landrisk-parcels.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const updateField = <K extends keyof LandParcelWrite>(key: K, value: LandParcelWrite[K]) => setForm(current => ({ ...current, [key]: value }));

  return <>
    <SectionHeader eyebrow="DATA OPERATIONS" title="Land Parcels" description="Parcel records linked to projects. Prototype data is synthetic; polygon geometry is optional." actions={<><DemoLabel />{canWrite && <button className="primary-button" onClick={startCreate}><Icon name="upload" /> Add parcel</button>}</>} />
    <div className="metrics-grid reports-summary">
      <MetricCard label="PARCELS" value={String(rows.length)} detail="matching current filters" trend="" icon="map" />
      <MetricCard label="POSSESSION TAKEN" value={String(rows.filter(parcel => parcel.possession_status === "TAKEN").length)} detail="listed parcels" trend="" icon="check" tone="green" />
      <MetricCard label="COMPENSATION PENDING" value={String(rows.filter(parcel => ["PENDING", "PARTIAL"].includes(parcel.compensation_status)).length)} detail="listed parcels" trend="" icon="file" tone="amber" />
      <MetricCard label="LEGAL DISPUTES" value={String(rows.filter(parcel => parcel.legal_status !== "CLEAR").length)} detail="listed parcels" trend="" icon="shield" tone="red" />
    </div>
    {formError && !editorOpen && <div className="form-error" role="alert">{formError}</div>}
    {editorOpen && <form className="panel project-editor" onSubmit={saveParcel}>
      <div className="panel-head"><div><span className="eyebrow">PARCEL RECORD</span><h3>{editing ? `Edit ${editing.parcel_id}` : "Add parcel"}</h3></div><button type="button" className="secondary-button" onClick={() => setEditorOpen(false)}>Close</button></div>
      <div className="project-editor-grid">
        {!editing && <label>Parcel ID<input required value={form.parcel_id} onChange={event => updateField("parcel_id", event.target.value)} /></label>}
        {!editing && <label>Project<select required value={form.project_id} onChange={event => { const project = projects.data?.find(row => row.project_id === event.target.value); setForm(current => ({ ...current, project_id: event.target.value, village: project?.village || current.village, taluk: project?.taluk || current.taluk, district: project?.district || current.district, state: project?.state || current.state, latitude: project?.latitude ?? current.latitude, longitude: project?.longitude ?? current.longitude })); }}><option value="">Select project</option>{(projects.data || []).map(project => <option value={project.project_id} key={project.project_id}>{project.project_id} · {project.project_name}</option>)}</select></label>}
        {([["survey_number", "Survey number"], ["parcel_number", "Parcel number"], ["village", "Village"], ["taluk", "Taluk"], ["district", "District"], ["state", "State"]] as const).map(([key, label]) => <label key={key}>{label}<input required value={form[key]} onChange={event => updateField(key, event.target.value)} /></label>)}
        <label>Area (hectares)<input type="number" min="0.0001" step="any" required value={form.area_hectares || ""} onChange={event => updateField("area_hectares", Number(event.target.value))} /></label>
        {([["acquisition_status", ["IDENTIFIED", "NOTIFIED", "AWARDED", "ACQUIRED"]], ["compensation_status", ["NOT_APPLICABLE", "PENDING", "PARTIAL", "PAID", "DISPUTED"]], ["legal_status", ["CLEAR", "DISPUTED", "IN_CASE", "RESOLVED"]], ["possession_status", ["PENDING", "PARTIAL", "TAKEN", "STAYED"]]] as const).map(([key, options]) => <label key={key}>{key.replaceAll("_", " ")}<select value={form[key]} onChange={event => updateField(key, event.target.value)}>{options.map(option => <option key={option}>{option}</option>)}</select></label>)}
        <label>Latitude<input type="number" step="any" value={form.latitude ?? ""} onChange={event => updateField("latitude", event.target.value ? Number(event.target.value) : null)} /></label>
        <label>Longitude<input type="number" step="any" value={form.longitude ?? ""} onChange={event => updateField("longitude", event.target.value ? Number(event.target.value) : null)} /></label>
        <label className="parcel-geometry-field">Polygon GeoJSON (optional)<textarea rows={3} value={geometryText} onChange={event => setGeometryText(event.target.value)} placeholder='{"type":"Polygon","coordinates":[...]}' /></label>
      </div>
      {formError && <div className="form-error" role="alert">{formError}</div>}
      <div className="project-editor-actions"><button className="primary-button" disabled={saving}>{saving ? "Saving…" : "Save parcel"}</button></div>
    </form>}
    <div className="filter-bar parcel-filters">
      <div className="search-field"><Icon name="search" /><input placeholder="Search Parcel ID / Survey No." value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} /></div>
      <select value={projectFilter} onChange={event => { setProjectFilter(event.target.value); setPage(1); }}><option value="">All projects</option>{(projects.data || []).map(project => <option key={project.project_id} value={project.project_id}>{project.project_id}</option>)}</select>
      <select value={stateFilter} onChange={event => { setStateFilter(event.target.value); setPage(1); }}><option value="">All states</option>{states.map(state => <option key={state}>{state}</option>)}</select>
      <select value={statusFilter} onChange={event => { setStatusFilter(event.target.value); setPage(1); }}><option value="">All acquisition statuses</option>{["IDENTIFIED", "NOTIFIED", "AWARDED", "ACQUIRED"].map(status => <option key={status}>{status}</option>)}</select>
      <button className="secondary-button" onClick={exportCsv} disabled={!rows.length}><Icon name="download" /> Export CSV</button>
      <span className="result-count">{rows.length} PARCELS</span>
    </div>
    {projects.loading || parcels.loading ? <Loading label="Loading parcel records…" /> : projects.error ? <ErrorPanel message={projects.error} onRetry={projects.reload} /> : parcels.error ? <ErrorPanel message={parcels.error} onRetry={parcels.reload} /> : <section className="panel document-table"><div className="table-scroll"><table><thead><tr><th>PARCEL ID</th><th>PROJECT</th><th>SURVEY NO.</th><th>VILLAGE</th><th>TALUK</th><th>DISTRICT</th><th>AREA (HA)</th><th>ACQUISITION</th><th>COMPENSATION</th><th>LEGAL</th><th>POSSESSION</th><th>ACTIONS</th></tr></thead><tbody>
      {visible.map(parcel => <tr key={parcel.parcel_id}><td><strong>{parcel.parcel_id}</strong></td><td>{parcel.project_id}</td><td>{parcel.survey_number}{parcel.parcel_number ? ` / ${parcel.parcel_number}` : ""}</td><td>{parcel.village}</td><td>{parcel.taluk}</td><td>{parcel.district}</td><td>{parcel.area_hectares.toFixed(2)}</td><td>{parcel.acquisition_status}</td><td>{parcel.compensation_status}</td><td>{parcel.legal_status}</td><td>{parcel.possession_status}</td><td><div className="parcel-row-actions"><button className="text-button" onClick={() => startEdit(parcel)}>View / Edit</button>{canDelete && <button className="text-button danger-action" onClick={() => removeParcel(parcel)}>Delete</button>}</div></td></tr>)}
      {!visible.length && <tr><td colSpan={12}>No parcel records match the current filters. Add a record or seed the synthetic prototype dataset.</td></tr>}
    </tbody></table></div><div className="pagination"><span>Showing {visible.length ? (page - 1) * pageSize + 1 : 0}–{(page - 1) * pageSize + visible.length} of {rows.length} parcels</span><div><button disabled={page <= 1} onClick={() => setPage(current => Math.max(1, current - 1))}>‹</button><span>{page} / {totalPages}</span><button disabled={page >= totalPages} onClick={() => setPage(current => Math.min(totalPages, current + 1))}>›</button></div></div></section>}
  </>;
}

type WorkflowKind = "owners" | "compensation" | "legal" | "rr" | "possession";
type WorkflowRow = LandOwner | CompensationRecord | LegalCase | ResettlementRecord | PossessionRecord;
type WorkflowField = { name: string; label: string; type?: "number" | "date" | "select" | "textarea"; required?: boolean; options?: string[]; source?: "projects" | "parcels" | "owners" };
type WorkflowConfig = { title: string; eyebrow: string; description: string; idField: string; statusParam: string; columns: [string, string][]; fields: WorkflowField[]; immutable: string[] };

const WORKFLOW_CONFIG: Record<WorkflowKind, WorkflowConfig> = {
  owners: {
    title: "Land Owners", eyebrow: "LAND RECORDS", description: "Synthetic prototype owner records linked to projects and parcels.", idField: "owner_id", statusParam: "contact_status", immutable: ["owner_id", "project_id", "parcel_id"],
    columns: [["owner_id", "OWNER ID"], ["owner_name", "OWNER"], ["project_id", "PROJECT"], ["parcel_id", "PARCEL"], ["ownership_type", "TYPE"], ["ownership_share", "SHARE %"], ["contact_status", "CONTACT"], ["compensation_status", "COMPENSATION"], ["legal_status", "LEGAL"]],
    fields: [{ name: "owner_id", label: "Owner ID", required: true }, { name: "project_id", label: "Project", type: "select", source: "projects", required: true }, { name: "parcel_id", label: "Parcel", type: "select", source: "parcels", required: true }, { name: "owner_name", label: "Owner name", required: true }, { name: "ownership_share", label: "Ownership share (%)", type: "number", required: true }, { name: "ownership_type", label: "Ownership type", type: "select", options: ["PRIVATE", "JOINT", "GOVERNMENT", "INSTITUTIONAL"], required: true }, { name: "contact_status", label: "Contact status", type: "select", options: ["NOT_CONTACTED", "CONTACTED", "VERIFIED", "UNREACHABLE"] }, { name: "compensation_status", label: "Compensation status", type: "select", options: ["PENDING", "PARTIAL", "PAID", "DISPUTED", "NOT_APPLICABLE"] }, { name: "legal_status", label: "Legal status", type: "select", options: ["CLEAR", "DISPUTED", "IN_CASE", "RESOLVED"] }],
  },
  compensation: {
    title: "Compensation Monitoring", eyebrow: "COMPENSATION CASES", description: "Track assessed, approved, paid, and pending amounts on linked prototype cases.", idField: "case_id", statusParam: "payment_status", immutable: ["case_id", "project_id", "parcel_id", "owner_id"],
    columns: [["case_id", "CASE ID"], ["project_id", "PROJECT"], ["parcel_id", "PARCEL"], ["owner_id", "OWNER"], ["assessed_amount", "ASSESSED"], ["approved_amount", "APPROVED"], ["paid_amount", "PAID"], ["pending_amount", "PENDING"], ["payment_status", "STATUS"], ["payment_date", "PAYMENT DATE"]],
    fields: [{ name: "case_id", label: "Case ID", required: true }, { name: "project_id", label: "Project", type: "select", source: "projects", required: true }, { name: "parcel_id", label: "Parcel", type: "select", source: "parcels" }, { name: "owner_id", label: "Owner", type: "select", source: "owners" }, { name: "assessed_amount", label: "Assessed amount", type: "number", required: true }, { name: "approved_amount", label: "Approved amount", type: "number" }, { name: "paid_amount", label: "Paid amount", type: "number" }, { name: "payment_status", label: "Status", type: "select", options: ["PENDING", "PARTIAL", "PAID", "OVERDUE", "DISPUTED"] }, { name: "assessment_date", label: "Assessment date", type: "date" }, { name: "approval_date", label: "Approval date", type: "date" }, { name: "payment_date", label: "Payment date", type: "date" }, { name: "remarks", label: "Remarks", type: "textarea" }],
  },
  legal: {
    title: "Legal Status", eyebrow: "LEGAL CASES", description: "Track synthetic legal case records linked to projects, parcels, and owners.", idField: "case_id", statusParam: "status", immutable: ["case_id", "project_id", "parcel_id", "owner_id"],
    columns: [["case_id", "CASE ID"], ["case_number", "CASE NUMBER"], ["project_id", "PROJECT"], ["parcel_id", "PARCEL"], ["owner_id", "OWNER"], ["court", "COURT"], ["case_type", "TYPE"], ["status", "STATUS"], ["severity", "SEVERITY"], ["next_hearing_date", "NEXT HEARING"]],
    fields: [{ name: "case_id", label: "Case ID", required: true }, { name: "project_id", label: "Project", type: "select", source: "projects", required: true }, { name: "parcel_id", label: "Parcel", type: "select", source: "parcels" }, { name: "owner_id", label: "Owner", type: "select", source: "owners" }, { name: "case_number", label: "Case number", required: true }, { name: "court", label: "Court" }, { name: "case_type", label: "Case type", required: true }, { name: "status", label: "Status", type: "select", options: ["PENDING", "ACTIVE", "RESOLVED", "DISMISSED", "STAYED"] }, { name: "severity", label: "Severity", type: "select", options: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] }, { name: "filing_date", label: "Filing date", type: "date" }, { name: "next_hearing_date", label: "Next hearing", type: "date" }, { name: "resolution_date", label: "Resolution date", type: "date" }, { name: "assigned_officer", label: "Assigned officer" }, { name: "remarks", label: "Remarks", type: "textarea" }],
  },
  rr: {
    title: "Rehabilitation and Resettlement", eyebrow: "R&R RECORDS", description: "Track prototype entitlements, package progress, and resettlement status.", idField: "rr_id", statusParam: "status", immutable: ["rr_id", "project_id", "parcel_id", "owner_id"],
    columns: [["rr_id", "R&R ID"], ["project_id", "PROJECT"], ["owner_id", "OWNER"], ["beneficiary_name", "BENEFICIARY"], ["entitlement_type", "ENTITLEMENT"], ["status", "STATUS"], ["completion_percentage", "COMPLETE %"], ["package_assessed", "PACKAGE ASSESSED"], ["package_paid", "PACKAGE PAID"], ["resettlement_site", "SITE"]],
    fields: [{ name: "rr_id", label: "R&R ID", required: true }, { name: "project_id", label: "Project", type: "select", source: "projects", required: true }, { name: "parcel_id", label: "Parcel", type: "select", source: "parcels" }, { name: "owner_id", label: "Owner", type: "select", source: "owners" }, { name: "beneficiary_name", label: "Beneficiary" }, { name: "entitlement_type", label: "Entitlement type" }, { name: "status", label: "Status", type: "select", options: ["PENDING", "IN_PROGRESS", "COMPLETED", "ON_HOLD"] }, { name: "completion_percentage", label: "Completion (%)", type: "number" }, { name: "package_assessed", label: "Package assessed", type: "number" }, { name: "package_paid", label: "Package paid", type: "number" }, { name: "resettlement_site", label: "Resettlement site" }, { name: "remarks", label: "Remarks", type: "textarea" }],
  },
  possession: {
    title: "Possession Tracking", eyebrow: "POSSESSION RECORDS", description: "Track possession, survey, and handover status per synthetic parcel.", idField: "possession_id", statusParam: "status", immutable: ["possession_id", "project_id", "parcel_id"],
    columns: [["possession_id", "POSSESSION ID"], ["project_id", "PROJECT"], ["parcel_id", "PARCEL"], ["status", "STATUS"], ["survey_status", "SURVEY"], ["possession_date", "POSSESSION DATE"], ["handover_date", "HANDOVER DATE"], ["remarks", "REMARKS"]],
    fields: [{ name: "possession_id", label: "Possession ID", required: true }, { name: "project_id", label: "Project", type: "select", source: "projects", required: true }, { name: "parcel_id", label: "Parcel", type: "select", source: "parcels", required: true }, { name: "status", label: "Status", type: "select", options: ["PENDING", "PARTIAL", "TAKEN", "STAYED"] }, { name: "survey_status", label: "Survey status", type: "select", options: ["PENDING", "SCHEDULED", "COMPLETED", "DISPUTED"] }, { name: "possession_date", label: "Possession date", type: "date" }, { name: "handover_date", label: "Handover date", type: "date" }, { name: "remarks", label: "Remarks", type: "textarea" }],
  },
};

const WORKFLOW_API: Record<WorkflowKind, { list: (params?: Record<string, string | number>) => Promise<WorkflowRow[]>; create: (payload: any) => Promise<WorkflowRow>; update: (id: string, payload: any) => Promise<WorkflowRow>; delete: (id: string) => Promise<unknown> }> = {
  owners: ownersApi, compensation: compensationApi, legal: legalCasesApi, rr: rrApi, possession: possessionApi,
};

const EMPTY_WORKFLOW_VALUES: Record<WorkflowKind, Record<string, string | number | null>> = {
  owners: { owner_id: "", project_id: "", parcel_id: "", owner_name: "", ownership_share: 100, ownership_type: "PRIVATE", contact_status: "NOT_CONTACTED", compensation_status: "PENDING", legal_status: "CLEAR" },
  compensation: { case_id: "", project_id: "", parcel_id: "", owner_id: "", assessed_amount: 0, approved_amount: null, paid_amount: 0, payment_status: "PENDING", assessment_date: "", approval_date: "", payment_date: "", remarks: "" },
  legal: { case_id: "", project_id: "", parcel_id: "", owner_id: "", case_number: "", court: "", case_type: "", status: "PENDING", severity: "MEDIUM", filing_date: "", next_hearing_date: "", resolution_date: "", assigned_officer: "", remarks: "" },
  rr: { rr_id: "", project_id: "", parcel_id: "", owner_id: "", beneficiary_name: "", entitlement_type: "", status: "PENDING", completion_percentage: 0, package_assessed: 0, package_paid: 0, resettlement_site: "", remarks: "" },
  possession: { possession_id: "", project_id: "", parcel_id: "", status: "PENDING", survey_status: "PENDING", possession_date: "", handover_date: "", remarks: "" },
};

export function WorkflowRecordsPage({ kind }: { kind: WorkflowKind }) {
  const config = WORKFLOW_CONFIG[kind];
  const [projectFilter, setProjectFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<WorkflowRow | null>(null);
  const [values, setValues] = useState<Record<string, string | number | null>>(EMPTY_WORKFLOW_VALUES[kind]);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const pageSize = 10;
  const projects = useApi(() => projectsApi.list({ limit: 500 }), []);
  const parcels = useApi(() => parcelsApi.list({ ...(projectFilter ? { project_id: projectFilter } : {}), limit: 500 }), [projectFilter]);
  const owners = useApi(() => ownersApi.list({ ...(projectFilter ? { project_id: projectFilter } : {}), limit: 500 }), [projectFilter]);
  const records = useApi(() => WORKFLOW_API[kind].list({
    ...(projectFilter ? { project_id: projectFilter } : {}),
    ...(statusFilter ? { [config.statusParam]: statusFilter } : {}),
    ...(kind === "owners" && search.trim() ? { search: search.trim() } : {}),
    limit: 500,
  }), [kind, projectFilter, statusFilter, search]);
  const canWrite = ["SUPER_ADMIN", "CENTRAL_ADMIN", "STATE_ADMIN", "PROJECT_OFFICER"].includes(user?.role || "");
  const canDelete = ["SUPER_ADMIN", "CENTRAL_ADMIN"].includes(user?.role || "");
  const rows = records.data || [];
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const visible = rows.slice((page - 1) * pageSize, page * pageSize);
  const statusOptions = config.fields.find(field => field.name === config.statusParam)?.options || [];

  const startCreate = () => { setEditing(null); setValues({ ...EMPTY_WORKFLOW_VALUES[kind] }); setFormError(null); setEditorOpen(true); };
  const startEdit = (row: WorkflowRow) => {
    setEditing(row);
    setValues(Object.fromEntries(config.fields.map(field => [field.name, (row as any)[field.name] ?? (field.type === "number" ? 0 : "")])));
    setFormError(null);
    setEditorOpen(true);
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setFormError(null);
    const payload = Object.fromEntries(config.fields.map(field => [field.name, field.type === "number" ? Number(values[field.name] ?? 0) : field.source && !values[field.name] ? null : values[field.name] ?? ""]));
    try {
      if (editing) {
        for (const field of config.immutable) delete payload[field];
        await WORKFLOW_API[kind].update(String((editing as any)[config.idField]), payload);
      } else {
        await WORKFLOW_API[kind].create(payload);
      }
      setEditorOpen(false); await records.reload();
    } catch (error: any) { setFormError(error?.response?.data?.detail || "Unable to save this record."); }
    finally { setSaving(false); }
  };
  const remove = async (row: WorkflowRow) => {
    const id = String((row as any)[config.idField]);
    if (!window.confirm(`Delete ${id}?`)) return;
    try { await WORKFLOW_API[kind].delete(id); await records.reload(); }
    catch (error: any) { setFormError(error?.response?.data?.detail || "Unable to delete this record."); }
  };
  const fieldValue = (field: WorkflowField) => values[field.name] ?? "";
  const setValue = (field: WorkflowField, value: string) => setValues(current => ({ ...current, [field.name]: field.type === "number" ? (value === "" ? 0 : Number(value)) : value }));

  return <>
    <SectionHeader eyebrow={config.eyebrow} title={config.title} description={config.description} actions={<><DemoLabel />{canWrite && <button className="primary-button" onClick={startCreate}><Icon name="upload" /> Add record</button>}</>} />
    {formError && !editorOpen && <div className="form-error" role="alert">{formError}</div>}
    {editorOpen && <form className="panel project-editor" onSubmit={save}>
      <div className="panel-head"><div><span className="eyebrow">SYNTHETIC PROTOTYPE RECORD</span><h3>{editing ? `Edit ${(editing as any)[config.idField]}` : `Add ${config.title.toLowerCase()} record`}</h3></div><button type="button" className="secondary-button" onClick={() => setEditorOpen(false)}>Close</button></div>
      <div className="project-editor-grid">
        {config.fields.map(field => {
          const sourceOptions = field.source === "projects" ? (projects.data || []).map(project => ({ id: project.project_id, label: `${project.project_id} · ${project.project_name}` }))
            : field.source === "parcels" ? (parcels.data || []).filter(parcel => !values.project_id || parcel.project_id === values.project_id).map(parcel => ({ id: parcel.parcel_id, label: `${parcel.parcel_id} · ${parcel.survey_number}` }))
            : field.source === "owners" ? (owners.data || []).filter(owner => !values.project_id || owner.project_id === values.project_id).map(owner => ({ id: owner.owner_id, label: `${owner.owner_id} · ${owner.owner_name}` })) : [];
          if (field.type === "textarea") return <label key={field.name}>{field.label}<textarea rows={3} required={field.required} value={fieldValue(field)} onChange={event => setValue(field, event.target.value)} /></label>;
          if (field.type === "select") return <label key={field.name}>{field.label}<select required={field.required} value={fieldValue(field)} onChange={event => setValue(field, event.target.value)}><option value="">{field.required ? "Select…" : "None"}</option>{field.source ? sourceOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>) : field.options?.map(option => <option key={option}>{option}</option>)}</select></label>;
          return <label key={field.name}>{field.label}<input type={field.type || "text"} step={field.type === "number" ? "any" : undefined} required={field.required} value={fieldValue(field)} onChange={event => setValue(field, event.target.value)} /></label>;
        })}
      </div>
      {formError && <div className="form-error" role="alert">{formError}</div>}
      <div className="project-editor-actions"><button className="primary-button" disabled={saving}>{saving ? "Saving…" : "Save record"}</button></div>
    </form>}
    <div className="filter-bar">
      <select value={projectFilter} onChange={event => { setProjectFilter(event.target.value); setPage(1); }}><option value="">All projects</option>{(projects.data || []).map(project => <option key={project.project_id} value={project.project_id}>{project.project_id}</option>)}</select>
      {statusOptions.length > 0 && <select value={statusFilter} onChange={event => { setStatusFilter(event.target.value); setPage(1); }}><option value="">All statuses</option>{statusOptions.map(status => <option key={status}>{status}</option>)}</select>}
      {kind === "owners" && <div className="search-field"><Icon name="search" /><input value={search} placeholder="Search owner name" onChange={event => { setSearch(event.target.value); setPage(1); }} /></div>}
      <span className="result-count">{rows.length} RECORDS</span>
    </div>
    {projects.loading || records.loading ? <Loading label={`Loading ${config.title.toLowerCase()}…`} /> : projects.error ? <ErrorPanel message={projects.error} onRetry={projects.reload} /> : records.error ? <ErrorPanel message={records.error} onRetry={records.reload} /> : <section className="panel document-table"><div className="table-scroll"><table><thead><tr>{config.columns.map(([, label]) => <th key={label}>{label}</th>)}<th>ACTIONS</th></tr></thead><tbody>
      {visible.map(row => <tr key={String((row as any)[config.idField])}>{config.columns.map(([field]) => <td key={field}>{field.endsWith("amount") || field === "pending_amount" ? formatINR((row as any)[field]) : field === "completion_percentage" ? `${(row as any)[field]}%` : String((row as any)[field] ?? "—")}</td>)}<td><div className="parcel-row-actions"><button className="text-button" onClick={() => startEdit(row)}>View / Edit</button>{canDelete && <button className="text-button danger-action" onClick={() => remove(row)}>Delete</button>}</div></td></tr>)}
      {!visible.length && <tr><td colSpan={config.columns.length + 1}>No matching records. Create a synthetic prototype record to begin.</td></tr>}
    </tbody></table></div><div className="pagination"><span>Showing {visible.length ? (page - 1) * pageSize + 1 : 0}–{(page - 1) * pageSize + visible.length} of {rows.length} records</span><div><button disabled={page <= 1} onClick={() => setPage(current => Math.max(1, current - 1))}>‹</button><span>{page} / {totalPages}</span><button disabled={page >= totalPages} onClick={() => setPage(current => Math.min(totalPages, current + 1))}>›</button></div></div></section>}
  </>;
}

export function Reports() {
  const projects = useApi(() => projectsApi.list({ limit: 500 }), []);
  const points = useApi(() => gisApi.projects(), []);
  const overview = useApi(() => analyticsApi.overview(), []);
  const downloadCurrentSnapshot = () => {
    const riskById = new Map((points.data || []).map(point => [point.project_id, point]));
    const rows = projects.data || [];
    const columns = ["project_id", "project_name", "state", "district", "current_stage", "land_proposed_hectares", "land_acquired_hectares", "acquisition_percentage", "compensation_assessed", "compensation_paid", "compensation_pending", "legal_cases", "risk_score", "risk_category", "probability_of_delay", "expected_delay_days"];
    const csvCell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const csv = [columns.join(","), ...rows.map(project => {
      const risk = riskById.get(project.project_id);
      return [project.project_id, project.project_name, project.state, project.district, project.current_stage, project.land_proposed_hectares, project.land_acquired_hectares, project.acquisition_percentage, project.compensation_assessed, project.compensation_paid, project.compensation_pending, project.legal_cases, risk?.risk_score, risk?.risk_category, risk?.probability_of_delay, risk?.expected_delay_days].map(csvCell).join(",");
    })].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "landrisk-current-project-snapshot.csv";
    link.click();
    URL.revokeObjectURL(url);
  };
  const loading = projects.loading || points.loading || overview.loading;
  const error = projects.error || points.error || overview.error;
  return <>
    <SectionHeader eyebrow="CURRENT DATA EXPORT" title="Analytics and Reports" description="Current-state summaries are generated from existing project, prediction, and analytics APIs. Historical time-series data is not available." actions={<DemoLabel />} />
    {loading ? <Loading label="Preparing current portfolio summary…" /> : error ? <ErrorPanel message={error} onRetry={() => { projects.reload(); points.reload(); overview.reload(); }} /> : <>
      <div className="metrics-grid reports-summary">
        <MetricCard label="PROJECTS" value={String(overview.data?.total_projects ?? 0)} detail="current portfolio" trend="" icon="folder" />
        <MetricCard label="AT RISK" value={String(overview.data?.projects_at_risk ?? 0)} detail="latest saved predictions" trend="" icon="pulse" tone="amber" />
        <MetricCard label="CRITICAL" value={String(overview.data?.critical_projects ?? 0)} detail="latest saved predictions" trend="" icon="bolt" tone="red" />
        <MetricCard label="RISK SCORED" value={String(points.data?.filter(point => point.risk_score !== null).length ?? 0)} detail="projects with predictions" trend="" icon="chart" tone="cyan" />
      </div>
      <section className="panel report-download"><div><h3>Project status and risk snapshot</h3><p>Exports current project fields and latest available risk results as CSV. Unscored fields remain blank.</p></div><button className="primary-button" onClick={downloadCurrentSnapshot}><Icon name="download" /> Download CSV</button></section>
      <p className="prototype-notice">Historical trend data not available in current prototype dataset. Report scheduling and PDF generation are not implemented.</p>
    </>}
  </>;
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export function Documents() {
  const docs = useApi(() => documentsApi.list(), []);
  const projects = useApi(() => projectsApi.list({ limit: 500 }), []);
  const { user } = useAuth();
  const [form, setForm] = useState({ project_id: "", document_name: "", document_type: "Notification" });
  const [uploadForm, setUploadForm] = useState({ project_id: "", document_type: "Survey" });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const workflow = useApi(() => selectedId ? documentsApi.workflow(selectedId) : Promise.resolve(null), [selectedId]);
  const [capturedFields, setCapturedFields] = useState<Record<string, string>>({ parcel_id: "", survey_number: "", village: "", taluk: "", district: "", area_hectares: "" });
  const [reviewRemarks, setReviewRemarks] = useState("");
  const [decisionRemarks, setDecisionRemarks] = useState("");
  const [working, setWorking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const canReview = ["SUPER_ADMIN", "CENTRAL_ADMIN", "STATE_ADMIN", "PROJECT_OFFICER"].includes(user?.role || "");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    const projectId = form.project_id.trim();
    const documentName = form.document_name.trim();
    const documentType = form.document_type.trim();

    if (!projectId) {
      setFormError("Enter a valid Project ID before adding a document.");
      return;
    }
    if (!documentName) {
      setFormError("Enter a document name before adding a document.");
      return;
    }
    if (!documentType) {
      setFormError("Select a document type before adding a document.");
      return;
    }

    setSaving(true);
    try {
      await documentsApi.create({
        project_id: projectId,
        document_name: documentName,
        document_type: documentType,
        uploaded_by: user?.email || "unknown",
      });
      setForm({ project_id: "", document_name: "", document_type: "Notification" });
      setSuccessMessage(`Document "${documentName}" was added successfully.`);
      docs.reload();
    } catch (error: any) {
      const message = error?.response?.data?.detail || error?.message || "Unable to save document metadata.";
      setFormError(message);
    } finally {
      setSaving(false);
    }
  };

  const upload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!uploadFile || !uploadForm.project_id) { setFormError("Select a project and a PDF, PNG, or JPEG file."); return; }
    setSaving(true); setFormError(null); setSuccessMessage(null);
    try {
      const document = await documentsApi.upload({ ...uploadForm, file: uploadFile });
      setSelectedId(document.id); setUploadFile(null); setSuccessMessage("Private document uploaded. Capture fields manually to continue the prototype workflow."); docs.reload();
    } catch (error: any) { setFormError(error?.response?.data?.detail || "Unable to upload document."); }
    finally { setSaving(false); }
  };

  const runAction = async (action: () => Promise<unknown>, message: string) => {
    if (!selectedId) return;
    setWorking(true); setFormError(null); setSuccessMessage(null);
    try { await action(); await workflow.reload(); await docs.reload(); setSuccessMessage(message); }
    catch (error: any) { setFormError(error?.response?.data?.detail || "Unable to update the verification workflow."); }
    finally { setWorking(false); }
  };

  const captureFields = () => {
    if (!selectedId) return;
    const extracted_fields = Object.fromEntries(Object.entries(capturedFields).filter(([, value]) => value.trim() !== ""));
    void runAction(() => documentsApi.captureFields(selectedId, extracted_fields, "Manual prototype field capture; no OCR was performed."), "Manual field capture saved.");
  };

  const download = async () => {
    if (!selectedId || !workflow.data?.file) return;
    try {
      const blob = await documentsApi.download(selectedId);
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url; link.download = workflow.data.file.original_filename; link.click(); URL.revokeObjectURL(url);
    } catch (error: any) { setFormError(error?.response?.data?.detail || "Unable to download this private file."); }
  };

  const selectDocument = (id: number) => {
    setSelectedId(id);
    setFormError(null);
    setCapturedFields({ parcel_id: "", survey_number: "", village: "", taluk: "", district: "", area_hectares: "" });
  };

  const fieldLabels: Record<string, string> = { parcel_id: "Parcel ID", survey_number: "Survey number", village: "Village", taluk: "Taluk", district: "District", area_hectares: "Area (hectares)" };

  return <><SectionHeader eyebrow="DOCUMENTS · PROTOTYPE EXTRACTION" title="Document Intelligence" description="Private file storage and persisted officer workflow. Field capture is manual; OCR is not implemented." actions={<DemoLabel />} />
    <section className="panel document-workflow-notice"><strong>Prototype workflow:</strong> uploaded files remain private and require authentication to download. “Extraction” below records manually entered fields; it does not run OCR or claim AI accuracy.</section>
    <section className="panel document-workflow-steps"><span>1 Upload</span><span>2 Manual field capture</span><span>3 Compare with records</span><span>4 Mismatch review</span><span>5 Officer review</span><span>6 Decision</span></section>
    <section className="panel document-upload-panel" style={{ padding: 16, marginBottom: 12 }}>
      <div className="panel-head"><div><span className="eyebrow">PRIVATE FILE STORAGE</span><h3>Upload a document</h3></div></div>
      <form onSubmit={upload} className="document-upload-form">
        <label>Project<select required value={uploadForm.project_id} onChange={event => setUploadForm(current => ({ ...current, project_id: event.target.value }))}><option value="">Select project</option>{(projects.data || []).map(project => <option key={project.project_id} value={project.project_id}>{project.project_id} · {project.project_name}</option>)}</select></label>
        <label>Document type<select value={uploadForm.document_type} onChange={event => setUploadForm(current => ({ ...current, document_type: event.target.value }))}>{["Notification", "Award", "Legal Document", "Compensation", "R&R", "Survey", "Other"].map(type => <option key={type}>{type}</option>)}</select></label>
        <label>PDF / PNG / JPEG · 10 MiB max<input type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" onChange={event => setUploadFile(event.target.files?.[0] || null)} /></label>
        <button className="primary-button" disabled={saving || !canReview || !uploadFile}><Icon name="upload" /> {saving ? "Uploading…" : "Upload file"}</button>
      </form>
    </section>
    <section className="panel" style={{ padding: 16, marginBottom: 16 }}>
      <div className="panel-head"><div><span className="eyebrow">METADATA ONLY</span><h3>Add a record without a file</h3></div></div>
      <form onSubmit={submit} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
        <label style={{ flex: 1, minWidth: 180 }}>Project<div className="input-wrap"><select value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}><option value="">Select project</option>{(projects.data || []).map(project => <option key={project.project_id} value={project.project_id}>{project.project_id}</option>)}</select></div></label>
        <label style={{ flex: 2, minWidth: 200 }}>Document name<div className="input-wrap"><input value={form.document_name} onChange={e => setForm(f => ({ ...f, document_name: e.target.value }))} /></div></label>
        <label>Type<div className="input-wrap"><select value={form.document_type} onChange={e => setForm(f => ({ ...f, document_type: e.target.value }))} style={{ background: "transparent", color: "inherit", border: "none" }}>
          {["Notification", "Award", "Legal Document", "Compensation", "R&R", "Survey", "Other"].map(t => <option key={t}>{t}</option>)}
        </select></div></label>
        <button className="primary-button" type="submit" disabled={saving}><Icon name="upload" /> {saving ? "Saving…" : "Add document"}</button>
      </form>
      {formError && <div role="alert" style={{ marginTop: 12, padding: "8px 10px", borderRadius: 6, background: "rgba(239, 68, 68, 0.12)", color: "#fca5a5", border: "1px solid rgba(239, 68, 68, 0.35)" }}>{formError}</div>}
      {successMessage && <div role="status" aria-live="polite" style={{ marginTop: 12, padding: "8px 10px", borderRadius: 6, background: "rgba(34, 197, 94, 0.12)", color: "#86efac", border: "1px solid rgba(34, 197, 94, 0.35)" }}>{successMessage}</div>}
    </section>
    <section className="panel document-table">
      {docs.loading ? <Loading /> : (
        <table><thead><tr><th>DOCUMENT NAME</th><th>TYPE</th><th>PROJECT</th><th>UPLOADED BY</th><th>DATE</th><th>STATUS</th></tr></thead>
          <tbody>{(docs.data || []).map(d => <tr key={d.id} className={selectedId === d.id ? "selected-document-row" : ""} onClick={() => selectDocument(d.id)}><td><span className="doc-icon"><Icon name="file" /></span><strong>{d.document_name}</strong></td><td><Pill tone="blue">{d.document_type}</Pill></td><td>#{d.project_pk}</td><td>{d.uploaded_by}</td><td>{new Date(d.uploaded_at).toLocaleDateString()}</td><td>{d.status}</td></tr>)}</tbody>
        </table>
      )}
    </section>
    {selectedId !== null && <section className="panel document-verification-workspace">
      {workflow.loading ? <Loading label="Loading verification workflow…" /> : workflow.error ? <ErrorPanel message={workflow.error} onRetry={workflow.reload} /> : workflow.data && <>
        <div className="panel-head"><div><span className="eyebrow">DOCUMENT {workflow.data.document.id} · PROJECT PK {workflow.data.document.project_pk}</span><h3>{workflow.data.document.document_name}</h3></div><Pill tone={workflow.data.document.status === "Verified" ? "green" : workflow.data.document.status === "Rejected" ? "red" : "amber"}>{workflow.data.document.status}</Pill></div>
        <div className="document-file-meta">{workflow.data.file ? <><span>{workflow.data.file.original_filename} · {(workflow.data.file.size_bytes / 1024).toFixed(1)} KiB</span><button type="button" className="secondary-button" onClick={download}><Icon name="download" /> Secure download</button></> : <span>Metadata-only record; no file is stored.</span>}</div>
        <section className="document-workflow-result">
          <h3>2 · Manual field capture <Pill tone="amber">NO OCR</Pill></h3>
          <div className="document-capture-grid">{Object.entries(fieldLabels).map(([key, label]) => <label key={key}>{label}<input value={capturedFields[key] || ""} onChange={event => setCapturedFields(current => ({ ...current, [key]: event.target.value }))} /></label>)}</div>
          <p className="prototype-notice">Fields are entered by a user for prototype comparison. This stage does not extract text from the uploaded file.</p>
          <button type="button" className="primary-button" disabled={working || !canReview} onClick={captureFields}>Save captured fields</button>
        </section>
        {workflow.data.extraction && <section className="document-workflow-result">
          <h3>3 · Database comparison</h3><p>{workflow.data.extraction.method_label}</p>
          <div className="document-field-results">{Object.entries(workflow.data.extraction.extracted_fields).map(([key, value]) => <div key={key}><span>{fieldLabels[key] || key}</span><strong>{String(value)}</strong></div>)}</div>
          <button type="button" className="secondary-button" disabled={working || !canReview} onClick={() => void runAction(() => documentsApi.compare(selectedId), "Comparison saved.")}>Compare with project / parcel records</button>
        </section>}
        {workflow.data.comparison && <section className="document-workflow-result">
          <h3>4 · Mismatch detection · {workflow.data.comparison.comparison_status}</h3>
          <div className="table-scroll"><table><thead><tr><th>FIELD</th><th>DATABASE</th><th>CAPTURED</th><th>RESULT</th></tr></thead><tbody>{workflow.data.comparison.mismatches.map((item, index) => <tr key={`${item.field_name}-${index}`}><td>{fieldLabels[item.field_name] || item.field_name}</td><td>{item.database_value || "—"}</td><td>{item.captured_value}</td><td>{item.result}</td></tr>)}</tbody></table></div>
        </section>}
        <section className="document-workflow-result">
          <h3>5 · Officer review</h3><textarea rows={2} value={reviewRemarks} onChange={event => setReviewRemarks(event.target.value)} placeholder="Review remarks" />
          <div className="document-action-row"><button type="button" className="secondary-button" disabled={working || !canReview} onClick={() => void runAction(() => documentsApi.review(selectedId, "UNDER_REVIEW", reviewRemarks), "Review status saved.")}>Mark under review</button><button type="button" className="secondary-button" disabled={working || !canReview} onClick={() => void runAction(() => documentsApi.review(selectedId, "NEEDS_INFORMATION", reviewRemarks), "Information request saved.")}>Needs information</button></div>
          {workflow.data.reviews.map(review => <p key={review.id}><strong>{review.status}</strong> · {review.reviewer_email} · {review.remarks}</p>)}
        </section>
        <section className="document-workflow-result">
          <h3>6 · Verification decision</h3><textarea rows={2} value={decisionRemarks} onChange={event => setDecisionRemarks(event.target.value)} placeholder="Decision remarks" />
          <div className="document-action-row">{([["VERIFIED", "Verify"], ["REJECTED", "Reject"], ["REQUEST_REUPLOAD", "Request re-upload"]] as const).map(([decision, label]) => <button type="button" key={decision} className={decision === "REJECTED" ? "secondary-button danger-action" : "secondary-button"} disabled={working || !canReview} onClick={() => void runAction(() => documentsApi.decide(selectedId, decision, decisionRemarks), `Decision recorded: ${label}.`)}>{label}</button>)}</div>
          {workflow.data.decision && <p>Decision: <strong>{workflow.data.decision.decision}</strong> by {workflow.data.decision.officer_email} · {workflow.data.decision.remarks}</p>}
        </section>
      </>}
    </section>}
    {(formError || successMessage) && <div className={formError ? "form-error" : "prototype-notice"} role={formError ? "alert" : "status"}>{formError || successMessage}</div>}
  </>;
}

// ---------------------------------------------------------------------------
// Administration / Users & Roles / Audit Logs / Settings
// ---------------------------------------------------------------------------

export function GenericAdmin({ page }: { page: Page }) {
  const isAudit = page === "Audit Logs", isSettings = page === "Settings";
  const title = isAudit ? "Audit & Activity Log" : isSettings ? "Platform Settings" : page === "Users & Roles" ? "Users & Roles" : "Administration";
  const desc = isAudit ? "Real audit trail — logins, project changes, predictions and alert actions are recorded server-side." : isSettings ? "Prototype-only settings. This backend has no user-preference settings API, so changes are not saved." : "The backend enforces these RBAC roles, but does not currently provide a user-management API.";
  if (isAudit) return <><SectionHeader eyebrow="GOVERNANCE & COMPLIANCE" title={title} description={desc} actions={<DemoLabel />} /><AuditTable /></>;
  if (isSettings) return <><SectionHeader eyebrow="SYSTEM CONFIGURATION" title={title} description={desc} actions={<DemoLabel />} /><SettingsPanel /></>;
  return <><SectionHeader eyebrow="ACCESS GOVERNANCE" title={title} description={desc} actions={<DemoLabel />} />
    <section className="panel roles-panel"><div className="panel-head"><div><span className="eyebrow">ROLE DIRECTORY</span><h3>RBAC roles enforced by the backend</h3></div></div>
      {["SUPER_ADMIN", "CENTRAL_ADMIN", "STATE_ADMIN", "DISTRICT_OFFICER", "PROJECT_OFFICER", "ANALYST", "VIEWER"].map((r, i) => (
        <div className="role-row" key={r}><span className={`role-icon r${i}`}><Icon name={i === 0 ? "shield" : "users"} /></span><div><strong>{r}</strong></div></div>
      ))}
    </section>
  </>;
}

export function UsersAdmin() {
  const users = useApi(() => adminUsersApi.list(), []);
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ email: "", full_name: "", role: "VIEWER", password: "" });
  const [editForm, setEditForm] = useState({ full_name: "", role: "VIEWER", password: "", is_active: true });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const createUser = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(null);
    try { await adminUsersApi.create(form); setForm({ email: "", full_name: "", role: "VIEWER", password: "" }); setCreating(false); await users.reload(); }
    catch (e: any) { setError(e?.response?.data?.detail || "Unable to create user."); }
    finally { setBusy(false); }
  };

  const beginEdit = (account: NonNullable<typeof users.data>[number]) => {
    setEditingId(account.id);
    setEditForm({ full_name: account.full_name, role: account.role, password: "", is_active: account.is_active });
    setError(null);
  };

  const saveEdit = async (id: number) => {
    setBusy(true); setError(null);
    const payload = { ...editForm, ...(editForm.password ? { password: editForm.password } : {}) };
    if (!editForm.password) delete (payload as Partial<typeof editForm>).password;
    try { await adminUsersApi.update(id, payload); setEditingId(null); await users.reload(); }
    catch (e: any) { setError(e?.response?.data?.detail || "Unable to update user."); }
    finally { setBusy(false); }
  };

  const deactivate = async (account: NonNullable<typeof users.data>[number]) => {
    if (!window.confirm(`Deactivate ${account.email}?`)) return;
    setError(null);
    try { await adminUsersApi.deactivate(account.id); await users.reload(); }
    catch (e: any) { setError(e?.response?.data?.detail || "Unable to deactivate user."); }
  };

  return <>
    <SectionHeader eyebrow="ACCESS GOVERNANCE" title="Administration · Users & Roles" description="Manage prototype accounts. Passwords are hashed by the backend and never returned to this page." actions={<DemoLabel />} />
    {!isSuperAdmin && <div className="prototype-feature-notice">User administration requires the SUPER_ADMIN role. Your current role is {user?.role}.</div>}
    {isSuperAdmin && <>
      <section className="panel roles-panel"><div className="panel-head"><div><span className="eyebrow">ROLE DIRECTORY</span><h3>Backend-enforced roles</h3></div><button className="primary-button" onClick={() => { setCreating(value => !value); setError(null); }}>{creating ? "Close" : "Add user"}</button></div>
        <div className="role-directory">{["SUPER_ADMIN", "CENTRAL_ADMIN", "STATE_ADMIN", "DISTRICT_OFFICER", "PROJECT_OFFICER", "ANALYST", "VIEWER"].map(role => <span key={role}>{role}</span>)}</div>
      </section>
      {creating && <form className="panel project-editor" onSubmit={createUser}><div className="panel-head"><div><span className="eyebrow">NEW ACCOUNT</span><h3>Create user</h3></div></div><div className="project-editor-grid">
        <label>Email<input type="email" required value={form.email} onChange={event => setForm(current => ({ ...current, email: event.target.value }))} /></label>
        <label>Full name<input required value={form.full_name} onChange={event => setForm(current => ({ ...current, full_name: event.target.value }))} /></label>
        <label>Role<select value={form.role} onChange={event => setForm(current => ({ ...current, role: event.target.value }))}>{["SUPER_ADMIN", "CENTRAL_ADMIN", "STATE_ADMIN", "DISTRICT_OFFICER", "PROJECT_OFFICER", "ANALYST", "VIEWER"].map(role => <option key={role}>{role}</option>)}</select></label>
        <label>Initial password (12+ characters)<input type="password" minLength={12} required value={form.password} onChange={event => setForm(current => ({ ...current, password: event.target.value }))} /></label>
      </div>{error && <div className="form-error">{error}</div>}<div className="project-editor-actions"><button className="primary-button" disabled={busy}>{busy ? "Creating…" : "Create user"}</button></div></form>}
      {error && !creating && <div className="form-error" role="alert">{error}</div>}
      {users.loading ? <Loading label="Loading accounts…" /> : users.error ? <ErrorPanel message={users.error} onRetry={users.reload} /> : <section className="panel document-table"><div className="table-scroll"><table><thead><tr><th>NAME</th><th>EMAIL</th><th>ROLE</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>{(users.data || []).map(account => <tr key={account.id}>
        {editingId === account.id ? <><td><input value={editForm.full_name} onChange={event => setEditForm(current => ({ ...current, full_name: event.target.value }))} /></td><td>{account.email}</td><td><select value={editForm.role} onChange={event => setEditForm(current => ({ ...current, role: event.target.value }))}>{["SUPER_ADMIN", "CENTRAL_ADMIN", "STATE_ADMIN", "DISTRICT_OFFICER", "PROJECT_OFFICER", "ANALYST", "VIEWER"].map(role => <option key={role}>{role}</option>)}</select></td><td><label><input type="checkbox" checked={editForm.is_active} onChange={event => setEditForm(current => ({ ...current, is_active: event.target.checked }))} /> Active</label><input aria-label="Optional password reset" type="password" minLength={12} placeholder="Optional password reset" value={editForm.password} onChange={event => setEditForm(current => ({ ...current, password: event.target.value }))} /></td><td><button className="text-button" disabled={busy} onClick={() => saveEdit(account.id)}>Save</button><button className="text-button" onClick={() => setEditingId(null)}>Cancel</button></td></> : <><td>{account.full_name}</td><td>{account.email}</td><td>{account.role}</td><td>{account.is_active ? "Active" : "Deactivated"}</td><td><button className="text-button" onClick={() => beginEdit(account)}>Edit</button>{account.is_active && account.id !== user?.id && <button className="text-button danger-action" onClick={() => deactivate(account)}>Deactivate</button>}</td></>}
      </tr>)}</tbody></table></div></section>}
    </>}
  </>;
}

function AuditTable() {
  const logs = useApi(() => auditApi.list(200), []);
  if (logs.loading) return <Loading label="Loading audit log…" />;
  if (logs.error) return <ErrorPanel message={logs.error} onRetry={logs.reload} />;
  return <section className="panel document-table"><div className="table-scroll"><table><thead><tr><th>TIMESTAMP</th><th>USER</th><th>ACTION</th><th>ENTITY</th><th>DETAILS</th></tr></thead>
    <tbody>{(logs.data || []).map(l => <tr key={l.id}><td>{new Date(l.timestamp).toLocaleString()}</td><td><strong>{l.user_email}</strong></td><td>{l.action}</td><td>{l.entity} {l.entity_id}</td><td>{l.details}</td></tr>)}</tbody>
  </table></div></section>;
}

function SettingsPanel() {
  return <div className="settings-layout"><section className="panel settings-form"><div className="panel-head"><div><span className="eyebrow">GENERAL</span><h3>Platform preferences (prototype — not persisted)</h3></div></div>
    <p className="prototype-notice">No preferences are persisted by this prototype. Settings controls are intentionally unavailable.</p>
  </section></div>;
}
