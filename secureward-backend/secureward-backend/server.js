// ============================================================================
// SECUREWARD OS - Correctional Facility Management System
// Backend: Node.js built-in http + fs only (zero dependencies)
//   Tier 2 (Application): REST API under /api/*  + static file hosting
//   Tier 3 (Data):        JSON file store (data.json), atomic writes
// ============================================================================
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const SEED = require('./seed');

const PORT = Number(process.env.PORT) || 5000;
const HOST = process.env.HOST || '0.0.0.0';
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
const CORS_ORIGIN = process.env.CORS_ORIGIN || ''; // e.g. "http://localhost:5500" if the frontend is served elsewhere
const MAX_BODY = 1024 * 1024; // 1 MB

// ----------------------------------------------------------------------------
// DATA TIER: JSON file store
// ----------------------------------------------------------------------------
const clone = (o) => JSON.parse(JSON.stringify(o));
let db;

function loadDB() {
  try {
    db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    for (const k of ['inmates', 'cells', 'incidents', 'visits', 'medical', 'facilityStats']) {
      if (!(k in db)) throw new Error(`data.json missing "${k}"`);
    }
  } catch (e) {
    if (e.code !== 'ENOENT') console.warn(`[db] ${e.message} - re-seeding`);
    db = clone(SEED);
    saveDB();
    console.log(`[db] seeded ${DATA_FILE}`);
  }
}

function saveDB() {
  // Atomic write: temp file + rename, so a crash never leaves a half-written data.json
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

const nextId = (arr, floor = 0) => arr.reduce((m, r) => Math.max(m, Number(r.id) || 0), floor) + 1;
const today = () => new Date().toISOString().slice(0, 10);

// ----------------------------------------------------------------------------
// VALIDATION / SANITISATION
// ----------------------------------------------------------------------------
class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const bad = (msg) => new HttpError(400, msg);

const ENUM = {
  inmateStatus: ['Active', 'Isolation', 'Released'],
  risk: ['Low', 'Medium', 'High'],
  severity: ['Low', 'Medium', 'High'],
  visitStatus: ['Scheduled', 'Completed', 'Denied', 'Cancelled'],
  triage: ['Routine', 'Priority', 'Urgent', 'Emergency'],
  blood: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
};

function str(v, { field, required = false, max = 200, fallback = '' } = {}) {
  if (v === undefined || v === null || String(v).trim() === '') {
    if (required) throw bad(`${field} is required.`);
    return fallback;
  }
  // strip control characters, collapse nothing else; HTML escaping is done on output by the UI
  const s = String(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
  if (s.length > max) throw bad(`${field} must be at most ${max} characters.`);
  return s;
}

function oneOf(v, list, field, fallback) {
  if (v === undefined || v === null || v === '') return fallback;
  if (!list.includes(v)) throw bad(`${field} must be one of: ${list.join(', ')}.`);
  return v;
}

function isoDate(v, field, fallback) {
  if (v === undefined || v === null || v === '') return fallback;
  const s = String(v);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(s))) throw bad(`${field} must be a date in YYYY-MM-DD format.`);
  return s;
}

function isoDateTime(v, field, fallback) {
  if (v === undefined || v === null || v === '') return fallback;
  const s = String(v).replace('T', ' ').slice(0, 16);
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(s) || Number.isNaN(Date.parse(s.replace(' ', 'T')))) {
    throw bad(`${field} must be a date/time like "2026-10-22 14:30".`);
  }
  return s;
}

function findInmate(id, { field = 'inmateId' } = {}) {
  const n = Number(id);
  if (!Number.isInteger(n)) throw bad(`${field} is required.`);
  const inmate = db.inmates.find((i) => i.id === n);
  if (!inmate) throw new HttpError(404, `Inmate #${n} not found.`);
  return inmate;
}

function occupants(cellId, excludeInmateId) {
  return db.inmates.filter((i) => i.cellId === cellId && i.status !== 'Released' && i.id !== excludeInmateId).length;
}

// Throws if the cell does not exist or is full. 'Unassigned' / '' are always allowed.
function assertCellAvailable(cellId, excludeInmateId) {
  if (!cellId || cellId === 'Unassigned') return;
  const cell = db.cells.find((c) => c.id === cellId);
  if (!cell) throw bad(`Cell ${cellId} does not exist.`);
  if (occupants(cellId, excludeInmateId) >= cell.capacity) {
    throw new HttpError(409, `Cell ${cell.id} is full (${cell.capacity}/${cell.capacity}). Please select another cell.`);
  }
}

// ----------------------------------------------------------------------------
// HANDLERS
// ----------------------------------------------------------------------------
const routes = [];
const route = (method, pattern, handler) => {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '/?$');
  routes.push({ method, re, keys, handler });
};

// --- Stats -------------------------------------------------------------------
function buildStats() {
  const fs_ = db.facilityStats;
  const active = db.inmates.filter((i) => i.status !== 'Released').length;
  const todaysVisits = db.visits.filter((v) => v.visitDate.startsWith(today()) && v.status !== 'Denied' && v.status !== 'Cancelled').length;
  return {
    totalInmates: fs_.baselineInmates + active,
    capacity: fs_.capacity,
    visitsToday: fs_.baselineVisitsToday + todaysVisits,
    highSeverityIncidents: db.incidents.filter((i) => i.severity === 'High').length,
    pendingMedicalCheckups: fs_.pendingMedicalCheckups,
    activeGuardsOnDuty: fs_.activeGuardsOnDuty,
    lockdownActive: fs_.lockdownActive,
    defconLevel: fs_.defconLevel,
    activeRosterCount: active,
    totalIncidents: db.incidents.length,
    totalVisits: db.visits.length,
    totalMedical: db.medical.length
  };
}
route('GET', '/api/stats', () => buildStats());

route('GET', '/api/health', () => ({ status: 'ok', uptimeSec: Math.round(process.uptime()), time: new Date().toISOString() }));

// --- Lockdown ----------------------------------------------------------------
route('POST', '/api/lockdown', ({ body }) => {
  const f = db.facilityStats;
  f.lockdownActive = typeof body.active === 'boolean' ? body.active : !f.lockdownActive;
  f.defconLevel = f.lockdownActive ? 'DEFCON 1 - MAXIMUM LOCKDOWN' : 'DEFCON 4 - NORMAL SECURE';
  if (f.lockdownActive) db.cells.forEach((c) => { c.isLocked = true; });
  saveDB();
  return { success: true, lockdownActive: f.lockdownActive, defconLevel: f.defconLevel };
});

// --- Inmates -----------------------------------------------------------------
route('GET', '/api/inmates', () => db.inmates);

route('GET', '/api/inmates/:id', ({ params }) => {
  const inmate = findInmate(params.id, { field: 'id' });
  return {
    ...inmate,
    incidents: db.incidents.filter((i) => i.inmateId === inmate.id),
    visits: db.visits.filter((v) => v.inmateId === inmate.id),
    medical: db.medical.filter((m) => m.inmateId === inmate.id)
  };
});

route('POST', '/api/inmates', ({ body }) => {
  const name = str(body.name, { field: 'Name', required: true, max: 100 });
  const crime = str(body.crime, { field: 'Crime', required: true, max: 150 });
  const sentenceYrs = body.sentenceYrs === undefined || body.sentenceYrs === '' ? 1 : Number(body.sentenceYrs);
  if (!Number.isFinite(sentenceYrs) || sentenceYrs < 0 || sentenceYrs > 99) throw bad('Sentence must be a number between 0 and 99 years.');
  const cellId = str(body.cellId, { field: 'Cell', max: 20, fallback: 'Unassigned' });
  assertCellAvailable(cellId);

  const inmate = {
    id: nextId(db.inmates, 1000),
    name,
    crime,
    cellId,
    sentenceYrs,
    admitDate: isoDate(body.admitDate, 'Admit date', today()),
    status: oneOf(body.status, ENUM.inmateStatus, 'Status', 'Active'),
    riskLevel: oneOf(body.riskLevel, ENUM.risk, 'Risk level', 'Medium'),
    notes: str(body.notes, { field: 'Notes', max: 1000, fallback: 'Intake screening complete.' }),
    bloodGroup: oneOf(body.bloodGroup, ENUM.blood, 'Blood group', 'O+'),
    dob: isoDate(body.dob, 'Date of birth', '1995-01-01')
  };
  db.inmates.unshift(inmate);
  saveDB();
  return { status: 201, body: inmate };
});

route('PUT', '/api/inmates/:id', ({ params, body }) => {
  const inmate = findInmate(params.id, { field: 'id' });
  const next = { ...inmate };
  if ('name' in body) next.name = str(body.name, { field: 'Name', required: true, max: 100 });
  if ('crime' in body) next.crime = str(body.crime, { field: 'Crime', required: true, max: 150 });
  if ('sentenceYrs' in body) {
    const y = Number(body.sentenceYrs);
    if (!Number.isFinite(y) || y < 0 || y > 99) throw bad('Sentence must be a number between 0 and 99 years.');
    next.sentenceYrs = y;
  }
  if ('admitDate' in body) next.admitDate = isoDate(body.admitDate, 'Admit date', inmate.admitDate);
  if ('dob' in body) next.dob = isoDate(body.dob, 'Date of birth', inmate.dob);
  if ('status' in body) next.status = oneOf(body.status, ENUM.inmateStatus, 'Status', inmate.status);
  if ('riskLevel' in body) next.riskLevel = oneOf(body.riskLevel, ENUM.risk, 'Risk level', inmate.riskLevel);
  if ('bloodGroup' in body) next.bloodGroup = oneOf(body.bloodGroup, ENUM.blood, 'Blood group', inmate.bloodGroup);
  if ('notes' in body) next.notes = str(body.notes, { field: 'Notes', max: 1000 });
  if ('cellId' in body) next.cellId = str(body.cellId, { field: 'Cell', max: 20, fallback: 'Unassigned' });

  // Only re-check capacity when the inmate is (still) occupying a cell that actually changed or is being re-activated
  if (next.status !== 'Released' && (next.cellId !== inmate.cellId || inmate.status === 'Released')) {
    assertCellAvailable(next.cellId, inmate.id);
  }
  Object.assign(inmate, next);
  // keep denormalised names on linked records in sync
  if (next.name !== undefined) {
    for (const col of [db.incidents, db.visits, db.medical]) col.forEach((r) => { if (r.inmateId === inmate.id) r.inmateName = inmate.name; });
  }
  saveDB();
  return inmate;
});

// Cascade delete: removes the inmate and every linked incident, visit and medical record
route('DELETE', '/api/inmates/:id', ({ params }) => {
  const inmate = findInmate(params.id, { field: 'id' });
  const before = { incidents: db.incidents.length, visits: db.visits.length, medical: db.medical.length };
  db.inmates = db.inmates.filter((i) => i.id !== inmate.id);
  db.incidents = db.incidents.filter((r) => r.inmateId !== inmate.id);
  db.visits = db.visits.filter((r) => r.inmateId !== inmate.id);
  db.medical = db.medical.filter((r) => r.inmateId !== inmate.id);
  saveDB();
  return {
    success: true,
    deleted: {
      inmate: inmate.id,
      incidents: before.incidents - db.incidents.length,
      visits: before.visits - db.visits.length,
      medical: before.medical - db.medical.length
    }
  };
});

// --- Cells -------------------------------------------------------------------
route('GET', '/api/cells', () => db.cells.map((c) => ({ ...c, currentOccupants: occupants(c.id) })));

route('POST', '/api/cells/:id/toggle-lock', ({ params }) => {
  const cell = db.cells.find((c) => c.id === params.id);
  if (!cell) throw new HttpError(404, `Cell ${params.id} not found.`);
  if (db.facilityStats.lockdownActive && cell.isLocked) {
    throw new HttpError(423, 'Facility lockdown is active - cell doors cannot be unlocked.');
  }
  cell.isLocked = !cell.isLocked;
  saveDB();
  return { success: true, cellId: cell.id, isLocked: cell.isLocked };
});

// --- Incidents ---------------------------------------------------------------
route('GET', '/api/incidents', () => db.incidents);

route('POST', '/api/incidents', ({ body }) => {
  const hasInmate = body.inmateId !== undefined && body.inmateId !== null && body.inmateId !== '';
  const inmate = hasInmate ? findInmate(body.inmateId) : null;
  const action = str(body.action, { field: 'Action', max: 200, fallback: 'Disciplinary record logged' });

  const incident = {
    id: nextId(db.incidents),
    inmateId: inmate ? inmate.id : null,
    inmateName: inmate ? inmate.name : 'General Facility',
    date: isoDate(body.date, 'Date', today()),
    time: str(body.time, { field: 'Time', max: 5, fallback: new Date().toTimeString().slice(0, 5) }),
    type: str(body.type, { field: 'Incident type', required: true, max: 120 }),
    severity: oneOf(body.severity, ENUM.severity, 'Severity', undefined),
    action,
    location: str(body.location, { field: 'Location', max: 120, fallback: inmate ? `Cell ${inmate.cellId}` : 'Cell Block' }),
    officer: str(body.officer, { field: 'Officer', max: 100, fallback: 'Duty Officer' }),
    status: 'Active'
  };
  if (!incident.severity) throw bad('Severity is required.');

  // Business rule: an isolation / solitary sanction moves the inmate to a free solitary cell
  if (inmate && /isolation|solitary/i.test(action)) {
    inmate.status = 'Isolation';
    const solitary = db.cells.find((c) => c.id.startsWith('D-') && occupants(c.id, inmate.id) < c.capacity);
    if (solitary) inmate.cellId = solitary.id;
  }
  db.incidents.unshift(incident);
  saveDB();
  return { status: 201, body: incident };
});

// --- Visits ------------------------------------------------------------------
route('GET', '/api/visits', () => db.visits);

route('POST', '/api/visits', ({ body }) => {
  const inmate = findInmate(body.inmateId);
  if (inmate.status === 'Released') throw bad(`${inmate.name} has been released - visits cannot be scheduled.`);
  const visit = {
    id: nextId(db.visits),
    inmateId: inmate.id,
    inmateName: inmate.name,
    visitorName: str(body.visitorName, { field: 'Visitor name', required: true, max: 100 }),
    relation: str(body.relation, { field: 'Relation', max: 60, fallback: 'Relative' }),
    visitDate: isoDateTime(body.visitDate, 'Visit date', new Date().toISOString().replace('T', ' ').slice(0, 16)),
    status: oneOf(body.status, ENUM.visitStatus, 'Status', 'Scheduled'),
    booth: str(body.booth, { field: 'Booth', max: 40, fallback: 'Booth 01' }),
    idProof: str(body.idProof, { field: 'ID proof', max: 120, fallback: 'Verified Govt ID' })
  };
  db.visits.unshift(visit);
  saveDB();
  return { status: 201, body: visit };
});

route('PUT', '/api/visits/:id/status', ({ params, body }) => {
  const visit = db.visits.find((v) => v.id === Number(params.id));
  if (!visit) throw new HttpError(404, `Visit #${params.id} not found.`);
  visit.status = oneOf(body.status, ENUM.visitStatus, 'Status', undefined);
  if (!visit.status) throw bad('Status is required.');
  saveDB();
  return visit;
});

// --- Medical -----------------------------------------------------------------
route('GET', '/api/medical', () => db.medical);

route('POST', '/api/medical', ({ body }) => {
  const inmate = findInmate(body.inmateId);
  const rec = {
    id: nextId(db.medical),
    inmateId: inmate.id,
    inmateName: inmate.name,
    checkupDate: isoDate(body.checkupDate, 'Checkup date', today()),
    condition: str(body.condition, { field: 'Condition', required: true, max: 200 }),
    treatment: str(body.treatment, { field: 'Treatment', max: 500, fallback: 'Prescribed medication' }),
    doctor: str(body.doctor, { field: 'Doctor', max: 100, fallback: 'Dr. Sarah Paul, MD' }),
    triage: oneOf(body.triage, ENUM.triage, 'Triage', 'Routine')
  };
  db.medical.unshift(rec);
  saveDB();
  return { status: 201, body: rec };
});

// --- Reset -------------------------------------------------------------------
route('POST', '/api/reset', () => {
  db = clone(SEED);
  saveDB();
  return { success: true, data: db };
});

// ----------------------------------------------------------------------------
// HTTP PLUMBING
// ----------------------------------------------------------------------------
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.txt': 'text/plain; charset=utf-8'
};

function securityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  if (CORS_ORIGIN) {
    res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
}

function sendJSON(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    if (!['POST', 'PUT', 'PATCH'].includes(req.method)) return resolve({});
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(new HttpError(413, 'Request body too large.')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try {
        const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
        resolve(parsed);
      } catch { reject(bad('Request body must be a valid JSON object.')); }
    });
    req.on('error', reject);
  });
}

function serveStatic(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return sendJSON(res, 405, { error: 'Method not allowed.' });
  let rel;
  try { rel = decodeURIComponent(pathname); } catch { return sendJSON(res, 400, { error: 'Bad URL.' }); }
  if (rel.includes('\0')) return sendJSON(res, 400, { error: 'Bad URL.' });
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (file !== PUBLIC_DIR && !file.startsWith(PUBLIC_DIR + path.sep)) return sendJSON(res, 403, { error: 'Forbidden.' }); // path traversal guard
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return sendJSON(res, 404, { error: 'Not found.' });
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Content-Length': st.size, 'Cache-Control': 'no-cache' });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
}

async function handle(req, res) {
  securityHeaders(res);
  const url = new URL(req.url, 'http://localhost');
  const { pathname } = url;

  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  if (!pathname.startsWith('/api/') && pathname !== '/api') return serveStatic(req, res, pathname);

  try {
    const matches = routes.filter((r) => r.re.test(pathname));
    if (!matches.length) throw new HttpError(404, `No such endpoint: ${pathname}`);
    const r = matches.find((m) => m.method === req.method);
    if (!r) throw new HttpError(405, `Method ${req.method} not allowed on ${pathname}`);

    const m = pathname.match(r.re);
    const params = {};
    r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
    const body = await readBody(req);
    const out = await r.handler({ params, body, query: url.searchParams });
    if (out && out.status && out.body !== undefined) sendJSON(res, out.status, out.body);
    else sendJSON(res, 200, out);
  } catch (e) {
    if (e instanceof HttpError) return sendJSON(res, e.status, { error: e.message });
    console.error('[error]', e);
    sendJSON(res, 500, { error: 'Internal server error.' });
  }
}

loadDB();
const server = http.createServer((req, res) => {
  handle(req, res);
  if (process.env.LOG !== 'off') res.on('finish', () => console.log(`${new Date().toISOString()} ${req.method} ${req.url} -> ${res.statusCode}`));
});

if (require.main === module) {
  server.listen(PORT, HOST, () => console.log(`SecureWard OS running at http://localhost:${PORT}  (data: ${DATA_FILE})`));
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { console.log(`\n${sig} - shutting down`); server.close(() => process.exit(0)); });
}

module.exports = { server };
