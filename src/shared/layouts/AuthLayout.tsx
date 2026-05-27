import React from 'react';
import { Outlet } from 'react-router-dom';
import './AuthLayout.scss';

export function AuthLayout() {
  return (
    <div className="auth-layout">
      <div className="auth-brand">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="3" width="20" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
          <path d="M8 3v18M16 3v18M2 9h20M2 15h20" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
        <h1>IGO PG</h1>
        <p>Profitability & Operations Platform</p>
      </div>
      <div className="auth-card">
        <Outlet />
      </div>
    </div>
  );
}
