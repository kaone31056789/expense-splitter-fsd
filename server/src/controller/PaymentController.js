import { Router } from 'express';
import { requireBody, toPaymentRequest } from '../dto/requests.js';
import { methodNotAllowed } from '../exception/GlobalExceptionHandler.js';
import { paymentService } from '../service/PaymentService.js';
import { idParams } from './params.js';

export const paymentController = Router({ strict: true });
idParams(paymentController, 'groupId', 'paymentId');

paymentController.route('/groups/:groupId/payments')
  // POST /api/groups/1/payments  body: {"fromUserId": 4, "toUserId": 1, "amount": 500} -> 201 Created
  .post((req, res) => {
    const request = toPaymentRequest(requireBody(req));
    res.status(201).json(paymentService.recordPayment(req.params.groupId, request));
  })
  // GET /api/groups/1/payments -> payments recorded so far (newest first)
  .get((req, res) => {
    res.json(paymentService.getPayments(req.params.groupId));
  })
  .all(methodNotAllowed('GET', 'POST'));

// DELETE /api/payments/3 -> 204 No Content (undo a payment)
paymentController.route('/payments/:paymentId')
  .delete((req, res) => {
    paymentService.deletePayment(req.params.paymentId);
    res.status(204).end();
  })
  .all(methodNotAllowed('DELETE'));
