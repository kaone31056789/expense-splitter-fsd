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
