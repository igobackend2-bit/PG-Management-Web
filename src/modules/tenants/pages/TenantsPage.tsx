import React, { useCallback, useEffect, useState } from 'react';
import { useBranchStore } from '../../../store/branchStore';
import { useToast } from '../../../shared/hooks/useToast';
import { KycBadge } from '../components/KycBadge';
import { TenantModal } from '../components/TenantModal';
import {
  fetchActiveTenants,
  fetchAllTenants,
  fetchRoomsWithBeds,
  vacateTenant,
  type TenantWithRoom,
  type TenantRow,
  type RoomWithBeds,
} from '../services/tenants.service';
import './TenantsPage.scss';

type FilterTab = 'active' | 'all' | 'kyc_pending';

const CURRENCY = (n: number) =>
  '₹' + n.toLocaleString('en-IN');

export function TenantsPage() {
  const { selectedBranch } = useBranchStore();
  const toast = useToast();

  const [tenants, setTenants] = useState<TenantWithRoom[]>([]);
  const [rooms, setRooms] = useState<RoomWithBeds[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<FilterTab>('active');

  const [showModal, setShowModal] = useState(false);
  const [editTenant, setEditTenant] = useState<TenantRow | null>(null);

  // ─── Load data ─────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!selectedBranch) return;
    setLoading(true);
    try {
      const [t, r] = await Promise.all([
        fetchAllTenants(selectedBranch.id),
        fetchRoomsWithBeds(selectedBranch.id),
      ]);
      setTenants(t);
      setRooms(r);
    } catch (err) {
      toast.error('Failed to load tenants.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedBranch]);

  useEffect(() => { load(); }, [load]);

  // ─── Derived data ──────────────────────────────────────────────────────────
  const active    = tenants.filter((t) => !t.dov);
  const kycPending = active.filter((t) => t.kyc_status !== 'complete');
  const totalAdvance = active.reduce((sum, t) => sum + (t.advance ?? 0), 0);
  const vacantBeds   = rooms.flatMap((r) => r.beds).filter((b) => !b.is_occupied).length;

  // Tab filter
  let baseList: TenantWithRoom[];
  if (filterTab === 'active')       baseList = active;
  else if (filterTab === 'kyc_pending') baseList = kycPending;
  else                              baseList = tenants;

  // Search filter
  const visible = search.trim()
    ? baseList.filter(
        (t) =>
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          (t.phone ?? '').includes(search)
      )
    : baseList;

  // ─── Vacate handler ────────────────────────────────────────────────────────
  async function handleVacate(t: TenantWithRoom) {
    if (!window.confirm(`Vacate ${t.name}? This sets their Date of Vacating to today.`)) return;
    try {
      const dov = new Date().toISOString().slice(0, 10);
      await vacateTenant(t.id, dov);
      toast.success(`${t.name} vacated successfully.`);
      load();
    } catch {
      toast.error('Failed to vacate tenant.');
    }
  }

  // ─── Modal save ────────────────────────────────────────────────────────────
  function handleSave(saved: TenantRow) {
    toast.success(editTenant ? 'Tenant updated.' : 'Tenant added successfully!');
    setShowModal(false);
    setEditTenant(null);
    load();
  }

  function openEdit(t: TenantRow) {
    setEditTenant(t);
    setShowModal(true);
  }

  function openAdd() {
    setEditTenant(null);
    setShowModal(true);
  }

  // ─── No branch guard ───────────────────────────────────────────────────────
  if (!selectedBranch) {
    return (
      <div className="tenants-page">
        <div className="empty-state">
          <div className="empty-icon">🏢</div>
          <div className="empty-title">No Branch Selected</div>
          <p>Go to Branches to create or select a branch first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tenants-page">

      {/* Header */}
      <div className="page-header">
        <div className="header-left">
          <h2>Tenants</h2>
          <span className="branch-tag">{selectedBranch.name}</span>
        </div>
        <button className="btn-add" onClick={openAdd}>
          <span>+</span> Add Tenant
        </button>
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card blue">
          <div className="stat-value">{active.length}</div>
          <div className="stat-label">Active Tenants</div>
        </div>
        <div className="stat-card green">
          <div className="stat-value">{vacantBeds}</div>
          <div className="stat-label">Vacant Beds</div>
        </div>
        <div className="stat-card yellow">
          <div className="stat-value">{kycPending.length}</div>
          <div className="stat-label">KYC Pending</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-value">{CURRENCY(totalAdvance)}</div>
          <div className="stat-label">Advance Collected</div>
        </div>
      </div>

      {/* Controls */}
      <div className="controls-bar">
        <div className="search-input-wrap">
          <span className="search-icon">🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or phone…"
          />
        </div>
        <div className="filter-row">
          <select
            value={filterTab}
            onChange={(e) => setFilterTab(e.target.value as FilterTab)}
          >
            <option value="active">Active Tenants</option>
            <option value="all">All Tenants</option>
            <option value="kyc_pending">KYC Pending</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="loading-wrap">
          <span className="loader" />
        </div>
      ) : visible.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👤</div>
          <div className="empty-title">No Tenants Found</div>
          <p>
            {search
              ? 'No tenants match your search.'
              : filterTab === 'active'
              ? 'No active tenants. Click "Add Tenant" to get started.'
              : 'No tenants in this view.'}
          </p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Room</th>
                <th>Bed</th>
                <th>DOJ</th>
                <th>Advance</th>
                <th>KYC</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((t) => (
                <tr key={t.id}>
                  <td className="tenant-name">{t.name}</td>
                  <td className="muted">{t.phone ?? '—'}</td>
                  <td>{t.rooms?.number ? `Room ${t.rooms.number}` : '—'}</td>
                  <td className="muted">{t.beds?.label ?? '—'}</td>
                  <td className="muted">{t.doj ?? '—'}</td>
                  <td>{t.advance ? CURRENCY(t.advance) : '—'}</td>
                  <td><KycBadge status={t.kyc_status} /></td>
                  <td>
                    {t.dov ? (
                      <span style={{ fontSize: '0.75rem', color: '#9e9e9e' }}>
                        Vacated {t.dov}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#2e9e4f', fontWeight: 600 }}>
                        Active
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="actions-cell">
                      <button className="action-btn edit" onClick={() => openEdit(t)}>
                        Edit
                      </button>
                      {!t.dov && (
                        <button className="action-btn vacate" onClick={() => handleVacate(t)}>
                          Vacate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <TenantModal
          branchId={selectedBranch.id}
          tenant={editTenant}
          rooms={rooms}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditTenant(null); }}
        />
      )}
    </div>
  );
}
