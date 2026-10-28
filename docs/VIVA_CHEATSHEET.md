# Viva Cheat-Sheet (plain English)

Read this top to bottom once. Each answer has three parts:
- **In simple words**: what it means.
- **Say this**: the short answer to give the examiner.
- **Show**: the file to open if they ask to see it.

---

## 0. Your project in one breath

> "Our project is an **Expense Splitter**, like the Splitwise app. Friends add the bills they paid, choose how to split each bill (equally, by percentage, or exact amounts), and the app tells everyone **who owes whom** and the **fewest payments** needed to settle. People can then mark payments as done. It is a **full-stack JavaScript** app: the frontend is **React**, the backend is a **REST API in Node.js with Express**, we tested it with **node:test** and **Postman**, the code is on **GitHub** and it is deployed on **Vercel**."

### 2-minute demo script
1. Run `npm run build` and `npm start`, then open **http://localhost:8080**, or open the live site **https://expense-splitter-fsd.vercel.app**.
2. Click **Load demo data**: 4 friends, 1 group (Goa Trip), 3 bills.
3. Point at **Balances**: "Green means they get money back, red means they owe."
4. Point at **Settle up**: "Only 3 payments are needed. Diya pays Aman 400, Chirag 200, Bhavya 150."
5. Click **Settle** on one line and type a smaller amount: "The remaining amount updates."
6. Add a bad expense (percentages adding up to 90) and press Save: "The server rejects it with error **400**, and nothing is saved."
7. Point at the black **API console** at the bottom: "Every click is a real REST call from React to Express. Here are the method, the URL and the status code."
8. Optionally run `npm test` (6 tests pass) or the Postman collection: **41 requests, 59 checks, all pass**.

---

## 1. Basic words (learn these first)

**What is full-stack development?**
- In simple words: building both halves of a web app — the **frontend** (what the user sees in the browser) and the **backend** (the server that stores data and applies the rules).
- Say this: "Our frontend is React, our backend is Node.js with Express, and they talk over a REST API with JSON."

**What is React?**
- In simple words: a JavaScript library for building the screen out of small reusable pieces called **components**. When the data (state) changes, React redraws only what changed.
- Say this: "React is a component-based UI library. We use function components and hooks like `useState` and `useEffect`."
- Show: `client/src/App.jsx`, `client/src/components/`

**What is Node.js? What is Express?**
- In simple words: Node.js lets JavaScript run on the server (outside the browser). Express is a small framework on top of Node that makes it easy to define URLs (routes) and send JSON.
- Say this: "Node.js is a JavaScript runtime built on Chrome's V8 engine. Express gives us routing, JSON parsing and middleware."
- Show: `server/src/app.js`

**What is a REST API?**
- In simple words: a set of web addresses (URLs) the frontend calls to get or change data, like a waiter taking orders. `POST` means create, `GET` means read, `DELETE` means remove.
- Say this: "Our backend exposes URLs like `POST /api/users` and `GET /api/groups/1/balances`. They send and receive JSON."

**What is JSON?**
- In simple words: plain text for sending data, for example `{"name": "Aman", "email": "aman@demo.com"}`.

**What do the HTTP status codes mean?**
| Code | Meaning | When we use it |
|---|---|---|
| 200 | OK | Reading data, adding a member |
| 201 | Created | A new user, group, expense or payment was made |
| 204 | No Content | Deleted successfully (nothing to send back) |
| 400 | Bad Request | Your input is wrong (for example, percentages not adding up to 100) |
| 404 | Not Found | That id does not exist |
| 405 | Method Not Allowed | Right URL, wrong method |
| 409 | Conflict | You can't delete a user who still has expenses |

---

## 2. Frontend (React) questions

**What are components, props and state?**
- **Component:** a function that returns what to show, e.g. `ExpenseForm`, `GroupPanel`.
- **Props:** inputs passed from a parent component, e.g. `<ExpenseForm members={members} onSave={...} />`.
- **State:** data a component remembers between renders, created with `useState`. Changing it re-renders the component.
- Show: `client/src/components/ExpenseForm.jsx`

**Which hooks do you use?**
- `useState` for state (users, groups, form fields), `useEffect` to load data when the page opens, `useRef` to keep values without re-rendering (latest selection, timers), `useCallback` to keep functions stable.

**How does React talk to the backend?**
- Through `api()` in `client/src/api.js`, which uses the browser's `fetch()`. It sends JSON, reads the reply, logs the call in the API console and throws an error with the server's message if the status is not 2xx.

**What is Vite? Why the proxy?**
- Vite is the build tool: in development it runs React on port 5173 with hot reload; `npm run build` makes optimised files in `client/dist`.
- The proxy in `vite.config.js` forwards `/api` calls from port 5173 to Express on 8080, so the browser sees one origin and we need no CORS setup. In production Express (or Vercel) serves the built files.

**What is the live split meter?**
- The form calculates the split in the browser while you type (each person's share, or how many % / rupees are left). The server still validates everything — the browser check is only for convenience.

---

## 3. Backend (Node.js / Express) questions

**What are routes, middleware and routers?**
- **Route:** a method + URL + handler, e.g. `router.route('/users').post(...)`.
- **Middleware:** a function that runs on the way to the route, e.g. `express.json()` parses the JSON body. An error middleware (4 arguments) catches errors from every route.
- **Router:** a mini app holding related routes. We have one per controller (User, Group, Expense, Payment).
- Show: `server/src/controller/UserController.js`

**What are the three layers?**
- **Controller** (router) reads the request and sends the response.
- **Service** holds the business rules (validation, splitting, balances).
- **Repository** stores and finds data.
- Why: each part has one job, and the services can be tested without HTTP.

**Where is the data stored?**
- In memory, in one `Repository` per entity (User, Group, Expense, ExpenseShare, Payment, ActivityLog). Each repository is a `Map` from id to object, with ids 1, 2, 3 … like a database IDENTITY column. Data is lost when the server restarts — fine for a lab demo.
- Say this: "The repositories hide the storage, so we could switch to MongoDB or PostgreSQL by changing only the repository layer."
- Show: `server/src/repository/Repository.js`

**What are the relationships?**
- **User ↔ Group is many-to-many:** `group.members` and `user.groups` are Sets, kept in sync by `group.addMember(user)`.
- **Expense → User is many-to-one:** `expense.paidBy`.
- **Expense → ExpenseShare is one-to-many:** one bill has one share per person. Saving or deleting an expense also saves or deletes its shares (like cascade).

**Why does the JSON not loop forever (user → groups → members → user …)?**
- Each entity has a `toJSON()` method that leaves out back-references (`User.groups`, `ExpenseShare.expense`) and shows `groupId` instead of the whole group.

**What does `transactional()` do?**
- In simple words: **all or nothing**. Saving an expense means saving the expense, its shares and a log line. If any part fails, everything is undone (rolled back), so there is never a half-saved bill.
- How: while the function runs, every `save` and `delete` writes an "undo" step into a list. If an error is thrown, the undo steps run in reverse.
- Proof: we save the expense first, then check the split. If the split is wrong, the expense disappears again — and its id is skipped, just like in a real database.
- Show: `server/src/repository/Repository.js` and `service/ExpenseService.js`, `addExpense()`

**How are errors handled?**
- Services throw our own error classes (`UserNotFoundException`, `InvalidSplitException`, `UserInUseException`, …), each carrying its HTTP status. One error middleware turns them into `{"timestamp", "status", "error", "message"}`.
- Extra: wrong method → 405 (`.all()` at the end of each route), id like `abc` → 400 (`router.param`), broken JSON → 400, unknown URL → 404.
- Show: `server/src/exception/GlobalExceptionHandler.js`

---

## 4. The money logic (most likely questions)

**How do you split a bill?**
- **EQUAL:** total ÷ number of people. Rs 1200 among 4 is Rs 300 each.
- **PERCENTAGE:** each person pays their percent. The percents must add up to 100.
- **EXACT:** each person's amount is typed in. The amounts must add up to the total.

**What happens with Rs 1000 split among 3?**
- Each share is 333.33, which totals 999.99. The leftover 1 paisa goes to the first person (333.34), so the shares always add up exactly to 1000.

**How do you round money correctly in JavaScript?**
- In simple words: computers store decimals like 0.1 slightly wrong (0.1 + 0.2 = 0.30000000000000004), so `Math.round(1.005 * 100)` gives 100, not 101. We round the **decimal text** instead: `Number("1.005e2")` is exactly 100.5, which rounds half-up to 101 → 1.01.
- Show: `server/src/config/ConfigService.js`, method `round()`

**How is the balance calculated?**
- In simple words: **balance = what you paid − your share of the bills (+ settle-up payments you made − payments you received)**.
- Positive means you get money back. Negative means you owe. Everyone's balances always add up to 0.
- Example: Aman paid 1200 and his shares total 800, so his balance is **+400**.
- Say this: "We use `reduce` to add up amounts per person into a `Map`, and `flatMap` to get all shares of all expenses."
- Show: `server/src/service/BalanceService.js`, `getBalances()`

**How does the settlement (Settle up) work?**
- In simple words: make two lines, one of people who are owed money and one of people who owe money, each sorted from biggest to smallest. The biggest debtor pays the biggest creditor as much as possible. Whoever still has an amount left goes back in line. Repeat until nobody owes anything.
- Say this: "It is a **greedy algorithm** with two **priority queues** used as max-heaps. Each step clears at least one person, so we need at most **n − 1 payments**."
- Show: `service/BalanceService.js` (`getSettlements()`) and `service/PriorityQueue.js` (the binary heap)

**Is it always the minimum number of payments?**
- Honest answer: **almost always, but not always**. Finding the true minimum is a very hard problem (NP-hard). We tested random groups: greedy was optimal in 100% of 4-person groups, about 91% of 6-person groups and 76% of 8-person groups, and was never more than 2 payments over. It never needs more than n − 1.

**What does the Settle button do?**
- It records a payment, for example "Diya paid Aman Rs 250" (`POST /api/groups/{id}/payments`). The payment counts in the balances, so the remaining amount drops. You can't pay more than you owe (that gives a 400 error), and you can **undo** a payment (`DELETE /api/payments/{id}`).

---

## 5. Design patterns (very likely questions)

**What is a design pattern?**
- A well-known, reusable solution to a common coding problem, like a recipe.

**Strategy pattern: where and why?**
- In simple words: there are many ways to do one job, and you pick one while the program runs. Like Google Maps, where you choose car, bike or walking for the same trip.
- In our project there are three ways to split a bill: `EqualSplitStrategy`, `PercentageSplitStrategy` and `ExactSplitStrategy`, all extending `SplitStrategy`. They sit in a `Map`, and we pick one using the `splitType` sent in the request.
- Why: to add a new split type, we add one new class and one map entry. There is no long if-else chain.
- Show: `server/src/strategy/` and `service/ExpenseService.js`

**Observer pattern: where and why?**
- In simple words: when something happens, everyone who subscribed gets told automatically, like YouTube subscribers getting a notification when a new video is uploaded.
- In our project, when an expense is added, `ExpenseEventPublisher` tells two listeners: `AuditLogger`, which saves a line in the activity log, and `NotificationService`, which prints a message in the console.
- Why: the expense code doesn't need to know who is listening. We can add an email notifier later with one `subscribe()` call.
- Show: `server/src/observer/`

**Singleton pattern: where and why?**
- In simple words: only one object of a class can ever exist, like a school having one principal.
- In our project, `ConfigService` holds the currency ("Rs") and rounding rules. Its constructor needs a secret `Symbol` token that only the class has, so `new ConfigService()` from outside throws, and everyone calls `ConfigService.getInstance()`.
- Show: `server/src/config/ConfigService.js`

**Strategy vs Observer: what's the difference?**
- **Strategy** means choosing one method out of many (how to do something).
- **Observer** means telling many listeners about one event (who should be told).

---

## 6. JavaScript questions

**What is an arrow function?**
- A short function, for example `(u) => u.id` or `(a, b) => b.amount - a.amount`.

**Which array methods do you use?**
- `map` (change each item), `filter` (keep some items), `reduce` (combine into one value, e.g. totals), `some` (is any item true?), `find`, `flatMap` (map then flatten), `sort`.

**What are ES modules?**
- Each file is a module; we share code with `export` and `import`. Both `package.json` files have `"type": "module"`.

**What are `#private` fields?**
- Fields starting with `#` (like `#rows` in `Repository`) cannot be read from outside the class — real privacy in modern JavaScript.

**Which collections do you use?**
- `Map` for totals per person and the repositories, `Set` for group members and to catch duplicate participants, arrays for lists, and our own `PriorityQueue` (binary heap) for the settlement.

---

## 7. Testing and deployment questions

**How did you test the project?**
- **node:test:** `npm test` runs 6 tests: the full scenario in code (balances, settlements, rollback, payments), the rounding rule, and HTTP tests that start the Express app and check status codes and error bodies.
- **Postman / Newman:** 41 requests with 59 automatic checks covering success cases, error cases (400, 404, 405, 409), payments and deletes. All pass.
- **Browser:** we used every screen of the React app by hand, in both themes.

**Why does Postman need the server running?**
- Postman is only a client. It sends requests to `localhost:8080`, so the Express server must be running.

**How is it deployed?**
- The code is on **GitHub**. **Vercel** builds the React app (`client/dist`) and serves it from its CDN, and runs the Express app as a **serverless function** for every `/api/*` request (`api/index.js`, `vercel.json`).
- Limitation to mention honestly: the serverless function keeps data in memory, so the online demo can reset after it has been idle. A real database is the next step.

---

## 8. "Show me where..." quick table

| They ask about | Open this file |
|---|---|
| React components / hooks | `client/src/App.jsx`, `client/src/components/ExpenseForm.jsx` |
| Calling the API from React | `client/src/api.js` |
| Express setup / middleware | `server/src/app.js` |
| REST endpoints | `server/src/controller/` |
| Strategy pattern | `server/src/strategy/`, `service/ExpenseService.js` |
| Observer pattern | `server/src/observer/ExpenseEventPublisher.js`, `AuditLogger.js` |
| Singleton | `server/src/config/ConfigService.js` |
| Transaction and rollback | `server/src/repository/Repository.js` (`transactional()`), `ExpenseService.addExpense()` |
| Balances (reduce) | `server/src/service/BalanceService.js`, `getBalances()` |
| Priority queue / settlement | `service/PriorityQueue.js`, `BalanceService.getSettlements()` |
| Error handling | `server/src/exception/GlobalExceptionHandler.js` |
| Relationships | `server/src/entity/Group.js`, `entity/Expense.js` |
| Tests | `server/test/app.test.js`, `postman/` |
| Deployment | `vercel.json`, `api/index.js` |
