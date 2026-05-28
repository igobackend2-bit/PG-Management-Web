import React, { useCallback, useEffect, useState } from 'react';
import { useBranchStore } from '../../../store/branchStore';
import { useToast } from '../../../shared/hooks/useToast';
import { supabase } from '../../../services/supabase';
import {
  fetchMealTracking, upsertMeal, fetchFoodPurchases, createFoodPurchase, deleteFoodPurchase,
  MEAL_TYPES, type MealTracking, type FoodPurchase,
} from '../services/food.service';
import {
  fetchStockItems, createStockItem, updateStockItem, deleteStockItem,
  fetchTransactions, recordTransaction,
  STOCK_CATEGORIES, STOCK_UNITS,
  type StockItem, type StockTransaction,
} from '../services/kitchen.service';
import './FoodPage.scss';

type Tab = 'meals' | 'purchases' | 'kitchen';

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

  // ── Meal state ──────────────────────────────────────────────────────────────
  const [mealDate, setMealDate]   = useState(todayStr);
  const [mealData, setMealData]   = useState<MealTracking[]>([]);
  const [mealForm, setMealForm]   = useState<Record<string, { count: string; cost: string }>>({
    breakfast: { count: '0', cost: '' },
    lunch:     { count: '0', cost: '' },
    dinner:    { count: '0', cost: '' },
  });
  const [loadingMeals, setLoadingMeals] = useState(false);
  const [savingMeals, setSavingMeals]   = useState(false);

  // ── Purchases state ─────────────────────────────────────────────────────────
  const [purchases, setPurchases]           = useState<FoodPurchase[]>([]);
  const [loadingPurch, setLoadingPurch]     = useState(false);
  const [showPurchModal, setShowPurchModal] = useState(false);
  const [purchForm, setPurchForm] = useState({ date: todayStr(), vendor: '', items_desc: '', total: '' });
  const [billFile, setBillFile]   = useState<File | null>(null);
  const [purchError, setPurchError] = useState('');
  const [savingPurch, setSavingPurch] = useState(false);

  // ── Kitchen inventory state ──────────────────────────────────────────────────
  const [stockItems, setStockItems]         = useState<StockItem[]>([]);
  const [transactions, setTransactions]     = useState<StockTransaction[]>([]);
  const [loadingStock, setLoadingStock]     = useState(false);
  const [showItemModal, setShowItemModal]   = useState(false);
  const [showTxnModal, setShowTxnModal]     = useState(false);
  const [editingItem, setEditingItem]       = useState<StockItem | null>(null);
  const [txnTargetItem, setTxnTargetItem]   = useState<StockItem | null>(null);
  const [kitchenSubTab, setKitchenSubTab]   = useState<'stock' | 'history'>('stock');
  const [savingItem, setSavingItem]         = useState(false);
  const [savingTxn, setSavingTxn]           = useState(false);
  const [itemError, setItemError]           = useState('');
  const [txnError, setTxnError]             = useState('');

  const [itemForm, setItemForm] = useState({
    name: '', unit: 'kg', category: 'general', low_stock_threshold: '5', current_qty: '0',
  });
  const [txnForm, setTxnForm] = useState({
    type: 'in' as 'in' | 'out', qty: '', notes: '',
  });

  // ── Loaders ──────────────────────────────────────────────────────────────────
  const loadMeals = useCallback(async () => {
    if (!selectedBranch) return;
    setLoadingMeals(true);
    try {
      const data = await fetchMealTracking(selectedBranch.id, mealDate);
      setMealData(data);
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

  const loadKitchenStock = useCallback(async () => {
    if (!selectedBranch) return;
    setLoadingStock(true);
    try {
      const [items, txns] = await Promise.all([
        fetchStockItems(selectedBranch.id),
        fetchTransactions(selectedBranch.id),
      ]);
      setStockItems(items);
      setTransactions(txns);
    } catch { toast.error('Failed to load kitchen stock.'); }
    finally { setLoadingStock(false); }
  }, [selectedBranch]);

  useEffect(() => { if (tab === 'meals')     loadMeals();        }, [tab, loadMeals]);
  useEffect(() => { if (tab === 'purchases') loadPurchases();    }, [tab, loadPurchases]);
  useEffect(() => { if (tab === 'kitchen')   loadKitchenStock(); }, [tab, loadKitchenStock]);

  // ── Meal save ─────────────────────────────────────────────────────────────
  async function handleSaveMeals() {
    if (!selectedBranch) return;
    setSavingMeals(true);
    try {
      await Promise.all(
        MEAL_TYPES.map((mt) =>
          upsertMeal(selectedBranch.id, mealDate, mt,
            Number(mealForm[mt].count) || 0,
            mealForm[mt].cost ? Number(mealForm[mt].cost) : null)
        )
      );
      toast.success('Meal data saved!');
      loadMeals();
    } catch { toast.error('Failed to save meal data.'); }
    finally { setSavingMeals(false); }
  }

  // ── Purchase save ─────────────────────────────────────────────────────────
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

  // ── Kitchen stock item save ───────────────────────────────────────────────
  function openAddItem() {
    setEditingItem(null);
    setItemForm({ name: '', unit: 'kg', category: 'general', low_stock_threshold: '5', current_qty: '0' });
    setItemError('');
    setShowItemModal(true);
  }

  function openEditItem(item: StockItem) {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      unit: item.unit,
      category: item.category ?? 'general',
      low_stock_threshold: String(item.low_stock_threshold),
      current_qty: String(item.current_qty),
    });
    setItemError('');
    setShowItemModal(true);
  }

  async function handleSaveItem(e: React.FormEvent) {
    e.preventDefault();
    if (!itemForm.name.trim()) { setItemError('Item name required.'); return; }
    if (!selectedBranch) return;
    setSavingItem(true); setItemError('');
    try {
      if (editingItem) {
        await updateStockItem(editingItem.id, {
          name: itemForm.name.trim(),
          unit: itemForm.unit,
          category: itemForm.category,
          low_stock_threshold: Number(itemForm.low_stock_threshold) || 5,
          current_qty: Number(itemForm.current_qty) || 0,
        });
        toast.success('Item updated!');
      } else {
        await createStockItem({
          branch_id: selectedBranch.id,
          name: itemForm.name.trim(),
          unit: itemForm.unit,
          category: itemForm.category,
          low_stock_threshold: Number(itemForm.low_stock_threshold) || 5,
          current_qty: Number(itemForm.current_qty) || 0,
        });
        toast.success('Item added!');
      }
      setShowItemModal(false);
      loadKitchenStock();
    } catch (err: unknown) {
      setItemError(err instanceof Error ? err.message : 'Failed to save.');
    } finally { setSavingItem(false); }
  }

  async function handleDeleteItem(item: StockItem) {
    if (!window.confirm(`Delete "${item.name}"? All transactions will also be removed.`)) return;
    try { await deleteStockItem(item.id); toast.success('Item deleted.'); loadKitchenStock(); }
    catch { toast.error('Failed to delete.'); }
  }

  // ── Record transaction ────────────────────────────────────────────────────
  function openTxnModal(item: StockItem) {
    setTxnTargetItem(item);
    setTxnForm({ type: 'in', qty: '', notes: '' });
    setTxnError('');
    setShowTxnModal(true);
  }

  async function handleSaveTxn(e: React.FormEvent) {
    e.preventDefault();
    if (!txnForm.qty || Number(txnForm.qty) <= 0) { setTxnError('Enter a valid quantity.'); return; }
    if (!txnTargetItem || !selectedBranch) return;
    setSavingTxn(true); setTxnError('');
    try {
      await recordTransaction(
        selectedBranch.id,
        txnTargetItem.id,
        txnForm.type,
        Number(txnForm.qty),
        txnForm.notes || undefined
      );
      toast.success(`Stock ${txnForm.type === 'in' ? 'added' : 'consumed'} successfully!`);
      setShowTxnModal(false);
      loadKitchenStock();
    } catch (err: unknown) {
      setTxnError(err instanceof Error ? err.message : 'Failed to record.');
    } finally { setSavingTxn(false); }
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const totalMealsToday = MEAL_TYPES.reduce((s, mt) => s + (Number(mealForm[mt].count) || 0), 0);
  const totalCostToday  = MEAL_TYPES.reduce((s, mt) => s + (Number(mealForm[mt].cost) || 0), 0);
  const totalPurchases  = purchases.reduce((s, p) => s + p.total, 0);
  const lowStockItems   = stockItems.filter(i => i.current_qty <= i.low_stock_threshold);
  const outOfStockItems = stockItems.filter(i => i.current_qty === 0);

  // Get item name for transaction history
  const itemNameMap = Object.fromEntries(stockItems.map(i => [i.id, i.name]));

  if (!selectedBranch) return (
    <div className="food-page"><div className="empty-state"><div className="empty-icon">🏢</div><div className="empty-title">No Branch Selected</div></div></div>
  );

  return (
    <div className="food-page">
      <div className="page-header">
        <div className="header-left">
          <h2>Food & Kitchen</h2>
          <span className="branch-tag">{selectedBranch.name}</span>
        </div>
        {tab === 'purchases' && (
          <button className="btn-add" onClick={() => {
            setPurchForm({ date: todayStr(), vendor: '', items_desc: '', total: '' });
            setBillFile(null); setPurchError(''); setShowPurchModal(true);
          }}>+ Add Purchase</button>
        )}
        {tab === 'kitchen' && kitchenSubTab === 'stock' && (
          <button className="btn-add" onClick={openAddItem}>+ Add Item</button>
        )}
      </div>

      <div className="tab-bar">
        <button className={`tab-btn ${tab === 'meals' ? 'active' : ''}`}     onClick={() => setTab('meals')}>🍽 Meal Tracking</button>
        <button className={`tab-btn ${tab === 'purchases' ? 'active' : ''}`} onClick={() => setTab('purchases')}>🛒 Purchases</button>
        <button className={`tab-btn ${tab === 'kitchen' ? 'active' : ''}`}   onClick={() => setTab('kitchen')}>
          📦 Kitchen Stock
          {lowStockItems.length > 0 && <span className="tab-badge red">{lowStockItems.length}</span>}
        </button>
      </div>

      {/* ── MEAL TRACKING TAB ────────────────────────────────────────────────── */}
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
                        type="number" min="0" value={mealForm[mt].count}
                        onChange={(e) => setMealForm((prev) => ({ ...prev, [mt]: { ...prev[mt], count: e.target.value } }))}
                      />
                    </div>
                    <div className="meal-field">
                      <label>Cost (₹)</label>
                      <input
                        type="number" min="0" value={mealForm[mt].cost} placeholder="0"
                        onChange={(e) => setMealForm((prev) => ({ ...prev, [mt]: { ...prev[mt], cost: e.target.value } }))}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <div className="meal-save-row">
                <div className="meal-total">Total Cost: <strong>{CURRENCY(totalCostToday)}</strong></div>
                <button className="btn-add" onClick={handleSaveMeals} disabled={savingMeals}>
                  {savingMeals ? 'Saving…' : '💾 Save Meal Data'}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── PURCHASES TAB ─────────────────────────────────────────────────────── */}
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
                          ? (p.items as { note: string }).note : '—'}
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

      {/* ── KITCHEN STOCK TAB ─────────────────────────────────────────────────── */}
      {tab === 'kitchen' && (
        <>
          <div className="stats-row">
            <div className="stat-card blue"><div className="stat-value">{stockItems.length}</div><div className="stat-label">Total Items</div></div>
            <div className="stat-card red"><div className="stat-value">{outOfStockItems.length}</div><div className="stat-label">Out of Stock</div></div>
            <div className="stat-card yellow"><div className="stat-value">{lowStockItems.length}</div><div className="stat-label">Low Stock</div></div>
            <div className="stat-card green">
              <div className="stat-value">{stockItems.length - lowStockItems.length}</div>
              <div className="stat-label">Adequate Stock</div>
            </div>
          </div>

          {lowStockItems.length > 0 && (
            <div className="low-stock-alert">
              ⚠️ <strong>Low Stock:</strong> {lowStockItems.map(i => `${i.name} (${i.current_qty} ${i.unit})`).join(', ')}
            </div>
          )}

          <div className="att-sub-tabs">
            <button className={`tab-btn ${kitchenSubTab === 'stock' ? 'active' : ''}`} onClick={() => setKitchenSubTab('stock')}>📋 Stock Items</button>
            <button className={`tab-btn ${kitchenSubTab === 'history' ? 'active' : ''}`} onClick={() => setKitchenSubTab('history')}>🔄 Transaction History</button>
          </div>

          {loadingStock ? (
            <div className="loading-wrap"><span className="loader" /></div>
          ) : kitchenSubTab === 'stock' ? (
            stockItems.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📦</div>
                <div className="empty-title">No Stock Items</div>
                <p>Click "+ Add Item" to start tracking kitchen inventory.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Item</th><th>Category</th><th>Current Stock</th><th>Low Stock Alert</th><th>Status</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockItems.map((item) => {
                      const isLow = item.current_qty <= item.low_stock_threshold;
                      const isOut = item.current_qty === 0;
                      return (
                        <tr key={item.id}>
                          <td className="bold">{item.name}</td>
                          <td><span className="badge grey">{item.category ?? 'general'}</span></td>
                          <td className={isOut ? 'col-red bold' : isLow ? 'col-yellow bold' : 'col-green bold'}>
                            {item.current_qty} {item.unit}
                          </td>
                          <td className="muted">{item.low_stock_threshold} {item.unit}</td>
                          <td>
                            {isOut
                              ? <span className="badge red">Out of Stock</span>
                              : isLow
                                ? <span className="badge yellow">Low Stock</span>
                                : <span className="badge green">OK</span>}
                          </td>
                          <td>
                            <div className="actions-cell">
                              <button className="action-btn in"  onClick={() => openTxnModal(item)}>+ Stock In / Out</button>
                              <button className="action-btn edit" onClick={() => openEditItem(item)}>Edit</button>
                              <button className="action-btn delete" onClick={() => handleDeleteItem(item)}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            /* Transaction History */
            transactions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🔄</div>
                <div className="empty-title">No Transactions Yet</div>
                <p>Use "Stock In / Out" buttons to record movements.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Date & Time</th><th>Item</th><th>Type</th><th>Qty</th><th>Notes</th></tr>
                  </thead>
                  <tbody>
                    {transactions.map((t) => (
                      <tr key={t.id}>
                        <td className="muted">{t.recorded_at ? new Date(t.recorded_at).toLocaleString('en-IN') : '—'}</td>
                        <td className="bold">{itemNameMap[t.item_id] ?? '—'}</td>
                        <td>
                          {t.type === 'in'
                            ? <span className="badge green">Stock In</span>
                            : <span className="badge red">Stock Out</span>}
                        </td>
                        <td className={t.type === 'in' ? 'col-green bold' : 'col-red bold'}>
                          {t.type === 'in' ? '+' : '-'}{t.qty}
                        </td>
                        <td className="muted">{t.notes ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </>
      )}

      {/* ── PURCHASE MODAL ────────────────────────────────────────────────────── */}
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
                    <input type="file" accept="image/*,application/pdf" onChange={(e) => setBillFile(e.target.files?.[0] ?? null)} />
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

      {/* ── ADD / EDIT ITEM MODAL ─────────────────────────────────────────────── */}
      {showItemModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowItemModal(false); }}>
          <div className="modal-panel">
            <div className="modal-header">
              <h3>{editingItem ? 'Edit Stock Item' : 'Add Stock Item'}</h3>
              <button className="modal-close" onClick={() => setShowItemModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveItem}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group full">
                    <label>Item Name *</label>
                    <input value={itemForm.name} onChange={(e) => setItemForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Rice, Cooking Oil, Dal…" required />
                  </div>
                  <div className="form-group">
                    <label>Unit</label>
                    <select value={itemForm.unit} onChange={(e) => setItemForm(p => ({ ...p, unit: e.target.value }))}>
                      {STOCK_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <select value={itemForm.category} onChange={(e) => setItemForm(p => ({ ...p, category: e.target.value }))}>
                      {STOCK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Current Quantity</label>
                    <input type="number" min="0" step="0.01" value={itemForm.current_qty} onChange={(e) => setItemForm(p => ({ ...p, current_qty: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Low Stock Alert (min qty)</label>
                    <input type="number" min="0" step="0.01" value={itemForm.low_stock_threshold} onChange={(e) => setItemForm(p => ({ ...p, low_stock_threshold: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <span className="modal-error">{itemError}</span>
                <button type="button" className="btn-cancel" onClick={() => setShowItemModal(false)}>Cancel</button>
                <button type="submit" className="btn-save" disabled={savingItem}>{savingItem ? 'Saving…' : editingItem ? 'Update Item' : 'Add Item'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── STOCK IN / OUT MODAL ──────────────────────────────────────────────── */}
      {showTxnModal && txnTargetItem && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowTxnModal(false); }}>
          <div className="modal-panel">
            <div className="modal-header">
              <h3>Record Stock Movement — {txnTargetItem.name}</h3>
              <button className="modal-close" onClick={() => setShowTxnModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveTxn}>
              <div className="modal-body">
                <div className="stock-current-qty">
                  Current: <strong>{txnTargetItem.current_qty} {txnTargetItem.unit}</strong>
                </div>
                <div className="form-grid">
                  <div className="form-group full">
                    <label>Type</label>
                    <div className="txn-type-row">
                      <button type="button" className={`txn-type-btn in  ${txnForm.type === 'in'  ? 'active' : ''}`} onClick={() => setTxnForm(p => ({ ...p, type: 'in'  }))}>▲ Stock In</button>
                      <button type="button" className={`txn-type-btn out ${txnForm.type === 'out' ? 'active' : ''}`} onClick={() => setTxnForm(p => ({ ...p, type: 'out' }))}>▼ Stock Out</button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Quantity ({txnTargetItem.unit}) *</label>
                    <input type="number" min="0.01" step="0.01" value={txnForm.qty} onChange={(e) => setTxnForm(p => ({ ...p, qty: e.target.value }))} placeholder="0" required />
                  </div>
                  <div className="form-group full">
                    <label>Notes (optional)</label>
                    <input value={txnForm.notes} onChange={(e) => setTxnForm(p => ({ ...p, notes: e.target.value }))} placeholder="e.g. Morning usage, new purchase…" />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <span className="modal-error">{txnError}</span>
                <button type="button" className="btn-cancel" onClick={() => setShowTxnModal(false)}>Cancel</button>
                <button type="submit" className="btn-save" disabled={savingTxn}>{savingTxn ? 'Saving…' : 'Record'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
