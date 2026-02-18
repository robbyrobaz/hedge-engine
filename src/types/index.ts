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
  | 'profit_boost'    // Profit Boost / Odds Boost — % boost + $max_wager
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
  // Basketball
  { key: 'basketball_nba',           label: 'Basketball (NBA)' },
  { key: 'basketball_ncaab',         label: 'College Basketball' },
  // Football
  { key: 'americanfootball_nfl',     label: 'Football (NFL)' },
  { key: 'americanfootball_ncaaf',   label: 'College Football' },
  // Baseball
  { key: 'baseball_mlb',             label: 'Baseball (MLB)' },
  // Hockey
  { key: 'icehockey_nhl',            label: 'Hockey (NHL)' },
  // Golf
  { key: 'golf_masters_tournament_winner', label: 'Golf — Masters' },
  { key: 'golf_pga_championship_winner',   label: 'Golf — PGA Championship' },
  { key: 'golf_us_open_winner',            label: 'Golf — US Open' },
  { key: 'golf_the_open_championship_winner', label: 'Golf — The Open' },
  // Soccer
  { key: 'soccer_usa_mls',           label: 'Soccer (MLS)' },
  { key: 'soccer_epl',               label: 'Soccer (Premier League)' },
  { key: 'soccer_uefa_champs_league', label: 'Soccer (Champions League)' },
  { key: 'soccer_spain_la_liga',     label: 'Soccer (La Liga)' },
  { key: 'soccer_germany_bundesliga', label: 'Soccer (Bundesliga)' },
  { key: 'soccer_italy_serie_a',     label: 'Soccer (Serie A)' },
  { key: 'soccer_france_ligue_one',  label: 'Soccer (Ligue 1)' },
  // Combat
  { key: 'mma_mixed_martial_arts',   label: 'MMA / UFC' },
  { key: 'boxing_boxing',            label: 'Boxing' },
  // Tennis
  { key: 'tennis_atp_qatar_open',    label: 'Tennis (ATP)' },
  { key: 'tennis_wta_dubai',         label: 'Tennis (WTA)' },
] as const;

export type SportKey = typeof SPORTS[number]['key'];

export const PROMO_LABELS: Record<PromoType, string> = {
  free_bet:      'Free Bet (SNR)',
  free_bet_sr:   'Free Bet (Stake Returned)',
  deposit_match: 'Deposit Match',
  risk_free:     'Risk-Free / First Bet Reset',
  profit_boost:  'Profit / Odds Boost',
  bet_and_get:   'Bet & Get',
  bonus_cash:    'Bonus Cash / Site Credit',
};
