import React, { useCallback, useEffect, useState } from 'react';
import { useBranchStore } from '../../../store/branchStore';
import { useToast } from '../../../shared/hooks/useToast';
import {
  fetchRoles, createRole, updateRole, deleteRole,
  fetchUserProfiles, createUserProfile, updateUserProfile,
  toggleUserActive, deleteUserProfile,
  DEFAULT_PERMISSIONS,
  type AppRole, type UserProfileWithRole, type PermissionSet,
} from '../services/admin.service';
import './AdminPage.scss';

type Tab = 'users' | 'roles';

const PERMISSION_LABELS: { key: keyof PermissionSet; label: string }[] = [
  { key: 'dashboard',  label: '▦ Dashboard'  },
  { key: 'branches',   label: '🏢 Branches'   },
  { key: 'tenants',    label: '👤 Tenants'    },
  { key: 'accounts',   label: '₹ Accounts'   },
  { key: 'operations', label: '🔧 Operations' },
  { key: 'food',       label: '🍽 Food'       },
  { key: 'inventory',  label: '📦 Inventory'  },
  { key: 'staff',      label: '👷 Staff'      },
  { key: 'reports',    label: '📊 Reports'    },
  { key: 'documents',  label: '📄 Documents'  },
  { key: 'leads',      label: '📣 Leads'      },
  { key: 'admin',      label: '⚙️ Admin Panel' },
];

// ─── AdminPage ────────────────────────────────────────────────────────────────
export function AdminPage() {
  const { branches } = useBranchStore();
  const toast = useToast();

  const [tab, setTab] = useState<Tab>('users');

  // ── Roles state ─────────────────────────────────────────────────────────────
  const [roles, setRoles]             = useState<AppRole[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole]   = useState<AppRole | null>(null);
  const [savingRole, setSavingRole]     = useState(false);
  const [roleError, setRoleError]       = useState('');
  const [roleForm, setRoleForm] = useState<{ name: string; permissions: PermissionSet }>({
    name: '',
    permissions: { ...DEFAULT_PERMISSIONS },
  });

  // ── Users state ─────────────────────────────────────────────────────────────
  const [users, setUsers]               = useState<UserProfileWithRole[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser]   = useState<UserProfileWithRole | null>(null);
  const [savingUser, setSavingUser]     = useState(false);
  const [userError, setUserError]       = useState('');
  const [userForm, setUserForm] = useState({
    email: '', full_name: '', role_id: '', branch_access: [] as string[],
  });

  // ── Loaders ──────────────────────────────────────────────────────────────────
  const loadRoles = useCallback(async () => {
    setLoadingRoles(true);
    try { setRoles(await fetchRoles()); }
    catch { toast.error('Failed to load roles.'); }
    finally { setLoadingRoles(false); }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try { setUsers(await fetchUserProfiles()); }
    catch { toast.error('Failed to load users.'); }
    finally { setLoadingUsers(false); }
  }, []);

  useEffect(() => { if (tab === 'roles') loadRoles(); }, [tab, loadRoles]);
  useEffect(() => { if (tab === 'users') { loadUsers(); loadRoles(); } }, [tab, loadUsers, loadRoles]);

  // ── Role CRUD ────────────────────────────────────────────────────────────────
  function openAddRole() {
    setEditingRole(null);
    setRoleForm({ name: '', permissions: { ...DEFAULT_PERMISSIONS } });
    setRoleError('');
    setShowRoleModal(true);
  }

  function openEditRole(role: AppRole) {
    setEditingRole(role);
    const perms = { ...DEFAULT_PERMISSIONS, ...(role.permissions as Partial<PermissionSet>) };
    setRoleForm({ name: role.name, permissions: perms });
    setRoleError('');
    setShowRoleModal(true);
  }

  async function handleSaveRole(e: React.FormEvent) {
    e.preventDefault();
    if (!roleForm.name.trim()) { setRoleError('Role name required.'); return; }
    setSavingRole(true); setRoleError('');
    try {
      if (editingRole) {
        await updateRole(editingRole.id, { name: roleForm.name.trim(), permissions: roleForm.permissions });
        toast.success('Role updated!');
      } else {
        await createRole(roleForm.name.trim(), roleForm.permissions);
        toast.success('Role created!');
      }
      setShowRoleModal(false);
      loadRoles();
    } catch (err: unknown) {
      setRoleError(err instanceof Error ? err.message : 'Failed to save.');
    } finally { setSavingRole(false); }
  }

  async function handleDeleteRole(role: AppRole) {
    if (!window.confirm(`Delete role "${role.name}"? Users assigned this role will lose it.`)) return;
    try { await deleteRole(role.id); toast.success('Role deleted.'); loadRoles(); }
    catch { toast.error('Failed to delete role.'); }
  }

  function togglePerm(key: keyof PermissionSet) {
    setRoleForm(prev => ({
      ...prev,
      permissions: { ...prev.permissions, [key]: !prev.permissions[key] },
    }));
  }

  // ── User CRUD ────────────────────────────────────────────────────────────────
  function openAddUser() {
    setEditingUser(null);
    setUserForm({ email: '', full_name: '', role_id: '', branch_access: [] });
    setUserError('');
    setShowUserModal(true);
  }

  function openEditUser(u: UserProfileWithRole) {
    setEditingUser(u);
    setUserForm({
      email:         u.email,
      full_name:     u.full_name ?? '',
      role_id:       u.role_id ?? '',
      branch_access: u.branch_access ?? [],
    });
    setUserError('');
    setShowUserModal(true);
  }

  async function handleSaveUser(e: React.FormEvent) {
    e.preventDefault();
    if (!userForm.email.trim()) { setUserError('Email required.'); return; }
    setSavingUser(true); setUserError('');
    try {
      if (editingUser) {
        await updateUserProfile(editingUser.id, {
          email:         userForm.email.trim(),
          full_name:     userForm.full_name.trim() || null,
          role_id:       userForm.role_id || null,
          branch_access: userForm.branch_access,
        });
        toast.success('User updated!');
      } else {
        await createUserProfile(
          userForm.email.trim(),
          userForm.full_name.trim(),
          userForm.role_id || null,
          userForm.branch_access
        );
        toast.success('User profile created!');
      }
      setShowUserModal(false);
      loadUsers();
    } catch (err: unknown) {
      setUserError(err instanceof Error ? err.message : 'Failed to save.');
    } finally { setSavingUser(false); }
  }

  async function handleToggleActive(u: UserProfileWithRole) {
    try {
      await toggleUserActive(u.id, !(u.is_active ?? true));
      toast.success(`User ${u.is_active ? 'deactivated' : 'activated'}.`);
      loadUsers();
    } catch { toast.error('Failed to update user status.'); }
  }

  async function handleDeleteUser(u: UserProfileWithRole) {
    if (!window.confirm(`Delete user "${u.email}"? This cannot be undone.`)) return;
    try { await deleteUserProfile(u.id); toast.success('User deleted.'); loadUsers(); }
    catch { toast.error('Failed to delete user.'); }
  }

  function toggleBranchAccess(branchId: string) {
    setUserForm(prev => ({
      ...prev,
      branch_access: prev.branch_access.includes(branchId)
        ? prev.branch_access.filter(id => id !== branchId)
        : [...prev.branch_access, branchId],
    }));
  }

  const activeUsers   = users.filter(u => u.is_active !== false);
  const inactiveUsers = users.filter(u => u.is_active === false);

  return (
    <div className="admin-page">
      <div className="page-header">
        <div className="header-left">
          <h2>Admin Panel</h2>
          <span className="branch-tag">Access Control</span>
        </div>
        {tab === 'roles' && <button className="btn-add" onClick={openAddRole}>+ New Role</button>}
        {tab === 'users' && <button className="btn-add" onClick={openAddUser}>+ Add User</button>}
      </div>

      <div className="tab-bar">
        <button className={`tab-btn ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>👥 Users ({users.length})</button>
        <button className={`tab-btn ${tab === 'roles' ? 'active' : ''}`} onClick={() => setTab('roles')}>🔑 Roles ({roles.length})</button>
      </div>

      {/* ── USERS TAB ─────────────────────────────────────────────────────────── */}
      {tab === 'users' && (
        <>
          <div className="stats-row">
            <div className="stat-card blue"><div className="stat-value">{users.length}</div><div className="stat-label">Total Users</div></div>
            <div className="stat-card green"><div className="stat-value">{activeUsers.length}</div><div className="stat-label">Active</div></div>
            <div className="stat-card red"><div className="stat-value">{inactiveUsers.length}</div><div className="stat-label">Deactivated</div></div>
            <div className="stat-card yellow"><div className="stat-value">{roles.length}</div><div className="stat-label">Roles Defined</div></div>
          </div>

          {loadingUsers ? (
            <div className="loading-wrap"><span className="loader" /></div>
          ) : users.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <div className="empty-title">No Users Added</div>
              <p>Click "+ Add User" to create user profiles with role-based access.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th><th>Email</th><th>Role</th><th>Branch Access</th><th>Status</th><th>Added</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className={u.is_active === false ? 'row-inactive' : ''}>
                      <td className="bold">{u.full_name ?? '—'}</td>
                      <td className="muted">{u.email}</td>
                      <td>
                        {u.app_roles
                          ? <span className="badge blue">{u.app_roles.name}</span>
                          : <span className="muted">No role</span>}
                      </td>
                      <td>
                        {(u.branch_access ?? []).length === 0
                          ? <span className="badge yellow">All Branches</span>
                          : (u.branch_access ?? []).map(bid => {
                              const b = branches.find(br => br.id === bid);
                              return b ? <span key={bid} className="badge grey">{b.name}</span> : null;
                            })}
                      </td>
                      <td>
                        {u.is_active !== false
                          ? <span className="badge green">Active</span>
                          : <span className="badge red">Inactive</span>}
                      </td>
                      <td className="muted">{u.invited_at ? new Date(u.invited_at).toLocaleDateString('en-IN') : '—'}</td>
                      <td>
                        <div className="actions-cell">
                          <button className="action-btn edit" onClick={() => openEditUser(u)}>Edit</button>
                          <button
                            className={`action-btn ${u.is_active !== false ? 'deactivate' : 'activate'}`}
                            onClick={() => handleToggleActive(u)}
                          >
                            {u.is_active !== false ? 'Deactivate' : 'Activate'}
                          </button>
                          <button className="action-btn delete" onClick={() => handleDeleteUser(u)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── ROLES TAB ─────────────────────────────────────────────────────────── */}
      {tab === 'roles' && (
        <>
          {loadingRoles ? (
            <div className="loading-wrap"><span className="loader" /></div>
          ) : roles.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔑</div>
              <div className="empty-title">No Roles Defined</div>
              <p>Create roles with specific permissions to assign to your staff users.</p>
            </div>
          ) : (
            <div className="roles-grid">
              {roles.map((role) => {
                const perms = { ...DEFAULT_PERMISSIONS, ...(role.permissions as Partial<PermissionSet>) };
                const enabledCount = Object.values(perms).filter(Boolean).length;
                return (
                  <div key={role.id} className="role-card">
                    <div className="role-card-header">
                      <div className="role-name">{role.name}</div>
                      <div className="role-perm-count">{enabledCount}/{PERMISSION_LABELS.length} modules</div>
                    </div>
                    <div className="role-perms">
                      {PERMISSION_LABELS.map(({ key, label }) => (
                        <span key={key} className={`perm-chip ${perms[key] ? 'on' : 'off'}`}>
                          {perms[key] ? '✓' : '✗'} {label}
                        </span>
                      ))}
                    </div>
                    <div className="role-actions">
                      <button className="action-btn edit"   onClick={() => openEditRole(role)}>Edit</button>
                      <button className="action-btn delete" onClick={() => handleDeleteRole(role)}>Delete</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── ROLE MODAL ────────────────────────────────────────────────────────── */}
      {showRoleModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowRoleModal(false); }}>
          <div className="modal-panel modal-wide">
            <div className="modal-header">
              <h3>{editingRole ? 'Edit Role' : 'Create New Role'}</h3>
              <button className="modal-close" onClick={() => setShowRoleModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveRole}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Role Name *</label>
                  <input
                    value={roleForm.name}
                    onChange={(e) => setRoleForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Manager, Warden, Accountant…"
                    required
                  />
                </div>
                <div className="perm-section">
                  <label className="perm-section-label">Module Access Permissions</label>
                  <div className="perm-grid">
                    {PERMISSION_LABELS.map(({ key, label }) => (
                      <label key={key} className={`perm-toggle ${roleForm.permissions[key] ? 'checked' : ''}`}>
                        <input
                          type="checkbox"
                          checked={roleForm.permissions[key]}
                          onChange={() => togglePerm(key)}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <span className="modal-error">{roleError}</span>
                <button type="button" className="btn-cancel" onClick={() => setShowRoleModal(false)}>Cancel</button>
                <button type="submit" className="btn-save" disabled={savingRole}>
                  {savingRole ? 'Saving…' : editingRole ? 'Update Role' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── USER MODAL ────────────────────────────────────────────────────────── */}
      {showUserModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowUserModal(false); }}>
          <div className="modal-panel">
            <div className="modal-header">
              <h3>{editingUser ? 'Edit User' : 'Add User Profile'}</h3>
              <button className="modal-close" onClick={() => setShowUserModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveUser}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Full Name</label>
                    <input
                      value={userForm.full_name}
                      onChange={(e) => setUserForm(p => ({ ...p, full_name: e.target.value }))}
                      placeholder="Full name"
                    />
                  </div>
                  <div className="form-group">
                    <label>Email Address *</label>
                    <input
                      type="email"
                      value={userForm.email}
                      onChange={(e) => setUserForm(p => ({ ...p, email: e.target.value }))}
                      placeholder="user@example.com"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Assign Role</label>
                    <select
                      value={userForm.role_id}
                      onChange={(e) => setUserForm(p => ({ ...p, role_id: e.target.value }))}
                    >
                      <option value="">— No Role (full access) —</option>
                      {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group full">
                    <label>Branch Access</label>
                    <span className="field-hint">Leave all unchecked = access to all branches</span>
                    <div className="branch-access-grid">
                      {branches.map(b => (
                        <label key={b.id} className={`branch-access-toggle ${userForm.branch_access.includes(b.id) ? 'checked' : ''}`}>
                          <input
                            type="checkbox"
                            checked={userForm.branch_access.includes(b.id)}
                            onChange={() => toggleBranchAccess(b.id)}
                          />
                          {b.name}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <span className="modal-error">{userError}</span>
                <button type="button" className="btn-cancel" onClick={() => setShowUserModal(false)}>Cancel</button>
                <button type="submit" className="btn-save" disabled={savingUser}>
                  {savingUser ? 'Saving…' : editingUser ? 'Update User' : 'Add User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
