import React, { useCallback, useEffect, useState } from 'react';
import { useBranchStore } from '../../../store/branchStore';
import { useToast } from '../../../shared/hooks/useToast';
import {
  fetchTenantDocGroups, createDocument, deleteDocument,
  DOCUMENT_TYPES,
  type TenantDocGroup, type DocumentRow, type TenantOption,
} from '../services/documents.service';
import './DocumentsPage.scss';

function isExpiringSoon(date: string | null): boolean {
  if (!date) return false;
  const days = Math.round((new Date(date).getTime() - Date.now()) / 86_400_000);
  return days >= 0 && days <= 30;
}

function isExpired(date: string | null): boolean {
  if (!date) return false;
  return new Date(date) < new Date();
}

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── AddDocModal ──────────────────────────────────────────────────────────────
interface AddModalProps {
  tenants: TenantOption[];
  onSave:  (tenantId: string, type: string, expiryDate: string, fileUrl: string) => Promise<void>;
  onClose: () => void;
}

function AddDocModal({ tenants, onSave, onClose }: AddModalProps) {
  const [tenantId,   setTenantId]  = useState('');
  const [type,       setType]      = useState(DOCUMENT_TYPES[0]);
  const [expiryDate, setExpiry]    = useState('');
  const [fileUrl,    setFileUrl]   = useState('');
  const [saving,     setSaving]    = useState(false);
  const [error,      setError]     = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId) { setError('Select a tenant.'); return; }
    setSaving(true); setError('');
    try { await onSave(tenantId, type, expiryDate, fileUrl); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to save.'); setSaving(false); }
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-panel">
        <div className="modal-header">
          <h3>Add Document</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid">
              <div className="form-group">
                <label>Tenant *</label>
                <select value={tenantId} onChange={(e) => setTenantId(e.target.value)} required>
                  <option value="">— Select tenant —</option>
                  {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Document Type</label>
                <select value={type} onChange={(e) => setType(e.target.value)}>
                  {DOCUMENT_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Expiry Date (optional)</label>
                <input type="date" value={expiryDate} onChange={(e) => setExpiry(e.target.value)} />
              </div>
              <div className="form-group full">
                <label>File URL (optional)</label>
                <input
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  placeholder="https://… leave blank if no digital copy"
                />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <span className="modal-error">{error}</span>
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-save" disabled={saving}>
              {saving ? 'Saving…' : 'Add Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── DocumentsPage ────────────────────────────────────────────────────────────
export function DocumentsPage() {
  const { selectedBranch } = useBranchStore();
  const toast              = useToast();

  const [groups,     setGroups]     = useState<TenantDocGroup[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [showModal,  setShowModal]  = useState(false);
  const [search,     setSearch]     = useState('');

  const load = useCallback(async () => {
    if (!selectedBranch) return;
    setLoading(true);
    try { setGroups(await fetchTenantDocGroups(selectedBranch.id)); }
    catch { toast.error('Failed to load documents.'); }
    finally { setLoading(false); }
  }, [selectedBranch]);

  useEffect(() => { load(); }, [load]);

  const allDocs  = groups.flatMap((g) => g.docs);
  const expiring = allDocs.filter((d) => isExpiringSoon(d.expiry_date)).length;
  const expired  = allDocs.filter((d) => isExpired(d.expiry_date)).length;
  const tenants  = groups.map((g) => g.tenant);

  const filteredGroups = groups.filter((g) =>
    !search || g.tenant.name.toLowerCase().includes(search.toLowerCase())
  );

  async function handleAddDoc(tenantId: string, type: string, expiryDate: string, fileUrl: string) {
    await createDocument({
      tenant_id:   tenantId,
      type,
      expiry_date: expiryDate || null,
      file_url:    fileUrl    || null,
      owner_id:    null,
      staff_id:    null,
    });
    toast.success('Document added!');
    setShowModal(false);
    load();
  }

  async function handleDelete(d: DocumentRow) {
    if (!window.confirm(`Delete this ${d.type} document?`)) return;
    try { await deleteDocument(d.id); toast.success('Document deleted.'); load(); }
    catch { toast.error('Failed to delete.'); }
  }

  if (!selectedBranch) return (
    <div className="documents-page">
      <div className="empty-state"><div className="empty-icon">🏢</div><div className="empty-title">No Branch Selected</div></div>
    </div>
  );

  return (
    <div className="documents-page">
      <div className="page-header">
        <div className="header-left"><h2>Documents</h2><span className="branch-tag">{selectedBranch.name}</span></div>
        <button className="btn-add" onClick={() => setShowModal(true)}>+ Add Document</button>
      </div>

      <div className="stats-row">
        <div className="stat-card blue"><div className="stat-value">{tenants.length}</div><div className="stat-label">Tenants</div></div>
        <div className="stat-card green"><div className="stat-value">{allDocs.length}</div><div className="stat-label">Total Documents</div></div>
        <div className="stat-card yellow"><div className="stat-value">{expiring}</div><div className="stat-label">Expiring (30d)</div></div>
        <div className="stat-card red"><div className="stat-value">{expired}</div><div className="stat-label">Expired</div></div>
      </div>

      <div className="controls-bar">
        <div className="search-wrap">
          <i className="search-icon">🔍</i>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tenant…" />
        </div>
      </div>

      {loading ? (
        <div className="loading-wrap"><span className="loader" /></div>
      ) : filteredGroups.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📄</div>
          <div className="empty-title">No Documents Found</div>
          <p>{search ? 'No tenants match that search.' : 'Click "Add Document" to start tracking KYC and agreements.'}</p>
        </div>
      ) : (
        <div className="doc-groups">
          {filteredGroups.map((g) => (
            <div key={g.tenant.id} className="doc-group">
              <div className="doc-group-header">
                <span className="tenant-name">👤 {g.tenant.name}</span>
                <span className="doc-count">{g.docs.length} doc{g.docs.length !== 1 ? 's' : ''}</span>
              </div>

              {g.docs.length === 0 ? (
                <div className="no-docs">No documents on file for this tenant.</div>
              ) : (
                <div className="doc-list">
                  {g.docs.map((d) => {
                    const exp = isExpired(d.expiry_date);
                    const soon = isExpiringSoon(d.expiry_date);
                    return (
                      <div key={d.id} className={`doc-item ${exp ? 'is-expired' : soon ? 'is-expiring' : ''}`}>
                        <div className="doc-info">
                          <span className="doc-type">📎 {d.type}</span>
                          {d.expiry_date && (
                            <span className={`doc-expiry ${exp ? 'text-red' : soon ? 'text-yellow' : 'text-muted'}`}>
                              Expires: {formatDate(d.expiry_date)}
                              {exp && ' ⚠️ Expired'}{!exp && soon && ' ⚠️ Soon'}
                            </span>
                          )}
                          {d.file_url && (
                            <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="doc-link">
                              View ↗
                            </a>
                          )}
                        </div>
                        <button className="action-btn delete" onClick={() => handleDelete(d)}>Delete</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <AddDocModal
          tenants={tenants}
          onSave={handleAddDoc}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
