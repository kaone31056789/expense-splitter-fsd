import { ConfigService } from '../config/ConfigService.js';
import { InvalidSplitException } from '../exception/errors.js';
import { SplitStrategy } from './SplitStrategy.js';

/**
 * EXACT: each participant's amount is given directly. Amounts must total the expense amount.
 */
export class ExactSplitStrategy extends SplitStrategy {
  config = ConfigService.getInstance();

  calculateShares(amount, splits) {
    if (!splits || splits.length === 0) {
      throw new InvalidSplitException('EXACT split needs at least one participant');
    }

    const missingValue = splits.some((s) => s.value == null || s.value < 0);
    if (missingValue) {
      throw new InvalidSplitException('Every participant needs an exact amount of 0 or more');
    }

    const total = splits.reduce((sum, s) => sum + s.value, 0);
    if (Math.abs(total - amount) > this.config.tolerance) {
      throw new InvalidSplitException(`Exact amounts add up to ${this.config.format(total)}`
        + ` but the expense is ${this.config.format(amount)}`);
    }

    const shares = new Map();
    splits.forEach((s) => shares.set(s.userId, this.config.round(s.value)));
    return shares;
  }
}
