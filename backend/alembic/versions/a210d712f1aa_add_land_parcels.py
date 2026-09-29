"""add land parcels with optional PostGIS polygon

Revision ID: a210d712f1aa
Revises: c48411bf0a81
Create Date: 2026-09-29
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a210d712f1aa"
down_revision: Union[str, None] = "c48411bf0a81"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


class Polygon4326(sa.types.UserDefinedType):
    cache_ok = True

    def get_col_spec(self, **kwargs) -> str:
        return "geometry(POLYGON,4326)"


def upgrade() -> None:
    bind = op.get_bind()
    is_postgresql = bind.dialect.name == "postgresql"
    if is_postgresql:
        op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    op.create_table(
        "land_parcels",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("parcel_id", sa.String(length=50), nullable=False),
        sa.Column("project_pk", sa.Integer(), nullable=False),
        sa.Column("survey_number", sa.String(length=100), nullable=False),
        sa.Column("parcel_number", sa.String(length=100), nullable=False),
        sa.Column("village", sa.String(length=100), nullable=False),
        sa.Column("taluk", sa.String(length=100), nullable=False),
        sa.Column("district", sa.String(length=100), nullable=False),
        sa.Column("state", sa.String(length=100), nullable=False),
        sa.Column("area_hectares", sa.Float(), nullable=False),
        sa.Column("acquisition_status", sa.String(length=40), nullable=False),
        sa.Column("compensation_status", sa.String(length=40), nullable=False),
        sa.Column("legal_status", sa.String(length=40), nullable=False),
        sa.Column("possession_status", sa.String(length=40), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("geom", Polygon4326() if is_postgresql else sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["project_pk"], ["projects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("parcel_id"),
    )
    for column in ("project_pk", "survey_number", "district", "state", "acquisition_status"):
        op.create_index(f"ix_land_parcels_{column}", "land_parcels", [column], unique=False)
    op.create_index("ix_land_parcels_parcel_id", "land_parcels", ["parcel_id"], unique=True)
    if is_postgresql:
        op.execute("CREATE INDEX ix_land_parcels_geom ON land_parcels USING GIST (geom)")


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.drop_index("ix_land_parcels_geom", table_name="land_parcels")
    op.drop_index("ix_land_parcels_parcel_id", table_name="land_parcels")
    for column in ("acquisition_status", "state", "district", "survey_number", "project_pk"):
        op.drop_index(f"ix_land_parcels_{column}", table_name="land_parcels")
    op.drop_table("land_parcels")