# Kiosk Admin

Private administrator dashboard for the kiosk Flutter application. It uses Refine, React, Vite, TypeScript, Supabase, Tailwind CSS, and official shadcn/ui components.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. Set `VITE_CLOUDINARY_CLOUD_NAME` and, for browser uploads, an unsigned `VITE_CLOUDINARY_UPLOAD_PRESET`.
4. Install dependencies with `npm install`.
5. Start the app with `npm run dev`.

Only the public Supabase URL and publishable key belong in the browser environment. Never add a Supabase secret key, service-role key, or PostgreSQL connection string to a `VITE_*` variable.
Cloudinary API secrets are also server-only; the Vite app uses the public cloud name plus an unsigned upload preset for the upload widget.

## Commands

- `npm run dev` — start the Vite development server.
- `npm run lint` — run ESLint.
- `npm run typecheck` — run TypeScript checks.
- `npm test` — run focused unit tests.
- `npm run test:smoke` — run Playwright smoke tests against installed Chrome.
- `npm run build` — create a production build.

The authenticated Playwright flow additionally requires `E2E_ADMIN_EMAIL` and `E2E_ADMIN_PASSWORD` in the local process environment. These values must be a Supabase Auth administrator login and are never committed.

## Architecture

The source follows clean architecture boundaries:

- `src/domain` contains business entities.
- `src/application` contains policies and ports.
- `src/infrastructure` contains Supabase and gateway adapters.
- `src/presentation` contains routes, pages, and composed UI.
- `src/components/ui` contains generated shadcn/ui primitives.

Privileged Auth user management runs only inside the deployed `admin-users` Supabase Edge Function. The browser sends the signed-in administrator JWT; the function independently verifies the caller's active admin profile before using server-side credentials.
