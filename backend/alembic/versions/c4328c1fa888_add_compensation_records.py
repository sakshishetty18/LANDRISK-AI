"""add compensation records

Revision ID: c4328c1fa888
Revises: b32192a46f7d
Create Date: 2026-09-29
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c4328c1fa888"
down_revision: Union[str, None] = "b32192a46f7d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    op.create_table(
        "compensation_records",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("case_id", sa.String(length=50), nullable=False),
        sa.Column("project_pk", sa.Integer(), nullable=False),
        sa.Column("parcel_pk", sa.Integer(), nullable=True),
        sa.Column("owner_pk", sa.Integer(), nullable=True),
        sa.Column("assessed_amount", sa.Float(), nullable=False),
        sa.Column("approved_amount", sa.Float(), nullable=True),
        sa.Column("paid_amount", sa.Float(), nullable=False),
        sa.Column("payment_status", sa.String(length=30), nullable=False),
        sa.Column("assessment_date", sa.String(length=20), nullable=False),
        sa.Column("approval_date", sa.String(length=20), nullable=False),
        sa.Column("payment_date", sa.String(length=20), nullable=False),
        sa.Column("remarks", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["owner_pk"], ["land_owners.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["parcel_pk"], ["land_parcels.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["project_pk"], ["projects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("case_id"),
    )
    for column in ("case_id", "project_pk", "parcel_pk", "owner_pk", "payment_status"):
        op.create_index(f"ix_compensation_records_{column}", "compensation_records", [column], unique=column == "case_id")


def downgrade() -> None:
    for column in ("payment_status", "owner_pk", "parcel_pk", "project_pk", "case_id"):
        op.drop_index(f"ix_compensation_records_{column}", table_name="compensation_records")
    op.drop_table("compensation_records")