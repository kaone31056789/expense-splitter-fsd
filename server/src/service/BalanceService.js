import { ConfigService } from '../config/ConfigService.js';
import { expenseRepository, paymentRepository } from '../repository/repositories.js';
import { groupService } from './GroupService.js';
import { PriorityQueue } from './PriorityQueue.js';

const config = ConfigService.getInstance();

// userId -> sum of amounts (like Collectors.groupingBy + summingDouble)
function sumBy(items, keyOf, valueOf) {
  return items.reduce((totals, item) => {
    const key = keyOf(item);
    totals.set(key, (totals.get(key) ?? 0) + valueOf(item));
    return totals;
  }, new Map());
}

function statusOf(net) {
  if (net > config.tolerance) {
    return `gets back ${config.format(net)}`;
  } else if (net < -config.tolerance) {
    return `owes ${config.format(-net)}`;
  }
  return 'settled up';
}

export const balanceService = {
  /**
   * Net balance = (expenses PAID - shares OWED) + (settle-up payments SENT - payments RECEIVED).
   * Positive -> others owe them. Negative -> they owe others.
   */
  getBalances(groupId) {
    const group = groupService.getGroup(groupId);
    const expenses = expenseRepository.findByGroupIdOrderByCreatedAtAsc(groupId);
    const payments = paymentRepository.findByGroupIdOrderByCreatedAtDesc(groupId);

    const paid = sumBy(expenses, (e) => e.paidBy.id, (e) => e.amount);
    // flatMap turns each expense into its list of shares
    const owed = sumBy(expenses.flatMap((e) => e.shares), (s) => s.user.id, (s) => s.shareAmount);

    // Settle-up payments: paying someone reduces your debt, receiving reduces your credit
    const sent = sumBy(payments, (p) => p.fromUser.id, (p) => p.amount);
    const received = sumBy(payments, (p) => p.toUser.id, (p) => p.amount);

    // One row per member, sorted from highest balance to lowest
    return [...group.members]
      .map((member) => {
        const id = member.id;
        const net = config.round((paid.get(id) ?? 0) - (owed.get(id) ?? 0)
          + (sent.get(id) ?? 0) - (received.get(id) ?? 0));
        return { userId: id, name: member.name, balance: net, status: statusOf(net) };
      })
      .sort((a, b) => b.balance - a.balance || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  },

  /**
   * Cash-flow settlement (greedy). Uses at most (n - 1) payments; usually, but not always,
   * the true minimum (finding the exact minimum is an NP-hard problem).
   * 1. Put creditors (balance > 0) in a max-heap and debtors (balance < 0) in a max-heap
   *    of how much they owe.
   * 2. Repeatedly match the BIGGEST creditor with the BIGGEST debtor.
   *    The debtor pays min(credit, debt). Whoever still has money left goes back in the heap.
   * 3. Every step settles at least one person, so we need at most (n - 1) payments.
   */
  getSettlements(groupId) {
    const balances = this.getBalances(groupId);

    // Max-heaps: the comparator puts the LARGEST amount at the top
    const creditors = new PriorityQueue((a, b) => b.amount - a.amount);
    const debtors = new PriorityQueue((a, b) => b.amount - a.amount);

    for (const b of balances) {
      if (b.balance > config.tolerance) {
        creditors.add({ userId: b.userId, name: b.name, amount: b.balance });
      } else if (b.balance < -config.tolerance) {
        debtors.add({ userId: b.userId, name: b.name, amount: -b.balance });
      }
    }

    const result = [];

    while (!creditors.isEmpty() && !debtors.isEmpty()) {
      const creditor = creditors.poll();
      const debtor = debtors.poll();

      const pay = config.round(Math.min(creditor.amount, debtor.amount));
      result.push({
        fromUserId: debtor.userId,
        fromUser: debtor.name,
        toUserId: creditor.userId,
        toUser: creditor.name,
        amount: pay,
        message: `${debtor.name} pays ${creditor.name} ${config.format(pay)}`
      });

      // Whoever still has money left goes back into their heap
      creditor.amount = config.round(creditor.amount - pay);
      debtor.amount = config.round(debtor.amount - pay);
      if (creditor.amount > config.tolerance) {
        creditors.add(creditor);
      }
      if (debtor.amount > config.tolerance) {
        debtors.add(debtor);
      }
    }
    return result;
  }
};
