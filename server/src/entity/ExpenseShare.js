/**
 * How much ONE user owes for ONE expense.
 * Example: Dinner Rs 1200 split equally among 4 -> four shares of Rs 300.
 */
export class ExpenseShare {
  constructor(user, shareAmount) {
    this.id = null;
    // Back-reference to the parent expense (left out of JSON to avoid loops)
    this.expense = null;
    this.user = user;
    this.shareAmount = shareAmount;
  }

  toJSON() {
    return { id: this.id, user: this.user, shareAmount: this.shareAmount };
  }
}
