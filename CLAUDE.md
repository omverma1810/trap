# CLAUDE.md — TRAP Inventory System

> Project context for AI assistants. Read this fully before making changes.
> It is written so any model (including Sonnet) can work confidently without re-exploring the whole repo.

---

## 1. What this is

**TRAP Inventory System** — an enterprise POS + inventory + sales management platform for a **luxury apparel brand** (Indian retail; prices are **MRP / GST-inclusive**, currency ₹).

It is a **pnpm monorepo** with two deployable apps:

| App | Path | Stack | Hosting |
|-----|------|-------|---------|
| Backend API | `apps/api` | Django 4.2 + DRF, JWT (SimpleJWT), PostgreSQL (Supabase in prod) | Google Cloud Run (Docker), region `asia-south1` |
| Frontend | `apps/web` | Next.js 14 (App Router), TypeScript, Tailwind, React Query, Zustand | Vercel |

`packages/ui`, `packages/contracts`, `packages/utils` exist but are **empty placeholders** (future shared code).

The system is feature-complete and in a "client-requested fixes" iteration phase. Backend development has been organized in **Phases** (referenced in code comments, e.g. Phase 10A product model, Phase 12 product-level ledger, Phase 13.1 POS accounting hardening, Phase 14 GST invoices, Phase 15 returns, Phase 16 reports).

---

## 2. Repo layout

```
apps/api/            Django project (core/ = settings/urls/wsgi/health)
  core/settings/     base.py, development.py, production.py
  users/             custom User model, JWT auth, roles, admin user mgmt
  inventory/         products, variants, warehouses, stores, suppliers,
                     POs, stock ledger/movements, transfers, credit/debit notes
  sales/             POS scan/checkout, Sale/SaleItem/Payment, returns, credit sales
  invoices/          GST invoices + PDF generation, business/discount settings
  analytics/         read-only dashboards (services/ subpackage)
  reports/           read-only detailed reports (Phase 16)
  notifications/     in-app notifications, email (SMTP), WhatsApp Business API
  barcodes/          generated SVG barcode files (committed artifacts)
apps/web/
  app/               App Router: (dashboard) group, /pos, /login, /design-system
  components/        ui/ primitives + feature folders
  hooks/             React Query hooks + zustand (theme) + dashboard filters ctx
  services/          one file per backend domain — ALL API calls live here
  lib/api/           axios client + interceptors + React Query provider
  lib/auth/          auth service + zustand store + useAuth
  styles/            globals.css (design tokens), custom.css
docs/                deployment, runbook, backup-recovery, env-vars, architecture
.github/workflows/   backend.yml (active), frontend.yml (currently disabled `on:`)
deploy.sh            manual Cloud Run deploy (⚠ see Security notes)
```

---

## 3. Running locally

```bash
pnpm install
# Backend
cd apps/api && pip install -r requirements.txt
python manage.py migrate           # USE_SQLITE=true for quick dev (no Postgres)
python manage.py runserver 0.0.0.0:8000
# Frontend (from root)
pnpm dev:web                        # Next.js on :3000
```

- Backend base path: **`/api/v1/`** (note: README mentions `/api` but real prefix is `/api/v1/`). Health at `/` and `/health/`.
- Frontend talks to backend via `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:8000/api/v1`).
- Useful mgmt commands: `users/management/commands/create_admin.py`, `promote_admin.py`, `inventory/management/commands/seed_demo_data.py`, `fix_product_pricing.py`.
- API docs: `/api/docs/` (Swagger), `/api/redoc/`, `/api/schema/`.
- Tests: `python manage.py test` (CI runs with `USE_SQLITE=true`). Lint: `ruff` (backend), `next lint` + `tsc --noEmit` (frontend).

---

## 4. Cross-cutting conventions (IMPORTANT — read before editing)

1. **camelCase API**: backend uses a custom `CamelCaseJSONRenderer` (`core/renderers.py`). Python models/serializers are `snake_case`; **all JSON responses are auto-converted to camelCase**. Frontend types are camelCase. Request bodies are parsed accordingly.
2. **Standardized errors**: `core/exception_handler.py` returns `{ "error": { "code", "message", "field?" } }`. Keep this shape for any new error.
3. **Pagination**: `core/pagination.py` — page-based, default 20 / max 100, response = `{ results: [...], meta: { page, pageSize, total, hasNext, hasPrev } }`.
4. **Immutability is a core invariant**. `Sale`, `SaleItem`, `Invoice`, `InvoiceItem`, `StockLedger`, `InventoryMovement` are **append-only**. Their `save()`/`delete()` actively block modification. Corrections = **new compensating records**, never edits. Do not "fix" data by mutating these.
5. **Ledger-derived stock**: stock is never a stored mutable counter. It is `SUM(quantity)` over the ledger (`InventoryMovement` at product level — Phase 12; `StockLedger` is the older variant-level system). `StockSnapshot` is only a perf cache, recalculated from the ledger.
6. **Atomic + concurrency-safe money ops**: financial flows use `@transaction.atomic`; sequence numbers (`InvoiceSequence`, `SKUSequence`, `CreditNoteSequence`, `DebitNoteSequence`) use `SELECT FOR UPDATE`. Checkout supports an `idempotency_key` to prevent duplicate sales.
7. **GST is MRP-inclusive**: selling prices already include GST. GST is *extracted* per line: `gst_amount = (price × gst%) / (100 + gst%)`. Discounts apply to subtotal **before** GST extraction. The checkout calculation order is LOCKED (see `sales/services.py`). Don't "add GST on top".
8. **Service layer**: business logic lives in `*/services.py` (backend) and `apps/web/services/*.ts` (frontend). Components/views stay thin. Add logic to services, not into views/components.
9. **Roles**: only two — `ADMIN` and `STAFF`. Enforced server-side via permission classes (see §5). Frontend role gating is **UX only, not security**.

---

## 5. Backend — auth, models, endpoints

### Auth & permissions
- Custom user: `users.User`, `role ∈ {ADMIN, STAFF}`, props `is_admin`, `is_staff_role`. Login is **email + password** (not username).
- JWT via SimpleJWT: access 60 min, refresh 1440 min (configurable). Rotation + blacklist on. DRF default permission is `AllowAny` — **every endpoint sets its own permission class**.
- Permission classes (`users/permissions.py`):
  - `IsAdmin` — ADMIN only (analytics, user mgmt, product writes, opening stock, dead stock, profit/GST reports, notification settings).
  - `IsStaffOrAdmin` — POS, inventory view, invoices, sales, transfers, notes, most reports.
  - `IsAdminOrReadOnly` — anyone authenticated reads; only ADMIN writes (products, warehouses, categories, suppliers, POs, stores).
- Auth endpoints: `POST /api/v1/auth/login/`, `/logout/`, `/refresh/`, `GET|PATCH /api/v1/auth/me/`.
- Admin user mgmt: `GET|POST /api/v1/admin/users/`, `GET|PATCH|DELETE /api/v1/admin/users/{id}/` (cannot delete self).

### Settings
- `core/settings/base.py` — apps, DRF, JWT, renderer, exception handler, custom user.
- `development.py` — DEBUG, SQLite if `USE_SQLITE=true` else Postgres, browsable API, CORS localhost:3000.
- `production.py` — DEBUG off, Postgres+SSL (Supabase), WhiteNoise static, JSON logging, security headers, CORS/CSRF from env.

### Inventory app — key models
- **Product** (Phase 10A master model, UUID pk): `name, sku (auto, immutable), barcode_value (auto, immutable), barcode_image_url, brand, brand_id, brand_code, category, category_id, product_code, alias, description, country_of_origin, attributes (JSON), gender (MENS/WOMENS/UNISEX/KIDS), material, season, supplier (FK, set on first PO receipt), is_active, is_deleted (soft delete)`. SKU = `{BRAND}-{CATEGORY}-{SEQ:06d}` via `SKUSequence`. `regenerate_barcode_with_supplier()` runs once on first PO receipt.
- **ProductVariant**: size, color, cost_price, selling_price, reorder_threshold, auto EAN-13 barcode. `get_total_stock()`, `get_stock_in_warehouse()`.
- **ProductPricing** (OneToOne Product): cost_price, mrp, selling_price, gst_percentage; computed `margin_percentage`, `profit_amount`, `gst_amount`.
- **InventoryMovement** (Phase 12, immutable product-level ledger): `product, warehouse?, store?, movement_type, quantity, reference_type, reference_id, remarks, created_by`. Types: OPENING, PURCHASE, SALE, RETURN, RETURN_INWARD, RETURN_OUTWARD, ADJUSTMENT, DAMAGE, TRANSFER_IN, TRANSFER_OUT (sign rules enforced).
- **StockLedger** + **StockSnapshot**: older variant-level immutable ledger + cache.
- **Warehouse** (physical storage), **Store** (retail outlet, has `operator` user, `low_stock_threshold`), **Supplier** (auto code), **Category**.
- **PurchaseOrder/PurchaseOrderItem**: `PO-YYYY-NNNNNN`; status DRAFT→SUBMITTED→PARTIAL→RECEIVED/CANCELLED; default tax 18%.
- **StockTransfer/Item**: warehouse→store, `TRF-YYYY-NNNNNN`, PENDING→IN_TRANSIT→COMPLETED/CANCELLED (dispatch = TRANSFER_OUT, receive = TRANSFER_IN).
- **CreditNote** (customer return → RETURN_INWARD, `CR-YYYY-NNNNNN`) / **DebitNote** (supplier return → RETURN_OUTWARD, `DR-YYYY-NNNNNN`); statuses DRAFT/ISSUED/SETTLED(/ACCEPTED for debit)/CANCELLED.

### Sales app
- **Sale** (immutable after COMPLETED): `idempotency_key (unique), invoice_number, warehouse, customer_*, subtotal, discount_type (PERCENT/FLAT), discount_value, total, total_gst, total_items, status (PENDING/COMPLETED/FAILED/CANCELLED/REFUNDED), is_credit_sale, credit_amount, credit_balance, credit_status (NONE/PENDING/PARTIAL/PAID), created_by`. Only allowed transitions: new, PENDING→COMPLETED/FAILED, credit updates on COMPLETED.
- **SaleItem**: snapshots product, supplier, selling_price, per-line GST.
- **Payment**: CASH/CARD/UPI/CREDIT, multi-payment per sale.
- Endpoints: `POST /sales/scan/`, `POST /sales/checkout/` (atomic), `GET /sales/`, returns (`/sales/returns/`, `/sales/adjustments/`), credit sales (`/sales/credit/`, `/sales/credit/pay/`, `/sales/credit/history/`).

### Invoices app
- **Invoice** (Phase 14, immutable, OneToOne Sale) + fully-snapshotted **InvoiceItem** (no FKs). `BusinessSettings` & discount config are singletons (`get_settings()`). PDF via `invoices/pdf/generator.py`.
- Endpoints: `GET /invoices/`, `POST /invoices/generate/`, `GET /invoices/settings/discounts/`, `GET /invoices/settings/pos-discounts/`.

### Analytics & Reports (read-only, service-backed, no models)
- **Analytics** `/api/v1/analytics/...` — overview/summary/trends/top-products/revenue/discounts/performance. Most are `IsAdmin`; sales summary & top products & low-stock are `IsStaffOrAdmin`. Params: `period` (today/week/month/year), `warehouse_id`, `start_date`, `end_date`.
- **Reports** `/api/v1/reports/...` — current stock, stock aging, movements, sales summary/by-product/trends, returns, adjustments, profit, GST, by category/brand/size/supplier/supplier-sales/warehouse. Rule: **reports compute, dashboards only visualize**.

### Notifications
- `Notification` (LOW_STOCK/RESTOCK/SALE_COMPLETED/PO_RECEIVED/SYSTEM; priorities LOW→CRITICAL), `EmailNotification` (SMTP), `WhatsAppNotification` (WhatsApp Business API — INVOICE/LOW_STOCK/PROMOTIONAL/CUSTOM), `NotificationSetting` singleton (SMTP creds, WhatsApp tokens, recipients).
- Endpoints under `/api/v1/notifications/`: list, detail, `mark-read`, `unread-count`, `low-stock`, `settings` (IsAdmin), `email/test`, `whatsapp/invoice`, `whatsapp/send`.

### Top-level URL map (`core/urls.py`)
`admin/`, `/` & `/health/`, `api/v1/{auth,admin,inventory,sales,invoices,analytics,reports,notifications}/`, `api/{schema,docs,redoc}/`.

---

## 6. Frontend — structure & data flow

### Routing (App Router)
- `app/layout.tsx` — root: QueryProvider, anti-flash theme script, Sonner toaster.
- `app/login/page.tsx` — email/password login.
- `app/(dashboard)/layout.tsx` — protected: sidebar + top-bar, **client-side** auth + role gating.
- `app/(dashboard)/` pages: `/` (dashboard KPIs+trends+low-stock), `inventory`, `invoices`, `purchase-orders`, `credit-sales`, `debit-credit-notes`, `stores` + `stores/[id]`, `users` (admin), `warehouses` (admin), `settings`, `reports` hub + subpages `sales|inventory|returns|profit|brand|category|size|supplier|supplier-sales|warehouse`.
- `app/pos/` — minimal layout (no sidebar), barcode-driven POS with cart + checkout.
- `app/design-system/page.tsx` — component showcase.

### Auth flow
- `lib/auth/auth.service.ts` — login/logout/refresh/me; tokens in **localStorage** (`trap_access_token`, `trap_refresh_token`).
- `lib/auth/auth.store.ts` — Zustand (persisted) `user/isAuthenticated/isLoading` + `checkAuth`.
- `lib/auth/useAuth.ts` — exposes `role/isAdmin/isStaff/canViewReports`.
- `middleware.ts` — **pass-through only** (it checks a cookie but does NOT block; real enforcement is client-side in the dashboard layout). ⚠ Not a security boundary — the backend permission classes are.

### API layer
- `lib/api/client.ts` — axios instance, baseURL `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:8000/api/v1`), 15s timeout. Request interceptor injects Bearer token. Response interceptor: on 401 → single-flight refresh via `/auth/refresh/`, queues concurrent requests, retries; on refresh failure clears tokens + redirects `/login`. Exports `api.{get,post,put,patch,delete}` returning unwrapped `.data`.
- `lib/api/query-provider.tsx` — React Query: staleTime 30s, gcTime 5m, retry 1, devtools in dev.

### Services (one per domain — **the only place API URLs appear**)
`inventory`, `invoices`, `sales` (POS scan/checkout), `credit-sales`, `debit-credit-notes`, `purchase-orders`, `stores` (+ stock transfers), `analytics`, `reports`, `users`, `notifications`. Each maps 1:1 to the backend endpoints in §5 and defines its TypeScript types.

### Hooks
React Query hooks per domain (`use-inventory`, `use-invoices`, `use-sales`, `use-analytics`, `use-reports`, `use-users`) with structured query-key factories and mutation cache-invalidation. `usePOSProducts` refetches every 30s for live stock. `use-theme.ts` = Zustand theme store (persist key `trap-theme`, sets `data-theme`). `use-dashboard-filters.tsx` = React Context for date-range + warehouse, synced to URL query params (default last 30 days). POS cart state = `components/pos/cart-context.tsx`.

### State management summary
- Server state → React Query. Client state → Zustand (`auth`, `theme`). Cross-component UI state → React Context (cart, dashboard filters).

---

## 7. UI / Theme / UX

**"Dark Luxury" theme**, fully CSS-variable driven (`styles/globals.css`), Tailwind maps tokens to `var(--...)`. `darkMode: "class"`; light theme via `html[data-theme="light"]`. Anti-flash script in root layout.

Palette (dark default):
- Backgrounds: `--bg-primary #0e0f13`, surfaces semi-transparent (glassmorphism, 12px blur).
- Text: primary `#f5f6fa`, secondary `#a1a4b3`, muted `#6f7285`.
- **Accent primary = Champagne Gold `#c6a15b`** (brand), secondary = Tech Blue `#4f7dff`.
- Semantic: success `#2ecc71`, warning `#f5a623`, danger `#e74c3c`.
- Light mode darkens gold→`#b8923e`, blue→`#3b5fd9`, inverts bg/text.

Type: **Inter** (Google Fonts) + JetBrains Mono; scale `heading-xl…caption`; `.numeric` tabular nums for POS/pricing. Radius 6/10/16/full. Motion: fast 150 / medium 250 / slow 400 ms, easing `cubic-bezier(0.4,0,0.2,1)`; keyframes fade/slide/scale/shimmer; `framer-motion` for page/sidebar transitions; respects `prefers-reduced-motion`.

UI primitives (`components/ui`, CVA-based): `button` (primary/secondary/ghost/danger/link × sm/md/lg/icon), `card`, `modal`/`dropdown`/`tooltip` (Radix), `input`, `badge`, `pagination`, `skeleton`, `empty-state`, `error-state`. Feature component folders mirror domains (pos, inventory, invoices, credit-sales, debit-credit-notes, purchase-orders, analytics, dashboard, notifications, layout).

Design language: minimalist dark, gold accents, glass cards, generous spacing, large touch targets for POS (`min-h-[44px]`), lucide-react icons, charts via Recharts, PDF via jsPDF, Excel via xlsx, toasts via Sonner.

Sidebar nav order (`components/layout/sidebar.tsx`), `adminOnly` filtered for STAFF: Dashboard, POS, **Warehouses\***, Inventory, Purchase Orders, Debit/Credit Notes, Credit Sales, **Stores\***, **Reports\***, **Users\***, Invoices, Settings (\* = admin only). Theme toggle + logout live in the sidebar footer.

---

## 8. Deployment / CI

- **Backend**: Docker multi-stage (`apps/api/Dockerfile`, Python 3.11, gunicorn gthread, non-root, runs `collectstatic`, healthcheck `/health/`). `.github/workflows/backend.yml` on push to `master` (paths `apps/api/**`): test (SQLite) → build/push image to Artifact Registry → deploy Cloud Run `trap-api` (asia-south1) → run `trap-migrate` job → health check. Secrets via GCP Secret Manager.
- **Frontend**: Vercel (`apps/web/vercel.json`, pnpm). `.github/workflows/frontend.yml` exists but its `on:` triggers are **commented out** (currently inactive; Vercel's own Git integration likely deploys).
- DB in prod = **Supabase Postgres** (pooler port 6543 / direct 5432). Ops: `docs/runbook.md`; backups: `docs/backup-recovery.md`; env reference: `docs/env-vars.md`.
- Key env: backend `DJANGO_SECRET_KEY, DJANGO_ENV, DJANGO_ALLOWED_HOSTS, POSTGRES_*, CORS_ALLOWED_ORIGINS, CSRF_TRUSTED_ORIGINS, USE_SQLITE`; frontend `NEXT_PUBLIC_API_BASE_URL` (must end in `/api/v1`).

---

## 9. ⚠ Security / gotchas to keep in mind

1. **Hardcoded production secret**: `deploy.sh` contains a real Supabase host + password in plaintext (committed). This is a credential leak — flag/rotate before relying on it; never copy this pattern.
2. **Auth is enforced only server-side.** `middleware.ts` does not block; frontend role checks are cosmetic. Any new sensitive endpoint MUST set an explicit permission class.
3. **Two real prefixes**: backend is `/api/v1/` (some docs say `/api`). Frontend `NEXT_PUBLIC_API_BASE_URL` must include `/api/v1`.
4. **Never mutate immutable models** (Sale/Invoice/ledger/movement). Their `save()`/`delete()` will raise. Use compensating records (adjustments, returns, credit/debit notes).
5. **GST is inclusive** — follow the locked calculation order in `sales/services.py`; don't add tax on top or change discount-before-GST ordering.
6. **camelCase boundary** — backend code is snake_case but the wire is camelCase (auto). When adding fields, update both the serializer and the matching TS service type.
7. **`packages/*` are empty** — don't import from them expecting shared code.
8. Tokens live in `localStorage` (XSS-exposed by design); barcode SVGs are committed build artifacts under `apps/api/barcodes/`.

---

## 10. Where to make changes (quick map)

| Task | Backend | Frontend |
|------|---------|----------|
| New API endpoint | add view + `urls.py` + serializer + logic in `services.py`, set permission class | add method in matching `services/*.ts` + a hook in `hooks/use-*.ts` |
| New product field | `inventory/models.py` (+ migration), serializer | `services/inventory.service.ts` type + relevant modal/list component |
| Change pricing/GST/discount math | `sales/services.py` (locked order), `invoices/` | `components/pos/*`, invoice preview |
| New report | `reports/views.py` + `reports/services.py` + `reports/urls.py` | `services/reports.service.ts` + `hooks/use-reports.ts` + `app/(dashboard)/reports/<x>/page.tsx` |
| Theme/colors | — | `apps/web/styles/globals.css` (CSS vars), `tailwind.config.ts` |
| Nav item | — | `components/layout/sidebar.tsx` (`navItems`, `adminOnly`) |
| Roles/permissions | `users/permissions.py` + per-view classes | `lib/auth/useAuth.ts`, sidebar `adminOnly` |

Always run backend tests + `tsc --noEmit`/`next lint` after changes. Confirm before any destructive or shared-state action (pushes, deploys, migrations against real DBs).
