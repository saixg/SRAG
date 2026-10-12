"""Fix RLS policies for missing tenant

Revision ID: 42a29759d621
Revises: b2a1e0c360f0
Create Date: 2026-10-05 22:11:01.848162

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '42a29759d621'
down_revision: Union[str, None] = 'b2a1e0c360f0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("DROP POLICY IF EXISTS tenant_isolation_policy ON tenants;")
    op.execute("DROP POLICY IF EXISTS tenant_isolation_policy ON documents;")
    op.execute("DROP POLICY IF EXISTS tenant_isolation_policy ON evidence_units;")
    
    op.execute("""
        CREATE POLICY tenant_isolation_policy ON tenants USING (
            id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        );
    """)
    op.execute("""
        CREATE POLICY tenant_isolation_policy ON documents USING (
            tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        );
    """)
    op.execute("""
        CREATE POLICY tenant_isolation_policy ON evidence_units USING (
            tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        );
    """)

def downgrade() -> None:
    pass
