# SystemsMonitoringDashboard

API health monitoring dashboard with auto-refresh, JWT auth support, and Arabic/English UI.

## Features

- Monitor multiple systems/APIs (ONLINE on HTTP 200, OFFLINE otherwise)
- Auto-refresh every 5 seconds
- JWT login flow for protected APIs (e.g. Medical API)
- Local proxy in dev/preview to avoid CORS (`/api/check`)
- Arabic and English with RTL/LTR support

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |

## Deploy on Vercel

The repo includes `api/check.js` as a serverless function so monitoring works in production (not only during `npm run dev`).

```bash
# Connect the GitHub repo on vercel.com — default Vite settings work
```

## Notes

- API credentials are stored in browser `localStorage` for local monitoring only.
- `/api/check` runs via Vite middleware in dev and Vercel serverless in production.
