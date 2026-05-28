import React, { useCallback, useEffect, useState } from 'react';
import { useBranchStore } from '../../../store/branchStore';
import { useToast } from '../../../shared/hooks/useToast';
import { supabase } from '../../../services/supabase';
import {
  fetchMealTracking, upsertMeal, fetchFoodPurchases, createFoodPurchase, deleteFoodPurchase,
  MEAL_TYPES, type MealTracking, type FoodPurchase,
} from '../services/food.service';
import './FoodPage.scss';

type Tab = 'meals' | 'purchases';

const CURRENCY = (n: number) => '₹' + n.toLocaleString('en-IN');
const todayStr = () => new Date().toISOString().slice(0, 10);

async function uploadBill(file: File, branchId: string): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${branchId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('food-bills')
    .upload(path, file, { upsert: false });
  if (error) throw new Error(`Bill upload failed: ${error.message}`);
  const { data } = supabase.storage.from('food-bills').getPublicUrl(path);
  return data.publicUrl;
}

const MEAL_ICONS: Record<string, string> = { breakfast: '🌅', lunch: '☀️', dinner: '🌙' };

// ─── FoodPage ─────────────────────────────────────────────────────────────────
export function FoodPage() {
  const { selectedBranch } = useBranchStore();
  const toast = useToast();

  const [tab, setTab] = useState<Tab>('meals');

  // Meal tracking state
  const [mealDate, setMealDate]     = useState(todayStr);
  const [mealData, setMealData]     = useState<MealTracking[]>([]);
  const [mealForm, setMealForm]     = useState<Record<string, { count: string; cost: string }>>({
    breakfast: { count: '0', cost: '' },
    lunch:     { count: '0', cost: '' },
    dinner:    { count: '0', cost: '' },
  });
  const [loadingMeals, setLoadingMeals] = useState(false);
  const [savingMeals, setSavingMeals]   = useState(false);

  // Purchases state
  const [purchases, setPurchases]       = useState<FoodPurchase[]>([]);
  const [loadingPurch, setLoadingPurch] = useState(false);
  const [showPurchModal, setShowPurchModal] = useState(false);
  const [purchForm, setPurchForm] = useState({
    date: todayStr(), vendor: '', items_desc: '', total: '',
  });
  const [billFile, setBillFile]   = useState<File | null>(null);
  const [purchError, setPurchError] = useState('');
  const [savingPurch, setSavingPurch] = useState(false);

  // ─── Loaders ───────────────────────────────────────────────────────────────
  const loadMeals = useCallback(async () => {
    if (!selectedBranch) return;
    setLoadingMeals(true);
    try {
      const data = await fetchMealTracking(selectedBranch.id, mealDate);
      setMealData(data);
      // Populate form from DB
      const next: typeof mealForm = {
        breakfast: { count: '0', cost: '' },
        lunch:     { count: '0', cost: '' },
        dinner:    { count: '0', cost: '' },
      };
      data.forEach((m) => {
        next[m.meal_type] = { count: String(m.count), cost: m.cost != null ? String(m.cost) : '' };
      });
      setMealForm(next);
    } catch { toast.error('Failed to load meal data.'); }
    finally { setLoadingMeals(false); }
  }, [selectedBranch, mealDate]);

  const loadPurchases = useCallback(async () => {
    if (!selectedBranch) return;
    setLoadingPurch(true);
    try { setPurchases(await fetchFoodPurchases(selectedBranch.id)); }
    catch { toast.error('Failed to load purchases.'); }
    finally { setLoadingPurch(false); }
  }, [selectedBranch]);

  useEffect(() => { if (tab === 'meals')     loadMeals();     }, [tab, loadMeals]);
  useEffect(() => { if (tab === 'purchases') loadPurchases(); }, [tab, loadPurchases]);

  // ─── Meal save ─────────────────────────────────────────────────────────────
  async function handleSaveMeals() {
    if (!selectedBranch) return;
    setSavingMeals(true);
    try {
      await Promise.all(
        MEAL_TYPES.map((mt) =>
          upsertMeal(
            selectedBranch.id,
            mealDate,
            mt,
            Number(mealForm[mt].count) || 0,
            mealForm[mt].cost ? Number(mealForm[mt].cost) : null
          )
        )
      );
      toast.success('Meal data saved!');
      loadMeals();
    } catch { toast.error('Failed to save meal data.'); }
    finally { setSavingMeals(false); }
  }

  // ─── Purchase save ─────────────────────────────────────────────────────────
  async function handleAddPurchase(e: React.FormEvent) {
    e.preventDefault();
    if (!purchForm.total) { setPurchError('Enter total amount.'); return; }
    if (!selectedBranch) return;
    setSavingPurch(true); setPurchError('');
    try {
      let bill_url: string | null = null;
      if (billFile) {
        try { bill_url = await uploadBill(billFile, selectedBranch.id); }
        catch (uploadErr: unknown) {
          setPurchError(uploadErr instanceof Error ? uploadErr.message : 'Bill upload failed.');
          setSavingPurch(false); return;
        }
      }
      await createFoodPurchase({
        branch_id: selectedBranch.id,
        date:      purchForm.date,
        vendor:    purchForm.vendor || null,
        total:     Number(purchForm.total),
        items:     purchForm.items_desc ? { note: purchForm.items_desc } : null,
        bill_url,
      });
      toast.success('Purchase recorded!');
      setShowPurchModal(false);
      setPurchForm({ date: todayStr(), vendor: '', items_desc: '', total: '' });
      setBillFile(null);
      loadPurchases();
    } catch (err: unknown) {
      setPurchError(err instanceof Error ? err.message : 'Failed to save.');
    } finally { setSavingPurch(false); }
  }

  async function handleDeletePurchase(p: FoodPurchase) {
    if (!window.confirm(`Delete purchase from ${p.vendor ?? 'vendor'}?`)) return;
    try { await deleteFoodPurchase(p.id); toast.success('Purchase deleted.'); loadPurchases(); }
    catch { toast.error('Failed to delete.'); }
  }

  // ─── Derived ───────────────────────────────────────────────────────────────
  const totalMealsToday = MEAL_TYPES.reduce((s, mt) => s + (Number(mealForm[mt].count) || 0), 0);
  const totalCostToday  = MEAL_TYPES.reduce((s, mt) => s + (Number(mealForm[mt].cost) || 0), 0);
  const totalPurchases  = purchases.reduce((s, p) => s + p.total, 0);

  if (!selectedBranch) return (
    <div className="food-page"><div className="empty-state"><div className="empty-icon">🏢</div><div className="empty-title">No Branch Selected</div></div></div>
  );

  return (
    <div className="food-page">
      <div className="page-header">
        <div className="header-left"><h2>Food & Kitchen</h2><span className="branch-tag">{selectedBranch.name}</span></div>
        {tab === 'purchases' && (
          <button className="btn-add" onClick={() => { setPurchForm({ date: todayStr(), vendor: '', items_desc: '', total: '' }); setBillFile(null); setPurchError(''); setShowPurchModal(true); }}>+ Add Purchase</button>
        )}
      </div>

      <div className="tab-bar">
        <button className={`tab-btn ${tab === 'meals' ? 'active' : ''}`} onClick={() => setTab('meals')}>🍽 Meal Tracking</button>
        <button className={`tab-btn ${tab === 'purchases' ? 'active' : ''}`} onClick={() => setTab('purchases')}>🛒 Purchases</button>
      </div>

      {/* ── MEAL TRACKING TAB ────────────────────────────────────────────── */}
      {tab === 'meals' && (
        <>
          <div className="controls-bar">
            <label>Date:</label>
            <input type="date" value={mealDate} onChange={(e) => setMealDate(e.target.value)} max={todayStr()} />
          </div>

          <div className="stats-row">
            <div className="stat-card blue"><div className="stat-value">{totalMealsToday}</div><div className="stat-label">Total Meals</div></div>
            <div className="stat-card green"><div className="stat-value">{mealForm.breakfast.count}</div><div className="stat-label">Breakfast</div></div>
            <div className="stat-card yellow"><div className="stat-value">{mealForm.lunch.count}</div><div className="stat-label">Lunch</div></div>
            <div className="stat-card purple"><div className="stat-value">{mealForm.dinner.count}</div><div className="stat-label">Dinner</div></div>
          </div>

          {loadingMeals ? (
            <div className="loading-wrap"><span className="loader" /></div>
          ) : (
            <div className="meal-grid">
              {MEAL_TYPES.map((mt) => (
                <div key={mt} className="meal-card">
                  <div className="meal-icon">{MEAL_ICONS[mt]}</div>
                  <div className="meal-title">{mt.charAt(0).toUpperCase() + mt.slice(1)}</div>
                  <div className="meal-fields">
                    <div className="meal-field">
                      <label>Plates Served</label>
                      <input
                        type="number"
                        min="0"
                        value={mealForm[mt].count}
                        onChange={(e) => setMealForm((prev) => ({ ...prev, [mt]: { ...prev[mt], count: e.target.value } }))}
                      />
                    </div>
                    <div className="meal-field">
                      <label>Cost (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={mealForm[mt].cost}
                        placeholder="0"
                        onChange={(e) => setMealForm((prev) => ({ ...prev, [mt]: { ...prev[mt], cost: e.target.value } }))}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <div className="meal-save-row">
                <div className="meal-total">
                  Total Cost: <strong>{CURRENCY(totalCostToday)}</strong>
                </div>
                <button className="btn-add" onClick={handleSaveMeals} disabled={savingMeals}>
                  {savingMeals ? 'Saving…' : '💾 Save Meal Data'}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── PURCHASES TAB ─────────────────────────────────────────────────── */}
      {tab === 'purchases' && (
        <>
          <div className="stats-row">
            <div className="stat-card red"><div className="stat-value">{CURRENCY(totalPurchases)}</div><div className="stat-label">Total Spent</div></div>
            <div className="stat-card yellow">
              <div className="stat-value">
                {CURRENCY(purchases.filter((p) => p.date.startsWith(new Date().toISOString().slice(0, 7))).reduce((s, p) => s + p.total, 0))}
              </div>
              <div className="stat-label">This Month</div>
            </div>
            <div className="stat-card blue"><div className="stat-value">{purchases.length}</div><div className="stat-label">Total Entries</div></div>
            <div className="stat-card green">
              <div className="stat-value">{purchases.length > 0 ? CURRENCY(Math.round(totalPurchases / purchases.length)) : '—'}</div>
              <div className="stat-label">Avg Per Purchase</div>
            </div>
          </div>

          {loadingPurch ? (
            <div className="loading-wrap"><span className="loader" /></div>
          ) : purchases.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🛒</div>
              <div className="empty-title">No Purchases Yet</div>
              <p>Click "Add Purchase" to log your first grocery purchase.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Date</th><th>Vendor</th><th>Items Description</th><th>Total</th><th>Bill</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {purchases.map((p) => (
                    <tr key={p.id}>
                      <td className="muted">{p.date}</td>
                      <td className="bold">{p.vendor ?? '—'}</td>
                      <td className="muted">
                        {p.items && typeof p.items === 'object' && 'note' in (p.items as object)
                          ? (p.items as { note: string }).note
                          : '—'}
                      </td>
                      <td className="col-red">{CURRENCY(p.total)}</td>
                      <td>
                        {p.bill_url
                          ? <a className="action-btn view" href={p.bill_url} target="_blank" rel="noreferrer">📎 View</a>
                          : <span className="muted">—</span>}
                      </td>
                      <td>
                        <div className="actions-cell">
                          <button className="action-btn delete" onClick={() => handleDeletePurchase(p)}>Delete</button>
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

      {/* ── PURCHASE MODAL ────────────────────────────────────────────────── */}
      {showPurchModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowPurchModal(false); }}>
          <div className="modal-panel">
            <div className="modal-header">
              <h3>Add Food Purchase</h3>
              <button className="modal-close" onClick={() => { setShowPurchModal(false); setBillFile(null); }}>✕</button>
            </div>
            <form onSubmit={handleAddPurchase}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Date</label>
                    <input type="date" value={purchForm.date} onChange={(e) => setPurchForm((p) => ({ ...p, date: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Vendor / Shop</label>
                    <input value={purchForm.vendor} onChange={(e) => setPurchForm((p) => ({ ...p, vendor: e.target.value }))} placeholder="Vendor name" />
                  </div>
                  <div className="form-group">
                    <label>Total Amount (₹) *</label>
                    <input type="number" value={purchForm.total} onChange={(e) => setPurchForm((p) => ({ ...p, total: e.target.value }))} placeholder="0" min="1" required />
                  </div>
                  <div className="form-group full">
                    <label>Items Purchased</label>
                    <textarea value={purchForm.items_desc} onChange={(e) => setPurchForm((p) => ({ ...p, items_desc: e.target.value }))} placeholder="e.g. Rice 10kg, Oil 5L, Vegetables…" />
                  </div>
                  <div className="form-group full">
                    <label>Bill / Receipt</label>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => setBillFile(e.target.files?.[0] ?? null)}
                    />
                    <span className="field-hint">Attach photo or PDF of the bill (optional)</span>
                    {billFile && <span className="bill-preview">📎 {billFile.name}</span>}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <span className="modal-error">{purchError}</span>
                <button type="button" className="btn-cancel" onClick={() => { setShowPurchModal(false); setBillFile(null); }}>Cancel</button>
                <button type="submit" className="btn-save" disabled={savingPurch}>{savingPurch ? 'Saving…' : 'Add Purchase'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
