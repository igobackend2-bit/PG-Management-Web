import { supabase } from '../../../services/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────
export type BranchSummary = {
  branchId:   string;
  branchName: string;
  totalBeds:     number;
  occupiedBeds:  number;
  occupancyPct:  number;
  totalTenants:  number;
  rentCollected: number;   // this month
  rentDue:       number;   // this month (from rent_records with amount)
  totalExpenses: number;   // this month
  netRevenue:    number;   // rentCollected - totalExpenses
  openTickets:   number;
  staffCount:    number;
  staffSalary:   number;   // total monthly salary of this branch's staff
  presentToday:  number;   // staff marked present today
  absentToday:   number;   // staff marked absent today
};

export type CeoStats = {
  branches:       BranchSummary[];
  totalRevenue:   number;
  totalExpenses:  number;
  totalNetProfit: number;
  totalTenants:   number;
  totalBeds:      number;
  totalOccupied:  number;
  avgOccupancyPct: number;
  openTickets:    number;
  totalStaff:     number;
  totalStaffSalary: number;
  totalPresentToday: number;
  totalAbsentToday:  number;
};

// ─── Owner branches helper ────────────────────────────────────────────────────
async function getOwnerBranchIds(): Promise<{ id: string; name: string }[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: owner } = await supabase
    .from('owners')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();
  if (!owner) throw new Error('Owner not found');

  const { data, error } = await supabase
    .from('branches')
    .select('id, name')
    .eq('owner_id', owner.id)
    .order('name');
  if (error) throw error;
  return data ?? [];
}

// ─── Main analytics fetch ─────────────────────────────────────────────────────
export async function fetchCeoStats(month: string): Promise<CeoStats> {
  const branches = await getOwnerBranchIds();
  const branchIds = branches.map(b => b.id);

  if (branchIds.length === 0) {
    return {
      branches: [],
      totalRevenue: 0, totalExpenses: 0, totalNetProfit: 0,
      totalTenants: 0, totalBeds: 0, totalOccupied: 0,
      avgOccupancyPct: 0, openTickets: 0,
      totalStaff: 0, totalStaffSalary: 0,
      totalPresentToday: 0, totalAbsentToday: 0,
    };
  }

  const today = new Date().toISOString().slice(0, 10);

  // Parallel fetch all data
  const [
    bedsRes,
    tenantsRes,
    rentRes,
    expensesRes,
    ticketsRes,
    staffRes,
    attendanceRes,
  ] = await Promise.all([
    supabase.from('beds').select('id, is_occupied, rooms!inner(branch_id)')
      .in('rooms.branch_id', branchIds),
    supabase.from('tenants').select('id, branch_id').in('branch_id', branchIds).is('dov', null),
    supabase.from('rent_records')
      .select('tenant_id, amount, paid_amount, tenants!inner(branch_id)')
      .eq('month', month)
      .in('tenants.branch_id', branchIds),
    supabase.from('expenses').select('branch_id, amount')
      .in('branch_id', branchIds)
      .gte('date', `${month}-01`)
      .lte('date', `${month}-31`),
    supabase.from('tickets').select('branch_id, status')
      .in('branch_id', branchIds)
      .neq('status', 'resolved'),
    supabase.from('staff').select('id, branch_id, salary').in('branch_id', branchIds),
    supabase.from('attendance')
      .select('staff_id, status, staff!inner(branch_id)')
      .eq('date', today)
      .in('staff.branch_id', branchIds),
  ]);

  const beds      = (bedsRes.data ?? []) as unknown as { id: string; is_occupied: boolean | null; rooms: { branch_id: string } }[];
  const tenants   = tenantsRes.data ?? [];
  const rentRecs  = (rentRes.data  ?? []) as unknown as { tenant_id: string; amount: number; paid_amount: number | null; tenants: { branch_id: string } }[];
  const expenses  = expensesRes.data ?? [];
  const tickets   = ticketsRes.data ?? [];
  const staff     = (staffRes.data ?? []) as { id: string; branch_id: string; salary: number | null }[];
  const attendance = (attendanceRes.data ?? []) as unknown as { staff_id: string; status: string; staff: { branch_id: string } }[];

  const summaries: BranchSummary[] = branches.map(b => {
    const bBeds     = beds.filter(bd => (bd.rooms as { branch_id: string }).branch_id === b.id);
    const bTenants  = tenants.filter(t => t.branch_id === b.id);
    const bRent     = rentRecs.filter(r => (r.tenants as { branch_id: string }).branch_id === b.id);
    const bExpenses = expenses.filter(e => e.branch_id === b.id);
    const bTickets  = tickets.filter(t => t.branch_id === b.id);
    const bStaff    = staff.filter(s => s.branch_id === b.id);
    const bAtt      = attendance.filter(a => a.staff.branch_id === b.id);

    const totalBeds    = bBeds.length;
    const occupiedBeds = bBeds.filter(bd => bd.is_occupied).length;
    const rentCollected = bRent.reduce((s, r) => s + (r.paid_amount ?? 0), 0);
    const rentDue       = bRent.reduce((s, r) => s + r.amount, 0);
    const totalExpenses = bExpenses.reduce((s, e) => s + e.amount, 0);

    return {
      branchId:     b.id,
      branchName:   b.name,
      totalBeds,
      occupiedBeds,
      occupancyPct: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
      totalTenants: bTenants.length,
      rentCollected,
      rentDue,
      totalExpenses,
      netRevenue:   rentCollected - totalExpenses,
      openTickets:  bTickets.length,
      staffCount:   bStaff.length,
      staffSalary:  bStaff.reduce((s, st) => s + (st.salary ?? 0), 0),
      presentToday: bAtt.filter(a => a.status === 'present' || a.status === 'halfday').length,
      absentToday:  bAtt.filter(a => a.status === 'absent').length,
    };
  });

  const totalRevenue  = summaries.reduce((s, b) => s + b.rentCollected, 0);
  const totalExpenses2 = summaries.reduce((s, b) => s + b.totalExpenses, 0);
  const totalBeds     = summaries.reduce((s, b) => s + b.totalBeds, 0);
  const totalOccupied = summaries.reduce((s, b) => s + b.occupiedBeds, 0);

  return {
    branches:        summaries,
    totalRevenue,
    totalExpenses:   totalExpenses2,
    totalNetProfit:  totalRevenue - totalExpenses2,
    totalTenants:    summaries.reduce((s, b) => s + b.totalTenants, 0),
    totalBeds,
    totalOccupied,
    avgOccupancyPct: totalBeds > 0 ? Math.round((totalOccupied / totalBeds) * 100) : 0,
    openTickets:     summaries.reduce((s, b) => s + b.openTickets, 0),
    totalStaff:      summaries.reduce((s, b) => s + b.staffCount, 0),
    totalStaffSalary: summaries.reduce((s, b) => s + b.staffSalary, 0),
    totalPresentToday: summaries.reduce((s, b) => s + b.presentToday, 0),
    totalAbsentToday:  summaries.reduce((s, b) => s + b.absentToday, 0),
  };
}

// ─── Monthly trend (last 6 months) ────────────────────────────────────────────
export type MonthTrend = {
  month: string;        // "2026-01"
  revenue: number;
  expenses: number;
};

export async function fetchMonthlyTrend(months: string[]): Promise<MonthTrend[]> {
  const branches = await getOwnerBranchIds();
  const branchIds = branches.map(b => b.id);
  if (branchIds.length === 0) return months.map(m => ({ month: m, revenue: 0, expenses: 0 }));

  const results: MonthTrend[] = [];

  for (const month of months) {
    const [rentRes, expRes] = await Promise.all([
      supabase.from('rent_records')
        .select('paid_amount, tenants!inner(branch_id)')
        .eq('month', month)
        .in('tenants.branch_id', branchIds),
      supabase.from('expenses')
        .select('amount')
        .in('branch_id', branchIds)
        .gte('date', `${month}-01`)
        .lte('date', `${month}-31`),
    ]);
    const revenue  = ((rentRes.data ?? []) as unknown as { paid_amount: number | null }[])
      .reduce((s, r) => s + (r.paid_amount ?? 0), 0);
    const expenses = (expRes.data ?? []).reduce((s, e) => s + e.amount, 0);
    results.push({ month, revenue, expenses });
  }
  return results;
}
