import { create } from 'zustand';
import type { Promo, PromoType, HedgeResult, GameOdds, Preset } from '../types';
import { calculateTopHedges } from '../engine/hedgeCalculator';
import { fetchAllOdds, getCacheStatus } from '../services/oddsApi';
import { fetchSharedPresets, writeSharedPresets } from '../services/presetsSync';

const PRESETS_KEY = 'hedgeengine_presets';

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

  // Budget
  maxBudget: number;  // 0 = no limit

  // Results
  results: HedgeResult[];
  isCalculating: boolean;
  hasCalculated: boolean;

  // Presets
  presets: Preset[];

  // Actions
  setMaxBudget: (amount: number) => void;
  toggleApp: (appId: string) => void;
  addPromo: (appId: string) => void;
  updatePromo: (appId: string, promoId: string, update: Partial<Promo>) => void;
  removePromo: (appId: string, promoId: string) => void;
  fetchOdds: () => Promise<void>;
  refreshOdds: () => Promise<void>;
  calculate: () => Promise<void>;
  reset: () => void;
  savePreset: (name: string) => void;
  loadPreset: (id: string) => void;
  deletePreset: (id: string) => void;
  renamePreset: (id: string, name: string) => void;
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

function loadPresetsFromStorage(): Preset[] {
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    return raw ? (JSON.parse(raw) as Preset[]) : [];
  } catch {
    return [];
  }
}

function savePresetsToStorage(presets: Preset[]): void {
  try {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
  } catch {
    // localStorage quota exceeded — ignore
  }
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
  maxBudget: 0,
  results: [],
  isCalculating: false,
  hasCalculated: false,
  presets: loadPresetsFromStorage(),

  setMaxBudget: (amount) => set({ maxBudget: amount, hasCalculated: false }),

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

    const { maxBudget } = get();
    let results = calculateTopHedges(input, games, selectedAppIds, 50); // get more, then filter

    // Filter by max budget (total out-of-pocket = hedge stake + promo stake for real-money types)
    if (maxBudget > 0) {
      results = results.filter(r => {
        const totalCost = r.hedgeBet.stake + (
          r.promoBet.promoType === 'free_bet' || r.promoBet.promoType === 'free_bet_sr' || r.promoBet.promoType === 'bonus_cash'
            ? 0  // free money — no out-of-pocket for promo side
            : r.promoBet.stake
        );
        return totalCost <= maxBudget;
      });
    }

    // Re-rank and take top 10
    results = results.slice(0, 10).map((r, i) => ({ ...r, rank: i + 1 }));

    set({ results, isCalculating: false, hasCalculated: true });
  },

  reset: () => set((state) => ({
    selectedAppIds: [],
    promosByApp: {},
    results: [],
    isCalculating: false,
    hasCalculated: false,
    // Preserve odds cache and presets — no need to re-fetch or clear presets on reset
    presets: state.presets,
  })),

  savePreset: (name) => {
    const { selectedAppIds, promosByApp, maxBudget, presets } = get();
    const preset: Preset = {
      id: String(Date.now()),
      name: name.trim() || 'Untitled Preset',
      savedAt: new Date().toISOString(),
      selectedAppIds: [...selectedAppIds],
      // Deep-copy promos so saved state is immutable
      promosByApp: Object.fromEntries(
        Object.entries(promosByApp).map(([appId, promos]) => [appId, promos.map(p => ({ ...p }))]),
      ),
      maxBudget,
    };
    const updated = [...presets, preset];
    savePresetsToStorage(updated);
    set({ presets: updated });
    writeSharedPresets(updated);
  },

  loadPreset: (id) => {
    const { presets } = get();
    const preset = presets.find(p => p.id === id);
    if (!preset) return;

    // Regenerate promo IDs to avoid collisions with any existing promos
    const promosByApp = Object.fromEntries(
      Object.entries(preset.promosByApp).map(([appId, promos]) => [
        appId,
        promos.map(p => ({
          ...p,
          id: `${appId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        })),
      ]),
    );

    set({
      selectedAppIds: [...preset.selectedAppIds],
      promosByApp,
      maxBudget: preset.maxBudget,
      results: [],
      hasCalculated: false,
    });
  },

  deletePreset: (id) => {
    const { presets } = get();
    const updated = presets.filter(p => p.id !== id);
    savePresetsToStorage(updated);
    set({ presets: updated });
    writeSharedPresets(updated);
  },

  renamePreset: (id, name) => {
    const { presets } = get();
    const updated = presets.map(p => p.id === id ? { ...p, name: name.trim() || p.name } : p);
    savePresetsToStorage(updated);
    set({ presets: updated });
    writeSharedPresets(updated);
  },
}));

// On startup, quietly pull the shared presets from GitHub and replace local state.
// This ensures both users always see the same set of presets on page load.
fetchSharedPresets().then(remote => {
  if (remote.length > 0) {
    savePresetsToStorage(remote);
    useArbStore.setState({ presets: remote });
  }
});
