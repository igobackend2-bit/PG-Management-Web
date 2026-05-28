import { supabase } from '../../../services/supabase';
import type { Tables, TablesInsert, TablesUpdate } from '../../../types/database.types';

// ─── Types ────────────────────────────────────────────────────────────────────
export type Ticket       = Tables<'tickets'>;
export type TicketInsert = TablesInsert<'tickets'>;
export type TicketUpdate = TablesUpdate<'tickets'>;

export type TicketWithDetails = Ticket & {
  assignee: { name: string } | null;   // staff name via assigned_to FK
  rooms:    { number: string } | null;
};

export type StaffOption = { id: string; name: string; role: string };
export type RoomOption  = { id: string; number: string };

// ─── Tickets ──────────────────────────────────────────────────────────────────
export async function fetchTickets(branchId: string): Promise<TicketWithDetails[]> {
  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('branch_id', branchId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const tickets = data ?? [];
  if (tickets.length === 0) return [];

  // Resolve staff names separately (assigned_to is non-standard FK column name)
  const staffIds = [...new Set(tickets.map((t) => t.assigned_to).filter(Boolean))] as string[];
  const { data: staffData } = staffIds.length
    ? await supabase.from('staff').select('id, name').in('id', staffIds)
    : { data: [] };

  const roomIds = [...new Set(tickets.map((t) => t.room_id).filter(Boolean))] as string[];
  const { data: roomData } = roomIds.length
    ? await supabase.from('rooms').select('id, number').in('id', roomIds)
    : { data: [] };

  const staffMap  = Object.fromEntries((staffData ?? []).map((s) => [s.id, s]));
  const roomMap   = Object.fromEntries((roomData  ?? []).map((r) => [r.id, r]));

  return tickets.map((t) => ({
    ...t,
    assignee: t.assigned_to ? staffMap[t.assigned_to] ?? null : null,
    rooms:    t.room_id     ? roomMap[t.room_id]     ?? null : null,
  }));
}

export async function createTicket(ticket: TicketInsert): Promise<Ticket> {
  const { data, error } = await supabase
    .from('tickets')
    .insert(ticket)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTicket(id: string, updates: TicketUpdate): Promise<Ticket> {
  const { data, error } = await supabase
    .from('tickets')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function resolveTicket(id: string): Promise<Ticket> {
  return updateTicket(id, { status: 'resolved', resolved_at: new Date().toISOString() });
}

export async function deleteTicket(id: string): Promise<void> {
  const { error } = await supabase.from('tickets').delete().eq('id', id);
  if (error) throw error;
}

// ─── Support data ─────────────────────────────────────────────────────────────
export async function fetchStaffOptions(branchId: string): Promise<StaffOption[]> {
  const { data, error } = await supabase
    .from('staff')
    .select('id, name, role')
    .eq('branch_id', branchId)
    .order('name');
  if (error) throw error;
  return data ?? [];
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
