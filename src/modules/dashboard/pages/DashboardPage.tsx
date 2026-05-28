import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBranchStore } from '../../../store/branchStore';
import { useToast } from '../../../shared/hooks/useToast';
import { fetchDashboardStats, type DashboardStats } from '../services/dashboard.service';
import './DashboardPage.scss';

const CURRENCY = (n: number) => '₹' + n.toLocaleString('en-IN');

const NAV_MODULES = [
  { label: 'Tenants',    icon: '👤', path: '/tenants',    desc: 'Residents, KYC & history' },
  { label: 'Accounts',   icon: '₹',  path: '/accounts',   desc: 'Rent, P&L, Cashbook' },
  { label: 'Operations', icon: '🔧', path: '/operations', desc: 'Tickets & maintenance' },
  { label: 'Food',       icon: '🍽', path: '/food',       desc: 'Meals & kitchen cost' },
  { label: 'Inventory',  icon: '📦', path: '/inventory',  desc: 'Assets & stock' },
  { label: 'Staff',      icon: '👷', path: '/staff',      desc: 'Attendance & salary' },
  { label: 'Reports',    icon: '📊', path: '/reports',    desc: 'Analytics & P&L' },
  { label: 'Documents',  icon: '📄', path: '/documents',  desc: 'KYC & agreements' },
];

export function DashboardPage() {
  const { selectedBranch } = useBranchStore();
  const navigate = useNavigate();
  const toast = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!selectedBranch) return;
    setLoading(true);
    try { setStats(await fetchDashboardStats(selectedBranch.id)); }
    catch (err) {
      console.error('[Dashboard]', err);
      toast.error('Failed to load dashboard data. Please refresh.');
    }
    finally { setLoading(false); }
  }, [selectedBranch]);

  useEffect(() => { load(); }, [load]);

  const monthLabel = new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div className="header-left">
          <h2>Dashboard</h2>
          {selectedBranch && <span className="branch-tag">{selectedBranch.name}</span>}
        </div>
        <span className="month-label">{monthLabel}</span>
      </div>

      {!selectedBranch ? (
        <div className="no-branch-msg">
          <div className="nb-icon">🏢</div>
          <p>Select a branch from the top bar to see live data.</p>
        </div>
      ) : loading ? (
        <div className="loading-wrap"><span className="loader" /></div>
      ) : stats ? (
        <>
          <div className="kpi-grid">
            <div className="kpi-card kpi-blue">
              <span className="kpi-value">{stats.occupancyPct}%</span>
              <span className="kpi-label">Occupancy</span>
              <span className="kpi-sub">{stats.occupiedBeds} / {stats.totalBeds} beds filled</span>
            </div>
            <div className="kpi-card kpi-green">
              <span className="kpi-value">{CURRENCY(stats.rentCollectedThisMonth)}</span>
              <span className="kpi-label">Rent Collected</span>
              <span className="kpi-sub">of {CURRENCY(stats.rentDueThisMonth)} billed</span>
            </div>
            <div className="kpi-card kpi-red">
              <span className="kpi-value">{CURRENCY(Math.max(0, stats.rentDueThisMonth - stats.rentCollectedThisMonth))}</span>
              <span className="kpi-label">Pending Dues</span>
              <span className="kpi-sub">This month</span>
            </div>
            <div className="kpi-card kpi-yellow">
              <span className="kpi-value">{stats.openTickets}</span>
              <span className="kpi-label">Open Tickets</span>
              <span className="kpi-sub">Maintenance issues</span>
            </div>
            <div className="kpi-card kpi-blue">
              <span className="kpi-value">{stats.activeTenants}</span>
              <span className="kpi-label">Active Tenants</span>
              <span className="kpi-sub">{stats.totalStaff} staff members</span>
            </div>
            <div className="kpi-card kpi-purple">
              <span className="kpi-value">{CURRENCY(stats.rentCollectedThisMonth - stats.expensesThisMonth - stats.foodCostThisMonth)}</span>
              <span className="kpi-label">Net P&L</span>
              <span className="kpi-sub">Exp: {CURRENCY(stats.expensesThisMonth + stats.foodCostThisMonth)}</span>
            </div>
          </div>

          <h3 className="section-title">Quick Access</h3>
          <div className="module-grid">
            {NAV_MODULES.map(({ label, icon, path, desc }) => (
              <div key={label} className="module-card" onClick={() => navigate(path)}>
                <span className="module-icon">{icon}</span>
                <span className="module-name">{label}</span>
                <span className="module-desc">{desc}</span>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
