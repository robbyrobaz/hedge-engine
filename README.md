# ⚡ HedgeEngine PRO

**Guaranteed-profit promo clearing for sports bettors.** Live odds from 15+ sportsbooks × your personal promos = instant hedge calculations ranked by profit.

Built for arbitrage hunters who already know the math — no hand-holding, just speed and accuracy.

## What It Does

1. **Select your sportsbooks** (22 books + 4 exchanges)
2. **Enter your promos** — type, sport, and amount per book
3. **Hit Calculate** — engine finds top 10 guaranteed-profit hedge setups instantly

## Promo Types Supported

| Type | Fields | Example |
|------|--------|---------|
| Free Bet (SNR) | $ amount | DraftKings $500 free bet |
| Free Bet (Stake Returned) | $ amount | Rare — stake returned on win |
| Deposit Match | $ amount | BetMGM $1,000 deposit match |
| Risk-Free / First Bet Reset | $ amount | theScore $1,000 first bet reset |
| Profit Boost | % boost + $ max wager | FanDuel 30% boost, $25 max |
| Odds Boost | $ amount | Pre-set boosted odds on specific bet |
| Bet & Get | $ qualifying bet + $ bonus | Bet $50, get $25 free bet |
| Bonus Cash / Site Credit | $ amount | Site credit, stake returned |

Each promo can be restricted to a specific sport (NBA, CBB, NFL, CFB, MLB, NHL, MLS, EPL, UCL, Olympic Hockey) or left on "All Sports".

## Odds Data

Real-time odds from [The Odds API](https://the-odds-api.com/) (free tier: 500 requests/month).

**Built-in caching:**
- 1-hour localStorage cache (survives page reloads)
- 12 refreshes/day max (~48 API calls/day, well under monthly limit)
- Status bar shows: cache age, credits remaining, daily refresh count

## Tech Stack

- **React 19** + TypeScript + Vite
- **Zustand** for state management
- **Pure JS hedge math engine** — <1ms execution, zero API calls for calculations
- Dark theme, responsive, trading-terminal aesthetic
- ~69KB gzipped total

## Quick Start

```bash
# Clone and install
git clone https://github.com/robbyrobaz/hedge-engine.git
cd hedge-engine
npm install

# Add your Odds API key
echo "VITE_ODDS_API_KEY=your_key_here" > .env

# Run dev server
npm run dev
# → http://localhost:5173

# Production build
npm run build
```

## How the Math Works

The hedge calculator uses standard arbitrage formulas:

- **Free Bet (SNR):** `layStake = F×(backDec-1) / hedgeDec` → guaranteed profit from odds gap
- **Profit Boost:** Applies boost % to back decimal, then hedges at market odds → boost premium is pure profit
- **Risk-Free:** Two-phase: hedge real bet (phase 1), convert resulting free bet at ~70% efficiency (phase 2)
- **Bet & Get:** Hedge qualifying bet (small vig loss), then convert bonus as free bet

All math runs client-side in `src/engine/hedgeCalculator.ts`. No server needed.

## Project Structure

```
src/
├── components/       # React UI components
│   ├── AppSelector.tsx    # Sportsbook chip grid
│   ├── PromoInputs.tsx    # Promo entry cards (type + sport + amounts)
│   └── ResultsTable.tsx   # Ranked hedge results
├── engine/
│   └── hedgeCalculator.ts # Pure math engine (8 promo formulas)
├── services/
│   └── oddsApi.ts         # The Odds API client + localStorage cache
├── store/
│   └── useArbStore.ts     # Zustand state management
├── data/
│   └── apps.ts            # 22 sportsbooks + 4 exchanges
├── types/
│   └── index.ts           # TypeScript interfaces
├── App.tsx                # Main layout + header
└── App.css                # Dark theme styles
```

## License

MIT
