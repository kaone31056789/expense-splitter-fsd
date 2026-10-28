import { AuditLogger } from './AuditLogger.js';
import { NotificationService } from './NotificationService.js';

/**
 * OBSERVER PATTERN: the "subject".
 * Keeps a list of listeners and tells each of them when something happens.
 * Adding a new listener later = write a new class and subscribe() it, no change here.
 */
class ExpenseEventPublisher {
  #listeners = [];

  subscribe(listener) {
    this.#listeners.push(listener);
  }

  notifyExpenseAdded(expense) {
    this.#listeners.forEach((listener) => listener.onExpenseAdded(expense));
  }

  notifyExpenseDeleted(expense) {
    this.#listeners.forEach((listener) => listener.onExpenseDeleted(expense));
  }
}

export const expenseEventPublisher = new ExpenseEventPublisher();
expenseEventPublisher.subscribe(new AuditLogger());
expenseEventPublisher.subscribe(new NotificationService());
