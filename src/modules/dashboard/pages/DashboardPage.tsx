import React from 'react';
import { useBranchStore } from '../../../store/branchStore';
import './DashboardPage.scss';

export function DashboardPage() {
  const { selectedBranch } = useBranchStore();

  const kpis = [
    { label: 'Occupancy', value: '—', unit: '%', color: 'blue' },
    { label: 'Rent Collected', value: '—', unit: '₹', color: 'green' },
    { label: 'Pending Dues', value: '—', unit: '₹', color: 'red' },
    { label: 'Open Tickets', value: '—', unit: '', color: 'yellow' },
    { label: 'Profit Margin', value: '—', unit: '%', color: 'green' },
    { label: 'Revenue / Bed', value: '—', unit: '₹', color: 'blue' },
  ];

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h2>Dashboard</h2>
        {selectedBranch && <span className="branch-tag">{selectedBranch.name}</span>}
      </div>

      <div className="kpi-grid">
        {kpis.map((k) => (
          <div key={k.label} className={`kpi-card kpi-${k.color}`}>
            <span className="kpi-value">{k.unit === '₹' ? `${k.unit}${k.value}` : `${k.value}${k.unit}`}</span>
            <span className="kpi-label">{k.label}</span>
          </div>
        ))}
      </div>

      <div className="coming-soon-modules">
        <h3>Platform Modules</h3>
        <div className="module-grid">
          {[
            ['Accounts', '/accounts', '₹', 'Rent, P&L, Cashbook'],
            ['Operations', '/operations', '🔧', 'Tickets, Maintenance'],
            ['Food & Kitchen', '/food', '🍽', 'Cost, Wastage, Meals'],
            ['Inventory', '/inventory', '📦', 'Assets, Stock'],
            ['Tenants', '/tenants', '👤', 'CRM, KYC, History'],
            ['Leads', '/leads', '📣', 'Vacancies, Funnel'],
            ['Staff', '/staff', '👷', 'Attendance, Salary'],
            ['Reports', '/reports', '📊', 'Analytics, P&L'],
            ['Documents', '/documents', '📄', 'KYC, Agreements'],
          ].map(([name, , icon, desc]) => (
            <div key={name} className="module-card">
              <span className="module-icon">{icon}</span>
              <span className="module-name">{name}</span>
              <span className="module-desc">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
