import { Repository } from './Repository.js';

// One repository per table, each with the extra queries the services need

class UserRepository extends Repository {
  existsByEmail(email) {
    return this.findAll().some((u) => u.email === email);
  }
}

class GroupRepository extends Repository {}

class ExpenseRepository extends Repository {
  // Saving an expense also saves its shares (like cascade = ALL)
  save(expense) {
    super.save(expense);
    expense.shares.forEach((share) => expenseShareRepository.save(share));
    return expense;
  }

  // Deleting an expense also deletes its shares
  delete(expense) {
    expense.shares.forEach((share) => expenseShareRepository.delete(share));
    super.delete(expense);
  }

  findByGroupIdOrderByCreatedAtAsc(groupId) {
    return this.findAll().filter((e) => e.groupId === groupId);
  }

  // How many expenses this user paid for (used before deleting a user)
  countByPaidById(userId) {
    return this.findAll().filter((e) => e.paidBy.id === userId).length;
  }
}

class ExpenseShareRepository extends Repository {
  // How many expense shares belong to this user (used before deleting a user)
  countByUserId(userId) {
    return this.findAll().filter((s) => s.user.id === userId).length;
  }
}

class PaymentRepository extends Repository {
  findByGroupIdOrderByCreatedAtDesc(groupId) {
    return this.findAll().filter((p) => p.groupId === groupId).reverse();
  }

  // Used before deleting a user: are they part of any payment?
  countByFromUserIdOrToUserId(fromUserId, toUserId) {
    return this.findAll().filter((p) => p.fromUser.id === fromUserId || p.toUser.id === toUserId).length;
  }
}

class ActivityLogRepository extends Repository {
  findByGroupIdOrderByCreatedAtDesc(groupId) {
    return this.findAll().filter((a) => a.groupId === groupId).reverse();
  }

  deleteByGroupId(groupId) {
    this.deleteAll(this.findAll().filter((a) => a.groupId === groupId));
  }
}

export const userRepository = new UserRepository();
export const groupRepository = new GroupRepository();
export const expenseRepository = new ExpenseRepository();
export const expenseShareRepository = new ExpenseShareRepository();
export const paymentRepository = new PaymentRepository();
export const activityLogRepository = new ActivityLogRepository();
