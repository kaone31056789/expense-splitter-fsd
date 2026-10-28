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
