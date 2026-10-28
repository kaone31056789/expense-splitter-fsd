import { ActivityLog } from '../entity/ActivityLog.js';
import { Expense } from '../entity/Expense.js';
import { ExpenseShare } from '../entity/ExpenseShare.js';
import { Group } from '../entity/Group.js';
import { Payment } from '../entity/Payment.js';
import { User } from '../entity/User.js';
import {
  activityLogRepository, expenseRepository, expenseShareRepository, groupRepository, paymentRepository, userRepository
} from './repositories.js';

/**
 * Turns the whole object graph into plain JSON (references become ids) and back again,
 * so it can be stored in the database as one document.
 */
export function dump() {
  return {
    users: { nextId: userRepository.nextId, rows: userRepository.findAll().map((u) => u.toJSON()) },
    groups: {
      nextId: groupRepository.nextId,
      rows: groupRepository.findAll().map((g) => ({ id: g.id, name: g.name, memberIds: [...g.members].map((m) => m.id) }))
    },
    expenses: {
      nextId: expenseRepository.nextId,
      rows: expenseRepository.findAll().map((e) => ({
        id: e.id, description: e.description, amount: e.amount, splitType: e.splitType, createdAt: e.createdAt,
        paidById: e.paidBy.id, groupId: e.groupId,
        shares: e.shares.map((s) => ({ id: s.id, userId: s.user.id, shareAmount: s.shareAmount }))
      }))
    },
    shares: { nextId: expenseShareRepository.nextId },
    payments: {
      nextId: paymentRepository.nextId,
      rows: paymentRepository.findAll().map((p) => ({
        id: p.id, groupId: p.groupId, fromUserId: p.fromUser.id, toUserId: p.toUser.id, amount: p.amount, createdAt: p.createdAt
      }))
    },
    logs: { nextId: activityLogRepository.nextId, rows: activityLogRepository.findAll().map((a) => ({ ...a })) }
  };
}

export function load(data) {
  const users = new Map(data.users.rows.map((r) => [r.id, Object.assign(new User(r.name, r.email), { id: r.id })]));
  const groups = new Map(data.groups.rows.map((r) => {
    const g = Object.assign(new Group(r.name), { id: r.id });
    r.memberIds.forEach((id) => g.addMember(users.get(id)));
    return [r.id, g];
  }));
  const shares = [];
  const expenses = data.expenses.rows.map((r) => {
    const e = Object.assign(new Expense(r.description, r.amount, r.splitType, users.get(r.paidById), groups.get(r.groupId)),
      { id: r.id, createdAt: r.createdAt });
    r.shares.forEach((s) => {
      const share = Object.assign(new ExpenseShare(users.get(s.userId), s.shareAmount), { id: s.id });
      e.addShare(share);
      shares.push(share);
    });
    return e;
  });
  const payments = data.payments.rows.map((r) => Object.assign(
    new Payment(groups.get(r.groupId), users.get(r.fromUserId), users.get(r.toUserId), r.amount),
    { id: r.id, createdAt: r.createdAt }));
  const logs = data.logs.rows.map((r) => Object.assign(new ActivityLog(r.groupId, r.message), r));

  userRepository.replaceAll([...users.values()], data.users.nextId);
  groupRepository.replaceAll([...groups.values()], data.groups.nextId);
  expenseRepository.replaceAll(expenses, data.expenses.nextId);
  expenseShareRepository.replaceAll(shares, data.shares.nextId);
  paymentRepository.replaceAll(payments, data.payments.nextId);
  activityLogRepository.replaceAll(logs, data.logs.nextId);
}
