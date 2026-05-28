import { supabase } from '../../../services/supabase';

export interface DashboardStats {
  activeTenants: number;
  totalBeds: number;
  occupiedBeds: number;
  occupancyPct: number;
  rentCollectedThisMonth: number;
  rentDueThisMonth: number;
  openTickets: number;
  totalStaff: number;
  expensesThisMonth: number;
  foodCostThisMonth: number;
}

export async function fetchDashboardStats(branchId: string): Promise<DashboardStats> {
  const month = new Date().toISOString().slice(0, 7); // 'YYYY-MM'

  // 1. Active tenants
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, dov')
    .eq('branch_id', branchId);
  const activeTenantIds = (tenants ?? []).filter((t) => !t.dov).map((t) => t.id);

  // 2. Beds via rooms → beds join
  const { data: roomsData } = await supabase
    .from('rooms')
    .select('id, beds(id, is_occupied)')
    .eq('branch_id', branchId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allBeds = (roomsData ?? []).flatMap((r: any) => r.beds ?? []);
  const totalBeds = allBeds.length;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const occupiedBeds = allBeds.filter((b: any) => b.is_occupied).length;

  // 3. Everything else in parallel
  const [rentRes, ticketsRes, staffRes, expRes, foodRes] = await Promise.all([
    activeTenantIds.length > 0
      ? supabase
          .from('rent_records')
          .select('amount, paid_amount')
          .in('tenant_id', activeTenantIds)
          .eq('month', month)
      : Promise.resolve({ data: [] as Array<{ amount: number; paid_amount: number | null }> }),
    supabase.from('tickets').select('id').eq('branch_id', branchId).in('status', ['open', 'in_progress']),
    supabase.from('staff').select('id').eq('branch_id', branchId),
    supabase
      .from('expenses')
      .select('amount')
      .eq('branch_id', branchId)
      .gte('date', `${month}-01`)
      .lte('date', `${month}-31`),
    supabase
      .from('food_purchases')
      .select('total')
      .eq('branch_id', branchId)
      .gte('date', `${month}-01`)
      .lte('date', `${month}-31`),
  ]);

  const recs = (rentRes.data ?? []) as Array<{ amount: number; paid_amount: number | null }>;

  return {
    activeTenants:          activeTenantIds.length,
    totalBeds,
    occupiedBeds,
    occupancyPct:           totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
    rentCollectedThisMonth: recs.reduce((s, r) => s + (r.paid_amount ?? 0), 0),
    rentDueThisMonth:       recs.reduce((s, r) => s + r.amount, 0),
    openTickets:            (ticketsRes.data ?? []).length,
    totalStaff:             (staffRes.data  ?? []).length,
    expensesThisMonth:      ((expRes.data   ?? []) as Array<{ amount: number }>).reduce((s, e) => s + e.amount, 0),
    foodCostThisMonth:      ((foodRes.data  ?? []) as Array<{ total: number }>).reduce((s, p) => s + p.total, 0),
  };
}
