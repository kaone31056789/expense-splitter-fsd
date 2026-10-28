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
