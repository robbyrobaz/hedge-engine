import type { BettingApp } from '../types';

export const BETTING_APPS: BettingApp[] = [
  // Major US Sportsbooks
  { id: 'draftkings', name: 'DraftKings',      color: '#00d084', logo: 'DK',   isExchange: false, oddsApiKey: 'draftkings' },
  { id: 'fanduel',    name: 'FanDuel',          color: '#1493ff', logo: 'FD',   isExchange: false, oddsApiKey: 'fanduel' },
  { id: 'betmgm',     name: 'BetMGM',           color: '#d4af37', logo: 'MGM',  isExchange: false, oddsApiKey: 'betmgm' },
  { id: 'caesars',    name: 'Caesars',           color: '#c41e3a', logo: 'CZR',  isExchange: false, oddsApiKey: 'williamhill_us' },
  { id: 'bet365',     name: 'bet365',            color: '#00a651', logo: '365',  isExchange: false, oddsApiKey: 'bet365' },
  { id: 'espnbet',    name: 'ESPN BET',          color: '#ff6600', logo: 'ESPN', isExchange: false, oddsApiKey: null },
  { id: 'fanatics',   name: 'Fanatics',          color: '#cc0000', logo: 'FAN',  isExchange: false, oddsApiKey: 'fanatics' },
  { id: 'betrivers',  name: 'BetRivers',         color: '#0057a8', logo: 'BR',   isExchange: false, oddsApiKey: 'betrivers' },
  { id: 'pointsbet',  name: 'PointsBet',         color: '#e31837', logo: 'PB',   isExchange: false, oddsApiKey: 'pointsbetus' },
  { id: 'hardrock',   name: 'Hard Rock',         color: '#d4af37', logo: 'HR',   isExchange: false, oddsApiKey: null },
  { id: 'fliff',      name: 'Fliff',             color: '#7b2fff', logo: 'FL',   isExchange: false, oddsApiKey: 'fliff' },
  { id: 'propswap',   name: 'PropSwap',          color: '#ff4757', logo: 'PS',   isExchange: false, oddsApiKey: null },
  { id: 'unibet',     name: 'Unibet',            color: '#007a3d', logo: 'UB',   isExchange: false, oddsApiKey: 'unibet_us' },
  { id: 'barstool',   name: 'Barstool',          color: '#e60023', logo: 'BST',  isExchange: false, oddsApiKey: null },
  { id: 'wynnbet',    name: 'WynnBET',           color: '#b8952a', logo: 'WYN',  isExchange: false, oddsApiKey: 'wynnbet' },
  { id: 'mybookie',   name: 'MyBookie',          color: '#cc0066', logo: 'MB',   isExchange: false, oddsApiKey: 'mybookieag' },
  { id: 'bovada',     name: 'Bovada',            color: '#d4240c', logo: 'BOV',  isExchange: false, oddsApiKey: 'bovada' },
  { id: 'si_sports',  name: 'SI Sportsbook',     color: '#cc0000', logo: 'SI',   isExchange: false, oddsApiKey: null },
  { id: 'superbook',  name: 'SuperBook',         color: '#1a472a', logo: 'SB',   isExchange: false, oddsApiKey: 'superbook' },
  { id: 'betway',     name: 'Betway',            color: '#00a651', logo: 'BW',   isExchange: false, oddsApiKey: 'betway' },
  // Exchanges / Sharp Books
  { id: 'betfair',    name: 'Betfair Exchange',  color: '#ffb600', logo: 'BF',   isExchange: true,  oddsApiKey: 'betfair_ex_us' },
  { id: 'sporttrade', name: 'Sporttrade',        color: '#00b8d4', logo: 'ST',   isExchange: true,  oddsApiKey: 'sporttrade' },
  { id: 'novig',      name: 'Novig',             color: '#6c47ff', logo: 'NOV',  isExchange: true,  oddsApiKey: 'novig' },
  { id: 'prophet',    name: 'Prophet Exchange',  color: '#00e5ff', logo: 'PRO',  isExchange: true,  oddsApiKey: 'prophet_ex' },
];

export const APP_MAP = Object.fromEntries(BETTING_APPS.map(a => [a.id, a]));
