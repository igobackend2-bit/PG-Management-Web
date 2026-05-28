import React, { useEffect, useState } from 'react';
import type { TenantRow, TenantInsert, RoomWithBeds, BedItem } from '../services/tenants.service';
import { createTenant, updateTenant } from '../services/tenants.service';

interface Props {
  branchId: string;
  tenant: TenantRow | null;   // null = add mode
  rooms: RoomWithBeds[];
  onSave: (t: TenantRow) => void;
  onClose: () => void;
}

type FormState = {
  name: string;
  phone: string;
  email: string;
  room_id: string;
  bed_id: string;
  doj: string;
  advance: string;
  advance_paid: boolean;
  occupation: string;
  company_college: string;
  address: string;
  kyc_status: string;
};

const today = new Date().toISOString().slice(0, 10);

function emptyForm(): FormState {
  return {
    name: '', phone: '', email: '',
    room_id: '', bed_id: '',
    doj: today, advance: '0', advance_paid: false,
    occupation: '', company_college: '', address: '',
    kyc_status: 'pending',
  };
}

function tenantToForm(t: TenantRow): FormState {
  return {
    name:            t.name,
    phone:           t.phone           ?? '',
    email:           t.email           ?? '',
    room_id:         t.room_id         ?? '',
    bed_id:          t.bed_id          ?? '',
    doj:             t.doj             ?? today,
    advance:         String(t.advance  ?? 0),
    advance_paid:    t.advance_paid    ?? false,
    occupation:      t.occupation      ?? '',
    company_college: t.company_college ?? '',
    address:         t.address         ?? '',
    kyc_status:      t.kyc_status      ?? 'pending',
  };
}

export function TenantModal({ branchId, tenant, rooms, onSave, onClose }: Props) {
  const isEdit = Boolean(tenant);
  const [form, setForm] = useState<FormState>(tenant ? tenantToForm(tenant) : emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Reset form when tenant prop changes
  useEffect(() => {
    setForm(tenant ? tenantToForm(tenant) : emptyForm());
    setError('');
  }, [tenant]);

  // Beds for selected room
  const selectedRoom = rooms.find((r) => r.id === form.room_id);
  const availableBeds: BedItem[] = (selectedRoom?.beds ?? []).filter(
    (b) => !b.is_occupied || b.id === tenant?.bed_id
  );

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: val };
      // Clear bed when room changes
      if (key === 'room_id') next.bed_id = '';
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Tenant name is required.'); return; }

    setSaving(true);
    setError('');
    try {
      const payload: TenantInsert = {
        branch_id:       branchId,
        name:            form.name.trim(),
        phone:           form.phone   || null,
        email:           form.email   || null,
        room_id:         form.room_id || null,
        bed_id:          form.bed_id  || null,
        doj:             form.doj     || null,
        advance:         Number(form.advance) || 0,
        advance_paid:    form.advance_paid,
        occupation:      form.occupation      || null,
        company_college: form.company_college || null,
        address:         form.address         || null,
        kyc_status:      form.kyc_status,
      };

      const saved = isEdit && tenant
        ? await updateTenant(tenant.id, payload)
        : await createTenant(payload);

      // Update bed occupancy if bed was assigned
      onSave(saved);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save tenant.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-panel">
        <div className="modal-header">
          <h3>{isEdit ? 'Edit Tenant' : 'Add New Tenant'}</h3>
          <button className="modal-close" onClick={onClose} type="button">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid">

              {/* Name */}
              <div className="form-group">
                <label>Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Full name"
                  required
                />
              </div>

              {/* Phone */}
              <div className="form-group">
                <label>Phone</label>
                <input
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="Mobile number"
                />
              </div>

              {/* Email */}
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="email@example.com"
                />
              </div>

              {/* DOJ */}
              <div className="form-group">
                <label>Date of Joining</label>
                <input
                  type="date"
                  value={form.doj}
                  onChange={(e) => set('doj', e.target.value)}
                />
              </div>

              {/* Room */}
              <div className="form-group">
                <label>Room</label>
                <select
                  value={form.room_id}
                  onChange={(e) => set('room_id', e.target.value)}
                >
                  <option value="">— Select room —</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      Room {r.number} ({r.type ?? 'N/A'}) — ₹{r.rent}
                    </option>
                  ))}
                </select>
              </div>

              {/* Bed */}
              <div className="form-group">
                <label>Bed</label>
                <select
                  value={form.bed_id}
                  onChange={(e) => set('bed_id', e.target.value)}
                  disabled={!form.room_id}
                >
                  <option value="">— Select bed —</option>
                  {availableBeds.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.label ?? `Bed ${b.id.slice(0, 4)}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Advance */}
              <div className="form-group">
                <label>Advance (₹)</label>
                <input
                  type="number"
                  value={form.advance}
                  onChange={(e) => set('advance', e.target.value)}
                  min="0"
                />
              </div>

              {/* KYC Status */}
              <div className="form-group">
                <label>KYC Status</label>
                <select
                  value={form.kyc_status}
                  onChange={(e) => set('kyc_status', e.target.value)}
                >
                  <option value="pending">Pending</option>
                  <option value="partial">Partial</option>
                  <option value="complete">Complete</option>
                </select>
              </div>

              {/* Advance Paid checkbox */}
              <div className="form-group">
                <label>Advance Paid?</label>
                <div className="checkbox-row">
                  <input
                    type="checkbox"
                    id="adv-paid"
                    checked={form.advance_paid}
                    onChange={(e) => set('advance_paid', e.target.checked)}
                  />
                  <span>Mark advance as received</span>
                </div>
              </div>

              {/* Occupation */}
              <div className="form-group">
                <label>Occupation</label>
                <input
                  value={form.occupation}
                  onChange={(e) => set('occupation', e.target.value)}
                  placeholder="Job / Course"
                />
              </div>

              {/* Company / College */}
              <div className="form-group">
                <label>Company / College</label>
                <input
                  value={form.company_college}
                  onChange={(e) => set('company_college', e.target.value)}
                  placeholder="Employer or institution"
                />
              </div>

              {/* Address */}
              <div className="form-group full">
                <label>Home Address</label>
                <textarea
                  value={form.address}
                  onChange={(e) => set('address', e.target.value)}
                  placeholder="Permanent address"
                />
              </div>

            </div>
          </div>

          <div className="modal-footer">
            <span className="modal-error">{error}</span>
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-save" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Tenant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
