import React from 'react';
import { BETTING_APPS } from '../data/apps';
import { useArbStore } from '../store/useArbStore';

export function AppSelector() {
  const { selectedAppIds, toggleApp } = useArbStore();
  const sportsbooks = BETTING_APPS.filter(a => !a.isExchange);
  const exchanges   = BETTING_APPS.filter(a => a.isExchange);

  return (
    <section className="section">
      <div className="section-header">
        <span className="step-badge">01</span>
        <h2>Select Platforms</h2>
        {selectedAppIds.length > 0 && (
          <span className="badge-count">{selectedAppIds.length} selected</span>
        )}
      </div>

      <div className="app-group-label">Sportsbooks</div>
      <div className="app-grid">
        {sportsbooks.map(app => {
          const active = selectedAppIds.includes(app.id);
          return (
            <button
              key={app.id}
              onClick={() => toggleApp(app.id)}
              className={`app-chip ${active ? 'app-chip--active' : ''}`}
              style={active ? { '--accent': app.color } as React.CSSProperties : {}}
            >
              <span className="app-chip-logo" style={{ color: active ? app.color : undefined }}>
                {app.logo}
              </span>
              <span className="app-chip-name">{app.name}</span>
              {active && <span className="app-chip-check">✓</span>}
            </button>
          );
        })}
      </div>

      <div className="app-group-label" style={{ marginTop: '1.5rem' }}>
        Exchanges &amp; Sharp Books
      </div>
      <div className="app-grid">
        {exchanges.map(app => {
          const active = selectedAppIds.includes(app.id);
          return (
            <button
              key={app.id}
              onClick={() => toggleApp(app.id)}
              className={`app-chip app-chip--exchange ${active ? 'app-chip--active' : ''}`}
              style={active ? { '--accent': app.color } as React.CSSProperties : {}}
            >
              <span className="app-chip-logo" style={{ color: active ? app.color : undefined }}>
                {app.logo}
              </span>
              <span className="app-chip-name">{app.name}</span>
              {active && <span className="app-chip-check">✓</span>}
            </button>
          );
        })}
      </div>

      {selectedAppIds.length === 1 && (
        <p className="helper-text">Select at least 2 platforms to find hedge opportunities.</p>
      )}
    </section>
  );
}
