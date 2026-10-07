# Nexus One Employee Portal

Nexus One is the React frontend for an employee workspace. It includes a username/password sign-in gate and screens for the dashboard, profile, announcements, leave and attendance, payroll, benefits, learning, directory, team workspace, approvals, events, support, and settings.

## Run locally

1. Install Node.js 20.19+ or 22.12+.
2. From this folder, run `npm install`.
3. Copy `.env.example` to `.env.local` and set the API URLs.
4. Start the backend API from the repository root, then run `npm run dev` here for the frontend.

The frontend uses sample workspace records for employee-facing screens. Actions that change these records are local preview interactions and do not write to an HR system.

## Configure employee sign-in

The backend reads employee accounts from `PORTAL_USERS_JSON`. Each account must have a unique username, an ID, name, email, role, and a PBKDF2-SHA256 password hash. Only password hashes belong in this configuration; never place a plaintext password or a sample account in source control.

Generate a hash with Python (it prompts for the password without including it in the command):

```powershell
python -c "import getpass,hashlib,secrets; p=getpass.getpass('New password: '); s=secrets.token_bytes(16); print('pbkdf2_sha256$600000$'+s.hex()+'$'+hashlib.pbkdf2_hmac('sha256',p.encode(),s,600000).hex())"
```

Add the resulting hash to a secure deployment environment's `PORTAL_USERS_JSON` value. Example structure (replace all account details and the hash with real provisioned data):

```json
[{"id":"employee-id","username":"employee.name","name":"Employee Name","email":"employee@company.example","role":"EMPLOYEE","roleTitle":"Employee","department":"People","password_hash":"pbkdf2_sha256$600000$<salt-hex>$<digest-hex>"}]
```

Allowed roles are `EMPLOYEE`, `MANAGER`, `PEOPLE_OPS`, and `ADMINISTRATOR`. The backend verifies passwords and issues a signed HttpOnly session cookie. Configure a strong random `SECRET_KEY`, the exact frontend origins in `CORS_ORIGINS`, and HTTPS in production. Store account hashes and signing keys in a deployment secret manager, not in Git.

Set `VITE_AUTH_LOGIN_ENDPOINT`, `VITE_AUTH_SESSION_ENDPOINT`, and `VITE_AUTH_LOGOUT_ENDPOINT` in the frontend environment. The backend exposes `/api/v1/auth/login`, `/api/v1/auth/session`, and `/api/v1/auth/logout`; `/api/v1/health` remains available.

## Checks

- `npm run build` builds the production frontend.
- `npm run lint` runs Oxlint.
- `python -m pytest -q` runs backend tests from the repository root.
