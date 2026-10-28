import { ConfigService } from '../config/ConfigService.js';
import { ExpenseListener } from './ExpenseListener.js';

/**
 * Observer #2: "notifies" the group. In a real app this could send an email or push
 * notification; here we just print to the console.
 */
export class NotificationService extends ExpenseListener {
  config = ConfigService.getInstance();

  onExpenseAdded(expense) {
    console.log(`[NOTIFICATION] ${expense.paidBy.name} added expense ${expense.description}`
      + ` (${this.config.format(expense.amount)})`);
  }
}
