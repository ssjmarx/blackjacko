/**
 * Shared player factories for smoke tests.
 */
import { SimPlayer } from '../src/core/player.ts';

/** Hi-Lo counting player with I18+Fab4 and the 1-12 ramp. */
export function HILO(): SimPlayer {
  return new SimPlayer({
    play: 'i18+fab4',
    insurance: 'index',
    bet: 'ramp',
    baseUnits: 1,
    ramp: [
      { tc: 2, units: 2 },
      { tc: 3, units: 4 },
      { tc: 4, units: 8 },
      { tc: 5, units: 12 },
    ],
  });
}
