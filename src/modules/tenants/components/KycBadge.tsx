import React from 'react';

interface Props {
  status: string | null;
}

const STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  complete: { label: 'Complete', bg: '#e6f5eb', fg: '#2e9e4f' },
  partial:  { label: 'Partial',  bg: '#fff8e6', fg: '#f0a500' },
  pending:  { label: 'Pending',  bg: '#f5f5f5', fg: '#6b6b6b' },
};

export function KycBadge({ status }: Props) {
  const s = STATUS[status ?? 'pending'] ?? STATUS.pending;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 10px',
      borderRadius: '999px',
      fontSize: '0.75rem',
      fontWeight: 600,
      backgroundColor: s.bg,
      color: s.fg,
    }}>
      {s.label}
    </span>
  );
}
