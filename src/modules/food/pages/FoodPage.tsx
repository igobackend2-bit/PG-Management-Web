import React from 'react';
import { ModulePlaceholder } from '../../../shared/components/ModulePlaceholder';

export function FoodPage() {
  return (
    <ModulePlaceholder
      icon="🍽"
      title="Food & Kitchen"
      description="Grocery purchases, kitchen inventory, meal tracking, food cost analysis, and wastage management."
      phase="Phase 2"
      kpis={['Cost per Plate', 'Food Wastage %', 'Grocery Variance', 'Kitchen Expense Ratio']}
      submodules={['Grocery Purchase', 'Kitchen Inventory', 'Meal Tracking', 'Food Cost Analysis', 'Wastage Management']}
    />
  );
}
