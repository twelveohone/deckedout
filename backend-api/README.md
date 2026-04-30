# Decked Out API

Render **Web Service** target. Root directory in Render: `backend-api`.

## Environment variables

| Name | Example |
|------|---------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Render Postgres **Internal** URL |
| `JWT_SECRET` | Long random string (for future auth) |
| `CORS_ORIGIN` | `*` during development |

`PORT` is set automatically by Render.

## Scripts

- `npm run build` — compile TypeScript to `dist/`
- `npm run start` — run `node dist/index.js`
- `npm run dev` — local dev with `tsx`

## Smoke test after deploy

- `GET https://<your-service>.onrender.com/health`
- `GET https://<your-service>.onrender.com/health/db`
