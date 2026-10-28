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
