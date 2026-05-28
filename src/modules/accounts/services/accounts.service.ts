import { supabase } from '../../../services/supabase';
import type { Tables, TablesInsert } from '../../../types/database.types';

// ─── Types ────────────────────────────────────────────────────────────────────
export type RentRecord   = Tables<'rent_records'>;
export type Expense      = Tables<'expenses'>;
export type CashbookEntry = Tables<'cashbook'>;

export type TenantForRent = {
  id:   string;
  name: string;
  rooms: { number: string; rent: number } | null;
};

// ─── Rent ─────────────────────────────────────────────────────────────────────
export async function fetchActiveTenantsForRent(
  branchId: string
): Promise<TenantForRent[]> {
  const { data, error } = await supabase
    .from('tenants')
    .select('id, name, rooms(number, rent)')
    .eq('branch_id', branchId)
    .is('dov', null)
    .order('name');
  if (error) throw error;
  return (data ?? []) as unknown as TenantForRent[];
}

export async function fetchRentRecordsForMonth(
  tenantIds: string[],
  month: string
): Promise<RentRecord[]> {
  if (tenantIds.length === 0) return [];
  const { data, error } = await supabase
    .from('rent_records')
    .select('*')
    .in('tenant_id', tenantIds)
    .eq('month', month);
  if (error) throw error;
  return data ?? [];
}

export async function createRentRecord(
  record: TablesInsert<'rent_records'>
): Promise<RentRecord> {
  const { data, error } = await supabase
    .from('rent_records')
    .insert(record)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function markRentPaid(
  id: string,
  paidAmount: number,
  paymentMethod: string,
  paidAt?: string           // ISO string; defaults to now
): Promise<RentRecord> {
  const { data, error } = await supabase
    .from('rent_records')
    .update({
      paid_amount:    paidAmount,
      paid_at:        paidAt ?? new Date().toISOString(),
      payment_method: paymentMethod,
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function upsertRentRecord(
  tenantId: string,
  month: string,
  amount: number,
  paidAmount: number,
  paymentMethod: string,
  paidAt?: string           // ISO string; defaults to now
): Promise<RentRecord> {
  // Check if record exists
  const { data: existing } = await supabase
    .from('rent_records')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('month', month)
    .maybeSingle();

  const resolvedPaidAt = paidAt ?? new Date().toISOString();

  if (existing) {
    return markRentPaid(existing.id, paidAmount, paymentMethod, resolvedPaidAt);
  }
  return createRentRecord({
    tenant_id:      tenantId,
    month,
    amount,
    paid_amount:    paidAmount,
    paid_at:        resolvedPaidAt,
    payment_method: paymentMethod,
    is_partial:     paidAmount < amount,
  });
}

// ─── Expenses ─────────────────────────────────────────────────────────────────
export async function fetchExpenses(branchId: string): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('branch_id', branchId)
    .order('date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createExpense(
  expense: TablesInsert<'expenses'>
): Promise<Expense> {
  const { data, error } = await supabase
    .from('expenses')
    .insert(expense)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw error;
}

// ─── Cashbook ─────────────────────────────────────────────────────────────────
export async function fetchCashbook(branchId: string): Promise<CashbookEntry[]> {
  const { data, error } = await supabase
    .from('cashbook')
    .select('*')
    .eq('branch_id', branchId)
    .order('date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createCashbookEntry(
  entry: TablesInsert<'cashbook'>
): Promise<CashbookEntry> {
  const { data, error } = await supabase
    .from('cashbook')
    .insert(entry)
    .select()
    .single();
  if (error) throw error;
  return data;
}
