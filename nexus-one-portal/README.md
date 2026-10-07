# Nexus One Employee Portal

Nexus One is the React frontend for an employee workspace. The portal includes a sign-in gate and screens for the dashboard, profile, announcements, leave and attendance, payroll, benefits, learning, directory, team workspace, approvals, events, support, and settings.

## Run locally

1. Install Node.js 20.19+ or 22.12+.
2. From this folder, run `npm install`.
3. Copy `.env.example` to `.env.local` and set the frontend values.
4. Start the API and frontend with `npm run dev`.

The frontend uses the sample workspace records in `src/data` for its employee-facing screens. Actions that change these records, such as leave requests or task completion, are local preview interactions; they do not write to an HR system. Google sign-in is verified by the backend API.

## Google Workspace sign-in setup

In Google Cloud Console:

1. Create or select a Google Cloud project and configure the OAuth consent screen for your organization.
2. Create an OAuth client with application type **Web application**.
3. Add the exact frontend origins to **Authorized JavaScript origins** (for local development, `http://localhost:5173` and `http://127.0.0.1:5173`).
4. Copy the Web Client ID into `VITE_GOOGLE_CLIENT_ID` in `.env.local` and `GOOGLE_CLIENT_ID` in the backend `.env`.
5. Set `GOOGLE_HOSTED_DOMAIN` on the backend to the company Workspace domain and add the frontend origin to `CORS_ORIGINS`.
6. Set a strong random `SECRET_KEY` on the backend before deployment. Keep OAuth client secrets and signing secrets on the backend; this ID-token flow only needs the public client ID in the browser.

The frontend calls the configured `VITE_GOOGLE_AUTH_ENDPOINT`, `VITE_AUTH_SESSION_ENDPOINT`, and `VITE_AUTH_LOGOUT_ENDPOINT`. The backend exposes `/api/v1/auth/google`, `/api/v1/auth/session`, and `/api/v1/auth/logout`; `/api/v1/health` remains available.

For production, use HTTPS for the frontend and API, configure the exact production origin in Google Cloud Console and `CORS_ORIGINS`, and store backend secrets in the deployment secret manager.

## Checks

- `npm run build` builds the production frontend.
- `npm run lint` runs Oxlint; the current codebase reports unused-import and purity warnings.
