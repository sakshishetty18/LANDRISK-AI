"""add document verification workflow

Revision ID: e610d3ab9582
Revises: d54e70a23c61
Create Date: 2026-09-29
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e610d3ab9582"
down_revision: Union[str, None] = "d54e70a23c61"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    op.create_table(
        "document_files",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("document_pk", sa.Integer(), nullable=False),
        sa.Column("stored_filename", sa.String(length=100), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=False),
        sa.Column("content_type", sa.String(length=100), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["document_pk"], ["documents.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("document_pk"),
        sa.UniqueConstraint("stored_filename"),
    )
    op.create_index("ix_document_files_document_pk", "document_files", ["document_pk"], unique=True)
    op.create_table(
        "document_extractions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("document_pk", sa.Integer(), nullable=False),
        sa.Column("extraction_status", sa.String(length=40), nullable=False),
        sa.Column("extracted_fields_json", sa.Text(), nullable=False),
        sa.Column("method_label", sa.String(length=100), nullable=False),
        sa.Column("notes", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["document_pk"], ["documents.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("document_pk"),
    )
    op.create_index("ix_document_extractions_document_pk", "document_extractions", ["document_pk"], unique=True)
    op.create_table(
        "document_comparisons",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("document_pk", sa.Integer(), nullable=False),
        sa.Column("comparison_status", sa.String(length=40), nullable=False),
        sa.Column("compared_by", sa.String(length=255), nullable=False),
        sa.Column("compared_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["document_pk"], ["documents.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_document_comparisons_document_pk", "document_comparisons", ["document_pk"], unique=False)
    op.create_table(
        "document_mismatches",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("comparison_pk", sa.Integer(), nullable=False),
        sa.Column("field_name", sa.String(length=100), nullable=False),
        sa.Column("database_value", sa.Text(), nullable=False),
        sa.Column("captured_value", sa.Text(), nullable=False),
        sa.Column("result", sa.String(length=20), nullable=False),
        sa.ForeignKeyConstraint(["comparison_pk"], ["document_comparisons.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_document_mismatches_comparison_pk", "document_mismatches", ["comparison_pk"], unique=False)
    op.create_table(
        "document_reviews",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("document_pk", sa.Integer(), nullable=False),
        sa.Column("reviewer_email", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("remarks", sa.Text(), nullable=False),
        sa.Column("reviewed_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["document_pk"], ["documents.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_document_reviews_document_pk", "document_reviews", ["document_pk"], unique=False)
    op.create_table(
        "document_verification_decisions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("document_pk", sa.Integer(), nullable=False),
        sa.Column("decision", sa.String(length=40), nullable=False),
        sa.Column("officer_email", sa.String(length=255), nullable=False),
        sa.Column("remarks", sa.Text(), nullable=False),
        sa.Column("decided_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["document_pk"], ["documents.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("document_pk"),
    )
    op.create_index("ix_document_verification_decisions_document_pk", "document_verification_decisions", ["document_pk"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_document_verification_decisions_document_pk", table_name="document_verification_decisions")
    op.drop_table("document_verification_decisions")
    op.drop_index("ix_document_reviews_document_pk", table_name="document_reviews")
    op.drop_table("document_reviews")
    op.drop_index("ix_document_mismatches_comparison_pk", table_name="document_mismatches")
    op.drop_table("document_mismatches")
    op.drop_index("ix_document_comparisons_document_pk", table_name="document_comparisons")
    op.drop_table("document_comparisons")
    op.drop_index("ix_document_extractions_document_pk", table_name="document_extractions")
    op.drop_table("document_extractions")
    op.drop_index("ix_document_files_document_pk", table_name="document_files")
    op.drop_table("document_files")