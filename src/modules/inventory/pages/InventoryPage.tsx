import React, { useCallback, useEffect, useState } from 'react';
import { useBranchStore } from '../../../store/branchStore';
import { useToast } from '../../../shared/hooks/useToast';
import {
  fetchInventory, createInventoryItem, updateInventoryItem,
  auditItem, deleteInventoryItem, fetchRoomOptions,
  ITEM_CATEGORIES, ITEM_CONDITIONS,
  type ItemWithRoom, type InventoryItemInsert, type RoomOption,
} from '../services/inventory.service';
import './InventoryPage.scss';

type CategoryFilter = typeof ITEM_CATEGORIES[number] | 'all';
type ConditionFilter = typeof ITEM_CONDITIONS[number] | 'all';

const CONDITION_LABEL: Record<string, string> = {
  good: 'Good', fair: 'Fair', poor: 'Poor', damaged: 'Damaged',
};

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── ItemModal ────────────────────────────────────────────────────────────────
interface ModalProps {
  branchId: string;
  item: ItemWithRoom | null;
  roomOptions: RoomOption[];
  onSave: () => void;
  onClose: () => void;
}

function ItemModal({ branchId, item, roomOptions, onSave, onClose }: ModalProps) {
  const isEdit = Boolean(item);
  const [form, setForm] = useState({
    name:      item?.name      ?? '',
    category:  item?.category  ?? 'Furniture',
    condition: item?.condition ?? 'good',
    quantity:  String(item?.quantity ?? 1),
    room_id:   item?.room_id   ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  function set(key: string, val: string) { setForm((p) => ({ ...p, [key]: val })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required.'); return; }
    setSaving(true); setError('');
    try {
      const payload: InventoryItemInsert = {
        branch_id: branchId,
        name:      form.name.trim(),
        category:  form.category,
        condition: form.condition,
        quantity:  Number(form.quantity) || 1,
        room_id:   form.room_id || null,
      };
      if (isEdit && item) await updateInventoryItem(item.id, payload);
      else await createInventoryItem(payload);
      onSave();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save.');
    } finally { setSaving(false); }
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-panel">
        <div className="modal-header">
          <h3>{isEdit ? 'Edit Item' : 'Add Inventory Item'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid">
              <div className="form-group">
                <label>Item Name *</label>
                <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Ceiling Fan" required />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select value={form.category} onChange={(e) => set('category', e.target.value)}>
                  {ITEM_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Condition</label>
                <select value={form.condition} onChange={(e) => set('condition', e.target.value)}>
                  {ITEM_CONDITIONS.map((c) => <option key={c} value={c}>{CONDITION_LABEL[c]}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Quantity</label>
                <input type="number" min="1" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} placeholder="1" />
              </div>
              <div className="form-group full">
                <label>Room (optional)</label>
                <select value={form.room_id} onChange={(e) => set('room_id', e.target.value)}>
                  <option value="">— Common / No Room —</option>
                  {roomOptions.map((r) => <option key={r.id} value={r.id}>Room {r.number}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <span className="modal-error">{error}</span>
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-save" disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Item'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── InventoryPage ────────────────────────────────────────────────────────────
export function InventoryPage() {
  const { selectedBranch } = useBranchStore();
  const toast = useToast();

  const [items, setItems]       = useState<ItemWithRoom[]>([]);
  const [roomOpts, setRoomOpts] = useState<RoomOption[]>([]);
  const [loading, setLoading]   = useState(false);
  const [search, setSearch]     = useState('');
  const [catFilter, setCatFilter]   = useState<CategoryFilter>('all');
  const [condFilter, setCondFilter] = useState<ConditionFilter>('all');
  const [showModal, setShowModal]   = useState(false);
  const [editItem, setEditItem]     = useState<ItemWithRoom | null>(null);
  const [auditingId, setAuditingId] = useState<string>('');

  const load = useCallback(async () => {
    if (!selectedBranch) return;
    setLoading(true);
    try {
      const [inv, rooms] = await Promise.all([
        fetchInventory(selectedBranch.id),
        fetchRoomOptions(selectedBranch.id),
      ]);
      setItems(inv);
      setRoomOpts(rooms);
    } catch { toast.error('Failed to load inventory.'); }
    finally { setLoading(false); }
  }, [selectedBranch]);

  useEffect(() => { load(); }, [load]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const totalItems    = items.length;
  const damagedCount  = items.filter((i) => i.condition === 'damaged' || i.condition === 'poor').length;
  const totalQty      = items.reduce((s, i) => s + (i.quantity ?? 1), 0);
  const neverAudited  = items.filter((i) => !i.last_audited).length;

  const filtered = items
    .filter((i) => catFilter === 'all' || i.category === catFilter)
    .filter((i) => condFilter === 'all' || i.condition === condFilter)
    .filter((i) => !search ||
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      (i.category ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (i.rooms?.number ?? '').includes(search)
    );

  // ── Handlers ───────────────────────────────────────────────────────────────
  async function handleAudit(item: ItemWithRoom) {
    setAuditingId(item.id);
    try {
      await auditItem(item.id);
      toast.success(`"${item.name}" audited.`);
      load();
    } catch { toast.error('Failed to audit item.'); }
    finally { setAuditingId(''); }
  }

  async function handleDelete(item: ItemWithRoom) {
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    try { await deleteInventoryItem(item.id); toast.success('Item deleted.'); load(); }
    catch { toast.error('Failed to delete item.'); }
  }

  function handleSaved() {
    toast.success(editItem ? 'Item updated.' : 'Item added!');
    setShowModal(false); setEditItem(null); load();
  }

  if (!selectedBranch) return (
    <div className="inventory-page"><div className="empty-state"><div className="empty-icon">🏢</div><div className="empty-title">No Branch Selected</div></div></div>
  );

  return (
    <div className="inventory-page">
      <div className="page-header">
        <div className="header-left"><h2>Inventory & Assets</h2><span className="branch-tag">{selectedBranch.name}</span></div>
        <button className="btn-add" onClick={() => { setEditItem(null); setShowModal(true); }}>+ Add Item</button>
      </div>

      <div className="stats-row">
        <div className="stat-card blue"><div className="stat-value">{totalItems}</div><div className="stat-label">Total Items</div></div>
        <div className="stat-card green"><div className="stat-value">{totalQty}</div><div className="stat-label">Total Quantity</div></div>
        <div className="stat-card red"><div className="stat-value">{damagedCount}</div><div className="stat-label">Poor / Damaged</div></div>
        <div className="stat-card yellow"><div className="stat-value">{neverAudited}</div><div className="stat-label">Never Audited</div></div>
      </div>

      <div className="controls-bar">
        <div className="search-wrap">
          <i className="search-icon">🔍</i>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items…" />
        </div>
        <div className="filter-group">
          <select value={catFilter} onChange={(e) => setCatFilter(e.target.value as CategoryFilter)}>
            <option value="all">All Categories</option>
            {ITEM_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={condFilter} onChange={(e) => setCondFilter(e.target.value as ConditionFilter)}>
            <option value="all">All Conditions</option>
            {ITEM_CONDITIONS.map((c) => <option key={c} value={c}>{CONDITION_LABEL[c]}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading-wrap"><span className="loader" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <div className="empty-title">No Items Found</div>
          <p>{search || catFilter !== 'all' || condFilter !== 'all' ? 'Try adjusting the filters.' : 'Click "Add Item" to start tracking your assets.'}</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>#</th><th>Name</th><th>Category</th><th>Room</th><th>Qty</th><th>Condition</th><th>Last Audited</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => (
                <tr key={item.id}>
                  <td className="muted">{i + 1}</td>
                  <td className="bold">{item.name}</td>
                  <td className="muted">{item.category}</td>
                  <td className="muted">{item.rooms ? `Room ${item.rooms.number}` : 'Common'}</td>
                  <td className="bold">{item.quantity ?? 1}</td>
                  <td><span className={`badge ${item.condition ?? 'good'}`}>{CONDITION_LABEL[item.condition ?? 'good']}</span></td>
                  <td className="muted">{formatDate(item.last_audited)}</td>
                  <td>
                    <div className="actions-cell">
                      <button className="action-btn edit" onClick={() => { setEditItem(item); setShowModal(true); }}>Edit</button>
                      <button
                        className="action-btn audit"
                        onClick={() => handleAudit(item)}
                        disabled={auditingId === item.id}
                      >
                        {auditingId === item.id ? '…' : '✓ Audit'}
                      </button>
                      <button className="action-btn delete" onClick={() => handleDelete(item)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && selectedBranch && (
        <ItemModal
          branchId={selectedBranch.id}
          item={editItem}
          roomOptions={roomOpts}
          onSave={handleSaved}
          onClose={() => { setShowModal(false); setEditItem(null); }}
        />
      )}
    </div>
  );
}
