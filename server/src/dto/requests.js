import { BadRequestBodyException } from '../exception/errors.js';

/**
 * Turns raw JSON bodies into clean request objects (the DTOs), coercing values the way
 * a JSON mapper would ("100" -> 100) and rejecting values of the wrong type with a 400.
 */

export function requireBody(req) {
  // req._body is set by express.json() only when it actually parsed a JSON body
  if (!req._body || req.body === null || typeof req.body !== 'object' || Array.isArray(req.body)) {
    throw new BadRequestBodyException();
  }
  return req.body;
}

export function readString(value) {
  if (value == null) return null;
  if (typeof value === 'object') throw new BadRequestBodyException();
  return String(value);
}

export function readNumber(value) {
  if (value == null) return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  throw new BadRequestBodyException();
}

export function readId(value) {
  const n = readNumber(value);
  return n == null ? null : Math.trunc(n);
}

/**
 * POST /api/groups/{groupId}/expenses
 * { "description": "Dinner", "amount": 1200, "paidBy": 1, "splitType": "EQUAL",
 *   "splits": [ {"userId": 1}, {"userId": 2} ] }
 * value in each split: EQUAL -> ignored, PERCENTAGE -> percent, EXACT -> amount
 */
export function toExpenseRequest(body) {
  let splits = [];
  if (body.splits === null) {
    splits = null;
  } else if (body.splits !== undefined) {
    if (!Array.isArray(body.splits)) throw new BadRequestBodyException();
    splits = body.splits.map((s) => {
      if (s === null || typeof s !== 'object') throw new BadRequestBodyException();
      return { userId: readId(s.userId), value: readNumber(s.value) };
    });
  }
  return {
    description: readString(body.description),
    amount: readNumber(body.amount),
    paidBy: readId(body.paidBy),
    splitType: readString(body.splitType),
    splits
  };
}

// POST /api/groups/{groupId}/payments  { "fromUserId": 4, "toUserId": 1, "amount": 500 }
export function toPaymentRequest(body) {
  return {
    fromUserId: readId(body.fromUserId),
    toUserId: readId(body.toUserId),
    amount: readNumber(body.amount)
  };
}
