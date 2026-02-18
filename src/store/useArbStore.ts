import { create } from 'zustand';
import type { Promo, PromoType, HedgeResult, GameOdds } from '../types';
import { calculateTopHedges } from '../engine/hedgeCalculator';
import { fetchAllOdds, getCacheStatus } from '../services/oddsApi';

const STORE_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour in-memory TTL

interface ArbState {
  // Step 1: Selected apps
  selectedAppIds: string[];

  // Step 2: Promos per app
  promosByApp: Record<string, Promo[]>;

  // Odds cache
  games: GameOdds[];
  creditsRemaining: number | null;
  lastFetched: Date | null;
  isFetching: boolean;
  fetchCount: number;   // today's API fetches (from localStorage)
  maxFetches: number;   // daily limit

  // Results
  results: HedgeResult[];
  isCalculating: boolean;
  hasCalculated: boolean;

  // Actions
  toggleApp: (appId: string) => void;
  addPromo: (appId: string) => void;
  updatePromo: (appId: string, promoId: string, update: Partial<Promo>) => void;
  removePromo: (appId: string, promoId: string) => void;
  fetchOdds: () => Promise<void>;
  refreshOdds: () => Promise<void>;
  calculate: () => Promise<void>;
  reset: () => void;
}

function newPromo(appId: string): Promo {
  return {
    id: `${appId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: 'free_bet' as PromoType,
    amount: 0,
    sport: 'all',
    label: '',
  };
}

/** Bootstrap from localStorage cache so the UI shows the right time on first paint. */
function getInitialOddsState(): {
  games: GameOdds[];
  creditsRemaining: number | null;
  lastFetched: Date | null;
  fetchCount: number;
  maxFetches: number;
} {
  const status = getCacheStatus();
  return {
    games: [],  // games are not pre-loaded into store — fetched on demand
    creditsRemaining: status.creditsRemaining,
    lastFetched: status.timestamp ? new Date(status.timestamp) : null,
    fetchCount: status.fetchCount,
    maxFetches: status.maxFetches,
  };
}

const initialOdds = getInitialOddsState();

export const useArbStore = create<ArbState>((set, get) => ({
  selectedAppIds: [],
  promosByApp: {},
  games: initialOdds.games,
  creditsRemaining: initialOdds.creditsRemaining,
  lastFetched: initialOdds.lastFetched,
  isFetching: false,
  fetchCount: initialOdds.fetchCount,
  maxFetches: initialOdds.maxFetches,
  results: [],
  isCalculating: false,
  hasCalculated: false,

  toggleApp: (appId) => set((state) => {
    const isSelected = state.selectedAppIds.includes(appId);
    const selectedAppIds = isSelected
      ? state.selectedAppIds.filter(id => id !== appId)
      : [...state.selectedAppIds, appId];

    const promosByApp = { ...state.promosByApp };
    if (!isSelected && !promosByApp[appId]) {
      promosByApp[appId] = [newPromo(appId)];
    }

    return { selectedAppIds, promosByApp, hasCalculated: false };
  }),

  addPromo: (appId) => set((state) => {
    const existing = state.promosByApp[appId] ?? [];
    return {
      promosByApp: {
        ...state.promosByApp,
        [appId]: [...existing, newPromo(appId)],
      },
    };
  }),

  updatePromo: (appId, promoId, update) => set((state) => {
    const promos = (state.promosByApp[appId] ?? []).map(p =>
      p.id === promoId ? { ...p, ...update } : p,
    );
    return {
      promosByApp: { ...state.promosByApp, [appId]: promos },
      hasCalculated: false,
    };
  }),

  removePromo: (appId, promoId) => set((state) => ({
    promosByApp: {
      ...state.promosByApp,
      [appId]: (state.promosByApp[appId] ?? []).filter(p => p.id !== promoId),
    },
  })),

  /** Fetch odds only if in-memory cache is stale (>1 hour) or empty. */
  fetchOdds: async () => {
    const { isFetching, lastFetched } = get();
    if (isFetching) return;

    // Use in-memory cache if fetched within the last hour
    if (lastFetched && Date.now() - lastFetched.getTime() < STORE_CACHE_TTL_MS) return;

    set({ isFetching: true });
    try {
      // fetchAllOdds will check localStorage cache internally
      const { games, creditsRemaining } = await fetchAllOdds(false);
      const status = getCacheStatus();
      set({
        games,
        creditsRemaining,
        lastFetched: new Date(),
        isFetching: false,
        fetchCount: status.fetchCount,
      });
    } catch (err) {
      console.error('[store] fetchOdds failed:', err);
      set({ isFetching: false });
    }
  },

  /** Force re-fetch regardless of cache. */
  refreshOdds: async () => {
    const { isFetching } = get();
    if (isFetching) return;

    set({ isFetching: true, lastFetched: null });
    try {
      const { games, creditsRemaining } = await fetchAllOdds(true);
      const status = getCacheStatus();
      set({
        games,
        creditsRemaining,
        lastFetched: new Date(),
        isFetching: false,
        fetchCount: status.fetchCount,
      });
    } catch (err) {
      console.error('[store] refreshOdds failed:', err);
      set({ isFetching: false });
    }
  },

  calculate: async () => {
    const { selectedAppIds, promosByApp } = get();
    set({ isCalculating: true });

    // Ensure we have fresh odds
    await get().fetchOdds();

    const { games } = get();

    const input = selectedAppIds.map(appId => ({
      appId,
      promos: promosByApp[appId] ?? [],
    }));

    const results = calculateTopHedges(input, games, selectedAppIds, 10);

    set({ results, isCalculating: false, hasCalculated: true });
  },

  reset: () => set({
    selectedAppIds: [],
    promosByApp: {},
    results: [],
    isCalculating: false,
    hasCalculated: false,
    // Preserve odds cache — no need to re-fetch after reset
  }),
}));
