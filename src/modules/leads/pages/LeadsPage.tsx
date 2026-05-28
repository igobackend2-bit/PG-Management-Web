import React, { useCallback, useEffect, useState } from 'react';
import { useBranchStore } from '../../../store/branchStore';
import { useToast } from '../../../shared/hooks/useToast';
import {
  fetchLeads, createLead, updateLead, deleteLead,
  LEAD_STATUSES, LEAD_SOURCES, STATUS_LABEL,
  type Lead, type LeadInsert, type LeadStatus,
} from '../services/leads.service';
import './LeadsPage.scss';

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── LeadModal ────────────────────────────────────────────────────────────────
interface ModalProps { branchId: string; lead: Lead | null; onSave: () => void; onClose: () => void; }

function LeadModal({ branchId, lead, onSave, onClose }: ModalProps) {
  const isEdit = Boolean(lead);
  const [form, setForm] = useState({
    name:                 lead?.name                 ?? '',
    phone:                lead?.phone                ?? '',
    source:               lead?.source               ?? LEAD_SOURCES[0],
    status:               (lead?.status              ?? 'new') as LeadStatus,
    interested_room_type: lead?.interested_room_type ?? '',
    visit_date:           lead?.visit_date           ?? '',
    notes:                lead?.notes                ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  function set(key: string, val: string) { setForm((p) => ({ ...p, [key]: val })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required.'); return; }
    setSaving(true); setError('');
    try {
      const payload: LeadInsert = {
        branch_id:            branchId,
        name:                 form.name.trim(),
        phone:                form.phone || null,
        source:               form.source || null,
        status:               form.status,
        interested_room_type: form.interested_room_type || null,
        visit_date:           form.visit_date || null,
        notes:                form.notes || null,
      };
      if (isEdit && lead) await updateLead(lead.id, payload);
      else await createLead(payload);
      onSave();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save.');
    } finally { setSaving(false); }
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-panel">
        <div className="modal-header">
          <h3>{isEdit ? 'Edit Lead' : 'Add Lead'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid">
              <div className="form-group">
                <label>Name *</label>
                <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Prospect name" required />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="Mobile number" />
              </div>
              <div className="form-group">
                <label>Source</label>
                <select value={form.source} onChange={(e) => set('source', e.target.value)}>
                  {LEAD_SOURCES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={form.status} onChange={(e) => set('status', e.target.value)}>
                  {LEAD_STATUSES.map((s) => (
                    <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Room Type Interested</label>
                <select value={form.interested_room_type} onChange={(e) => set('interested_room_type', e.target.value)}>
                  <option value="">— Any —</option>
                  <option value="AC">AC</option>
                  <option value="NON-AC">NON-AC</option>
                </select>
              </div>
              <div className="form-group">
                <label>Visit Date</label>
                <input type="date" value={form.visit_date} onChange={(e) => set('visit_date', e.target.value)} />
              </div>
              <div className="form-group full">
                <label>Notes</label>
                <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Budget, preferences, remarks…" />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <span className="modal-error">{error}</span>
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-save" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── LeadsPage ────────────────────────────────────────────────────────────────
export function LeadsPage() {
  const { selectedBranch } = useBranchStore();
  const toast              = useToast();

  const [leads, setLeads]               = useState<Lead[]>([]);
  const [loading, setLoading]           = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch]             = useState('');
  const [showModal, setShowModal]       = useState(false);
  const [editLead, setEditLead]         = useState<Lead | null>(null);

  const load = useCallback(async () => {
    if (!selectedBranch) return;
    setLoading(true);
    try { setLeads(await fetchLeads(selectedBranch.id)); }
    catch { toast.error('Failed to load leads.'); }
    finally { setLoading(false); }
  }, [selectedBranch]);

  useEffect(() => { load(); }, [load]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalConverted = leads.filter((l) => l.status === 'converted').length;
  const totalVisit     = leads.filter((l) => l.status === 'visit_scheduled').length;
  const conversionRate = leads.length > 0 ? Math.round((totalConverted / leads.length) * 100) : 0;

  const filtered = leads
    .filter((l) => statusFilter === 'all' || l.status === statusFilter)
    .filter((l) => !search ||
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      (l.phone ?? '').includes(search)
    );

  async function handleStatusChange(l: Lead, status: LeadStatus) {
    try { await updateLead(l.id, { status }); load(); }
    catch { toast.error('Failed to update status.'); }
  }

  async function handleDelete(l: Lead) {
    if (!window.confirm(`Delete lead "${l.name}"?`)) return;
    try { await deleteLead(l.id); toast.success('Lead deleted.'); load(); }
    catch { toast.error('Failed to delete.'); }
  }

  if (!selectedBranch) return (
    <div className="leads-page">
      <div className="empty-state"><div className="empty-icon">🏢</div><div className="empty-title">No Branch Selected</div></div>
    </div>
  );

  return (
    <div className="leads-page">
      <div className="page-header">
        <div className="header-left"><h2>Leads & Vacancies</h2><span className="branch-tag">{selectedBranch.name}</span></div>
        <button className="btn-add" onClick={() => { setEditLead(null); setShowModal(true); }}>+ Add Lead</button>
      </div>

      <div className="stats-row">
        <div className="stat-card blue"><div className="stat-value">{leads.length}</div><div className="stat-label">Total Leads</div></div>
        <div className="stat-card yellow"><div className="stat-value">{leads.filter((l) => l.status === 'new').length}</div><div className="stat-label">New</div></div>
        <div className="stat-card purple"><div className="stat-value">{totalVisit}</div><div className="stat-label">Visit Scheduled</div></div>
        <div className="stat-card green"><div className="stat-value">{conversionRate}%</div><div className="stat-label">Conversion Rate</div></div>
      </div>

      <div className="tab-bar">
        {[['all', 'All'], ...LEAD_STATUSES.map((s) => [s, STATUS_LABEL[s]])].map(([val, label]) => (
          <button
            key={val}
            className={`tab-btn ${statusFilter === val ? 'active' : ''}`}
            onClick={() => setStatusFilter(val)}
          >
            {label}{val !== 'all' ? ` (${leads.filter((l) => l.status === val).length})` : ''}
          </button>
        ))}
      </div>

      <div className="controls-bar">
        <div className="search-wrap">
          <i className="search-icon">🔍</i>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or phone…" />
        </div>
      </div>

      {loading ? (
        <div className="loading-wrap"><span className="loader" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📣</div>
          <div className="empty-title">No Leads Found</div>
          <p>{search || statusFilter !== 'all' ? 'Try adjusting filters.' : 'Click "Add Lead" to start tracking prospects.'}</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>Phone</th><th>Source</th><th>Room Type</th><th>Visit Date</th><th>Notes</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id}>
                  <td className="bold">{l.name}</td>
                  <td className="muted">{l.phone ?? '—'}</td>
                  <td className="muted">{l.source ?? '—'}</td>
                  <td className="muted">{l.interested_room_type ?? '—'}</td>
                  <td className="muted">{formatDate(l.visit_date)}</td>
                  <td className="muted" style={{ maxWidth: 200 }}><span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{l.notes ?? '—'}</span></td>
                  <td>
                    <select
                      value={l.status ?? 'new'}
                      onChange={(e) => handleStatusChange(l, e.target.value as LeadStatus)}
                      className={`status-select s-${l.status ?? 'new'}`}
                    >
                      {LEAD_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                    </select>
                  </td>
                  <td>
                    <div className="actions-cell">
                      <button className="action-btn edit" onClick={() => { setEditLead(l); setShowModal(true); }}>Edit</button>
                      <button className="action-btn delete" onClick={() => handleDelete(l)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && selectedBranch && (
        <LeadModal
          branchId={selectedBranch.id}
          lead={editLead}
          onSave={() => { toast.success(editLead ? 'Lead updated.' : 'Lead added!'); setShowModal(false); setEditLead(null); load(); }}
          onClose={() => { setShowModal(false); setEditLead(null); }}
        />
      )}
    </div>
  );
}
