import { AppSelector } from './components/AppSelector';
import { PromoInputs } from './components/PromoInputs';
import { ResultsTable } from './components/ResultsTable';
import { useArbStore } from './store/useArbStore';
import './App.css';

function timeAgo(date: Date | null): string {
  if (!date) return 'Never';
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60) return 'Just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  return `${hr}h ago`;
}

function OddsStatusBar() {
  const { lastFetched, creditsRemaining, isFetching, refreshOdds, fetchCount, maxFetches } = useArbStore();

  const approachingLimit = fetchCount >= maxFetches - 2;
  const atLimit = fetchCount >= maxFetches;
  const lowCredits = creditsRemaining !== null && creditsRemaining < 100;

  return (
    <div className="odds-status-bar">
      <div className="odds-status-left">
        <span className={`odds-status-dot ${isFetching ? 'fetching' : lastFetched ? 'fresh' : 'stale'}`} />
        <span className="odds-status-text">
          {isFetching
            ? 'Fetching live odds…'
            : `Odds: ${lastFetched ? 'Live' : 'Not loaded'} (${timeAgo(lastFetched)})`}
        </span>

        {creditsRemaining !== null && (
          <span className={`odds-credits ${lowCredits ? 'odds-credits--warn' : ''}`}>
            · {creditsRemaining} credits left
          </span>
        )}

        <span className={`odds-fetch-count ${approachingLimit ? 'odds-fetch-count--warn' : ''}`}>
          · {fetchCount}/{maxFetches} refreshes today
          {atLimit ? ' ⚠ limit reached' : approachingLimit ? ' ⚠ nearly full' : ''}
        </span>
      </div>
      <button
        className="btn-refresh"
        onClick={() => void refreshOdds()}
        disabled={isFetching || atLimit}
        title={atLimit ? 'Daily refresh limit reached' : 'Force refresh odds from The Odds API'}
      >
        {isFetching ? '↻ Refreshing…' : '↻ Refresh Odds'}
      </button>
    </div>
  );
}

function CalculateBar() {
  const { selectedAppIds, promosByApp, calculate, reset, isCalculating } = useArbStore();

  const totalPromos = selectedAppIds.reduce(
    (sum, id) => sum + (promosByApp[id]?.filter(p => p.amount > 0).length ?? 0),
    0,
  );
  const canCalc = selectedAppIds.length >= 2 && totalPromos >= 1;

  return (
    <div className="calc-bar">
      <div className="calc-bar-left">
        <span className="step-badge">03</span>
        <div>
          <div className="calc-title">Calculate Hedges</div>
          <div className="calc-subtitle">
            {totalPromos} promo{totalPromos !== 1 ? 's' : ''} across{' '}
            {selectedAppIds.length} platform{selectedAppIds.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
      <div className="calc-bar-right">
        <button className="btn-reset" onClick={reset}>Reset</button>
        <button
          className={`btn-calculate ${canCalc ? 'btn-calculate--active' : ''}`}
          onClick={() => void calculate()}
          disabled={!canCalc || isCalculating}
        >
          {isCalculating ? 'Fetching & Calculating…' : '⚡ Find Top 10 Hedges'}
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">⚡</span>
            <span className="logo-text">HedgeEngine</span>
            <span className="logo-version">PRO</span>
          </div>
          <div className="header-tagline">Guaranteed-profit promo clearing · Live odds via The Odds API</div>
          <div className="header-right">
            <OddsStatusBar />
          </div>
        </div>
      </header>

      <main className="main">
        <AppSelector />
        <PromoInputs />
        <CalculateBar />
        <ResultsTable />
      </main>

      <footer className="footer">
        <p>Math runs locally. Odds sourced from The Odds API. Built for pros.</p>
      </footer>
    </div>
  );
}
