# 3D By SD Admin

Admin panel for the "3D by SD" store (INR). Manage products, orders, customers, staff, and settings.

## Run Locally

**Prerequisites:** Node.js, a PostgreSQL (Neon) database

1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env` and set `DATABASE_URL` (Prisma connection string).
3. Run the app:
   `npm run dev`

## Scripts

- `npm run dev` — dev server (Vite + API)
- `npm run build` — production build (static assets + `dist/server.mjs`)
- `npm start` — run production server
- `npm test` — run API tests (vitest)
- `npm run lint` — TypeScript typecheck

## Login

Default admin: `admin@example.com` / `admin123`. Enable Google Authenticator (TOTP) 2FA under Settings → Security & 2FA.
