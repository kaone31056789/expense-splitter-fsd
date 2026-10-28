import { ConfigService } from '../config/ConfigService.js';
import { ActivityLog } from '../entity/ActivityLog.js';
import { activityLogRepository } from '../repository/repositories.js';
import { ExpenseListener } from './ExpenseListener.js';

/**
 * Observer #1: stores an activity log row in the database.
 * It runs inside the same transactional addExpense call, so if anything fails
 * the log row is rolled back together with the expense.
 */
export class AuditLogger extends ExpenseListener {
  config = ConfigService.getInstance();

  onExpenseAdded(expense) {
    const message = `${expense.paidBy.name} added expense '${expense.description}' of `
      + `${this.config.format(expense.amount)} (${expense.splitType} split)`;
    activityLogRepository.save(new ActivityLog(expense.groupId, message));
  }

  onExpenseDeleted(expense) {
    const message = `Expense '${expense.description}' of ${this.config.format(expense.amount)} was deleted`;
    activityLogRepository.save(new ActivityLog(expense.groupId, message));
  }
}
