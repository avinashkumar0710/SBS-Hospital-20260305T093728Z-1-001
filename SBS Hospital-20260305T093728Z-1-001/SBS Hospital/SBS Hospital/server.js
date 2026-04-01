'use strict';

const crypto = require('crypto');
const http = require('http');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { URL } = require('url');

const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const INTERNAL_DB_FILE = path.join(DATA_DIR, 'internal-db.json');
const LEGACY_JSON_FILE = path.join(DATA_DIR, 'appointments.json');
const TABLE_NAME = 'appointments';
const SESSION_COOKIE = 'sbs_admin_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 8;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

const sessions = new Map();
const BLOCKED_STATIC_PATHS = new Set(['/server.js', '/package.json', '/README.md']);
const APPOINTMENT_STATUSES = ['scheduled', 'completed', 'no_show', 'cancelled'];
const APPOINTMENT_COLUMNS = [
  'id',
  'createdAt',
  'updatedAt',
  'name',
  'phone',
  'email',
  'dept',
  'date',
  'message',
  'status',
  'adminNotes',
];

const LOGIN_PAGE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-Content-Type-Options" content="nosniff" />
    <meta http-equiv="Content-Security-Policy"
        content="default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; script-src 'self';">
    <title>Admin Login | SBS Hospital</title>
    <meta name="description" content="Secure staff login for the SBS Hospital appointments dashboard." />
    <link rel="icon" type="image/png" href="images/favicon.png" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="css/style.css" />
</head>
<body class="auth-page">
    <nav id="navbar" role="navigation" aria-label="Main navigation">
        <div class="nav-inner">
            <a class="nav-logo" href="index.html" aria-label="SBS Hospital Home">
                <div class="nav-logo-icon">SBS</div>
                <div class="nav-logo-text"><span class="logo-main">SBS Hospital</span><span class="logo-sub">Shri Bira Singh Multispeciality</span></div>
            </a>
            <ul class="nav-links" role="list">
                <li><a href="index.html">Home</a></li>
                <li><a href="about.html">About</a></li>
                <li><a href="services.html">Services</a></li>
                <li><a href="gallery.html">Gallery</a></li>
                <li><a href="contact.html">Contact</a></li>
                <li><a href="login.html" class="active">Admin Login</a></li>
            </ul>
            <div class="nav-emergency">
                <a href="contact.html" class="nav-book-btn" aria-label="Book Appointment">Book Appt</a>
                <a href="tel:7000925884" class="nav-emergency-btn" aria-label="Call hospital">7000925884</a>
                <button class="hamburger" aria-label="Toggle navigation" aria-expanded="false"><span></span><span></span><span></span></button>
            </div>
        </div>
    </nav>

    <nav class="mobile-nav" aria-label="Mobile navigation">
        <a href="index.html">Home</a>
        <a href="about.html">About Us</a>
        <a href="services.html">Services</a>
        <a href="gallery.html">Gallery</a>
        <a href="contact.html">Contact</a>
        <a href="login.html" class="active">Admin Login</a>
        <div class="mobile-emergency"><a href="tel:7000925884" rel="noopener">Emergency: 7000925884</a></div>
    </nav>

    <section class="section auth-shell" aria-label="Admin login">
        <div class="container auth-layout">
            <div class="auth-hero-panel">
                <span class="eyebrow">Internal Access</span>
                <h1>Manage appointments with a simple staff workflow.</h1>
                <p>Use the dashboard to review new bookings, mark completed visits, track no-shows, and keep brief follow-up notes for your team.</p>
                <div class="auth-feature-list">
                    <div class="auth-feature-item">
                        <strong>Live queue</strong>
                        <span>See every booking in one searchable list with department, date, and contact details.</span>
                    </div>
                    <div class="auth-feature-item">
                        <strong>Visit outcomes</strong>
                        <span>Mark each appointment as scheduled, completed, no-show, or cancelled without leaving the page.</span>
                    </div>
                    <div class="auth-feature-item">
                        <strong>Internal notes</strong>
                        <span>Record reschedule requests, callback notes, or basic follow-up comments for staff use.</span>
                    </div>
                </div>
            </div>

            <div class="auth-form-panel">
                <div class="auth-card">
                    <span class="eyebrow">Staff Login</span>
                    <h2>Sign in to the admin dashboard</h2>
                    <p>Only authorised staff should access patient appointment data.</p>

                    <form id="loginForm" class="auth-form" novalidate>
                        <div>
                            <label for="loginUsername">Username</label>
                            <input id="loginUsername" name="username" type="text" autocomplete="username" placeholder="Enter admin username" required />
                        </div>
                        <div>
                            <label for="loginPassword">Password</label>
                            <input id="loginPassword" name="password" type="password" autocomplete="current-password" placeholder="Enter password" required />
                        </div>
                        <button id="loginSubmit" class="btn btn-primary btn-lg" type="submit">Login</button>
                        <p id="loginMessage" class="auth-message hidden" role="alert" aria-live="polite"></p>
                    </form>

                    <div class="auth-support">
                        <p><strong>Default local login:</strong> <code>admin</code> / <code>admin123</code></p>
                        <p>Change these values before deployment using <code>ADMIN_USERNAME</code> and <code>ADMIN_PASSWORD</code>.</p>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <footer role="contentinfo">
        <div class="container">
            <div class="footer-grid">
                <div class="footer-brand">
                    <div class="nav-logo" style="margin-bottom:1rem">
                        <div class="nav-logo-icon">SBS</div>
                        <div class="nav-logo-text"><span class="logo-main">SBS Hospital</span><span class="logo-sub">Shri Bira Singh Multispeciality</span></div>
                    </div>
                    <p>Providing compassionate multispeciality healthcare to Bhilai since 2021. MSME: UDYAM-CG-05-0018294</p>
                </div>
                <div class="footer-col">
                    <h5>Quick Links</h5>
                    <ul>
                        <li><a href="index.html">Home</a></li>
                        <li><a href="about.html">About Us</a></li>
                        <li><a href="services.html">Services</a></li>
                        <li><a href="gallery.html">Gallery</a></li>
                        <li><a href="contact.html">Contact</a></li>
                    </ul>
                </div>
                <div class="footer-col">
                    <h5>Contact</h5>
                    <div class="footer-contact-item"><span class="fi">Address:</span><span>G.E. Road, Camp 2, Bhilai, CG 490023</span></div>
                    <div class="footer-contact-item"><span class="fi">OPD:</span><span>Mon-Sat, 9AM-6PM</span></div>
                    <div class="footer-contact-item"><span class="fi">Phone:</span><a href="tel:7000925884">7000925884</a></div>
                </div>
            </div>
            <div class="footer-bottom">
                <p>Copyright <span data-current-year></span> SBS Hospital (Shri Bira Singh Multispeciality Hospital Pvt. Ltd.) All Rights Reserved</p>
                <p>UDYAM-CG-05-0018294 | Bhilai, Chhattisgarh</p>
            </div>
        </div>
    </footer>

    <button id="scrollTop" aria-label="Scroll to top">^</button>
    <script src="js/main.js"></script>
    <script src="js/login.js"></script>
</body>
</html>`;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
};

function json(res, code, body, extraHeaders = {}) {
  const data = JSON.stringify(body);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(data),
    ...extraHeaders,
  });
  res.end(data);
}

function html(res, code, body, extraHeaders = {}) {
  res.writeHead(code, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    ...extraHeaders,
  });
  res.end(body);
}

function redirect(res, location) {
  res.writeHead(302, { Location: location });
  res.end();
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function normalizeIndianPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  return header.split(';').reduce((acc, part) => {
    const index = part.indexOf('=');
    if (index === -1) return acc;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    acc[key] = decodeURIComponent(value);
    return acc;
  }, {});
}

function serializeCookie(name, value, maxAgeSeconds) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${maxAgeSeconds}`,
  ];
  return parts.join('; ');
}

function clearCookie(name) {
  return `${name}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}

function createSession(username) {
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, {
    username,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
  return token;
}

function getSession(req) {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;

  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }

  session.expiresAt = Date.now() + SESSION_TTL_MS;
  return { token, ...session };
}

function requireApiAuth(req, res) {
  const session = getSession(req);
  if (!session) {
    json(res, 401, { ok: false, message: 'Authentication required.' });
    return null;
  }
  return session;
}

function appointmentInput(payload = {}) {
  return {
    name: String(payload.name || '').trim(),
    phone: normalizeIndianPhone(payload.phone),
    email: String(payload.email || '').trim(),
    dept: String(payload.dept || '').trim(),
    date: String(payload.date || '').trim(),
    message: String(payload.message || '').trim(),
  };
}

function validateAppointment(record) {
  if (record.name.length < 2) return 'Name must be at least 2 characters.';
  if (!/^[6-9]\d{9}$/.test(record.phone)) return 'Phone must be a valid 10-digit Indian mobile number.';
  if (record.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email)) return 'Email is invalid.';
  if (!record.dept) return 'Department is required.';
  if (!record.date) return 'Preferred date is required.';
  if (record.date < today()) return 'Preferred date cannot be in the past.';
  if (record.message.length > 500) return 'Message must not exceed 500 characters.';
  return '';
}

function normalizeAppointmentRow(row, fallbackId) {
  const createdAt = String(row.createdAt || new Date().toISOString());
  const normalizedStatus = APPOINTMENT_STATUSES.includes(row.status) ? row.status : 'scheduled';
  return {
    id: Number(row.id) || fallbackId,
    createdAt,
    updatedAt: String(row.updatedAt || createdAt),
    name: String(row.name || '').trim(),
    phone: normalizeIndianPhone(row.phone),
    email: String(row.email || '').trim(),
    dept: String(row.dept || '').trim(),
    date: String(row.date || '').trim(),
    message: String(row.message || '').trim(),
    status: normalizedStatus,
    adminNotes: String(row.adminNotes || '').trim(),
  };
}

function createEmptyInternalDb() {
  return {
    meta: {
      schemaVersion: 2,
      updatedAt: new Date().toISOString(),
    },
    tables: {
      [TABLE_NAME]: {
        columns: APPOINTMENT_COLUMNS,
        nextId: 1,
        rows: [],
      },
    },
  };
}

function normalizeDb(raw) {
  const db = raw && typeof raw === 'object' ? raw : {};
  if (!db.meta || typeof db.meta !== 'object') db.meta = {};
  if (!db.tables || typeof db.tables !== 'object') db.tables = {};
  if (!db.tables[TABLE_NAME] || typeof db.tables[TABLE_NAME] !== 'object') {
    db.tables[TABLE_NAME] = { columns: APPOINTMENT_COLUMNS, nextId: 1, rows: [] };
  }

  const table = db.tables[TABLE_NAME];
  table.columns = APPOINTMENT_COLUMNS;
  if (!Array.isArray(table.rows)) table.rows = [];

  table.rows = table.rows.map((row, index) => normalizeAppointmentRow(row, index + 1));

  if (!Number.isInteger(table.nextId) || table.nextId < 1) {
    const maxId = table.rows.reduce((max, row) => Math.max(max, Number(row.id) || 0), 0);
    table.nextId = maxId + 1;
  }

  db.meta.schemaVersion = 2;
  db.meta.updatedAt = new Date().toISOString();
  return db;
}

async function maybeMigrateLegacyJson() {
  if (fs.existsSync(INTERNAL_DB_FILE)) return;

  const db = createEmptyInternalDb();
  if (fs.existsSync(LEGACY_JSON_FILE)) {
    try {
      const raw = await fsp.readFile(LEGACY_JSON_FILE, 'utf8');
      const rows = JSON.parse(raw);
      if (Array.isArray(rows) && rows.length > 0) {
        const table = db.tables[TABLE_NAME];
        rows.forEach((row, index) => {
          const normalizedRow = normalizeAppointmentRow(row, index + 1);
          table.rows.push(normalizedRow);
          table.nextId = Math.max(table.nextId, normalizedRow.id + 1);
        });
      }
    } catch {
      // Ignore migration failure and start with an empty table.
    }
  }

  await fsp.mkdir(DATA_DIR, { recursive: true });
  await fsp.writeFile(INTERNAL_DB_FILE, `${JSON.stringify(db, null, 2)}\n`, 'utf8');
}

async function readInternalDb() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  await maybeMigrateLegacyJson();

  if (!fs.existsSync(INTERNAL_DB_FILE)) {
    const fresh = createEmptyInternalDb();
    await fsp.writeFile(INTERNAL_DB_FILE, `${JSON.stringify(fresh, null, 2)}\n`, 'utf8');
    return fresh;
  }

  try {
    const raw = await fsp.readFile(INTERNAL_DB_FILE, 'utf8');
    return normalizeDb(JSON.parse(raw));
  } catch {
    const fresh = createEmptyInternalDb();
    await fsp.writeFile(INTERNAL_DB_FILE, `${JSON.stringify(fresh, null, 2)}\n`, 'utf8');
    return fresh;
  }
}

async function writeInternalDb(db) {
  const normalized = normalizeDb(db);
  await fsp.writeFile(INTERNAL_DB_FILE, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
}

let writeQueue = Promise.resolve();
function withWriteLock(task) {
  const run = () => task();
  writeQueue = writeQueue.then(run, run);
  return writeQueue;
}

async function listAppointments() {
  const db = await readInternalDb();
  const table = db.tables[TABLE_NAME];
  return [...table.rows].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

async function createAppointment(record) {
  return withWriteLock(async () => {
    const db = await readInternalDb();
    const table = db.tables[TABLE_NAME];
    const now = new Date().toISOString();

    const row = normalizeAppointmentRow({
      id: table.nextId,
      createdAt: now,
      updatedAt: now,
      status: 'scheduled',
      adminNotes: '',
      ...record,
    }, table.nextId);

    table.rows.push(row);
    table.nextId += 1;
    await writeInternalDb(db);
    return row;
  });
}

async function updateAppointment(id, updates) {
  return withWriteLock(async () => {
    const db = await readInternalDb();
    const table = db.tables[TABLE_NAME];
    const row = table.rows.find((item) => item.id === id);
    if (!row) return null;

    if (typeof updates.status === 'string' && APPOINTMENT_STATUSES.includes(updates.status)) {
      row.status = updates.status;
    }
    if (typeof updates.adminNotes === 'string') {
      row.adminNotes = updates.adminNotes.trim().slice(0, 1000);
    }
    row.updatedAt = new Date().toISOString();

    await writeInternalDb(db);
    return row;
  });
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';

    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error('Request too large.'));
        req.destroy();
      }
    });

    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON payload.'));
      }
    });

    req.on('error', reject);
  });
}

async function serveFile(req, res, pathname) {
  const normalized = path.normalize(decodeURIComponent(pathname === '/' ? '/index.html' : pathname));
  if (normalized.includes('..')) {
    res.writeHead(400);
    res.end('Bad request');
    return;
  }

  if (BLOCKED_STATIC_PATHS.has(normalized) || normalized.startsWith('/data/')) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const filePath = path.join(ROOT, normalized.replace(/^[/\\]+/, ''));
  if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { 'Content-Type': TYPES[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || `${HOST}:${PORT}`}`);
    const pathname = url.pathname;
    const session = getSession(req);

    if (req.method === 'GET' && pathname === '/api/session') {
      json(res, 200, {
        ok: true,
        authenticated: Boolean(session),
        username: session ? session.username : null,
      });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/session') {
      const payload = await parseJsonBody(req);
      const username = String(payload.username || '').trim();
      const password = String(payload.password || '');

      if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
        json(res, 401, { ok: false, message: 'Invalid username or password.' });
        return;
      }

      const token = createSession(username);
      json(
        res,
        200,
        { ok: true, username },
        { 'Set-Cookie': serializeCookie(SESSION_COOKIE, token, SESSION_TTL_MS / 1000) }
      );
      return;
    }

    if (req.method === 'DELETE' && pathname === '/api/session') {
      if (session) sessions.delete(session.token);
      json(res, 200, { ok: true }, { 'Set-Cookie': clearCookie(SESSION_COOKIE) });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/appointments') {
      const record = appointmentInput(await parseJsonBody(req));
      const error = validateAppointment(record);
      if (error) {
        json(res, 400, { ok: false, message: error });
        return;
      }

      const row = await createAppointment(record);
      json(res, 201, { ok: true, appointmentId: row.id });
      return;
    }

    if (req.method === 'GET' && (pathname === '/api/appointments' || pathname === '/api/admin/appointments')) {
      if (!requireApiAuth(req, res)) return;
      const rows = await listAppointments();
      json(res, 200, { ok: true, total: rows.length, appointments: rows });
      return;
    }

    if (req.method === 'PATCH' && /^\/api\/admin\/appointments\/\d+$/.test(pathname)) {
      if (!requireApiAuth(req, res)) return;
      const appointmentId = Number(pathname.split('/').pop());
      const payload = await parseJsonBody(req);
      const status = String(payload.status || '').trim();
      const adminNotes = typeof payload.adminNotes === 'string' ? payload.adminNotes : '';

      if (status && !APPOINTMENT_STATUSES.includes(status)) {
        json(res, 400, { ok: false, message: 'Invalid appointment status.' });
        return;
      }

      const row = await updateAppointment(appointmentId, { status, adminNotes });
      if (!row) {
        json(res, 404, { ok: false, message: 'Appointment not found.' });
        return;
      }

      json(res, 200, { ok: true, appointment: row });
      return;
    }

    if (req.method === 'GET' && pathname === '/admin') {
      redirect(res, '/admin.html');
      return;
    }

    if (req.method === 'GET' && pathname === '/login') {
      redirect(res, '/login.html');
      return;
    }

    if (req.method === 'GET' && pathname === '/admin.html' && !session) {
      redirect(res, '/login.html');
      return;
    }

    if (req.method === 'GET' && pathname === '/login.html') {
      if (session) {
        redirect(res, '/admin.html');
      } else {
        html(res, 200, LOGIN_PAGE_HTML);
      }
      return;
    }

    await serveFile(req, res, pathname);
  } catch (err) {
    json(res, 500, {
      ok: false,
      message: 'Internal server error.',
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`SBS Hospital server running at http://${HOST}:${PORT}`);
  console.log(`Admin login page: http://${HOST}:${PORT}/login.html`);
  console.log(`Internal DB table: ${INTERNAL_DB_FILE} -> tables.${TABLE_NAME}`);
});
