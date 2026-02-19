/**
 * HedgeCalculator QA Test Suite — 100+ Scenarios
 * Run with: npx tsx src/engine/hedgeCalculator.test.ts
 */

import { americanToDecimal, decimalToAmerican, formatOdds, calculateTopHedges } from './hedgeCalculator';
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