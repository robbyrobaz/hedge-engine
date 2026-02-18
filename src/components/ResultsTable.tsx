import { useArbStore } from '../store/useArbStore';
import type { HedgeResult } from '../types';
import { PROMO_LABELS, formatOdds } from '../engine/hedgeCalculator';

const RANK_COLORS = ['#ffd700', '#c0c0c0', '#cd7f32', '#00e5ff', '#00e5ff'];

const SPORT_LABELS: Record<string, string> = {
  basketball_nba:        'NBA',
  americanfootball_nfl:  'NFL',
  baseball_mlb:          'MLB',
  icehockey_nhl:         'NHL',
};

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    });
  } catch {
    return iso;
  }
}

function ProfitBar({ profit, max }: { profit: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (profit / max) * 100) : 0;
  return (
    <div className="profit-bar-bg">
      <div className="profit-bar-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

function ResultCard({ result, maxProfit }: { result: HedgeResult; maxProfit: number }) {
  const rankColor = RANK_COLORS[result.rank - 1] ?? '#555';
  const sport = SPORT_LABELS[result.game.sport] ?? result.game.sport;

  return (
    <div className="result-card">
      {/* ── Header row ── */}
      <div className="result-card-header">
        <span className="result-rank" style={{ color: rankColor }}>#{result.rank}</span>

        <div className="result-profit-col">
          <span className="profit-num">${result.guaranteedProfit.toFixed(2)}</span>
          <ProfitBar profit={result.guaranteedProfit} max={maxProfit} />
          <span className="efficiency-pct">{result.efficiency}% efficiency</span>
        </div>

        <div className="result-game-info">
          <span className="result-sport-badge">{sport}</span>
          <span className="result-game-name">
            {result.game.awayTeam} @ {result.game.homeTeam}
          </span>
          <span className="result-game-time">{fmtTime(result.game.time)}</span>
        </div>
      </div>

      {/* ── Bet details row ── */}
      <div className="result-bets-row">
        <div className="result-bet-block result-bet-promo">
          <span className="bet-block-label">PROMO BET</span>
          <span className="type-pill">{PROMO_LABELS[result.promoBet.promoType]}</span>
          <span className="bet-app">{result.promoBet.app}</span>
          <span className="bet-team">{result.promoBet.team}</span>
          <span className="bet-odds">{formatOdds(result.promoBet.odds)}</span>
          <span className="bet-stake">${result.promoBet.stake.toLocaleString()}</span>
        </div>

        <div className="bet-arrow">→</div>

        <div className="result-bet-block result-bet-hedge">
          <span className="bet-block-label">HEDGE BET</span>
          <span className="bet-app">{result.hedgeBet.app}</span>
          <span className="bet-team">{result.hedgeBet.team}</span>
          <span className="bet-odds">{formatOdds(result.hedgeBet.odds)}</span>
          <span className="bet-stake yellow">${result.hedgeBet.stake.toFixed(2)}</span>
        </div>

        <div className="result-outcomes">
          <span className="outcome-label">If promo wins</span>
          <span className="outcome-val green">+${result.ifPromoWins.toFixed(2)}</span>
          <span className="outcome-sep">·</span>
          <span className="outcome-label">If hedge wins</span>
          <span className="outcome-val green">+${result.ifHedgeWins.toFixed(2)}</span>
        </div>
      </div>

      {/* ── Steps ── */}
      <div className="result-steps">
        {result.steps.map((step, i) => (
          <div key={i} className="result-step">{step}</div>
        ))}
      </div>
    </div>
  );
}

export function ResultsTable() {
  const { results, hasCalculated, isCalculating } = useArbStore();

  if (isCalculating) {
    return (
      <section className="section results-section">
        <div className="calculating-state">
          <div className="calc-spinner" />
          <span>Fetching odds &amp; crunching hedges...</span>
        </div>
      </section>
    );
  }

  if (!hasCalculated) return null;

  if (results.length === 0) {
    return (
      <section className="section results-section">
        <div className="no-results">
          <span className="no-results-icon">🔍</span>
          <h3>No profitable hedges found</h3>
          <p>
            Make sure you selected 2+ platforms, have promos with amounts entered,
            and that the platforms you selected have live odds on The Odds API.
            Try adding more platforms or a higher promo amount.
          </p>
        </div>
      </section>
    );
  }

  const maxProfit = results[0].guaranteedProfit;
  const totalProfit = results.reduce((s, r) => s + r.guaranteedProfit, 0);

  return (
    <section className="section results-section">
      <div className="section-header">
        <span className="step-badge step-badge--green">04</span>
        <h2>Top {results.length} Hedge Setups</h2>
        <div className="results-summary">
          <span className="summary-item">
            <span className="summary-label">Best</span>
            <span className="summary-val green">${maxProfit.toFixed(2)}</span>
          </span>
          <span className="summary-divider">·</span>
          <span className="summary-item">
            <span className="summary-label">Stack all</span>
            <span className="summary-val green">${totalProfit.toFixed(2)}</span>
          </span>
        </div>
      </div>

      <div className="results-list">
        {results.map(result => (
          <ResultCard key={`${result.rank}-${result.game.homeTeam}-${result.promoBet.app}`} result={result} maxProfit={maxProfit} />
        ))}
      </div>

      <p className="results-disclaimer">
        * Profit assumes odds remain stable until bets are placed. Verify lines before placing.
        Risk-free conversions assume ~70% free-bet efficiency on the same game.
      </p>
    </section>
  );
}
