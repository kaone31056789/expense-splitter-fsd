import { ConfigService } from '../config/ConfigService.js';
import { Expense } from '../entity/Expense.js';
import { ExpenseShare } from '../entity/ExpenseShare.js';
import { ExpenseNotFoundException, IllegalArgumentException, InvalidSplitException } from '../exception/errors.js';
import { expenseEventPublisher } from '../observer/ExpenseEventPublisher.js';
import { expenseRepository } from '../repository/repositories.js';
import { transactional } from '../repository/Repository.js';
import { EqualSplitStrategy } from '../strategy/EqualSplitStrategy.js';
import { ExactSplitStrategy } from '../strategy/ExactSplitStrategy.js';
import { PercentageSplitStrategy } from '../strategy/PercentageSplitStrategy.js';
import { groupService } from './GroupService.js';
import { userService } from './UserService.js';

const config = ConfigService.getInstance();

// STRATEGY PATTERN: one object per split type, chosen at runtime by name
const strategies = new Map([
  ['EQUAL', new EqualSplitStrategy()],
  ['EXACT', new ExactSplitStrategy()],
  ['PERCENTAGE', new PercentageSplitStrategy()]
]);

// Every participant must exist, be in the group, and appear only once
function validateParticipants(group, splits) {
  if (!splits || splits.length === 0) {
    throw new InvalidSplitException("At least one participant is required in 'splits'");
  }
  const seen = new Set();
  for (const split of splits) {
    if (split.userId == null) {
      throw new InvalidSplitException('Every split needs a userId');
    }
    const user = userService.getUser(split.userId);
    if (!group.hasMember(user.id)) {
      throw new InvalidSplitException(`${user.name} is not a member of ${group.name}`);
    }
    if (seen.has(user.id)) {
      throw new InvalidSplitException(`${user.name} appears more than once in the split`);
    }
    seen.add(user.id);
  }
}

export const expenseService = {
  /**
   * Saves expense + shares + activity log as ONE unit of work.
   * If any step throws (e.g. InvalidSplitException), everything is rolled back,
   * so no half-saved expense is left in the database.
   */
  addExpense(groupId, request) {
    return transactional(() => {
      const group = groupService.getGroup(groupId);

      // ---- 1. Basic validation ----
      if (request.description == null || request.description.trim() === '') {
        throw new IllegalArgumentException('Description is required');
      }
      if (request.amount == null || request.amount <= 0) {
        throw new InvalidSplitException('Amount must be greater than 0');
      }
      if (request.paidBy == null) {
        throw new IllegalArgumentException('paidBy (user id) is required');
      }
      const paidBy = userService.getUser(request.paidBy);
      if (!group.hasMember(paidBy.id)) {
        throw new InvalidSplitException(`${paidBy.name} is not a member of ${group.name}`);
      }

      // ---- 2. Pick the strategy at runtime from the request body ----
      const splitType = request.splitType == null ? '' : request.splitType.trim().toUpperCase();
      const strategy = strategies.get(splitType);
      if (!strategy) {
        throw new InvalidSplitException(`Unknown split type '${request.splitType}'. `
          + `Use one of [${[...strategies.keys()].join(', ')}]`);
      }

      const { splits } = request;
      validateParticipants(group, splits);

      const amount = config.round(request.amount);

      // ---- 3. Save the expense first ----
      const expense = expenseRepository.save(
        new Expense(request.description.trim(), amount, splitType, paidBy, group));

      // ---- 4. Calculate shares. If the split is invalid this throws and
      //         the expense saved in step 3 is ROLLED BACK. ----
      const shares = strategy.calculateShares(amount, splits);

      // ---- 5. Save shares together with the expense ----
      for (const [userId, shareAmount] of shares) {
        expense.addShare(new ExpenseShare(userService.getUser(userId), shareAmount));
      }
      expenseRepository.save(expense);

      // ---- 6. OBSERVER PATTERN: tell all listeners (AuditLogger, NotificationService) ----
      expenseEventPublisher.notifyExpenseAdded(expense);

      return expense;
    });
  },

  /**
   * All expenses of a group. If userId is given, keep only expenses that the user
   * paid for OR has a share in (filter + arrow functions).
   */
  getExpenses(groupId, userId) {
    groupService.getGroup(groupId);
    const expenses = expenseRepository.findByGroupIdOrderByCreatedAtAsc(groupId);

    if (userId == null) {
      return expenses;
    }
    userService.getUser(userId); // 404 if the user does not exist

    return expenses.filter((e) => e.paidBy.id === userId
      || e.shares.some((s) => s.user.id === userId));
  },

  deleteExpense(expenseId) {
    return transactional(() => {
      const expense = expenseRepository.findById(expenseId);
      if (!expense) throw new ExpenseNotFoundException(expenseId);
      expenseRepository.delete(expense); // shares are deleted too
      expenseEventPublisher.notifyExpenseDeleted(expense);
    });
  }
};
