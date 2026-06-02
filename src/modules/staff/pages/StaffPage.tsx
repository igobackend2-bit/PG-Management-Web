import React, { useCallback, useEffect, useState } from 'react';
import { useBranchStore } from '../../../store/branchStore';
import { useToast } from '../../../shared/hooks/useToast';
import {
  fetchStaff, createStaff, updateStaff, deleteStaff,
  fetchAttendanceForDate, upsertAttendance,
  type StaffRow, type AttendanceRow, type AttendanceStatus,
} from '../services/staff.service';
import { getErrorMessage } from '../../../shared/utils/error';
import './StaffPage.scss';

type Tab = 'staff' | 'attendance';

// value = canonical lowercase stored in DB (must match staff_role_check constraint);
// label = friendly display text.
const ROLES: { value: string; label: string }[] = [
  { value: 'warden',      label: 'Warden' },
  { value: 'cook',        label: 'Cook' },
  { value: 'cleaner',     label: 'Cleaner' },
  { value: 'security',    label: 'Security' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'manager',     label: 'Manager' },
  { value: 'other',       label: 'Other' },
];
const ROLE_LABEL: Record<string, string> = Object.fromEntries(ROLES.map((r) => [r.value, r.label]));
const roleLabel = (role: string) => ROLE_LABEL[role] ?? (role.charAt(0).toUpperCase() + role.slice(1));
const ATT_STATUSES: AttendanceStatus[] = ['present', 'absent', 'halfday', 'leave'];
const ATT_LABEL: Record<AttendanceStatus | 'none', string> = {
  present: 'Present', absent: 'Absent', halfday: 'Half Day', leave: 'On Leave', none: '— Not Marked —',
};

const todayStr = () => new Date().toISOString().slice(0, 10);
const CURRENCY = (n: number) => '₹' + n.toLocaleString('en-IN');

// ─── StaffModal ───────────────────────────────────────────────────────────────
interface ModalProps {
  branchId: string;
  staff: StaffRow | null;
  onSave: () => void;
  onClose: () => void;
}

function StaffModal({ branchId, staff, onSave, onClose }: ModalProps) {
  const isEdit = Boolean(staff);
  const [form, setForm] = useState({
    name:      staff?.name      ?? '',
    role:      staff?.role      ?? 'warden',
    phone:     staff?.phone     ?? '',
    salary:    String(staff?.salary ?? ''),
    joined_at: staff?.joined_at ?? todayStr(),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  function set(key: string, val: string) { setForm((p) => ({ ...p, [key]: val })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required.'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        branch_id: branchId,
        name:      form.name.trim(),
        role:      form.role,
        phone:     form.phone     || null,
        salary:    form.salary    ? Number(form.salary) : null,
        joined_at: form.joined_at || null,
      };
      if (isEdit && staff) await updateStaff(staff.id, payload);
      else await createStaff(payload);
      onSave();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to save.'));
    } finally { setSaving(false); }
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-panel">
        <div className="modal-header">
          <h3>{isEdit ? 'Edit Staff' : 'Add Staff Member'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid">
              <div className="form-group">
                <label>Full Name *</label>
                <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Name" required />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select value={form.role} onChange={(e) => set('role', e.target.value)}>
                  {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="Mobile number" />
              </div>
              <div className="form-group">
                <label>Monthly Salary (₹)</label>
                <input type="number" value={form.salary} onChange={(e) => set('salary', e.target.value)} placeholder="0" min="0" />
              </div>
              <div className="form-group full">
                <label>Joining Date</label>
                <input type="date" value={form.joined_at} onChange={(e) => set('joined_at', e.target.value)} />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <span className="modal-error">{error}</span>
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-save" disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Staff'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── StaffPage ────────────────────────────────────────────────────────────────
export function StaffPage() {
  const { selectedBranch } = useBranchStore();
  const toast = useToast();

  const [tab, setTab]           = useState<Tab>('staff');
  const [staff, setStaff]       = useState<StaffRow[]>([]);
  const [loading, setLoading]   = useState(false);

  // Attendance state
  const [attDate, setAttDate]   = useState(todayStr);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [attLoading, setAttLoading] = useState(false);
  const [savingAtt, setSavingAtt]   = useState<string>(''); // staff_id being saved

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editStaff, setEditStaff] = useState<StaffRow | null>(null);

  // ─── Loaders ───────────────────────────────────────────────────────────────
  const loadStaff = useCallback(async () => {
    if (!selectedBranch) return;
    setLoading(true);
    try { setStaff(await fetchStaff(selectedBranch.id)); }
    catch { toast.error('Failed to load staff.'); }
    finally { setLoading(false); }
  }, [selectedBranch]);

  const loadAttendance = useCallback(async () => {
    if (!selectedBranch) return;
    setAttLoading(true);
    try {
      const { attendance: att } = await fetchAttendanceForDate(selectedBranch.id, attDate);
      setAttendance(att);
    } catch { toast.error('Failed to load attendance.'); }
    finally { setAttLoading(false); }
  }, [selectedBranch, attDate]);

  useEffect(() => { loadStaff(); }, [loadStaff]);
  useEffect(() => { if (tab === 'attendance') loadAttendance(); }, [tab, loadAttendance]);

  // ─── Derived ───────────────────────────────────────────────────────────────
  const totalSalary = staff.reduce((s, m) => s + (m.salary ?? 0), 0);
  const attMap = Object.fromEntries(attendance.map((a) => [a.staff_id, a.status as AttendanceStatus]));
  const presentCount = attendance.filter((a) => a.status === 'present').length;
  const absentCount  = attendance.filter((a) => a.status === 'absent').length;

  // ─── Handlers ──────────────────────────────────────────────────────────────
  async function handleDeleteStaff(s: StaffRow) {
    if (!window.confirm(`Delete ${s.name}?`)) return;
    try { await deleteStaff(s.id); toast.success('Staff member deleted.'); loadStaff(); }
    catch { toast.error('Failed to delete.'); }
  }

  async function handleMarkAttendance(staffId: string, status: AttendanceStatus) {
    setSavingAtt(staffId);
    try {
      await upsertAttendance(staffId, attDate, status);
      setAttendance((prev) => {
        const existing = prev.find((a) => a.staff_id === staffId);
        if (existing) return prev.map((a) => a.staff_id === staffId ? { ...a, status } : a);
        return [...prev, { id: '', staff_id: staffId, date: attDate, status, shift_in: null, shift_out: null } as AttendanceRow];
      });
    } catch { toast.error('Failed to save attendance.'); }
    finally { setSavingAtt(''); }
  }

  if (!selectedBranch) return (
    <div className="staff-page"><div className="empty-state"><div className="empty-icon">🏢</div><div className="empty-title">No Branch Selected</div></div></div>
  );

  return (
    <div className="staff-page">
      <div className="page-header">
        <div className="header-left"><h2>Staff</h2><span className="branch-tag">{selectedBranch.name}</span></div>
        {tab === 'staff' && (
          <button className="btn-add" onClick={() => { setEditStaff(null); setShowModal(true); }}>+ Add Staff</button>
        )}
      </div>

      <div className="tab-bar">
        <button className={`tab-btn ${tab === 'staff' ? 'active' : ''}`} onClick={() => setTab('staff')}>👷 Staff ({staff.length})</button>
        <button className={`tab-btn ${tab === 'attendance' ? 'active' : ''}`} onClick={() => setTab('attendance')}>📋 Attendance</button>
      </div>

      {/* ── STAFF TAB ──────────────────────────────────────────────────────── */}
      {tab === 'staff' && (
        <>
          <div className="stats-row">
            <div className="stat-card blue"><div className="stat-value">{staff.length}</div><div className="stat-label">Total Staff</div></div>
            <div className="stat-card green"><div className="stat-value">{staff.filter((s) => s.role === 'warden').length}</div><div className="stat-label">Wardens</div></div>
            <div className="stat-card yellow"><div className="stat-value">{staff.filter((s) => s.role === 'cook').length}</div><div className="stat-label">Kitchen Staff</div></div>
            <div className="stat-card red"><div className="stat-value">{CURRENCY(totalSalary)}</div><div className="stat-label">Monthly Salary</div></div>
          </div>

          {loading ? (
            <div className="loading-wrap"><span className="loader" /></div>
          ) : staff.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👷</div>
              <div className="empty-title">No Staff Added</div>
              <p>Click "Add Staff" to register your first team member.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Name</th><th>Role</th><th>Phone</th><th>Monthly Salary</th><th>Joined</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {staff.map((s) => (
                    <tr key={s.id}>
                      <td className="bold">{s.name}</td>
                      <td><span className="badge none" style={{ background: '#e8f0fd', color: '#3171e0' }}>{roleLabel(s.role)}</span></td>
                      <td className="muted">{s.phone ?? '—'}</td>
                      <td>{s.salary ? CURRENCY(s.salary) : '—'}</td>
                      <td className="muted">{s.joined_at ?? '—'}</td>
                      <td>
                        <div className="actions-cell">
                          <button className="action-btn edit" onClick={() => { setEditStaff(s); setShowModal(true); }}>Edit</button>
                          <button className="action-btn delete" onClick={() => handleDeleteStaff(s)}>Delete</button>
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

      {/* ── ATTENDANCE TAB ─────────────────────────────────────────────────── */}
      {tab === 'attendance' && (
        <>
          <div className="controls-bar">
            <label>Date:</label>
            <input type="date" value={attDate} onChange={(e) => setAttDate(e.target.value)} />
            <div className="att-summary">
              <span className="badge present">Present: {presentCount}</span>
              <span className="badge absent">Absent: {absentCount}</span>
              <span className="badge none">Unmarked: {staff.length - attendance.length}</span>
            </div>
          </div>

          {attLoading ? (
            <div className="loading-wrap"><span className="loader" /></div>
          ) : staff.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <div className="empty-title">No Staff to Mark</div>
              <p>Add staff members first from the Staff tab.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Name</th><th>Role</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {staff.map((s) => {
                    const status = attMap[s.id] ?? null;
                    const isSaving = savingAtt === s.id;
                    return (
                      <tr key={s.id}>
                        <td className="bold">{s.name}</td>
                        <td className="muted">{roleLabel(s.role)}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {status && <span className={`badge ${status}`}>{ATT_LABEL[status]}</span>}
                            <select
                              value={status ?? ''}
                              onChange={(e) => {
                                const val = e.target.value as AttendanceStatus;
                                if (val) handleMarkAttendance(s.id, val);
                              }}
                              disabled={isSaving}
                              style={{ opacity: isSaving ? 0.5 : 1 }}
                            >
                              <option value="">— Mark Attendance —</option>
                              {ATT_STATUSES.map((st) => (
                                <option key={st} value={st}>{ATT_LABEL[st]}</option>
                              ))}
                            </select>
                            {isSaving && <span style={{ fontSize: '0.75rem', color: '#9e9e9e' }}>Saving…</span>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {showModal && (
        <StaffModal
          branchId={selectedBranch.id}
          staff={editStaff}
          onSave={() => { toast.success(editStaff ? 'Staff updated.' : 'Staff added!'); setShowModal(false); setEditStaff(null); loadStaff(); }}
          onClose={() => { setShowModal(false); setEditStaff(null); }}
        />
      )}
    </div>
  );
}
