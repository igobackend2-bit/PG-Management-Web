import React from 'react';
import { ModulePlaceholder } from '../../../shared/components/ModulePlaceholder';

export function DocumentsPage() {
  return (
    <ModulePlaceholder
      icon="📄"
      title="Documents"
      description="Tenant KYC, staff contracts, vendor invoices, agreements — all centralized with expiry reminders."
      phase="Phase 4"
      kpis={['Pending KYC', 'Expiring Soon', 'Documents Uploaded', 'Agreements Active']}
      submodules={['Tenant Documents', 'Operational Documents', 'Staff Documents', 'OCR Scanning']}
    />
  );
}
