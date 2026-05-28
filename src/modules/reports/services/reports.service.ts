import { supabase } from '../../../services/supabase';

export interface MonthlyReport {
  rentCollected:     number;
  rentDue:           number;
  rentPending:       number;
  expenses:          number;
  foodCost:          number;
  totalIncome:       number;
  totalExpenditure:  number;
  netPL:             number;
  margin:            number;
}

export async function fetchMonthlyReport(
  branchId: string,
  month: string,
): Promise<MonthlyReport> {
  const monthStart = `${month}-01`;

  // Tenants active at any point during the month (not vacated before month start)
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, dov')
    .eq('branch_id', branchId);

  const tenantIds = (tenants ?? [])
    .filter((t) => !t.dov || t.dov >= monthStart)
    .map((t) => t.id);

  const [rentRes, expRes, foodRes] = await Promise.all([
    tenantIds.length > 0
      ? supabase
          .from('rent_records')
          .select('amount, paid_amount')
          .in('tenant_id', tenantIds)
          .eq('month', month)
      : Promise.resolve({ data: [] as Array<{ amount: number; paid_amount: number | null }> }),
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

  const recs         = (rentRes.data ?? []) as Array<{ amount: number; paid_amount: number | null }>;
  const rentCollected = recs.reduce((s, r) => s + (r.paid_amount ?? 0), 0);
  const rentDue       = recs.reduce((s, r) => s + r.amount, 0);
  const expenses      = ((expRes.data  ?? []) as Array<{ amount: number }>).reduce((s, e) => s + e.amount, 0);
  const foodCost      = ((foodRes.data ?? []) as Array<{ total: number }>).reduce((s, p) => s + p.total, 0);
  const totalExpenditure = expenses + foodCost;
  const netPL         = rentCollected - totalExpenditure;
  const margin        = rentCollected > 0 ? Math.round((netPL / rentCollected) * 100) : 0;

  return {
    rentCollected,
    rentDue,
    rentPending:      Math.max(0, rentDue - rentCollected),
    expenses,
    foodCost,
    totalIncome:      rentCollected,
    totalExpenditure,
    netPL,
    margin,
  };
}
