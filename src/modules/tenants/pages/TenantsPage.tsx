import React from 'react';
import { ModulePlaceholder } from '../../../shared/components/ModulePlaceholder';

export function TenantsPage() {
  return (
    <ModulePlaceholder
      icon="👤"
      title="Tenant CRM"
      description="Tenant profiles, KYC verification, bed allocation, history, and communication."
      phase="Phase 1"
      kpis={['Tenant Retention', 'Vacate Frequency', 'Payment Discipline', 'Occupancy Duration']}
      submodules={['Tenant Profile', 'KYC Verification', 'Bed Allocation', 'Tenant History', 'Communication']}
    />
  );
}
