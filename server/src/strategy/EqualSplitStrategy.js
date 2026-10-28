import { ConfigService } from '../config/ConfigService.js';
import { InvalidSplitException } from '../exception/errors.js';
import { SplitStrategy } from './SplitStrategy.js';

/**
 * EQUAL: amount / number of participants.
 * Rounding leftover (e.g. 1000 / 3 = 333.33 x 3 = 999.99) is added to the first person
 * so that the shares always add up to the exact amount.
 */
export class EqualSplitStrategy extends SplitStrategy {
  config = ConfigService.getInstance();

  calculateShares(amount, splits) {
    if (!splits || splits.length === 0) {
      throw new InvalidSplitException('EQUAL split needs at least one participant');
    }

    const each = this.config.round(amount / splits.length);
    const leftover = this.config.round(amount - each * splits.length);

    // Map keeps the participants in the order they were sent
    const shares = new Map();
    splits.forEach((split) => shares.set(split.userId, each));

    const firstUser = splits[0].userId;
    shares.set(firstUser, this.config.round(shares.get(firstUser) + leftover));
    return shares;
  }
}
