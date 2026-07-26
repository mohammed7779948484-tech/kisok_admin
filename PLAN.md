# Kiosk Admin Web — Implementation Plan

## 1. Objective and delivery

Build a production-ready, English LTR, admin-only web application for the existing kiosk Supabase project.

- Framework: Refine v5 headless core, React 19, TypeScript, Vite, and React Router.
- UI: Tailwind CSS and the official shadcn/ui component library.
- Backend: the existing Supabase Database, Auth, RLS policies, and RPC contracts.
- Privileged Auth operations: one protected Supabase Edge Function.
- Hosting: Vercel as a Vite SPA.
- Scope: dashboard, brands, categories, products, flavors, inventory, orders, store settings, and user administration.
- Tests: only critical unit/integration checks and one essential browser smoke flow. Do not generate a test file for every component or page.

## 2. Non-negotiable architecture and security

### Clean Architecture

Use a practical Clean Architecture dependency direction:

```text
src/app             Composition root, providers, resource registry, router
src/domain          Domain entities, enums, value types, business invariants
src/application     Use cases and repository/gateway interfaces
src/infrastructure  Supabase, Refine data provider, RPC, and Edge Function adapters
src/presentation    Pages, layouts, feature compositions, and shadcn/ui usage
src/shared          Environment parsing, errors, constants, and generic utilities
```

Rules:

- `domain` imports no framework, Refine, Supabase, or UI code.
- `application` depends only on `domain`.
- `infrastructure` implements application ports.
- `presentation` calls application services or Refine hooks and never constructs privileged clients.
- `app` is the only composition root that wires providers, adapters, routes, and resources.
- Avoid empty abstractions, one-method wrapper classes, and duplicated DTO/domain types when no boundary conversion exists.

### Credentials and connection model

- The browser client uses only:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
- Authenticate admins with Supabase email/password and the user JWT.
- Never include `SUPABASE_SECRET_KEY`, `service_role`, a PostgreSQL password, or a direct PostgreSQL URL in browser code, Vite-prefixed variables, source control, logs, or the production bundle.
- A Vite/React browser application must not connect directly to PostgreSQL. Direct PostgreSQL credentials are server-only and are not the Refine data provider.
- Store the privileged Supabase key only in Supabase Edge Function secrets. The Edge Function must explicitly validate the caller before creating an admin client.
- Keep `.env.local` ignored. Commit only `.env.example` with empty placeholders and security comments.
- Treat previously shared database and secret credentials as exposed and rotate them before production.

### Authorization

- Promote the existing active `customer` profile to `admin`; do not create a new admin account.
- Re-query and verify there is exactly one intended active customer before updating it.
- After promotion, verify `current_active_profile()` returns `role = admin` and `is_active = true` when that account signs in.
- Every protected route must require a valid Supabase session and an active Admin profile.
- UI access checks are usability controls only. Database RLS/RPC checks and Edge Function authorization remain authoritative.
- User deletion is not supported. Deactivation sets `is_active = false` and blocks Auth access while preserving historical references.
- Self-deactivation requires an explicit destructive confirmation. Do not add a last-admin database guard in v1.

## 3. Refine and shadcn/ui foundation

### Refine

- Use `@refinedev/core`, `@refinedev/supabase`, `@refinedev/react-router`, and `@refinedev/react-hook-form`.
- Do not install or use `@refinedev/antd`; Refine remains headless.
- Implement:
  - Supabase-backed `dataProvider`.
  - Email/password `authProvider`.
  - Admin-only `accessControlProvider`.
  - Consistent notification and error mapping.
  - Resource definitions with explicit list/create/edit/show routes.
- Generated/Inferencer output may be used only as an initial reference. Final pages must be explicit, maintainable TypeScript.

### shadcn/ui

- Initialize the official shadcn/ui Vite setup with Tailwind CSS, CSS variables, Lucide icons, and a neutral theme.
- Install all official shadcn/ui components, blocks, and recipes required by the complete dashboard in an initial batch.
- Start from an official shadcn dashboard/sidebar block and official Data Table recipe instead of hand-building application chrome or tables.
- Use official primitives for buttons, inputs, labels, forms, selects, checkboxes, switches, cards, tables, badges, dialogs, alert dialogs, sheets, dropdown menus, commands, popovers, tabs, tooltips, skeletons, alerts, toasts, pagination, breadcrumbs, separators, scroll areas, and avatars.
- Do not recreate a component that exists in shadcn/ui. Feature components may compose installed shadcn primitives, but must not duplicate their base behavior or accessibility logic.
- Use `AlertDialog` for destructive actions, `Dialog` or `Sheet` for editing/details, `Skeleton` for loading, `Alert` for failures, and `Sonner` for mutations.
- Keep a consistent responsive shell, keyboard navigation, visible focus states, accessible labels, empty states, loading states, and error states.
- Use theme tokens rather than arbitrary Tailwind palette values. Avoid gradients, glassmorphism, nested card stacks, and competing accent colors.

## 4. Supabase changes

Do not add new public tables, columns, views, Storage buckets, or Realtime publications for v1.

### Required database updates

- Promote only the verified current active customer profile to `admin`.
- Add the missing explicit grants to `authenticated`:
  - `brands`: `INSERT`, `UPDATE`
  - `categories`: `INSERT`, `UPDATE`
  - `flavors`: `UPDATE`
  - `store_settings`: `UPDATE`
- Keep RLS enabled on every existing public table.
- Do not grant direct access to `auth.users` or `profiles`.
- Run Supabase Security and Performance Advisors after changes.
- Enable leaked-password protection before production.

### Existing RPC contracts to preserve

- `save_product_with_categories`
- `create_flavor_with_initial_stock`
- `create_child_category`
- `apply_inventory_adjustment`
- `set_inventory_quantity`
- `complete_order`
- `cancel_order`
- `current_active_profile`

Do not duplicate these transactional rules in React. Map database/RPC errors to clear English messages.

### `admin-users` Edge Function

Deploy one Edge Function with JWT verification enabled.

Authorization sequence:

1. Require a Bearer user JWT.
2. Validate the JWT with Supabase Auth.
3. Load the caller's profile.
4. Require `role = admin` and `is_active = true`.
5. Only then construct/use the privileged server-side client.

Supported request actions:

- `list`: paginated Auth users joined with profiles, with search.
- `create`: email, password, display name, and one of `admin | preparation | customer`; confirm the email.
- `update`: display name, role, and active state.
- `set_password`: directly set the selected user's new password.
- `deactivate`: set the profile inactive and block Auth access.
- `reactivate`: reactivate the profile and restore Auth access.

Behavior:

- If Auth user creation succeeds but profile creation fails, delete the newly created Auth user as compensation.
- Never return or log passwords, JWTs, secret keys, or database connection strings.
- Restrict CORS to the production Vercel origin and local development origins. CORS is not a substitute for authorization.
- Existing access tokens may remain valid until expiry; the active-profile checks must deny disabled accounts on every privileged operation.

## 5. Product behavior

### Authentication

- Login page with email, password, validation, loading state, and generic invalid-credentials errors.
- No public sign-up, OAuth, or password-reset page in v1.
- Redirect unauthenticated users to `/login`.
- Sign out locally and redirect to `/login`.

### Dashboard

- Active products and flavors.
- Low-stock count and low-stock list using the global threshold.
- Orders grouped by status.
- Recent orders and recent inventory adjustments.
- Refresh active operational data every 15 seconds; pause polling when the tab is hidden.

### Catalog

- Brands: server-side list/search/sort/pagination, create, edit, activate/deactivate, and dependency-aware delete.
- Categories: hierarchy display, root creation, child creation through RPC, edit, activate/deactivate, and dependency-aware delete.
- Products: list/search/filter/show; create and edit atomically with categories through `save_product_with_categories`.
- Flavors: list/filter/show; create with initial stock through `create_flavor_with_initial_stock`; edit and activate/deactivate.
- Prefer deactivation. Hard delete requires an explicit confirmation and must surface dependency errors without destructive retries.

### Inventory

- Show product, flavor, current quantity, threshold state, and last update.
- Adjust quantities only through `apply_inventory_adjustment` or `set_inventory_quantity`.
- Require adjustment type and any reason mandated by the existing contract.
- Show immutable adjustment history.

### Orders

- List, filter, search, sort, paginate, and show order items and status history fields.
- Poll active orders every 15 seconds; do not add an orders Realtime publication.
- Complete and cancel only through the existing RPCs.
- Never expose generic direct order status editing.

### Store settings

- Edit the singleton settings row.
- Validate numeric thresholds, reset duration, timezone, and HTTPS image URLs.

### User administration

- List Auth email, display name, role, active state, and creation date.
- Create a user with email, password, display name, and role.
- Edit display name and role.
- Set a new password with confirmation.
- Deactivate/reactivate users; do not hard-delete them.
- Send all actions through `admin-users`; never query `auth.users` from the browser.

### Images

- v1 uses manually supplied Cloudinary `public_id` and `secure_url`.
- Validate secure URLs as HTTPS and preview them with the shadcn aspect-ratio/image presentation.
- Do not implement browser uploads and do not include a Cloudinary API secret.

## 6. Error handling and operational quality

- Normalize Supabase, PostgREST, RPC, Auth, and Edge Function failures into typed application errors.
- Show safe user messages and retain technical details only in development logs without secrets.
- Prevent duplicate submissions and disable mutation controls while pending.
- Invalidate only affected Refine queries after successful mutations.
- Provide empty, loading, unauthorized, offline, and recoverable-error states.
- Pin dependency versions and commit the lockfile.
- Keep the bundle free of server-only packages and credentials.

## 7. Minimal test and verification strategy

Do not create one test file per page or component.

Required automated coverage:

- Unit tests for environment validation and critical error mapping.
- Integration tests for the auth/access-control decision and one RPC adapter.
- Edge Function tests for missing JWT, non-admin, inactive admin, successful user creation, profile-create compensation, and password update.
- One Playwright smoke flow: Admin login, dashboard load, navigation to a CRUD resource, and logout.

Required manual/tool verification:

- Non-admin and inactive accounts cannot enter the dashboard.
- The promoted customer account can sign in as Admin.
- Brand/category create and update work after grants.
- Product, flavor, inventory, and order mutations use their RPCs.
- User creation, role update, password update, deactivation, and reactivation work through the Edge Function.
- `npm run lint`, TypeScript checking, the limited test suite, and `npm run build` succeed.
- Search the production bundle for secret-key prefixes, the database password, and direct PostgreSQL URLs; none may appear.
- Run Supabase advisors after database changes.

## 8. Deployment and acceptance

- Add `vercel.json` SPA rewrites so direct route refreshes resolve to `index.html`.
- Configure only the public URL and publishable key in Vercel frontend environment variables.
- Deploy the Edge Function before the frontend.
- Create a Vercel preview deployment, run the smoke flow, then deploy production.
- Verify login, route refresh, responsive sidebar, main CRUD reads, one safe mutation, and user management in production.

Acceptance is complete when:

- The application is deployed and usable by the promoted Admin account.
- Every scoped resource has its planned page and operations.
- shadcn/ui supplies all base UI components; no competing UI framework or hand-built primitive library remains.
- Clean Architecture boundaries are visible and respected without unnecessary boilerplate.
- RLS/RPC authorization remains effective for browser traffic.
- Privileged Auth operations run only in the authorized Edge Function.
- No secret or direct database credential is present in frontend source, Git history, logs, or build output.
