/**
 * Hedge Calculator Engine — v3
 * Scans live GameOdds to find optimal hedges across selected sportsbooks.
 * Pure math, no API calls — runs in microseconds.
 */

import type { Promo, GameOdds, HedgeResult, PromoType } from '../types';
import { SPORT_GROUPS } from '../types';
import { APP_MAP } from '../data/apps';

/** Resolve a sport group id to its list of API keys */
function sportGroupKeys(sportId: string): string[] | null {
  if (!sportId || sportId === 'all') return null; // null = match all
  const group = SPORT_GROUPS.find(g => g.id === sportId);
  return group ? group.keys : null;
}

// ─── Utilities ───────────────────────────────────────────────────────────────

export function americanToDecimal(american: number): number {
  if (american > 0) return american / 100 + 1;
  if (american < 0) return 100 / Math.abs(american) + 1;
  return 1;
}

export function decimalToAmerican(decimal: number): number {
  if (decimal >= 2) return Math.round((decimal - 1) * 100);
  return Math.round(-100 / (decimal - 1));
}

/** Format American odds as string: +150, -110 */
export function formatOdds(american: number): string {
  return american >= 0 ? `+${american}` : `${american}`;
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

// ─── Profit Calculators ──────────────────────────────────────────────────────

interface CalcResult {
  layStake: number;
  ifPromoWins: number;
  ifHedgeWins: number;
  guaranteedProfit: number;
}

/**
 * FREE BET — Stake Not Returned (SNR)
 * Promo: place free bet → if win: +amount*(backDecimal-1), if lose: $0
 * Hedge: real money on other side
 *
 * Optimal layStake = amount*(backDecimal-1) / hedgeDecimal
 */
function calcFreeBet(amount: number, backDecimal: number, hedgeDecimal: number): CalcResult {
  const layStake = (amount * (backDecimal - 1)) / hedgeDecimal;
  const ifPromoWins = amount * (backDecimal - 1) - layStake;
  const ifHedgeWins = layStake * (hedgeDecimal - 1);
  const guaranteedProfit = Math.min(ifPromoWins, ifHedgeWins);
  return { layStake, ifPromoWins, ifHedgeWins, guaranteedProfit };
}

/**
 * FREE BET — Stake Returned (SR)
 * Full payout = amount*backDecimal (stake returned on win).
 * Since the free bet costs us nothing: ifHedgeWins also has $0 stake loss.
 *
 * Optimal layStake = amount*backDecimal / hedgeDecimal
 * Both scenarios: amount * backDecimal * (hedgeDecimal-1) / hedgeDecimal
 */
function calcFreeBetSR(amount: number, backDecimal: number, hedgeDecimal: number): CalcResult {
  const layStake = (amount * backDecimal) / hedgeDecimal;
  const ifPromoWins = amount * backDecimal - layStake;      // full payout - hedge loss
  const ifHedgeWins = layStake * (hedgeDecimal - 1);        // no stake lost (free bet)
  const guaranteedProfit = Math.min(ifPromoWins, ifHedgeWins);
  return { layStake, ifPromoWins, ifHedgeWins, guaranteedProfit };
}

/**
 * DEPOSIT MATCH (real money bet + bonus)
 * Real back bet on Team A; hedge on Team B.
 * Optimal layStake = amount * backDecimal / hedgeDecimal
 */
function calcDepositMatch(amount: number, backDecimal: number, hedgeDecimal: number): CalcResult {
  const layStake = (amount * backDecimal) / hedgeDecimal;
  const ifPromoWins = amount * (backDecimal - 1) - layStake;
  const ifHedgeWins = layStake * (hedgeDecimal - 1) - amount;
  const guaranteedProfit = Math.min(ifPromoWins, ifHedgeWins);
  return { layStake, ifPromoWins, ifHedgeWins, guaranteedProfit };
}

/**
 * RISK-FREE BET (stake refunded as free bet on loss)
 *
 * Two-phase strategy: hedge SMALL in phase 1 so you WANT to lose (getting the
 * free bet cheaply), then convert the free bet in phase 2 at ~70% efficiency.
 *
 * Phase 1 optimal hedge: layStake = amount / hedgeDecimal
 *   - If promo wins: big profit (bonus upside — long-shot wins)
 *   - If hedge wins: small net loss (-amount/hedgeDecimal), but you receive the free bet
 *
 * Phase 2: free bet (SNR) converted at ~70% of calcFreeBet guaranteed profit
 *   ifHedgeWins = phase1Net + freeBetValue
 */
export function calcRiskFree(amount: number, backDecimal: number, hedgeDecimal: number): CalcResult {
  const layStake = amount / hedgeDecimal;
  const ifPromoWins = amount * (backDecimal - 1) - layStake;
  // phase1Net when hedge wins: hedge payout minus lost promo stake (always negative)
  const phase1Net = layStake * (hedgeDecimal - 1) - amount; // = -amount/hedgeDecimal
  const freeBetValue = 0.7 * calcFreeBet(amount, backDecimal, hedgeDecimal).guaranteedProfit;
  const ifHedgeWins = phase1Net + freeBetValue;
  const guaranteedProfit = Math.min(ifPromoWins, ifHedgeWins);
  return { layStake, ifPromoWins, ifHedgeWins, guaranteedProfit };
}

/**
 * PROFIT BOOST
 * Bet real money ($maxWager) at boosted odds, hedge the other side.
 * boostedDecimal = 1 + (backDecimal - 1) * (1 + boostPct/100)
 * Optimal layStake = maxWager * boostedDecimal / hedgeDecimal
 */
function calcProfitBoost(
  boostPct: number,
  maxWager: number,
  backDecimal: number,
  hedgeDecimal: number,
): CalcResult {
  const boostedDecimal = 1 + (backDecimal - 1) * (1 + boostPct / 100);
  const layStake = (maxWager * boostedDecimal) / hedgeDecimal;
  const ifPromoWins = maxWager * (boostedDecimal - 1) - layStake;
  const ifHedgeWins = layStake * (hedgeDecimal - 1) - maxWager;
  const guaranteedProfit = Math.min(ifPromoWins, ifHedgeWins);
  return { layStake, ifPromoWins, ifHedgeWins, guaranteedProfit };
}

/**
 * BET & GET
 * Two-phase: hedge qualifying bet (small vig loss), then convert bonus as free bet.
 * Uses odds-based phase 1 (deposit match math) + free bet conversion for phase 2.
 */
function calcBetAndGet(
  qualifyingBet: number,
  bonusAmount: number,
  backDecimal: number,
  hedgeDecimal: number,
): CalcResult {
  // Phase 1: hedge qualifying bet — costs ~5% vig
  const phase1 = calcDepositMatch(qualifyingBet, backDecimal, hedgeDecimal);
  const phase1Cost = -Math.min(phase1.ifPromoWins, phase1.ifHedgeWins);

  // Phase 2: convert bonus as free bet (SNR) at same odds
  const freeBetResult = calcFreeBet(bonusAmount, backDecimal, hedgeDecimal);
  const phase2Value = freeBetResult.guaranteedProfit;

  const guaranteedProfit = phase2Value - phase1Cost;
  // layStake reflects phase 1 hedge for display
  return {
    layStake: phase1.layStake,
    ifPromoWins: guaranteedProfit,
    ifHedgeWins: guaranteedProfit,
    guaranteedProfit,
  };
}

/**
 * BONUS CASH / SITE CREDIT
 * Stake is returned (same math as Free Bet SR).
 */
function calcBonusCash(amount: number, backDecimal: number, hedgeDecimal: number): CalcResult {
  return calcFreeBetSR(amount, backDecimal, hedgeDecimal);
}

// ─── Steps Builder ───────────────────────────────────────────────────────────

function buildSteps(
  promoType: PromoType,
  promoApp: string,
  hedgeApp: string,
  promoTeam: string,
  hedgeTeam: string,
  amount: number,
  amount2: number | undefined,
  backOdds: number,
  hedgeOdds: number,
  layStake: number,
  ifPromoWins: number,
  ifHedgeWins: number,
): string[] {
  const fmt  = (n: number) => `$${Math.abs(n).toFixed(2)}`;
  const sign = (n: number) => (n >= 0 ? '+' : '-');
  const bStr = formatOdds(backOdds);
  const hStr = formatOdds(hedgeOdds);

  switch (promoType) {
    case 'free_bet':
      return [
        `1. Use $${amount} FREE BET (SNR) on "${promoTeam}" (${bStr}) at ${promoApp}`,
        `2. Bet ${fmt(layStake)} real money on "${hedgeTeam}" (${hStr}) at ${hedgeApp}`,
        `3. If ${promoTeam} wins → ${sign(ifPromoWins)}${fmt(ifPromoWins)} guaranteed profit`,
        `4. If ${hedgeTeam} wins → ${sign(ifHedgeWins)}${fmt(ifHedgeWins)} guaranteed profit`,
      ];

    case 'free_bet_sr':
      return [
        `1. Use $${amount} FREE BET (Stake Returned) on "${promoTeam}" (${bStr}) at ${promoApp}`,
        `2. Bet ${fmt(layStake)} real money on "${hedgeTeam}" (${hStr}) at ${hedgeApp}`,
        `3. If ${promoTeam} wins → full payout $${(amount * americanToDecimal(backOdds)).toFixed(2)} − hedge loss = ${sign(ifPromoWins)}${fmt(ifPromoWins)}`,
        `4. If ${hedgeTeam} wins → ${sign(ifHedgeWins)}${fmt(ifHedgeWins)} (no stake forfeited)`,
      ];

    case 'deposit_match':
      return [
        `1. Bet $${amount} REAL MONEY on "${promoTeam}" (${bStr}) at ${promoApp}`,
        `2. Bet ${fmt(layStake)} real money on "${hedgeTeam}" (${hStr}) at ${hedgeApp}`,
        `3. If ${promoTeam} wins → ${sign(ifPromoWins)}${fmt(ifPromoWins)} net profit`,
        `4. If ${hedgeTeam} wins → ${sign(ifHedgeWins)}${fmt(ifHedgeWins)} net profit`,
        `5. Total capital required: $${(amount + layStake).toFixed(2)}`,
      ];

    case 'risk_free':
      return [
        `1. Bet $${amount} REAL MONEY on "${promoTeam}" (${bStr}) at ${promoApp}`,
        `2. Bet ${fmt(layStake)} real money on "${hedgeTeam}" (${hStr}) at ${hedgeApp}`,
        `3. If ${promoTeam} wins → ${sign(ifPromoWins)}${fmt(ifPromoWins)} profit (Phase 1 complete)`,
        `4. If ${hedgeTeam} wins → receive $${amount} free bet; convert for ${sign(ifHedgeWins)}${fmt(ifHedgeWins)} total`,
        `5. Free bet conversion assumes ~70% efficiency on same game odds`,
      ];

    case 'profit_boost': {
      const boostPct = amount;
      const maxWager = amount2 ?? 0;
      const boostedDecimal = 1 + (americanToDecimal(backOdds) - 1) * (1 + boostPct / 100);
      const boostedAmerican = decimalToAmerican(boostedDecimal);
      return [
        `1. Bet $${maxWager} REAL MONEY on "${promoTeam}" at ${promoApp} with ${boostPct}% boost`,
        `   Effective odds: ${formatOdds(boostedAmerican)} (base: ${bStr})`,
        `2. Bet ${fmt(layStake)} real money on "${hedgeTeam}" (${hStr}) at ${hedgeApp}`,
        `3. If ${promoTeam} wins → boosted payout gives ${sign(ifPromoWins)}${fmt(ifPromoWins)} profit`,
        `4. If ${hedgeTeam} wins → ${sign(ifHedgeWins)}${fmt(ifHedgeWins)} profit`,
      ];
    }

    case 'bet_and_get': {
      const qualifyingBet = amount;
      const bonusAmount = amount2 ?? 0;
      return [
        `1. Place $${qualifyingBet} qualifying bet on "${promoTeam}" (${bStr}) at ${promoApp}`,
        `2. Hedge: Bet ${fmt(layStake)} on "${hedgeTeam}" (${hStr}) at ${hedgeApp} (minimizes phase 1 loss)`,
        `3. Receive $${bonusAmount} bonus — convert as free bet at ~70% efficiency`,
        `4. Net guaranteed profit: ${sign(ifPromoWins)}${fmt(ifPromoWins)}`,
        `   Phase 1 (qualifying hedge) + Phase 2 (free bet conversion)`,
      ];
    }

    case 'bonus_cash':
      return [
        `1. Use $${amount} BONUS CASH on "${promoTeam}" (${bStr}) at ${promoApp}`,
        `2. Bet ${fmt(layStake)} real money on "${hedgeTeam}" (${hStr}) at ${hedgeApp}`,
        `3. If ${promoTeam} wins → full payout returned; profit = ${sign(ifPromoWins)}${fmt(ifPromoWins)}`,
        `4. If ${hedgeTeam} wins → ${sign(ifHedgeWins)}${fmt(ifHedgeWins)} (site credit stake not forfeited)`,
      ];

    default:
      return [];
  }
}

// ─── Main Engine ─────────────────────────────────────────────────────────────

export function calculateTopHedges(
  promosByApp: { appId: string; promos: Promo[] }[],
  games: GameOdds[],
  selectedAppIds: string[],
  topN = 10,
): HedgeResult[] {
  const results: HedgeResult[] = [];

  for (const { appId, promos } of promosByApp) {
    const promoApp = APP_MAP[appId];
    if (!promoApp || !promoApp.oddsApiKey) continue;

    for (const promo of promos) {
      if (!promo.amount || promo.amount <= 0) continue;

      // Validate secondary amount for types that require it
      if (promo.type === 'profit_boost' && (!promo.amount2 || promo.amount2 <= 0)) continue;
      if (promo.type === 'bet_and_get' && (!promo.amount2 || promo.amount2 <= 0)) continue;

      // Find all games where this promo bookmaker has odds
      for (const game of games) {
        // Sport filter: skip games that don't match the promo's sport group
        const allowedKeys = sportGroupKeys(promo.sport);
        if (allowedKeys && !allowedKeys.includes(game.sport)) continue;

        const promoBm = game.bookmakers.find(bm => bm.key === promoApp.oddsApiKey);
        if (!promoBm) continue;

        const h2h = promoBm.markets.find(m => m.key === 'h2h');
        if (!h2h || h2h.outcomes.length < 2) continue;

        // Detect 3-way market (soccer Draw, etc.)
        const isThreeWay = h2h.outcomes.length > 2;
        const drawOutcomeOnPromoBook = isThreeWay
          ? h2h.outcomes.find(o => o.name.toLowerCase() === 'draw')
          : null;

        // Try each outcome as the promo bet side
        for (const outcome of h2h.outcomes) {
          // Never use Draw as the promo bet in 2-way hedge logic
          if (isThreeWay && outcome.name.toLowerCase() === 'draw') continue;

          const backOddsAmerican = outcome.price;
          const backDecimal = americanToDecimal(backOddsAmerican);
          if (backDecimal <= 1) continue;

          // The hedge goes on the opposing team ONLY (exclude Draw from hedge candidates)
          const allOtherOutcomes = h2h.outcomes.filter(o => o.name !== outcome.name);
          const hedgeCandidates = isThreeWay
            ? allOtherOutcomes.filter(o => o.name.toLowerCase() !== 'draw')
            : allOtherOutcomes;
          if (hedgeCandidates.length === 0) continue;

          // Find best hedge odds for the opposing team from any OTHER selected book
          let bestHedgeOdds: number | null = null;
          let bestHedgeAppName: string | null = null;

          for (const hedgeAppId of selectedAppIds) {
            if (hedgeAppId === appId) continue;

            const hedgeAppDef = APP_MAP[hedgeAppId];
            if (!hedgeAppDef || !hedgeAppDef.oddsApiKey) continue;

            const hedgeBm = game.bookmakers.find(bm => bm.key === hedgeAppDef.oddsApiKey);
            if (!hedgeBm) continue;

            const hedgeH2h = hedgeBm.markets.find(m => m.key === 'h2h');
            if (!hedgeH2h) continue;

            for (const candidate of hedgeCandidates) {
              const hedgeOutcome = hedgeH2h.outcomes.find(o => o.name === candidate.name);
              if (!hedgeOutcome) continue;

              if (bestHedgeOdds === null || hedgeOutcome.price > bestHedgeOdds) {
                bestHedgeOdds = hedgeOutcome.price;
                bestHedgeAppName = hedgeAppDef.name;
              }
            }
          }

          if (bestHedgeOdds === null || bestHedgeAppName === null) continue;

          const hedgeDecimal = americanToDecimal(bestHedgeOdds);
          if (hedgeDecimal <= 1) continue;

          const otherTeam = hedgeCandidates[0].name;

          // Calculate profit based on promo type
          let layStake: number;
          let ifPromoWins: number;
          let ifHedgeWins: number;
          let guaranteedProfit: number;
          let promoStake: number; // actual money at risk (for display & efficiency)

          switch (promo.type) {
            case 'free_bet': {
              const r = calcFreeBet(promo.amount, backDecimal, hedgeDecimal);
              ({ layStake, ifPromoWins, ifHedgeWins, guaranteedProfit } = r);
              promoStake = promo.amount;
              break;
            }
            case 'free_bet_sr': {
              const r = calcFreeBetSR(promo.amount, backDecimal, hedgeDecimal);
              ({ layStake, ifPromoWins, ifHedgeWins, guaranteedProfit } = r);
              promoStake = promo.amount;
              break;
            }
            case 'deposit_match': {
              const r = calcDepositMatch(promo.amount, backDecimal, hedgeDecimal);
              ({ layStake, ifPromoWins, ifHedgeWins, guaranteedProfit } = r);
              promoStake = promo.amount;
              break;
            }
            case 'risk_free': {
              const r = calcRiskFree(promo.amount, backDecimal, hedgeDecimal);
              ({ layStake, ifPromoWins, ifHedgeWins, guaranteedProfit } = r);
              promoStake = promo.amount;
              break;
            }
            case 'profit_boost': {
              const maxWager = promo.amount2!;
              const r = calcProfitBoost(promo.amount, maxWager, backDecimal, hedgeDecimal);
              ({ layStake, ifPromoWins, ifHedgeWins, guaranteedProfit } = r);
              promoStake = maxWager;
              break;
            }
            case 'bet_and_get': {
              const r = calcBetAndGet(promo.amount, promo.amount2!, backDecimal, hedgeDecimal);
              ({ layStake, ifPromoWins, ifHedgeWins, guaranteedProfit } = r);
              promoStake = promo.amount;
              break;
            }
            case 'bonus_cash': {
              const r = calcBonusCash(promo.amount, backDecimal, hedgeDecimal);
              ({ layStake, ifPromoWins, ifHedgeWins, guaranteedProfit } = r);
              promoStake = promo.amount;
              break;
            }
            default:
              continue;
          }

          if (guaranteedProfit <= 0) continue;

          // ── 3-way draw risk ────────────────────────────────────────────────
          // If the game draws, both the promo bet and the hedge bet lose.
          // We calculate the draw probability from the promo book's implied odds,
          // then compute expected value (EV) factoring in that risk.
          let drawRisk: HedgeResult['drawRisk'] = null;
          if (isThreeWay && drawOutcomeOnPromoBook) {
            const drawDecimal = americanToDecimal(drawOutcomeOnPromoBook.price);
            // Total implied probability (all 3 legs at promo-book prices)
            const totalImplied =
              1 / backDecimal +
              1 / americanToDecimal(hedgeCandidates[0].price) +
              1 / drawDecimal;
            const drawProb = (1 / drawDecimal) / totalImplied;
            // Loss = total capital at risk (promo stake + hedge stake)
            const drawLoss = -(promoStake + layStake);
            const ev = guaranteedProfit * (1 - drawProb) + drawLoss * drawProb;
            drawRisk = {
              loss: Math.round(drawLoss * 100) / 100,
              probability: Math.round(drawProb * 10000) / 10000,
              ev: Math.round(ev * 100) / 100,
            };
          }
          // ──────────────────────────────────────────────────────────────────

          const efficiencyBase = promo.type === 'profit_boost' ? (promo.amount2 ?? promo.amount)
            : promo.type === 'bet_and_get' ? (promo.amount2 ?? promo.amount)
            : promo.amount;
          const efficiency = (guaranteedProfit / efficiencyBase) * 100;

          const steps = buildSteps(
            promo.type,
            promoApp.name,
            bestHedgeAppName,
            outcome.name,
            otherTeam,
            promo.amount,
            promo.amount2,
            backOddsAmerican,
            bestHedgeOdds,
            layStake,
            ifPromoWins,
            ifHedgeWins,
          );

          results.push({
            rank: 0,
            guaranteedProfit: Math.round(guaranteedProfit * 100) / 100,
            efficiency: Math.round(efficiency * 100) / 100,
            game: {
              homeTeam: game.homeTeam,
              awayTeam: game.awayTeam,
              sport: game.sport,
              time: game.commenceTime,
            },
            promoBet: {
              app: promoApp.name,
              team: outcome.name,
              odds: backOddsAmerican,
              stake: promoStake,
              promoType: promo.type,
            },
            hedgeBet: {
              app: bestHedgeAppName,
              team: otherTeam,
              odds: bestHedgeOdds,
              stake: Math.round(layStake * 100) / 100,
            },
            ifPromoWins: Math.round(ifPromoWins * 100) / 100,
            ifHedgeWins: Math.round(ifHedgeWins * 100) / 100,
            steps,
            drawRisk,
          });
        }
      }
    }
  }

  // Sort by EV: for 3-way markets use drawRisk.ev, for 2-way use guaranteedProfit.
  // This ensures soccer results with draw risk are ranked honestly.
  results.sort((a, b) => {
    const evA = a.drawRisk?.ev ?? a.guaranteedProfit;
    const evB = b.drawRisk?.ev ?? b.guaranteedProfit;
    return evB - evA;
  });
  return results.slice(0, topN).map((r, i) => ({ ...r, rank: i + 1 }));
}
