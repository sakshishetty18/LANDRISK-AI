"""
ACQUINOVA — Synthetic Prototype Dataset Generator
====================================================

IMPORTANT / DATA PROVENANCE
----------------------------
This script generates a *synthetic prototype dataset for demonstration
and model development*. It is NOT official Government of India data,
NOT sourced from LACRRIS / Department of Land Resources / data.gov.in,
and must never be presented as real government project records.

The generator encodes a set of hand-designed causal relationships
(e.g. "more legal disputes + slower approvals -> higher delay
probability and longer delay") so that a model trained on this data
learns a genuine, explainable pattern rather than random noise. This
lets us demonstrate a real ML pipeline (training, validation, SHAP
explainability) end to end while being honest that the underlying
records are fabricated for the prototype.

Run:
    python ml/src/generate_demo_data.py

Output:
    data/raw/projects_raw.csv          (one row per project, current snapshot)
    data/raw/data_dictionary.md        (field-by-field documentation)
"""

from __future__ import annotations

import os
import random
from datetime import date, timedelta

import numpy as np
import pandas as pd

SEED = 42
N_PROJECTS = 420  # >100 as required; generous margin so train/val/test splits are meaningful

random.seed(SEED)
np.random.seed(SEED)

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data", "raw")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ---------------------------------------------------------------------------
# Reference data (fictional demo geography — coordinates are approximate
# district-level centroids used only to place markers on the prototype map)
# ---------------------------------------------------------------------------

STATE_DISTRICTS = {
    "Karnataka": [("Mangaluru", 12.87, 74.88), ("Bengaluru Urban", 12.97, 77.59), ("Belagavi", 15.85, 74.50), ("Kalaburagi", 17.33, 76.83)],
    "Maharashtra": [("Ratnagiri", 16.99, 73.30), ("Pune", 18.52, 73.86), ("Nagpur", 21.15, 79.09), ("Aurangabad", 19.88, 75.34)],
    "Tamil Nadu": [("Chennai", 13.08, 80.27), ("Coimbatore", 11.02, 76.96), ("Madurai", 9.93, 78.12), ("Salem", 11.66, 78.15)],
    "Gujarat": [("Ahmedabad", 23.02, 72.57), ("Surat", 21.17, 72.83), ("Rajkot", 22.30, 70.80), ("Vadodara", 22.31, 73.19)],
    "Rajasthan": [("Jaisalmer", 26.91, 70.91), ("Jaipur", 26.91, 75.79), ("Udaipur", 24.58, 73.71), ("Jodhpur", 26.24, 73.02)],
    "West Bengal": [("Bardhaman", 23.24, 87.86), ("Kolkata", 22.57, 88.36), ("Siliguri", 26.73, 88.39), ("Durgapur", 23.55, 87.31)],
    "Uttar Pradesh": [("Lucknow", 26.85, 80.95), ("Noida", 28.54, 77.39), ("Varanasi", 25.32, 82.97), ("Kanpur", 26.45, 80.33)],
    "Madhya Pradesh": [("Bhopal", 23.26, 77.41), ("Indore", 22.72, 75.86), ("Jabalpur", 23.18, 79.99), ("Gwalior", 26.22, 78.18)],
    "Telangana": [("Hyderabad", 17.39, 78.49), ("Warangal", 17.98, 79.60)],
    "Odisha": [("Bhubaneswar", 20.30, 85.82), ("Cuttack", 20.46, 85.88)],
    "Punjab": [("Ludhiana", 30.90, 75.86), ("Amritsar", 31.63, 74.87)],
    "Kerala": [("Kochi", 9.93, 76.27), ("Thiruvananthapuram", 8.52, 76.94)],
}

PROJECT_TYPES = [
    "National Highway", "State Highway", "Railway Corridor", "Metro Rail",
    "Irrigation Canal", "Industrial Corridor", "Power Transmission Line",
    "Port Expansion", "Airport Expansion", "Urban Housing", "Solar Park", "Water Reservoir",
]

MINISTRIES = {
    "National Highway": "Ministry of Road Transport and Highways",
    "State Highway": "State Public Works Department",
    "Railway Corridor": "Ministry of Railways",
    "Metro Rail": "Ministry of Housing and Urban Affairs",
    "Irrigation Canal": "Ministry of Jal Shakti",
    "Industrial Corridor": "Ministry of Commerce and Industry",
    "Power Transmission Line": "Ministry of Power",
    "Port Expansion": "Ministry of Ports, Shipping and Waterways",
    "Airport Expansion": "Ministry of Civil Aviation",
    "Urban Housing": "Ministry of Housing and Urban Affairs",
    "Solar Park": "Ministry of New and Renewable Energy",
    "Water Reservoir": "Ministry of Jal Shakti",
}

AGENCIES = [
    "National Highways Authority of India", "State Road Development Corporation",
    "Rail Land Development Authority", "State Industrial Development Corporation",
    "State Metro Rail Corporation", "State Power Transmission Corporation",
    "Central Warehousing Corporation", "State Housing Board",
]

STAGES = [
    "Proposal", "Scrutiny", "Approval", "Notification", "Survey",
    "Award", "Compensation", "Legal", "Possession", "Rehabilitation", "Closure",
]

LEGAL_SEVERITY = ["None", "Low", "Medium", "High"]


def _clip01(x: np.ndarray) -> np.ndarray:
    return np.clip(x, 0.0, 1.0)


def generate_projects(n: int = N_PROJECTS) -> pd.DataFrame:
    rows = []
    today = date(2026, 9, 1)

    for i in range(n):
        state = random.choice(list(STATE_DISTRICTS.keys()))
        district, base_lat, base_lon = random.choice(STATE_DISTRICTS[state])
        # jitter coordinates slightly so multiple projects in one district don't overlap on the map
        lat = base_lat + np.random.normal(0, 0.15)
        lon = base_lon + np.random.normal(0, 0.15)

        ptype = random.choice(PROJECT_TYPES)
        ministry = MINISTRIES[ptype]
        agency = random.choice(AGENCIES)

        land_proposed = round(np.random.lognormal(mean=3.2, sigma=1.0), 2)  # hectares
        current_stage = random.choices(
            STAGES, weights=[6, 8, 10, 10, 14, 12, 16, 8, 10, 8, 6]
        )[0]
        stage_index = STAGES.index(current_stage)
        # progress increases with how far along the lifecycle the project is, plus noise
        progress_base = (stage_index + 1) / len(STAGES)

        acquisition_pct = _clip01(progress_base + np.random.normal(0, 0.08))[()] if False else float(_clip01(np.array(progress_base + np.random.normal(0, 0.08))))
        land_acquired = round(land_proposed * acquisition_pct, 2)

        affected_families = int(max(5, np.random.lognormal(mean=4.3, sigma=0.9)))
        displaced_families = int(affected_families * float(_clip01(np.array(np.random.beta(2, 5)))))

        notification_status = "Completed" if stage_index >= STAGES.index("Notification") else random.choice(["Pending", "In Progress"])
        survey_completion = float(_clip01(np.array(progress_base + np.random.normal(0, 0.12)))) * 100
        approval_pending_days = int(max(0, np.random.exponential(scale=45) * (1.4 if stage_index <= STAGES.index("Approval") else 0.4)))

        award_status = "Completed" if stage_index >= STAGES.index("Award") else random.choice(["Pending", "Not Started"])

        compensation_assessed = round(land_acquired * np.random.uniform(0.4, 1.8) * 1_000_000, 0)  # INR
        comp_paid_ratio = float(_clip01(np.array(progress_base * np.random.uniform(0.5, 1.15))))
        compensation_paid = round(compensation_assessed * comp_paid_ratio, 0)
        compensation_pending = max(0.0, compensation_assessed - compensation_paid)

        # Legal disputes: more likely with more affected families & lower compensation-paid ratio
        legal_case_intensity = 0.15 + 0.5 * (1 - comp_paid_ratio) + 0.15 * _clip01(np.array(affected_families / 400))
        legal_cases = np.random.poisson(lam=max(0.05, legal_case_intensity * 3))
        legal_severity = random.choices(
            LEGAL_SEVERITY,
            weights=[
                max(1, 40 - legal_cases * 6),
                20,
                15 + legal_cases,
                5 + legal_cases * 2,
            ],
        )[0] if legal_cases > 0 else "None"

        possession_pct = float(_clip01(np.array(progress_base * np.random.uniform(0.5, 1.1)))) * 100
        rr_pct = float(_clip01(np.array(progress_base * np.random.uniform(0.3, 1.0)))) * 100

        documentation_completeness = float(_clip01(np.array(np.random.beta(5, 2)))) * 100
        stakeholder_responsiveness = float(_clip01(np.array(np.random.beta(4, 2)))) * 100

        # Historical agency delay rate: a stable per-agency trait plus noise
        agency_base_delay_rate = {
            "National Highways Authority of India": 0.28,
            "State Road Development Corporation": 0.42,
            "Rail Land Development Authority": 0.35,
            "State Industrial Development Corporation": 0.38,
            "State Metro Rail Corporation": 0.31,
            "State Power Transmission Corporation": 0.33,
            "Central Warehousing Corporation": 0.40,
            "State Housing Board": 0.45,
        }[agency]
        historical_agency_delay_rate = float(_clip01(np.array(agency_base_delay_rate + np.random.normal(0, 0.05))))

        project_start_date = today - timedelta(days=int(np.random.uniform(60, 1800)))
        planned_duration_days = int(np.random.uniform(365, 1800))
        planned_completion_date = project_start_date + timedelta(days=planned_duration_days)

        rows.append(dict(
            project_id=f"ACQ-{i+1:04d}",
            project_code=f"{ptype[:3].upper()}-{state[:2].upper()}-{i+1:04d}",
            project_name=f"{ptype} Project {i+1}",
            project_type=ptype,
            ministry=ministry,
            implementing_agency=agency,
            state=state,
            district=district,
            taluk=f"{district} Taluk",
            village=f"{district} Village {(i % 7) + 1}",
            latitude=round(lat, 5),
            longitude=round(lon, 5),
            land_proposed_hectares=land_proposed,
            land_acquired_hectares=land_acquired,
            acquisition_percentage=round(acquisition_pct * 100, 1),
            affected_families=affected_families,
            displaced_families=displaced_families,
            notification_status=notification_status,
            notification_date=(project_start_date + timedelta(days=30)).isoformat() if notification_status == "Completed" else "",
            survey_status="Completed" if survey_completion >= 95 else ("In Progress" if survey_completion > 10 else "Not Started"),
            survey_completion_percentage=round(survey_completion, 1),
            approval_status="Approved" if stage_index > STAGES.index("Approval") else ("Pending" if approval_pending_days > 0 else "Approved"),
            approval_pending_days=approval_pending_days,
            award_status=award_status,
            award_date=(project_start_date + timedelta(days=200)).isoformat() if award_status == "Completed" else "",
            compensation_assessed=compensation_assessed,
            compensation_paid=compensation_paid,
            compensation_pending=compensation_pending,
            legal_cases=int(legal_cases),
            legal_dispute_severity=legal_severity,
            possession_status="Completed" if possession_pct >= 95 else ("In Progress" if possession_pct > 5 else "Not Started"),
            possession_percentage=round(possession_pct, 1),
            rr_status="Completed" if rr_pct >= 95 else ("In Progress" if rr_pct > 5 else "Not Started"),
            rr_completion_percentage=round(rr_pct, 1),
            documentation_completeness=round(documentation_completeness, 1),
            stakeholder_responsiveness=round(stakeholder_responsiveness, 1),
            current_stage=current_stage,
            planned_completion_date=planned_completion_date.isoformat(),
            actual_completion_date="",
            project_start_date=project_start_date.isoformat(),
            historical_agency_delay_rate=round(historical_agency_delay_rate, 3),
        ))

    df = pd.DataFrame(rows)
    return df


def simulate_outcomes(df: pd.DataFrame) -> pd.DataFrame:
    """
    Simulate ground-truth delay outcomes for TRAINING purposes only.

    This encodes a designed causal structure (used only to build a
    reproducible synthetic training set) — it is intentionally
    separate from the feature-engineering step used at inference time,
    to avoid target leakage: the model never sees this function, only
    the raw fields above.
    """
    rng = np.random.default_rng(SEED)

    comp_pending_ratio = (df["compensation_pending"] / df["compensation_assessed"].replace(0, np.nan)).fillna(0).clip(0, 1)
    legal_severity_score = df["legal_dispute_severity"].map({"None": 0, "Low": 1, "Medium": 2, "High": 3})
    doc_gap = (100 - df["documentation_completeness"]) / 100
    approval_delay_norm = (df["approval_pending_days"] / 180).clip(0, 2)
    rr_gap = (100 - df["rr_completion_percentage"]) / 100
    stakeholder_gap = (100 - df["stakeholder_responsiveness"]) / 100

    # Linear risk index (log-odds) built from realistic weights
    logit = (
        -4.6
        + 2.3 * comp_pending_ratio
        + 0.55 * legal_severity_score
        + 1.4 * doc_gap
        + 1.1 * approval_delay_norm
        + 1.0 * rr_gap
        + 0.6 * stakeholder_gap
        + 1.8 * df["historical_agency_delay_rate"]
        + rng.normal(0, 0.35, size=len(df))
    )
    prob_delay_true = 1 / (1 + np.exp(-logit))
    delayed = (rng.uniform(0, 1, size=len(df)) < prob_delay_true).astype(int)

    base_delay_days = (
        10
        + 90 * comp_pending_ratio
        + 20 * legal_severity_score
        + 40 * doc_gap
        + 30 * approval_delay_norm
        + 35 * rr_gap
        + 60 * df["historical_agency_delay_rate"]
        + rng.normal(0, 8, size=len(df))
    )
    delay_days = np.where(delayed == 1, np.clip(base_delay_days, 3, 400), np.clip(base_delay_days * 0.15, 0, 40))

    out = df.copy()
    out["delayed"] = delayed
    out["delay_days"] = np.round(delay_days, 1)
    return out


DATA_DICTIONARY = """# ACQUINOVA Data Dictionary — Synthetic Prototype Dataset

**Provenance:** Synthetic prototype dataset for demonstration and model development.
Generated by `ml/src/generate_demo_data.py` with a fixed random seed (42) for
reproducibility. Not sourced from and not representative of real Government of
India land acquisition records (LACRRIS, Department of Land Resources, data.gov.in).

| Field | Type | Description |
|---|---|---|
| project_id / project_code | string | Prototype identifiers |
| project_name / project_type / ministry / implementing_agency | string | Project classification |
| state / district / taluk / village | string | Fictional demo geography (district-level real place names used only for plausible map placement) |
| latitude / longitude | float | Approximate district centroid + jitter, for GIS demo only |
| land_proposed_hectares / land_acquired_hectares / acquisition_percentage | float | Land acquisition extent |
| affected_families / displaced_families | int | Social impact counts |
| notification_status / notification_date | string/date | Section-4-equivalent notification stage |
| survey_status / survey_completion_percentage | string/float | Survey & documentation stage |
| approval_status / approval_pending_days | string/int | Administrative approval stage |
| award_status / award_date | string/date | Award declaration stage |
| compensation_assessed / compensation_paid / compensation_pending | float (INR) | Compensation financials |
| legal_cases / legal_dispute_severity | int/string | Litigation load |
| possession_status / possession_percentage | string/float | Physical possession progress |
| rr_status / rr_completion_percentage | string/float | Rehabilitation & Resettlement progress |
| documentation_completeness | float (0-100) | Share of mandatory documents on file |
| stakeholder_responsiveness | float (0-100) | Derived responsiveness score |
| current_stage | string | One of the 11 lifecycle stages |
| planned_completion_date / actual_completion_date / project_start_date | date | Timeline fields |
| historical_agency_delay_rate | float (0-1) | Rolling historical delay rate for the implementing agency |
| **delayed** | int (0/1) | TRAINING LABEL — simulated outcome, not used as a model input feature |
| **delay_days** | float | TRAINING LABEL — simulated delay length, not used as a model input feature |

`delayed` and `delay_days` are generated by a separate, documented simulation
function (`simulate_outcomes`) so the model is trained against labels that were
never fed into it as a feature (prevents target leakage) and reflect a
deliberately designed, explainable causal structure suitable for demonstrating
real classification/regression/SHAP behavior.
"""


def main():
    df = generate_projects()
    df = simulate_outcomes(df)

    raw_path = os.path.join(OUTPUT_DIR, "projects_raw.csv")
    df.to_csv(raw_path, index=False)

    with open(os.path.join(OUTPUT_DIR, "data_dictionary.md"), "w") as f:
        f.write(DATA_DICTIONARY)

    print(f"Generated {len(df)} synthetic prototype projects -> {raw_path}")
    print(f"Delay rate in generated data: {df['delayed'].mean():.1%}")
    print(f"Mean delay_days: {df['delay_days'].mean():.1f}")


if __name__ == "__main__":
    main()
