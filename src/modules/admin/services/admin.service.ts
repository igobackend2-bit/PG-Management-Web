import { supabase } from '../../../services/supabase';
import type { Tables, TablesInsert, TablesUpdate } from '../../../types/database.types';

// ─── Types ────────────────────────────────────────────────────────────────────
export type AppRole    = Tables<'app_roles'>;
export type UserProfile = Tables<'user_profiles'>;

export type UserProfileWithRole = UserProfile & {
  app_roles: Pick<AppRole, 'id' | 'name'> | null;
};

export type PermissionSet = {
  dashboard:   boolean;
  branches:    boolean;
  tenants:     boolean;
  accounts:    boolean;
  operations:  boolean;
  food:        boolean;
  inventory:   boolean;
  staff:       boolean;
  reports:     boolean;
  documents:   boolean;
  leads:       boolean;
  admin:       boolean;
};

export const DEFAULT_PERMISSIONS: PermissionSet = {
  dashboard:  true,
  branches:   false,
  tenants:    false,
  accounts:   false,
  operations: false,
  food:       false,
  inventory:  false,
  staff:      false,
  reports:    false,
  documents:  false,
  leads:      false,
  admin:      false,
};

// ─── Owner ID helper ──────────────────────────────────────────────────────────
async function getOwnerId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('owners')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();
  if (error) throw error;
  return data.id;
}

// ─── Roles ────────────────────────────────────────────────────────────────────
export async function fetchRoles(): Promise<AppRole[]> {
  const ownerId = await getOwnerId();
  const { data, error } = await supabase
    .from('app_roles')
    .select('*')
    .eq('owner_id', ownerId)
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function createRole(
  name: string,
  permissions: PermissionSet
): Promise<AppRole> {
  const ownerId = await getOwnerId();
  const { data, error } = await supabase
    .from('app_roles')
    .insert({ owner_id: ownerId, name, permissions } as TablesInsert<'app_roles'>)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateRole(
  id: string,
  updates: { name?: string; permissions?: PermissionSet }
): Promise<AppRole> {
  const { data, error } = await supabase
    .from('app_roles')
    .update(updates as TablesUpdate<'app_roles'>)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRole(id: string): Promise<void> {
  const { error } = await supabase.from('app_roles').delete().eq('id', id);
  if (error) throw error;
}

// ─── User Profiles ────────────────────────────────────────────────────────────
export async function fetchUserProfiles(): Promise<UserProfileWithRole[]> {
  const ownerId = await getOwnerId();
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*, app_roles(id, name)')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as UserProfileWithRole[];
}

export async function createUserProfile(
  email: string,
  fullName: string,
  roleId: string | null,
  branchAccess: string[]
): Promise<UserProfile> {
  const ownerId = await getOwnerId();
  const { data, error } = await supabase
    .from('user_profiles')
    .insert({
      owner_id: ownerId,
      email,
      full_name: fullName,
      role_id: roleId,
      branch_access: branchAccess,
      is_active: true,
    } as TablesInsert<'user_profiles'>)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateUserProfile(
  id: string,
  updates: TablesUpdate<'user_profiles'>
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function toggleUserActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from('user_profiles')
    .update({ is_active: isActive })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteUserProfile(id: string): Promise<void> {
  const { error } = await supabase.from('user_profiles').delete().eq('id', id);
  if (error) throw error;
}
