"""add land owners

Revision ID: b32192a46f7d
Revises: a210d712f1aa
Create Date: 2026-09-29
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b32192a46f7d"
down_revision: Union[str, None] = "a210d712f1aa"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    op.create_table(
        "land_owners",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("owner_id", sa.String(length=50), nullable=False),
        sa.Column("parcel_pk", sa.Integer(), nullable=False),
        sa.Column("project_pk", sa.Integer(), nullable=False),
        sa.Column("owner_name", sa.String(length=255), nullable=False),
        sa.Column("ownership_share", sa.Float(), nullable=False),
        sa.Column("ownership_type", sa.String(length=40), nullable=False),
        sa.Column("contact_status", sa.String(length=40), nullable=False),
        sa.Column("compensation_status", sa.String(length=40), nullable=False),
        sa.Column("legal_status", sa.String(length=40), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["parcel_pk"], ["land_parcels.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["project_pk"], ["projects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("owner_id"),
    )
    op.create_index("ix_land_owners_owner_id", "land_owners", ["owner_id"], unique=True)
    op.create_index("ix_land_owners_parcel_pk", "land_owners", ["parcel_pk"], unique=False)
    op.create_index("ix_land_owners_project_pk", "land_owners", ["project_pk"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_land_owners_project_pk", table_name="land_owners")
    op.drop_index("ix_land_owners_parcel_pk", table_name="land_owners")
    op.drop_index("ix_land_owners_owner_id", table_name="land_owners")
    op.drop_table("land_owners")