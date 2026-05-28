import React, { useCallback, useEffect, useState } from 'react';
import { useBranchStore } from '../../../store/branchStore';
import { useToast } from '../../../shared/hooks/useToast';
import {
  fetchActiveTenantsForRent,
  fetchRentRecordsForMonth,
  fetchExpenses,
  fetchCashbook,
  upsertRentRecord,
  createExpense,
  deleteExpense,
  createCashbookEntry,
  type TenantForRent,
  type RentRecord,
  type Expense,
  type CashbookEntry,
} from '../services/accounts.service';
import './AccountsPage.scss';

type Tab = 'rent' | 'expenses' | 'cashbook' | 'pl';

const CURRENCY = (n: number) => '₹' + n.toLocaleString('en-IN');

const EXPENSE_CATEGORIES = [
  'Electricity', 'Water', 'Maintenance', 'Salary', 'Groceries',
  'Internet', 'Gas', 'Cleaning', 'Rent', 'Other',
];

const PAYMENT_METHODS = ['cash', 'upi', 'bank_transfer', 'cheque'];

// ─────────────────────────────────────────────────────────────────────────────
// AccountsPage
// ─────────────────────────────────────────────────────────────────────────────
export function AccountsPage() {
  const { selectedBranch } = useBranchStore();
  const toast = useToast();

  const [tab, setTab] = useState<Tab>('rent');

  // current month as YYYY-MM
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  // Rent state
  const [tenants, setTenants] = useState<TenantForRent[]>([]);
  const [rentRecords, setRentRecords] = useState<RentRecord[]>([]);
  const [loadingRent, setLoadingRent] = useState(false);
  const [payModal, setPayModal] = useState<TenantForRent | null>(null);
  const [payForm, setPayForm] = useState({ amount: '', method: 'cash', paidAt: '' });
  const [payError, setPayError] = useState('');
  const [payingId, setPayingId] = useState('');
  const [generatingRent, setGeneratingRent] = useState(false);

  // Expenses state
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loadingExp, setLoadingExp] = useState(false);
  const [expModal, setExpModal] = useState(false);
  const [expForm, setExpForm] = useState({
    category: 'Maintenance', amount: '', vendor: '', description: '', date: new Date().toISOString().slice(0, 10), is_recurring: false,
  });
  const [expError, setExpError] = useState('');
  const [savingExp, setSavingExp] = useState(false);

  // Cashbook state
  const [cashbook, setCashbook] = useState<CashbookEntry[]>([]);
  const [loadingCash, setLoadingCash] = useState(false);
  const [cashModal, setCashModal] = useState(false);
  const [cashForm, setCashForm] = useState({
    type: 'in', amount: '', method: 'cash', description: '', date: new Date().toISOString().slice(0, 10),
  });
  const [cashError, setCashError] = useState('');
  const [savingCash, setSavingCash] = useState(false);

  // ─── Loaders ───────────────────────────────────────────────────────────────
  const loadRent = useCallback(async () => {
    if (!selectedBranch) return;
    setLoadingRent(true);
    try {
      const t = await fetchActiveTenantsForRent(selectedBranch.id);
      setTenants(t);
      const ids = t.map((x) => x.id);
      const records = await fetchRentRecordsForMonth(ids, month);
      setRentRecords(records);
    } catch { toast.error('Failed to load rent data.'); }
    finally { setLoadingRent(false); }
  }, [selectedBranch, month]);

  const loadExpenses = useCallback(async () => {
    if (!selectedBranch) return;
    setLoadingExp(true);
    try {
      setExpenses(await fetchExpenses(selectedBranch.id));
    } catch { toast.error('Failed to load expenses.'); }
    finally { setLoadingExp(false); }
  }, [selectedBranch]);

  const loadCashbook = useCallback(async () => {
    if (!selectedBranch) return;
    setLoadingCash(true);
    try {
      setCashbook(await fetchCashbook(selectedBranch.id));
    } catch { toast.error('Failed to load cashbook.'); }
    finally { setLoadingCash(false); }
  }, [selectedBranch]);

  useEffect(() => { if (tab === 'rent')      loadRent();     }, [tab, loadRent]);
  useEffect(() => { if (tab === 'expenses')  loadExpenses(); }, [tab, loadExpenses]);
  useEffect(() => { if (tab === 'cashbook' || tab === 'pl') loadCashbook(); }, [tab, loadCashbook]);
  // NOTE: No separate [month] effect needed — loadRent already has `month` in its
  // useCallback deps, so the [tab, loadRent] effect above re-fires whenever month changes.

  // ─── Rent helpers ──────────────────────────────────────────────────────────
  function rentForTenant(tenantId: string) {
    return rentRecords.find((r) => r.tenant_id === tenantId) ?? null;
  }

  function rentStatus(record: RentRecord | null, roomRent: number): 'paid' | 'partial' | 'unpaid' {
    if (!record) return 'unpaid';
    if ((record.paid_amount ?? 0) >= record.amount) return 'paid';
    return 'partial';
  }

  /** Convert datetime-local string (YYYY-MM-DDTHH:mm) → UTC ISO string */
  function localDatetimeToISO(local: string): string {
    if (!local) return new Date().toISOString();
    // datetime-local has no timezone — treat as local time
    return new Date(local).toISOString();
  }

  async function handleMarkPaid() {
    if (!payModal) return;
    const paidAmt = Number(payForm.amount);
    if (!paidAmt) { setPayError('Enter a valid amount.'); return; }

    const existing   = rentForTenant(payModal.id);
    const roomRent   = payModal.rooms?.rent ?? 0;
    const rentAmount = existing?.amount ?? (roomRent || paidAmt);
    const paidAt     = localDatetimeToISO(payForm.paidAt);

    setPayingId(payModal.id);
    setPayError('');
    try {
      await upsertRentRecord(payModal.id, month, rentAmount, paidAmt, payForm.method, paidAt);
      toast.success('Rent recorded successfully!');
      setPayModal(null);
      loadRent();
    } catch (err: unknown) {
      setPayError(err instanceof Error ? err.message : 'Failed to record payment.');
    } finally {
      setPayingId('');
    }
  }

  /** Auto-generate rent records for all tenants who don't have one for the month */
  async function handleGenerateRent() {
    if (!tenants.length) return;
    const missing = tenants.filter((t) => {
      const rec = rentForTenant(t.id);
      return !rec && (t.rooms?.rent ?? 0) > 0;
    });
    if (missing.length === 0) { toast.info('All tenants already have rent records for this month.'); return; }
    setGeneratingRent(true);
    try {
      await Promise.all(
        missing.map((t) =>
          upsertRentRecord(t.id, month, t.rooms!.rent, 0, 'cash')
        )
      );
      toast.success(`Generated rent records for ${missing.length} tenant(s).`);
      loadRent();
    } catch { toast.error('Failed to generate rent records.'); }
    finally { setGeneratingRent(false); }
  }

  // ─── Expense helpers ───────────────────────────────────────────────────────
  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!expForm.amount) { setExpError('Enter an amount.'); return; }
    if (!selectedBranch) return;

    setSavingExp(true);
    setExpError('');
    try {
      await createExpense({
        branch_id:    selectedBranch.id,
        category:     expForm.category,
        amount:       Number(expForm.amount),
        vendor:       expForm.vendor || null,
        description:  expForm.description || null,
        date:         expForm.date,
        is_recurring: expForm.is_recurring,
      });
      toast.success('Expense added.');
      setExpModal(false);
      setExpForm({ category: 'Maintenance', amount: '', vendor: '', description: '', date: new Date().toISOString().slice(0, 10), is_recurring: false });
      loadExpenses();
    } catch (err: unknown) {
      setExpError(err instanceof Error ? err.message : 'Failed to save expense.');
    } finally {
      setSavingExp(false);
    }
  }

  async function handleDeleteExpense(id: string, desc: string) {
    if (!window.confirm(`Delete expense "${desc}"?`)) return;
    try {
      await deleteExpense(id);
      toast.success('Expense deleted.');
      loadExpenses();
    } catch { toast.error('Failed to delete expense.'); }
  }

  // ─── Cashbook helpers ──────────────────────────────────────────────────────
  async function handleAddCashEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!cashForm.amount) { setCashError('Enter an amount.'); return; }
    if (!selectedBranch) return;

    setSavingCash(true);
    setCashError('');
    try {
      await createCashbookEntry({
        branch_id:   selectedBranch.id,
        type:        cashForm.type,
        amount:      Number(cashForm.amount),
        method:      cashForm.method,
        description: cashForm.description || '',
        date:        cashForm.date,
      });
      toast.success('Cash entry added.');
      setCashModal(false);
      setCashForm({ type: 'in', amount: '', method: 'cash', description: '', date: new Date().toISOString().slice(0, 10) });
      loadCashbook();
    } catch (err: unknown) {
      setCashError(err instanceof Error ? err.message : 'Failed to save entry.');
    } finally {
      setSavingCash(false);
    }
  }

  // ─── P&L computations ─────────────────────────────────────────────────────
  const totalRentCollected = rentRecords.reduce((s, r) => s + (r.paid_amount ?? 0), 0);
  const totalExpenses      = expenses.reduce((s, e) => s + e.amount, 0);
  const cashIn             = cashbook.filter((c) => c.type === 'in').reduce((s, c) => s + c.amount, 0);
  const cashOut            = cashbook.filter((c) => c.type === 'out').reduce((s, c) => s + c.amount, 0);
  const netProfit          = cashIn - cashOut;
  const profitMargin       = cashIn > 0 ? Math.round((netProfit / cashIn) * 100) : 0;

  // ─── Guard: no branch ──────────────────────────────────────────────────────
  if (!selectedBranch) {
    return (
      <div className="accounts-page">
        <div className="empty-state">
          <div className="empty-icon">🏢</div>
          <div className="empty-title">No Branch Selected</div>
          <p>Go to Branches to create or select a branch first.</p>
        </div>
      </div>
    );
  }

  // ─── Rent summary for current month ───────────────────────────────────────
  const paidCount    = tenants.filter((t) => rentStatus(rentForTenant(t.id), 0) === 'paid').length;
  const partialCount = tenants.filter((t) => rentStatus(rentForTenant(t.id), 0) === 'partial').length;
  const unpaidCount  = tenants.length - paidCount - partialCount;
  const totalDue     = rentRecords.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="accounts-page">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="page-header">
        <div className="header-left">
          <h2>Accounts</h2>
          <span className="branch-tag">{selectedBranch.name}</span>
        </div>
        {tab === 'rent' && tenants.length > 0 && (
          <button className="btn-action" onClick={handleGenerateRent} disabled={generatingRent}>
            {generatingRent ? 'Generating…' : '⚡ Generate Rent'}
          </button>
        )}
        {tab === 'expenses' && (
          <button className="btn-action" onClick={() => setExpModal(true)}>+ Add Expense</button>
        )}
        {tab === 'cashbook' && (
          <button className="btn-action" onClick={() => setCashModal(true)}>+ Add Entry</button>
        )}
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div className="tab-bar">
        {(['rent', 'expenses', 'cashbook', 'pl'] as Tab[]).map((t) => (
          <button
            key={t}
            className={`tab-btn ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'rent' ? '₹ Rent' : t === 'expenses' ? '🧾 Expenses' : t === 'cashbook' ? '📒 Cashbook' : '📊 P&L'}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          RENT TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'rent' && (
        <>
          {/* Month + summary */}
          <div className="month-bar">
            <label>Month:</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>

          <div className="summary-row">
            <div className="summary-card blue">
              <div className="s-label">Tenants</div>
              <div className="s-value">{tenants.length}</div>
            </div>
            <div className="summary-card green">
              <div className="s-label">Paid</div>
              <div className="s-value">{paidCount}</div>
            </div>
            <div className="summary-card yellow">
              <div className="s-label">Partial / Unpaid</div>
              <div className="s-value">{partialCount + unpaidCount}</div>
            </div>
            <div className="summary-card green">
              <div className="s-label">Collected</div>
              <div className="s-value">{CURRENCY(totalRentCollected)}</div>
            </div>
          </div>

          {loadingRent ? (
            <div className="loading-wrap"><span className="loader" /></div>
          ) : tenants.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">₹</div>
              <div className="empty-title">No Active Tenants</div>
              <p>Add tenants from the Tenants module to track rent.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Tenant</th>
                    <th>Room</th>
                    <th>Due Amount</th>
                    <th>Paid Amount</th>
                    <th>Method</th>
                    <th>Paid On</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((t) => {
                    const record   = rentForTenant(t.id);
                    const roomRent = t.rooms?.rent ?? 0;
                    const dueAmt   = record?.amount ?? roomRent;
                    const status   = rentStatus(record, roomRent);
                    return (
                      <tr key={t.id}>
                        <td style={{ fontWeight: 600 }}>{t.name}</td>
                        <td className="muted">{t.rooms?.number ? `Room ${t.rooms.number}` : '—'}</td>
                        <td style={{ fontWeight: 600 }}>{dueAmt ? CURRENCY(dueAmt) : '—'}</td>
                        <td style={{ color: record?.paid_amount ? '#2e9e4f' : undefined }}>
                          {record?.paid_amount ? CURRENCY(record.paid_amount) : '—'}
                        </td>
                        <td className="muted" style={{ textTransform: 'capitalize' }}>
                          {record?.payment_method ?? '—'}
                        </td>
                        <td className="muted">
                          {record?.paid_at ? (
                            <span>
                              {new Date(record.paid_at).toLocaleDateString('en-IN')}
                              <span className="paid-time">
                                {' '}{new Date(record.paid_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </span>
                          ) : '—'}
                        </td>
                        <td>
                          <span className={`status-badge ${status}`}>
                            {status === 'paid' ? 'Paid' : status === 'partial' ? 'Partial' : 'Unpaid'}
                          </span>
                        </td>
                        <td>
                          <button
                            className="action-btn pay"
                            onClick={() => {
                              // Pre-fill paidAt: use existing paid_at if already paid, else now
                              const existingPaidAt = record?.paid_at
                                ? new Date(record.paid_at)
                                : new Date();
                              const localStr = new Date(
                                existingPaidAt.getTime() - existingPaidAt.getTimezoneOffset() * 60000
                              ).toISOString().slice(0, 16);
                              setPayModal(t);
                              setPayForm({
                                amount: String(record?.paid_amount || dueAmt || ''),
                                method: record?.payment_method ?? 'cash',
                                paidAt: localStr,
                              });
                              setPayError('');
                            }}
                          >
                            {status === 'paid' ? 'Edit' : '✓ Collect'}
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

      {/* ══════════════════════════════════════════════════════════════════════
          EXPENSES TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'expenses' && (
        <>
          <div className="summary-row">
            <div className="summary-card red">
              <div className="s-label">Total Expenses</div>
              <div className="s-value">{CURRENCY(totalExpenses)}</div>
            </div>
            <div className="summary-card yellow">
              <div className="s-label">This Month</div>
              <div className="s-value">
                {CURRENCY(
                  expenses
                    .filter((e) => e.date.startsWith(month))
                    .reduce((s, e) => s + e.amount, 0)
                )}
              </div>
            </div>
            <div className="summary-card blue">
              <div className="s-label">Entries</div>
              <div className="s-value">{expenses.length}</div>
            </div>
            <div className="summary-card yellow">
              <div className="s-label">Recurring</div>
              <div className="s-value">{expenses.filter((e) => e.is_recurring).length}</div>
            </div>
          </div>

          {loadingExp ? (
            <div className="loading-wrap"><span className="loader" /></div>
          ) : expenses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🧾</div>
              <div className="empty-title">No Expenses Yet</div>
              <p>Click "Add Expense" to record your first expense.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Vendor</th>
                    <th>Description</th>
                    <th>Recurring</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => (
                    <tr key={e.id}>
                      <td className="muted">{e.date}</td>
                      <td>{e.category}</td>
                      <td style={{ fontWeight: 600, color: '#f14c3a' }}>{CURRENCY(e.amount)}</td>
                      <td className="muted">{e.vendor ?? '—'}</td>
                      <td className="muted">{e.description ?? '—'}</td>
                      <td className="muted">{e.is_recurring ? '✓ Yes' : 'No'}</td>
                      <td>
                        <button
                          className="action-btn delete"
                          onClick={() => handleDeleteExpense(e.id, e.description ?? e.category)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          CASHBOOK TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'cashbook' && (
        <>
          <div className="summary-row">
            <div className="summary-card green">
              <div className="s-label">Total In</div>
              <div className="s-value">{CURRENCY(cashIn)}</div>
            </div>
            <div className="summary-card red">
              <div className="s-label">Total Out</div>
              <div className="s-value">{CURRENCY(cashOut)}</div>
            </div>
            <div className={`summary-card ${netProfit >= 0 ? 'green' : 'red'}`}>
              <div className="s-label">Balance</div>
              <div className="s-value">{CURRENCY(netProfit)}</div>
            </div>
            <div className="summary-card blue">
              <div className="s-label">Entries</div>
              <div className="s-value">{cashbook.length}</div>
            </div>
          </div>

          {loadingCash ? (
            <div className="loading-wrap"><span className="loader" /></div>
          ) : cashbook.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📒</div>
              <div className="empty-title">No Cash Entries</div>
              <p>Click "Add Entry" to record your first cashbook entry.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {cashbook.map((c) => (
                    <tr key={c.id}>
                      <td className="muted">{c.date}</td>
                      <td>
                        <span className={`status-badge ${c.type === 'in' ? 'paid' : 'unpaid'}`}>
                          {c.type === 'in' ? '↓ In' : '↑ Out'}
                        </span>
                      </td>
                      <td className={c.type === 'in' ? 'amount-in' : 'amount-out'}>
                        {CURRENCY(c.amount)}
                      </td>
                      <td className="muted" style={{ textTransform: 'capitalize' }}>
                        {c.method}
                      </td>
                      <td className="muted">{c.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          P&L TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'pl' && (
        <>
          <div className="pl-grid">
            <div className="pl-card">
              <div className="pl-icon">💰</div>
              <div className="pl-label">Total Cash In</div>
              <div className="pl-value">{CURRENCY(cashIn)}</div>
              <div className="pl-sub">{cashbook.filter((c) => c.type === 'in').length} entries</div>
            </div>
            <div className="pl-card">
              <div className="pl-icon">💸</div>
              <div className="pl-label">Total Cash Out</div>
              <div className="pl-value">{CURRENCY(cashOut)}</div>
              <div className="pl-sub">{cashbook.filter((c) => c.type === 'out').length} entries</div>
            </div>
            <div className={`pl-card ${netProfit >= 0 ? 'profit' : 'loss'}`}>
              <div className="pl-icon">{netProfit >= 0 ? '📈' : '📉'}</div>
              <div className="pl-label">Net Profit</div>
              <div className="pl-value">{CURRENCY(netProfit)}</div>
              <div className="pl-sub">{netProfit >= 0 ? 'Profit' : 'Loss'}</div>
            </div>
            <div className="pl-card">
              <div className="pl-icon">📊</div>
              <div className="pl-label">Profit Margin</div>
              <div className="pl-value">{profitMargin}%</div>
              <div className="pl-sub">of total revenue</div>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>% of Revenue</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Rent Collected', amount: totalRentCollected, type: 'in' },
                  { label: 'Cash In (other)', amount: cashIn - totalRentCollected > 0 ? cashIn - totalRentCollected : 0, type: 'in' },
                  { label: 'Expenses', amount: totalExpenses, type: 'out' },
                  { label: 'Cash Out (other)', amount: cashOut, type: 'out' },
                ].map((row) => (
                  <tr key={row.label}>
                    <td style={{ fontWeight: 600 }}>{row.label}</td>
                    <td className={row.type === 'in' ? 'amount-in' : 'amount-out'}>
                      {CURRENCY(row.amount)}
                    </td>
                    <td className="muted">
                      {cashIn > 0 ? Math.round((row.amount / cashIn) * 100) + '%' : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MARK RENT PAID MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      {payModal && (
        <div className="mini-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setPayModal(null); }}>
          <div className="mini-modal">
            <div className="mini-modal-header">
              <h4>Collect Rent — {payModal.name}</h4>
              <button onClick={() => setPayModal(null)}>✕</button>
            </div>
            <div className="mini-modal-body">
              {payModal.rooms?.rent ? (
                <p style={{ fontSize: 13, color: '#555', marginBottom: 12 }}>
                  Monthly rent: <strong>{CURRENCY(payModal.rooms.rent)}</strong>
                  {rentForTenant(payModal.id)?.paid_amount ? ` · Already paid: ${CURRENCY(rentForTenant(payModal.id)!.paid_amount!)}` : ''}
                </p>
              ) : null}
              <div className="form-group">
                <label>Amount Collected (₹) *</label>
                <input
                  type="number"
                  value={payForm.amount}
                  onChange={(e) => setPayForm((p) => ({ ...p, amount: e.target.value }))}
                  placeholder="Enter amount paid"
                  min="1"
                />
              </div>
              <div className="form-group">
                <label>Payment Method</label>
                <select
                  value={payForm.method}
                  onChange={(e) => setPayForm((p) => ({ ...p, method: e.target.value }))}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m} style={{ textTransform: 'capitalize' }}>
                      {m.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Payment Date &amp; Time</label>
                <input
                  type="datetime-local"
                  value={payForm.paidAt}
                  max={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                  onChange={(e) => setPayForm((p) => ({ ...p, paidAt: e.target.value }))}
                />
                <span className="pay-dt-hint">Defaults to now — change only if collecting for a past date</span>
              </div>
            </div>
            <div className="mini-modal-footer">
              <span className="error-msg">{payError}</span>
              <button className="btn-cancel" onClick={() => setPayModal(null)}>Cancel</button>
              <button
                className="btn-save"
                onClick={handleMarkPaid}
                disabled={Boolean(payingId)}
              >
                {payingId ? 'Saving…' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          ADD EXPENSE MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      {expModal && (
        <div className="mini-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setExpModal(false); }}>
          <div className="mini-modal">
            <div className="mini-modal-header">
              <h4>Add Expense</h4>
              <button onClick={() => setExpModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddExpense}>
              <div className="mini-modal-body">
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={expForm.category}
                    onChange={(e) => setExpForm((p) => ({ ...p, category: e.target.value }))}
                  >
                    {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Amount (₹) *</label>
                  <input
                    type="number"
                    value={expForm.amount}
                    onChange={(e) => setExpForm((p) => ({ ...p, amount: e.target.value }))}
                    placeholder="0"
                    min="1"
                  />
                </div>
                <div className="form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    value={expForm.date}
                    onChange={(e) => setExpForm((p) => ({ ...p, date: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Vendor</label>
                  <input
                    value={expForm.vendor}
                    onChange={(e) => setExpForm((p) => ({ ...p, vendor: e.target.value }))}
                    placeholder="Vendor name"
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={expForm.description}
                    onChange={(e) => setExpForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Details…"
                  />
                </div>
              </div>
              <div className="mini-modal-footer">
                <span className="error-msg">{expError}</span>
                <button type="button" className="btn-cancel" onClick={() => setExpModal(false)}>Cancel</button>
                <button type="submit" className="btn-save" disabled={savingExp}>
                  {savingExp ? 'Saving…' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          ADD CASHBOOK ENTRY MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      {cashModal && (
        <div className="mini-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setCashModal(false); }}>
          <div className="mini-modal">
            <div className="mini-modal-header">
              <h4>Add Cashbook Entry</h4>
              <button onClick={() => setCashModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddCashEntry}>
              <div className="mini-modal-body">
                <div className="form-group">
                  <label>Type</label>
                  <select
                    value={cashForm.type}
                    onChange={(e) => setCashForm((p) => ({ ...p, type: e.target.value }))}
                  >
                    <option value="in">Cash In (Income)</option>
                    <option value="out">Cash Out (Expense)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Amount (₹) *</label>
                  <input
                    type="number"
                    value={cashForm.amount}
                    onChange={(e) => setCashForm((p) => ({ ...p, amount: e.target.value }))}
                    placeholder="0"
                    min="1"
                  />
                </div>
                <div className="form-group">
                  <label>Payment Method</label>
                  <select
                    value={cashForm.method}
                    onChange={(e) => setCashForm((p) => ({ ...p, method: e.target.value }))}
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>{m.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    value={cashForm.date}
                    onChange={(e) => setCashForm((p) => ({ ...p, date: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={cashForm.description}
                    onChange={(e) => setCashForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Brief description…"
                  />
                </div>
              </div>
              <div className="mini-modal-footer">
                <span className="error-msg">{cashError}</span>
                <button type="button" className="btn-cancel" onClick={() => setCashModal(false)}>Cancel</button>
                <button type="submit" className="btn-save" disabled={savingCash}>
                  {savingCash ? 'Saving…' : 'Add Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
