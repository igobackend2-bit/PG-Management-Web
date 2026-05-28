import React, { useCallback, useEffect, useState } from 'react';
import { useBranchStore } from '../../../store/branchStore';
import { useToast } from '../../../shared/hooks/useToast';
import { supabase } from '../../../services/supabase';
import { fetchBranches } from '../../../services/branches.service';
import {
  fetchRoomsWithBeds, createRoom, updateRoom, deleteRoom, addBed, deleteBed,
  type RoomWithBeds, type BedRow,
} from '../services/rooms.service';
import type { Tables, TablesInsert } from '../../../types/database.types';
import './BranchesModulePage.scss';

type BranchRow = Tables<'branches'>;
type Tab       = 'branches' | 'rooms';

const BRANCH_TYPES = ['NON-AC', 'AC', 'BOTH'];
const GENDERS      = ['MENS', 'WOMENS', 'BOTH'];
const ROOM_TYPES   = ['NON-AC', 'AC'];
const CURRENCY     = (n: number) => '₹' + n.toLocaleString('en-IN');

/** Resolve owners.id for the current auth user. */
async function getOwnerId(): Promise<string> {
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) throw new Error('Not authenticated.');
  const { data, error } = await supabase
    .from('owners').select('id').eq('auth_user_id', user.id).single();
  if (error) throw new Error(`Owner lookup failed: ${error.message}`);
  return data.id;
}

// ─── BranchModal ──────────────────────────────────────────────────────────────
function BranchModal({ branch, onSave, onClose }: {
  branch: BranchRow | null; onSave: () => void; onClose: () => void;
}) {
  const isEdit = Boolean(branch);
  const [form, setForm] = useState({
    name:              branch?.name              ?? '',
    location:          branch?.location          ?? '',
    address:           branch?.address           ?? '',
    pincode:           branch?.pincode           ?? '',
    type:              branch?.type              ?? 'NON-AC',
    gender:            branch?.gender            ?? 'MENS',
    is_food_available: branch?.is_food_available ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  function set(k: string, v: string | boolean) { setForm((p) => ({ ...p, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Branch name is required.'); return; }
    setSaving(true); setError('');
    try {
      const payload = { ...form, name: form.name.trim() };
      if (isEdit && branch) {
        const { error: err } = await supabase.from('branches').update(payload).eq('id', branch.id);
        if (err) throw err;
      } else {
        const resolvedOwnerId = await getOwnerId();
        const insert: TablesInsert<'branches'> = { ...payload, owner_id: resolvedOwnerId };
        const { error: err } = await supabase.from('branches').insert(insert);
        if (err) throw err;
      }
      onSave();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to save.'); }
    finally { setSaving(false); }
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-panel">
        <div className="modal-header">
          <h3>{isEdit ? 'Edit Branch' : 'Add New Branch'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid">
              <div className="form-group">
                <label>Branch Name *</label>
                <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. IGO PG Koramangala" required />
              </div>
              <div className="form-group">
                <label>Location / Area</label>
                <input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="e.g. Koramangala" />
              </div>
              <div className="form-group">
                <label>Type</label>
                <select value={form.type} onChange={(e) => set('type', e.target.value)}>
                  {BRANCH_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Gender</label>
                <select value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                  {GENDERS.map((g) => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div className="form-group full">
                <label>Full Address</label>
                <textarea value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Door no, street, locality…" />
              </div>
              <div className="form-group">
                <label>Pincode</label>
                <input value={form.pincode} onChange={(e) => set('pincode', e.target.value)} placeholder="560001" maxLength={6} />
              </div>
              <div className="form-group food-check">
                <label>
                  <input type="checkbox" checked={form.is_food_available} onChange={(e) => set('is_food_available', e.target.checked)} />
                  Food Service Available
                </label>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <span className="modal-error">{error}</span>
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-save" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Branch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── RoomModal ────────────────────────────────────────────────────────────────
function RoomModal({ branchId, room, onSave, onClose }: {
  branchId: string; room: RoomWithBeds | null; onSave: () => void; onClose: () => void;
}) {
  const isEdit = Boolean(room);
  const [form, setForm] = useState({
    number:       room?.number           ?? '',
    type:         room?.type             ?? 'NON-AC',
    rent:         String(room?.rent      ?? ''),
    per_day_rent: String(room?.per_day_rent ?? ''),
    beds:         String(room?.capacity  ?? 1),   // only used for new rooms
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  function set(k: string, v: string) { setForm((p) => ({ ...p, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.number.trim()) { setError('Room number is required.'); return; }
    if (!form.rent)          { setError('Monthly rent is required.'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        branch_id:    branchId,
        number:       form.number.trim(),
        type:         form.type,
        rent:         Number(form.rent),
        capacity:     Number(form.beds) || 1,
        per_day_rent: form.per_day_rent ? Number(form.per_day_rent) : null,
      };
      if (isEdit && room) {
        await updateRoom(room.id, payload);
      } else {
        await createRoom(payload, Number(form.beds) || 1);
      }
      onSave();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to save.'); }
    finally { setSaving(false); }
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-panel">
        <div className="modal-header">
          <h3>{isEdit ? `Edit Room ${room?.number}` : 'Add Room'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid">
              <div className="form-group">
                <label>Room Number *</label>
                <input value={form.number} onChange={(e) => set('number', e.target.value)} placeholder="e.g. 101 or A1" required />
              </div>
              <div className="form-group">
                <label>Type</label>
                <select value={form.type} onChange={(e) => set('type', e.target.value)}>
                  {ROOM_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Monthly Rent (₹) *</label>
                <input type="number" min="0" value={form.rent} onChange={(e) => set('rent', e.target.value)} placeholder="8000" required />
              </div>
              <div className="form-group">
                <label>Per Day Rent (₹)</label>
                <input type="number" min="0" value={form.per_day_rent} onChange={(e) => set('per_day_rent', e.target.value)} placeholder="optional" />
              </div>
              {!isEdit && (
                <div className="form-group full">
                  <label>Number of Beds (auto-created)</label>
                  <input type="number" min="1" max="20" value={form.beds} onChange={(e) => set('beds', e.target.value)} />
                  <span className="field-hint">Beds will be labelled A, B, C… automatically.</span>
                </div>
              )}
            </div>
          </div>
          <div className="modal-footer">
            <span className="modal-error">{error}</span>
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-save" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── BranchesModulePage ───────────────────────────────────────────────────────
export function BranchesModulePage() {
  const { branches, selectedBranch, setSelectedBranch, setBranches } = useBranchStore();
  const toast = useToast();

  const [tab, setTab]               = useState<Tab>('branches');
  const [branchRows, setBranchRows] = useState<BranchRow[]>([]);
  const [loadingB, setLoadingB]     = useState(false);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [editBranch, setEditBranch] = useState<BranchRow | null>(null);

  // Room state
  const [rooms, setRooms]           = useState<RoomWithBeds[]>([]);
  const [loadingR, setLoadingR]     = useState(false);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [editRoom, setEditRoom]     = useState<RoomWithBeds | null>(null);
  const [addingBed, setAddingBed]   = useState<string>(''); // roomId

  // ── Branch loaders ────────────────────────────────────────────────────────
  const loadBranches = useCallback(async () => {
    setLoadingB(true);
    try {
      const { data, error } = await supabase.from('branches').select('*').order('name');
      if (error) throw error;
      setBranchRows(data ?? []);
    } catch { toast.error('Failed to load branches.'); }
    finally { setLoadingB(false); }
  }, []);

  useEffect(() => { loadBranches(); }, [loadBranches]);

  // ── Room loaders ──────────────────────────────────────────────────────────
  const loadRooms = useCallback(async () => {
    if (!selectedBranch) return;
    setLoadingR(true);
    try { setRooms(await fetchRoomsWithBeds(selectedBranch.id)); }
    catch { toast.error('Failed to load rooms.'); }
    finally { setLoadingR(false); }
  }, [selectedBranch]);

  useEffect(() => { if (tab === 'rooms') loadRooms(); }, [tab, loadRooms]);

  // ── Branch handlers ────────────────────────────────────────────────────────
  async function refreshStore() {
    try { setBranches(await fetchBranches()); }
    catch { /* best-effort */ }
  }

  function handleBranchSaved() {
    toast.success(editBranch ? 'Branch updated!' : 'Branch added!');
    setShowBranchModal(false); setEditBranch(null);
    loadBranches(); refreshStore();
  }

  async function handleDeleteBranch(b: BranchRow) {
    if (!window.confirm(`Delete "${b.name}"? This is irreversible.`)) return;
    try {
      const { error } = await supabase.from('branches').delete().eq('id', b.id);
      if (error) throw error;
      toast.success('Branch deleted.');
      loadBranches(); refreshStore();
    } catch { toast.error('Failed to delete branch.'); }
  }

  function goToRooms(b: BranchRow) {
    // Find the branch in store and select it, then switch tab
    const storeBranch = branches.find((br) => br.id === b.id);
    if (storeBranch) setSelectedBranch(storeBranch);
    setTab('rooms');
  }

  // ── Room handlers ──────────────────────────────────────────────────────────
  function handleRoomSaved() {
    toast.success(editRoom ? 'Room updated!' : 'Room added!');
    setShowRoomModal(false); setEditRoom(null); loadRooms();
  }

  async function handleDeleteRoom(r: RoomWithBeds) {
    if (!window.confirm(`Delete Room ${r.number}?`)) return;
    try { await deleteRoom(r.id); toast.success('Room deleted.'); loadRooms(); }
    catch { toast.error('Failed to delete room.'); }
  }

  async function handleAddBed(r: RoomWithBeds) {
    setAddingBed(r.id);
    try { await addBed(r.id, r.beds.length); loadRooms(); }
    catch { toast.error('Failed to add bed.'); }
    finally { setAddingBed(''); }
  }

  async function handleDeleteBed(bed: BedRow) {
    if (!window.confirm(`Delete Bed ${bed.label}?`)) return;
    try { await deleteBed(bed.id); toast.success('Bed deleted.'); loadRooms(); }
    catch { toast.error('Failed to delete bed.'); }
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalRooms = rooms.length;
  const totalBeds  = rooms.reduce((s, r) => s + r.beds.length, 0);
  const occupied   = rooms.reduce((s, r) => s + r.beds.filter((b) => b.is_occupied).length, 0);
  const vacant     = totalBeds - occupied;

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="branches-page">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="page-header">
        <div className="header-left">
          <h2>{tab === 'branches' ? 'Branches' : 'Rooms'}</h2>
          {tab === 'branches' && (
            <span className="branch-count">{branchRows.length} branch{branchRows.length !== 1 ? 'es' : ''}</span>
          )}
          {tab === 'rooms' && selectedBranch && (
            <span className="branch-tag">{selectedBranch.name}</span>
          )}
        </div>
        {tab === 'branches' && (
          <button className="btn-add" onClick={() => { setEditBranch(null); setShowBranchModal(true); }}>
            + Add Branch
          </button>
        )}
        {tab === 'rooms' && selectedBranch && (
          <button className="btn-add" onClick={() => { setEditRoom(null); setShowRoomModal(true); }}>
            + Add Room
          </button>
        )}
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div className="tab-bar">
        <button className={`tab-btn ${tab === 'branches' ? 'active' : ''}`} onClick={() => setTab('branches')}>
          🏢 Branches ({branchRows.length})
        </button>
        <button className={`tab-btn ${tab === 'rooms' ? 'active' : ''}`} onClick={() => setTab('rooms')}>
          🚪 Rooms{selectedBranch ? ` — ${selectedBranch.name}` : ''}
        </button>
      </div>

      {/* ══ BRANCHES TAB ═══════════════════════════════════════════════════════ */}
      {tab === 'branches' && (
        <>
          {loadingB ? (
            <div className="loading-wrap"><span className="loader" /></div>
          ) : branchRows.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🏢</div>
              <div className="empty-title">No Branches Yet</div>
              <p>Click "Add Branch" to register your first PG property.</p>
            </div>
          ) : (
            <div className="branch-grid">
              {branchRows.map((b) => (
                <div key={b.id} className="branch-card">
                  <div className="branch-card-header">
                    <span className="branch-name">{b.name}</span>
                    <div className="branch-actions">
                      <button className="action-btn edit" onClick={() => { setEditBranch(b); setShowBranchModal(true); }}>Edit</button>
                      <button className="action-btn delete" onClick={() => handleDeleteBranch(b)}>Delete</button>
                    </div>
                  </div>
                  <div className="branch-meta">
                    {b.location && <span className="meta-item">📍 {b.location}</span>}
                    {b.type     && <span className="meta-badge">{b.type}</span>}
                    {b.gender   && <span className="meta-badge">{b.gender}</span>}
                    {b.is_food_available && <span className="meta-badge food">🍽 Food</span>}
                  </div>
                  {(b.address || b.pincode) && (
                    <div className="branch-address">{b.address}{b.pincode ? ` — ${b.pincode}` : ''}</div>
                  )}
                  <button className="btn-rooms" onClick={() => goToRooms(b)}>
                    🚪 Manage Rooms →
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ══ ROOMS TAB ══════════════════════════════════════════════════════════ */}
      {tab === 'rooms' && (
        <>
          {!selectedBranch ? (
            <div className="empty-state">
              <div className="empty-icon">🏢</div>
              <div className="empty-title">No Branch Selected</div>
              <p>Select a branch from the Branches tab or the header to manage rooms.</p>
            </div>
          ) : (
            <>
              {/* Stats row */}
              <div className="stats-row">
                <div className="stat-card blue"><div className="stat-value">{totalRooms}</div><div className="stat-label">Rooms</div></div>
                <div className="stat-card green"><div className="stat-value">{totalBeds}</div><div className="stat-label">Total Beds</div></div>
                <div className="stat-card red"><div className="stat-value">{occupied}</div><div className="stat-label">Occupied</div></div>
                <div className="stat-card yellow"><div className="stat-value">{vacant}</div><div className="stat-label">Vacant</div></div>
              </div>

              {loadingR ? (
                <div className="loading-wrap"><span className="loader" /></div>
              ) : rooms.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🚪</div>
                  <div className="empty-title">No Rooms Yet</div>
                  <p>Click "+ Add Room" to create rooms for this branch.</p>
                </div>
              ) : (
                <div className="rooms-list">
                  {rooms.map((r) => (
                    <div key={r.id} className="room-card">
                      {/* Room header */}
                      <div className="room-header">
                        <div className="room-title">
                          <span className="room-number">Room {r.number}</span>
                          <span className="room-type-badge">{r.type ?? 'NON-AC'}</span>
                          <span className="room-rent">{CURRENCY(r.rent)}/mo</span>
                          {r.per_day_rent && <span className="room-per-day">{CURRENCY(r.per_day_rent)}/day</span>}
                        </div>
                        <div className="room-actions">
                          <button className="action-btn edit" onClick={() => { setEditRoom(r); setShowRoomModal(true); }}>Edit</button>
                          <button className="action-btn delete" onClick={() => handleDeleteRoom(r)}>Delete</button>
                        </div>
                      </div>

                      {/* Beds */}
                      <div className="beds-section">
                        <span className="beds-label">Beds ({r.beds.length})</span>
                        <div className="beds-row">
                          {r.beds.map((bed) => (
                            <div key={bed.id} className={`bed-chip ${bed.is_occupied ? 'occupied' : 'vacant'}`}>
                              <span className="bed-label">{bed.label}</span>
                              <span className="bed-status">{bed.is_occupied ? '● Occ.' : '○ Free'}</span>
                              {!bed.is_occupied && (
                                <button
                                  className="bed-delete"
                                  onClick={() => handleDeleteBed(bed)}
                                  title="Remove bed"
                                >×</button>
                              )}
                            </div>
                          ))}
                          <button
                            className="bed-add-btn"
                            onClick={() => handleAddBed(r)}
                            disabled={addingBed === r.id}
                          >
                            {addingBed === r.id ? '…' : '+ Bed'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {showBranchModal && (
        <BranchModal
          branch={editBranch}
          onSave={handleBranchSaved}
          onClose={() => { setShowBranchModal(false); setEditBranch(null); }}
        />
      )}
      {showRoomModal && selectedBranch && (
        <RoomModal
          branchId={selectedBranch.id}
          room={editRoom}
          onSave={handleRoomSaved}
          onClose={() => { setShowRoomModal(false); setEditRoom(null); }}
        />
      )}
    </div>
  );
}
