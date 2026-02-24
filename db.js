const Database = require("better-sqlite3-multiple-ciphers");
const path = require("path");
const fs = require("fs");

const DATA_DIR = path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const db = new Database(path.join(DATA_DIR, "portal.db"), {});

// Decrypt if encryption key is set
const dbKey = process.env.DB_ENCRYPTION_KEY;
if (dbKey) {
  db.pragma(`key='${dbKey}'`);
  try {
    db.prepare("SELECT 1").get();
  } catch (e) {
    db.close();
    throw new Error("Invalid DB_ENCRYPTION_KEY — cannot open database");
  }
}

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ─── SCHEMA ───

db.exec(`
  CREATE TABLE IF NOT EXISTS roster (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    is_admin INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    name TEXT NOT NULL,
    google_sub TEXT UNIQUE,
    avatar_url TEXT,
    is_admin INTEGER NOT NULL DEFAULT 0,
    welcome_email_sent INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    sid TEXT PRIMARY KEY,
    sess TEXT NOT NULL,
    expires INTEGER
  );

  CREATE TABLE IF NOT EXISTS user_preferences (
    user_id INTEGER PRIMARY KEY REFERENCES users(id),
    selected_industries TEXT NOT NULL DEFAULT '[]',
    selected_areas TEXT NOT NULL DEFAULT '[]',
    email_alerts INTEGER NOT NULL DEFAULT 1,
    saved_opps TEXT NOT NULL DEFAULT '[]',
    joined_clubs TEXT NOT NULL DEFAULT '[]',
    internship_history TEXT NOT NULL DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT '',
    members INTEGER NOT NULL DEFAULT 0,
    meet_day TEXT NOT NULL DEFAULT '',
    president_email TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'approved',
    submitted_by TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS opportunities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    org TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    industry TEXT NOT NULL DEFAULT '',
    type TEXT NOT NULL DEFAULT 'Internship',
    location TEXT NOT NULL DEFAULT '',
    deadline TEXT,
    paid INTEGER NOT NULL DEFAULT 0,
    featured INTEGER NOT NULL DEFAULT 0,
    logo TEXT,
    detail_content TEXT NOT NULL DEFAULT '',
    apply_url TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    date TEXT,
    type TEXT NOT NULL DEFAULT '',
    org TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    url TEXT NOT NULL DEFAULT '',
    img TEXT,
    sub_page TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// ─── MIGRATIONS (add columns to existing tables) ───
try { db.exec("ALTER TABLE activities ADD COLUMN status TEXT NOT NULL DEFAULT 'approved'"); } catch (e) {}
try { db.exec("ALTER TABLE activities ADD COLUMN submitted_by TEXT NOT NULL DEFAULT ''"); } catch (e) {}
try { db.exec("ALTER TABLE opportunities ADD COLUMN detail_content TEXT NOT NULL DEFAULT ''"); } catch (e) {}
try { db.exec("ALTER TABLE opportunities ADD COLUMN apply_url TEXT NOT NULL DEFAULT ''"); } catch (e) {}

// ─── ROSTER ───

const rosterInsert = db.prepare(
  "INSERT OR IGNORE INTO roster (name, email, is_admin) VALUES (?, ?, ?)"
);
const rosterAll = db.prepare(`
  SELECT r.*,
    CASE WHEN u.id IS NOT NULL THEN 1 ELSE 0 END AS registered
  FROM roster r
  LEFT JOIN users u ON LOWER(u.email) = LOWER(r.email)
  ORDER BY r.created_at DESC
`);
const rosterDelete = db.prepare("DELETE FROM roster WHERE id = ?");
const rosterFindByEmailStmt = db.prepare(
  "SELECT * FROM roster WHERE LOWER(email) = LOWER(?)"
);

function rosterFindByEmail(email) {
  return rosterFindByEmailStmt.get(email);
}

function addToRoster(name, email, isAdmin = 0) {
  return rosterInsert.run(name, email, isAdmin ? 1 : 0);
}

function bulkAddToRoster(rows) {
  const insert = db.transaction((entries) => {
    for (const { name, email } of entries) {
      rosterInsert.run(name, email, 0);
    }
  });
  insert(rows);
}

function getAllRoster() {
  return rosterAll.all();
}

function removeFromRoster(id) {
  return rosterDelete.run(id);
}

function isOnRoster(email) {
  return !!rosterFindByEmail(email);
}

// ─── USERS ───

const userFindByEmail = db.prepare(
  "SELECT * FROM users WHERE LOWER(email) = LOWER(?)"
);
const userFindById = db.prepare("SELECT * FROM users WHERE id = ?");
const userInsert = db.prepare(
  "INSERT INTO users (email, name, google_sub, avatar_url, is_admin) VALUES (?, ?, ?, ?, ?)"
);
const userUpdate = db.prepare(
  "UPDATE users SET name = ?, google_sub = ?, avatar_url = ? WHERE id = ?"
);
const userMarkWelcomeEmailSent = db.prepare(
  "UPDATE users SET welcome_email_sent = 1 WHERE id = ?"
);
const usersAll = db.prepare(`
  SELECT u.*, up.selected_industries, up.selected_areas, up.email_alerts
  FROM users u
  LEFT JOIN user_preferences up ON up.user_id = u.id
  ORDER BY u.created_at DESC
`);

const userUpdateAdmin = db.prepare(
  "UPDATE users SET is_admin = ? WHERE id = ?"
);

function findOrCreateUser({ email, name, googleSub, avatarUrl, isAdmin }) {
  let user = userFindByEmail.get(email);
  if (user) {
    userUpdate.run(name, googleSub, avatarUrl, user.id);
    // Sync admin status from roster
    const adminVal = isAdmin ? 1 : 0;
    if (user.is_admin !== adminVal) {
      userUpdateAdmin.run(adminVal, user.id);
    }
    const updated = userFindById.get(user.id);
    return { id: updated.id, isNew: false, welcome_email_sent: updated.welcome_email_sent };
  }
  const info = userInsert.run(email, name, googleSub, avatarUrl, isAdmin ? 1 : 0);
  const newUser = userFindById.get(info.lastInsertRowid);
  return { id: newUser.id, isNew: true, welcome_email_sent: newUser.welcome_email_sent };
}

function getUserById(id) {
  return userFindById.get(id);
}

function getAllStudents() {
  return usersAll.all();
}

function markWelcomeEmailSent(userId) {
  userMarkWelcomeEmailSent.run(userId);
}

// ─── PREFERENCES ───

const prefsGet = db.prepare(
  "SELECT * FROM user_preferences WHERE user_id = ?"
);
const prefsUpsert = db.prepare(`
  INSERT INTO user_preferences (user_id, selected_industries, selected_areas, email_alerts, saved_opps, joined_clubs, internship_history)
  VALUES (?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(user_id) DO UPDATE SET
    selected_industries = excluded.selected_industries,
    selected_areas = excluded.selected_areas,
    email_alerts = excluded.email_alerts,
    saved_opps = excluded.saved_opps,
    joined_clubs = excluded.joined_clubs,
    internship_history = excluded.internship_history
`);

function getPreferences(userId) {
  const row = prefsGet.get(userId);
  if (!row) return null;
  return {
    selected_industries: JSON.parse(row.selected_industries),
    selected_areas: JSON.parse(row.selected_areas),
    email_alerts: !!row.email_alerts,
    saved_opps: JSON.parse(row.saved_opps),
    joined_clubs: JSON.parse(row.joined_clubs),
    internship_history: JSON.parse(row.internship_history),
  };
}

function setPreferences(userId, prefs) {
  prefsUpsert.run(
    userId,
    JSON.stringify(prefs.selected_industries || []),
    JSON.stringify(prefs.selected_areas || []),
    prefs.email_alerts ? 1 : 0,
    JSON.stringify(prefs.saved_opps || []),
    JSON.stringify(prefs.joined_clubs || []),
    JSON.stringify(prefs.internship_history || [])
  );
}

// ─── OPPORTUNITIES ───

const oppsAll = db.prepare(
  "SELECT * FROM opportunities ORDER BY featured DESC, created_at DESC"
);
const oppInsert = db.prepare(`
  INSERT INTO opportunities (org, title, description, industry, type, location, deadline, paid, featured, logo, detail_content, apply_url)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const oppDelete = db.prepare("DELETE FROM opportunities WHERE id = ?");
const oppUpdate = db.prepare(`
  UPDATE opportunities SET org=?, title=?, description=?, industry=?, type=?, location=?, deadline=?, paid=?, featured=?, logo=?, detail_content=?, apply_url=?
  WHERE id=?
`);

function getAllOpportunities() {
  return oppsAll.all().map((o) => ({ ...o, paid: !!o.paid, featured: !!o.featured }));
}

function updateOpportunity(id, opp) {
  return oppUpdate.run(
    opp.org, opp.title, opp.description || "",
    opp.industry || "", opp.type || "Internship",
    opp.location || "", opp.deadline || null,
    opp.paid ? 1 : 0, opp.featured ? 1 : 0,
    opp.logo || null, opp.detail_content || "",
    opp.apply_url || "", id
  );
}

function createOpportunity(opp) {
  const info = oppInsert.run(
    opp.org, opp.title, opp.description || "",
    opp.industry || "", opp.type || "Internship",
    opp.location || "", opp.deadline || null,
    opp.paid ? 1 : 0, opp.featured ? 1 : 0,
    opp.logo || null, opp.detail_content || "",
    opp.apply_url || ""
  );
  return info.lastInsertRowid;
}

function deleteOpportunity(id) {
  return oppDelete.run(id);
}

// ─── ACTIVITIES ───

const activitiesAll = db.prepare(
  "SELECT * FROM activities ORDER BY created_at DESC"
);
const activitiesApproved = db.prepare(
  "SELECT * FROM activities WHERE status = 'approved' ORDER BY created_at DESC"
);
const activityInsert = db.prepare(`
  INSERT INTO activities (title, description, category, members, meet_day, president_email, status, submitted_by)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);
const activityDelete = db.prepare("DELETE FROM activities WHERE id = ?");
const activityUpdate = db.prepare(`
  UPDATE activities SET title=?, description=?, category=?, members=?, meet_day=?, president_email=?
  WHERE id=?
`);
const activityApprove = db.prepare(
  "UPDATE activities SET status = 'approved' WHERE id = ?"
);

function getAllActivities() {
  return activitiesAll.all();
}

function getApprovedActivities() {
  return activitiesApproved.all();
}

function approveActivity(id) {
  return activityApprove.run(id);
}

function createActivity(a) {
  const info = activityInsert.run(
    a.title, a.description || "", a.category || "",
    a.members || 0, a.meet_day || "", a.president_email || "",
    a.status || "approved", a.submitted_by || ""
  );
  return info.lastInsertRowid;
}

function updateActivity(id, a) {
  return activityUpdate.run(
    a.title, a.description || "", a.category || "",
    a.members || 0, a.meet_day || "", a.president_email || "",
    id
  );
}

function deleteActivity(id) {
  return activityDelete.run(id);
}

// ─── SEED ACTIVITIES ───

function seedActivities(activities) {
  if (!activities || activities.length === 0) return;
  const count = db.prepare("SELECT COUNT(*) AS c FROM activities").get().c;
  if (count > 0) return;
  const insert = db.transaction((entries) => {
    for (const a of entries) {
      activityInsert.run(
        a.title, a.description || "", a.category || "",
        a.members || 0, a.meet_day || "", a.president_email || "",
        a.status || "approved", a.submitted_by || ""
      );
    }
  });
  insert(activities);
}

// ─── CLUB MEMBERS ───

function getClubMembers(activityId) {
  // Use JSON array-aware matching to avoid partial ID matches (e.g. 1 matching 10, 11)
  const allRows = db.prepare(`
    SELECT u.email, u.name, up.joined_clubs
    FROM users u
    JOIN user_preferences up ON up.user_id = u.id
    WHERE up.joined_clubs != '[]'
  `).all();
  return allRows.filter(row => {
    try {
      const clubs = JSON.parse(row.joined_clubs);
      return Array.isArray(clubs) && clubs.includes(activityId);
    } catch { return false; }
  }).map(({ email, name }) => ({ email, name }));
}

function getActivitiesByPresidentEmail(email) {
  return db.prepare(
    "SELECT * FROM activities WHERE LOWER(president_email) = LOWER(?)"
  ).all(email);
}

// ─── EVENTS ───

const eventsAll = db.prepare(
  "SELECT * FROM events ORDER BY date ASC"
);
const eventInsert = db.prepare(`
  INSERT INTO events (title, date, type, org, description, url, img, sub_page)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);
const eventDelete = db.prepare("DELETE FROM events WHERE id = ?");
const eventUpdate = db.prepare(`
  UPDATE events SET title=?, date=?, type=?, org=?, description=?, url=?, img=?, sub_page=?
  WHERE id=?
`);

function getAllEvents() {
  return eventsAll.all();
}

function createEvent(e) {
  const info = eventInsert.run(
    e.title, e.date || null, e.type || "",
    e.org || "", e.description || "", e.url || "",
    e.img || null, e.sub_page || ""
  );
  return info.lastInsertRowid;
}

function updateEvent(id, e) {
  return eventUpdate.run(
    e.title, e.date || null, e.type || "",
    e.org || "", e.description || "", e.url || "",
    e.img || null, e.sub_page || "", id
  );
}

function deleteEvent(id) {
  return eventDelete.run(id);
}

function seedEvents(events) {
  const count = db.prepare("SELECT COUNT(*) AS c FROM events").get().c;
  if (count > 0) return;
  const insert = db.transaction((entries) => {
    for (const e of entries) {
      eventInsert.run(
        e.title, e.date || null, e.type || "",
        e.org || "", e.description || e.desc || "", e.url || "",
        e.img || null, e.sub_page || e.subPage || ""
      );
    }
  });
  insert(events);
}

// ─── EMAIL TARGETING ───

function getStudentsForNotification(industry) {
  const allRows = db.prepare(`
    SELECT u.email, u.name, up.selected_industries
    FROM users u
    JOIN user_preferences up ON up.user_id = u.id
    WHERE up.email_alerts = 1
      AND up.selected_industries != '[]'
  `).all();
  return allRows.filter(row => {
    try {
      const industries = JSON.parse(row.selected_industries);
      return Array.isArray(industries) && industries.includes(industry);
    } catch { return false; }
  }).map(({ email, name }) => ({ email, name }));
}

// ─── SESSION STORE (for express-session) ───

class SQLiteStore {
  constructor(session) {
    const Store = session.Store;
    class S extends Store {
      constructor(opts) {
        super(opts);
        // Clean up expired sessions every hour
        this._cleanupInterval = setInterval(() => {
          try {
            db.prepare("DELETE FROM sessions WHERE expires <= ?").run(Date.now());
          } catch (e) { /* ignore cleanup errors */ }
        }, 60 * 60 * 1000);
        // Run initial cleanup
        try { db.prepare("DELETE FROM sessions WHERE expires <= ?").run(Date.now()); } catch (e) {}
      }
      get(sid, cb) {
        try {
          const row = db.prepare("SELECT sess FROM sessions WHERE sid = ? AND expires > ?").get(sid, Date.now());
          cb(null, row ? JSON.parse(row.sess) : null);
        } catch (e) { cb(e); }
      }
      set(sid, sess, cb) {
        try {
          const expires = sess.cookie && sess.cookie.expires
            ? new Date(sess.cookie.expires).getTime()
            : Date.now() + 86400000;
          db.prepare("INSERT OR REPLACE INTO sessions (sid, sess, expires) VALUES (?, ?, ?)").run(sid, JSON.stringify(sess), expires);
          cb && cb(null);
        } catch (e) { cb && cb(e); }
      }
      destroy(sid, cb) {
        try {
          db.prepare("DELETE FROM sessions WHERE sid = ?").run(sid);
          cb && cb(null);
        } catch (e) { cb && cb(e); }
      }
      touch(sid, sess, cb) {
        this.set(sid, sess, cb);
      }
    }
    return new S({});
  }
}

// ─── SEED ADMIN ───

function seedAdminEmails(emails) {
  for (const email of emails) {
    const trimmed = email.trim();
    if (!trimmed) continue;
    const existing = rosterFindByEmailStmt.get(trimmed);
    if (!existing) {
      rosterInsert.run(trimmed.split("@")[0], trimmed, 1);
    } else if (!existing.is_admin) {
      db.prepare("UPDATE roster SET is_admin = 1 WHERE id = ?").run(existing.id);
    }
  }
}

// ─── SEED OPPORTUNITIES ───

function seedOpportunities(opps) {
  const count = db.prepare("SELECT COUNT(*) AS c FROM opportunities").get().c;
  if (count > 0) return; // already has data
  const insert = db.transaction((entries) => {
    for (const o of entries) {
      oppInsert.run(
        o.org, o.title, o.description || "",
        o.industry || "", o.type || "Internship",
        o.location || "", o.deadline || null,
        o.paid ? 1 : 0, o.featured ? 1 : 0,
        o.logo || null, o.detail_content || "",
        o.apply_url || ""
      );
    }
  });
  insert(opps);
}

module.exports = {
  db,
  SQLiteStore,
  addToRoster,
  bulkAddToRoster,
  getAllRoster,
  removeFromRoster,
  isOnRoster,
  findOrCreateUser,
  getUserById,
  getAllStudents,
  markWelcomeEmailSent,
  getPreferences,
  setPreferences,
  getAllOpportunities,
  createOpportunity,
  updateOpportunity,
  deleteOpportunity,
  getStudentsForNotification,
  seedAdminEmails,
  rosterFindByEmail,
  seedOpportunities,
  getAllActivities,
  getApprovedActivities,
  approveActivity,
  createActivity,
  updateActivity,
  deleteActivity,
  seedActivities,
  getClubMembers,
  getActivitiesByPresidentEmail,
  getAllEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  seedEvents,
};
