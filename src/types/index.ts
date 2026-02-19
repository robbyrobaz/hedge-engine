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
  /**
   * 3-way market draw risk (soccer, etc.). null for 2-way markets.
   * If the game draws, both bets lose and `loss` is the total capital lost.
   * `probability` is the implied draw chance from market odds.
   * `ev` is expected value factoring in draw probability.
   */
  drawRisk: {
    loss: number;        // negative: total loss if draw occurs
    probability: number; // 0–1 implied draw probability
    ev: number;          // EV = guaranteedProfit*(1-drawProb) + loss*drawProb
  } | null;
}

/**
 * SPORT GROUPS — user picks a category, engine matches all leagues within it.
 * Each group has a list of API keys that get fetched & matched.
 */
export interface SportGroup {
  id: string;
  label: string;
  keys: string[];
}

export const SPORT_GROUPS: SportGroup[] = [
  { id: 'basketball', label: 'Basketball',     keys: ['basketball_nba', 'basketball_ncaab'] },
  { id: 'football',   label: 'Football',       keys: ['americanfootball_nfl', 'americanfootball_ncaaf'] },
  { id: 'baseball',   label: 'Baseball',       keys: ['baseball_mlb'] },
  { id: 'hockey',     label: 'Hockey',         keys: ['icehockey_nhl'] },
  { id: 'golf',       label: 'Golf',           keys: ['golf_masters_tournament_winner', 'golf_pga_championship_winner', 'golf_us_open_winner', 'golf_the_open_championship_winner'] },
  { id: 'soccer',     label: 'Soccer',         keys: ['soccer_usa_mls', 'soccer_epl', 'soccer_uefa_champs_league', 'soccer_spain_la_liga', 'soccer_germany_bundesliga', 'soccer_italy_serie_a', 'soccer_france_ligue_one'] },
  { id: 'mma',        label: 'MMA / UFC',      keys: ['mma_mixed_martial_arts'] },
  { id: 'boxing',     label: 'Boxing',          keys: ['boxing_boxing'] },
  { id: 'tennis',     label: 'Tennis',          keys: ['tennis_atp_qatar_open', 'tennis_wta_dubai'] },
];

/** Flat list of all API sport keys (for fetching) */
export const SPORTS = SPORT_GROUPS.flatMap(g => g.keys.map(key => ({ key, label: g.label, group: g.id })));

export type SportKey = typeof SPORTS[number]['key'];

export interface Preset {
  id: string;
  name: string;
  savedAt: string; // ISO timestamp
  selectedAppIds: string[];
  promosByApp: Record<string, Promo[]>;
  maxBudget: number;
}

export const PROMO_LABELS: Record<PromoType, string> = {
  free_bet:      'Free Bet (SNR)',
  free_bet_sr:   'Free Bet (Stake Returned)',
  deposit_match: 'Deposit Match',
  risk_free:     'Risk-Free / First Bet Reset',
  profit_boost:  'Profit / Odds Boost',
  bet_and_get:   'Bet & Get',
  bonus_cash:    'Bonus Cash / Site Credit',
};
