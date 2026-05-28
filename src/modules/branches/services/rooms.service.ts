import { supabase } from '../../../services/supabase';
import type { Tables, TablesInsert, TablesUpdate } from '../../../types/database.types';

export type RoomRow = Tables<'rooms'>;
export type BedRow  = Tables<'beds'>;
export type RoomWithBeds = RoomRow & { beds: BedRow[] };

const BED_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// ─── Rooms ────────────────────────────────────────────────────────────────────
export async function fetchRoomsWithBeds(branchId: string): Promise<RoomWithBeds[]> {
  const { data, error } = await supabase
    .from('rooms')
    .select('*, beds(*)')
    .eq('branch_id', branchId)
    .order('number');
  if (error) throw error;
  return (data ?? []) as unknown as RoomWithBeds[];
}

export async function createRoom(
  room: TablesInsert<'rooms'>,
  bedCount: number,
): Promise<void> {
  const { data: newRoom, error: roomErr } = await supabase
    .from('rooms')
    .insert({ rent: 0, ...room })
    .select()
    .single();
  if (roomErr) throw roomErr;

  if (bedCount > 0) {
    const count = Math.min(bedCount, 26);
    const beds: TablesInsert<'beds'>[] = BED_LABELS.slice(0, count).map((label) => ({
      room_id:     newRoom.id,
      label,
      is_occupied: false,
    }));
    const { error: bedErr } = await supabase.from('beds').insert(beds);
    if (bedErr) throw bedErr;
  }
}

export async function updateRoom(id: string, updates: TablesUpdate<'rooms'>): Promise<void> {
  const { error } = await supabase.from('rooms').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteRoom(id: string): Promise<void> {
  // Beds cascade via FK on delete, so just delete the room
  const { error } = await supabase.from('rooms').delete().eq('id', id);
  if (error) throw error;
}

// ─── Beds ─────────────────────────────────────────────────────────────────────
export async function addBed(roomId: string, existingCount: number): Promise<void> {
  const label = BED_LABELS[existingCount] ?? `Bed ${existingCount + 1}`;
  const { error } = await supabase
    .from('beds')
    .insert({ room_id: roomId, label, is_occupied: false });
  if (error) throw error;
}

export async function deleteBed(id: string): Promise<void> {
  const { error } = await supabase.from('beds').delete().eq('id', id);
  if (error) throw error;
}
