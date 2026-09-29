"""add legal, R&R, and possession records

Revision ID: d54e70a23c61
Revises: c4328c1fa888
Create Date: 2026-09-29
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d54e70a23c61"
down_revision: Union[str, None] = "c4328c1fa888"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    op.create_table(
        "legal_cases",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("case_id", sa.String(length=50), nullable=False),
        sa.Column("project_pk", sa.Integer(), nullable=False),
        sa.Column("parcel_pk", sa.Integer(), nullable=True),
        sa.Column("owner_pk", sa.Integer(), nullable=True),
        sa.Column("case_number", sa.String(length=100), nullable=False),
        sa.Column("court", sa.String(length=255), nullable=False),
        sa.Column("case_type", sa.String(length=100), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("severity", sa.String(length=30), nullable=False),
        sa.Column("filing_date", sa.String(length=20), nullable=False),
        sa.Column("next_hearing_date", sa.String(length=20), nullable=False),
        sa.Column("resolution_date", sa.String(length=20), nullable=False),
        sa.Column("assigned_officer", sa.String(length=255), nullable=False),
        sa.Column("remarks", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["owner_pk"], ["land_owners.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["parcel_pk"], ["land_parcels.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["project_pk"], ["projects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"), sa.UniqueConstraint("case_id"),
    )
    op.create_index("ix_legal_cases_case_id", "legal_cases", ["case_id"], unique=True)
    op.create_index("ix_legal_cases_project_pk", "legal_cases", ["project_pk"])
    op.create_index("ix_legal_cases_parcel_pk", "legal_cases", ["parcel_pk"])
    op.create_index("ix_legal_cases_owner_pk", "legal_cases", ["owner_pk"])
    op.create_index("ix_legal_cases_case_number", "legal_cases", ["case_number"])
    op.create_index("ix_legal_cases_status", "legal_cases", ["status"])
    op.create_index("ix_legal_cases_severity", "legal_cases", ["severity"])

    op.create_table(
        "rr_records",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("rr_id", sa.String(length=50), nullable=False),
        sa.Column("project_pk", sa.Integer(), nullable=False),
        sa.Column("parcel_pk", sa.Integer(), nullable=True),
        sa.Column("owner_pk", sa.Integer(), nullable=True),
        sa.Column("beneficiary_name", sa.String(length=255), nullable=False),
        sa.Column("entitlement_type", sa.String(length=100), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("completion_percentage", sa.Float(), nullable=False),
        sa.Column("package_assessed", sa.Float(), nullable=False),
        sa.Column("package_paid", sa.Float(), nullable=False),
        sa.Column("resettlement_site", sa.String(length=255), nullable=False),
        sa.Column("remarks", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["owner_pk"], ["land_owners.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["parcel_pk"], ["land_parcels.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["project_pk"], ["projects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"), sa.UniqueConstraint("rr_id"),
    )
    op.create_index("ix_rr_records_rr_id", "rr_records", ["rr_id"], unique=True)
    op.create_index("ix_rr_records_project_pk", "rr_records", ["project_pk"])
    op.create_index("ix_rr_records_parcel_pk", "rr_records", ["parcel_pk"])
    op.create_index("ix_rr_records_owner_pk", "rr_records", ["owner_pk"])
    op.create_index("ix_rr_records_status", "rr_records", ["status"])

    op.create_table(
        "possession_records",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("possession_id", sa.String(length=50), nullable=False),
        sa.Column("project_pk", sa.Integer(), nullable=False),
        sa.Column("parcel_pk", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("possession_date", sa.String(length=20), nullable=False),
        sa.Column("survey_status", sa.String(length=40), nullable=False),
        sa.Column("handover_date", sa.String(length=20), nullable=False),
        sa.Column("remarks", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["parcel_pk"], ["land_parcels.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["project_pk"], ["projects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"), sa.UniqueConstraint("possession_id"),
    )
    op.create_index("ix_possession_records_possession_id", "possession_records", ["possession_id"], unique=True)
    op.create_index("ix_possession_records_project_pk", "possession_records", ["project_pk"])
    op.create_index("ix_possession_records_parcel_pk", "possession_records", ["parcel_pk"])
    op.create_index("ix_possession_records_status", "possession_records", ["status"])


def downgrade() -> None:
    for table, columns in (
        ("possession_records", ("status", "parcel_pk", "project_pk", "possession_id")),
        ("rr_records", ("status", "owner_pk", "parcel_pk", "project_pk", "rr_id")),
        ("legal_cases", ("severity", "status", "case_number", "owner_pk", "parcel_pk", "project_pk", "case_id")),
    ):
        for column in columns:
            op.drop_index(f"ix_{table}_{column}", table_name=table)
        op.drop_table(table)