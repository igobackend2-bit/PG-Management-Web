import { supabase } from '../../../services/supabase';
import type { Tables } from '../../../types/database.types';

export type UtilityReading = Tables<'utility_readings'>;
export type RoomBasic      = { id: string; number: string };

export type RoomWithReading = RoomBasic & {
  reading: UtilityReading | null;
};

export async function fetchRoomsWithReadings(
  branchId: string,
  date: string,          // 'YYYY-MM-DD'
): Promise<RoomWithReading[]> {
  const [{ data: rooms, error: roomErr }, { data: readings, error: readErr }] =
    await Promise.all([
      supabase.from('rooms').select('id, number').eq('branch_id', branchId).order('number'),
      supabase
        .from('utility_readings')
        .select('*')
        .eq('branch_id', branchId)
        .eq('reading_date', date),
    ]);

  if (roomErr) throw roomErr;
  if (readErr) throw readErr;

  const readingMap = Object.fromEntries(
    (readings ?? []).map((r) => [r.room_id ?? '', r]),
  );

  return (rooms ?? []).map((room) => ({
    ...room,
    reading: readingMap[room.id] ?? null,
  }));
}

export async function upsertReading(
  branchId: string,
  roomId: string,
  date: string,
  ebPrevious: number | null,
  ebCurrent: number | null,
  notes: string,
): Promise<void> {
  const { error } = await supabase.from('utility_readings').upsert(
    {
      branch_id:    branchId,
      room_id:      roomId,
      reading_date: date,
      eb_previous:  ebPrevious,
      eb_current:   ebCurrent,
      notes:        notes || null,
    },
    { onConflict: 'id' },   // no unique constraint on room+date — insert or use row id
  );
  if (error) throw error;
}

// Safer: check-then-insert-or-update
export async function saveReading(
  branchId: string,
  roomId: string,
  date: string,
  ebPrevious: number | null,
  ebCurrent: number | null,
  notes: string,
  existingId?: string,
): Promise<void> {
  if (existingId) {
    const { error } = await supabase
      .from('utility_readings')
      .update({ eb_previous: ebPrevious, eb_current: ebCurrent, notes: notes || null })
      .eq('id', existingId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('utility_readings').insert({
      branch_id:    branchId,
      room_id:      roomId,
      reading_date: date,
      eb_previous:  ebPrevious,
      eb_current:   ebCurrent,
      notes:        notes || null,
    });
    if (error) throw error;
  }
}
