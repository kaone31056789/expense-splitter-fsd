import { ConfigService } from '../config/ConfigService.js';
import { ActivityLog } from '../entity/ActivityLog.js';
import { Payment } from '../entity/Payment.js';
import { IllegalArgumentException, InvalidSplitException, PaymentNotFoundException } from '../exception/errors.js';
import { activityLogRepository, paymentRepository } from '../repository/repositories.js';
import { transactional } from '../repository/Repository.js';
import { balanceService } from './BalanceService.js';
import { groupService } from './GroupService.js';
import { userService } from './UserService.js';

const config = ConfigService.getInstance();

// Current net balance of one member
function balanceOf(groupId, userId) {
  const row = balanceService.getBalances(groupId).find((b) => b.userId === userId);
  return row ? row.balance : 0;
}

/**
 * Records settle-up payments ("Diya paid Aman Rs 500") and lets them be undone.
 */
export const paymentService = {
  /**
   * A payment can be partial, but it cannot be more than the payer owes
   * or more than the receiver is owed (otherwise balances would flip sign).
   */
  recordPayment(groupId, request) {
    return transactional(() => {
      const group = groupService.getGroup(groupId);

      if (request.fromUserId == null || request.toUserId == null) {
        throw new IllegalArgumentException('fromUserId and toUserId are required');
      }
      if (request.fromUserId === request.toUserId) {
        throw new IllegalArgumentException('A member cannot pay themselves');
      }
      if (request.amount == null || request.amount <= 0) {
        throw new IllegalArgumentException('Amount must be greater than 0');
      }

      const from = userService.getUser(request.fromUserId);
      const to = userService.getUser(request.toUserId);
      if (!group.hasMember(from.id) || !group.hasMember(to.id)) {
        throw new IllegalArgumentException(`Both people must be members of ${group.name}`);
      }

      const amount = config.round(request.amount);
      const fromBalance = balanceOf(groupId, from.id);
      const toBalance = balanceOf(groupId, to.id);

      if (amount > -fromBalance + config.tolerance) {
        throw new InvalidSplitException(`${from.name} only owes ${config.format(Math.max(0, -fromBalance))}`);
      }
      if (amount > toBalance + config.tolerance) {
        throw new InvalidSplitException(`${to.name} is only owed ${config.format(Math.max(0, toBalance))}`);
      }

      const payment = paymentRepository.save(new Payment(group, from, to, amount));
      activityLogRepository.save(new ActivityLog(groupId,
        `${from.name} paid ${to.name} ${config.format(amount)}`));
      return payment;
    });
  },

  getPayments(groupId) {
    groupService.getGroup(groupId); // 404 if the group does not exist
    return paymentRepository.findByGroupIdOrderByCreatedAtDesc(groupId);
  },

  // Undo a payment that was recorded by mistake
  deletePayment(paymentId) {
    return transactional(() => {
      const payment = paymentRepository.findById(paymentId);
      if (!payment) throw new PaymentNotFoundException(paymentId);
      paymentRepository.delete(payment);
      activityLogRepository.save(new ActivityLog(payment.groupId, `Payment of ${config.format(payment.amount)}`
        + ` from ${payment.fromUser.name} to ${payment.toUser.name} was undone`));
    });
  }
};
