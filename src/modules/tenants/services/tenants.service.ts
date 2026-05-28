import { supabase } from '../../../services/supabase';
import type { Tables, TablesInsert, TablesUpdate } from '../../../types/database.types';

// ─── Types ────────────────────────────────────────────────────────────────────
export type TenantRow    = Tables<'tenants'>;
export type TenantInsert = TablesInsert<'tenants'>;
export type TenantUpdate = TablesUpdate<'tenants'>;

export type TenantWithRoom = TenantRow & {
  rooms: { number: string } | null;
  beds:  { label: string | null } | null;
};

export type BedItem  = { id: string; label: string | null; is_occupied: boolean | null };
export type RoomWithBeds = {
  id:       string;
  number:   string;
  type:     string | null;
  capacity: number;
  rent:     number;
  beds:     BedItem[];
};

// ─── Tenants ──────────────────────────────────────────────────────────────────
export async function fetchActiveTenants(branchId: string): Promise<TenantWithRoom[]> {
  const { data, error } = await supabase
    .from('tenants')
    .select('*, rooms(number), beds(label)')
    .eq('branch_id', branchId)
    .is('dov', null)
    .order('name');
  if (error) throw error;
  return (data ?? []) as unknown as TenantWithRoom[];
}

export async function fetchAllTenants(branchId: string): Promise<TenantWithRoom[]> {
  const { data, error } = await supabase
    .from('tenants')
    .select('*, rooms(number), beds(label)')
    .eq('branch_id', branchId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as TenantWithRoom[];
}

export async function createTenant(tenant: TenantInsert): Promise<TenantRow> {
  const { data, error } = await supabase
    .from('tenants')
    .insert(tenant)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTenant(id: string, updates: TenantUpdate): Promise<TenantRow> {
  const { data, error } = await supabase
    .from('tenants')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function vacateTenant(id: string, dov: string): Promise<TenantRow> {
  return updateTenant(id, { dov });
}

// ─── Rooms (for bed-assignment selector) ─────────────────────────────────────
export async function fetchRoomsWithBeds(branchId: string): Promise<RoomWithBeds[]> {
  const { data, error } = await supabase
    .from('rooms')
    .select('id, number, type, capacity, rent, beds(id, label, is_occupied)')
    .eq('branch_id', branchId)
    .order('number');
  if (error) throw error;
  return (data ?? []) as unknown as RoomWithBeds[];
}
