import { supabase } from '../../../services/supabase';

export interface ExpenseCategoryRow {
  category: string;
  amount:   number;
}

export interface MonthlyReport {
  rentCollected:      number;
  rentDue:            number;
  rentPending:        number;
  expenses:           number;
  foodCost:           number;
  totalIncome:        number;
  totalExpenditure:   number;
  netPL:              number;
  margin:             number;
  expenseByCategory:  ExpenseCategoryRow[];
  activeTenants:      number;
  paidTenants:        number;
}

export interface TrendMonth {
  month:     string; // 'YYYY-MM'
  revenue:   number;
  expenses:  number;
  netPL:     number;
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
      .select('amount, category')
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

  const recs  = (rentRes.data ?? []) as Array<{ amount: number; paid_amount: number | null }>;
  const expRows = (expRes.data ?? []) as Array<{ amount: number; category: string }>;

  const rentCollected = recs.reduce((s, r) => s + (r.paid_amount ?? 0), 0);
  const rentDue       = recs.reduce((s, r) => s + r.amount, 0);
  const expenses      = expRows.reduce((s, e) => s + e.amount, 0);
  const foodCost      = ((foodRes.data ?? []) as Array<{ total: number }>).reduce((s, p) => s + p.total, 0);
  const totalExpenditure = expenses + foodCost;
  const netPL         = rentCollected - totalExpenditure;
  const margin        = rentCollected > 0 ? Math.round((netPL / rentCollected) * 100) : 0;

  // Group expenses by category
  const catMap: Record<string, number> = {};
  for (const e of expRows) {
    catMap[e.category] = (catMap[e.category] ?? 0) + e.amount;
  }
  if (foodCost > 0) {
    catMap['Food & Kitchen'] = (catMap['Food & Kitchen'] ?? 0) + foodCost;
  }
  const expenseByCategory: ExpenseCategoryRow[] = Object.entries(catMap)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  const paidTenants = recs.filter((r) => (r.paid_amount ?? 0) >= r.amount).length;

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
    expenseByCategory,
    activeTenants:    tenantIds.length,
    paidTenants,
  };
}

// ─── 6-month trend ────────────────────────────────────────────────────────────
export async function fetchMonthlyTrend(
  branchId: string,
  months: string[],
): Promise<TrendMonth[]> {
  const results: TrendMonth[] = [];

  for (const month of months) {
    const [expRes, foodRes, rentRes, tenants] = await Promise.all([
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
      supabase
        .from('rent_records')
        .select('paid_amount, tenant_id')
        .eq('month', month),
      supabase
        .from('tenants')
        .select('id')
        .eq('branch_id', branchId),
    ]);

    const branchTenantIds = new Set((tenants.data ?? []).map((t) => t.id));
    const revenue  = ((rentRes.data ?? []) as Array<{ paid_amount: number | null; tenant_id: string }>)
      .filter((r) => branchTenantIds.has(r.tenant_id))
      .reduce((s, r) => s + (r.paid_amount ?? 0), 0);
    const expenses = ((expRes.data ?? []) as Array<{ amount: number }>).reduce((s, e) => s + e.amount, 0)
      + ((foodRes.data ?? []) as Array<{ total: number }>).reduce((s, p) => s + p.total, 0);

    results.push({ month, revenue, expenses, netPL: revenue - expenses });
  }

  return results;
}
