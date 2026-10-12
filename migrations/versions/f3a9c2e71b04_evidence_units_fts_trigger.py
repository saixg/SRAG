"""Add FTS maintenance trigger for evidence_units

Revision ID: f3a9c2e71b04
Revises: 0d97319b1f99
Create Date: 2026-10-05 21:00:00.000000

The trigger keeps fts_vector in sync with text_content so full-text search
always works without application code maintaining the column.
"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f3a9c2e71b04"
down_revision: Union[str, None] = "0d97319b1f99"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE OR REPLACE FUNCTION evidence_units_fts_update()
        RETURNS trigger AS $$
        BEGIN
            NEW.fts_vector := to_tsvector('english', coalesce(NEW.text_content, ''));
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        """
    )
    op.execute("DROP TRIGGER IF EXISTS trg_evidence_units_fts ON evidence_units;")
    op.execute(
        """
        CREATE TRIGGER trg_evidence_units_fts
        BEFORE INSERT OR UPDATE OF text_content ON evidence_units
        FOR EACH ROW EXECUTE FUNCTION evidence_units_fts_update();
        """
    )


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_evidence_units_fts ON evidence_units")
    op.execute("DROP FUNCTION IF EXISTS evidence_units_fts_update()")
