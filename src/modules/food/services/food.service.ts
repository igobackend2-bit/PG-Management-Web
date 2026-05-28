import { supabase } from '../../../services/supabase';
import type { Tables, TablesInsert } from '../../../types/database.types';

// ─── Types ────────────────────────────────────────────────────────────────────
export type MealTracking  = Tables<'meal_tracking'>;
export type FoodPurchase  = Tables<'food_purchases'>;

export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner'] as const;
export type MealType = typeof MEAL_TYPES[number];

// ─── Meal Tracking ────────────────────────────────────────────────────────────
export async function fetchMealTracking(
  branchId: string,
  date: string
): Promise<MealTracking[]> {
  const { data, error } = await supabase
    .from('meal_tracking')
    .select('*')
    .eq('branch_id', branchId)
    .eq('date', date);
  if (error) throw error;
  return data ?? [];
}

export async function fetchMealTrackingRange(
  branchId: string,
  fromDate: string,
  toDate: string
): Promise<MealTracking[]> {
  const { data, error } = await supabase
    .from('meal_tracking')
    .select('*')
    .eq('branch_id', branchId)
    .gte('date', fromDate)
    .lte('date', toDate)
    .order('date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function upsertMeal(
  branchId: string,
  date: string,
  mealType: string,
  count: number,
  cost: number | null
): Promise<void> {
  const { data: existing } = await supabase
    .from('meal_tracking')
    .select('id')
    .eq('branch_id', branchId)
    .eq('date', date)
    .eq('meal_type', mealType)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('meal_tracking')
      .update({ count, cost })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('meal_tracking')
      .insert({ branch_id: branchId, date, meal_type: mealType, count, cost });
    if (error) throw error;
  }
}

// ─── Food Purchases ───────────────────────────────────────────────────────────
export async function fetchFoodPurchases(branchId: string): Promise<FoodPurchase[]> {
  const { data, error } = await supabase
    .from('food_purchases')
    .select('*')
    .eq('branch_id', branchId)
    .order('date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createFoodPurchase(
  purchase: TablesInsert<'food_purchases'>
): Promise<FoodPurchase> {
  const { data, error } = await supabase
    .from('food_purchases')
    .insert(purchase)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteFoodPurchase(id: string): Promise<void> {
  const { error } = await supabase.from('food_purchases').delete().eq('id', id);
  if (error) throw error;
}
