import { supabase } from '../../../services/supabase';
import type { Tables, TablesInsert, TablesUpdate } from '../../../types/database.types';

// ─── Types ────────────────────────────────────────────────────────────────────
export type StaffRow    = Tables<'staff'>;
export type StaffInsert = TablesInsert<'staff'>;
export type StaffUpdate = TablesUpdate<'staff'>;
export type AttendanceRow = Tables<'attendance'>;

export type AttendanceStatus = 'present' | 'absent' | 'halfday' | 'leave';

export type StaffWithAttendance = StaffRow & {
  todayStatus: AttendanceStatus | null;
};

// ─── Staff CRUD ───────────────────────────────────────────────────────────────
export async function fetchStaff(branchId: string): Promise<StaffRow[]> {
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .eq('branch_id', branchId)
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function createStaff(staff: StaffInsert): Promise<StaffRow> {
  const { data, error } = await supabase
    .from('staff')
    .insert(staff)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateStaff(id: string, updates: StaffUpdate): Promise<StaffRow> {
  const { data, error } = await supabase
    .from('staff')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteStaff(id: string): Promise<void> {
  const { error } = await supabase.from('staff').delete().eq('id', id);
  if (error) throw error;
}

// ─── Attendance ───────────────────────────────────────────────────────────────
export async function fetchAttendanceForDate(
  branchId: string,
  date: string
): Promise<{ staff: StaffRow[]; attendance: AttendanceRow[] }> {
  const [{ data: staffData, error: sErr }, { data: attData, error: aErr }] =
    await Promise.all([
      supabase.from('staff').select('*').eq('branch_id', branchId).order('name'),
      supabase.from('attendance').select('*').eq('date', date),
    ]);

  if (sErr) throw sErr;
  if (aErr) throw aErr;

  const staffList = staffData ?? [];
  const staffIds  = new Set(staffList.map((s) => s.id));

  // Filter attendance to only this branch's staff
  const attFiltered = (attData ?? []).filter((a) => staffIds.has(a.staff_id));

  return { staff: staffList, attendance: attFiltered };
}

export async function upsertAttendance(
  staffId: string,
  date: string,
  status: AttendanceStatus
): Promise<void> {
  const { data: existing } = await supabase
    .from('attendance')
    .select('id')
    .eq('staff_id', staffId)
    .eq('date', date)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('attendance')
      .update({ status })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('attendance')
      .insert({ staff_id: staffId, date, status });
    if (error) throw error;
  }
}

export async function fetchAttendanceSummary(
  branchId: string,
  month: string // YYYY-MM
): Promise<{ staff: StaffRow[]; records: AttendanceRow[] }> {
  const [{ data: staffData }, { data: attData }] = await Promise.all([
    supabase.from('staff').select('*').eq('branch_id', branchId).order('name'),
    supabase.from('attendance').select('*').like('date', `${month}%`),
  ]);

  const staffList = staffData ?? [];
  const staffIds  = new Set(staffList.map((s) => s.id));
  const records   = (attData ?? []).filter((a) => staffIds.has(a.staff_id));

  return { staff: staffList, records };
}
