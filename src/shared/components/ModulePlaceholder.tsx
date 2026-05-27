import React from 'react';
import './ModulePlaceholder.scss';

interface Props {
  icon: string;
  title: string;
  description: string;
  phase: string;
  kpis: string[];
  submodules: string[];
}

export function ModulePlaceholder({ icon, title, description, phase, kpis, submodules }: Props) {
  return (
    <div className="module-placeholder">
      <div className="mp-header">
        <span className="mp-icon">{icon}</span>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <span className="mp-phase-badge">{phase}</span>
      </div>

      <div className="mp-grid">
        <div className="mp-card">
          <h3>Key Performance Indicators</h3>
          <ul>
            {kpis.map((k) => (
              <li key={k}>
                <span className="mp-dot" />
                {k}
                <span className="mp-value">—</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mp-card">
          <h3>Submodules</h3>
          <ul>
            {submodules.map((s) => (
              <li key={s}>
                <span className="mp-dot" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mp-coming-soon">
        <span>🚧</span>
        <span>This module is coming in <strong>{phase}</strong>. Foundation scaffolding is live.</span>
      </div>
    </div>
  );
}
