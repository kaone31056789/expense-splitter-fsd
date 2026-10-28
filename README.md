# Expense Splitter (Splitwise-style) — React + Node.js/Express

**Full Stack Development (FSD) project** · B.Tech IT, Semester 5

**Live demo:** https://expense-splitter-fsd.vercel.app (click **Load demo data**)

A full-stack web app for sharing group expenses, like Splitwise. You create users, put them in groups,
record who paid for what and how it should be split, and the app works out who owes whom and the
**fewest payments** needed to settle up. The frontend is a **React** single-page app and the backend is a
**Node.js + Express** REST API. A Postman collection is included for API demos.

## Features

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

## Tech stack

**Frontend:** React 18 · Vite 5 · plain CSS
**Backend:** Node.js (18+) · Express 4 · ES modules · in-memory repositories (data resets when the server restarts)
**Testing:** `node:test` (built-in) · Postman / Newman
**Deployment:** GitHub · Vercel

## How to run

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

### Using Postman

1. In Postman click **Import** and choose `postman/Expense-Splitter.postman_collection.json`.
2. Start the server (`npm start`).
3. Run the folders in order (1 → 8), or click the collection → **Run** to run everything (41 requests, 59 checks).
   Folder 8 deletes everything the run created, so you can run it again and again.

From the command line: `npx newman run postman/Expense-Splitter.postman_collection.json`

### Deploying on Vercel

The app is deployed at **https://expense-splitter-fsd.vercel.app** and the Vercel project is connected
to this GitHub repository, so every push to `main` redeploys it automatically.

`vercel.json` builds the React app into `client/dist` and sends every `/api/*` request to
`api/index.js`, which exports the same Express app. To deploy your own copy, import the repository
at [vercel.com/new](https://vercel.com/new) (no settings to change), or run `npx vercel --prod`.

Run the Postman collection against the live site:
`npx newman run postman/Expense-Splitter.postman_collection.json --env-var baseUrl=https://expense-splitter-fsd.vercel.app`

> **Database:** on Vercel the API runs as several serverless instances, so data is kept in an
> **Upstash Redis** database (connected through the Vercel Marketplace). When the `KV_REST_API_URL` and
> `KV_REST_API_TOKEN` environment variables are set, every request loads the latest data and every change
> is saved before the response is sent (`server/src/repository/database.js`). Without them (for example
> locally), the app keeps data in memory. The header badge shows which one is in use (`GET /api/health`).

## API

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

## Project structure

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
