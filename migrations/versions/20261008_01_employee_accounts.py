"""Create employee accounts for portal registration and password sign-in."""

import sqlalchemy as sa
from alembic import op

revision = "20261008_01"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "employee_accounts",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("username", sa.String(length=80), nullable=False),
        sa.Column("email", sa.String(length=254), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("password_hash", sa.String(length=200), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=False, server_default="EMPLOYEE"),
        sa.Column("role_title", sa.String(length=120), nullable=False, server_default="Employee"),
        sa.Column("department", sa.String(length=120), nullable=False, server_default=""),
        sa.Column("location", sa.String(length=120), nullable=False, server_default=""),
        sa.Column("employee_id", sa.String(length=80), nullable=False, server_default=""),
        sa.Column("manager", sa.String(length=120), nullable=False, server_default=""),
        sa.Column("joined_date", sa.String(length=32), nullable=False, server_default=""),
        sa.Column("avatar_url", sa.String(length=500), nullable=False, server_default=""),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("username"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_employee_accounts_username", "employee_accounts", ["username"])
    op.create_index("ix_employee_accounts_email", "employee_accounts", ["email"])


def downgrade() -> None:
    op.drop_index("ix_employee_accounts_email", table_name="employee_accounts")
    op.drop_index("ix_employee_accounts_username", table_name="employee_accounts")
    op.drop_table("employee_accounts")
