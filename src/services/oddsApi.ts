import type { GameOdds } from '../types';
import { SPORTS } from '../types';

const API_KEY = import.meta.env.VITE_ODDS_API_KEY as string;
const API_BASE = 'https://api.the-odds-api.com/v4/sports';

// ─── Cache constants ──────────────────────────────────────────────────────────
const CACHE_KEY = 'hedgeengine_odds_cache';
const CACHE_TTL_MS = 60 * 60 * 1000;          // 1 hour
const MAX_FETCHES_PER_DAY = 12;                // ×4 sports = 48 API calls/day, well under 500/month
const FETCH_COUNT_KEY = 'hedgeengine_fetch_count';

// Raw shape returned by The Odds API
interface ApiGame {
  id: string;
  sport_key: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: {
    key: string;
    title: string;
    markets: {
      key: string;
      outcomes: { name: string; price: number }[];
    }[];
  }[];
}

interface OddsCache {
  games: GameOdds[];
  timestamp: number;
  creditsRemaining: number | null;
}

export interface OddsServiceResult {
  games: GameOdds[];
  creditsRemaining: number | null;
  fromCache: boolean;
}

export interface CacheStatus {
  isCached: boolean;
  timestamp: number | null;
  creditsRemaining: number | null;
  fetchCount: number;
  maxFetches: number;
  canFetch: boolean;
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

function getCache(): OddsCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache: OddsCache = JSON.parse(raw);
    if (Date.now() - cache.timestamp > CACHE_TTL_MS) return null;
    return cache;
  } catch {
    return null;
  }
}

function setCache(games: GameOdds[], creditsRemaining: number | null): void {
  const cache: OddsCache = { games, timestamp: Date.now(), creditsRemaining };
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage may be full — swallow silently
  }
}

function getFetchCountData(): { date: string; count: number } {
  const today = new Date().toDateString();
  try {
    const raw = localStorage.getItem(FETCH_COUNT_KEY);
    if (!raw) return { date: today, count: 0 };
    const data: { date: string; count: number } = JSON.parse(raw);
    if (data.date !== today) return { date: today, count: 0 };
    return data;
  } catch {
    return { date: today, count: 0 };
  }
}

function canFetchToday(): boolean {
  const data = getFetchCountData();
  return data.count < MAX_FETCHES_PER_DAY;
}

function recordFetch(): void {
  const data = getFetchCountData();
  data.count++;
  try {
    localStorage.setItem(FETCH_COUNT_KEY, JSON.stringify(data));
  } catch { /* swallow */ }
}

/** Returns current cache/fetch status for display in the header. */
export function getCacheStatus(): CacheStatus {
  const cache = getCache();
  const fetchData = getFetchCountData();
  return {
    isCached: cache !== null,
    timestamp: cache?.timestamp ?? null,
    creditsRemaining: cache?.creditsRemaining ?? null,
    fetchCount: fetchData.count,
    maxFetches: MAX_FETCHES_PER_DAY,
    canFetch: fetchData.count < MAX_FETCHES_PER_DAY,
  };
}

// ─── Main fetch ───────────────────────────────────────────────────────────────

/**
 * Fetch h2h (moneyline) odds for all configured sports.
 * Checks localStorage cache first (1-hour TTL).
 * Respects daily fetch limit to conserve API credits.
 * Sports that are out of season return a 422 — we silently skip them.
 */
export async function fetchAllOdds(forceRefresh = false): Promise<OddsServiceResult> {
  // Return cached data if available and not forcing refresh
  if (!forceRefresh) {
    const cached = getCache();
    if (cached) {
      console.log('[oddsApi] Serving from localStorage cache');
      return { games: cached.games, creditsRemaining: cached.creditsRemaining, fromCache: true };
    }
  }

  // Check daily fetch limit
  if (!canFetchToday()) {
    console.warn('[oddsApi] Daily fetch limit reached, serving stale cache or empty');
    // Try serving expired cache rather than nothing
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const stale: OddsCache = JSON.parse(raw);
        return { games: stale.games, creditsRemaining: stale.creditsRemaining, fromCache: true };
      }
    } catch { /* fall through */ }
    return { games: [], creditsRemaining: null, fromCache: false };
  }

  const allGames: GameOdds[] = [];
  let creditsRemaining: number | null = null;

  for (const sport of SPORTS) {
    try {
      const url = new URL(`${API_BASE}/${sport.key}/odds`);
      url.searchParams.set('apiKey', API_KEY);
      url.searchParams.set('regions', 'us');
      url.searchParams.set('markets', 'h2h');
      url.searchParams.set('oddsFormat', 'american');

      const resp = await fetch(url.toString());

      // 422 = sport not currently available / out of season — not an error
      if (resp.status === 422) continue;

      if (!resp.ok) {
        const body = await resp.text().catch(() => '');
        console.warn(`[oddsApi] ${sport.key} → HTTP ${resp.status}`, body);
        continue;
      }

      // Capture remaining credits from latest response
      const remaining = resp.headers.get('x-requests-remaining');
      if (remaining !== null) creditsRemaining = parseInt(remaining, 10);

      const data: ApiGame[] = await resp.json();

      for (const g of data) {
        allGames.push({
          id: g.id,
          sport: g.sport_key,
          homeTeam: g.home_team,
          awayTeam: g.away_team,
          commenceTime: g.commence_time,
          bookmakers: g.bookmakers.map(bm => ({
            key: bm.key,
            title: bm.title,
            markets: bm.markets.map(m => ({
              key: m.key,
              outcomes: m.outcomes,
            })),
          })),
        });
      }
    } catch (err) {
      console.warn(`[oddsApi] Failed to fetch ${sport.key}:`, err);
    }
  }

  // Record fetch and save to cache
  recordFetch();
  setCache(allGames, creditsRemaining);

  return { games: allGames, creditsRemaining, fromCache: false };
}
