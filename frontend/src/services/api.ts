import axios from "axios";

// Base URL comes from the environment — never hard-code a host.
// See frontend/.env.example.
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const api = axios.create({ baseURL: API_URL });

const TOKEN_KEY = "acquinova_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Single place to react to auth expiry — components don't need to know about it.
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401 && onUnauthorized) onUnauthorized();
    return Promise.reject(error);
  }
);

// ---------------------------------------------------------------------------
// Types (mirrors backend/app/schemas.py)
// ---------------------------------------------------------------------------

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
}

export type AdminUserCreate = Pick<User, "email" | "full_name"> & { password: string; role: string };
export type AdminUserUpdate = Partial<Pick<User, "full_name" | "role" | "is_active">> & { password?: string };

export interface Project {
  id: number;
  project_id: string;
  project_code: string;
  project_name: string;
  project_type: string;
  ministry: string;
  implementing_agency: string;
  state: string;
  district: string;
  taluk: string;
  village: string;
  latitude: number;
  longitude: number;
  land_proposed_hectares: number;
  land_acquired_hectares: number;
  acquisition_percentage: number;
  affected_families: number;
  displaced_families: number;
  notification_status: string;
  notification_date: string;
  survey_status: string;
  survey_completion_percentage: number;
  approval_status: string;
  approval_pending_days: number;
  award_status: string;
  award_date: string;
  compensation_assessed: number;
  compensation_paid: number;
  compensation_pending: number;
  legal_cases: number;
  legal_dispute_severity: string;
  possession_status: string;
  possession_percentage: number;
  rr_status: string;
  rr_completion_percentage: number;
  documentation_completeness: number;
  stakeholder_responsiveness: number;
  current_stage: string;
  planned_completion_date: string;
  actual_completion_date: string;
  project_start_date: string;
  historical_agency_delay_rate: number;
}

export type ProjectWrite = Omit<Project, "id" | "created_at" | "updated_at">;

export interface LandParcel {
  id: number;
  parcel_id: string;
  project_id: string;
  project_pk: number;
  survey_number: string;
  parcel_number: string;
  village: string;
  taluk: string;
  district: string;
  state: string;
  area_hectares: number;
  acquisition_status: string;
  compensation_status: string;
  legal_status: string;
  possession_status: string;
  latitude: number | null;
  longitude: number | null;
  geometry: { type: "Polygon"; coordinates: number[][][] } | null;
  created_at: string;
  updated_at: string;
}

export type LandParcelWrite = Omit<LandParcel, "id" | "project_pk" | "created_at" | "updated_at">;

export interface LandOwner {
  id: number; owner_id: string; parcel_id: string; project_id: string; owner_name: string;
  ownership_share: number; ownership_type: string; contact_status: string; compensation_status: string; legal_status: string;
  created_at: string; updated_at: string;
}

export type LandOwnerWrite = Omit<LandOwner, "id" | "created_at" | "updated_at">;

export interface CompensationRecord {
  id: number; case_id: string; project_id: string; parcel_id: string | null; owner_id: string | null;
  assessed_amount: number; approved_amount: number | null; paid_amount: number; pending_amount: number;
  payment_status: string; assessment_date: string; approval_date: string; payment_date: string; remarks: string;
  created_at: string; updated_at: string;
}

export type CompensationRecordWrite = Omit<CompensationRecord, "id" | "pending_amount" | "created_at" | "updated_at">;

export interface LegalCase {
  id: number; case_id: string; project_id: string; parcel_id: string | null; owner_id: string | null;
  case_number: string; court: string; case_type: string; status: string; severity: string;
  filing_date: string; next_hearing_date: string; resolution_date: string; assigned_officer: string; remarks: string;
  created_at: string; updated_at: string;
}

export type LegalCaseWrite = Omit<LegalCase, "id" | "created_at" | "updated_at">;

export interface ResettlementRecord {
  id: number; rr_id: string; project_id: string; parcel_id: string | null; owner_id: string | null;
  beneficiary_name: string; entitlement_type: string; status: string; completion_percentage: number;
  package_assessed: number; package_paid: number; resettlement_site: string; remarks: string;
  created_at: string; updated_at: string;
}

export type ResettlementRecordWrite = Omit<ResettlementRecord, "id" | "created_at" | "updated_at">;

export interface PossessionRecord {
  id: number; possession_id: string; project_id: string; parcel_id: string; status: string;
  possession_date: string; survey_status: string; handover_date: string; remarks: string;
  created_at: string; updated_at: string;
}

export type PossessionRecordWrite = Omit<PossessionRecord, "id" | "created_at" | "updated_at">;

export interface Driver {
  feature: string;
  contribution: number;
}

export interface Explanation {
  top_positive_drivers: Driver[];
  top_negative_drivers: Driver[];
  model_version: string;
}

export interface StageRisk {
  stage: string;
  risk_score: number;
  risk_category: string;
  methodology: string;
}

export interface Recommendation {
  priority: string;
  reason: string;
  recommended_action: string;
  responsible_role: string;
  expected_impact: string;
}

export interface Prediction {
  id: number;
  project_id: string;
  probability_of_delay: number;
  risk_score: number;
  risk_category: string;
  expected_delay_days: number;
  current_stage: string;
  stage_risks: StageRisk[];
  top_positive_drivers: Driver[];
  top_negative_drivers: Driver[];
  recommendations: Recommendation[];
  model_version: string;
  classifier_algorithm: string;
  regressor_algorithm: string;
  created_at: string;
}

export interface Alert {
  id: number;
  project_pk: number;
  alert_type: string;
  severity: string;
  message: string;
  status: string;
  created_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
}

export interface AnalyticsOverview {
  total_projects: number;
  projects_at_risk: number;
  critical_projects: number;
  average_risk_score: number;
  average_predicted_delay: number;
  projects_requiring_intervention: number;
}

export interface DomainOverview {
  total_projects: number;
  total_parcels: number;
  total_owners: number;
  compensation_cases: number;
  compensation_pending_amount: number;
  legal_cases: number;
  documents: number;
  documents_pending_review: number;
  rr_records: number;
  rr_completed: number;
  possession_records: number;
  possession_taken: number;
  projects_at_risk: number;
}

export interface StateStat {
  state: string;
  project_count: number;
  average_risk_score: number;
}

export interface DistrictStat {
  state: string;
  district: string;
  project_count: number;
  average_risk_score: number;
}

export interface MapProject {
  project_id: string;
  project_name: string;
  state: string;
  district: string;
  latitude: number;
  longitude: number;
  current_stage: string;
  risk_score: number | null;
  risk_category: string;
  probability_of_delay: number | null;
  expected_delay_days: number | null;
}

export interface ModelMetrics {
  metadata: {
    model_version: string;
    classifier_algorithm: string;
    regressor_algorithm: string;
    trained_at: string;
    dataset_size: number;
    train_size: number;
    val_size: number;
    feature_count: number;
    dataset_provenance: string;
  };
  metrics: {
    classification: { selected_model: string; all_models: Record<string, any> };
    regression: { selected_model: string; all_models: Record<string, any> };
  };
}

export interface ModelVersion {
  version: string;
  classifier_algorithm: string;
  regressor_algorithm: string;
  trained_at: string;
  dataset_size: number;
  is_active: boolean;
}

export interface DataQualityRow {
  project_id: string;
  completeness_percentage: number;
  missing_fields: string[];
  has_duplicates: boolean;
  has_invalid_dates: boolean;
  has_conflicting_values: boolean;
  confidence_score: number;
}

export interface AuditLogRow {
  id: number;
  user_email: string;
  action: string;
  entity: string;
  entity_id: string;
  details: string;
  timestamp: string;
}

export interface DocumentRow {
  id: number;
  project_pk: number;
  document_name: string;
  document_type: string;
  uploaded_by: string;
  uploaded_at: string;
  status: string;
}

export interface DocumentWorkflow {
  document: DocumentRow;
  file: { original_filename: string; content_type: string; size_bytes: number } | null;
  extraction: { id: number; document_id: number; extraction_status: string; extracted_fields: Record<string, string | number | boolean>; method_label: string; notes: string; updated_at: string } | null;
  comparison: { id: number; document_id: number; comparison_status: string; compared_by: string; compared_at: string; mismatches: { field_name: string; database_value: string; captured_value: string; result: string }[] } | null;
  reviews: { id: number; document_id: number; reviewer_email: string; status: string; remarks: string; reviewed_at: string }[];
  decision: { id: number; document_id: number; decision: string; officer_email: string; remarks: string; decided_at: string } | null;
  workflow_label: string;
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

export const authApi = {
  login: async (email: string, password: string) => {
    const form = new URLSearchParams();
    form.set("username", email);
    form.set("password", password);
    const res = await api.post<{ access_token: string; token_type: string }>("/api/auth/login", form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    return res.data;
  },
  me: async () => (await api.get<User>("/api/auth/me")).data,
};

export const adminUsersApi = {
  list: async () => (await api.get<User[]>("/api/admin/users")).data,
  create: async (payload: AdminUserCreate) => (await api.post<User>("/api/admin/users", payload)).data,
  update: async (id: number, payload: AdminUserUpdate) => (await api.put<User>(`/api/admin/users/${id}`, payload)).data,
  deactivate: async (id: number) => (await api.delete<User>(`/api/admin/users/${id}`)).data,
};

export const projectsApi = {
  list: async (params?: Record<string, string | number>) =>
    (await api.get<Project[]>("/api/projects", { params })).data,
  create: async (payload: ProjectWrite) => (await api.post<Project>("/api/projects", payload)).data,
  get: async (projectId: string) => (await api.get<Project>(`/api/projects/${projectId}`)).data,
  update: async (projectId: string, payload: Partial<ProjectWrite>) =>
    (await api.put<Project>(`/api/projects/${projectId}`, payload)).data,
  delete: async (projectId: string) => api.delete(`/api/projects/${projectId}`),
};

export const parcelsApi = {
  list: async (params?: Record<string, string | number>) =>
    (await api.get<LandParcel[]>("/api/parcels", { params })).data,
  get: async (parcelId: string) => (await api.get<LandParcel>(`/api/parcels/${encodeURIComponent(parcelId)}`)).data,
  create: async (payload: LandParcelWrite) => (await api.post<LandParcel>("/api/parcels", payload)).data,
  update: async (parcelId: string, payload: Partial<LandParcelWrite>) =>
    (await api.put<LandParcel>(`/api/parcels/${encodeURIComponent(parcelId)}`, payload)).data,
  delete: async (parcelId: string) => api.delete(`/api/parcels/${encodeURIComponent(parcelId)}`),
};

export const ownersApi = {
  list: async (params?: Record<string, string | number>) => (await api.get<LandOwner[]>("/api/owners", { params })).data,
  get: async (ownerId: string) => (await api.get<LandOwner>(`/api/owners/${encodeURIComponent(ownerId)}`)).data,
  create: async (payload: LandOwnerWrite) => (await api.post<LandOwner>("/api/owners", payload)).data,
  update: async (ownerId: string, payload: Partial<LandOwnerWrite>) => (await api.put<LandOwner>(`/api/owners/${encodeURIComponent(ownerId)}`, payload)).data,
  delete: async (ownerId: string) => api.delete(`/api/owners/${encodeURIComponent(ownerId)}`),
};

export const compensationApi = {
  list: async (params?: Record<string, string | number>) => (await api.get<CompensationRecord[]>("/api/compensation", { params })).data,
  get: async (caseId: string) => (await api.get<CompensationRecord>(`/api/compensation/${encodeURIComponent(caseId)}`)).data,
  create: async (payload: CompensationRecordWrite) => (await api.post<CompensationRecord>("/api/compensation", payload)).data,
  update: async (caseId: string, payload: Partial<CompensationRecordWrite>) => (await api.put<CompensationRecord>(`/api/compensation/${encodeURIComponent(caseId)}`, payload)).data,
  delete: async (caseId: string) => api.delete(`/api/compensation/${encodeURIComponent(caseId)}`),
};

export const legalCasesApi = {
  list: async (params?: Record<string, string | number>) => (await api.get<LegalCase[]>("/api/legal-cases", { params })).data,
  get: async (caseId: string) => (await api.get<LegalCase>(`/api/legal-cases/${encodeURIComponent(caseId)}`)).data,
  create: async (payload: LegalCaseWrite) => (await api.post<LegalCase>("/api/legal-cases", payload)).data,
  update: async (caseId: string, payload: Partial<LegalCaseWrite>) => (await api.put<LegalCase>(`/api/legal-cases/${encodeURIComponent(caseId)}`, payload)).data,
  delete: async (caseId: string) => api.delete(`/api/legal-cases/${encodeURIComponent(caseId)}`),
};

export const rrApi = {
  list: async (params?: Record<string, string | number>) => (await api.get<ResettlementRecord[]>("/api/rr-records", { params })).data,
  get: async (rrId: string) => (await api.get<ResettlementRecord>(`/api/rr-records/${encodeURIComponent(rrId)}`)).data,
  create: async (payload: ResettlementRecordWrite) => (await api.post<ResettlementRecord>("/api/rr-records", payload)).data,
  update: async (rrId: string, payload: Partial<ResettlementRecordWrite>) => (await api.put<ResettlementRecord>(`/api/rr-records/${encodeURIComponent(rrId)}`, payload)).data,
  delete: async (rrId: string) => api.delete(`/api/rr-records/${encodeURIComponent(rrId)}`),
};

export const possessionApi = {
  list: async (params?: Record<string, string | number>) => (await api.get<PossessionRecord[]>("/api/possession-records", { params })).data,
  get: async (recordId: string) => (await api.get<PossessionRecord>(`/api/possession-records/${encodeURIComponent(recordId)}`)).data,
  create: async (payload: PossessionRecordWrite) => (await api.post<PossessionRecord>("/api/possession-records", payload)).data,
  update: async (recordId: string, payload: Partial<PossessionRecordWrite>) => (await api.put<PossessionRecord>(`/api/possession-records/${encodeURIComponent(recordId)}`, payload)).data,
  delete: async (recordId: string) => api.delete(`/api/possession-records/${encodeURIComponent(recordId)}`),
};

export const predictionsApi = {
  run: async (projectId: string) =>
    (await api.post<Prediction>("/api/predictions", { project_id: projectId })).data,
  history: async (projectId: string) =>
    (await api.get<Prediction[]>(`/api/predictions/${projectId}`)).data,
  explanation: async (projectId: string) =>
    (await api.get<Explanation>(`/api/projects/${projectId}/explanation`)).data,
  recommendations: async (projectId: string) =>
    (await api.get<Recommendation[]>(`/api/projects/${projectId}/recommendations`)).data,
  stageRisks: async (projectId: string) =>
    (await api.get<StageRisk[]>(`/api/projects/${projectId}/stage-risks`)).data,
};

export const analyticsApi = {
  overview: async () => (await api.get<AnalyticsOverview>("/api/analytics/overview")).data,
  domainOverview: async () => (await api.get<DomainOverview>("/api/analytics/domain-overview")).data,
  byState: async () => (await api.get<StateStat[]>("/api/analytics/states")).data,
  byDistrict: async (state?: string) =>
    (await api.get<DistrictStat[]>("/api/analytics/districts", { params: state ? { state } : {} })).data,
};

export const gisApi = {
  projects: async (params?: { state?: string; district?: string }) =>
    (await api.get<MapProject[]>("/api/map/projects", { params })).data,
};

export const alertsApi = {
  list: async (status?: string) =>
    (await api.get<Alert[]>("/api/alerts", { params: status ? { status } : {} })).data,
  acknowledge: async (id: number) => (await api.post<Alert>(`/api/alerts/${id}/acknowledge`)).data,
  resolve: async (id: number) => (await api.post<Alert>(`/api/alerts/${id}/resolve`)).data,
};

export const modelApi = {
  metrics: async () => (await api.get<ModelMetrics>("/api/model/metrics")).data,
  featureImportance: async () => (await api.get<{ feature: string; mean_abs_shap: number }[]>("/api/model/feature-importance")).data,
  versions: async () => (await api.get<ModelVersion[]>("/api/model/versions")).data,
  retrain: async () => (await api.post("/api/model/retrain")).data,
};

export const dataQualityApi = {
  report: async () => (await api.get<DataQualityRow[]>("/api/data-quality")).data,
};

export const auditApi = {
  list: async (limit = 100) => (await api.get<AuditLogRow[]>("/api/audit", { params: { limit } })).data,
};

export const documentsApi = {
  list: async (projectId?: string) =>
    (await api.get<DocumentRow[]>("/api/documents", { params: projectId ? { project_id: projectId } : {} })).data,
  create: async (payload: { project_id: string; document_name: string; document_type: string; uploaded_by: string }) =>
    (await api.post<DocumentRow>("/api/documents", payload)).data,
  upload: async (payload: { project_id: string; document_type: string; file: File }) => {
    const form = new FormData();
    form.set("project_id", payload.project_id);
    form.set("document_type", payload.document_type);
    form.set("file", payload.file);
    return (await api.post<DocumentRow>("/api/documents/upload", form)).data;
  },
  workflow: async (documentId: number) => (await api.get<DocumentWorkflow>(`/api/documents/${documentId}/workflow`)).data,
  download: async (documentId: number) => (await api.get<Blob>(`/api/documents/${documentId}/file`, { responseType: "blob" })).data,
  captureFields: async (documentId: number, extracted_fields: Record<string, string | number>, notes = "") =>
    (await api.post<DocumentWorkflow["extraction"]>(`/api/documents/${documentId}/extract`, { extracted_fields, notes })).data,
  compare: async (documentId: number) => (await api.post<NonNullable<DocumentWorkflow["comparison"]>>(`/api/documents/${documentId}/compare`)).data,
  review: async (documentId: number, status: string, remarks: string) =>
    (await api.post<DocumentWorkflow["reviews"][number]>(`/api/documents/${documentId}/review`, { status, remarks })).data,
  decide: async (documentId: number, decision: string, remarks: string) =>
    (await api.post<NonNullable<DocumentWorkflow["decision"]>>(`/api/documents/${documentId}/decision`, { decision, remarks })).data,
};
