import { supabase } from '../../../services/supabase';
import type { Tables, TablesInsert } from '../../../types/database.types';

export type VisitorLog    = Tables<'visitor_logs'>;
export type VisitorInsert = TablesInsert<'visitor_logs'>;

export type VisitorWithRoom = VisitorLog & {
  rooms: { number: string } | null;
};

export async function fetchVisitors(
  branchId: string,
  date: string,          // 'YYYY-MM-DD'
): Promise<VisitorWithRoom[]> {
  const dayStart = `${date}T00:00:00`;
  const dayEnd   = `${date}T23:59:59`;

  const { data, error } = await supabase
    .from('visitor_logs')
    .select('*')
    .eq('branch_id', branchId)
    .gte('entry_time', dayStart)
    .lte('entry_time', dayEnd)
    .order('entry_time', { ascending: false });
  if (error) throw error;

  const rows = data ?? [];
  if (rows.length === 0) return [];

  const roomIds = [...new Set(rows.map((v) => v.room_id).filter(Boolean))] as string[];
  const { data: roomData } = roomIds.length
    ? await supabase.from('rooms').select('id, number').in('id', roomIds)
    : { data: [] };

  const roomMap = Object.fromEntries((roomData ?? []).map((r) => [r.id, r]));

  return rows.map((v) => ({
    ...v,
    rooms: v.room_id ? roomMap[v.room_id] ?? null : null,
  }));
}

export async function createVisitor(payload: VisitorInsert): Promise<void> {
  const { error } = await supabase.from('visitor_logs').insert(payload);
  if (error) throw error;
}

export async function markVisitorExit(id: string): Promise<void> {
  const { error } = await supabase
    .from('visitor_logs')
    .update({ exit_time: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteVisitor(id: string): Promise<void> {
  const { error } = await supabase.from('visitor_logs').delete().eq('id', id);
  if (error) throw error;
}
