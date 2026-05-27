import React from 'react';
import { ModulePlaceholder } from '../../../shared/components/ModulePlaceholder';

export function InventoryPage() {
  return (
    <ModulePlaceholder
      icon="📦"
      title="Inventory & Assets"
      description="Room asset tracking, kitchen inventory, consumables, damage reports, and stock verification."
      phase="Phase 2"
      kpis={['Inventory Variance', 'Damage Cost', 'Missing Assets', 'Replacement Frequency']}
      submodules={['Room Asset Tracking', 'Kitchen Inventory', 'Consumables Tracking', 'Damage & Replacement', 'Stock Verification']}
    />
  );
}
