"""Force RLS, align tenant UUID, add users/audit, lock down grants.

Revision ID: 8c4e1a9f2b10
Revises: 42a29759d621
"""

from typing import Sequence, Union

from alembic import op

revision: str = "8c4e1a9f2b10"
down_revision: Union[str, None] = "42a29759d621"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DEV_TENANT = "00000000-0000-4000-8000-000000000001"


def upgrade() -> None:
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
                CREATE ROLE authenticated NOLOGIN NOBYPASSRLS;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
                CREATE ROLE anon NOLOGIN NOBYPASSRLS;
            END IF;
        END
        $$;
        """
    )
    op.execute("GRANT authenticated TO CURRENT_USER")

    op.execute(
        f"""
        INSERT INTO tenants (id, name, created_at)
        VALUES ('{DEV_TENANT}', 'Development Tenant', CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO NOTHING;
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY,
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            email VARCHAR(255) NOT NULL,
            roles JSONB NOT NULL DEFAULT '[]'::jsonb,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ,
            UNIQUE (tenant_id, email)
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_users_tenant_id ON users (tenant_id)")

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS audit_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            user_id UUID,
            action VARCHAR(100) NOT NULL,
            resource_type VARCHAR(100),
            resource_id VARCHAR(255),
            details JSONB,
            ip_address VARCHAR(45),
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_audit_logs_tenant_id ON audit_logs (tenant_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_audit_logs_action ON audit_logs (action)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_audit_logs_created_at ON audit_logs (created_at)")

    op.execute(
        """
        CREATE OR REPLACE FUNCTION evidence_units_fts_update()
        RETURNS trigger
        LANGUAGE plpgsql
        SET search_path = public
        AS $$
        BEGIN
            NEW.fts_vector := to_tsvector('english', coalesce(NEW.text_content, ''));
            RETURN NEW;
        END;
        $$;
        """
    )

    for table in ("tenants", "documents", "evidence_units", "users", "audit_logs"):
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation_policy ON {table}")

    op.execute(
        f"""
        CREATE POLICY tenant_isolation_policy ON tenants
        FOR ALL
        TO authenticated
        USING (id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
        WITH CHECK (id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
        """
    )
    for table, col in (
        ("documents", "tenant_id"),
        ("evidence_units", "tenant_id"),
        ("users", "tenant_id"),
        ("audit_logs", "tenant_id"),
    ):
        op.execute(
            f"""
            CREATE POLICY tenant_isolation_policy ON {table}
            FOR ALL
            TO authenticated
            USING ({col} = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
            WITH CHECK ({col} = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
            """
        )

    op.execute("ALTER TABLE alembic_version ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE alembic_version FORCE ROW LEVEL SECURITY")
    op.execute("DROP POLICY IF EXISTS alembic_version_no_client ON alembic_version")
    # No policy for anon/authenticated → denied. Table owner still needs FORCE so
    # only BYPASSRLS roles (postgres/service_role) can migrate.

    for table in ("tenants", "documents", "evidence_units", "users", "audit_logs", "alembic_version"):
        op.execute(f"REVOKE ALL ON TABLE {table} FROM anon, public")
        op.execute(f"GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE {table} TO authenticated")

    op.execute("REVOKE ALL ON TABLE alembic_version FROM authenticated, anon, public")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS audit_logs")
    op.execute("DROP TABLE IF EXISTS users")
    op.execute("ALTER TABLE tenants NO FORCE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE documents NO FORCE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE evidence_units NO FORCE ROW LEVEL SECURITY")
