# Avyanna Jewels ERP (MERN enterprise)

React + Vite + Tailwind client, Express + MongoDB API. Modules: Auth & Users, Dashboard, Delegation, Checklist (general + account), Help Tickets.

## Run

```bash
# API
cd server && cp .env.example .env && npm install && npm run seed && npm run dev
# Client (new terminal)
cd client && npm install && npm run dev      # http://localhost:5173
```
Seed logins (password `Password@123`): admin@erp.test, manager@erp.test, ravi@erp.test

## Architecture

```
server/src
  config/        env validation (fails fast), db connection
  middleware/    auth (JWT + role guard), zod validate, central error handler
  common/        BaseService (list/filter/paginate/stats/complete), crud controller, Counter (TSK-000001 IDs)
  modules/<x>/   model -> service (business rules) -> routes (+ zod schemas)
  modules/dashboard   one aggregation normalising every module into the same shape
client/src
  api/           axios instance (token + 401 handling), react-query hooks
  context/       AuthContext
  modules.config.js   declarative config; ModulePage renders list/filters/form/actions from it
  components/ pages/
```

Rules worth knowing
- Roles: admin / manager / doer. Doers only see their own work (scope() in each service).
- Delegation: a doer completing a task assigned by someone else moves it to `approval_waiting`; manager approves or sends back (revision count +1).
- Tickets: doer resolves -> `review`; staff close.
- Checklist: a recurring definition (daily/weekly/monthly + repeatUntil) expands into one row per occurrence.
- Adding a module: backend folder extending BaseService + one entry in `modules.config.js`.

## Next steps
Refresh tokens/httpOnly cookies, file uploads (proof/documents), audit log, Redis cache for the dashboard, Jest/Supertest + Vitest tests, Docker compose, cron to auto-generate recurring checklists.
