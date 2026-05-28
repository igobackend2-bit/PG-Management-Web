import { supabase } from '../../../services/supabase';
import type { Tables, TablesInsert, TablesUpdate } from '../../../types/database.types';

// ─── Types ────────────────────────────────────────────────────────────────────
export type InventoryItem       = Tables<'inventory_items'>;
export type InventoryItemInsert = TablesInsert<'inventory_items'>;
export type InventoryItemUpdate = TablesUpdate<'inventory_items'>;

export type ItemWithRoom = InventoryItem & {
  rooms: { number: string } | null;
};

export const ITEM_CATEGORIES = [
  'Furniture', 'Electronics', 'Plumbing', 'Electrical',
  'Kitchen', 'Bedding', 'Bathroom', 'Common Area', 'Other',
] as const;

export const ITEM_CONDITIONS = ['good', 'fair', 'poor', 'damaged'] as const;

export type RoomOption = { id: string; number: string };

// ─── Inventory ────────────────────────────────────────────────────────────────
export async function fetchInventory(branchId: string): Promise<ItemWithRoom[]> {
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*, rooms(number)')
    .eq('branch_id', branchId)
    .order('name');
  if (error) throw error;
  return (data ?? []) as unknown as ItemWithRoom[];
}

export async function createInventoryItem(
  item: InventoryItemInsert
): Promise<InventoryItem> {
  const { data, error } = await supabase
    .from('inventory_items')
    .insert(item)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateInventoryItem(
  id: string,
  updates: InventoryItemUpdate
): Promise<InventoryItem> {
  const { data, error } = await supabase
    .from('inventory_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function auditItem(id: string): Promise<InventoryItem> {
  return updateInventoryItem(id, {
    last_audited: new Date().toISOString().slice(0, 10),
  });
}

export async function deleteInventoryItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('inventory_items')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function fetchRoomOptions(branchId: string): Promise<RoomOption[]> {
  const { data, error } = await supabase
    .from('rooms')
    .select('id, number')
    .eq('branch_id', branchId)
    .order('number');
  if (error) throw error;
  return data ?? [];
}
