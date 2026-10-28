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
