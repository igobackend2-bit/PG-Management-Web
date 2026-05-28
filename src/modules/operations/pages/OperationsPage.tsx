import React, { useCallback, useEffect, useState } from 'react';
import { useBranchStore } from '../../../store/branchStore';
import { useToast } from '../../../shared/hooks/useToast';

// ── Services ──────────────────────────────────────────────────────────────────
import {
  fetchTickets, createTicket, updateTicket, resolveTicket, deleteTicket,
  fetchStaffOptions, fetchRoomOptions,
  type TicketWithDetails, type StaffOption, type RoomOption,
} from '../services/operations.service';
import {
  fetchShiftChecklist, upsertShiftChecklist, lockShift,
  MORNING_ITEMS, NIGHT_ITEMS, type ShiftType,
} from '../services/shift.service';
import {
  fetchAttendanceForDate, markAttendance,
  type AttendanceWithStaff,
} from '../services/attendance.service';
import {
  fetchVisitors, createVisitor, markVisitorExit, deleteVisitor,
  type VisitorWithRoom,
} from '../services/visitors.service';
import {
  fetchRoomsWithReadings, saveReading,
  type RoomWithReading,
} from '../services/utilities.service';

import './OperationsPage.scss';

// ── Constants ─────────────────────────────────────────────────────────────────
type MainTab     = 'opening' | 'tickets' | 'attendance' | 'utilities' | 'closing';
type AttSubTab   = 'staff' | 'visitors';
type StatusFilter = 'all' | 'open' | 'in_progress' | 'resolved' | 'closed';

const todayStr = () => new Date().toISOString().slice(0, 10);

const CATEGORIES   = ['Plumbing', 'Electrical', 'Cleaning', 'WiFi', 'Food', 'Pest Control', 'Furniture', 'Other'];
const STATUSES: StatusFilter[] = ['all', 'open', 'in_progress', 'resolved', 'closed'];
const STATUS_LABEL: Record<string, string> = {
  all: 'All', open: 'Open', in_progress: 'In Progress', resolved: 'Resolved', closed: 'Closed',
};

const ATT_STATUSES = [
  { key: 'present',  label: 'Present',  cls: 'att-present'  },
  { key: 'absent',   label: 'Absent',   cls: 'att-absent'   },
  { key: 'leave',    label: 'Leave',    cls: 'att-leave'    },
  { key: 'halfday',  label: 'Half Day', cls: 'att-halfday'  },
];

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

// ─── TicketModal ──────────────────────────────────────────────────────────────
function TicketModal({ branchId, ticket, staffOptions, roomOptions, onSave, onClose }: {
  branchId: string; ticket: TicketWithDetails | null;
  staffOptions: StaffOption[]; roomOptions: RoomOption[];
  onSave: () => void; onClose: () => void;
}) {
  const isEdit = Boolean(ticket);
  const [form, setForm] = useState({
    category:    ticket?.category    ?? 'Plumbing',
    description: ticket?.description ?? '',
    room_id:     ticket?.room_id     ?? '',
    assigned_to: ticket?.assigned_to ?? '',
    cost:        String(ticket?.cost ?? ''),
    status:      ticket?.status      ?? 'open',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.description.trim()) { setError('Description is required.'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        branch_id:   branchId,
        category:    form.category,
        description: form.description.trim(),
        room_id:     form.room_id     || null,
        assigned_to: form.assigned_to || null,
        cost:        form.cost ? Number(form.cost) : null,
        status:      form.status,
      };
      if (isEdit && ticket) await updateTicket(ticket.id, payload);
      else await createTicket(payload);
      onSave();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to save.'); }
    finally { setSaving(false); }
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-panel">
        <div className="modal-header">
          <h3>{isEdit ? 'Edit Ticket' : 'Create Ticket'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid">
              <div className="form-group">
                <label>Category</label>
                <select value={form.category} onChange={(e) => set('category', e.target.value)}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={form.status} onChange={(e) => set('status', e.target.value)}>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div className="form-group">
                <label>Room</label>
                <select value={form.room_id} onChange={(e) => set('room_id', e.target.value)}>
                  <option value="">— No specific room —</option>
                  {roomOptions.map((r) => <option key={r.id} value={r.id}>Room {r.number}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Assign To</label>
                <select value={form.assigned_to} onChange={(e) => set('assigned_to', e.target.value)}>
                  <option value="">— Unassigned —</option>
                  {staffOptions.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Estimated Cost (₹)</label>
                <input type="number" value={form.cost} onChange={(e) => set('cost', e.target.value)} placeholder="0" min="0" />
              </div>
              <div className="form-group full">
                <label>Description *</label>
                <textarea value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Describe the issue…" required />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <span className="modal-error">{error}</span>
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-save" disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Ticket'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── VisitorModal ─────────────────────────────────────────────────────────────
function VisitorModal({ branchId, roomOptions, onSave, onClose }: {
  branchId: string; roomOptions: RoomOption[]; onSave: () => void; onClose: () => void;
}) {
  const [form, setForm] = useState({ visitor_name: '', phone: '', purpose: '', room_id: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.visitor_name.trim()) { setError('Visitor name is required.'); return; }
    setSaving(true); setError('');
    try {
      await createVisitor({
        branch_id:    branchId,
        visitor_name: form.visitor_name.trim(),
        phone:        form.phone || null,
        purpose:      form.purpose || null,
        room_id:      form.room_id || null,
        entry_time:   new Date().toISOString(),
      });
      onSave();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to save.'); }
    finally { setSaving(false); }
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-panel">
        <div className="modal-header">
          <h3>Add Visitor</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid">
              <div className="form-group">
                <label>Visitor Name *</label>
                <input value={form.visitor_name} onChange={(e) => set('visitor_name', e.target.value)} placeholder="Full name" required />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="Mobile number" />
              </div>
              <div className="form-group">
                <label>Purpose</label>
                <input value={form.purpose} onChange={(e) => set('purpose', e.target.value)} placeholder="Visiting reason" />
              </div>
              <div className="form-group">
                <label>Visiting Room</label>
                <select value={form.room_id} onChange={(e) => set('room_id', e.target.value)}>
                  <option value="">— Select room —</option>
                  {roomOptions.map((r) => <option key={r.id} value={r.id}>Room {r.number}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <span className="modal-error">{error}</span>
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-save" disabled={saving}>{saving ? 'Saving…' : 'Add Visitor'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── OperationsPage ───────────────────────────────────────────────────────────
export function OperationsPage() {
  const { selectedBranch } = useBranchStore();
  const toast = useToast();

  const [tab, setTab] = useState<MainTab>('opening');

  // ── SHIFT STATE ──────────────────────────────────────────────────────────────
  const [shiftDate,   setShiftDate]   = useState(todayStr());
  const [openChecks,  setOpenChecks]  = useState<Record<string, boolean>>({});
  const [closeChecks, setCloseChecks] = useState<Record<string, boolean>>({});
  const [openLocked,  setOpenLocked]  = useState(false);
  const [closeLocked, setCloseLocked] = useState(false);
  const [openLockedAt,  setOpenLockedAt]  = useState<string | null>(null);
  const [closeLockedAt, setCloseLockedAt] = useState<string | null>(null);
  const [savingShift, setSavingShift] = useState(false);

  // ── TICKETS STATE ────────────────────────────────────────────────────────────
  const [tickets,      setTickets]      = useState<TicketWithDetails[]>([]);
  const [staffOpts,    setStaffOpts]    = useState<StaffOption[]>([]);
  const [roomOpts,     setRoomOpts]     = useState<RoomOption[]>([]);
  const [loadingT,     setLoadingT]     = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search,       setSearch]       = useState('');
  const [catFilter,    setCatFilter]    = useState('all');
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [editTicket,   setEditTicket]   = useState<TicketWithDetails | null>(null);

  // ── ATTENDANCE STATE ─────────────────────────────────────────────────────────
  const [attSubTab,    setAttSubTab]    = useState<AttSubTab>('staff');
  const [attDate,      setAttDate]      = useState(todayStr());
  const [attendance,   setAttendance]   = useState<AttendanceWithStaff[]>([]);
  const [loadingAtt,   setLoadingAtt]   = useState(false);
  const [markingAtt,   setMarkingAtt]   = useState<string>(''); // staffId being marked

  // ── VISITORS STATE ───────────────────────────────────────────────────────────
  const [visDate,      setVisDate]      = useState(todayStr());
  const [visitors,     setVisitors]     = useState<VisitorWithRoom[]>([]);
  const [loadingVis,   setLoadingVis]   = useState(false);
  const [showVisModal, setShowVisModal] = useState(false);

  // ── UTILITIES STATE ──────────────────────────────────────────────────────────
  const [utilDate,     setUtilDate]     = useState(todayStr());
  const [utilRooms,    setUtilRooms]    = useState<RoomWithReading[]>([]);
  const [loadingUtil,  setLoadingUtil]  = useState(false);
  const [utilInputs,   setUtilInputs]   = useState<Record<string, { prev: string; curr: string; notes: string }>>({});
  const [savingUtil,   setSavingUtil]   = useState<string>(''); // roomId being saved

  // ─────────────────────────────────────────────────────────────────────────────
  // LOADERS
  // ─────────────────────────────────────────────────────────────────────────────

  const loadShift = useCallback(async (shift: ShiftType, date: string) => {
    if (!selectedBranch) return;
    try {
      const rec = await fetchShiftChecklist(selectedBranch.id, date, shift);
      const checks: Record<string, boolean> = {};
      const items = shift === 'morning' ? MORNING_ITEMS : NIGHT_ITEMS;
      items.forEach((i) => {
        checks[i.key] = rec?.checklist
          ? !!(rec.checklist as Record<string, boolean>)[i.key]
          : false;
      });
      if (shift === 'morning') {
        setOpenChecks(checks);
        setOpenLocked(rec?.is_locked ?? false);
        setOpenLockedAt(rec?.locked_at ?? null);
      } else {
        setCloseChecks(checks);
        setCloseLocked(rec?.is_locked ?? false);
        setCloseLockedAt(rec?.locked_at ?? null);
      }
    } catch { /* silent */ }
  }, [selectedBranch]);

  const loadTickets = useCallback(async () => {
    if (!selectedBranch) return;
    setLoadingT(true);
    try {
      const [t, s, r] = await Promise.all([
        fetchTickets(selectedBranch.id),
        fetchStaffOptions(selectedBranch.id),
        fetchRoomOptions(selectedBranch.id),
      ]);
      setTickets(t); setStaffOpts(s); setRoomOpts(r);
    } catch { toast.error('Failed to load tickets.'); }
    finally { setLoadingT(false); }
  }, [selectedBranch]);

  const loadAttendance = useCallback(async () => {
    if (!selectedBranch) return;
    setLoadingAtt(true);
    try { setAttendance(await fetchAttendanceForDate(selectedBranch.id, attDate)); }
    catch { toast.error('Failed to load attendance.'); }
    finally { setLoadingAtt(false); }
  }, [selectedBranch, attDate]);

  const loadVisitors = useCallback(async () => {
    if (!selectedBranch) return;
    setLoadingVis(true);
    try { setVisitors(await fetchVisitors(selectedBranch.id, visDate)); }
    catch { toast.error('Failed to load visitors.'); }
    finally { setLoadingVis(false); }
  }, [selectedBranch, visDate]);

  const loadUtilities = useCallback(async () => {
    if (!selectedBranch) return;
    setLoadingUtil(true);
    try {
      const data = await fetchRoomsWithReadings(selectedBranch.id, utilDate);
      setUtilRooms(data);
      const inputs: typeof utilInputs = {};
      data.forEach((r) => {
        inputs[r.id] = {
          prev:  r.reading?.eb_previous != null ? String(r.reading.eb_previous) : '',
          curr:  r.reading?.eb_current  != null ? String(r.reading.eb_current)  : '',
          notes: r.reading?.notes ?? '',
        };
      });
      setUtilInputs(inputs);
    } catch { toast.error('Failed to load utility readings.'); }
    finally { setLoadingUtil(false); }
  }, [selectedBranch, utilDate]);

  // Tab-driven loading
  useEffect(() => {
    if (!selectedBranch) return;
    if (tab === 'opening')    { loadShift('morning', shiftDate); loadShift('night', shiftDate); }
    if (tab === 'tickets')    loadTickets();
    if (tab === 'attendance') { loadAttendance(); loadVisitors(); }
    if (tab === 'utilities')  loadUtilities();
    if (tab === 'closing') {
      // Load night shift + all live-summary data so stats aren't zero
      loadShift('night', shiftDate);
      loadTickets();
      loadAttendance();
      loadVisitors();
      loadUtilities();
    }
  }, [tab, selectedBranch]);

  useEffect(() => { if (tab === 'attendance') loadAttendance(); }, [attDate]);
  useEffect(() => { if (tab === 'attendance') loadVisitors();   }, [visDate]);
  useEffect(() => { if (tab === 'utilities')  loadUtilities();  }, [utilDate]);

  // ─────────────────────────────────────────────────────────────────────────────
  // HANDLERS — SHIFT
  // ─────────────────────────────────────────────────────────────────────────────
  async function handleShiftToggle(shift: ShiftType, key: string, val: boolean) {
    if (!selectedBranch) return;
    const newChecks = shift === 'morning'
      ? { ...openChecks,  [key]: val }
      : { ...closeChecks, [key]: val };
    if (shift === 'morning') setOpenChecks(newChecks);
    else                     setCloseChecks(newChecks);
    try { await upsertShiftChecklist(selectedBranch.id, shiftDate, shift, newChecks); }
    catch { /* best-effort */ }
  }

  async function handleLockShift(shift: ShiftType) {
    if (!selectedBranch) return;
    setSavingShift(true);
    try {
      const checks = shift === 'morning' ? openChecks : closeChecks;
      await lockShift(selectedBranch.id, shiftDate, shift, checks);
      const lockedAt = new Date().toISOString();
      if (shift === 'morning') { setOpenLocked(true);  setOpenLockedAt(lockedAt); }
      else                     { setCloseLocked(true); setCloseLockedAt(lockedAt); }
      toast.success(shift === 'morning' ? 'Morning opening locked!' : 'Night closing locked!');
    } catch { toast.error('Failed to lock shift.'); }
    finally { setSavingShift(false); }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // HANDLERS — TICKETS
  // ─────────────────────────────────────────────────────────────────────────────
  async function handleResolve(t: TicketWithDetails) {
    try { await resolveTicket(t.id); toast.success('Ticket resolved.'); loadTickets(); }
    catch { toast.error('Failed to resolve.'); }
  }

  async function handleDeleteTicket(t: TicketWithDetails) {
    if (!window.confirm('Delete this ticket?')) return;
    try { await deleteTicket(t.id); toast.success('Ticket deleted.'); loadTickets(); }
    catch { toast.error('Failed to delete.'); }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // HANDLERS — ATTENDANCE
  // ─────────────────────────────────────────────────────────────────────────────
  async function handleMark(att: AttendanceWithStaff, status: string) {
    setMarkingAtt(att.staffId);
    try {
      await markAttendance(att.staffId, att.date, status, att.attId ?? undefined);
      toast.success(`Marked ${att.staffName} as ${status}.`);
      loadAttendance();
    } catch { toast.error('Failed to mark attendance.'); }
    finally { setMarkingAtt(''); }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // HANDLERS — VISITORS
  // ─────────────────────────────────────────────────────────────────────────────
  async function handleMarkExit(v: VisitorWithRoom) {
    try { await markVisitorExit(v.id); toast.success('Exit marked.'); loadVisitors(); }
    catch { toast.error('Failed to mark exit.'); }
  }

  async function handleDeleteVisitor(v: VisitorWithRoom) {
    if (!window.confirm(`Remove visitor ${v.visitor_name}?`)) return;
    try { await deleteVisitor(v.id); toast.success('Visitor removed.'); loadVisitors(); }
    catch { toast.error('Failed to delete.'); }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // HANDLERS — UTILITIES
  // ─────────────────────────────────────────────────────────────────────────────
  async function handleSaveReading(rwr: RoomWithReading) {
    if (!selectedBranch) return;
    const inp = utilInputs[rwr.id];
    if (!inp) return;
    setSavingUtil(rwr.id);
    try {
      await saveReading(
        selectedBranch.id,
        rwr.id,
        utilDate,
        inp.prev ? Number(inp.prev) : null,
        inp.curr ? Number(inp.curr) : null,
        inp.notes,
        rwr.reading?.id,
      );
      toast.success(`Room ${rwr.number} reading saved.`);
      loadUtilities();
    } catch { toast.error('Failed to save reading.'); }
    finally { setSavingUtil(''); }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DERIVED STATS
  // ─────────────────────────────────────────────────────────────────────────────
  const openCount = tickets.filter((t) => t.status === 'open').length;
  const inProgress = tickets.filter((t) => t.status === 'in_progress').length;
  const resolved   = tickets.filter((t) => t.status === 'resolved').length;
  const totalCost  = tickets.reduce((s, t) => s + (t.cost ?? 0), 0);

  const filteredTickets = tickets
    .filter((t) => statusFilter === 'all' || t.status === statusFilter)
    .filter((t) => catFilter === 'all' || t.category.toLowerCase() === catFilter.toLowerCase())
    .filter((t) => !search || t.description.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase()));

  const presentCount  = attendance.filter((a) => a.status === 'present').length;
  const absentCount   = attendance.filter((a) => a.status === 'absent').length;
  const leaveCount    = attendance.filter((a) => a.status === 'leave').length;
  const unmarkedCount = attendance.filter((a) => !a.status).length;

  const allOpenChecked  = MORNING_ITEMS.every((i) => openChecks[i.key]);
  const allCloseChecked = NIGHT_ITEMS.every((i) => closeChecks[i.key]);

  // ─────────────────────────────────────────────────────────────────────────────
  // GUARD
  // ─────────────────────────────────────────────────────────────────────────────
  if (!selectedBranch) return (
    <div className="operations-page">
      <div className="empty-state"><div className="empty-icon">🏢</div><div className="empty-title">No Branch Selected</div></div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="operations-page">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="page-header">
        <div className="header-left">
          <h2>Daily Operations</h2>
          <span className="branch-tag">{selectedBranch.name}</span>
        </div>
        {tab === 'tickets' && (
          <button className="btn-add" onClick={() => { setEditTicket(null); setShowTicketModal(true); }}>+ Create Ticket</button>
        )}
        {tab === 'attendance' && attSubTab === 'visitors' && (
          <button className="btn-add" onClick={() => setShowVisModal(true)}>+ Add Visitor</button>
        )}
      </div>

      {/* ── Main Tabs ──────────────────────────────────────────────────────── */}
      <div className="tab-bar">
        <button className={`tab-btn ${tab === 'opening'    ? 'active' : ''}`} onClick={() => setTab('opening')}>    🌅 Morning Opening</button>
        <button className={`tab-btn ${tab === 'tickets'    ? 'active' : ''}`} onClick={() => setTab('tickets')}>    🎫 Tickets ({openCount} open)</button>
        <button className={`tab-btn ${tab === 'attendance' ? 'active' : ''}`} onClick={() => setTab('attendance')}>👥 Attendance & Visitors</button>
        <button className={`tab-btn ${tab === 'utilities'  ? 'active' : ''}`} onClick={() => setTab('utilities')}>  ⚡ Utility Readings</button>
        <button className={`tab-btn ${tab === 'closing'    ? 'active' : ''}`} onClick={() => setTab('closing')}>    🌙 Night Closing</button>
      </div>

      {/* ══ MORNING OPENING ════════════════════════════════════════════════════ */}
      {tab === 'opening' && (
        <>
          <div className="controls-bar">
            <label>Date:</label>
            <input type="date" value={shiftDate} max={todayStr()} onChange={(e) => { setShiftDate(e.target.value); loadShift('morning', e.target.value); }} />
          </div>
          {openLocked ? (
            <div className="shift-locked-banner">
              ✅ Morning Opening locked at {fmtTime(openLockedAt)} on {fmtDate(openLockedAt)}
            </div>
          ) : null}
          <div className="shift-checklist">
            {MORNING_ITEMS.map((item) => (
              <label
                key={item.key}
                className={`check-item ${openChecks[item.key] ? 'done' : ''} ${openLocked ? 'locked' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={!!openChecks[item.key]}
                  disabled={openLocked}
                  onChange={(e) => handleShiftToggle('morning', item.key, e.target.checked)}
                />
                <span className="check-label">{item.label}</span>
                <span className="check-role">{item.role}</span>
              </label>
            ))}
          </div>
          {!openLocked && (
            <div className="shift-footer">
              <span className="shift-progress">{Object.values(openChecks).filter(Boolean).length} / {MORNING_ITEMS.length} completed</span>
              <button
                className="btn-add"
                disabled={!allOpenChecked || savingShift}
                onClick={() => handleLockShift('morning')}
              >
                {savingShift ? 'Locking…' : '🔒 Lock Morning Opening'}
              </button>
            </div>
          )}
        </>
      )}

      {/* ══ TICKETS ════════════════════════════════════════════════════════════ */}
      {tab === 'tickets' && (
        <>
          <div className="stats-row">
            <div className="stat-card yellow"><div className="stat-value">{openCount}</div><div className="stat-label">Open</div></div>
            <div className="stat-card blue"><div className="stat-value">{inProgress}</div><div className="stat-label">In Progress</div></div>
            <div className="stat-card green"><div className="stat-value">{resolved}</div><div className="stat-label">Resolved</div></div>
            <div className="stat-card red"><div className="stat-value">₹{totalCost.toLocaleString('en-IN')}</div><div className="stat-label">Maintenance Cost</div></div>
          </div>
          <div className="tab-bar secondary">
            {STATUSES.map((s) => (
              <button key={s} className={`tab-btn ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
                {STATUS_LABEL[s]}{s !== 'all' && ` (${tickets.filter((t) => t.status === s).length})`}
              </button>
            ))}
          </div>
          <div className="controls-bar">
            <div className="search-wrap">
              <i className="search-icon">🔍</i>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search description…" />
            </div>
            <div className="filter-group">
              <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
                <option value="all">All Categories</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          {loadingT ? (
            <div className="loading-wrap"><span className="loader" /></div>
          ) : filteredTickets.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔧</div>
              <div className="empty-title">No Tickets Found</div>
              <p>{search || statusFilter !== 'all' ? 'Try adjusting the filters.' : 'Create a ticket to track maintenance issues.'}</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>#</th><th>Category</th><th>Description</th><th>Room</th><th>Assigned</th><th>Status</th><th>Cost</th><th>Date</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {filteredTickets.map((t, i) => (
                    <tr key={t.id}>
                      <td className="muted">{i + 1}</td>
                      <td><span className="bold">{t.category}</span></td>
                      <td style={{ maxWidth: 200 }}>
                        <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{t.description}</span>
                      </td>
                      <td className="muted">{t.rooms ? `Room ${t.rooms.number}` : '—'}</td>
                      <td className="muted">{t.assignee?.name ?? '—'}</td>
                      <td><span className={`badge ${t.status}`}>{STATUS_LABEL[t.status ?? 'open']}</span></td>
                      <td className="muted">{t.cost ? `₹${t.cost.toLocaleString('en-IN')}` : '—'}</td>
                      <td className="muted">{fmtDate(t.created_at)}</td>
                      <td>
                        <div className="actions-cell">
                          <button className="action-btn edit"   onClick={() => { setEditTicket(t); setShowTicketModal(true); }}>Edit</button>
                          {t.status !== 'resolved' && t.status !== 'closed' && (
                            <button className="action-btn resolve" onClick={() => handleResolve(t)}>✓ Resolve</button>
                          )}
                          <button className="action-btn delete" onClick={() => handleDeleteTicket(t)}>Delete</button>
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

      {/* ══ ATTENDANCE & VISITORS ══════════════════════════════════════════════ */}
      {tab === 'attendance' && (
        <>
          <div className="att-sub-tabs">
            <button className={`tab-btn ${attSubTab === 'staff'    ? 'active' : ''}`} onClick={() => setAttSubTab('staff')}>👥 Staff Attendance</button>
            <button className={`tab-btn ${attSubTab === 'visitors' ? 'active' : ''}`} onClick={() => setAttSubTab('visitors')}>🚪 Visitor Log</button>
          </div>

          {/* Staff Attendance */}
          {attSubTab === 'staff' && (
            <>
              <div className="controls-bar">
                <label>Date:</label>
                <input type="date" value={attDate} max={todayStr()} onChange={(e) => setAttDate(e.target.value)} />
              </div>
              <div className="stats-row">
                <div className="stat-card green"><div className="stat-value">{presentCount}</div><div className="stat-label">Present</div></div>
                <div className="stat-card red"><div className="stat-value">{absentCount}</div><div className="stat-label">Absent</div></div>
                <div className="stat-card yellow"><div className="stat-value">{leaveCount}</div><div className="stat-label">Leave</div></div>
                <div className="stat-card blue"><div className="stat-value">{unmarkedCount}</div><div className="stat-label">Unmarked</div></div>
              </div>
              {loadingAtt ? (
                <div className="loading-wrap"><span className="loader" /></div>
              ) : attendance.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">👷</div>
                  <div className="empty-title">No Staff Found</div>
                  <p>Add staff members in the Staff module first.</p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>#</th><th>Name</th><th>Role</th><th>Status</th><th>Shift In</th><th>Shift Out</th><th>Mark</th></tr>
                    </thead>
                    <tbody>
                      {attendance.map((a, i) => (
                        <tr key={a.staffId}>
                          <td className="muted">{i + 1}</td>
                          <td className="bold">{a.staffName}</td>
                          <td className="muted">{a.staffRole}</td>
                          <td>
                            {a.status
                              ? <span className={`badge ${a.status}`}>{a.status.charAt(0).toUpperCase() + a.status.slice(1)}</span>
                              : <span className="muted">—</span>}
                          </td>
                          <td className="muted">{a.shiftIn ? fmtTime(a.shiftIn) : '—'}</td>
                          <td className="muted">{a.shiftOut ? fmtTime(a.shiftOut) : '—'}</td>
                          <td>
                            <div className="att-mark-group">
                              {ATT_STATUSES.map((s) => (
                                <button
                                  key={s.key}
                                  className={`att-btn ${s.cls} ${a.status === s.key ? 'active' : ''}`}
                                  disabled={markingAtt === a.staffId}
                                  onClick={() => handleMark(a, s.key)}
                                >
                                  {s.label}
                                </button>
                              ))}
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

          {/* Visitor Log */}
          {attSubTab === 'visitors' && (
            <>
              <div className="controls-bar">
                <label>Date:</label>
                <input type="date" value={visDate} max={todayStr()} onChange={(e) => setVisDate(e.target.value)} />
              </div>
              {loadingVis ? (
                <div className="loading-wrap"><span className="loader" /></div>
              ) : visitors.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🚪</div>
                  <div className="empty-title">No Visitors Today</div>
                  <p>Click "+ Add Visitor" to log a visitor entry.</p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>#</th><th>Visitor</th><th>Phone</th><th>Purpose</th><th>Room</th><th>Entry</th><th>Exit</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {visitors.map((v, i) => (
                        <tr key={v.id}>
                          <td className="muted">{i + 1}</td>
                          <td className="bold">{v.visitor_name}</td>
                          <td className="muted">{v.phone ?? '—'}</td>
                          <td className="muted">{v.purpose ?? '—'}</td>
                          <td className="muted">{v.rooms ? `Room ${v.rooms.number}` : '—'}</td>
                          <td className="muted">{fmtTime(v.entry_time)}</td>
                          <td className="muted">{v.exit_time ? fmtTime(v.exit_time) : <span className="badge open">Inside</span>}</td>
                          <td>
                            <div className="actions-cell">
                              {!v.exit_time && (
                                <button className="action-btn resolve" onClick={() => handleMarkExit(v)}>↗ Exit</button>
                              )}
                              <button className="action-btn delete" onClick={() => handleDeleteVisitor(v)}>Delete</button>
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
        </>
      )}

      {/* ══ UTILITY READINGS ══════════════════════════════════════════════════ */}
      {tab === 'utilities' && (
        <>
          <div className="controls-bar">
            <label>Date:</label>
            <input type="date" value={utilDate} max={todayStr()} onChange={(e) => setUtilDate(e.target.value)} />
          </div>
          {loadingUtil ? (
            <div className="loading-wrap"><span className="loader" /></div>
          ) : utilRooms.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">⚡</div>
              <div className="empty-title">No Rooms Found</div>
              <p>Create rooms in the Branches module first.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Room</th><th>Prev. Reading</th><th>Curr. Reading</th><th>Units Used</th><th>Notes</th><th>Save</th></tr>
                </thead>
                <tbody>
                  {utilRooms.map((rwr) => {
                    const inp = utilInputs[rwr.id] ?? { prev: '', curr: '', notes: '' };
                    const units = inp.prev && inp.curr ? Number(inp.curr) - Number(inp.prev) : null;
                    const isHigh = units != null && units > 150;
                    return (
                      <tr key={rwr.id}>
                        <td className="bold">Room {rwr.number}</td>
                        <td>
                          <input
                            type="number" min="0"
                            className="util-input"
                            value={inp.prev}
                            placeholder="Previous"
                            onChange={(e) => setUtilInputs((p) => ({ ...p, [rwr.id]: { ...p[rwr.id], prev: e.target.value } }))}
                          />
                        </td>
                        <td>
                          <input
                            type="number" min="0"
                            className="util-input"
                            value={inp.curr}
                            placeholder="Current"
                            onChange={(e) => setUtilInputs((p) => ({ ...p, [rwr.id]: { ...p[rwr.id], curr: e.target.value } }))}
                          />
                        </td>
                        <td>
                          {units != null
                            ? <span className={`util-units ${isHigh ? 'util-high' : ''}`}>{units} kWh{isHigh ? ' ⚠' : ''}</span>
                            : <span className="muted">—</span>}
                        </td>
                        <td>
                          <input
                            className="util-input"
                            value={inp.notes}
                            placeholder="Notes"
                            onChange={(e) => setUtilInputs((p) => ({ ...p, [rwr.id]: { ...p[rwr.id], notes: e.target.value } }))}
                          />
                        </td>
                        <td>
                          <button
                            className="action-btn resolve util-save"
                            disabled={savingUtil === rwr.id}
                            onClick={() => handleSaveReading(rwr)}
                          >
                            {savingUtil === rwr.id ? '…' : '💾 Save'}
                          </button>
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

      {/* ══ NIGHT CLOSING ══════════════════════════════════════════════════════ */}
      {tab === 'closing' && (
        <>
          {/* Live summary */}
          <div className="close-summary">
            <div className="close-stat">
              <div className="stat-value">{openCount}</div>
              <div className="stat-label">Open Tickets</div>
            </div>
            <div className="close-stat">
              <div className="stat-value">{presentCount}</div>
              <div className="stat-label">Present Today</div>
            </div>
            <div className="close-stat">
              <div className="stat-value">{visitors.length}</div>
              <div className="stat-label">Visitors Today</div>
            </div>
            <div className="close-stat">
              <div className="stat-value">{utilRooms.filter((r) => r.reading).length}</div>
              <div className="stat-label">EB Readings Logged</div>
            </div>
          </div>

          {closeLocked ? (
            <div className="shift-locked-banner">
              🌙 Night Closing locked at {fmtTime(closeLockedAt)} on {fmtDate(closeLockedAt)}
            </div>
          ) : null}

          <div className="shift-checklist">
            {NIGHT_ITEMS.map((item) => (
              <label
                key={item.key}
                className={`check-item ${closeChecks[item.key] ? 'done' : ''} ${closeLocked ? 'locked' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={!!closeChecks[item.key]}
                  disabled={closeLocked}
                  onChange={(e) => handleShiftToggle('night', item.key, e.target.checked)}
                />
                <span className="check-label">{item.label}</span>
                <span className="check-role">{item.role}</span>
              </label>
            ))}
          </div>
          {!closeLocked && (
            <div className="shift-footer">
              <span className="shift-progress">{Object.values(closeChecks).filter(Boolean).length} / {NIGHT_ITEMS.length} completed</span>
              <button
                className="btn-add"
                disabled={!allCloseChecked || savingShift}
                onClick={() => handleLockShift('night')}
              >
                {savingShift ? 'Locking…' : '🔒 Lock Night Closing'}
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {showTicketModal && selectedBranch && (
        <TicketModal
          branchId={selectedBranch.id}
          ticket={editTicket}
          staffOptions={staffOpts}
          roomOptions={roomOpts}
          onSave={() => { toast.success(editTicket ? 'Ticket updated.' : 'Ticket created!'); setShowTicketModal(false); setEditTicket(null); loadTickets(); }}
          onClose={() => { setShowTicketModal(false); setEditTicket(null); }}
        />
      )}
      {showVisModal && selectedBranch && (
        <VisitorModal
          branchId={selectedBranch.id}
          roomOptions={roomOpts}
          onSave={() => { toast.success('Visitor logged!'); setShowVisModal(false); loadVisitors(); }}
          onClose={() => setShowVisModal(false)}
        />
      )}
    </div>
  );
}
