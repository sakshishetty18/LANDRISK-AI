import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';

const shapFactors = [
  { factor: 'Days in Current Stage', shap: 0.38, contribution: 'High', direction: 'Risk' },
  { factor: 'Compensation Delay (days)', shap: 0.27, contribution: 'High', direction: 'Risk' },
  { factor: 'Legal Dispute Severity', shap: 0.18, contribution: 'Medium', direction: 'Risk' },
  { factor: 'Documentation Completeness', shap: -0.12, contribution: 'Medium', direction: 'Protective' },
  { factor: 'Historical Agency Delay Rate', shap: 0.09, contribution: 'Low', direction: 'Risk' },
  { factor: 'Possession Gap (acquired vs required)', shap: 0.06, contribution: 'Low', direction: 'Risk' },
  { factor: 'No. of Affected Persons', shap: 0.04, contribution: 'Low', direction: 'Risk' },
  { factor: 'R&R Completion Rate', shap: -0.03, contribution: 'Low', direction: 'Protective' },
];

const radarData = [
  { subject: 'Compensation', A: 92 },
  { subject: 'Legal', A: 75 },
  { subject: 'Documentation', A: 45 },
  { subject: 'R&R', A: 60 },
  { subject: 'Possession', A: 80 },
  { subject: 'Objections', A: 55 },
];

const history = [
  { date: 'Sep-2025', score: 58, predicted: 28 },
  { date: 'Oct-2025', score: 71, predicted: 38 },
  { date: '29-Oct-2025', score: 84, predicted: 60 },
];

export default function AIRiskAssessment() {
  return (
    <div>
      <div style={{ background: '#1a4c96', color: 'white', padding: '12px 24px' }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>AI-Based Delay Risk Assessment</div>
        <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>
          Predictive risk assessment using machine learning and explainable AI (SHAP) to identify contributing factors.
        </div>
      </div>

      <div className="p-4 max-w-screen-2xl mx-auto" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', padding: '5px 12px', borderRadius: 2, fontSize: 12, color: '#92400e' }}>
          ⚠ <strong>DEMONSTRATION DATA</strong> — AI predictions are decision-support tools. All acquisition decisions must be made by authorized officers as per applicable law.
        </div>

        {/* Project selector */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#1a2744' }}>Select Project:</label>
          <select className="form-input" style={{ width: 300 }}>
            <option>NH-001 — NH-48 Bengaluru–Chennai Expressway</option>
            <option>RJ-004 — Delhi–Amritsar–Katra Greenfield Highway</option>
            <option>MH-005 — Nagpur–Mumbai Super Communication Expressway</option>
          </select>
          <button className="gov-btn gov-btn-primary">Run Assessment</button>
        </div>

        {/* Risk score summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 1fr', gap: 12, alignItems: 'stretch' }}>
          {/* Score gauge */}
          <div className="gov-card p-4" style={{ textAlign: 'center', minWidth: 200 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', marginBottom: 8 }}>Risk Score</div>
            <div style={{ position: 'relative', width: 120, height: 120, margin: '0 auto' }}>
              <svg viewBox="0 0 120 120" width="120" height="120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#e5e7eb" strokeWidth="12" />
                <circle cx="60" cy="60" r="50" fill="none" stroke="#dc2626" strokeWidth="12"
                  strokeDasharray={`${84 * 3.14} ${100 * 3.14}`}
                  strokeDashoffset="79" strokeLinecap="round"
                  transform="rotate(-90 60 60)" />
                <text x="60" y="55" textAnchor="middle" fontSize="24" fontWeight="700" fill="#1a2744">84</text>
                <text x="60" y="70" textAnchor="middle" fontSize="10" fill="#6b7280">/100</text>
              </svg>
            </div>
            <div className="status-badge badge-critical" style={{ marginTop: 4 }}>CRITICAL RISK</div>
          </div>

          <div className="gov-card p-4">
            <div className="gov-section-title">Prediction Summary</div>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <tbody>
                {[
                  ['Risk Score', <strong style={{ color: '#dc2626', fontSize: 18 }}>84 / 100</strong>],
                  ['Delay Probability', <strong style={{ color: '#dc2626' }}>91.4%</strong>],
                  ['Expected Delay', <strong style={{ color: '#dc2626' }}>60–75 days</strong>],
                  ['Risk Category', <span className="status-badge badge-critical">Critical</span>],
                  ['Model Version', 'LandRisk-ML v3.2.1'],
                  ['Last Prediction', '29-Oct-2025 09:14 IST'],
                  ['Training Data', '4,218 historical cases'],
                  ['Model Accuracy', '87.3% (Validation Set)'],
                ].map(([k, v]) => (
                  <tr key={String(k)} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '5px 0', color: '#6b7280', width: '45%' }}>{k}</td>
                    <td style={{ padding: '5px 0', fontWeight: 500 }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="gov-card p-4">
            <div className="gov-section-title">Risk Factor Radar</div>
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                <Radar name="Risk" dataKey="A" stroke="#dc2626" fill="#dc2626" fillOpacity={0.2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="gov-card p-4">
            <div className="gov-section-title">Risk Trend</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={history} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="score" name="Risk Score" fill="#dc2626" radius={[1,1,0,0]} />
                <Bar dataKey="predicted" name="Predicted Delay (days)" fill="#ea580c" radius={[1,1,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SHAP explanation */}
        <div className="gov-card p-4">
          <div className="gov-section-title">Explainable AI — Contributing Factors (SHAP Analysis)</div>
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '7px 12px', borderRadius: 2, marginBottom: 12, fontSize: 12 }}>
            <strong>Note:</strong> Explainable AI (SHAP — SHapley Additive exPlanations) is used to identify the contribution of each factor to the risk prediction.
            SHAP is a method for explaining individual predictions, not a separate ML model.
            Values in red increase risk; values in green reduce risk.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>Factor</th>
                    <th>SHAP Value</th>
                    <th>Contribution</th>
                    <th>Direction</th>
                  </tr>
                </thead>
                <tbody>
                  {shapFactors.map(f => (
                    <tr key={f.factor}>
                      <td style={{ fontWeight: 500 }}>{f.factor}</td>
                      <td style={{ fontWeight: 700, color: f.direction === 'Risk' ? '#dc2626' : '#16a34a' }}>
                        {f.direction === 'Risk' ? '+' : ''}{f.shap.toFixed(2)}
                      </td>
                      <td><span className={`status-badge badge-${f.contribution.toLowerCase()}`}>{f.contribution}</span></td>
                      <td style={{ color: f.direction === 'Risk' ? '#dc2626' : '#16a34a', fontWeight: 600, fontSize: 12 }}>
                        {f.direction === 'Risk' ? '▲ Risk' : '▼ Protective'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#1a2744', marginBottom: 8 }}>SHAP Waterfall — Factor Impact</div>
              {shapFactors.map(f => (
                <div key={f.factor} style={{ marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                    <span style={{ color: '#374151' }}>{f.factor}</span>
                    <span style={{ color: f.direction === 'Risk' ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
                      {f.direction === 'Risk' ? '+' : ''}{f.shap.toFixed(2)}
                    </span>
                  </div>
                  <div style={{ background: '#e5e7eb', height: 6, borderRadius: 1, position: 'relative' }}>
                    <div style={{
                      height: 6,
                      width: `${Math.abs(f.shap) * 200}%`,
                      background: f.direction === 'Risk' ? '#dc2626' : '#16a34a',
                      borderRadius: 1,
                      maxWidth: '100%',
                    }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="gov-card p-4">
          <div className="gov-section-title">AI-Generated Recommendations</div>
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', padding: '8px 14px', marginBottom: 10, borderRadius: 2, fontSize: 12, color: '#1a2744' }}>
            <strong style={{ color: '#b91c1c' }}>⚠ IMPORTANT:</strong> These are AI-generated decision-support recommendations only.
            All decisions regarding land acquisition, compensation, and legal action must be taken by authorized officers as per applicable law.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {[
              { priority: 'Immediate', color: '#dc2626', bg: '#fef2f2', title: 'Resolve Compensation (127 cases)', desc: 'Compensation for 127 land owners is overdue by 60–75 days. Expedite payment processing to reduce the primary risk factor.' },
              { priority: 'Urgent', color: '#ea580c', bg: '#fff7ed', title: 'Legal Case — Officer Deputation', desc: 'Depute senior legal officer to attend HC hearing on 05-Nov-2025. Stay order must be vacated to resume possession activities.' },
              { priority: 'High', color: '#ca8a04', bg: '#fefce8', title: 'Document Verification Clearance', desc: 'Complete officer review of 8 documents with detected mismatches. Delays in verification are blocking compensation processing.' },
            ].map(r => (
              <div key={r.title} style={{ background: r.bg, border: `1px solid`, borderColor: r.color, borderLeft: `3px solid ${r.color}`, padding: '10px 12px', borderRadius: 2 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: r.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{r.priority} Priority</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1a2744', marginTop: 4 }}>{r.title}</div>
                <div style={{ fontSize: 12, color: '#374151', marginTop: 4, lineHeight: 1.5 }}>{r.desc}</div>
                <button className="action-link" style={{ marginTop: 8, display: 'block', fontSize: 12 }}>Assign Officer →</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
