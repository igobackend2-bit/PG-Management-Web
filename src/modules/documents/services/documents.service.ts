import { supabase } from '../../../services/supabase';
import type { Tables, TablesInsert } from '../../../types/database.types';

export type DocumentRow    = Tables<'documents'>;
export type DocumentInsert = TablesInsert<'documents'>;
export type TenantOption   = { id: string; name: string };

export const DOCUMENT_TYPES = [
  'Aadhaar Card', 'PAN Card', 'Passport', 'Voter ID',
  'Driving License', 'Rent Agreement', 'Police Verification', 'Other',
];

export interface TenantDocGroup {
  tenant: TenantOption;
  docs:   DocumentRow[];
}

export async function fetchTenantDocGroups(branchId: string): Promise<TenantDocGroup[]> {
  const { data: tenants, error: tErr } = await supabase
    .from('tenants')
    .select('id, name')
    .eq('branch_id', branchId)
    .is('dov', null)
    .order('name');
  if (tErr) throw tErr;
  if (!tenants?.length) return [];

  const tenantIds = tenants.map((t) => t.id);
  const { data: docs, error: dErr } = await supabase
    .from('documents')
    .select('*')
    .in('tenant_id', tenantIds)
    .order('uploaded_at', { ascending: false });
  if (dErr) throw dErr;

  const byTenant: Record<string, DocumentRow[]> = {};
  (docs ?? []).forEach((d) => {
    if (d.tenant_id) {
      if (!byTenant[d.tenant_id]) byTenant[d.tenant_id] = [];
      byTenant[d.tenant_id].push(d);
    }
  });

  return tenants.map((t) => ({ tenant: t, docs: byTenant[t.id] ?? [] }));
}

export async function createDocument(doc: DocumentInsert): Promise<DocumentRow> {
  const { data, error } = await supabase.from('documents').insert(doc).select().single();
  if (error) throw error;
  return data;
}

export async function deleteDocument(id: string): Promise<void> {
  const { error } = await supabase.from('documents').delete().eq('id', id);
  if (error) throw error;
}
