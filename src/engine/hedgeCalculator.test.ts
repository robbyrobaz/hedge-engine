/* eslint-disable -- WIP: test file incomplete, scenarios not yet written */
/**
 * HedgeCalculator QA Test Suite — 100+ Scenarios
 * Run with: npx tsx src/engine/hedgeCalculator.test.ts
 */

import { americanToDecimal, decimalToAmerican, formatOdds, calculateTopHedges, calcRiskFree } from './hedgeCalculator';
import type { GameOdds, Promo, PromoType } from '../types';

// ─── Test Infrastructure ──────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures: string[] = [];

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (e: any) {
    const msg = e.message || String(e);
    console.log(`  ❌ FAIL: ${name} → ${msg}`);
    failures.push(`${name}: ${msg}`);
    failed++;
  }
}

function assertApprox(actual: number, expected: number, tolerance: number, label = ''): void {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${label}: expected ~${expected.toFixed(2)}, got ${actual.toFixed(2)}`);
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

// ─── calcRiskFree Tests ───────────────────────────────────────────────────────

console.log('\n── calcRiskFree ──');

test('$1000 risk-free at +2500/-500: layStake ~$833, NOT $21K', () => {
  const amount = 1000;
  const backDecimal  = americanToDecimal(2500);  // 26
  const hedgeDecimal = americanToDecimal(-500);  // 1.2

  const r = calcRiskFree(amount, backDecimal, hedgeDecimal);

  // layStake = 1000 / 1.2 = 833.33
  assertApprox(r.layStake, 833.33, 0.5, 'layStake');
  // ifPromoWins = 1000*(26-1) - 833.33 = 25000 - 833.33 = 24166.67
  assertApprox(r.ifPromoWins, 24166.67, 0.5, 'ifPromoWins');
  // phase1Net = 833.33*0.2 - 1000 = 166.67 - 1000 = -833.33
  // freeBet guaranteed = 25000/1.2 * (1.2-1)/1.2 ... actually calcFreeBet(1000,26,1.2).guaranteedProfit ≈ 4166.67
  // freeBetValue = 0.7 * 4166.67 = 2916.67
  // ifHedgeWins = -833.33 + 2916.67 = 2083.34
  assertApprox(r.ifHedgeWins, 2083.34, 1, 'ifHedgeWins');
  // guaranteedProfit = min(24166.67, 2083.34) = 2083.34
  assertApprox(r.guaranteedProfit, 2083.34, 1, 'guaranteedProfit');
});

test('$1000 risk-free at +2500/-500: guaranteedProfit is positive', () => {
  const r = calcRiskFree(1000, americanToDecimal(2500), americanToDecimal(-500));
  assert(r.guaranteedProfit > 0, `expected profit > 0, got ${r.guaranteedProfit}`);
});

test('$1000 risk-free at +2500/-500: efficiency < 300% (not 333% from broken formula)', () => {
  const r = calcRiskFree(1000, americanToDecimal(2500), americanToDecimal(-500));
  const efficiency = (r.guaranteedProfit / 1000) * 100;
  assert(efficiency < 300, `efficiency ${efficiency.toFixed(1)}% should be < 300%`);
});

test('$500 risk-free at +300/-200: mid-range odds produce positive guaranteedProfit', () => {
  // (backDecimal-1)*(hedgeDecimal-1) = 3 * 0.5 = 1.5 > 1/0.7 ≈ 1.43 — guaranteed positive
  const amount = 500;
  const backDecimal  = americanToDecimal(300);  // 4.0
  const hedgeDecimal = americanToDecimal(-200); // 1.5

  const r = calcRiskFree(amount, backDecimal, hedgeDecimal);

  // layStake = 500 / 1.5 = 333.33 (well under $1000 for a $500 promo)
  assertApprox(r.layStake, 333.33, 0.5, 'layStake');
  assert(r.guaranteedProfit > 0, `guaranteedProfit ${r.guaranteedProfit.toFixed(2)} should be positive`);
  assert(r.ifHedgeWins > 0, `ifHedgeWins ${r.ifHedgeWins.toFixed(2)} should be positive`);
});

test('$500 risk-free at +150/-130: short odds → guaranteedProfit ≤ 0 (engine filters out correctly)', () => {
  // (backDecimal-1)*(hedgeDecimal-1) = 1.5 * 0.769 ≈ 1.15 < 1.43 — free bet value < phase1 loss
  const r = calcRiskFree(500, americanToDecimal(150), americanToDecimal(-130));
  // The engine drops results with guaranteedProfit ≤ 0, so this is expected behavior
  assert(r.guaranteedProfit <= 0, `expected profit ≤ 0 at short odds, got ${r.guaranteedProfit.toFixed(2)}`);
  // layStake is still small and formula-correct
  assertApprox(r.layStake, 500 / americanToDecimal(-130), 0.01, 'layStake');
});

test('layStake formula: always equals amount / hedgeDecimal', () => {
  const cases: [number, number, number][] = [
    [100,  americanToDecimal(200),   americanToDecimal(-200)],
    [500,  americanToDecimal(500),   americanToDecimal(-150)],
    [1000, americanToDecimal(2500),  americanToDecimal(-500)],
  ];
  for (const [amount, back, hedge] of cases) {
    const r = calcRiskFree(amount, back, hedge);
    assertApprox(r.layStake, amount / hedge, 0.01, `layStake for amount=${amount}`);
  }
});

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
if (failures.length > 0) {
  console.log('\nFailures:');
  failures.forEach(f => console.log(`  - ${f}`));
  process.exit(1);
}
