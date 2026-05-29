# IGO PG ERP — Revamp Master Plan

> **Goal:** Take the current working ERP from "solid CRUD app" to "premium, advanced PG operating system."
> **Focus (per decisions):** ① Add more features (business depth) ② Visual/UX revamp.
> **Model:** Single owner + staff (RBAC enforced so staff see only what they should).
> **Integrations:** Web-app only for now — WhatsApp / payments / true PDF are a clearly-marked future phase.

---

## 1. Where We Are Today (Audit Summary)

**Stack:** React 18 · Vite 5 · TypeScript · React Router v6 · Zustand · SCSS · Supabase (Postgres + Auth + Storage), project `aqejtzhqfzvnvghgzsra`.

**Modules (13):** Dashboard, CEO Dashboard, Branches, Tenants, Accounts, Operations (5 tabs), Food (3 tabs), Inventory, Staff, Leads, Reports, Documents, Admin.

**Data model (24 tables):** owners, branches, rooms, beds, tenants, kyc_documents, documents, rent_records, advance_ledger, expenses, cashbook, food_purchases, meal_tracking, kitchen_stock_items, kitchen_stock_transactions, inventory_items, staff, attendance, tickets, leads, shift_checklists, visitor_logs, utility_readings, app_roles, user_profiles.

### What's strong
- Clean module/service/page separation.
- RLS enabled on **every** table, owner-scoped (`auth_user_id → owners.id → branches`).
- Fully typed Supabase layer (`database.types.ts`).
- RBAC schema (`app_roles`, `user_profiles`) already designed.

### What's holding it back
| Area | Gap |
|------|-----|
| **RBAC** | Built in DB + Admin UI, but **not enforced** — nav and routes ignore permissions; every user sees everything. |
| **Data layer** | No caching. Every page refetches on mount. No optimistic updates, no shared invalidation. Lots of duplicated `useCallback`+`useEffect` load logic. |
| **Charts** | All "charts" are hand-rolled CSS bars. No real charting library. |
| **Bundle** | Single 566 KB chunk, no route code-splitting. |
| **Money** | Rent is 100% manual. `late_fee` and `advance_ledger` columns exist but have **no UI**. No receipts, no invoices, no payment history, no deposit settlement, no payroll, no EB billing. |
| **Tenant view** | No "tenant 360" ledger; no structured vacate/settlement workflow. |
| **Alerts** | Overdue rent, KYC expiry, low stock, open tickets are scattered across pages — no unified alerts center. |
| **Dead code** | Legacy CRA-era `src/components/` folder still in tree. Auth init duplicated between `App.tsx` and `useAuth.ts`. Zero tests despite testing-library installed. |
| **Polish** | Spinners (no skeletons), no dark mode, no global search/command palette, table-heavy on mobile. |

---

## 2. Target Architecture (the "best system" shape)

```
┌─────────────────────────────────────────────────────────────┐
│  App Shell:  Topbar (branch switcher · ⌘K search · 🔔 alerts) │
│              Sidebar (permission-filtered)                    │
├─────────────────────────────────────────────────────────────┤
│  Data layer:  TanStack Query  ── caches, invalidates,         │
│               optimistic-updates all Supabase reads/writes    │
├─────────────────────────────────────────────────────────────┤
│  UI kit:  DataTable · Chart wrappers (Recharts) · StatCard ·  │
│           Drawer · Modal · Skeleton · EmptyState · Badge      │
├─────────────────────────────────────────────────────────────┤
│  Access:  usePermissions()  →  <Can/> guard + route guard     │
│           branch-access scoping for staff                     │
├─────────────────────────────────────────────────────────────┤
│  Supabase:  Postgres + RLS · Auth · Storage (receipts/docs)   │
└─────────────────────────────────────────────────────────────┘
```

**New libraries to add:** `@tanstack/react-query`, `recharts`, `react-hook-form` + `zod` (form validation), `date-fns`. (All lightweight, web-only.)

---

## 3. Phased Roadmap

Phases are ordered so each unblocks the next. Foundation is fast and makes every later phase cheaper.

---

### ▸ Phase 0 — Foundation (prerequisite, ~quick wins)

*Makes everything after it faster, smaller, and consistent.*

1. **TanStack Query** — wrap app in `QueryClientProvider`; introduce `src/lib/queryClient.ts`. Migrate one module (Accounts) as the reference pattern; others follow per-phase.
2. **Charting** — add Recharts; create `src/shared/charts/` wrappers (`<TrendChart/>`, `<BarChart/>`, `<DonutChart/>`) so pages never touch Recharts directly.
3. **UI kit** — `src/shared/ui/`: `DataTable` (sort, filter, paginate, CSV export, sticky header), `Skeleton`, `Drawer`, `StatCard`, `PageHeader`, `Money` formatter. Replace ad-hoc tables progressively.
4. **RBAC hook** — `usePermissions()` reads the logged-in `user_profiles` row + joined `app_roles.permissions`; expose `can(module)`. Add `<Can module="accounts">` and a `requirePermission` route wrapper.
5. **Code-splitting** — `React.lazy` + `Suspense` for every route in `AppRouter`. Kills the 566 KB single chunk.
6. **Cleanup** — delete legacy `src/components/` dead code; de-duplicate auth init (single source in `App.tsx`, `useAuth` consumes store only); add `src/lib/env.ts` for validated env access.

**DB:** none.
**Deliverable:** same features, faster + smaller, RBAC ready to switch on.

---

### ▸ Phase 1 — Visual / UX Revamp

*The "make it premium" phase.*

1. **Design tokens v2** — refine palette, add elevation/spacing scale, dark-mode CSS variables (`[data-theme="dark"]`), theme toggle in profile menu.
2. **App shell upgrade**
   - **⌘K Command Palette** — global fuzzy search across tenants, rooms, tickets, expenses + quick actions ("Collect rent", "Add expense", "New ticket").
   - **🔔 Alerts Center** — dropdown aggregating overdue rent, KYC expiring (30d), low kitchen stock, open tickets, lease/notice due. (Powered by Phase 3 alerts engine; stub now.)
   - **Breadcrumbs** + page transitions.
3. **Dashboard redesign** — replace KPI text cards with real Recharts: occupancy donut, 6-month revenue/expense area chart, collection-rate gauge, ticket heat by category. Keep CEO dashboard as the multi-branch roll-up.
4. **DataTable rollout** — Tenants, Accounts, Inventory, Staff, Leads → sortable/filterable/exportable tables with pagination.
5. **Skeleton loaders** everywhere (replace bare spinners).
6. **Mobile polish** — card-list fallback for tables on small screens; bottom nav option.

**DB:** none.
**Deliverable:** app looks and feels like a premium SaaS product.

---

### ▸ Phase 2 — Money Features (highest business value)

*Turn manual bookkeeping into an automated finance engine.*

1. **Rent automation**
   - Auto-generate monthly rent records for all active tenants (scheduled-feel: "Generate for this month" already exists → add prorated first-month by `doj`).
   - **Late-fee rules** (use existing `rent_records.late_fee`): owner-configurable grace days + flat/%-fee; auto-applied to overdue records.
   - **Partial-payment history** — new table `rent_payments` (many payments per rent record) so a tenant can pay in installments with full history, instead of overwriting `paid_amount`.
   - **Receipts** — printable rent receipt (in-app print/HTML, same pattern as Reports print). True PDF deferred to Phase 5.
2. **Advance / Deposit ledger** (use existing `advance_ledger`) — UI to record deposit in, adjustments, and **settlement on vacate** (auto-net dues vs deposit, mark `advance_returned`).
3. **EB / Utility billing** — convert `utility_readings` into billable: per-room units × rate → split across room's tenants → push as a line into their rent/dues.
4. **Payroll** — new tables `salary_runs`, `salary_slips`, `staff_advances`. Generate monthly payroll from `attendance` (present/absent/leave → payable days), record advances/loans, produce printable salary slip.
5. **Expense upgrades** — recurring expense auto-posting, receipt image upload (`expenses.receipt_url` exists), simple vendor list.

**DB migrations:** `rent_payments`, `salary_runs`, `salary_slips`, `staff_advances`, `late_fee_rules` (or owner setting), `utility_rates`.
**Deliverable:** rent, deposits, utilities, and payroll all flow with minimal manual entry.

---

### ▸ Phase 3 — Tenant & Operations Depth

*Make the system the single source of truth per resident.*

1. **Tenant 360 / Ledger** — a drawer/page per tenant showing timeline: rent history + dues, deposit ledger, KYC docs (with upload to Storage), tickets, meal plan, visit/notice dates. One screen answers "everything about this resident."
2. **Vacate workflow** — guided flow: notice date → final dues calc → deposit settlement → bed release (`beds.is_occupied=false`) → set `dov`. No more orphaned beds.
3. **Tenant agreement** — generate printable rental agreement from tenant + room + terms (in-app print; PDF later).
4. **Alerts engine** — a `src/lib/alerts.ts` selector that computes all alert types from cached data and feeds the 🔔 center built in Phase 1.
5. **Activity / audit log** — new `activity_log` table; log create/update/delete across modules with actor + branch; "Recent Activity" feed on dashboard.
6. **Leads → booking** — convert a lead into a booked bed (waitlist + expected move-in date), tying Leads to the occupancy funnel.

**DB migrations:** `activity_log`, `tenant_agreements` (optional), lead→tenant linkage column.
**Deliverable:** full resident lifecycle managed end-to-end.

---

### ▸ Phase 4 — Food & Advanced Reporting

1. **Meal plans + meal billing** — per-tenant meal subscription; tie `meal_tracking` to billable amounts on rent.
2. **Stock consumption** — deduct `kitchen_stock_items` automatically from meals/recipes; surface true cost-per-meal.
3. **Advanced reports** — collection-efficiency, **rent aging** (0–30/30–60/60+), occupancy trend, expense-category trend, payroll summary, food cost ratio — all with charts and **CSV/print export**.
4. **Scheduled report snapshots** — month-end summary saved for history.

**DB migrations:** `meal_plans`, optional `recipes`/`recipe_items`.
**Deliverable:** kitchen P&L visibility + decision-grade analytics.

---

### ▸ Phase 5 — Integrations (FUTURE — out of current scope)

*Marked future per decision. Listed so the architecture stays ready.*

- **WhatsApp** rent reminders / receipts via your **OpenClaw** agents (auto-nudge overdue tenants).
- **Payment gateway** (Razorpay/UPI) for online rent collection + auto-reconciliation into `rent_payments`.
- **True PDF** generation (receipts, agreements, salary slips) server-side.
- **Email/SMS** fallback channel.
- **Tenant self-service portal** (view dues, pay, raise tickets).

---

## 4. Cross-Cutting Quality Bar

- **Every** mutation: optimistic update + toast on success/error (no silent `console.error`).
- **Every** list: empty state + skeleton + error retry.
- **Forms:** `react-hook-form` + `zod` schema validation (replaces scattered manual checks).
- **RBAC:** staff scoped to assigned branches; nav + routes + actions all gated by `can()`.
- **Security:** enable Supabase leaked-password protection (the one open advisor warning); re-run advisors after each migration.
- **Tests:** add Vitest + a smoke test per service as modules migrate to React Query.

---

## 5. Suggested Execution Order (build sequence)

1. **Phase 0** (foundation) — do first, end-to-end.
2. **Phase 1** (UX) and **Phase 2** (money) can run in parallel tracks — UX is visual, money is logic.
3. **Phase 3** (tenant/ops depth) — depends on Phase 2 money + Phase 1 alerts shell.
4. **Phase 4** (food/reports) — depends on the chart + export kit from Phases 0–1.
5. **Phase 5** — future.

---

## 6. First Concrete Step

Start Phase 0 with a single vertical slice as the template the rest follows:
- Add React Query + Recharts + the `DataTable`/`StatCard` kit.
- Wire `usePermissions()` + nav filtering.
- Migrate **Accounts** (the money-critical module) to the new pattern as the reference implementation.
- Lazy-load all routes; delete `src/components/` dead code.

Once Accounts proves the pattern, each subsequent module migration is mechanical.
