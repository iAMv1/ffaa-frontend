# FFAA Frontend

React + Vite + Tailwind CSS dashboard for FFAA.

## Setup

```bash
npm install
```

## Run

```bash
npm run dev
```

Proxy: API calls to `/api/v1` and `/health` are proxied to `http://localhost:8000`.

## Build

```bash
npm run build
```

## Notes

- Uses Geist + Phosphor icons + Recharts.
- All tabs live in `src/App.tsx`.
- Reminders need backend SMTP env configured.
