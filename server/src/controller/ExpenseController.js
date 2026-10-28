import { Router } from 'express';
import { requireBody, toExpenseRequest } from '../dto/requests.js';
import { methodNotAllowed, sendError } from '../exception/GlobalExceptionHandler.js';
import { expenseService } from '../service/ExpenseService.js';
import { idParams, parseId } from './params.js';

export const expenseController = Router({ strict: true });
idParams(expenseController, 'groupId', 'expenseId');

expenseController.route('/groups/:groupId/expenses')
  // POST /api/groups/1/expenses -> 201 Created, or 400 if the split is invalid
  .post((req, res) => {
    const request = toExpenseRequest(requireBody(req));
    res.status(201).json(expenseService.addExpense(req.params.groupId, request));
  })
  // GET /api/groups/1/expenses            -> all expenses
  // GET /api/groups/1/expenses?userId=2   -> only expenses involving user 2
  .get((req, res) => {
    const raw = req.query.userId;
    let userId = null;
    if (raw !== undefined && raw !== '') {
      userId = parseId(String(raw));
      if (userId === undefined) {
        return sendError(res, 400, `Invalid value '${raw}' for userId`);
      }
    }
    res.json(expenseService.getExpenses(req.params.groupId, userId));
  })
  .all(methodNotAllowed('GET', 'POST'));

// DELETE /api/expenses/5 -> 204 No Content
expenseController.route('/expenses/:expenseId')
  .delete((req, res) => {
    expenseService.deleteExpense(req.params.expenseId);
    res.status(204).end();
  })
  .all(methodNotAllowed('DELETE'));
