/**
 * OBSERVER PATTERN: the "observer" interface.
 * Any class that wants to react to expense events extends this.
 */
export class ExpenseListener {
  // eslint-disable-next-line no-unused-vars
  onExpenseAdded(expense) {}

  // Listeners may ignore deletes if they want
  // eslint-disable-next-line no-unused-vars
  onExpenseDeleted(expense) {}
}
