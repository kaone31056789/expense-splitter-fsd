# Postman test sequence

Base URL: `http://localhost:8080` (start the Express server with `npm start`). For every POST with a body, set the header `Content-Type: application/json`
(Body → raw → JSON in Postman).

The ready-made collection `postman/Expense-Splitter.postman_collection.json` contains all of these
requests with automatic tests. The IDs below assume a freshly started app.

## Scenario

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

## 1. Create 4 users

`POST /api/users`

```json
{ "name": "Aman", "email": "aman@demo.com" }
```

Expected **201 Created**:

```json
{ "id": 1, "name": "Aman", "email": "aman@demo.com" }
```

Repeat for `Bhavya` (id 2), `Chirag` (id 3) and `Diya` (id 4).

## 2. Create a group

`POST /api/groups`

```json
{ "name": "Goa Trip" }
```

Expected **201 Created**:

```json
{ "id": 1, "name": "Goa Trip", "members": [] }
```

## 3. Add members

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

## 4. Expense 1: EQUAL

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

## 5. Expense 2: PERCENTAGE

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

## 6. Expense 3: EXACT

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

## 7. Balances

`GET /api/groups/1/balances` → **200 OK**

```json
[
  { "userId": 1, "name": "Aman",   "balance": 400,    "status": "gets back Rs 400.00" },
  { "userId": 3, "name": "Chirag", "balance": 200,    "status": "gets back Rs 200.00" },
  { "userId": 2, "name": "Bhavya", "balance": 150,    "status": "gets back Rs 150.00" },
  { "userId": 4, "name": "Diya",   "balance": -750,   "status": "owes Rs 750.00" }
]
```

## 8. Settlements

`GET /api/groups/1/settlements` → **200 OK**

```json
[
  { "fromUserId": 4, "fromUser": "Diya", "toUserId": 1, "toUser": "Aman",   "amount": 400, "message": "Diya pays Aman Rs 400.00" },
  { "fromUserId": 4, "fromUser": "Diya", "toUserId": 3, "toUser": "Chirag", "amount": 200, "message": "Diya pays Chirag Rs 200.00" },
  { "fromUserId": 4, "fromUser": "Diya", "toUserId": 2, "toUser": "Bhavya", "amount": 150, "message": "Diya pays Bhavya Rs 150.00" }
]
```

Three payments for four people, which is the minimum (n − 1).

## 9. Filter expenses by user

`GET /api/groups/1/expenses?userId=2` → **200 OK**, listing only the expenses Bhavya paid for or has a share in.

## 10. Error cases

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

## 11. Delete

`DELETE /api/expenses/3` → **204 No Content** (its shares are deleted too).
Run it again → **404** `"Expense not found with id 3"`.

Settlements are now recalculated:
`Chirag pays Aman Rs 600.00`, `Diya pays Bhavya Rs 450.00`, `Diya pays Aman Rs 50.00`.

## 12. Settle up (record payments)

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

## 13. Delete users and groups

| Request | Expected |
|---|---|
| `DELETE /api/users/1` while Aman is still in expenses | **409 Conflict** `"Aman is still part of expenses or payments. Delete those (or the whole group) first."` |
| `DELETE /api/groups/1` | **204** (its expenses, shares, member links and activity log are deleted too) |
| `GET /api/groups/1` | **404** `"Group not found with id 1"` |
| `DELETE /api/users/1` (now that the group is gone) | **204** |
| `DELETE /api/users/1` again | **404** `"User not found with id 1"` |

## Running everything from the command line

```bash
npm start                                                     # terminal 1
npx newman run postman/Expense-Splitter.postman_collection.json   # terminal 2
```

Expected summary: **41 requests, 59 assertions, 0 failed**.
