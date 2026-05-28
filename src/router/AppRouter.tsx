import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '../shared/layouts/AppLayout';
import { AuthLayout } from '../shared/layouts/AuthLayout';
import { ProtectedRoute } from '../shared/components/ProtectedRoute';

// Auth
import { LoginPage } from '../modules/auth/pages/LoginPage';

// App modules
import { DashboardPage } from '../modules/dashboard/pages/DashboardPage';
import { BranchesModulePage } from '../modules/branches/pages/BranchesModulePage';
import { TenantsPage } from '../modules/tenants/pages/TenantsPage';
import { AccountsPage } from '../modules/accounts/pages/AccountsPage';
import { OperationsPage } from '../modules/operations/pages/OperationsPage';
import { FoodPage } from '../modules/food/pages/FoodPage';
import { InventoryPage } from '../modules/inventory/pages/InventoryPage';
import { StaffPage } from '../modules/staff/pages/StaffPage';
import { LeadsPage } from '../modules/leads/pages/LeadsPage';
import { ReportsPage } from '../modules/reports/pages/ReportsPage';
import { DocumentsPage } from '../modules/documents/pages/DocumentsPage';
import { CeoDashboardPage } from '../modules/ceo/pages/CeoDashboardPage';
import { AdminPage } from '../modules/admin/pages/AdminPage';

// Legacy routes (kept for backward compat during migration)

export function AppRouter() {
  return (
    <Routes>
      {/* ── Auth (no sidebar) ──────────────────────────────────────────── */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* ── Protected app (with sidebar) ──────────────────────────────── */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="branches" element={<BranchesModulePage />} />
        <Route path="tenants" element={<TenantsPage />} />
        <Route path="accounts/*" element={<AccountsPage />} />
        <Route path="operations/*" element={<OperationsPage />} />
        <Route path="food/*" element={<FoodPage />} />
        <Route path="inventory/*" element={<InventoryPage />} />
        <Route path="staff/*" element={<StaffPage />} />
        <Route path="leads/*" element={<LeadsPage />} />
        <Route path="reports/*" element={<ReportsPage />} />
        <Route path="documents/*" element={<DocumentsPage />} />
        <Route path="ceo/*" element={<CeoDashboardPage />} />
        <Route path="admin/*" element={<AdminPage />} />

        {/* Legacy rooms route — kept during migration */}
      </Route>

      {/* ── Fallback ───────────────────────────────────────────────────── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
