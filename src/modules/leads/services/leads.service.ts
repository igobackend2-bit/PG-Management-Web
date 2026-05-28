import { supabase } from '../../../services/supabase';
import type { Tables, TablesInsert, TablesUpdate } from '../../../types/database.types';

export type Lead        = Tables<'leads'>;
export type LeadInsert  = TablesInsert<'leads'>;
export type LeadUpdate  = TablesUpdate<'leads'>;

export const LEAD_STATUSES = ['new', 'contacted', 'visit_scheduled', 'converted', 'lost'] as const;
export type  LeadStatus    = typeof LEAD_STATUSES[number];

export const LEAD_SOURCES = ['Walk-in', 'Referral', 'Social Media', 'JustDial', 'Website', 'Other'] as const;

export const STATUS_LABEL: Record<string, string> = {
  new: 'New', contacted: 'Contacted', visit_scheduled: 'Visit Scheduled',
  converted: 'Converted', lost: 'Lost',
};

export async function fetchLeads(branchId: string): Promise<Lead[]> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('branch_id', branchId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createLead(lead: LeadInsert): Promise<Lead> {
  const { data, error } = await supabase.from('leads').insert(lead).select().single();
  if (error) throw error;
  return data;
}

export async function updateLead(id: string, updates: LeadUpdate): Promise<Lead> {
  const { data, error } = await supabase.from('leads').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteLead(id: string): Promise<void> {
  const { error } = await supabase.from('leads').delete().eq('id', id);
  if (error) throw error;
}
