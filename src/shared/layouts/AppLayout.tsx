import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/authStore';
import { useBranchStore } from '../../store/branchStore';
import { useUiStore } from '../../store/uiStore';
import { ToastContainer } from '../components/ToastContainer';
import './AppLayout.scss';

// ─── Sidebar nav items ────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { to: '/',             label: 'Dashboard',   icon: '▦',  end: true },
  { to: '/branches',     label: 'Branches',    icon: '🏢' },
  { to: '/tenants',      label: 'Tenants',     icon: '👤' },
  { to: '/accounts',     label: 'Accounts',    icon: '₹'  },
  { to: '/operations',   label: 'Operations',  icon: '🔧' },
  { to: '/food',         label: 'Food',        icon: '🍽' },
  { to: '/inventory',    label: 'Inventory',   icon: '📦' },
  { to: '/staff',        label: 'Staff',       icon: '👷' },
  { to: '/leads',        label: 'Leads',       icon: '📣' },
  { to: '/reports',      label: 'Reports',     icon: '📊' },
  { to: '/documents',    label: 'Documents',   icon: '📄' },
];

export function AppLayout() {
  const { user } = useAuthStore();
  const { branches, selectedBranch, setSelectedBranch } = useBranchStore();
  const { sidebarCollapsed, toggleSidebar } = useUiStore();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    useAuthStore.getState().clearUser();
    navigate('/login');
  };

  return (
    <div className={`app-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>

      {/* ── Top Header ──────────────────────────────────────────────────── */}
      <header className="app-header">
        <div className="header-left">
          <button className="sidebar-toggle" onClick={toggleSidebar} title="Toggle sidebar">
            <span />
            <span />
            <span />
          </button>
          <span className="app-logo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="3" width="20" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
              <path d="M8 3v18M16 3v18M2 9h20M2 15h20" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </span>
          <span className="app-title">IGO PG</span>
        </div>

        <div className="header-center">
          {branches.length > 0 && (
            <div className="branch-selector">
              <select
                value={selectedBranch?.id ?? ''}
                onChange={(e) => {
                  const b = branches.find((br) => br.id === e.target.value);
                  if (b) setSelectedBranch(b);
                }}
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="header-right">
          <div className="profile-menu" onClick={() => setProfileMenuOpen(!profileMenuOpen)}>
            <div className="avatar">{(user?.name?.[0] ?? 'U').toUpperCase()}</div>
            {profileMenuOpen && (
              <div className="profile-dropdown">
                <div className="profile-info">
                  <strong>{user?.name}</strong>
                  <span>{user?.email}</span>
                  <span className="role-badge">{user?.role}</span>
                </div>
                <hr />
                <button onClick={() => navigate('/settings')}>Settings</button>
                <button onClick={handleSignOut} className="sign-out">Sign out</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Body (sidebar + content) ─────────────────────────────────────── */}
      <div className="app-body">
        <nav className="app-sidebar">
          <ul className="nav-list">
            {NAV_ITEMS.map(({ to, label, icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  title={sidebarCollapsed ? label : undefined}
                >
                  <span className="nav-icon">{icon}</span>
                  <span className="nav-label">{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <main className="app-content">
          <Outlet />
        </main>
      </div>

      <ToastContainer />
    </div>
  );
}
