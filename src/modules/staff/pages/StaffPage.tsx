import React from 'react';
import { ModulePlaceholder } from '../../../shared/components/ModulePlaceholder';

export function StaffPage() {
  return (
    <ModulePlaceholder
      icon="👷"
      title="Staff Management"
      description="Staff profiles, attendance tracking, salary management, and task assignment."
      phase="Phase 2"
      kpis={['Attendance %', 'Task Completion', 'Salary Expenses', 'Staff Productivity']}
      submodules={['Staff Profiles', 'Attendance Tracking', 'Salary Management', 'Task Assignment']}
    />
  );
}
