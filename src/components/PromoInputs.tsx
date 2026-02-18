import React from 'react';
import { useArbStore } from '../store/useArbStore';
import { APP_MAP } from '../data/apps';
import type { Promo, PromoType } from '../types';
import { SPORTS } from '../types';
import { PROMO_LABELS } from '../engine/hedgeCalculator';

const PROMO_TYPES: PromoType[] = [
  'free_bet',
  'free_bet_sr',
  'deposit_match',
  'risk_free',
  'profit_boost',
  'bet_and_get',
  'bonus_cash',
];

/** Sport options for the filter dropdown */
const SPORT_OPTIONS = [
  { value: 'all', label: 'All Sports' },
  ...SPORTS.map(s => ({ value: s.key, label: s.label })),
];

/** Field config per promo type */
interface FieldConfig {
  prefix1: string;
  placeholder1: string;
  prefix2?: string;
  placeholder2?: string;
}

const FIELD_CONFIG: Record<PromoType, FieldConfig> = {
  free_bet:      { prefix1: '$', placeholder1: 'Amount' },
  free_bet_sr:   { prefix1: '$', placeholder1: 'Amount' },
  deposit_match: { prefix1: '$', placeholder1: 'Match Amount' },
  risk_free:     { prefix1: '$', placeholder1: 'Max Bet' },
  profit_boost:  { prefix1: '%', placeholder1: 'Boost %', prefix2: '$', placeholder2: 'Max Wager' },
  bet_and_get:   { prefix1: '$', placeholder1: 'Qualifying Bet', prefix2: '$', placeholder2: 'Bonus Amount' },
  bonus_cash:    { prefix1: '$', placeholder1: 'Amount' },
};

function PromoRow({ appId, promo }: { appId: string; promo: Promo }) {
  const { updatePromo, removePromo } = useArbStore();
  const up = (field: Partial<Promo>) => updatePromo(appId, promo.id, field);
  const cfg = FIELD_CONFIG[promo.type];

  return (
    <div className="promo-row">
      {/* Promo type */}
      <select
        className="input-select"
        value={promo.type}
        onChange={e => up({ type: e.target.value as PromoType, amount2: undefined })}
      >
        {PROMO_TYPES.map(t => (
          <option key={t} value={t}>{PROMO_LABELS[t]}</option>
        ))}
      </select>

      {/* Sport filter */}
      <select
        className="input-select input-select--sport"
        value={promo.sport || 'all'}
        onChange={e => up({ sport: e.target.value })}
      >
        {SPORT_OPTIONS.map(s => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>

      {/* Primary amount field */}
      <div className="input-group">
        <span className="input-prefix">{cfg.prefix1}</span>
        <input
          className="input-field"
          type="number"
          placeholder={cfg.placeholder1}
          value={promo.amount || ''}
          min={0}
          onChange={e => up({ amount: parseFloat(e.target.value) || 0 })}
        />
      </div>

      {/* Secondary amount field — only for profit_boost and bet_and_get */}
      {cfg.prefix2 && cfg.placeholder2 && (
        <div className="input-group">
          <span className="input-prefix">{cfg.prefix2}</span>
          <input
            className="input-field"
            type="number"
            placeholder={cfg.placeholder2}
            value={promo.amount2 || ''}
            min={0}
            onChange={e => up({ amount2: parseFloat(e.target.value) || 0 })}
          />
        </div>
      )}

      <button
        className="btn-remove"
        onClick={() => removePromo(appId, promo.id)}
        title="Remove promo"
      >
        ×
      </button>
    </div>
  );
}

function AppPromoBlock({ appId }: { appId: string }) {
  const { promosByApp, addPromo } = useArbStore();
  const app = APP_MAP[appId];
  const promos = promosByApp[appId] ?? [];

  return (
    <div className="promo-block" style={{ '--app-color': app?.color ?? '#888' } as React.CSSProperties}>
      <div className="promo-block-header">
        <span className="promo-app-logo" style={{ color: app?.color }}>{app?.logo}</span>
        <span className="promo-app-name">{app?.name}</span>
        <button className="btn-add-promo" onClick={() => addPromo(appId)}>
          + Add Promo
        </button>
      </div>
      {promos.length === 0 ? (
        <p className="no-promos-hint">No promos added. Click + Add Promo to start.</p>
      ) : (
        <div className="promo-rows">
          {promos.map(promo => (
            <PromoRow key={promo.id} appId={appId} promo={promo} />
          ))}
        </div>
      )}
    </div>
  );
}

export function PromoInputs() {
  const { selectedAppIds } = useArbStore();

  if (selectedAppIds.length === 0) return null;

  return (
    <section className="section">
      <div className="section-header">
        <span className="step-badge">02</span>
        <h2>Add Promos</h2>
        <span className="section-hint">Odds are sourced live — just enter type, sport &amp; amount</span>
      </div>
      <div className="promo-blocks">
        {selectedAppIds.map(appId => (
          <AppPromoBlock key={appId} appId={appId} />
        ))}
      </div>
    </section>
  );
}
