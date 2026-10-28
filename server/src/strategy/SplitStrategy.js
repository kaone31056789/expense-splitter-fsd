/**
 * STRATEGY PATTERN: one interface, many interchangeable algorithms.
 * Each subclass handles one split type ("EQUAL", "PERCENTAGE", "EXACT").
 * ExpenseService keeps them in a map and picks one at runtime from the request body.
 */
export class SplitStrategy {
  /**
   * @param {number} amount total expense amount
   * @param {{userId: number, value: number|null}[]} splits participants (and their value, if the type needs one)
   * @returns {Map<number, number>} userId -> amount that user owes (rounded to 2 decimals)
   * @throws InvalidSplitException if the split is not valid
   */
  // eslint-disable-next-line no-unused-vars
  calculateShares(amount, splits) {
    throw new Error('calculateShares() must be implemented');
  }
}
