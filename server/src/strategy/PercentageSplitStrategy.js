import { ConfigService } from '../config/ConfigService.js';
import { InvalidSplitException } from '../exception/errors.js';
import { SplitStrategy } from './SplitStrategy.js';

/**
 * PERCENTAGE: each participant pays value% of the amount. Percents must total 100.
 */
export class PercentageSplitStrategy extends SplitStrategy {
  config = ConfigService.getInstance();

  calculateShares(amount, splits) {
    if (!splits || splits.length === 0) {
      throw new InvalidSplitException('PERCENTAGE split needs at least one participant');
    }

    // Every participant must send a non-negative percent
    const missingValue = splits.some((s) => s.value == null || s.value < 0);
    if (missingValue) {
      throw new InvalidSplitException('Every participant needs a percentage of 0 or more');
    }

    // reduce + arrow function to add up all the percents
    const totalPercent = splits.reduce((sum, s) => sum + s.value, 0);
    if (Math.abs(totalPercent - 100) > this.config.tolerance) {
      throw new InvalidSplitException(`Percentages must add up to 100, but got ${this.config.round(totalPercent)}`);
    }

    const shares = new Map();
    let assigned = 0;
    for (const split of splits) {
      const share = this.config.round((amount * split.value) / 100);
      shares.set(split.userId, share);
      assigned += share;
    }

    // Put any rounding leftover on the last participant so the total is exact
    const lastUser = splits[splits.length - 1].userId;
    shares.set(lastUser, this.config.round(shares.get(lastUser) + (amount - assigned)));
    return shares;
  }
}
