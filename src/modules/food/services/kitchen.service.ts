import { supabase } from '../../../services/supabase';
import type { Tables, TablesInsert, TablesUpdate } from '../../../types/database.types';

// ─── Types ────────────────────────────────────────────────────────────────────
export type StockItem        = Tables<'kitchen_stock_items'>;
export type StockTransaction = Tables<'kitchen_stock_transactions'>;

export type StockItemWithTxns = StockItem & {
  recent_txns: StockTransaction[];
};

export const STOCK_CATEGORIES = [
  'grains', 'oil', 'spices', 'vegetables', 'dairy', 'pulses', 'condiments', 'general',
] as const;

export const STOCK_UNITS = ['kg', 'litre', 'pcs', 'packet', 'dozen', 'gram', 'ml'] as const;

// ─── Items ────────────────────────────────────────────────────────────────────
export async function fetchStockItems(branchId: string): Promise<StockItem[]> {
  const { data, error } = await supabase
    .from('kitchen_stock_items')
    .select('*')
    .eq('branch_id', branchId)
    .order('category')
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function createStockItem(
  item: TablesInsert<'kitchen_stock_items'>
): Promise<StockItem> {
  const { data, error } = await supabase
    .from('kitchen_stock_items')
    .insert(item)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateStockItem(
  id: string,
  updates: TablesUpdate<'kitchen_stock_items'>
): Promise<StockItem> {
  const { data, error } = await supabase
    .from('kitchen_stock_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteStockItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('kitchen_stock_items')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ─── Transactions ─────────────────────────────────────────────────────────────
export async function fetchTransactions(
  branchId: string,
  limit = 50
): Promise<StockTransaction[]> {
  const { data, error } = await supabase
    .from('kitchen_stock_transactions')
    .select('*')
    .eq('branch_id', branchId)
    .order('recorded_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function recordTransaction(
  branchId: string,
  itemId: string,
  type: 'in' | 'out',
  qty: number,
  notes?: string,
  foodPurchaseId?: string
): Promise<void> {
  // 1. Insert transaction
  const { error: txErr } = await supabase
    .from('kitchen_stock_transactions')
    .insert({
      branch_id: branchId,
      item_id: itemId,
      type,
      qty,
      notes: notes ?? null,
      food_purchase_id: foodPurchaseId ?? null,
    } as TablesInsert<'kitchen_stock_transactions'>);
  if (txErr) throw txErr;

  // 2. Update current_qty on the item
  const { data: item, error: fetchErr } = await supabase
    .from('kitchen_stock_items')
    .select('current_qty')
    .eq('id', itemId)
    .single();
  if (fetchErr) throw fetchErr;

  const newQty = type === 'in'
    ? (item.current_qty ?? 0) + qty
    : Math.max(0, (item.current_qty ?? 0) - qty);

  const { error: updateErr } = await supabase
    .from('kitchen_stock_items')
    .update({ current_qty: newQty })
    .eq('id', itemId);
  if (updateErr) throw updateErr;
}
