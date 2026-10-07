# Nexus One Employee Portal

Nexus One is the React frontend for an employee workspace. It includes username/password sign-in and invited employee registration, plus screens for the dashboard, profile, announcements, leave and attendance, payroll, benefits, learning, directory, team workspace, approvals, events, support, and settings.

Employee-facing screens use sample workspace records; their preview actions do not write to an HR system.

## Start the portal

1. Install Node.js 20.19+ or 22.12+.
2. From this folder, run `npm install`.
3. Copy `.env.example` to `.env.local` and set the API URLs.
4. Configure the backend `.env` with `DATABASE_URL`, a strong random `SECRET_KEY`, `PORTAL_SIGNUP_INVITE_CODE` (at least 16 random characters; generate with `python -c "import secrets; print(secrets.token_urlsafe(32))"`), and the exact frontend origin in `CORS_ORIGINS`.
5. From the repository root, apply the account-table migration with `alembic upgrade head`.
6. Start the backend API and run `npm run dev` in this folder.

Share the invite code only with people you intend to invite. The registration page requires it; registrations are stored in PostgreSQL with a salted PBKDF2-SHA256 password hash and receive the basic `EMPLOYEE` role. There are no seeded or demo accounts. Manager and administrator roles must be granted through trusted database administration; users cannot choose their own role.

The frontend reads `VITE_AUTH_LOGIN_ENDPOINT`, `VITE_AUTH_REGISTER_ENDPOINT`, `VITE_AUTH_SESSION_ENDPOINT`, and `VITE_AUTH_LOGOUT_ENDPOINT`. The backend routes are `/api/v1/auth/login`, `/api/v1/auth/register`, `/api/v1/auth/session`, and `/api/v1/auth/logout`; `/api/v1/health` remains available. Production deployments should use HTTPS and store the invite code and signing key in a secret manager.

## Checks

- `npm run build` builds the production frontend.
- `npm run lint` runs Oxlint.
- `python -m pytest -q` runs backend tests from the repository root.
