import { now } from './now.js';

/**
 * A settle-up payment: "fromUser paid toUser Rs amount" outside the app (cash/UPI).
 * Recording it moves both members' balances towards zero.
 */
export class Payment {
  constructor(group, fromUser, toUser, amount) {
    this.id = null;
    this.group = group;
    // The person who paid (was a debtor)
    this.fromUser = fromUser;
    // The person who received the money (was a creditor)
    this.toUser = toUser;
    this.amount = amount;
    this.createdAt = now();
  }

  get groupId() {
    return this.group ? this.group.id : null;
  }

  toJSON() {
    return {
      id: this.id,
      fromUser: this.fromUser,
      toUser: this.toUser,
      amount: this.amount,
      createdAt: this.createdAt,
      groupId: this.groupId
    };
  }
}
