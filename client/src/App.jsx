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
