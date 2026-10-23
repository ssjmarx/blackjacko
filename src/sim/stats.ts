/**
 * Streaming statistics for simulation rounds (units-based): mean, variance,
 * standard error, EV conventions (initial-bet and element-of-risk), and the
 * bankroll curve (peak / max drawdown).
 */
/** Incremental round tally — O(1) per round, closed-form reports. */
export class Stats {
  n = 0;
  shoes = 0;
  sum = 0;
  sumSq = 0;
  sumInitial = 0;
  sumAtRisk = 0;
  bankroll = 0;
  peakBankroll = 0;
  maxDrawdown = 0;

  /** Fold one settled round into the accumulators. */
  addRound(net: number, initialWager: number, atRisk: number): void {
    this.n++;
    this.sum += net;
    this.sumSq += net * net;
    this.sumInitial += initialWager;
    this.sumAtRisk += atRisk;
    this.bankroll += net;
    if (this.bankroll > this.peakBankroll) this.peakBankroll = this.bankroll;
    const dd = this.peakBankroll - this.bankroll;
    if (dd > this.maxDrawdown) this.maxDrawdown = dd;
  }

  /** Mean net per round (units). */
  mean(): number {
    return this.n === 0 ? 0 : this.sum / this.n;
  }

  /** Population variance of round net (floored at 0). */
  variance(): number {
    if (this.n === 0) return 0;
    const m = this.mean();
    const v = this.sumSq / this.n - m * m;
    return v > 0 ? v : 0;
  }

  /** Standard deviation of round net. */
  sd(): number {
    return Math.sqrt(this.variance());
  }

  /** Standard error of the mean. */
  seMean(): number {
    return this.n === 0 ? 0 : this.sd() / Math.sqrt(this.n);
  }

  /** classic house-edge-style EV: net / initial main bets */
  evPctInitial(): number {
    return this.sumInitial === 0 ? 0 : this.sum / this.sumInitial;
  }

  /** approx standard error of evPctInitial (delta method) */
  seEvPctInitial(): number {
    if (this.n === 0 || this.sumInitial === 0) return 0;
    const avgInit = this.sumInitial / this.n;
    return this.sd() / (Math.sqrt(this.n) * avgInit);
  }

  /** element-of-risk style EV: net / all money at risk */
  evPctAtRisk(): number {
    return this.sumAtRisk === 0 ? 0 : this.sum / this.sumAtRisk;
  }

  /** Units won per 100 hands. */
  unitsPer100(): number {
    return this.mean() * 100;
  }

  /** Standard error of unitsPer100. */
  seUnitsPer100(): number {
    return this.seMean() * 100;
  }

  /** Mean initial main bet (units). */
  avgInitialBet(): number {
    return this.n === 0 ? 0 : this.sumInitial / this.n;
  }

  /** Hands per shoe (0 when no shoe boundary was counted). */
  handsPerShoe(): number {
    return this.shoes === 0 ? 0 : this.n / this.shoes;
  }
}

/** Fixed-digits format; normalizes negative zero; '–' for non-finite. */
export function fmt(n: number, digits = 3): string {
  if (!Number.isFinite(n)) return '–';
  const s = n.toFixed(digits);
  return s === '-' + (0).toFixed(digits) ? (0).toFixed(digits) : s;
}

/** Fraction to a percent string. */
export function pct(n: number, digits = 3): string {
  return `${(n * 100).toFixed(digits)}%`;
}
