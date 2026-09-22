import { readFileSync } from 'node:fs';
import { Script, createContext } from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

const sourcePath = new URL('../src/scripts/visitor-tracker.js', import.meta.url);
const tracker = new Script(readFileSync(sourcePath, 'utf8'), { filename: sourcePath.pathname });
const storageKey = 'cj-site-visitor-collected';
const endpoint = 'https://analytics.example.invalid';

function response(payload = { collected: true }, ok = true) {
  return { ok, json: async () => payload };
}

function makeStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  const writes = [];
  return {
    values,
    writes,
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { writes.push([key, value]); values.set(key, String(value)); }
  };
}

function makePage({ apiBase = endpoint, storage = makeStorage(), fetchImpl = async () => response(), storageGetterThrows = false } = {}) {
  const calls = [];
  const fetch = (...args) => { calls.push(args); return fetchImpl(...args); };
  // Intentionally provide no scroll/visibility/lifecycle callbacks, timers, or
  // event registration API: entry collection must work without any of them.
  const document = { currentScript: { dataset: { apiBase } } };
  const window = { document, fetch };
  Object.defineProperty(window, 'sessionStorage', {
    get() { if (storageGetterThrows) throw new Error('Storage blocked'); return storage; }
  });
  const sandbox = { window, document, fetch, console };
  Object.defineProperty(sandbox, 'sessionStorage', {
    get() { if (storageGetterThrows) throw new Error('Storage blocked'); return storage; }
  });
  const context = createContext(sandbox);
  return {
    calls, storage, window,
    run() { tracker.runInContext(context); },
    async settle() {
      const pending = window.__cjVisitorCollection;
      assert.equal(typeof pending?.then, 'function', 'the document keeps its collection Promise');
      await pending;
    }
  };
}

test('entry immediately sends a payload-free keepalive POST without scroll, timers, or lifecycle hooks', async () => {
  const page = makePage({ apiBase: `${endpoint}/` });
  page.run();
  assert.equal(page.calls.length, 1, 'request starts during script initialization');
  const [url, init] = page.calls[0];
  assert.equal(url, `${endpoint}/collect`);
  assert.equal(init.method, 'POST');
  assert.equal(init.mode, 'cors');
  assert.equal(init.keepalive, true);
  assert.equal(init.credentials, 'omit');
  assert.equal(Object.hasOwn(init, 'body'), false);
  await page.settle();
  assert.deepEqual(page.storage.writes, [[storageKey, '1']]);
});

test('reinitializing while a request is pending reuses the same Promise and sends once', async () => {
  let finish;
  const pending = new Promise(resolve => { finish = resolve; });
  const page = makePage({ fetchImpl: () => pending });
  page.run();
  const firstPromise = page.window.__cjVisitorCollection;
  page.run();
  assert.equal(page.calls.length, 1);
  assert.equal(page.window.__cjVisitorCollection, firstPromise);
  assert.equal(page.storage.writes.length, 0);
  finish(response());
  await page.settle();
  page.run();
  assert.equal(page.calls.length, 1, 'completed initialization is also deduplicated');
  assert.equal(page.window.__cjVisitorCollection, firstPromise);
});

test('a previously successful session does not send a new request', async () => {
  const page = makePage({ storage: makeStorage({ [storageKey]: '1' }) });
  page.run();
  await page.settle();
  assert.equal(page.calls.length, 0);
  assert.equal(page.storage.writes.length, 0);
});

test('a successful session marker carries across new documents', async () => {
  const storage = makeStorage();
  const first = makePage({ storage });
  first.run();
  await first.settle();
  const second = makePage({ storage });
  second.run();
  await second.settle();
  assert.equal(first.calls.length, 1);
  assert.equal(second.calls.length, 0);
});

for (const [name, fetchImpl] of [
  ['network rejection', async () => { throw new Error('Network failure'); }],
  ['HTTP failure even with collected true', async () => response({ collected: true }, false)],
  ['invalid JSON', async () => ({ ok: true, json: async () => { throw new SyntaxError('Invalid JSON'); } })],
  ['unknown-country response', async () => response({ ok: true, collected: false, reason: 'unknown-country' })],
  ['missing collected flag', async () => response({ ok: true })],
  ['truthy string instead of true', async () => response({ collected: 'true' })],
  ['null response payload', async () => response(null)]
]) {
  test(`${name} leaves the session unmarked and allows the next document to try`, async () => {
    const storage = makeStorage();
    const first = makePage({ storage, fetchImpl });
    first.run();
    await first.settle();
    assert.equal(first.calls.length, 1);
    assert.equal(storage.values.has(storageKey), false);
    assert.equal(storage.writes.length, 0);
    first.run();
    assert.equal(first.calls.length, 1, 'failed initialization does not loop within a document');
    const next = makePage({ storage });
    next.run();
    await next.settle();
    assert.equal(next.calls.length, 1);
    assert.equal(storage.values.get(storageKey), '1');
  });
}

test('blocked sessionStorage property still allows immediate collection', async () => {
  const page = makePage({ storageGetterThrows: true });
  page.run();
  assert.equal(page.calls.length, 1);
  await page.settle();
  page.run();
  assert.equal(page.calls.length, 1);
});

test('getItem denial still allows collection, without requiring storage access', async () => {
  const storage = {
    getItem() { throw new Error('Read denied'); },
    setItem() { throw new Error('Write denied'); }
  };
  const page = makePage({ storage });
  page.run();
  assert.equal(page.calls.length, 1);
  await page.settle();
});

test('setItem denial after success is handled and does not cause duplicate requests in the document', async () => {
  const page = makePage({ storage: { getItem() { return null; }, setItem() { throw new Error('Quota exceeded'); } } });
  page.run();
  await page.settle();
  page.run();
  assert.equal(page.calls.length, 1);
});

test('missing API configuration makes no request', async () => {
  const page = makePage({ apiBase: '' });
  page.run();
  if (page.window.__cjVisitorCollection) await page.settle();
  assert.equal(page.calls.length, 0);
  assert.equal(page.storage.writes.length, 0);
});
