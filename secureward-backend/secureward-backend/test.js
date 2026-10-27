// Smoke tests for every endpoint used by js/store.js. Run: npm test
const os = require('os'), path = require('path'), assert = require('assert');
process.env.DATA_FILE = path.join(os.tmpdir(), `secureward-test-${process.pid}.json`);
process.env.LOG = 'off';
const { server } = require('./server');

let base;
const call = async (method, url, body) => {
  const r = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  let json = null; try { json = await r.json(); } catch {}
  return { status: r.status, json };
};
let passed = 0;
const t = async (name, fn) => { try { await fn(); passed++; console.log('  ok  ' + name); } catch (e) { console.error('FAIL  ' + name + '\n      ' + e.message); process.exitCode = 1; } };

server.listen(0, async () => {
  base = `http://127.0.0.1:${server.address().port}`;

  await t('GET /api/stats has dashboard fields', async () => {
    const { status, json } = await call('GET', '/api/stats');
    assert.equal(status, 200);
    assert.equal(json.totalInmates, 148); assert.equal(json.capacity, 180);
    assert.equal(json.highSeverityIncidents, 2); assert.equal(json.lockdownActive, false);
  });
  await t('GET /api/inmates returns seed', async () => { assert.equal((await call('GET', '/api/inmates')).json.length, 6); });
  await t('GET /api/inmates/:id includes linked records', async () => {
    const { json } = await call('GET', '/api/inmates/1063');
    assert.equal(json.name, 'Selvam M'); assert.equal(json.incidents.length, 2); assert.equal(json.medical.length, 1);
  });
  await t('GET /api/inmates/:id 404', async () => { assert.equal((await call('GET', '/api/inmates/9999')).status, 404); });
  await t('GET /api/cells recounts occupants', async () => {
    const cells = (await call('GET', '/api/cells')).json;
    assert.equal(cells.find((c) => c.id === 'B-14').currentOccupants, 1);
    assert.equal(cells.find((c) => c.id === 'A-11').currentOccupants, 0); // released inmate doesn't count
  });
  let newId;
  await t('POST /api/inmates creates (201) with id 1095', async () => {
    const { status, json } = await call('POST', '/api/inmates', { name: '  Test Inmate ', crime: 'Theft', sentenceYrs: '3', cellId: 'A-11', status: 'Active', notes: '' });
    assert.equal(status, 201); assert.equal(json.id, 1095); assert.equal(json.name, 'Test Inmate'); newId = json.id;
  });
  await t('POST /api/inmates rejects full cell (409, message for UI)', async () => {
    await call('POST', '/api/inmates', { name: 'B', crime: 'X', cellId: 'A-11' }); // A-11 capacity 2 -> now full
    const { status, json } = await call('POST', '/api/inmates', { name: 'C', crime: 'X', cellId: 'A-11' });
    assert.equal(status, 409); assert.match(json.error, /Cell A-11 is full/);
  });
  await t('POST /api/inmates validation (missing name, bad cell, bad sentence, bad JSON)', async () => {
    assert.equal((await call('POST', '/api/inmates', { crime: 'X' })).status, 400);
    assert.equal((await call('POST', '/api/inmates', { name: 'a', crime: 'X', cellId: 'Z-99' })).status, 400);
    assert.equal((await call('POST', '/api/inmates', { name: 'a', crime: 'X', sentenceYrs: 500 })).status, 400);
    const r = await fetch(base + '/api/inmates', { method: 'POST', body: '{nope' }); assert.equal(r.status, 400);
  });
  await t('PUT /api/inmates/:id updates, whitelists fields', async () => {
    const { json } = await call('PUT', `/api/inmates/${newId}`, { riskLevel: 'High', id: 5, hacked: true });
    assert.equal(json.riskLevel, 'High'); assert.equal(json.id, newId); assert.equal(json.hacked, undefined);
  });
  await t('POST /api/incidents with isolation moves inmate to D-01', async () => {
    const { status, json } = await call('POST', '/api/incidents', { inmateId: String(newId), type: 'Fight', severity: 'High', date: '2026-10-22', action: 'Isolation 3 days' });
    assert.equal(status, 201); assert.equal(json.inmateName, 'Test Inmate');
    const inm = (await call('GET', `/api/inmates/${newId}`)).json;
    assert.equal(inm.status, 'Isolation'); assert.equal(inm.cellId, 'D-01');
    assert.equal((await call('GET', '/api/stats')).json.highSeverityIncidents, 3);
  });
  await t('POST /api/incidents validation', async () => {
    assert.equal((await call('POST', '/api/incidents', { type: 'x' })).status, 400);              // no severity
    assert.equal((await call('POST', '/api/incidents', { inmateId: 777, type: 'x', severity: 'Low' })).status, 404);
  });
  let visitId;
  await t('POST /api/visits + PUT /api/visits/:id/status', async () => {
    const { status, json } = await call('POST', '/api/visits', { inmateId: '1042', visitorName: 'Visitor', relation: 'Friend', visitDate: '2026-10-25 10:00' });
    assert.equal(status, 201); assert.equal(json.inmateName, 'Ravi Kumar'); assert.equal(json.status, 'Scheduled'); visitId = json.id;
    assert.equal((await call('PUT', `/api/visits/${visitId}/status`, { status: 'Completed' })).json.status, 'Completed');
    assert.equal((await call('PUT', `/api/visits/${visitId}/status`, { status: 'Bogus' })).status, 400);
    assert.equal((await call('POST', '/api/visits', { inmateId: '1094', visitorName: 'x' })).status, 400); // released
  });
  await t('POST /api/medical', async () => {
    const { status, json } = await call('POST', '/api/medical', { inmateId: '1051', checkupDate: '2026-10-22', condition: 'Fever', treatment: 'Paracetamol' });
    assert.equal(status, 201); assert.equal(json.triage, 'Routine');
  });
  await t('Lockdown locks all cells and blocks unlocking; disengage restores', async () => {
    await call('POST', '/api/cells/B-14/toggle-lock'); // unlock (no lockdown)
    assert.equal((await call('GET', '/api/cells')).json.find((c) => c.id === 'B-14').isLocked, false);
    const l = await call('POST', '/api/lockdown', { active: true });
    assert.equal(l.json.defconLevel, 'DEFCON 1 - MAXIMUM LOCKDOWN');
    assert((await call('GET', '/api/cells')).json.every((c) => c.isLocked));
    assert.equal((await call('POST', '/api/cells/B-14/toggle-lock')).status, 423);
    assert.equal((await call('POST', '/api/lockdown', { active: false })).json.lockdownActive, false);
    assert.equal((await call('POST', '/api/cells/B-14/toggle-lock')).json.isLocked, false);
  });
  await t('DELETE /api/inmates/:id cascades', async () => {
    const { json } = await call('DELETE', '/api/inmates/1063');
    assert.equal(json.success, true); assert.equal(json.deleted.incidents, 2); assert.equal(json.deleted.medical, 1); assert.equal(json.deleted.visits, 1);
    assert((await call('GET', '/api/incidents')).json.every((i) => i.inmateId !== 1063));
  });
  await t('POST /api/reset restores seed', async () => {
    await call('POST', '/api/reset');
    assert.equal((await call('GET', '/api/inmates')).json.length, 6);
  });
  await t('Unknown route 404 / wrong method 405 / static traversal blocked', async () => {
    assert.equal((await call('GET', '/api/nope')).status, 404);
    assert.equal((await call('DELETE', '/api/stats')).status, 405);
    const r = await fetch(base + '/..%2f..%2fserver.js'); assert.notEqual(r.status, 200);
    const r2 = await fetch(base + '/js/store.js'); assert.equal(r2.status, 200); assert.match(r2.headers.get('content-type'), /javascript/);
  });

  console.log(`\n${passed} passed`);
  server.close(); try { require('fs').unlinkSync(process.env.DATA_FILE); } catch {}
});
