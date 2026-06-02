# Admin Dashboard Template

This template describes the web app admin dashboard and sidebar structure used in the PG Management Web application. It is designed to serve as a base for documenting or designing the admin experience, including module navigation, permission assignment, and the user/role management flow.

---

## 1. Overview

The admin dashboard is part of a React single-page application with a shared layout. The main dashboard includes:

- A top header with app branding, branch selector, and profile menu.
- A collapsible sidebar navigation for primary app modules.
- A content area for the current route.
- A reusable admin panel for users, roles, and permission management.

This template reflects the current implementation in `src/shared/layouts/AppLayout.tsx` and `src/modules/admin/pages/AdminPage.tsx`.

---

## 2. Sidebar Navigation

The sidebar is rendered inside `AppLayout` and includes the following items:

- Dashboard
- CEO Dashboard
- Branches
- Tenants
- Accounts
- Operations
- Food
- Inventory
- Staff
- Reports
- Documents
- Admin

Each item includes a label and an icon. The sidebar supports collapse/expand behavior through UI store state.

### Sidebar items

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

> The sidebar also supports a collapsed state where only icons are visible.

---

## 3. App Layout

The layout is composed of three major areas:

1. **Header**
   - Sidebar toggle button
   - App logo and title
   - Branch selector dropdown
   - Profile menu with user name, email, role, settings, and sign-out

2. **Sidebar**
   - Navigation list
   - Active route highlighting using `NavLink`
   - Collapse behavior controlled by `sidebarCollapsed`

3. **Content area**
   - Renders route children via `Outlet`
   - Contains main pages such as Dashboard, Branches, Tenants, etc.

---

## 4. Admin Panel Template

The admin module provides access control via:

- **Users tab**: create, edit, activate/deactivate, delete users
- **Roles tab**: define roles and assign module permissions

### 4.1 Admin view sections

- Page header: title + action button
- Tab bar: Users / Roles
- Stats row for quick totals
- Table for user list
- Cards grid for role summaries
- Modals for creating/editing users and roles

### 4.2 User management fields

| Field | Description |
|---|---|
| Full Name | Optional display name for the user |
| Email Address | Required login identifier |
| Assign Role | Role selection for permission inheritance |
| Branch Access | Branch-specific access toggles |

When branch access is empty, the user has access to all branches.

### 4.3 Role management fields

| Field | Description |
|---|---|
| Role Name | Role display name, e.g. Manager, Accountant |
| Module Permissions | Toggles for each app module |

### 4.4 Permission options

The admin role editor currently allows toggling access to the following modules:

- Dashboard
- Branches
- Tenants
- Accounts
- Operations
- Food
- Inventory
- Staff
- Reports
- Documents
- Leads
- Admin Panel

---

## 5. Recommended Admin Dashboard Template

Use this structure when designing or documenting a new admin dashboard page.

### 5.1 Page layout

- `Header`
  - App logo
  - Breadcrumb or page title
  - Branch selector / environment selector
  - Profile menu

- `Sidebar`
  - Primary modules
  - Active item highlight
  - Collapsible UI state

- `Main content`
  - Page-specific header
  - Action toolbar
  - Tabs (Users / Roles)
  - Table / cards / form content

### 5.2 Users tab

- Display user counts and active/inactive breakdown
- Show a table with columns:
  - Name
  - Email
  - Role
  - Branch Access
  - Status
  - Added
  - Actions
- Actions: Edit, Activate / Deactivate, Delete

### 5.3 Roles tab

- Show existing roles in cards or list
- Display permissions count for each role
- Actions: Edit, Delete
- Allow creating a new role with permission toggles

### 5.4 Role modal

- `Role Name` input
- `Module Access Permissions` checklist
- Save / Cancel buttons

### 5.5 User modal

- `Full Name` input
- `Email Address` input
- `Assign Role` dropdown
- `Branch Access` checkbox grid
- Save / Cancel buttons

---

## 6. Implementation Notes

- The admin panel is currently implemented in `src/modules/admin/pages/AdminPage.tsx`
- Role and user operations are provided via `src/modules/admin/services/admin.service.ts`
- The sidebar and top-level routes are managed in `src/shared/layouts/AppLayout.tsx` and `src/router/AppRouter.tsx`
- Sidebar collapse state is stored in `src/store/uiStore.ts`

---

## 7. How to extend this template

To adapt this template for more admin workflows:

- Add pages to sidebar navigation in `AppLayout.tsx`
- Add route components in `AppRouter.tsx`
- Add new permission toggles in `PERMISSION_LABELS` and `DEFAULT_PERMISSIONS`
- Add branch-aware access rules in the backend or service layer
- Add finer-grained feature permissions per module (e.g. create, edit, delete)

---

## 8. Suggested file for future reference

- `docs/ADMIN_DASHBOARD_TEMPLATE.md` — this document
- `docs/SYSTEM_ARCHITECTURE.md` — overall architecture reference
- `README.md` — project onboarding and feature summary
