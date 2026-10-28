// Each error carries the HTTP status that GlobalExceptionHandler should send.

export class NotFoundError extends Error {
  status = 404;
}

export class UserNotFoundException extends NotFoundError {
  constructor(id) {
    super(`User not found with id ${id}`);
  }
}

export class GroupNotFoundException extends NotFoundError {
  constructor(id) {
    super(`Group not found with id ${id}`);
  }
}

export class ExpenseNotFoundException extends NotFoundError {
  constructor(id) {
    super(`Expense not found with id ${id}`);
  }
}

export class PaymentNotFoundException extends NotFoundError {
  constructor(id) {
    super(`Payment not found with id ${id}`);
  }
}

// Thrown when a split is wrong (percent != 100, exact total != amount, non-member, ...)
export class InvalidSplitException extends Error {
  status = 400;
}

// Bad input such as empty name or duplicate email
export class IllegalArgumentException extends Error {
  status = 400;
}

// Broken or missing JSON body, or a value of the wrong type in it
export class BadRequestBodyException extends Error {
  status = 400;

  constructor() {
    super('Request body is missing or is not valid JSON');
  }
}

// Thrown when deleting a user who still appears in expenses (mapped to 409 Conflict)
export class UserInUseException extends Error {
  status = 409;
}
