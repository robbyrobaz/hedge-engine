export interface BettingApp {
  id: string;
  name: string;
  color: string;
  logo: string;
  isExchange: boolean;
  /** Key used by The Odds API (null = not available on the API) */
  oddsApiKey: string | null;
}

export type PromoType =
  | 'free_bet'        // Free Bet (SNR) — $amount
  | 'free_bet_sr'     // Free Bet (Stake Returned) — $amount
  | 'deposit_match'   // Deposit Match — $amount
  | 'risk_free'       // Risk-Free / First Bet Reset / No Sweat — $amount
  | 'profit_boost'    // Profit Boost — % boost + $max_wager
  | 'odds_boost'      // Odds Boost (specific boosted odds) — $amount
  | 'bet_and_get'     // Bet & Get — $qualifying_bet + $bonus_amount
  | 'bonus_cash';     // Bonus Cash / Site Credit — $amount (stake returned)

export interface Promo {
  id: string;
  type: PromoType;
  amount: number;       // Primary: dollar amount OR percentage (for profit_boost)
  amount2?: number;     // Secondary: max wager (profit_boost) or bonus amount (bet_and_get)
  sport: string;        // 'all' or a SPORTS key — restricts which games this promo applies to
  label?: string;
}

export interface OddsOutcome {
  name: string;
  price: number; // American odds
}

export interface OddsMarket {
  key: string;
  outcomes: OddsOutcome[];
}

export interface OddsBookmaker {
  key: string;
  title: string;
  markets: OddsMarket[];
}

export interface GameOdds {
  id: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  bookmakers: OddsBookmaker[];
}

export interface HedgeResult {
  rank: number;
  guaranteedProfit: number;
  efficiency: number; // profit / promo amount (0–1)
  game: {
    homeTeam: string;
    awayTeam: string;
    sport: string;
    time: string;
  };
  promoBet: {
    app: string;
    team: string;
    odds: number; // American
    stake: number;
    promoType: PromoType;
  };
  hedgeBet: {
    app: string;
    team: string;
    odds: number; // American
    stake: number;
  };
  ifPromoWins: number;
  ifHedgeWins: number;
  steps: string[];
}

export const SPORTS = [
  { key: 'basketball_nba',           label: 'NBA' },
  { key: 'basketball_ncaab',         label: 'CBB' },
  { key: 'americanfootball_nfl',     label: 'NFL' },
  { key: 'americanfootball_ncaaf',   label: 'CFB' },
  { key: 'baseball_mlb',             label: 'MLB' },
  { key: 'icehockey_nhl',            label: 'NHL' },
  { key: 'soccer_usa_mls',           label: 'MLS' },
  { key: 'soccer_epl',               label: 'EPL' },
  { key: 'soccer_uefa_champs_league', label: 'UCL' },
  { key: 'icehockey_olympics_mens',  label: 'Hockey (Olympics)' },
] as const;

export type SportKey = typeof SPORTS[number]['key'];

export const PROMO_LABELS: Record<PromoType, string> = {
  free_bet:      'Free Bet (SNR)',
  free_bet_sr:   'Free Bet (Stake Returned)',
  deposit_match: 'Deposit Match',
  risk_free:     'Risk-Free / First Bet Reset',
  profit_boost:  'Profit Boost',
  odds_boost:    'Odds Boost',
  bet_and_get:   'Bet & Get',
  bonus_cash:    'Bonus Cash / Site Credit',
};
