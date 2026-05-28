import { supabase } from './supabase';
import type { Branch, BranchGender, AcType } from '../types';
import type { Tables } from '../types/database.types';

type DBBranch = Tables<'branches'>;

function mapBranch(row: DBBranch): Branch {
  return {
    id:             row.id,
    ownerId:        row.owner_id,
    name:           row.name,
    location:       row.location  ?? '',
    address:        row.address   ?? '',
    pincode:        row.pincode   ?? '',
    gender:         (row.gender as BranchGender) ?? 'BOTH',
    type:           (row.type   as AcType)       ?? 'BOTH',
    isFoodAvailable: row.is_food_available ?? false,
    createdAt:      row.created_at ?? new Date().toISOString(),
  };
}

export async function fetchBranches(): Promise<Branch[]> {
  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .order('name');
  if (error) throw error;
  return (data ?? []).map(mapBranch);
}

export async function createBranch(
  branch: Omit<DBBranch, 'id' | 'created_at'>
): Promise<Branch> {
  const { data, error } = await supabase
    .from('branches')
    .insert(branch)
    .select()
    .single();
  if (error) throw error;
  return mapBranch(data);
}
