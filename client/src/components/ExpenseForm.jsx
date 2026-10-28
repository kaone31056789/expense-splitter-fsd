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
