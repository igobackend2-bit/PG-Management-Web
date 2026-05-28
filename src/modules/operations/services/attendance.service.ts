import { supabase } from '../../../services/supabase';
import type { Tables } from '../../../types/database.types';

export type StaffRow      = Tables<'staff'>;
export type AttendanceRow = Tables<'attendance'>;

export type AttendanceWithStaff = {
  staffId:   string;
  staffName: string;
  staffRole: string;
  date:      string;
  status:    string | null;   // 'present' | 'absent' | 'leave' | 'halfday' | null (unmarked)
  shiftIn:   string | null;
  shiftOut:  string | null;
  attId:     string | null;   // null if no attendance record yet
};

export async function fetchAttendanceForDate(
  branchId: string,
  date: string,
): Promise<AttendanceWithStaff[]> {
  const { data: staffList, error: staffErr } = await supabase
    .from('staff')
    .select('id, name, role')
    .eq('branch_id', branchId)
    .order('name');
  if (staffErr) throw staffErr;

  const staff = staffList ?? [];
  if (staff.length === 0) return [];

  const staffIds = staff.map((s) => s.id);
  const { data: attendance, error: attErr } = await supabase
    .from('attendance')
    .select('*')
    .eq('date', date)
    .in('staff_id', staffIds);
  if (attErr) throw attErr;

  const attMap = Object.fromEntries((attendance ?? []).map((a) => [a.staff_id, a]));

  return staff.map((s) => {
    const att = attMap[s.id];
    return {
      staffId:   s.id,
      staffName: s.name,
      staffRole: s.role,
      date,
      status:    att?.status ?? null,
      shiftIn:   att?.shift_in ?? null,
      shiftOut:  att?.shift_out ?? null,
      attId:     att?.id ?? null,
    };
  });
}

export async function markAttendance(
  staffId: string,
  date: string,
  status: string,
  existingId?: string,
): Promise<void> {
  if (existingId) {
    const { error } = await supabase
      .from('attendance')
      .update({ status })
      .eq('id', existingId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('attendance').insert({
      staff_id: staffId,
      date,
      status,
    });
    if (error) throw error;
  }
}
