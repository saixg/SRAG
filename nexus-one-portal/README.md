# Nexus One

Nexus One contains a public product-information experience and the authenticated employee portal. The public pages describe the portal preview; they do not claim live customer results, published prices, certifications, or HR integrations.

## Public site

- `/` — product positioning, solution paths, interactive portal preview, FAQs, and calls to action.
- `/solutions` — employee, people-team, and team-leader journeys.
- `/resources` — searchable guides, FAQs, templates, training notes, and product-preview content with topic/type filters and local-only feedback.
- `/customers` — explains that verified customer stories are not yet available; it does not invent results.
- `/pricing` — deployment qualification and an assumption-based time estimator; no prices are published.
- `/trust` and `/accessibility` — preview boundaries for sign-in, sample data, access controls, future RAG, and accessibility limitations.
- `/company`, `/support`, and `/contact` — company overview, preview FAQs, and a lead request form.

Public content is structured in `src/data/publicSiteContent.ts` so it can later move to a CMS. There is no CMS, customer-story repository, analytics, consent manager, or production content-review workflow configured in this project. No analytics cookies are added.

The contact form validates fields in the browser. It sends a request only when `VITE_PUBLIC_LEAD_ENDPOINT` is configured. Without it, the form explains that no message was sent. The endpoint should accept a JSON `POST` and return a successful HTTP status. No CRM or lead-routing API is included in this repository.

## Employee portal

- `/login` — employee username/password sign-in and invited account registration.
- `/dashboard`, `/profile`, `/announcements`, `/attendance`, `/payroll`, `/benefits`, `/learning`, `/directory`, `/team`, `/tasks`, `/events`, `/support`, and `/settings` — existing employee workspace routes.

Employee authentication uses the configured backend endpoints below. Several employee workflows currently use sample data and do not write to an HR system. RAG document search is not included yet.

## Configuration

Copy `.env.example` to `.env.local` and set the API endpoints for your environment:

- `VITE_AUTH_LOGIN_ENDPOINT`
- `VITE_AUTH_REGISTER_ENDPOINT`
- `VITE_AUTH_SESSION_ENDPOINT`
- `VITE_AUTH_LOGOUT_ENDPOINT`
- `VITE_PUBLIC_LEAD_ENDPOINT` (optional; needed to send the public request form)

Keep secrets on the backend. No API key or secret belongs in a `VITE_` variable.

## Development and checks

1. Install Node.js 20.19+ or 22.12+.
2. Run `npm install`.
3. Configure `.env.local` and the corresponding backend services.
4. Run `npm run dev`.

- `npm run build` — TypeScript and production build.
- `npm run lint` — Oxlint. The existing codebase has unused-import and Fast Refresh warnings.

There is no frontend unit-test or end-to-end test script configured. A production sitemap and canonical production domain still need to be supplied by the deployment owner.
