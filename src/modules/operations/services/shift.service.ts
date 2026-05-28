import { supabase } from '../../../services/supabase';
import type { Tables, TablesInsert } from '../../../types/database.types';

export type ShiftChecklist = Tables<'shift_checklists'>;
export type ShiftType = 'morning' | 'night';

export const MORNING_ITEMS = [
  { key: 'water_tank',     label: 'Water tank check',           role: 'Warden' },
  { key: 'eb_meter',       label: 'EB meter reading taken',     role: 'Maintenance' },
  { key: 'kitchen_check',  label: 'Kitchen inventory checked',  role: 'Cook' },
  { key: 'common_clean',   label: 'Common area cleaning done',  role: 'Cleaner' },
  { key: 'garbage',        label: 'Garbage removal verified',   role: 'Cleaner' },
  { key: 'vacant_beds',    label: 'Vacant beds updated',        role: 'Warden' },
  { key: 'complaints',     label: 'Complaints reviewed',        role: 'Manager' },
];

export const NIGHT_ITEMS = [
  { key: 'complaints_reviewed', label: 'All complaints reviewed',       role: 'Manager' },
  { key: 'cleaning_done',       label: 'Cleaning tasks completed',      role: 'Warden' },
  { key: 'occupancy_updated',   label: 'Occupancy updated',             role: 'Warden' },
  { key: 'cash_counted',        label: 'Cash counted & matched',        role: 'Manager' },
  { key: 'expenses_entered',    label: 'Expenses entered',              role: 'Manager' },
  { key: 'kitchen_inventory',   label: 'Kitchen inventory updated',     role: 'Cook' },
  { key: 'eb_readings',         label: 'EB readings taken for all rooms', role: 'Maintenance' },
  { key: 'visitor_log',         label: 'Visitor log updated',           role: 'Warden' },
];

export async function fetchShiftChecklist(
  branchId: string,
  date: string,
  shift: ShiftType,
): Promise<ShiftChecklist | null> {
  const { data, error } = await supabase
    .from('shift_checklists')
    .select('*')
    .eq('branch_id', branchId)
    .eq('date', date)
    .eq('shift', shift)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertShiftChecklist(
  branchId: string,
  date: string,
  shift: ShiftType,
  checklist: Record<string, boolean>,
): Promise<void> {
  const payload: TablesInsert<'shift_checklists'> = {
    branch_id: branchId,
    date,
    shift,
    checklist: checklist as unknown as import('../../../types/database.types').Json,
    is_locked: false,
  };
  const { error } = await supabase
    .from('shift_checklists')
    .upsert(payload, { onConflict: 'branch_id,date,shift' });
  if (error) throw error;
}

export async function lockShift(
  branchId: string,
  date: string,
  shift: ShiftType,
  checklist: Record<string, boolean>,
): Promise<void> {
  const payload: TablesInsert<'shift_checklists'> = {
    branch_id: branchId,
    date,
    shift,
    checklist: checklist as unknown as import('../../../types/database.types').Json,
    is_locked: true,
    locked_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from('shift_checklists')
    .upsert(payload, { onConflict: 'branch_id,date,shift' });
  if (error) throw error;
}
