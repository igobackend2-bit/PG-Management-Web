# PG Management Web App Template

This document is a full template for the PG Management Web application. It describes the app architecture, navigation, pages, shared layout patterns, key modules, state management, API/service structure, and extension guidance.

---

## 1. Purpose

Use this template to capture the complete web application design for a PG management dashboard. It is intended for:

- Product design and documentation
- Feature planning and requirements
- Developer onboarding
- Building new pages or module templates

---

## 2. Architecture Overview

This application is built with:

- **Frontend framework:** React 18
- **Router:** React Router v6
- **State management:** Zustand
- **Backend integration:** Supabase + Axios
- **Styling:** Sass / SCSS
- **Build tool:** Vite
- **TypeScript support:** TSX and TS files

Key entry points:

- `src/main.tsx` — app bootstrapping, global styles, error boundary, telemetry init
- `src/App.tsx` — auth initialization, branch loader, router wrapper
- `src/router/AppRouter.tsx` — route definitions and protected layout
- `src/shared/layouts/AppLayout.tsx` — shared sidebar + header layout

---

## 3. App Layout Template

The app uses a reusable layout containing:

- **Top header**
  - sidebar toggle button
  - app logo and title
  - branch selector dropdown
  - profile menu with user info, settings, and sign out

- **Sidebar navigation**
  - list of primary modules
  - active route highlighting with `NavLink`
  - collapsible sidebar state from `uiStore`

- **Content area**
  - page-specific content rendered through `<Outlet />`
  - toast container for notifications

### Layout responsibilities

- Keep navigation and global app controls outside module pages
- Preserve sidebar state and branch selection across pages
- Render only protected routes after auth validation

---

## 4. Navigation / Sidebar Template

The sidebar is defined in `src/shared/layouts/AppLayout.tsx` and includes the following items:

| Route | Label | Icon |
|---|---|---|
| `/` | Dashboard | ▦ |
| `/ceo` | CEO Dashboard | 📈 |
| `/branches` | Branches | 🏢 |
| `/tenants` | Tenants | 👤 |
| `/accounts` | Accounts | ₹ |
| `/operations` | Operations | 🔧 |
| `/food` | Food | 🍽 |
| `/inventory` | Inventory | 📦 |
| `/staff` | Staff | 👷 |
| `/reports` | Reports | 📊 |
| `/documents` | Documents | 📄 |
| `/admin` | Admin | ⚙️ |

> The sidebar supports a collapsed mode where only icons are visible, enabling a compact admin dashboard layout.

---

## 5. Pages and Routes Template

Routes are managed in `src/router/AppRouter.tsx`.

### Public route

- `/login` — login page uses `AuthLayout` and handles Supabase sign-in.

### Protected app routes

- `/` — Dashboard page
- `/branches` — Branch and room management
- `/tenants` — Tenant management
- `/accounts/*` — Accounts module (rent, expenses, cashbook)
- `/operations/*` — Operations module
- `/food/*` — Food / mess management
- `/inventory/*` — Inventory module
- `/staff/*` — Staff management
- `/leads/*` — Leads tracking and follow-up
- `/reports/*` — Reports and analytics
- `/documents/*` — Document management
- `/ceo/*` — CEO analytics dashboard
- `/admin/*` — Admin access control

### Fallback route

- `*` redirects to `/`

---

## 6. Core Modules Template

### 6.1 Dashboard

- Main landing page after login
- Loads and displays branch-level KPIs and summary stats
- Uses `src/modules/dashboard/services/dashboard.service.ts`

### 6.2 Branches

- Manage PG branches and rooms within a branch
- Add/edit branch details with forms for name, location, gender, type, address, pincode, and food availability
- Add/edit rooms with rent, capacity, bed assignment, and per-day rates
- Automatically create beds for new rooms
- Uses `src/modules/branches/pages/BranchesModulePage.tsx`

### 6.3 Tenants

- Manage tenant records and bed assignments
- Search and filter active tenants, all tenants, and KYC pending tenants
- Track advance payments, vacant beds, and KYC status
- Vacate tenants from rooms
- Uses `src/modules/tenants/pages/TenantsPage.tsx`

### 6.4 Accounts

- Manage rent collection, expenses, cashbook entries, and profit/loss insights
- Monthly rent view and payment recording
- Expense tracking by category and vendor
- Cashbook for cash-in / cash-out entries
- Uses `src/modules/accounts/pages/AccountsPage.tsx`

### 6.5 Operations

- Operational workflows for PG maintenance and requests
- Service tickets, assignments, and status tracking
- Uses `src/modules/operations/pages/OperationsPage.tsx`

### 6.6 Food

- Food / mess management module
- Meal tracking and food-related operations
- Uses `src/modules/food/pages/FoodPage.tsx`

### 6.7 Inventory

- Inventory management for PG supplies and stock
- Uses `src/modules/inventory/pages/InventoryPage.tsx`

### 6.8 Staff

- Staff user management and assignments
- Uses `src/modules/staff/pages/StaffPage.tsx`

### 6.9 Leads

- Lead capture and follow-up management
- Uses `src/modules/leads/pages/LeadsPage.tsx`

### 6.10 Reports

- Reporting dashboards and analytics summaries
- Uses `src/modules/reports/pages/ReportsPage.tsx`

### 6.11 Documents

- Document management and attachments
- Uses `src/modules/documents/pages/DocumentsPage.tsx`

### 6.12 CEO Dashboard

- Executive summary view with performance metrics
- Uses `src/modules/ceo/pages/CeoDashboardPage.tsx`

### 6.13 Admin Panel

- User and role permission management
- Create/edit roles with granular module permissions
- Manage user profiles, branch access, active/inactive status
- Uses `src/modules/admin/pages/AdminPage.tsx`

---

## 7. Shared UI Template

The app uses shared UI patterns and reusable components.

### Shared layout files

- `src/shared/layouts/AppLayout.tsx`
- `src/shared/layouts/AuthLayout.tsx`

### Shared components

- `src/shared/components/ProtectedRoute.tsx`
- `src/shared/components/ToastContainer.tsx`
- `src/shared/components/ErrorBoundary.tsx`

### Shared hooks

- `src/shared/hooks/useToast.ts`
- `src/shared/hooks/useAuth.ts`

### UI component folders

- `src/components/UIComponents/Modal/`
- `src/components/UIComponents/FormInputs/`
- `src/components/UIComponents/CustomDropdown/`
- `src/components/UIComponents/ToolTip/`
- `src/components/UIComponents/Avatar/`
- `src/components/UIComponents/Icons/`

---

## 8. Data, Services, and State Template

### API / backend integration

- `src/services/supabase.ts` — Supabase client initialization
- `src/services/apiClient.ts` — Axios client wrapper
- `src/sdk/pgmanagement.js` — API helper design notes and stub functions

### Service modules

- `src/services/branches.service.ts`
- `src/services/telemetry.ts`
- `src/modules/dashboard/services/dashboard.service.ts`
- `src/modules/admin/services/admin.service.ts`
- `src/modules/branches/services/rooms.service.ts`
- `src/modules/tenants/services/tenants.service.ts`
- `src/modules/accounts/services/accounts.service.ts`

### State stores

- `src/store/authStore.ts` — auth state, login/logout
- `src/store/branchStore.ts` — branch list and selected branch
- `src/store/uiStore.ts` — sidebar collapsed state and UI preferences

### Data flow template

- App initializes auth state in `App.tsx`
- If authenticated, branches load from `fetchBranches()`
- Branch selection is stored in `branchStore`
- Pages derive selected branch and fetch module-specific data
- Shared layout stays stable while page content swaps via `<Outlet />`

---

## 9. Styling Template

The app uses Sass and a shared token system.

- `src/styles/global.scss` — global theme and base styles
- `src/styles/_module.scss` — module-specific shared styles
- `src/styles/mixins.scss` — reusable Sass mixins
- `src/styles/tokens.scss` — spacing, colors, breakpoints, sidebar width

Each page imports its own SCSS file, e.g. `src/modules/admin/pages/AdminPage.scss`.

---

## 10. Feature Template

### Common page structure

1. Header with title and contextual actions
2. Stats row for summary metrics
3. Filters and search controls
4. Data table or card grid
5. Detail / modal forms for CRUD operations
6. Loading and empty states

### Recommended UI patterns

- Use a **single modal** pattern for add/edit operations
- Use **tab bars** when page has multiple views (e.g. Admin Users/Roles)
- Use **cards** for quick KPI metrics
- Use **tables** for lists of tenants, users, expenses, rent records
- Use **badge chips** for statuses and permissions

---

## 11. Template for Building a New Module

To add a new module page in this app:

1. Create a new page file under `src/modules/<module>/pages/<ModulePage>.tsx`
2. Add styles under `src/modules/<module>/pages/<ModulePage>.scss`
3. Add a service file under `src/modules/<module>/services/<module>.service.ts`
4. Add route entry in `src/router/AppRouter.tsx`
5. Add sidebar nav item in `src/shared/layouts/AppLayout.tsx`
6. Add any shared state to a new or existing store
7. Follow existing patterns for modals, table rows, and empty states

---

## 12. Known App Template Notes

- Auth is handled by Supabase and persisted in local storage. `App.tsx` validates sessions via `supabase.auth.getUser()`.
- Branch selection is global and used by many pages to scope data.
- The app layout is protected by `ProtectedRoute`, so all content pages require authentication.
- Admin permissions are managed at the UI-level in `src/modules/admin/pages/AdminPage.tsx`, but backend enforcement should be added.

---

## 13. Useful Reference Files

- `README.md` — onboarding and feature summary
- `docs/SYSTEM_ARCHITECTURE.md` — overall architecture reference
- `docs/ADMIN_DASHBOARD_TEMPLATE.md` — admin dashboard template
- `src/router/AppRouter.tsx` — route registry
- `src/shared/layouts/AppLayout.tsx` — main app shell
- `src/App.tsx` — auth and branch initialization

---

## 14. Deployment Template

Run these commands to start and build the web app:

```bash
npm install
npm run dev
npm run build
npm run preview
```

> Note: Vite is used as the dev server and build tool.
