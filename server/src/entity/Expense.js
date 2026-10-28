import { now } from './now.js';

/**
 * One bill paid by one user, split among several users.
 */
export class Expense {
  constructor(description, amount, splitType, paidBy, group) {
    this.id = null;
    this.description = description;
    this.amount = amount;
    // EQUAL, PERCENTAGE or EXACT
    this.splitType = splitType;
    this.createdAt = now();
    this.paidBy = paidBy;
    // Hidden in JSON, we expose groupId instead
    this.group = group;
    // One expense has many shares (saved and deleted together with the expense)
    this.shares = [];
  }

  // Helper that keeps both sides of the relationship in sync
  addShare(share) {
    this.shares.push(share);
    share.expense = this;
  }

  get groupId() {
    return this.group ? this.group.id : null;
  }

  toJSON() {
    return {
      id: this.id,
      description: this.description,
      amount: this.amount,
      splitType: this.splitType,
      createdAt: this.createdAt,
      paidBy: this.paidBy,
      shares: this.shares,
      groupId: this.groupId
    };
  }
}
