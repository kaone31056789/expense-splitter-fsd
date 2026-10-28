# Lab Record - Expense Splitter (React + Node.js/Express)

## 1. Project folder structure

```
expense-splitter/.gitattributes
expense-splitter/.gitignore
expense-splitter/README.md
expense-splitter/api/index.js
expense-splitter/client/index.html
expense-splitter/client/package.json
expense-splitter/client/src/App.jsx
expense-splitter/client/src/api.js
expense-splitter/client/src/components/ApiConsole.jsx
expense-splitter/client/src/components/ExpenseForm.jsx
expense-splitter/client/src/components/GroupPanel.jsx
expense-splitter/client/src/components/Sidebar.jsx
expense-splitter/client/src/components/common.jsx
expense-splitter/client/src/format.js
expense-splitter/client/src/index.css
expense-splitter/client/src/main.jsx
expense-splitter/client/vite.config.js
expense-splitter/docs/LAB_RECORD.md
expense-splitter/docs/POSTMAN_TESTS.md
expense-splitter/docs/VIVA_CHEATSHEET.md
expense-splitter/docs/build_lab_record.py
expense-splitter/package.json
expense-splitter/postman/Expense-Splitter.postman_collection.json
expense-splitter/server/package.json
expense-splitter/server/src/app.js
expense-splitter/server/src/config/ConfigService.js
expense-splitter/server/src/controller/ExpenseController.js
expense-splitter/server/src/controller/GroupController.js
expense-splitter/server/src/controller/PaymentController.js
expense-splitter/server/src/controller/UserController.js
expense-splitter/server/src/controller/params.js
expense-splitter/server/src/dto/requests.js
expense-splitter/server/src/entity/ActivityLog.js
expense-splitter/server/src/entity/Expense.js
expense-splitter/server/src/entity/ExpenseShare.js
expense-splitter/server/src/entity/Group.js
expense-splitter/server/src/entity/Payment.js
expense-splitter/server/src/entity/User.js
expense-splitter/server/src/entity/now.js
expense-splitter/server/src/exception/GlobalExceptionHandler.js
expense-splitter/server/src/exception/errors.js
expense-splitter/server/src/index.js
expense-splitter/server/src/observer/AuditLogger.js
expense-splitter/server/src/observer/ExpenseEventPublisher.js
expense-splitter/server/src/observer/ExpenseListener.js
expense-splitter/server/src/observer/NotificationService.js
expense-splitter/server/src/repository/Repository.js
expense-splitter/server/src/repository/repositories.js
expense-splitter/server/src/service/BalanceService.js
expense-splitter/server/src/service/ExpenseService.js
expense-splitter/server/src/service/GroupService.js
expense-splitter/server/src/service/PaymentService.js
expense-splitter/server/src/service/PriorityQueue.js
expense-splitter/server/src/service/UserService.js
expense-splitter/server/src/strategy/EqualSplitStrategy.js
expense-splitter/server/src/strategy/ExactSplitStrategy.js
expense-splitter/server/src/strategy/PercentageSplitStrategy.js
expense-splitter/server/src/strategy/SplitStrategy.js
expense-splitter/server/test/app.test.js
expense-splitter/vercel.json
```

## 2. Build and deployment files

### package.json

```json
{
  "name": "expense-splitter-fsd",
  "version": "1.0.0",
  "private": true,
  "description": "Splitwise-style Expense Splitter - React + Node.js/Express (Full Stack Development project)",
  "type": "module",
  "scripts": {
    "setup": "npm install --prefix server && npm install --prefix client",
    "build": "npm run build --prefix client",
    "start": "npm start --prefix server",
    "dev": "concurrently -n server,client -c green,blue \"npm run dev --prefix server\" \"npm run dev --prefix client\"",
    "test": "npm test --prefix server"
  },
  "devDependencies": {
    "concurrently": "^9.1.0"
  }
}
```

### server/package.json

```json
{
  "name": "expense-splitter-server",
  "version": "1.0.0",
  "private": true,
  "description": "Splitwise-style Expense Splitter - REST API (Node.js + Express)",
  "type": "module",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "node --watch src/index.js",
    "test": "node --test"
  },
  "engines": {
    "node": ">=18"
  },
  "dependencies": {
    "express": "^4.21.2"
  }
}
```

### client/package.json

```json
{
  "name": "expense-splitter-client",
  "version": "1.0.0",
  "private": true,
  "description": "Splitwise-style Expense Splitter - React frontend",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "vite": "^5.4.11"
  }
}
```

### client/vite.config.js

```javascript
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// In development the React app runs on :5173 and forwards /api calls to the Express server on :8080
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080'
    }
  }
});
```

### vercel.json

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "installCommand": "npm install --prefix server && npm install --prefix client",
  "buildCommand": "npm run build --prefix client",
  "outputDirectory": "client/dist",
  "rewrites": [
    { "source": "/api/:path*", "destination": "/api" }
  ]
}
```

### api/index.js

```javascript
// Vercel entry point: every /api/* request is handled by the same Express app
import app from '../server/src/app.js';

export default app;
```

## 3. Backend source code (server/src)

### server/src/app.js

```javascript
import express from 'express';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expenseController } from './controller/ExpenseController.js';
import { groupController } from './controller/GroupController.js';
import { paymentController } from './controller/PaymentController.js';
import { userController } from './controller/UserController.js';
import { globalExceptionHandler, noEndpoint } from './exception/GlobalExceptionHandler.js';

/**
 * Builds the Express app: JSON parsing, the REST controllers under /api,
 * clean JSON errors, and (if it has been built) the React frontend.
 */
export function createApp() {
  const app = express();
  app.use(express.json());

  app.use('/api', userController, groupController, expenseController, paymentController);
  app.use('/api', noEndpoint);

  // Serve the built React app (client/dist) from the same server, like Spring Boot's static/ folder
  const clientDist = join(dirname(fileURLToPath(import.meta.url)), '../../client/dist');
  if (existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (req, res) => res.sendFile(join(clientDist, 'index.html')));
  }

  app.use(globalExceptionHandler);
  return app;
}

export default createApp();
```

### server/src/config/ConfigService.js

```javascript
/**
 * SINGLETON PATTERN (classic GoF version).
 * Only one ConfigService object exists in the whole app.
 *  - "private" constructor -> needs a secret token, so nobody outside can call "new ConfigService()"
 *  - static #instance      -> holds the one instance
 *  - getInstance()         -> global access point (lazy)
 */
const TOKEN = Symbol('ConfigService');

export class ConfigService {
  static #instance = null;

  constructor(token) {
    if (token !== TOKEN) {
      throw new Error('Use ConfigService.getInstance()');
    }
    this.currencySymbol = 'Rs';
    this.decimalPlaces = 2;
    // Smallest difference we treat as "zero" when comparing money (half a paisa)
    this.tolerance = 0.01;
  }

  static getInstance() {
    if (!ConfigService.#instance) {
      ConfigService.#instance = new ConfigService(TOKEN);
    }
    return ConfigService.#instance;
  }

  /**
   * Rounds money to 2 decimals, HALF_UP, working on the decimal text of the number.
   * Plain Math.round(x * 100) / 100 gets 1.005 wrong because 1.005 * 100 = 100.49999...
   */
  round(value) {
    const abs = Math.abs(value);
    const text = String(abs);
    let rounded;
    if (text.includes('e')) {
      rounded = Number(abs.toFixed(this.decimalPlaces));
    } else {
      const shifted = Math.round(Number(`${text}e${this.decimalPlaces}`));
      rounded = Number(`${shifted}e-${this.decimalPlaces}`);
    }
    const result = value < 0 ? -rounded : rounded;
    return result === 0 ? 0 : result; // no "-0"
  }

  // 400 -> "Rs 400.00"
  format(value) {
    return `${this.currencySymbol} ${this.round(value).toFixed(this.decimalPlaces)}`;
  }
}
```

### server/src/controller/ExpenseController.js

```javascript
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
```

### server/src/controller/GroupController.js

```javascript
import { Router } from 'express';
import { readString, requireBody } from '../dto/requests.js';
import { methodNotAllowed } from '../exception/GlobalExceptionHandler.js';
import { balanceService } from '../service/BalanceService.js';
import { groupService } from '../service/GroupService.js';
import { idParams } from './params.js';

export const groupController = Router({ strict: true });
idParams(groupController, 'groupId', 'userId');

groupController.route('/groups')
  // POST /api/groups   body: {"name": "Goa Trip"} -> 201 Created
  .post((req, res) => {
    const body = requireBody(req);
    res.status(201).json(groupService.createGroup({ name: readString(body.name) }));
  })
  .get((req, res) => {
    res.json(groupService.getAllGroups());
  })
  .all(methodNotAllowed('GET', 'POST'));

groupController.route('/groups/:groupId')
  .get((req, res) => {
    res.json(groupService.getGroup(req.params.groupId));
  })
  // DELETE /api/groups/1 -> 204 No Content (also deletes its expenses and activity log)
  .delete((req, res) => {
    groupService.deleteGroup(req.params.groupId);
    res.status(204).end();
  })
  .all(methodNotAllowed('GET', 'DELETE'));

// POST /api/groups/1/members/2 -> 200 OK (returns the updated group)
groupController.route('/groups/:groupId/members/:userId')
  .post((req, res) => {
    res.json(groupService.addMember(req.params.groupId, req.params.userId));
  })
  .all(methodNotAllowed('POST'));

// GET /api/groups/1/balances -> net balance of every member
groupController.route('/groups/:groupId/balances')
  .get((req, res) => {
    res.json(balanceService.getBalances(req.params.groupId));
  })
  .all(methodNotAllowed('GET'));

// GET /api/groups/1/settlements -> minimum list of payments
groupController.route('/groups/:groupId/settlements')
  .get((req, res) => {
    res.json(balanceService.getSettlements(req.params.groupId));
  })
  .all(methodNotAllowed('GET'));

// GET /api/groups/1/activity -> audit log written by the AuditLogger observer
groupController.route('/groups/:groupId/activity')
  .get((req, res) => {
    res.json(groupService.getActivity(req.params.groupId));
  })
  .all(methodNotAllowed('GET'));
```

### server/src/controller/params.js

```javascript
import { sendError } from '../exception/GlobalExceptionHandler.js';

const WHOLE_NUMBER = /^[+-]?\d+$/;

// Parses a whole-number id, or returns undefined if the text is not one
export function parseId(text) {
  return WHOLE_NUMBER.test(text) ? Number(text) : undefined;
}

/**
 * Registers every :name in the list as a numeric path variable on the router.
 * e.g. /api/groups/abc/balances -> 400 "Invalid value 'abc' for groupId"
 */
export function idParams(router, ...names) {
  for (const name of names) {
    router.param(name, (req, res, next, value) => {
      const id = parseId(value);
      if (id === undefined) {
        return sendError(res, 400, `Invalid value '${value}' for ${name}`);
      }
      req.params[name] = id;
      next();
    });
  }
}
```

### server/src/controller/PaymentController.js

```javascript
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
```

### server/src/controller/UserController.js

```javascript
import { Router } from 'express';
import { readString, requireBody } from '../dto/requests.js';
import { methodNotAllowed } from '../exception/GlobalExceptionHandler.js';
import { userService } from '../service/UserService.js';
import { idParams } from './params.js';

export const userController = Router({ strict: true });
idParams(userController, 'userId');

userController.route('/users')
  // POST /api/users   body: {"name": "Aman", "email": "aman@mail.com"}  -> 201 Created
  .post((req, res) => {
    const body = requireBody(req);
    const user = userService.createUser({ name: readString(body.name), email: readString(body.email) });
    res.status(201).json(user);
  })
  // GET /api/users -> 200 OK
  .get((req, res) => {
    res.json(userService.getAllUsers());
  })
  .all(methodNotAllowed('GET', 'POST'));

userController.route('/users/:userId')
  // GET /api/users/1 -> 200 OK or 404
  .get((req, res) => {
    res.json(userService.getUser(req.params.userId));
  })
  // DELETE /api/users/1 -> 204 No Content, 404 if missing, 409 if still in expenses
  .delete((req, res) => {
    userService.deleteUser(req.params.userId);
    res.status(204).end();
  })
  .all(methodNotAllowed('GET', 'DELETE'));
```

### server/src/dto/requests.js

```javascript
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
```

### server/src/entity/ActivityLog.js

```javascript
import { now } from './now.js';

/**
 * Audit trail entry written by the AuditLogger observer.
 * Example message: "Aman added expense 'Dinner' of Rs 1200.00"
 */
export class ActivityLog {
  constructor(groupId, message) {
    this.id = null;
    // Plain id (not a relation) so logs survive even if the expense is deleted
    this.groupId = groupId;
    this.message = message;
    this.createdAt = now();
  }
}
```

### server/src/entity/Expense.js

```javascript
import { now } from './now.js';

/**
 * One bill paid by one user, split among several users.
 */
export class Expense {
  constructor(description, amount, splitType, paidBy, group) {
    this.id = null;
    this.description = description;
    this.amount = amount;
    // EQUAL, PERCENTAGE or EXACT
    this.splitType = splitType;
    this.createdAt = now();
    this.paidBy = paidBy;
    // Hidden in JSON, we expose groupId instead
    this.group = group;
    // One expense has many shares (saved and deleted together with the expense)
    this.shares = [];
  }

  // Helper that keeps both sides of the relationship in sync
  addShare(share) {
    this.shares.push(share);
    share.expense = this;
  }

  get groupId() {
    return this.group ? this.group.id : null;
  }

  toJSON() {
    return {
      id: this.id,
      description: this.description,
      amount: this.amount,
      splitType: this.splitType,
      createdAt: this.createdAt,
      paidBy: this.paidBy,
      shares: this.shares,
      groupId: this.groupId
    };
  }
}
```

### server/src/entity/ExpenseShare.js

```javascript
/**
 * How much ONE user owes for ONE expense.
 * Example: Dinner Rs 1200 split equally among 4 -> four shares of Rs 300.
 */
export class ExpenseShare {
  constructor(user, shareAmount) {
    this.id = null;
    // Back-reference to the parent expense (left out of JSON to avoid loops)
    this.expense = null;
    this.user = user;
    this.shareAmount = shareAmount;
  }

  toJSON() {
    return { id: this.id, user: this.user, shareAmount: this.shareAmount };
  }
}
```

### server/src/entity/Group.js

```javascript
/**
 * A group of users who share expenses (e.g. "Goa Trip").
 */
export class Group {
  constructor(name) {
    this.id = null;
    this.name = name;
    // Owning side of User <-> Group many-to-many
    this.members = new Set();
  }

  // Helper that keeps both sides of the relationship in sync
  addMember(user) {
    this.members.add(user);
    user.groups.add(this);
  }

  // Used to check membership by id
  hasMember(userId) {
    return [...this.members].some((u) => u.id === userId);
  }

  toJSON() {
    return { id: this.id, name: this.name, members: [...this.members] };
  }
}
```

### server/src/entity/now.js

```javascript
// Local date-time without a timezone, like Java's LocalDateTime: "2026-10-28T14:03:11.123"
export function now() {
  const d = new Date();
  const pad = (n, len = 2) => String(n).padStart(len, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}
```

### server/src/entity/Payment.js

```javascript
import { now } from './now.js';

/**
 * A settle-up payment: "fromUser paid toUser Rs amount" outside the app (cash/UPI).
 * Recording it moves both members' balances towards zero.
 */
export class Payment {
  constructor(group, fromUser, toUser, amount) {
    this.id = null;
    this.group = group;
    // The person who paid (was a debtor)
    this.fromUser = fromUser;
    // The person who received the money (was a creditor)
    this.toUser = toUser;
    this.amount = amount;
    this.createdAt = now();
  }

  get groupId() {
    return this.group ? this.group.id : null;
  }

  toJSON() {
    return {
      id: this.id,
      fromUser: this.fromUser,
      toUser: this.toUser,
      amount: this.amount,
      createdAt: this.createdAt,
      groupId: this.groupId
    };
  }
}
```

### server/src/entity/User.js

```javascript
/**
 * A person who can join groups and share expenses.
 */
export class User {
  constructor(name, email) {
    this.id = null;
    this.name = name;
    this.email = email;
    // Inverse side of the many-to-many (Group owns it). Left out of JSON to stop
    // infinite loops (user -> groups -> members -> user ...)
    this.groups = new Set();
  }

  toJSON() {
    return { id: this.id, name: this.name, email: this.email };
  }
}
```

### server/src/exception/errors.js

```javascript
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
```

### server/src/exception/GlobalExceptionHandler.js

```javascript
import { now } from '../entity/now.js';

/**
 * One place that catches errors thrown by ANY controller and turns them into a
 * clean JSON error with the right HTTP status:
 * { "timestamp": "...", "status": 404, "error": "Not Found", "message": "User not found with id 9" }
 */
const REASONS = {
  400: 'Bad Request',
  404: 'Not Found',
  405: 'Method Not Allowed',
  409: 'Conflict',
  500: 'Internal Server Error'
};

export function sendError(res, status, message) {
  res.status(status).json({ timestamp: now(), status, error: REASONS[status], message });
}

// 404 - URL does not match any endpoint, e.g. DELETE /api/expenses/ (id missing)
export function noEndpoint(req, res) {
  sendError(res, 404, `No endpoint at ${req.baseUrl}${req.path} - check the URL and the id`);
}

// 405 - right URL, wrong HTTP method (e.g. GET /api/expenses/1)
export function methodNotAllowed(...allowed) {
  return (req, res) => sendError(res, 405, `${req.method} is not supported here. Allowed: [${allowed.join(', ')}]`);
}

// Express knows this is an error handler because it takes 4 arguments
// eslint-disable-next-line no-unused-vars
export function globalExceptionHandler(err, req, res, next) {
  // express.json() could not parse the body
  if (err.type === 'entity.parse.failed') {
    return sendError(res, 400, 'Request body is missing or is not valid JSON');
  }
  if (err.status && REASONS[err.status]) {
    return sendError(res, err.status, err.message);
  }
  console.error(err);
  return sendError(res, 500, 'Something went wrong on the server');
}
```

### server/src/index.js

```javascript
import app from './app.js';

// Entry point: start the HTTP server
const PORT = Number(process.env.PORT) || 8080;

app.listen(PORT, () => {
  console.log(`Expense Splitter API running on http://localhost:${PORT}`);
});
```

### server/src/observer/AuditLogger.js

```javascript
import { ConfigService } from '../config/ConfigService.js';
import { ActivityLog } from '../entity/ActivityLog.js';
import { activityLogRepository } from '../repository/repositories.js';
import { ExpenseListener } from './ExpenseListener.js';

/**
 * Observer #1: stores an activity log row in the database.
 * It runs inside the same transactional addExpense call, so if anything fails
 * the log row is rolled back together with the expense.
 */
export class AuditLogger extends ExpenseListener {
  config = ConfigService.getInstance();

  onExpenseAdded(expense) {
    const message = `${expense.paidBy.name} added expense '${expense.description}' of `
      + `${this.config.format(expense.amount)} (${expense.splitType} split)`;
    activityLogRepository.save(new ActivityLog(expense.groupId, message));
  }

  onExpenseDeleted(expense) {
    const message = `Expense '${expense.description}' of ${this.config.format(expense.amount)} was deleted`;
    activityLogRepository.save(new ActivityLog(expense.groupId, message));
  }
}
```

### server/src/observer/ExpenseEventPublisher.js

```javascript
import { AuditLogger } from './AuditLogger.js';
import { NotificationService } from './NotificationService.js';

/**
 * OBSERVER PATTERN: the "subject".
 * Keeps a list of listeners and tells each of them when something happens.
 * Adding a new listener later = write a new class and subscribe() it, no change here.
 */
class ExpenseEventPublisher {
  #listeners = [];

  subscribe(listener) {
    this.#listeners.push(listener);
  }

  notifyExpenseAdded(expense) {
    this.#listeners.forEach((listener) => listener.onExpenseAdded(expense));
  }

  notifyExpenseDeleted(expense) {
    this.#listeners.forEach((listener) => listener.onExpenseDeleted(expense));
  }
}

export const expenseEventPublisher = new ExpenseEventPublisher();
expenseEventPublisher.subscribe(new AuditLogger());
expenseEventPublisher.subscribe(new NotificationService());
```

### server/src/observer/ExpenseListener.js

```javascript
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
```

### server/src/observer/NotificationService.js

```javascript
import { ConfigService } from '../config/ConfigService.js';
import { ExpenseListener } from './ExpenseListener.js';

/**
 * Observer #2: "notifies" the group. In a real app this could send an email or push
 * notification; here we just print to the console.
 */
export class NotificationService extends ExpenseListener {
  config = ConfigService.getInstance();

  onExpenseAdded(expense) {
    console.log(`[NOTIFICATION] ${expense.paidBy.name} added expense ${expense.description}`
      + ` (${this.config.format(expense.amount)})`);
  }
}
```

### server/src/repository/repositories.js

```javascript
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
```

### server/src/repository/Repository.js

```javascript
/**
 * A tiny in-memory "table" (the app's database, like H2 in-memory: data is lost on restart).
 * Every repository gets save / findById / findAll / delete / count for free,
 * and ids are generated like an IDENTITY column (1, 2, 3 ...).
 */
let currentTransaction = null;

export class Repository {
  #rows = new Map();
  #nextId = 1;

  save(entity) {
    if (entity.id == null) {
      entity.id = this.#nextId++;
    }
    const isNew = !this.#rows.has(entity.id);
    this.#rows.set(entity.id, entity);
    if (isNew && currentTransaction) {
      currentTransaction.push(() => this.#rows.delete(entity.id));
    }
    return entity;
  }

  findById(id) {
    return this.#rows.get(id) ?? null;
  }

  // Rows in insertion (id) order
  findAll() {
    return [...this.#rows.values()];
  }

  delete(entity) {
    if (this.#rows.delete(entity.id) && currentTransaction) {
      currentTransaction.push(() => this.#rows.set(entity.id, entity));
    }
  }

  deleteAll(entities) {
    entities.forEach((e) => this.delete(e));
  }

  count() {
    return this.#rows.size;
  }
}

/**
 * Runs fn as ONE unit of work. If it throws, every row it inserted or deleted is put back,
 * so no half-saved data is left behind (like @Transactional rollback).
 * As with a real IDENTITY column, ids used by the rolled-back rows are not reused.
 */
export function transactional(fn) {
  if (currentTransaction) {
    return fn(); // already inside a transaction: join it
  }
  currentTransaction = [];
  try {
    return fn();
  } catch (err) {
    currentTransaction.reverse().forEach((undo) => undo());
    throw err;
  } finally {
    currentTransaction = null;
  }
}
```

### server/src/service/BalanceService.js

```javascript
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
```

### server/src/service/ExpenseService.js

```javascript
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
```

### server/src/service/GroupService.js

```javascript
import { ActivityLog } from '../entity/ActivityLog.js';
import { Group } from '../entity/Group.js';
import { GroupNotFoundException, IllegalArgumentException } from '../exception/errors.js';
import {
  activityLogRepository, expenseRepository, groupRepository, paymentRepository
} from '../repository/repositories.js';
import { transactional } from '../repository/Repository.js';
import { userService } from './UserService.js';

export const groupService = {
  createGroup({ name }) {
    if (name == null || name.trim() === '') {
      throw new IllegalArgumentException('Group name is required');
    }
    const saved = groupRepository.save(new Group(name.trim()));
    activityLogRepository.save(new ActivityLog(saved.id, `Group '${saved.name}' created`));
    return saved;
  },

  getAllGroups() {
    return groupRepository.findAll();
  },

  getGroup(id) {
    const group = groupRepository.findById(id);
    if (!group) throw new GroupNotFoundException(id);
    return group;
  },

  addMember(groupId, userId) {
    const group = this.getGroup(groupId);
    const user = userService.getUser(userId);

    if (group.hasMember(userId)) {
      throw new IllegalArgumentException(`${user.name} is already a member of ${group.name}`);
    }
    group.addMember(user);
    activityLogRepository.save(new ActivityLog(groupId, `${user.name} joined the group`));
    return groupRepository.save(group);
  },

  /**
   * Deletes a group with everything inside it: expenses (and their shares),
   * settle-up payments, member links and the activity log. Users themselves are kept.
   */
  deleteGroup(groupId) {
    return transactional(() => {
      const group = this.getGroup(groupId);
      expenseRepository.deleteAll(expenseRepository.findByGroupIdOrderByCreatedAtAsc(groupId));
      paymentRepository.deleteAll(paymentRepository.findByGroupIdOrderByCreatedAtDesc(groupId));
      for (const member of group.members) {
        member.groups.delete(group);
      }
      group.members.clear();
      activityLogRepository.deleteByGroupId(groupId);
      groupRepository.delete(group);
    });
  },

  getActivity(groupId) {
    this.getGroup(groupId); // 404 if the group does not exist
    return activityLogRepository.findByGroupIdOrderByCreatedAtDesc(groupId);
  }
};
```

### server/src/service/PaymentService.js

```javascript
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
```

### server/src/service/PriorityQueue.js

```javascript
/**
 * Binary heap priority queue (same algorithm as java.util.PriorityQueue).
 * compare(a, b) < 0 means a comes out first.
 */
export class PriorityQueue {
  #heap = [];

  constructor(compare) {
    this.compare = compare;
  }

  get size() {
    return this.#heap.length;
  }

  isEmpty() {
    return this.#heap.length === 0;
  }

  // Add at the bottom, then move up while it beats its parent
  add(item) {
    const heap = this.#heap;
    let k = heap.length;
    heap.push(item);
    while (k > 0) {
      const parent = (k - 1) >>> 1;
      if (this.compare(item, heap[parent]) >= 0) break;
      heap[k] = heap[parent];
      k = parent;
    }
    heap[k] = item;
  }

  // Take the top, move the last item to the top, then move it down
  poll() {
    const heap = this.#heap;
    if (heap.length === 0) return null;
    const top = heap[0];
    const last = heap.pop();
    if (heap.length > 0) {
      let k = 0;
      const half = heap.length >>> 1;
      while (k < half) {
        let child = 2 * k + 1;
        const right = child + 1;
        if (right < heap.length && this.compare(heap[child], heap[right]) > 0) child = right;
        if (this.compare(last, heap[child]) <= 0) break;
        heap[k] = heap[child];
        k = child;
      }
      heap[k] = last;
    }
    return top;
  }
}
```

### server/src/service/UserService.js

```javascript
import { User } from '../entity/User.js';
import { IllegalArgumentException, UserInUseException, UserNotFoundException } from '../exception/errors.js';
import {
  expenseRepository, expenseShareRepository, paymentRepository, userRepository
} from '../repository/repositories.js';
import { transactional } from '../repository/Repository.js';

export const userService = {
  createUser({ name, email }) {
    if (name == null || name.trim() === '') {
      throw new IllegalArgumentException('Name is required');
    }
    if (email == null || !email.includes('@')) {
      throw new IllegalArgumentException('A valid email is required');
    }
    const cleanEmail = email.trim().toLowerCase();
    if (userRepository.existsByEmail(cleanEmail)) {
      throw new IllegalArgumentException(`Email already registered: ${cleanEmail}`);
    }
    return userRepository.save(new User(name.trim(), cleanEmail));
  },

  getAllUsers() {
    return userRepository.findAll();
  },

  getUser(id) {
    const user = userRepository.findById(id);
    if (!user) throw new UserNotFoundException(id);
    return user;
  },

  /**
   * Deletes a user and removes them from all their groups.
   * Refused (409) if the user paid for or shares in any expense, or is part of a payment, because deleting
   * those expenses would silently change everyone else's balances.
   */
  deleteUser(id) {
    return transactional(() => {
      const user = this.getUser(id);

      const involved = expenseRepository.countByPaidById(id) + expenseShareRepository.countByUserId(id)
        + paymentRepository.countByFromUserIdOrToUserId(id, id);
      if (involved > 0) {
        throw new UserInUseException(`${user.name} is still part of expenses or payments. `
          + 'Delete those (or the whole group) first.');
      }

      // Remove the user from every group's member list (both sides of the many-to-many)
      for (const group of [...user.groups]) {
        group.members.delete(user);
      }
      user.groups.clear();
      userRepository.delete(user);
    });
  }
};
```

### server/src/strategy/EqualSplitStrategy.js

```javascript
import { ConfigService } from '../config/ConfigService.js';
import { InvalidSplitException } from '../exception/errors.js';
import { SplitStrategy } from './SplitStrategy.js';

/**
 * EQUAL: amount / number of participants.
 * Rounding leftover (e.g. 1000 / 3 = 333.33 x 3 = 999.99) is added to the first person
 * so that the shares always add up to the exact amount.
 */
export class EqualSplitStrategy extends SplitStrategy {
  config = ConfigService.getInstance();

  calculateShares(amount, splits) {
    if (!splits || splits.length === 0) {
      throw new InvalidSplitException('EQUAL split needs at least one participant');
    }

    const each = this.config.round(amount / splits.length);
    const leftover = this.config.round(amount - each * splits.length);

    // Map keeps the participants in the order they were sent
    const shares = new Map();
    splits.forEach((split) => shares.set(split.userId, each));

    const firstUser = splits[0].userId;
    shares.set(firstUser, this.config.round(shares.get(firstUser) + leftover));
    return shares;
  }
}
```

### server/src/strategy/ExactSplitStrategy.js

```javascript
import { ConfigService } from '../config/ConfigService.js';
import { InvalidSplitException } from '../exception/errors.js';
import { SplitStrategy } from './SplitStrategy.js';

/**
 * EXACT: each participant's amount is given directly. Amounts must total the expense amount.
 */
export class ExactSplitStrategy extends SplitStrategy {
  config = ConfigService.getInstance();

  calculateShares(amount, splits) {
    if (!splits || splits.length === 0) {
      throw new InvalidSplitException('EXACT split needs at least one participant');
    }

    const missingValue = splits.some((s) => s.value == null || s.value < 0);
    if (missingValue) {
      throw new InvalidSplitException('Every participant needs an exact amount of 0 or more');
    }

    const total = splits.reduce((sum, s) => sum + s.value, 0);
    if (Math.abs(total - amount) > this.config.tolerance) {
      throw new InvalidSplitException(`Exact amounts add up to ${this.config.format(total)}`
        + ` but the expense is ${this.config.format(amount)}`);
    }

    const shares = new Map();
    splits.forEach((s) => shares.set(s.userId, this.config.round(s.value)));
    return shares;
  }
}
```

### server/src/strategy/PercentageSplitStrategy.js

```javascript
import { ConfigService } from '../config/ConfigService.js';
import { InvalidSplitException } from '../exception/errors.js';
import { SplitStrategy } from './SplitStrategy.js';

/**
 * PERCENTAGE: each participant pays value% of the amount. Percents must total 100.
 */
export class PercentageSplitStrategy extends SplitStrategy {
  config = ConfigService.getInstance();

  calculateShares(amount, splits) {
    if (!splits || splits.length === 0) {
      throw new InvalidSplitException('PERCENTAGE split needs at least one participant');
    }

    // Every participant must send a non-negative percent
    const missingValue = splits.some((s) => s.value == null || s.value < 0);
    if (missingValue) {
      throw new InvalidSplitException('Every participant needs a percentage of 0 or more');
    }

    // reduce + arrow function to add up all the percents
    const totalPercent = splits.reduce((sum, s) => sum + s.value, 0);
    if (Math.abs(totalPercent - 100) > this.config.tolerance) {
      throw new InvalidSplitException(`Percentages must add up to 100, but got ${this.config.round(totalPercent)}`);
    }

    const shares = new Map();
    let assigned = 0;
    for (const split of splits) {
      const share = this.config.round((amount * split.value) / 100);
      shares.set(split.userId, share);
      assigned += share;
    }

    // Put any rounding leftover on the last participant so the total is exact
    const lastUser = splits[splits.length - 1].userId;
    shares.set(lastUser, this.config.round(shares.get(lastUser) + (amount - assigned)));
    return shares;
  }
}
```

### server/src/strategy/SplitStrategy.js

```javascript
/**
 * STRATEGY PATTERN: one interface, many interchangeable algorithms.
 * Each subclass handles one split type ("EQUAL", "PERCENTAGE", "EXACT").
 * ExpenseService keeps them in a map and picks one at runtime from the request body.
 */
export class SplitStrategy {
  /**
   * @param {number} amount total expense amount
   * @param {{userId: number, value: number|null}[]} splits participants (and their value, if the type needs one)
   * @returns {Map<number, number>} userId -> amount that user owes (rounded to 2 decimals)
   * @throws InvalidSplitException if the split is not valid
   */
  // eslint-disable-next-line no-unused-vars
  calculateShares(amount, splits) {
    throw new Error('calculateShares() must be implemented');
  }
}
```

## 4. Backend tests (server/test)

### server/test/app.test.js

```javascript
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { createApp } from '../src/app.js';
import { InvalidSplitException } from '../src/exception/errors.js';
import { expenseRepository } from '../src/repository/repositories.js';
import { balanceService } from '../src/service/BalanceService.js';
import { expenseService } from '../src/service/ExpenseService.js';
import { groupService } from '../src/service/GroupService.js';
import { paymentService } from '../src/service/PaymentService.js';
import { userService } from '../src/service/UserService.js';

const split = (user, value = null) => ({ userId: user.id, value });
const request = (description, amount, paidBy, splitType, ...splits) =>
  ({ description, amount, paidBy: paidBy.id, splitType, splits });
const balancesByName = (groupId) =>
  Object.fromEntries(balanceService.getBalances(groupId).map((b) => [b.name, b.balance]));
const settlementMessages = (groupId) => balanceService.getSettlements(groupId).map((s) => s.message);

// Runs the same scenario as the Postman test sequence and checks the numbers
test('full scenario gives expected balances and settlements', () => {
  const a = userService.createUser({ name: 'Aman', email: 'aman@test.com' });
  const b = userService.createUser({ name: 'Bhavya', email: 'bhavya@test.com' });
  const c = userService.createUser({ name: 'Chirag', email: 'chirag@test.com' });
  const d = userService.createUser({ name: 'Diya', email: 'diya@test.com' });

  const g = groupService.createGroup({ name: 'Goa Trip' });
  for (const u of [a, b, c, d]) {
    groupService.addMember(g.id, u.id);
  }

  expenseService.addExpense(g.id, request('Dinner', 1200, a, 'EQUAL', split(a), split(b), split(c), split(d)));
  expenseService.addExpense(g.id, request('Cab', 1000, b, 'PERCENTAGE',
    split(a, 25), split(b, 25), split(c, 30), split(d, 20)));
  expenseService.addExpense(g.id, request('Movie', 1000, c, 'EXACT',
    split(a, 250), split(b, 300), split(c, 200), split(d, 250)));

  assert.deepEqual(balancesByName(g.id), { Aman: 400, Chirag: 200, Bhavya: 150, Diya: -750 });
  assert.deepEqual(settlementMessages(g.id),
    ['Diya pays Aman Rs 400.00', 'Diya pays Chirag Rs 200.00', 'Diya pays Bhavya Rs 150.00']);

  // Invalid split (percent total 90) must throw and leave NO extra expense behind (rollback)
  const countBefore = expenseRepository.count();
  assert.throws(() => expenseService.addExpense(g.id,
    request('Bad', 500, a, 'PERCENTAGE', split(a, 50), split(b, 40))), InvalidSplitException);
  assert.equal(expenseRepository.count(), countBefore);

  // Settle-up: Diya pays Aman his Rs 400 -> Aman is settled, Diya still owes Rs 350
  paymentService.recordPayment(g.id, { fromUserId: d.id, toUserId: a.id, amount: 400 });
  const afterPayment = balancesByName(g.id);
  assert.equal(afterPayment.Aman, 0);
  assert.equal(afterPayment.Diya, -350);
  assert.deepEqual(settlementMessages(g.id), ['Diya pays Chirag Rs 200.00', 'Diya pays Bhavya Rs 150.00']);

  // Paying someone more than they are owed is rejected
  assert.throws(() => paymentService.recordPayment(g.id, { fromUserId: d.id, toUserId: c.id, amount: 500 }),
    InvalidSplitException);
});

test('equal split puts the leftover paisa on the first person', () => {
  const x = userService.createUser({ name: 'X', email: 'x@test.com' });
  const y = userService.createUser({ name: 'Y', email: 'y@test.com' });
  const z = userService.createUser({ name: 'Z', email: 'z@test.com' });
  const g = groupService.createGroup({ name: 'Thirds' });
  [x, y, z].forEach((u) => groupService.addMember(g.id, u.id));

  const e = expenseService.addExpense(g.id, request('Pizza', 1000, x, 'EQUAL', split(x), split(y), split(z)));
  assert.deepEqual(e.shares.map((s) => s.shareAmount), [333.34, 333.33, 333.33]);
});

describe('REST API', () => {
  let server;
  let base;

  before(async () => {
    server = createApp().listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    base = `http://localhost:${server.address().port}/api`;
  });

  after(() => server.close());

  const call = async (method, path, body) => {
    const res = await fetch(base + path, {
      method,
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body))
    });
    const text = await res.text();
    return { status: res.status, json: text ? JSON.parse(text) : null };
  };

  test('create user returns 201 and the user', async () => {
    const r = await call('POST', '/users', { name: ' Neha ', email: 'NEHA@Test.com' });
    assert.equal(r.status, 201);
    assert.equal(r.json.name, 'Neha');
    assert.equal(r.json.email, 'neha@test.com');
    assert.equal(typeof r.json.id, 'number');
  });

  test('errors have the clean error body', async () => {
    const r = await call('GET', '/groups/999/balances');
    assert.equal(r.status, 404);
    assert.deepEqual(Object.keys(r.json).sort(), ['error', 'message', 'status', 'timestamp']);
    assert.equal(r.json.message, 'Group not found with id 999');
    assert.equal(r.json.error, 'Not Found');
  });

  test('bad JSON, bad id, wrong method and unknown URL', async () => {
    assert.equal((await call('POST', '/users', '{not json')).status, 400);
    assert.equal((await call('POST', '/users')).json.message, 'Request body is missing or is not valid JSON');
    assert.equal((await call('GET', '/groups/abc/balances')).json.message, "Invalid value 'abc' for groupId");
    const wrong = await call('GET', '/expenses/1');
    assert.equal(wrong.status, 405);
    assert.equal(wrong.json.message, 'GET is not supported here. Allowed: [DELETE]');
    const missing = await call('DELETE', '/expenses/');
    assert.equal(missing.status, 404);
    assert.equal(missing.json.message, 'No endpoint at /api/expenses/ - check the URL and the id');
  });

  test('expense, filter, payment, undo and delete user conflict', async () => {
    const p = (await call('POST', '/users', { name: 'Pia', email: 'pia@test.com' })).json;
    const q = (await call('POST', '/users', { name: 'Qasim', email: 'qasim@test.com' })).json;
    const g = (await call('POST', '/groups', { name: 'Flat' })).json;
    await call('POST', `/groups/${g.id}/members/${p.id}`);
    const withQ = await call('POST', `/groups/${g.id}/members/${q.id}`);
    assert.equal(withQ.status, 200);
    assert.equal(withQ.json.members.length, 2);
    assert.equal((await call('POST', `/groups/${g.id}/members/${q.id}`)).status, 400);

    const e = await call('POST', `/groups/${g.id}/expenses`,
      { description: 'Rent', amount: 800, paidBy: p.id, splitType: 'equal', splits: [{ userId: p.id }, { userId: q.id }] });
    assert.equal(e.status, 201);
    assert.equal(e.json.splitType, 'EQUAL');
    assert.equal(e.json.groupId, g.id);
    assert.equal(e.json.paidBy.name, 'Pia');
    assert.deepEqual(e.json.shares.map((s) => s.shareAmount), [400, 400]);

    assert.equal((await call('GET', `/groups/${g.id}/expenses?userId=${q.id}`)).json.length, 1);

    const tooMuch = await call('POST', `/groups/${g.id}/payments`, { fromUserId: q.id, toUserId: p.id, amount: 500 });
    assert.equal(tooMuch.status, 400);
    assert.match(tooMuch.json.message, /only owes Rs 400.00/);

    const pay = await call('POST', `/groups/${g.id}/payments`, { fromUserId: q.id, toUserId: p.id, amount: 400 });
    assert.equal(pay.status, 201);
    assert.equal((await call('GET', `/groups/${g.id}/settlements`)).json.length, 0);
    assert.equal((await call('DELETE', `/payments/${pay.json.id}`)).status, 204);
    assert.equal((await call('GET', `/groups/${g.id}/settlements`)).json[0].message, 'Qasim pays Pia Rs 400.00');

    const conflict = await call('DELETE', `/users/${q.id}`);
    assert.equal(conflict.status, 409);
    assert.match(conflict.json.message, /still part of expenses/);

    assert.equal((await call('DELETE', `/groups/${g.id}`)).status, 204);
    assert.equal((await call('DELETE', `/users/${q.id}`)).status, 204);
    assert.equal((await call('GET', `/users/${q.id}`)).status, 404);
  });
});
```

## 5. Frontend source code (client)

### client/index.html

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Expense Splitter</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,800&family=IBM+Plex+Mono:wght@400;500;600&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
<div id="root"></div>
<script type="module" src="/src/main.jsx"></script>
</body>
</html>
```

### client/src/api.js

```javascript
/* ===================== API helper + console log ===================== */

let logger = () => {};

// The API console registers here to see every REST call
export function onApiCall(fn) {
  logger = fn;
}

export async function api(method, path, body) {
  const t0 = performance.now();
  let res;
  let data = null;
  try {
    res = await fetch(path, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined
    });
    const text = await res.text();
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    const message = 'Server not reachable. Is the Express server running?';
    logger({ method, path, status: 0, ms: Math.round(performance.now() - t0), req: body, resp: { message } });
    throw new Error(message);
  }
  logger({ method, path, status: res.status, ms: Math.round(performance.now() - t0), req: body, resp: data });
  if (!res.ok) {
    const err = new Error((data && data.message) || res.statusText);
    err.status = res.status;
    throw err;
  }
  return data;
}
```

### client/src/App.jsx

```jsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, onApiCall } from './api.js';
import { ApiConsole, Toast } from './components/ApiConsole.jsx';
import { GroupPanel, Welcome } from './components/GroupPanel.jsx';
import { GroupsCard, PeopleCard } from './components/Sidebar.jsx';
import { money } from './format.js';

export default function App() {
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [groupId, setGroupId] = useState(null);
  const [filterUser, setFilterUser] = useState('');
  const [splitType, setSplitType] = useState('EQUAL');
  // Data for the selected group; undefined = still loading, null = no group (welcome card)
  const [panel, setPanel] = useState(undefined);
  const [confirmGroupId, setConfirmGroupId] = useState(null);
  const [demoBusy, setDemoBusy] = useState(false);
  const [logs, setLogs] = useState([]);
  const [toast, setToast] = useState({ show: false, text: '', isError: false, status: null });

  // Latest selection, readable inside async functions without waiting for a re-render
  const selection = useRef({ groupId: null, filterUser: '' });
  const version = useRef(0);
  const toastTimer = useRef(null);
  const logId = useRef(0);

  /* ===================== API console + toast ===================== */
  useEffect(() => {
    onApiCall((entry) => setLogs((old) => [{ ...entry, id: ++logId.current }, ...old].slice(0, 40)));
  }, []);

  const showToast = useCallback((text, isError = false, status = null) => {
    setToast({ show: true, text, isError, status });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, show: false })), isError ? 4200 : 2200);
  }, []);
  const fail = useCallback((err) => showToast(err.message, true, err.status), [showToast]);

  /* ===================== loading ===================== */
  // Loads everything shown for one group. Returns the balances (or null on error).
  const loadGroup = useCallback(async (group, filter) => {
    if (!group) {
      setPanel(null);
      return [];
    }
    const qs = filter ? `?userId=${filter}` : '';
    try {
      const [expenses, balances, settlements, activity, payments] = await Promise.all([
        api('GET', `/api/groups/${group.id}/expenses${qs}`),
        api('GET', `/api/groups/${group.id}/balances`),
        api('GET', `/api/groups/${group.id}/settlements`),
        api('GET', `/api/groups/${group.id}/activity`),
        api('GET', `/api/groups/${group.id}/payments`)
      ]);
      version.current += 1;
      setPanel({ group, expenses, balances, settlements, activity, payments, version: version.current });
      return balances;
    } catch (err) {
      fail(err);
      return null;
    }
  }, [fail]);

  const loadAll = useCallback(async (preferredGroupId = selection.current.groupId) => {
    try {
      const [allUsers, allGroups] = await Promise.all([api('GET', '/api/users'), api('GET', '/api/groups')]);
      let gid = preferredGroupId;
      if (gid && !allGroups.some((g) => g.id === gid)) gid = null;
      if (!gid && allGroups.length) gid = allGroups[0].id;
      if (gid !== selection.current.groupId) selection.current.filterUser = '';
      selection.current.groupId = gid;

      setUsers(allUsers);
      setGroups(allGroups);
      setGroupId(gid);
      setFilterUser(selection.current.filterUser);
      setConfirmGroupId(null);
      return await loadGroup(allGroups.find((g) => g.id === gid), selection.current.filterUser);
    } catch (err) {
      fail(err);
      return null;
    }
  }, [loadGroup, fail]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const currentGroup = groups.find((g) => g.id === groupId);

  /* ===================== sidebar actions ===================== */
  async function createUser(body) {
    try {
      const u = await api('POST', '/api/users', body);
      showToast(`${u.name} created (id ${u.id})`, false, 201);
      await loadAll();
      return true;
    } catch (err) {
      fail(err);
      return false;
    }
  }

  async function deleteUser(u) {
    try {
      await api('DELETE', `/api/users/${u.id}`);
      showToast(`${u.name} deleted`, false, 204);
    } catch (err) { fail(err); } // 409 explains that the user is still in expenses
    await loadAll();
  }

  async function addMember(userId) {
    try {
      await api('POST', `/api/groups/${groupId}/members/${userId}`);
      showToast('Member added');
      await loadAll();
    } catch (err) { fail(err); }
  }

  async function createGroup(body) {
    try {
      const g = await api('POST', '/api/groups', body);
      showToast(`Group "${g.name}" created`, false, 201);
      await loadAll(g.id);
      return true;
    } catch (err) {
      fail(err);
      return false;
    }
  }

  async function deleteGroup(g) {
    try {
      await api('DELETE', `/api/groups/${g.id}`);
      showToast(`Group "${g.name}" deleted`, false, 204);
    } catch (err) { fail(err); }
    await loadAll(selection.current.groupId === g.id ? null : selection.current.groupId);
  }

  function selectGroup(id) {
    selection.current = { groupId: id, filterUser: '' };
    setGroupId(id);
    setFilterUser('');
    setConfirmGroupId(null);
    loadGroup(groups.find((g) => g.id === id), '');
  }

  function changeFilter(value) {
    selection.current.filterUser = value;
    setFilterUser(value);
    loadGroup(currentGroup, value);
  }

  /* ===================== group panel actions ===================== */
  const actions = {
    async addExpense(body) {
      try {
        const exp = await api('POST', `/api/groups/${groupId}/expenses`, body);
        showToast(`"${exp.description}" saved`, false, 201);
        await loadAll();
      } catch (err) { fail(err); }
    },

    async deleteExpense(id) {
      try {
        await api('DELETE', `/api/expenses/${id}`);
        showToast('Expense deleted', false, 204);
      } catch (err) { fail(err); }
      // Always reload, so the list never shows an expense that no longer exists
      await loadAll();
    },

    async pay(s, amount) {
      try {
        await api('POST', `/api/groups/${groupId}/payments`, { fromUserId: s.fromUserId, toUserId: s.toUserId, amount });
        const balances = await loadAll();
        // Tell the user what is left after this payment
        const left = (balances || []).find((b) => b.userId === s.fromUserId);
        const rest = left && left.balance < -0.009 ? `${s.fromUser} still owes ${money(-left.balance)}` : `${s.fromUser} is settled up`;
        showToast(`Recorded ${money(amount)} to ${s.toUser}. ${rest}.`, false, 201);
      } catch (err) {
        fail(err);
        await loadAll();
      }
    },

    async undoPayment(id) {
      try {
        await api('DELETE', `/api/payments/${id}`);
        showToast('Payment undone', false, 204);
      } catch (err) { fail(err); }
      await loadAll();
    }
  };

  /* ===================== demo data (all via the REST API) ===================== */
  async function loadDemo() {
    setDemoBusy(true);
    try {
      const people = [['Aman', 'aman@demo.com'], ['Bhavya', 'bhavya@demo.com'], ['Chirag', 'chirag@demo.com'], ['Diya', 'diya@demo.com']];
      const existing = await api('GET', '/api/users');
      const ids = [];
      for (const [name, email] of people) {
        const found = existing.find((u) => u.email === email);
        ids.push(found ? found.id : (await api('POST', '/api/users', { name, email })).id);
      }
      const [a, b, c, d] = ids;
      const g = await api('POST', '/api/groups', { name: 'Goa Trip' });
      for (const id of ids) await api('POST', `/api/groups/${g.id}/members/${id}`);

      await api('POST', `/api/groups/${g.id}/expenses`, { description: 'Dinner', amount: 1200, paidBy: a, splitType: 'EQUAL',
        splits: [{ userId: a }, { userId: b }, { userId: c }, { userId: d }] });
      await api('POST', `/api/groups/${g.id}/expenses`, { description: 'Cab to airport', amount: 1000, paidBy: b, splitType: 'PERCENTAGE',
        splits: [{ userId: a, value: 25 }, { userId: b, value: 25 }, { userId: c, value: 30 }, { userId: d, value: 20 }] });
      await api('POST', `/api/groups/${g.id}/expenses`, { description: 'Movie tickets', amount: 1000, paidBy: c, splitType: 'EXACT',
        splits: [{ userId: a, value: 250 }, { userId: b, value: 300 }, { userId: c, value: 200 }, { userId: d, value: 250 }] });

      showToast('Demo loaded: 4 people, 1 group, 3 expenses');
      await loadAll(g.id);
    } catch (err) { fail(err); }
    setDemoBusy(false);
  }

  function toggleTheme() {
    const root = document.documentElement;
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('es-theme', root.dataset.theme); } catch (e) { /* storage blocked */ }
  }

  return (
    <>
      <header className="masthead">
        <div className="brand">
          <h1>Expense <em>Splitter</em></h1>
          <p>Splitwise-style shared ledger · React + Express · Exp 3.3</p>
        </div>
        <div className="mast-actions">
          <button className="btn green" disabled={demoBusy} onClick={loadDemo}
            title="Creates 4 users, a group and 3 expenses through the REST API">Load demo data</button>
          <button className="btn ghost" aria-label="Toggle colour theme" onClick={toggleTheme}>Theme</button>
        </div>
      </header>

      <div className="layout">
        {/* ============ LEFT: people + groups ============ */}
        <aside className="stack">
          <PeopleCard users={users} group={currentGroup} onCreate={createUser} onAddMember={addMember} onDelete={deleteUser} />
          <GroupsCard groups={groups} groupId={groupId} confirmId={confirmGroupId} onCreate={createGroup}
            onSelect={selectGroup} onAskDelete={setConfirmGroupId} onCancelDelete={() => setConfirmGroupId(null)}
            onDelete={deleteGroup} />
        </aside>

        {/* ============ RIGHT: selected group ============ */}
        <main className="stack" key={panel ? panel.version : 'empty'}>
          {panel === null && <Welcome onDemo={loadDemo} />}
          {panel && (
            <GroupPanel data={panel} filterUser={filterUser} onFilter={changeFilter}
              splitType={splitType} onSplitType={setSplitType} actions={actions} />
          )}
        </main>
      </div>

      <ApiConsole logs={logs} onClear={() => setLogs([])} />
      <Toast toast={toast} />
    </>
  );
}
```

### client/src/components/ApiConsole.jsx

```jsx
import { useState } from 'react';

/* API console: shows every REST call (method, URL, status); click a row to see the JSON */
function LogRow({ log }) {
  const [open, setOpen] = useState(false);
  const ok = log.status >= 200 && log.status < 300;
  const detail = (log.req ? 'Request body:\n' + JSON.stringify(log.req, null, 2) + '\n\n' : '')
    + 'Response' + (log.status ? ' ' + log.status : '') + ':\n'
    + (log.resp === null ? '(no content)' : JSON.stringify(log.resp, null, 2));

  return (
    <div className={`log ${open ? 'open' : ''}`} onClick={() => setOpen(!open)}>
      <span className={`m ${log.method}`}>{log.method}</span>
      <span className={`s ${ok ? 'ok' : 'err'}`}>{log.status || 'ERR'}</span>
      <span className="u">{log.path}</span>
      <span className="t">{log.ms} ms</span>
      <pre>{detail}</pre>
    </div>
  );
}

export function ApiConsole({ logs, onClear }) {
  return (
    <section className="console" aria-label="API request log">
      <div className="console-head">
        <b>API CONSOLE</b>
        <span>every click is a real REST call to the Express backend · click a row to see the JSON</span>
        <button onClick={onClear}>clear</button>
      </div>
      <div className="console-body">
        {logs.map((log) => <LogRow key={log.id} log={log} />)}
      </div>
    </section>
  );
}

export function Toast({ toast }) {
  return (
    <div className={`toast ${toast.show ? 'show' : ''} ${toast.isError ? 'error' : ''}`} role="status" aria-live="polite">
      {toast.status ? <b>{toast.status}</b> : null}{toast.text}
    </div>
  );
}
```

### client/src/components/common.jsx

```jsx
import { avColor, initials } from '../format.js';

export function Avatar({ user }) {
  return <span className="avatar" style={{ background: avColor(user.id) }}>{initials(user.name)}</span>;
}

export function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
    </svg>
  );
}
```

### client/src/components/ExpenseForm.jsx

```jsx
import { useState } from 'react';
import { money, plural } from '../format.js';

const SPLIT_TYPES = ['EQUAL', 'PERCENTAGE', 'EXACT'];
const HINTS = {
  EQUAL: 'Amount ÷ participants. Any paisa left over goes to the first person.',
  PERCENTAGE: 'Enter each person’s percent. Must add up to 100.',
  EXACT: 'Enter each person’s exact amount. Must add up to the total.'
};

export function ExpenseForm({ members, splitType, onSplitType, onSave }) {
  const [description, setDescription] = useState('');
  const [amountText, setAmountText] = useState('');
  const [paidBy, setPaidBy] = useState(String(members[0].id));
  const [included, setIncluded] = useState(() => Object.fromEntries(members.map((m) => [m.id, true])));
  const [values, setValues] = useState({});

  function changeType(type) {
    onSplitType(type);
    setValues({}); // new split type -> fresh value boxes
  }

  // Live preview so the student can see the split before the server validates it
  const amount = parseFloat(amountText) || 0;
  const active = members.filter((m) => included[m.id]);
  let ok;
  let text;
  let label;
  let each = 0;

  if (splitType === 'EQUAL') {
    each = active.length ? amount / active.length : 0;
    ok = active.length > 0 && amount > 0;
    text = plural(active.length, 'participant');
    label = ok ? money(each) + ' each' : (active.length ? 'enter amount' : 'pick people');
  } else {
    const sum = active.reduce((s, m) => s + (parseFloat(values[m.id]) || 0), 0);
    const target = splitType === 'PERCENTAGE' ? 100 : amount;
    ok = active.length > 0 && Math.abs(sum - target) <= 0.01 && target > 0;
    const unit = (v) => (splitType === 'PERCENTAGE' ? v.toFixed(2) + '%' : money(v));
    text = `Total ${unit(sum)} of ${unit(target)}`;
    label = ok ? 'balanced' : (sum < target ? unit(target - sum) + ' left' : unit(sum - target) + ' over');
  }

  function submit(e) {
    e.preventDefault();
    // Sent even if the preview says "over": the server's InvalidSplitException returns a clean 400
    const splits = active.map((m) => {
      const s = { userId: m.id };
      if (splitType !== 'EQUAL') {
        const v = values[m.id] ?? '';
        s.value = v === '' ? null : Number(v);
      }
      return s;
    });
    onSave({ description, amount: Number(amountText), paidBy: Number(paidBy), splitType, splits });
  }

  return (
    <form autoComplete="off" onSubmit={submit}>
      <div className="field">
        <label htmlFor="expDesc">Description</label>
        <input type="text" id="expDesc" placeholder="Dinner at Fisherman's Wharf" required
          value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="row">
        <div className="field grow">
          <label htmlFor="expAmount">Amount (Rs)</label>
          <input type="number" id="expAmount" min="0.01" step="0.01" placeholder="1200" required
            value={amountText} onChange={(e) => setAmountText(e.target.value)} />
        </div>
        <div className="field grow">
          <label htmlFor="expPaidBy">Paid by</label>
          <select id="expPaidBy" value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
      </div>
      <div className="field">
        <label>Split type <span style={{ fontWeight: 400, color: 'var(--ink-3)' }}>(Strategy chosen at runtime)</span></label>
        <div className="seg" role="group" aria-label="Split type">
          {SPLIT_TYPES.map((t) => (
            <button key={t} type="button" aria-pressed={t === splitType} onClick={() => changeType(t)}>{t}</button>
          ))}
        </div>
        <div className="seg-hint">{HINTS[splitType]}</div>
      </div>
      <div className="split-rows">
        {members.map((m) => (
          <div key={m.id} className={`split-row ${included[m.id] ? '' : 'off'}`}>
            <input type="checkbox" aria-label={`Include ${m.name}`} checked={included[m.id]}
              onChange={(e) => setIncluded({ ...included, [m.id]: e.target.checked })} />
            <span>{m.name}</span>
            <span className="valcell">
              {splitType === 'EQUAL'
                ? <span className="calc">{included[m.id] ? money(each) : '—'}</span>
                : <input type="number" step="0.01" min="0" placeholder={splitType === 'PERCENTAGE' ? '%' : 'Rs'}
                    aria-label="value" value={values[m.id] ?? ''}
                    onChange={(e) => setValues({ ...values, [m.id]: e.target.value })} />}
            </span>
          </div>
        ))}
      </div>
      <div className="split-meter">
        <span>{text}</span>
        <span className={`meter-badge ${ok ? 'ok' : 'bad'}`}>{label}</span>
      </div>
      <button className="btn solid" type="submit" style={{ width: '100%' }}>Save expense</button>
    </form>
  );
}
```

### client/src/components/GroupPanel.jsx

```jsx
import { useEffect, useRef, useState } from 'react';
import { money, plural, sortedMembers } from '../format.js';
import { Avatar } from './common.jsx';
import { ExpenseForm } from './ExpenseForm.jsx';

/* ===================== main panel for the selected group ===================== */
export function GroupPanel({ data, filterUser, onFilter, splitType, onSplitType, actions }) {
  const { group: g, expenses, balances, settlements, activity, payments } = data;
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const members = sortedMembers(g);

  return (
    <>
      <div className="group-banner">
        <div>
          <div className="eyebrow">Group #{g.id}</div>
          <h2>{g.name}</h2>
          <div className="members-strip">
            {members.length
              ? members.map((m) => <span key={m.id} className="member-pill"><Avatar user={m} />{m.name}</span>)
              : <span className="empty">No members yet. Use the “+ group” buttons in People.</span>}
          </div>
        </div>
        <div className="total-box">
          <div className="eyebrow">{filterUser ? 'Filtered total' : 'Group spend'}</div>
          <div className="num">{money(total)}</div>
        </div>
      </div>

      <div className="main-grid">
        <div className="stack">
          <section className="card">
            <div className="card-head"><h2>Add expense</h2><span className="tag">POST /api/groups/{g.id}/expenses</span></div>
            {members.length
              ? <ExpenseForm members={members} splitType={splitType} onSplitType={onSplitType} onSave={actions.addExpense} />
              : <p className="empty">Add members to this group first.</p>}
          </section>

          <section className="card">
            <div className="card-head">
              <h2>Expenses</h2>
              <select style={{ width: 'auto' }} aria-label="Filter by user" value={filterUser}
                onChange={(e) => onFilter(e.target.value)}>
                <option value="">Everyone</option>
                {members.map((m) => <option key={m.id} value={String(m.id)}>Involving {m.name}</option>)}
              </select>
            </div>
            {expenses.length
              ? expenses.slice().reverse().map((e) => <ExpenseItem key={e.id} expense={e} onDelete={actions.deleteExpense} />)
              : <p className="empty">No expenses recorded.</p>}
          </section>
        </div>

        <div className="stack">
          <section className="card">
            <div className="card-head"><h2>Balances</h2><span className="tag">GET …/balances</span></div>
            <Balances balances={balances} />
          </section>

          <section className="card">
            <div className="card-head"><h2>Settle up</h2><span className="tag">GET …/settlements</span></div>
            <SettlementSlip settlements={settlements} balances={balances} groupId={g.id} onPay={actions.pay} />
            <Payments payments={payments} onUndo={actions.undoPayment} />
          </section>

          <section className="card">
            <div className="card-head"><h2>Activity</h2><span className="tag">AuditLogger · observer</span></div>
            <ul className="list activity">
              {activity.length ? activity.slice(0, 12).map((a) => (
                <li key={a.id}>
                  <time>{new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
                  <span>{a.message}</span>
                </li>
              )) : <li className="empty">Nothing yet.</li>}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}

/* ---------- expense list ---------- */
function ExpenseItem({ expense: e, onDelete }) {
  const [deleting, setDeleting] = useState(false);
  return (
    <div className="exp">
      <div className="exp-top"><span className="desc">{e.description}</span><span className="num">{money(e.amount)}</span></div>
      <div className="exp-meta">
        <span className={`badge ${e.splitType}`}>{e.splitType}</span>
        <span>paid by <b>{e.paidBy.name}</b></span><span>· #{e.id}</span>
        <button className="del" title={`DELETE /api/expenses/${e.id}`} disabled={deleting}
          onClick={() => { setDeleting(true); onDelete(e.id); }}>{deleting ? 'deleting…' : 'delete'}</button>
      </div>
      <div className="shares">
        {e.shares.map((s) => <span key={s.id} className="share">{s.user.name} {Number(s.shareAmount).toFixed(2)}</span>)}
      </div>
    </div>
  );
}

/* ---------- balances: diverging bars around zero ---------- */
function Balances({ balances }) {
  if (!balances.length) return <p className="empty">No members.</p>;
  const max = Math.max(1, ...balances.map((b) => Math.abs(b.balance)));
  return (
    <>
      {balances.map((b) => {
        const width = (Math.abs(b.balance) / max * 100).toFixed(1) + '%';
        const cls = b.balance > 0.009 ? 'gets' : b.balance < -0.009 ? 'owes' : 'zero';
        return (
          <div key={b.userId} className="bal" title={b.status}>
            <span className="name">{b.name}</span>
            <span className="neg">{cls === 'owes' && <span className="bar" style={{ width }} />}</span>
            <span className="pos">{cls === 'gets' && <span className="bar" style={{ width }} />}</span>
            <span className={`amt ${cls}`}>{b.balance > 0 ? '+' : ''}{Number(b.balance).toFixed(2)}</span>
          </div>
        );
      })}
      <div className="bal-legend"><span>← owes</span><span>gets back →</span></div>
    </>
  );
}

/* ---------- settlements ---------- */
function SettlementSlip({ settlements, balances, groupId, onPay }) {
  const people = balances.filter((b) => Math.abs(b.balance) > 0.009).length;
  if (!settlements.length) {
    return (
      <div className="receipt">
        <div className="r-head">SETTLEMENT SLIP</div>
        <p className="empty" style={{ textAlign: 'center', margin: '10px 0' }}>Everyone is square.</p>
        <span className="stamp">SETTLED</span>
      </div>
    );
  }
  return (
    <div className="receipt">
      <div className="r-head">SETTLEMENT SLIP · GREEDY · TWO HEAPS</div>
      {settlements.map((s) => <SettleLine key={`${s.fromUserId}-${s.toUserId}`} s={s} groupId={groupId} onPay={onPay} />)}
      <div className="r-foot">
        <span>{plural(settlements.length, 'payment')}</span>
        <span>{people} people unsettled · max {Math.max(people - 1, 0)} needed</span>
      </div>
    </div>
  );
}

// A slip line that turns into a small form: the amount is pre-filled but can be lowered for a partial payment
function SettleLine({ s, groupId, onPay }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(Number(s.amount).toFixed(2));
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) inputRef.current.select();
  }, [open]);

  if (!open) {
    return (
      <div className="r-line">
        <span className="who-pays">{s.fromUser}<span className="arrow">→</span>{s.toUser}</span>
        <span className="r-amt">{money(s.amount)}</span>
        <button className="settle-btn" title={`POST /api/groups/${groupId}/payments`}
          onClick={() => { setAmount(Number(s.amount).toFixed(2)); setOpen(true); }}>Settle</button>
      </div>
    );
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    await onPay(s, Number(amount));
    setBusy(false);
  }

  return (
    <form className="pay-form" onSubmit={submit}>
      <span className="who-pays"><b>{s.fromUser}</b> pays <b>{s.toUser}</b></span>
      <input ref={inputRef} type="number" min="0.01" max={s.amount} step="0.01" aria-label="Amount paid" required
        value={amount} onChange={(e) => setAmount(e.target.value)} />
      <button className="settle-btn" type="submit" disabled={busy}>Mark paid</button>
      <button className="chip-btn" type="button" onClick={() => setOpen(false)}>Cancel</button>
      <span className="hint">Change the amount for a partial payment.</span>
    </form>
  );
}

/* ---------- settle-up payments ---------- */
function Payments({ payments, onUndo }) {
  if (!payments.length) return null;
  return (
    <div className="paid-list">
      <div className="eyebrow">Payments recorded</div>
      {payments.map((p) => <PaymentRow key={p.id} p={p} onUndo={onUndo} />)}
    </div>
  );
}

function PaymentRow({ p, onUndo }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="paid">
      <span>{p.fromUser.name} paid {p.toUser.name}</span>
      <span className="num">{money(p.amount)}</span>
      <button className="del" title={`DELETE /api/payments/${p.id}`} disabled={busy}
        onClick={() => { setBusy(true); onUndo(p.id); }}>undo</button>
    </div>
  );
}

/* ---------- welcome state ---------- */
export function Welcome({ onDemo }) {
  return (
    <section className="card welcome">
      <div className="eyebrow">Getting started</div>
      <h2>Split bills, <em>not friendships.</em></h2>
      <ol>
        <li>Add people on the left.</li>
        <li>Create a group and add members.</li>
        <li>Record expenses with an EQUAL, PERCENTAGE or EXACT split.</li>
        <li>See balances and the fewest payments to settle up.</li>
      </ol>
      <button className="btn green" onClick={onDemo}>Load demo data</button>
    </section>
  );
}
```

### client/src/components/Sidebar.jsx

```jsx
import { useState } from 'react';
import { plural } from '../format.js';
import { Avatar, TrashIcon } from './common.jsx';

/* ===================== People card ===================== */
export function PeopleCard({ users, group, onCreate, onAddMember, onDelete }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (await onCreate({ name, email })) {
      setName('');
      setEmail('');
    }
  }

  return (
    <section className="card">
      <div className="card-head"><h2>People</h2><span className="tag">POST /api/users</span></div>
      <form autoComplete="off" onSubmit={submit}>
        <div className="field">
          <input type="text" placeholder="Name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="row">
          <input className="grow" type="email" placeholder="email@college.edu" required
            value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="btn solid" type="submit">Add</button>
        </div>
      </form>
      <ul className="list" style={{ marginTop: 10 }}>
        {users.length ? users.map((u) => {
          const canAdd = group && !group.members.some((m) => m.id === u.id);
          return (
            <li key={u.id}>
              <Avatar user={u} />
              <div className="who"><b>{u.name}</b><small>{u.email} · id {u.id}</small></div>
              {canAdd && (
                <button className="chip-btn" title={`POST /api/groups/${group.id}/members/${u.id}`}
                  onClick={() => onAddMember(u.id)}>+ {group.name}</button>
              )}
              <button className="icon-btn" title={`DELETE /api/users/${u.id}`} aria-label={`Delete ${u.name}`}
                onClick={() => onDelete(u)}><TrashIcon /></button>
            </li>
          );
        }) : <li className="empty">No people yet.</li>}
      </ul>
    </section>
  );
}

/* ===================== Groups card ===================== */
export function GroupsCard({ groups, groupId, confirmId, onCreate, onSelect, onAskDelete, onCancelDelete, onDelete }) {
  const [name, setName] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (await onCreate({ name })) setName('');
  }

  return (
    <section className="card">
      <div className="card-head"><h2>Groups</h2><span className="tag">POST /api/groups</span></div>
      <form className="row" autoComplete="off" onSubmit={submit}>
        <input className="grow" type="text" placeholder="e.g. Goa Trip" required
          value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn solid" type="submit">Create</button>
      </form>
      <ul className="list" style={{ marginTop: 10 }}>
        {groups.length ? groups.map((gr) => {
          // Inline "are you sure?" row with explicit buttons (no timer, no browser dialog)
          if (gr.id === confirmId) {
            return (
              <li key={gr.id} className={`group-item confirming ${gr.id === groupId ? 'active' : ''}`}>
                <span className="confirm-q">Delete <b>{gr.name}</b> and all its expenses?</span>
                <button className="chip-btn danger" disabled={deleting} onClick={async () => {
                  setDeleting(true);
                  await onDelete(gr);
                  setDeleting(false);
                }}>Delete</button>
                <button className="chip-btn" onClick={onCancelDelete}>Cancel</button>
              </li>
            );
          }
          return (
            <li key={gr.id} className={`group-item ${gr.id === groupId ? 'active' : ''}`} onClick={() => onSelect(gr.id)}>
              <div className="who"><b>{gr.name}</b><small>{plural(gr.members.length, 'member')} · id {gr.id}</small></div>
              <button className="icon-btn" title={`DELETE /api/groups/${gr.id}`} aria-label={`Delete group ${gr.name}`}
                onClick={(e) => { e.stopPropagation(); onAskDelete(gr.id); }}><TrashIcon /></button>
            </li>
          );
        }) : <li className="empty">No groups yet.</li>}
      </ul>
    </section>
  );
}
```

### client/src/format.js

```javascript
export const money = (n) => 'Rs ' + Number(n).toFixed(2);

export const initials = (name) => name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

const AV_COLORS = ['#1f4d3a', '#7c3f1d', '#2f3e73', '#6b2c4a', '#5a5a1f', '#1f5a5a', '#4a3a6b', '#7a2e22'];
export const avColor = (id) => AV_COLORS[(id - 1) % AV_COLORS.length];

export const sortedMembers = (g) => [...g.members].sort((a, b) => a.id - b.id);

export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
```

### client/src/index.css

```css
/* ---------- Design tokens (light = paper ledger, dark = night ledger) ---------- */
:root {
  --paper: #f4efe4;
  --paper-2: #ebe4d4;
  --card: #fbf8f1;
  --ink: #1d1b16;
  --ink-2: #57524a;
  --ink-3: #8c857a;
  --rule: #d9cfbb;
  --rule-strong: #b9ad95;
  --accent: #1f4d3a;        /* ledger green */
  --accent-ink: #f4efe4;
  --gets: #1f7a4d;
  --gets-soft: #d7eadc;
  --owes: #b4361f;
  --owes-soft: #f3d9cf;
  --stamp: #b4361f;
  --shadow: 0 1px 0 rgba(29,27,22,.06), 0 10px 30px -18px rgba(29,27,22,.35);
  --serif: "Fraunces", Georgia, "Times New Roman", serif;
  --sans: "Manrope", "Segoe UI", sans-serif;
  --mono: "IBM Plex Mono", ui-monospace, Consolas, monospace;
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --paper: #15140f; --paper-2: #1c1b15; --card: #201e18;
    --ink: #efe8d8; --ink-2: #bdb4a2; --ink-3: #857d6e;
    --rule: #34312a; --rule-strong: #4a463c;
    --accent: #8fd1ae; --accent-ink: #12130f;
    --gets: #72c897; --gets-soft: #1f3529;
    --owes: #f08a6f; --owes-soft: #3e231b; --stamp: #f08a6f;
    --shadow: 0 1px 0 rgba(0,0,0,.3), 0 12px 30px -18px rgba(0,0,0,.8);
    color-scheme: dark;
  }
}
:root[data-theme="dark"] {
  --paper: #15140f; --paper-2: #1c1b15; --card: #201e18;
  --ink: #efe8d8; --ink-2: #bdb4a2; --ink-3: #857d6e;
  --rule: #34312a; --rule-strong: #4a463c;
  --accent: #8fd1ae; --accent-ink: #12130f;
  --gets: #72c897; --gets-soft: #1f3529;
  --owes: #f08a6f; --owes-soft: #3e231b; --stamp: #f08a6f;
  --shadow: 0 1px 0 rgba(0,0,0,.3), 0 12px 30px -18px rgba(0,0,0,.8);
  color-scheme: dark;
}

* { box-sizing: border-box; }
html, body { margin: 0; }
body {
  background: var(--paper);
  /* faint ledger ruling across the page */
  background-image: repeating-linear-gradient(to bottom, transparent 0 31px, color-mix(in srgb, var(--rule) 45%, transparent) 31px 32px);
  color: var(--ink);
  font-family: var(--sans);
  font-size: 15px;
  line-height: 1.5;
  padding-bottom: 210px; /* room for the API console */
}
button, input, select { font: inherit; color: inherit; }
.num { font-family: var(--mono); font-variant-numeric: tabular-nums; }

/* ---------- Masthead ---------- */
.masthead {
  max-width: 1280px; margin: 0 auto; padding: 28px 24px 18px;
  display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap;
  border-bottom: 3px double var(--rule-strong);
}
.brand h1 {
  font-family: var(--serif); font-weight: 800; font-size: clamp(30px, 4.4vw, 48px);
  letter-spacing: -0.02em; line-height: 1; margin: 0;
}
.brand h1 em { font-style: italic; font-weight: 400; color: var(--accent); }
.brand p { margin: 6px 0 0; color: var(--ink-2); font-size: 13px; letter-spacing: .04em; text-transform: uppercase; }
.mast-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }

.btn {
  border: 1.5px solid var(--ink); background: transparent; padding: 8px 14px; border-radius: 3px;
  font-weight: 600; font-size: 13px; cursor: pointer; letter-spacing: .02em;
  transition: transform .12s ease, background .15s ease, color .15s ease;
}
.btn:hover { transform: translateY(-1px); }
.btn:active { transform: translateY(0); }
.btn.solid { background: var(--ink); color: var(--paper); }
.btn.green { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }
.btn.ghost { border-color: var(--rule-strong); color: var(--ink-2); }
.btn:disabled { opacity: .45; cursor: not-allowed; transform: none; }
.btn:focus-visible, input:focus-visible, select:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

/* ---------- Layout ---------- */
.layout {
  max-width: 1280px; margin: 0 auto; padding: 22px 24px;
  display: grid; grid-template-columns: 300px 1fr; gap: 22px; align-items: start;
}
.main-grid { display: grid; grid-template-columns: 1.15fr 1fr; gap: 22px; align-items: start; }
.stack { display: grid; gap: 22px; min-width: 0; }

.card {
  background: var(--card); border: 1px solid var(--rule); border-radius: 4px;
  box-shadow: var(--shadow); padding: 18px 18px 16px; min-width: 0;
  animation: rise .5s cubic-bezier(.2,.7,.2,1) both;
}
.card:nth-child(2) { animation-delay: .06s; } .card:nth-child(3) { animation-delay: .12s; } .card:nth-child(4) { animation-delay: .18s; }
@keyframes rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }

.card-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
.card-head h2 { font-family: var(--serif); font-weight: 600; font-size: 21px; margin: 0; letter-spacing: -0.01em; }
.card-head .tag { font-family: var(--mono); font-size: 11px; color: var(--ink-3); white-space: nowrap; }
.eyebrow { font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: var(--ink-3); font-weight: 700; }

.field { display: grid; gap: 4px; margin-bottom: 10px; }
.field label { font-size: 12px; font-weight: 600; color: var(--ink-2); }
input[type=text], input[type=email], input[type=number], select {
  width: 100%; padding: 8px 10px; border: 1px solid var(--rule-strong); border-radius: 3px;
  background: var(--paper); min-width: 0;
}
input::placeholder { color: var(--ink-3); }
.row { display: flex; gap: 8px; align-items: center; }
.row > * { min-width: 0; }
.grow { flex: 1; }

.empty { color: var(--ink-3); font-style: italic; font-family: var(--serif); padding: 6px 0; }

/* ---------- People / groups lists ---------- */
.list { list-style: none; margin: 0; padding: 0; }
.list li { display: flex; align-items: center; gap: 10px; padding: 7px 0; border-bottom: 1px dashed var(--rule); }
.list li:last-child { border-bottom: 0; }
.avatar {
  width: 28px; height: 28px; flex: none; border-radius: 50%; display: grid; place-items: center;
  font-family: var(--serif); font-weight: 800; font-size: 13px; color: var(--paper); background: var(--ink-2);
}
.who { min-width: 0; flex: 1; }
.who b { display: block; font-weight: 600; font-size: 14px; }
.who small { display: block; color: var(--ink-3); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.chip-btn {
  border: 1px solid var(--rule-strong); background: transparent; border-radius: 99px; padding: 2px 10px;
  font-size: 12px; cursor: pointer; color: var(--ink-2); white-space: nowrap;
}
.chip-btn:hover { border-color: var(--ink); color: var(--ink); }
.group-item { cursor: pointer; border-radius: 3px; padding-left: 6px !important; padding-right: 6px !important; }
.group-item:hover { background: var(--paper-2); }
.group-item.active { background: var(--ink); color: var(--paper); }
.group-item.active small { color: color-mix(in srgb, var(--paper) 70%, transparent); }
.icon-btn {
  flex: none; width: 28px; height: 28px; display: grid; place-items: center; border-radius: 3px;
  border: 1px solid transparent; background: transparent; color: var(--ink-3); cursor: pointer;
}
.icon-btn:hover { color: var(--owes); border-color: var(--rule-strong); }
.group-item.active .icon-btn { color: color-mix(in srgb, var(--paper) 65%, transparent); }
.group-item.active .icon-btn:hover { color: var(--paper); border-color: currentColor; }
.list li.confirming { flex-wrap: wrap; gap: 6px; background: var(--owes-soft); color: var(--ink); cursor: default; padding: 8px !important; border-radius: 3px; }
.list li.confirming .confirm-q { flex: 1 1 100%; font-size: 13px; }
.list li.confirming .chip-btn:not(.danger) { color: var(--ink); border-color: var(--ink-3); }
.chip-btn.danger { background: var(--owes); border-color: var(--owes); color: #fff; }
.chip-btn.danger:hover { color: #fff; }

/* ---------- Group header ---------- */
.group-banner {
  display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap;
  padding: 4px 2px 14px; border-bottom: 1px solid var(--rule-strong); margin-bottom: 2px;
}
.group-banner h2 { font-family: var(--serif); font-size: clamp(26px, 3.2vw, 38px); font-weight: 800; margin: 2px 0 0; letter-spacing: -0.02em; line-height: 1.05; }
.members-strip { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.member-pill { display: inline-flex; align-items: center; gap: 6px; padding: 2px 10px 2px 3px; border: 1px solid var(--rule-strong); border-radius: 99px; font-size: 13px; background: var(--card); }
.member-pill .avatar { width: 20px; height: 20px; font-size: 10px; }
.total-box { text-align: right; }
.total-box .num { font-size: 26px; font-weight: 600; }

/* ---------- Split type tabs ---------- */
.seg { display: grid; grid-template-columns: repeat(3, 1fr); border: 1.5px solid var(--ink); border-radius: 3px; overflow: hidden; }
.seg button { border: 0; background: transparent; padding: 7px 4px; cursor: pointer; font-weight: 700; font-size: 12px; letter-spacing: .06em; }
.seg button + button { border-left: 1.5px solid var(--ink); }
.seg button[aria-pressed="true"] { background: var(--ink); color: var(--paper); }
.seg-hint { font-size: 12px; color: var(--ink-3); margin: 6px 0 10px; }

.split-rows { border-top: 1px solid var(--rule); margin-top: 4px; }
.split-row { display: grid; grid-template-columns: auto 1fr 110px; gap: 10px; align-items: center; padding: 7px 0; border-bottom: 1px dashed var(--rule); }
.split-row input[type=checkbox] { width: 16px; height: 16px; accent-color: var(--accent); }
.split-row .calc { font-family: var(--mono); font-size: 13px; color: var(--ink-2); text-align: right; }
.split-row.off { opacity: .45; }
.split-meter { display: flex; justify-content: space-between; align-items: center; margin: 10px 0 12px; font-size: 13px; gap: 8px; flex-wrap: wrap; }
.meter-badge { font-family: var(--mono); padding: 2px 8px; border-radius: 3px; font-size: 12px; font-weight: 600; }
.meter-badge.ok { background: var(--gets-soft); color: var(--gets); }
.meter-badge.bad { background: var(--owes-soft); color: var(--owes); }

/* ---------- Balances: diverging bars around zero ---------- */
.bal { display: grid; grid-template-columns: 92px 1fr 1fr 96px; align-items: center; gap: 0; padding: 7px 0; border-bottom: 1px dashed var(--rule); }
.bal:last-child { border-bottom: 0; }
.bal .name { font-weight: 600; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-right: 6px; }
.bal .neg, .bal .pos { height: 14px; position: relative; }
.bal .neg { border-right: 1.5px solid var(--ink); }
.bar { position: absolute; top: 0; height: 100%; border-radius: 2px; transition: width .6s cubic-bezier(.2,.7,.2,1); }
.neg .bar { right: 0; background: var(--owes); }
.pos .bar { left: 0; background: var(--gets); }
.bal .amt { text-align: right; font-family: var(--mono); font-size: 13px; font-weight: 600; }
.amt.gets { color: var(--gets); } .amt.owes { color: var(--owes); } .amt.zero { color: var(--ink-3); }
.bal-legend { display: flex; justify-content: space-between; font-size: 11px; color: var(--ink-3); letter-spacing: .08em; text-transform: uppercase; margin-top: 8px; }

/* ---------- Settlement receipt ---------- */
.receipt {
  position: relative; background: var(--paper); padding: 16px 16px 20px; margin-top: 4px;
  font-family: var(--mono); font-size: 13px;
  /* zig-zag bottom edge like a torn receipt */
  --z: 8px;
  mask: conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) 50% / calc(2 * var(--z)) 100%;
}
.receipt .r-head { text-align: center; border-bottom: 1px dashed var(--rule-strong); padding-bottom: 8px; margin-bottom: 8px; letter-spacing: .14em; font-size: 11px; color: var(--ink-2); }
.r-line { display: grid; grid-template-columns: 1fr auto auto; gap: 10px; padding: 6px 0; align-items: center; }
.settle-btn {
  font-family: var(--mono); font-size: 10.5px; letter-spacing: .08em; text-transform: uppercase; font-weight: 600;
  border: 1.5px solid var(--gets); color: var(--gets); background: transparent; border-radius: 3px; padding: 2px 8px; cursor: pointer;
}
.settle-btn:hover { background: var(--gets); color: var(--paper); }
.settle-btn:disabled { opacity: .5; cursor: wait; }
.pay-form { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding: 8px; margin: 2px -8px; background: var(--gets-soft); border-radius: 3px; }
.pay-form .who-pays { flex: 1 1 100%; font-size: 12px; }
.pay-form input { width: 110px; padding: 4px 8px; font-family: var(--mono); font-size: 13px; }
.pay-form .hint { flex: 1 1 100%; font-size: 11px; color: var(--ink-2); }
.paid-list { margin-top: 14px; }
.paid-list .eyebrow { margin-bottom: 4px; }
.paid { display: grid; grid-template-columns: 1fr auto auto; gap: 10px; align-items: baseline; padding: 5px 0; border-bottom: 1px dashed var(--rule); font-size: 13px; }
.paid:last-child { border-bottom: 0; }
.paid .num { color: var(--gets); font-weight: 600; }
.r-line .who-pays { overflow: hidden; text-overflow: ellipsis; }
.r-line .arrow { color: var(--ink-3); padding: 0 4px; }
.r-line .r-amt { font-weight: 600; }
.r-foot { border-top: 1px dashed var(--rule-strong); margin-top: 8px; padding-top: 8px; display: flex; justify-content: space-between; color: var(--ink-2); font-size: 12px; }
.stamp {
  position: absolute; right: 14px; top: 34px; transform: rotate(-11deg);
  border: 2.5px solid var(--stamp); color: var(--stamp); padding: 2px 10px; border-radius: 4px;
  font-family: var(--serif); font-weight: 800; letter-spacing: .1em; font-size: 15px; opacity: .8;
}

/* ---------- Expenses table ---------- */
.exp { padding: 10px 0; border-bottom: 1px solid var(--rule); }
.exp:last-child { border-bottom: 0; }
.exp-top { display: flex; gap: 10px; align-items: baseline; }
.exp-top .desc { font-family: var(--serif); font-weight: 600; font-size: 17px; flex: 1; min-width: 0; overflow-wrap: anywhere; }
.exp-top .num { font-weight: 600; }
.exp-meta { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; font-size: 12px; color: var(--ink-2); margin: 3px 0 6px; }
.badge { font-family: var(--mono); font-size: 10px; letter-spacing: .08em; border: 1px solid currentColor; border-radius: 2px; padding: 0 5px; }
.badge.EQUAL { color: var(--accent); } .badge.PERCENTAGE { color: #a16207; } .badge.EXACT { color: #1d4ed8; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .badge.PERCENTAGE { color: #e5b55c; } :root:not([data-theme="light"]) .badge.EXACT { color: #8fb3ff; } }
:root[data-theme="dark"] .badge.PERCENTAGE { color: #e5b55c; } :root[data-theme="dark"] .badge.EXACT { color: #8fb3ff; }
.shares { display: flex; flex-wrap: wrap; gap: 5px; }
.share { font-family: var(--mono); font-size: 11.5px; background: var(--paper-2); border-radius: 2px; padding: 1px 6px; }
.del { margin-left: auto; border: 0; background: none; color: var(--ink-3); cursor: pointer; font-size: 12px; text-decoration: underline; text-underline-offset: 2px; }
.del:hover { color: var(--owes); }
.del:disabled { cursor: wait; text-decoration: none; }

.activity li { display: grid; grid-template-columns: 56px 1fr; gap: 10px; padding: 6px 0; border-bottom: 1px dashed var(--rule); font-size: 13px; }
.activity time { font-family: var(--mono); font-size: 11px; color: var(--ink-3); padding-top: 2px; }

/* ---------- Welcome state ---------- */
.welcome { padding: 40px 28px; text-align: left; }
.welcome h2 { font-family: var(--serif); font-size: clamp(28px, 4vw, 44px); font-weight: 800; line-height: 1.05; margin: 0 0 10px; letter-spacing: -0.02em; }
.welcome h2 em { color: var(--accent); font-weight: 400; }
.welcome ol { color: var(--ink-2); padding-left: 20px; margin: 14px 0 20px; }
.welcome li { margin-bottom: 4px; }

/* ---------- API console (shows every REST call: method, URL, status) ---------- */
.console {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 20;
  background: #12110d; color: #e9e2d0; border-top: 3px solid var(--accent);
  font-family: var(--mono); font-size: 12px; max-height: 190px; display: flex; flex-direction: column;
}
.console-head { display: flex; justify-content: space-between; align-items: center; padding: 6px 16px; border-bottom: 1px solid #2a2820; gap: 10px; }
.console-head b { letter-spacing: .14em; font-size: 11px; color: #8fd1ae; }
.console-head span { color: #857d6e; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.console-head button { background: none; border: 1px solid #3a372e; color: #bdb4a2; border-radius: 3px; padding: 1px 8px; cursor: pointer; font-size: 11px; }
.console-body { overflow-y: auto; padding: 4px 16px 8px; }
.log { display: grid; grid-template-columns: 58px 46px 1fr auto; gap: 10px; padding: 3px 0; border-bottom: 1px solid #1f1d17; align-items: baseline; cursor: pointer; }
.log .m { font-weight: 600; }
.m.GET { color: #8fb3ff; } .m.POST { color: #8fd1ae; } .m.DELETE { color: #f08a6f; }
.log .s { font-weight: 600; }
.s.ok { color: #8fd1ae; } .s.err { color: #f08a6f; }
.log .u { color: #e9e2d0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.log .t { color: #857d6e; }
.log pre { grid-column: 1 / -1; margin: 4px 0 6px; padding: 8px; background: #1b1a14; border-radius: 3px; white-space: pre-wrap; word-break: break-word; color: #cfc6b3; max-height: 160px; overflow: auto; display: none; }
.log.open pre { display: block; }

/* ---------- Toast ---------- */
.toast {
  position: fixed; right: 18px; bottom: 206px; z-index: 30; max-width: min(420px, calc(100vw - 36px));
  background: var(--ink); color: var(--paper); padding: 10px 14px; border-radius: 4px; box-shadow: var(--shadow);
  font-size: 13px; transform: translateY(16px); opacity: 0; pointer-events: none; transition: all .25s ease;
}
.toast.show { transform: none; opacity: 1; }
.toast.error { background: var(--owes); color: #fff; }
.toast b { font-family: var(--mono); margin-right: 6px; }

/* ---------- Responsive ---------- */
@media (max-width: 1080px) { .main-grid { grid-template-columns: 1fr; } }
@media (max-width: 820px) {
  .layout { grid-template-columns: 1fr; padding: 16px; }
  .masthead { padding: 20px 16px 14px; }
  .bal { grid-template-columns: 74px 1fr 1fr 86px; }
  .log { grid-template-columns: 48px 36px 1fr; } .log .t { display: none; }
}
@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
```

### client/src/main.jsx

```jsx
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Apply the saved colour theme before the first render (no flash)
try {
  const theme = localStorage.getItem('es-theme');
  if (theme) document.documentElement.dataset.theme = theme;
} catch (e) { /* storage blocked: use the system theme */ }

createRoot(document.getElementById('root')).render(<App />);
```

## 6. Postman test sequence

## Postman test sequence

Base URL: `http://localhost:8080` (start the Express server with `npm start`). For every POST with a body, set the header `Content-Type: application/json`
(Body → raw → JSON in Postman).

The ready-made collection `postman/Expense-Splitter.postman_collection.json` contains all of these
requests with automatic tests. The IDs below assume a freshly started app.

### Scenario

| Expense | Amount | Paid by | Split |
|---|---|---|---|
| Dinner | 1200 | Aman | EQUAL among all 4 → 300 each |
| Cab to airport | 1000 | Bhavya | PERCENTAGE 25 / 25 / 30 / 20 → 250 / 250 / 300 / 200 |
| Movie tickets | 1000 | Chirag | EXACT 250 / 300 / 200 / 250 |

| Person | Paid | Share owed | Net balance |
|---|---|---|---|
| Aman | 1200 | 300 + 250 + 250 = 800 | **+400** |
| Bhavya | 1000 | 300 + 250 + 300 = 850 | **+150** |
| Chirag | 1000 | 300 + 300 + 200 = 800 | **+200** |
| Diya | 0 | 300 + 200 + 250 = 750 | **−750** |

---

### 1. Create 4 users

`POST /api/users`

```json
{ "name": "Aman", "email": "aman@demo.com" }
```

Expected **201 Created**:

```json
{ "id": 1, "name": "Aman", "email": "aman@demo.com" }
```

Repeat for `Bhavya` (id 2), `Chirag` (id 3) and `Diya` (id 4).

### 2. Create a group

`POST /api/groups`

```json
{ "name": "Goa Trip" }
```

Expected **201 Created**:

```json
{ "id": 1, "name": "Goa Trip", "members": [] }
```

### 3. Add members

`POST /api/groups/1/members/1`, then `/members/2`, `/members/3` and `/members/4` (no body).

Expected **200 OK** after the last one:

```json
{
  "id": 1,
  "name": "Goa Trip",
  "members": [
    { "id": 1, "name": "Aman", "email": "aman@demo.com" },
    { "id": 2, "name": "Bhavya", "email": "bhavya@demo.com" },
    { "id": 3, "name": "Chirag", "email": "chirag@demo.com" },
    { "id": 4, "name": "Diya", "email": "diya@demo.com" }
  ]
}
```

(Members are listed in the order they were added.)

### 4. Expense 1: EQUAL

`POST /api/groups/1/expenses`

```json
{
  "description": "Dinner",
  "amount": 1200,
  "paidBy": 1,
  "splitType": "EQUAL",
  "splits": [ { "userId": 1 }, { "userId": 2 }, { "userId": 3 }, { "userId": 4 } ]
}
```

Expected **201 Created**:

```json
{
  "id": 1,
  "description": "Dinner",
  "amount": 1200,
  "splitType": "EQUAL",
  "createdAt": "2026-10-28T12:26:41.392",
  "paidBy": { "id": 1, "name": "Aman", "email": "aman@demo.com" },
  "shares": [
    { "id": 1, "user": { "id": 1, "name": "Aman", "email": "aman@demo.com" }, "shareAmount": 300 },
    { "id": 2, "user": { "id": 2, "name": "Bhavya", "email": "bhavya@demo.com" }, "shareAmount": 300 },
    { "id": 3, "user": { "id": 3, "name": "Chirag", "email": "chirag@demo.com" }, "shareAmount": 300 },
    { "id": 4, "user": { "id": 4, "name": "Diya", "email": "diya@demo.com" }, "shareAmount": 300 }
  ],
  "groupId": 1
}
```

The server terminal also prints: `[NOTIFICATION] Aman added expense Dinner (Rs 1200.00)`

### 5. Expense 2: PERCENTAGE

```json
{
  "description": "Cab to airport",
  "amount": 1000,
  "paidBy": 2,
  "splitType": "PERCENTAGE",
  "splits": [
    { "userId": 1, "value": 25 },
    { "userId": 2, "value": 25 },
    { "userId": 3, "value": 30 },
    { "userId": 4, "value": 20 }
  ]
}
```

Expected **201 Created**, with shares of 250, 250, 300 and 200.

### 6. Expense 3: EXACT

```json
{
  "description": "Movie tickets",
  "amount": 1000,
  "paidBy": 3,
  "splitType": "EXACT",
  "splits": [
    { "userId": 1, "value": 250 },
    { "userId": 2, "value": 300 },
    { "userId": 3, "value": 200 },
    { "userId": 4, "value": 250 }
  ]
}
```

Expected **201 Created**, with shares of 250, 300, 200 and 250.

### 7. Balances

`GET /api/groups/1/balances` → **200 OK**

```json
[
  { "userId": 1, "name": "Aman",   "balance": 400,    "status": "gets back Rs 400.00" },
  { "userId": 3, "name": "Chirag", "balance": 200,    "status": "gets back Rs 200.00" },
  { "userId": 2, "name": "Bhavya", "balance": 150,    "status": "gets back Rs 150.00" },
  { "userId": 4, "name": "Diya",   "balance": -750,   "status": "owes Rs 750.00" }
]
```

### 8. Settlements

`GET /api/groups/1/settlements` → **200 OK**

```json
[
  { "fromUserId": 4, "fromUser": "Diya", "toUserId": 1, "toUser": "Aman",   "amount": 400, "message": "Diya pays Aman Rs 400.00" },
  { "fromUserId": 4, "fromUser": "Diya", "toUserId": 3, "toUser": "Chirag", "amount": 200, "message": "Diya pays Chirag Rs 200.00" },
  { "fromUserId": 4, "fromUser": "Diya", "toUserId": 2, "toUser": "Bhavya", "amount": 150, "message": "Diya pays Bhavya Rs 150.00" }
]
```

Three payments for four people, which is the minimum (n − 1).

### 9. Filter expenses by user

`GET /api/groups/1/expenses?userId=2` → **200 OK**, listing only the expenses Bhavya paid for or has a share in.

### 10. Error cases

| Request | Expected |
|---|---|
| Percentages adding up to 90 | **400** `"Percentages must add up to 100, but got 90"` |
| EXACT amounts not matching the total | **400** `"Exact amounts add up to Rs 100.00 but the expense is Rs 500.00"` |
| `"splitType": "RANDOM"` | **400** `"Unknown split type 'RANDOM'. Use one of [EQUAL, EXACT, PERCENTAGE]"` |
| Same email twice | **400** `"Email already registered: aman@demo.com"` |
| `GET /api/groups/99/balances` | **404** `"Group not found with id 99"` |
| `POST /api/groups/1/members/42` | **404** `"User not found with id 42"` |
| `GET /api/expenses/1` (wrong method) | **405** `"GET is not supported here. Allowed: [DELETE]"` |
| `GET /api/groups/abc/balances` | **400** `"Invalid value 'abc' for groupId"` |
| Broken JSON body | **400** `"Request body is missing or is not valid JSON"` |

Error body format:

```json
{ "timestamp": "2026-10-28T12:26:41.392", "status": 400, "error": "Bad Request", "message": "Percentages must add up to 100, but got 90" }
```

After a 400 on an expense, call `GET /api/groups/1/expenses`: no half-saved expense appears, because `transactional()` rolled it back.

### 11. Delete

`DELETE /api/expenses/3` → **204 No Content** (its shares are deleted too).
Run it again → **404** `"Expense not found with id 3"`.

Settlements are now recalculated:
`Chirag pays Aman Rs 600.00`, `Diya pays Bhavya Rs 450.00`, `Diya pays Aman Rs 50.00`.

### 12. Settle up (record payments)

`POST /api/groups/1/payments`

```json
{ "fromUserId": 3, "toUserId": 1, "amount": 600 }
```

| Request | Expected |
|---|---|
| Chirag pays Aman Rs 600 | **201**, and the payment JSON is returned |
| Diya pays Bhavya Rs 1000 (more than she owes) | **400** `"Diya only owes Rs 500.00"` |
| `GET /api/groups/1/settlements` | **200** `Diya pays Bhavya Rs 450.00`, `Diya pays Aman Rs 50.00` |
| `DELETE /api/payments/{id}` | **204**; a second call gives **404** |

### 13. Delete users and groups

| Request | Expected |
|---|---|
| `DELETE /api/users/1` while Aman is still in expenses | **409 Conflict** `"Aman is still part of expenses or payments. Delete those (or the whole group) first."` |
| `DELETE /api/groups/1` | **204** (its expenses, shares, member links and activity log are deleted too) |
| `GET /api/groups/1` | **404** `"Group not found with id 1"` |
| `DELETE /api/users/1` (now that the group is gone) | **204** |
| `DELETE /api/users/1` again | **404** `"User not found with id 1"` |

### Running everything from the command line

```bash
npm start                                                     # terminal 1
npx newman run postman/Expense-Splitter.postman_collection.json   # terminal 2
```

Expected summary: **41 requests, 59 assertions, 0 failed**.

## 7. README

## Expense Splitter (Splitwise-style) — React + Node.js/Express

**Full Stack Development (FSD) project** · B.Tech IT, Semester 5

A full-stack web app for sharing group expenses, like Splitwise. You create users, put them in groups,
record who paid for what and how it should be split, and the app works out who owes whom and the
**fewest payments** needed to settle up. The frontend is a **React** single-page app and the backend is a
**Node.js + Express** REST API. A Postman collection is included for API demos.

### Features

| Feature | How it is built |
|---|---|
| Users and groups (many-to-many) | `Group.members` and `User.groups` sets kept in sync by `group.addMember(user)` |
| Expenses with 3 split types | **Strategy pattern**: `EqualSplitStrategy`, `PercentageSplitStrategy`, `ExactSplitStrategy` kept in a `Map` and chosen at runtime from the request body |
| Net balance per member | Array methods: `reduce` into a `Map`, `flatMap` over the shares |
| Settlement | Greedy algorithm with two binary-heap `PriorityQueue`s (creditors and debtors): at most n − 1 payments, usually the minimum |
| Settle up | "Settle" button records a payment (full or partial); balances and suggestions update; payments can be undone |
| Activity log and notifications | **Observer pattern**: `AuditLogger` saves to the store, `NotificationService` prints to the console |
| App settings (currency, rounding) | **Singleton pattern**: `ConfigService.getInstance()` |
| All-or-nothing save | `transactional()` keeps an undo log: an invalid split rolls back the expense too |
| Clean errors | One Express error middleware → `{timestamp, status, error, message}`; also 405 for wrong methods and 400 for bad ids / bad JSON |
| Money rounding | Half-up rounding to 2 decimals on the decimal text (so 1.005 → 1.01); paisa left over from rounding goes to one participant so shares always add up exactly |
| React UI | Live split meter, diverging balance bars, settlement slip, light/dark theme and an **API console** that shows every REST call |

### Tech stack

**Frontend:** React 18 · Vite 5 · plain CSS
**Backend:** Node.js (18+) · Express 4 · ES modules · in-memory repositories (data resets when the server restarts)
**Testing:** `node:test` (built-in) · Postman / Newman
**Deployment:** GitHub · Vercel

### How to run

You only need **Node.js 18 or newer**.

```bash
npm run setup     # installs server and client dependencies
npm run build     # builds the React app into client/dist
npm start         # starts Express on http://localhost:8080 (API + React app)
```

Open **http://localhost:8080** and click **Load demo data**.

For development with hot reload (React on :5173, API on :8080):

```bash
npm install       # once, installs "concurrently" at the root
npm run dev
```

Run the automated tests: `npm test`

#### Using Postman

1. In Postman click **Import** and choose `postman/Expense-Splitter.postman_collection.json`.
2. Start the server (`npm start`).
3. Run the folders in order (1 → 8), or click the collection → **Run** to run everything (41 requests, 59 checks).
   Folder 8 deletes everything the run created, so you can run it again and again.

From the command line: `npx newman run postman/Expense-Splitter.postman_collection.json`

#### Deploying on Vercel

The repo is ready for Vercel: `vercel.json` builds the React app into `client/dist` and sends every
`/api/*` request to `api/index.js`, which exports the same Express app.

1. Go to [vercel.com/new](https://vercel.com/new) and import this GitHub repository (no settings to change), **or**
2. run `npx vercel` in the project folder and then `npx vercel --prod`.

> **Note:** on Vercel the API runs as a serverless function and keeps data in memory, so the online
> demo can reset after a period of inactivity. Click **Load demo data** to fill it again.

### API

| Method | Endpoint | Purpose | Success | Errors |
|---|---|---|---|---|
| POST | `/api/users` | Create a user `{name, email}` | 201 | 400 |
| GET | `/api/users`, `/api/users/{userId}` | List users / get one | 200 | 404 |
| DELETE | `/api/users/{userId}` | Delete a user (refused while they are part of expenses) | 204 | 404, 409 |
| POST | `/api/groups` | Create a group `{name}` | 201 | 400 |
| GET | `/api/groups`, `/api/groups/{id}` | List groups / get one | 200 | 404 |
| DELETE | `/api/groups/{groupId}` | Delete a group with its expenses and activity log | 204 | 404 |
| POST | `/api/groups/{groupId}/members/{userId}` | Add a member | 200 | 400, 404 |
| POST | `/api/groups/{groupId}/expenses` | Add an expense | 201 | 400, 404 |
| GET | `/api/groups/{groupId}/expenses?userId=` | List expenses (optional filter by user) | 200 | 404 |
| DELETE | `/api/expenses/{expenseId}` | Delete an expense | 204 | 404 |
| GET | `/api/groups/{groupId}/balances` | Net balance of each member | 200 | 404 |
| GET | `/api/groups/{groupId}/settlements` | Minimum payments to settle | 200 | 404 |
| POST | `/api/groups/{groupId}/payments` | Record a settle-up payment `{fromUserId, toUserId, amount}` (can be partial) | 201 | 400, 404 |
| GET | `/api/groups/{groupId}/payments` | List recorded payments | 200 | 404 |
| DELETE | `/api/payments/{paymentId}` | Undo a payment | 204 | 404 |
| GET | `/api/groups/{groupId}/activity` | Activity log (from the observer) | 200 | 404 |

Example expense body:

```json
{
  "description": "Cab to airport",
  "amount": 1000,
  "paidBy": 2,
  "splitType": "PERCENTAGE",
  "splits": [
    { "userId": 1, "value": 25 },
    { "userId": 2, "value": 25 },
    { "userId": 3, "value": 30 },
    { "userId": 4, "value": 20 }
  ]
}
```

For `EQUAL`, leave out `value`. For `EXACT`, `value` is the amount in rupees.

### Project structure

```
expense-splitter/
├── package.json          root scripts: setup, build, start, dev, test
├── vercel.json           Vercel build + /api rewrite
├── api/index.js          Vercel entry point (exports the Express app)
├── server/               Node.js + Express backend
│   ├── src/
│   │   ├── index.js          starts the server (PORT, default 8080)
│   │   ├── app.js            Express app: JSON, routers, errors, serves client/dist
│   │   ├── config/           ConfigService (Singleton)
│   │   ├── controller/       User, Group, Expense, Payment routers + id parsing
│   │   ├── dto/              request parsers (ExpenseRequest, PaymentRequest)
│   │   ├── entity/           User, Group, Expense, ExpenseShare, Payment, ActivityLog
│   │   ├── exception/        custom errors + GlobalExceptionHandler middleware
│   │   ├── observer/         ExpenseListener, ExpenseEventPublisher, AuditLogger, NotificationService
│   │   ├── repository/       Repository (in-memory table + transactional()) and the 6 repositories
│   │   ├── service/          User, Group, Expense, Balance, Payment services + PriorityQueue
│   │   └── strategy/         SplitStrategy + Equal / Percentage / Exact
│   └── test/app.test.js  node:test unit + HTTP tests
├── client/               React frontend (Vite)
│   ├── index.html
│   └── src/
│       ├── main.jsx, App.jsx, api.js, format.js, index.css
│       └── components/   Sidebar (People, Groups), ExpenseForm, GroupPanel, ApiConsole
├── postman/              Postman collection (41 requests, 59 checks)
└── docs/                 project report (DOCX + PDF), lab record, Postman guide, viva cheat-sheet
```
