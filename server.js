require("dotenv").config();
const express = require("express");
const session = require("express-session");
const path = require("path");
const fs = require("fs");

const {
  db,
  SQLiteStore,
  seedAdminEmails,
  isOnRoster,
  rosterFindByEmail,
  findOrCreateUser,
  getUserById,
  markWelcomeEmailSent,
  getAllRoster,
  addToRoster,
  removeFromRoster,
  bulkAddToRoster,
  getPreferences,
  setPreferences,
  getAllOpportunities,
  createOpportunity,
  updateOpportunity,
  deleteOpportunity,
  getStudentsForNotification,
  getAllStudents,
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
  getAllClubEvents,
  getClubEventsByActivity,
  getClubEventById,
  createClubEvent,
  updateClubEvent,
  deleteClubEvent,
  getAllEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  seedEvents,
  getAllBlogPosts,
  getBlogPostById,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
} = require("./db");
const { sendWelcomeEmail, sendOpportunityNotification, sendClubEmail, sendClubSubmissionNotification } = require("./email");

const PORT = process.env.PORT || 3333;
const DIR = __dirname;
const IS_PROD = process.env.NODE_ENV === "production";

const app = express();

// ─── MIDDLEWARE ───

if (IS_PROD) app.set("trust proxy", 1);

// Canonicalize host in production to avoid OAuth origin mismatches on www.
if (IS_PROD) {
  app.use((req, res, next) => {
    const host = String(req.headers.host || "").toLowerCase();
    if (host.startsWith("www.uaustinportal.org")) {
      return res.redirect(301, "https://uaustinportal.org" + req.originalUrl);
    }
    next();
  });
}

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: false, limit: "5mb" }));

// Simple in-memory rate limiter
const rateLimits = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimits) {
    if (now - entry.start > 120000) rateLimits.delete(key);
  }
}, 60000);
function rateLimit(windowMs, max) {
  return (req, res, next) => {
    const key = req.ip + ":" + req.path;
    const now = Date.now();
    let entry = rateLimits.get(key);
    if (!entry || now - entry.start > windowMs) {
      entry = { start: now, count: 0 };
      rateLimits.set(key, entry);
    }
    entry.count++;
    if (entry.count > max) return res.status(429).json({ error: "Too many requests" });
    next();
  };
}

const store = new SQLiteStore(session);
app.use(
  session({
    store,
    secret: process.env.SESSION_SECRET || "dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: "lax",
      secure: IS_PROD,
      httpOnly: true,
    },
  })
);

// ─── SEED ADMIN ───

if (process.env.ADMIN_EMAILS) {
  seedAdminEmails(process.env.ADMIN_EMAILS.split(","));
}

// Seed built-in opportunities into DB on first run
seedOpportunities([
  { org:"GovAI", title:"DC Senate Fellowship", industry:"Government", type:"Fellowship", deadline:"2026-06-01", description:"Staffing a policy advisor in a U.S. Senate office, conducting legislative research, attending briefings, and supporting policy development on AI governance and technology issues.", location:"Washington, D.C.", paid:true, featured:true, logo:"/images/Opportunities/govai.png" },
  { org:"RepublicanJobs.com", title:"Job Placement", industry:"Consulting", type:"Program", deadline:"2026-04-15", description:"A political recruitment and placement platform connecting candidates with job and internship opportunities across the Republican political ecosystem.", location:"Remote", paid:true, featured:false, logo:"/images/Opportunities/republicanjobs.png" },
  { org:"Colloquium", title:"DC Political Science Journal", industry:"Media & Journalism", type:"Internship", deadline:"2026-04-12", description:"An opportunity to contribute to a political science journal based in Washington, D.C.", location:"Washington, D.C.", paid:false, featured:false },
  { org:"Office of the Texas Governor", title:"Multiple Roles", industry:"Government", type:"Internship", deadline:"2026-03-20", description:"Internship offerings in various departments within the Governor's office, including legislative affairs, communications, and constituent services.", location:"Austin, TX", paid:false, featured:true, logo:"/images/Opportunities/texas-governor.png" },
  { org:"Casas por Cristo", title:"Multiple Roles", industry:"Nonprofit", type:"Internship", deadline:"2026-04-10", description:"A nonprofit dedicated to building safe, decent homes for families in need. Roles in building, administration, and mission trips.", location:"El Paso, TX", paid:false, featured:false, logo:"/images/Opportunities/casas.png" },
  { org:"Maynard Nexsen", title:"Legal Internship Program", industry:"Law & Policy", type:"Internship", deadline:"2026-02-27", description:"A 12-month legal internship at a national, full-service law firm with nearly 600 attorneys across 31 U.S. locations.", location:"Austin, TX", paid:true, featured:true, logo:"/images/Opportunities/maynard-nexsen.png" },
  { org:"Setna iO", title:"Multiple Roles", industry:"Technology", type:"Internship", deadline:"2026-03-28", description:"10\u201315 internship positions in aerospace supply chain across operations, engineering, data, and related fields.", location:"Multiple U.S. Locations", paid:true, featured:false, logo:"/images/Opportunities/setna-io.png" },
  { org:"Hertog Foundation", title:"Summer Fellowship", industry:"Education", type:"Fellowship", deadline:"2026-04-05", description:"Nationally competitive educational programs for aspiring leaders passionate about shaping the intellectual, civic, and political life of the United States.", location:"Washington, D.C.", paid:true, featured:false, logo:"/images/Opportunities/hertog.png" },
  { org:"Senator Ted Cruz", title:"Summer Intern", industry:"Government", type:"Internship", deadline:"2026-03-06", description:"Experience the inner workings of Congress through legislative research, constituent services, and Capitol Hill operations.", location:"Washington, D.C. / Texas", paid:true, featured:false, logo:"/images/Opportunities/senator-cruz.png" },
  { org:"New American Industrial Alliance", title:"Content Manager", industry:"Consulting", type:"Internship", deadline:"2026-04-15", description:"Lead content creation and audience growth for a trade organization revitalizing American industry, backed by top VC firms.", location:"Washington, D.C.", paid:true, featured:false, logo:"/images/Opportunities/naia.png" },
  { org:"Futures Forge", title:"Facilitator", industry:"Education", type:"Internship", deadline:"2026-04-08", description:"9-week paid role coaching high school students through hands-on challenges in Boston. Room & board covered.", location:"Boston, MA", paid:true, featured:false, logo:"/images/Opportunities/futures-forge.png" },
  { org:"UATX", title:"Work Study", industry:"Education", type:"Program", deadline:"2026-05-01", description:"The UATX Work Study program provides on-campus employment opportunities that allow students to develop professional skills.", location:"Austin, TX", paid:true, featured:false, logo:"/images/Opportunities/uatx.png" },
  { org:"Hudson Institute", title:"Political Studies Summer Fellowship", industry:"Government", type:"Fellowship", deadline:"2026-03-22", description:"A six-week education in political theory and practice with rigorous seminars, policy workshops, and a distinguished speaker series.", location:"Washington, D.C.", paid:true, featured:true, logo:"/images/Opportunities/hudson.png" },
  { org:"Senator Barry Finegold", title:"Summer Internship", industry:"Government", type:"Internship", deadline:"2026-04-20", description:"Gain firsthand experience in state government, public policy, and constituent services at the Massachusetts State House.", location:"Boston, MA", paid:false, featured:false, logo:"/images/Opportunities/finegold.png" },
  { org:"Claremont Institute", title:"Publius Research Fellowship", industry:"Government", type:"Fellowship", deadline:"2026-03-30", description:"Study American political thought and constitutional governance through this competitive fellowship.", location:"Claremont, CA", paid:true, featured:true, logo:"/images/Opportunities/claremont.png" },
  { org:"Claremont Institute", title:"Research Assistant", industry:"Government", type:"Internship", deadline:"2026-04-15", description:"Assist senior fellows with research on constitutional law, political philosophy, and public policy.", location:"Claremont, CA", paid:true, featured:false, logo:"/images/Opportunities/claremont.png" },
  { org:"Open the Books", title:"Multiple Roles", industry:"Nonprofit", type:"Internship", deadline:"2026-04-10", description:"The nation's flagship transparency organization with paid contributor, fellowship, and scholarship opportunities.", location:"Remote", paid:true, featured:false, logo:"/images/Opportunities/open-the-books.png" },
  { org:"First Court of Appeals", title:"Summer Internship", industry:"Law & Policy", type:"Internship", deadline:"2026-03-28", description:"Research factual and legal issues, review appellate records, write memoranda of law, and observe oral arguments.", location:"Austin, TX", paid:false, featured:false, logo:"/images/Opportunities/first-court.png" },
  { org:"Cicero Institute", title:"Summer Research Fellowship", industry:"Government", type:"Fellowship", deadline:"2026-03-15", description:"Part-time summer research assistants identify system-level problems and develop policy responses in Austin, TX. $650/week.", location:"Austin, TX", paid:true, featured:true, logo:"/images/Opportunities/cicero.png" },
  { org:"Cicero Institute", title:"Research Assistant", industry:"Government", type:"Internship", deadline:"2026-04-01", description:"Entry-level position supporting state-focused policy reforms through rigorous research and polished written products.", location:"Austin, TX", paid:true, featured:false, logo:"/images/Opportunities/cicero.png" },
  { org:"The American Housing Corporation", title:"Summer 2026 Internship", industry:"Technology", type:"Internship", deadline:"2026-04-15", description:"Opportunities in Engineering, Design, Marketing, Architecture, and Supply Chain at a startup solving the housing crisis.", location:"TBD", paid:true, featured:false },
]);

// Seed events into DB on first run
seedEvents([
  { title:"Texas Stock Exchange Visit", date:"2026-04-01", type:"Student Visit", org:"UATX", desc:"Meet the founders of the newly established TXSE national securities exchange in Dallas for a private tour and lunch.", url:"https://www.txse.com/", img:"/images/UATX Sponsered Events & Travel/txse.png", subPage:"event-txse" },
  { title:"AHA Foundation — If Not Now Fellowship", date:"2026-05-17", type:"VIP Event Partnership", org:"AHA Foundation", desc:"A week-long immersive fellowship in NYC equipping student leaders to confront antisemitism on campus.", url:"https://www.theahafoundation.org/if-not-now-fellowship/", img:"/images/UATX Sponsered Events & Travel/aha.png", subPage:"event-aha" },
  { title:"Study Abroad: Israel", date:"2026-06-21", type:"Study Abroad", org:"UATX", desc:"An 11-day program exploring Israeli history, culture, and geopolitics with visits to Jerusalem, Judea & Samaria, and the Gaza Envelope.", url:"https://herutna.org/", subPage:"event-israel" },
  { title:"AEI Summer Honors Program", date:"2026-06-01", type:"Summer Program", org:"AEI", desc:"Fully funded one-week policy seminars in Washington, D.C. with leading AEI scholars on economics, foreign policy, and governance.", url:"https://www.aei.org/shp/", img:"/images/UATX Sponsered Events & Travel/aei.png", subPage:"event-aei" },
  { title:"Austin Institute — The Student Forum", date:"2026-02-04", type:"Seminar Series", org:"Austin Institute", desc:"A seminar series exploring Tocqueville's study of American mores through the lenses of religion, science, and the state.", url:"https://www.austin-institute.org/", img:"/images/UATX Sponsered Events & Travel/austin-institute.png", subPage:"event-austin-institute" },
  { title:"Pepperdine School of Public Policy", date:"2026-02-06", type:"Multiple Programs", org:"Pepperdine", desc:"Graduate and undergraduate policy programs including a full-tuition Middle East Policy Studies degree at Pepperdine's D.C. campus.", url:"https://publicpolicy.pepperdine.edu/", img:"/images/UATX Sponsered Events & Travel/pepperdine.png", subPage:"event-pepperdine" },
  { title:"Coign & Forge — Leadership Summit", date:"2026-06-15", type:"Conference", org:"Coign & Forge", desc:"Win an all-expenses-paid spot at a five-day leadership summit featuring media training, legislative simulations, and networking.", url:"https://forgeleadership.org/", img:"/images/UATX Sponsered Events & Travel/forge.png", subPage:"event-forge" },
  { title:"Ronald Reagan Institute Programs", date:"2026-06-02", type:"Multiple Programs", org:"Reagan Institute", desc:"Fellowships and programs in leadership, national defense, and civic education grounded in President Reagan's principles.", url:"https://www.reaganfoundation.org/reagan-institute/", img:"/images/UATX Sponsered Events & Travel/reagan.png", subPage:"event-reagan" },
]);

// ─── AUTH HELPERS ───

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
  const user = getUserById(req.session.userId);
  if (!user || !user.is_admin) return res.status(403).json({ error: "Admin access required" });
  next();
}

function isLocalRequest(req) {
  const ip = String(req.ip || "").toLowerCase();
  const host = String(req.hostname || "").toLowerCase();
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    ip === "::1" ||
    ip === "127.0.0.1" ||
    ip === "::ffff:127.0.0.1"
  );
}

function normalizePublicUrl(value, { allowRelative = false } = {}) {
  if (typeof value !== "string") return "";
  let v = value.trim();
  if (!v) return "";

  const driveMatch = v.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  if (driveMatch) return `https://drive.google.com/uc?export=view&id=${driveMatch[1]}`;

  if (v.startsWith("data:image/")) return v;
  if (v.startsWith("//")) return "https:" + v;
  if (v.startsWith("http://")) return "https://" + v.slice(7);
  if (/^https?:\/\//i.test(v)) return v;
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(v)) return "https://" + v;

  if (v.startsWith("UATX Portal Images/")) return "/images/" + v.slice("UATX Portal Images/".length);
  if (v.startsWith("images/")) return "/" + v;
  if (allowRelative && v.startsWith("/")) return v;
  if (allowRelative && /^[^:]+$/.test(v)) return "/" + v.replace(/^\/+/, "");
  return "";
}

function normalizeOpportunity(opportunity) {
  const o = { ...opportunity };
  o.org = typeof o.org === "string" ? o.org.trim() : "";
  o.title = typeof o.title === "string" ? o.title.trim() : "";
  o.industry = typeof o.industry === "string" ? o.industry.trim() : "";
  o.type = typeof o.type === "string" ? o.type.trim() : "";
  o.location = typeof o.location === "string" ? o.location.trim() : "";
  o.description = typeof o.description === "string" ? o.description.trim() : "";
  o.detail_content = typeof o.detail_content === "string" ? o.detail_content.trim() : "";
  o.deadline = typeof o.deadline === "string" && o.deadline.trim() ? o.deadline.trim() : null;
  o.logo = normalizePublicUrl(o.logo || "", { allowRelative: true }) || null;
  o.apply_url = normalizePublicUrl(o.apply_url || "", { allowRelative: false }) || "";
  return o;
}

function normalizeClubEmailPrefs(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out = {};
  for (const [key, raw] of Object.entries(value)) {
    if (key.length > 24) continue;
    if (!/^\d+$/.test(key)) continue;
    out[key] = !!raw;
  }
  return out;
}

function getTodayISODate() {
  const now = new Date();
  const tzOffsetMs = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - tzOffsetMs).toISOString().split("T")[0];
}

function normalizeDateOnly(value) {
  if (!value || typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw) return null;
  const dateOnly = raw.split("T")[0].trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return dateOnly;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  const tzOffsetMs = parsed.getTimezoneOffset() * 60000;
  return new Date(parsed.getTime() - tzOffsetMs).toISOString().split("T")[0];
}

function isPastDateOnly(value) {
  const dateOnly = normalizeDateOnly(value);
  if (!dateOnly) return false;
  return dateOnly < getTodayISODate();
}

function isOpportunityDeadlineHit(value) {
  const dateOnly = normalizeDateOnly(value);
  if (!dateOnly) return false;
  return dateOnly <= getTodayISODate();
}

function isEventDateHit(value) {
  const dateOnly = normalizeDateOnly(value);
  if (!dateOnly) return false;
  return dateOnly <= getTodayISODate();
}

const COMMUNITY_EVENT_TYPES = new Set(["Student Life", "Residential Life"]);

function normalizeAdminEventPayload(rawEvent) {
  const event = rawEvent && typeof rawEvent === "object" ? { ...rawEvent } : {};
  event.title = typeof event.title === "string" ? event.title.trim() : "";
  event.org = typeof event.org === "string" ? event.org.trim() : "";
  event.type = typeof event.type === "string" ? event.type.trim() : "";
  event.description = typeof event.description === "string" ? event.description.trim() : "";
  event.detail_content = typeof event.detail_content === "string" ? event.detail_content.trim() : "";
  event.url = typeof event.url === "string" ? event.url.trim() : "";
  event.img = typeof event.img === "string" ? event.img.trim() : "";
  event.date = typeof event.date === "string" && event.date.trim() ? event.date.trim() : null;
  event.sub_page = typeof event.sub_page === "string" ? event.sub_page.trim() : "";
  event.is_community = !!event.is_community;

  if (event.is_community && !COMMUNITY_EVENT_TYPES.has(event.type)) {
    event.type = "Student Life";
  }
  return event;
}

// ─── PUBLIC CONFIG (exposes Google Client ID to frontend) ───

app.get("/api/config", (req, res) => {
  res.json({ googleClientId: process.env.GOOGLE_CLIENT_ID || "" });
});

// ─── STATIC ROUTES (preserve existing behavior) ───

app.get("/", (req, res) => res.sendFile(path.join(DIR, "uatx-portal-prototype.html")));
app.get("/admin", (req, res) => res.sendFile(path.join(DIR, "admin.html")));

// Serve images from "UATX Portal Images" folder
app.use("/images", express.static(path.join(DIR, "UATX Portal Images")));

// ─── ICS CALENDAR FEED ───

function icsDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function icsEscape(str) {
  return (str || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

app.get("/calendar/uatx-events.ics", (req, res) => {
  const events = getAllEvents();
  const opps = getAllOpportunities();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//UATX Portal//EN",
    "X-WR-CALNAME:UATX Portal",
    "X-WR-CALDESC:Events and deadlines from the UATX Student Portal",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  events.forEach((ev, i) => {
    const dt = icsDate(ev.date);
    if (!dt) return;
    lines.push("BEGIN:VEVENT");
    lines.push("UID:event-" + (ev.id || i) + "@uaustinportal.org");
    lines.push("DTSTART:" + dt);
    lines.push("SUMMARY:" + icsEscape(ev.title));
    if (ev.desc) lines.push("DESCRIPTION:" + icsEscape(ev.desc));
    if (ev.org) lines.push('ORGANIZER;CN="' + icsEscape(ev.org) + '":mailto:noreply@uaustinportal.org');
    lines.push("END:VEVENT");
  });

  opps.forEach((opp, i) => {
    const dt = icsDate(opp.deadline);
    if (!dt) return;
    lines.push("BEGIN:VEVENT");
    lines.push("UID:deadline-" + (opp.id || i) + "@uaustinportal.org");
    lines.push("DTSTART:" + dt);
    lines.push("SUMMARY:[Deadline] " + icsEscape(opp.org + " — " + opp.title));
    if (opp.description) lines.push("DESCRIPTION:" + icsEscape(opp.description));
    if (opp.location) lines.push("LOCATION:" + icsEscape(opp.location));
    lines.push("END:VEVENT");
  });

  lines.push("END:VCALENDAR");
  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="uatx-events.ics"');
  res.send(lines.join("\r\n"));
});

// ─── AUTH ROUTES ───

app.post("/api/auth/google", rateLimit(60000, 10), async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: "Missing credential" });

  try {
    // Validate JWT with Google
    const tokenRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`
    );
    if (!tokenRes.ok) return res.status(401).json({ error: "Invalid token" });

    const payload = await tokenRes.json();
    const rawEmail = String(payload.email || "").trim();
    const email = rawEmail.toLowerCase();
    const name = String(payload.name || "").trim();
    const googleSub = payload.sub;
    const avatarUrl = payload.picture;
    const hd = String(payload.hd || "").toLowerCase();

    if (!email || !googleSub) {
      return res.status(401).json({ error: "Invalid Google account payload" });
    }

    if (payload.email_verified === false || payload.verified_email === false) {
      return res.status(403).json({ error: "Google email must be verified" });
    }

    // Restrict to UATX domains (students + faculty)
    const ALLOWED_DOMAINS = ["student.uaustin.org", "uaustin.org"];
    const emailDomain = email.includes("@") ? email.split("@")[1] : "";
    if (!ALLOWED_DOMAINS.includes(hd) && !ALLOWED_DOMAINS.includes(emailDomain)) {
      return res.status(403).json({ error: "Only @student.uaustin.org and @uaustin.org accounts are allowed" });
    }

    // Check roster (faculty admins bypass roster check)
    const isAdminEmail = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).includes(email.toLowerCase());
    if (!isOnRoster(email) && !isAdminEmail) {
      // Auto-add admin emails to roster if not already there
      return res.status(403).json({
        error: "You are not on the roster. Contact your administrator to be added.",
      });
    }

    // Auto-add admin-email users to roster if missing
    if (!isOnRoster(email) && isAdminEmail) {
      addToRoster(name, email, 1);
    }

    // Check if this email is an admin on the roster
    const rosterEntry = rosterFindByEmail(email);
    const isAdmin = rosterEntry && rosterEntry.is_admin;

    // Create or update user
    const { id, isNew, welcome_email_sent } = findOrCreateUser({
      email, name, googleSub, avatarUrl, isAdmin,
    });

    // Set session
    req.session.userId = id;

    // Send welcome email on first sign-in
    if (isNew && !welcome_email_sent) {
      sendWelcomeEmail(email, name).then(() => markWelcomeEmailSent(id)).catch(console.error);
    }

    const user = getUserById(id);
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
        is_admin: !!user.is_admin,
      },
    });
  } catch (err) {
    console.error("[auth] Google validation error:", err.message);
    res.status(500).json({ error: "Authentication failed" });
  }
});

// Local dev fallback login when Google client ID is not configured
app.post("/api/auth/dev-login", rateLimit(60000, 10), (req, res) => {
  if (IS_PROD) return res.status(403).json({ error: "Not available in production" });
  if (!isLocalRequest(req)) return res.status(403).json({ error: "Localhost only" });

  const email = String(req.body?.email || "").trim().toLowerCase();
  const name = String(req.body?.name || "").trim() || "Local Dev User";
  if (!email) return res.status(400).json({ error: "Email is required" });

  const allowed =
    email.endsWith("@student.uaustin.org") || email.endsWith("@uaustin.org");
  if (!allowed) {
    return res.status(400).json({ error: "Use a @student.uaustin.org or @uaustin.org email" });
  }

  // Local dev login defaults to admin access for ease of local testing
  const forceAdmin = process.env.LOCAL_DEV_FORCE_ADMIN !== "0";
  const rosterName = name || email.split("@")[0];
  if (!isOnRoster(email)) addToRoster(rosterName, email, forceAdmin ? 1 : 0);

  const rosterEntry = rosterFindByEmail(email);
  const { id } = findOrCreateUser({
    email,
    name: rosterName,
    googleSub: null,
    avatarUrl: null,
    isAdmin: forceAdmin || !!(rosterEntry && rosterEntry.is_admin),
  });

  req.session.userId = id;
  const user = getUserById(id);
  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
      is_admin: !!user.is_admin,
    },
  });
});

app.get("/api/auth/me", (req, res) => {
  if (!req.session.userId) return res.json({ user: null });
  const user = getUserById(req.session.userId);
  if (!user) return res.json({ user: null });
  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
      is_admin: !!user.is_admin,
    },
  });
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: "Logout failed" });
    res.json({ ok: true });
  });
});

// ─── PREFERENCES ROUTES ───

app.get("/api/preferences", requireAuth, (req, res) => {
  const prefs = getPreferences(req.session.userId);
  res.json({ preferences: prefs });
});

app.put("/api/preferences", requireAuth, (req, res) => {
  const body = req.body;
  const MAX_ARRAY = 100;
  if (body.selected_industries && body.selected_industries.length > MAX_ARRAY) return res.status(400).json({ error: "Too many industries" });
  if (body.selected_areas && body.selected_areas.length > MAX_ARRAY) return res.status(400).json({ error: "Too many areas" });
  if (body.saved_opps && body.saved_opps.length > 500) return res.status(400).json({ error: "Too many saved opportunities" });
  if (body.joined_clubs && body.joined_clubs.length > 500) return res.status(400).json({ error: "Too many joined clubs" });
  if (body.internship_history && body.internship_history.length > 50) return res.status(400).json({ error: "Too many internship history entries" });
  if (body.club_email_prefs && (typeof body.club_email_prefs !== "object" || Array.isArray(body.club_email_prefs))) {
    return res.status(400).json({ error: "Invalid club email preferences" });
  }
  const clubEmailPrefKeys = body.club_email_prefs ? Object.keys(body.club_email_prefs) : [];
  if (clubEmailPrefKeys.length > 500) return res.status(400).json({ error: "Too many club email preferences" });
  if (JSON.stringify(body).length > 50000) return res.status(400).json({ error: "Payload too large" });
  setPreferences(req.session.userId, {
    ...body,
    club_email_prefs: normalizeClubEmailPrefs(body.club_email_prefs || {}),
  });
  res.json({ ok: true });
});

// ─── OPPORTUNITIES ROUTES ───

app.get("/api/opportunities", requireAuth, (req, res) => {
  const opportunities = getAllOpportunities().filter((opp) => !isOpportunityDeadlineHit(opp.deadline));
  res.json({ opportunities });
});

// ─── EVENTS ROUTES ───

app.get("/api/events", requireAuth, (req, res) => {
  const events = getAllEvents().filter((event) => event.is_community || !isEventDateHit(event.date));
  res.json({ events });
});

// ─── ACTIVITIES ROUTES ───

app.get("/api/activities", requireAuth, (req, res) => {
  res.json({ activities: getApprovedActivities() });
});

// ─── STUDENT ACTIVITY SUBMISSION ───

app.post("/api/activities", requireAuth, async (req, res) => {
  const { activity } = req.body;
  if (!activity || !activity.title) return res.status(400).json({ error: "Title is required" });
  const user = getUserById(req.session.userId);
  activity.status = "pending";
  activity.submitted_by = user.email;
  createActivity(activity);

  // Email admin about the submission
  const adminEmail = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(",")[0].trim() : null;
  if (adminEmail) {
    await sendClubSubmissionNotification(adminEmail, activity, user.name);
  }

  res.json({ ok: true });
});

// Get clubs the current user is president of
app.get("/api/my-clubs", requireAuth, (req, res) => {
  const user = getUserById(req.session.userId);
  const clubs = getActivitiesByPresidentEmail(user.email);
  res.json({ clubs });
});

// Club events shown in profile/community/calendar
app.get("/api/club-events", requireAuth, (req, res) => {
  res.json({ club_events: getAllClubEvents() });
});

// Events for a specific club
app.get("/api/activities/:id/events", requireAuth, (req, res) => {
  const activityId = parseInt(req.params.id, 10);
  if (!Number.isInteger(activityId)) return res.status(400).json({ error: "Invalid activity id" });
  res.json({ events: getClubEventsByActivity(activityId) });
});

// President updates club general information
app.put("/api/activities/:id", requireAuth, (req, res) => {
  const activityId = parseInt(req.params.id, 10);
  if (!Number.isInteger(activityId)) return res.status(400).json({ error: "Invalid activity id" });

  const user = getUserById(req.session.userId);
  const club = getActivitiesByPresidentEmail(user.email).find(a => a.id === activityId);
  if (!club) return res.status(403).json({ error: "You are not the president of this club" });

  const payload = (req.body && req.body.activity) || {};
  const title = String(payload.title || "").trim();
  if (!title) return res.status(400).json({ error: "Club title is required" });

  const nextClub = {
    title,
    description: String(payload.description || "").trim(),
    detail_content: String(payload.detail_content || "").trim(),
    category: String(payload.category || "").trim(),
    members: Number.isFinite(Number(club.members)) ? Number(club.members) : 0,
    meet_day: String(payload.meet_day || "").trim(),
    president_email: String(club.president_email || "").trim(),
    show_as_event: !!club.show_as_event,
    event_title: String(club.event_title || "").trim(),
    event_date: String(club.event_date || "").trim(),
    event_location: String(club.event_location || "").trim(),
    event_description: String(club.event_description || "").trim(),
  };

  updateActivity(activityId, nextClub);
  const updated = getAllActivities().find(a => a.id === activityId) || nextClub;
  res.json({ ok: true, activity: updated });
});

// President creates club event
app.post("/api/activities/:id/events", requireAuth, (req, res) => {
  const activityId = parseInt(req.params.id, 10);
  if (!Number.isInteger(activityId)) return res.status(400).json({ error: "Invalid activity id" });

  const user = getUserById(req.session.userId);
  const club = getActivitiesByPresidentEmail(user.email).find(a => a.id === activityId);
  if (!club) return res.status(403).json({ error: "You are not the president of this club" });

  const event = req.body || {};
  const title = String(event.title || "").trim();
  if (!title) return res.status(400).json({ error: "Event title is required" });
  if (isPastDateOnly(event.date)) return res.status(400).json({ error: "Event date cannot be in the past" });

  createClubEvent({
    activity_id: activityId,
    title,
    date: event.date || null,
    location: String(event.location || "").trim(),
    description: String(event.description || "").trim(),
    detail_content: String(event.detail_content || "").trim(),
  });
  res.json({ ok: true, events: getClubEventsByActivity(activityId) });
});

// President edits club event
app.put("/api/club-events/:id", requireAuth, (req, res) => {
  const eventId = parseInt(req.params.id, 10);
  if (!Number.isInteger(eventId)) return res.status(400).json({ error: "Invalid event id" });

  const existing = getClubEventById(eventId);
  if (!existing) return res.status(404).json({ error: "Event not found" });

  const user = getUserById(req.session.userId);
  const club = getActivitiesByPresidentEmail(user.email).find(a => a.id === existing.activity_id);
  if (!club) return res.status(403).json({ error: "You are not the president of this club" });

  const event = req.body || {};
  const title = String(event.title || "").trim();
  if (!title) return res.status(400).json({ error: "Event title is required" });
  if (isPastDateOnly(event.date)) return res.status(400).json({ error: "Event date cannot be in the past" });

  updateClubEvent(eventId, {
    title,
    date: event.date || null,
    location: String(event.location || "").trim(),
    description: String(event.description || "").trim(),
    detail_content: String(event.detail_content || "").trim(),
  });
  res.json({ ok: true, events: getClubEventsByActivity(existing.activity_id) });
});

// President deletes club event
app.delete("/api/club-events/:id", requireAuth, (req, res) => {
  const eventId = parseInt(req.params.id, 10);
  if (!Number.isInteger(eventId)) return res.status(400).json({ error: "Invalid event id" });

  const existing = getClubEventById(eventId);
  if (!existing) return res.status(404).json({ error: "Event not found" });

  const user = getUserById(req.session.userId);
  const club = getActivitiesByPresidentEmail(user.email).find(a => a.id === existing.activity_id);
  if (!club) return res.status(403).json({ error: "You are not the president of this club" });

  deleteClubEvent(eventId);
  res.json({ ok: true, events: getClubEventsByActivity(existing.activity_id) });
});

// President sends email to all club members
app.post("/api/activities/:id/email", requireAuth, rateLimit(60000, 5), async (req, res) => {
  const user = getUserById(req.session.userId);
  const activities = getActivitiesByPresidentEmail(user.email);
  const club = activities.find(a => a.id === parseInt(req.params.id));
  if (!club) return res.status(403).json({ error: "You are not the president of this club" });

  const { subject, message } = req.body;
  if (!subject || !message) return res.status(400).json({ error: "Subject and message are required" });

  const members = getClubMembers(club.id);
  let sent = 0;
  for (const member of members) {
    await sendClubEmail(member.email, member.name, club.title, user.name, user.email, subject, message);
    sent++;
  }
  res.json({ ok: true, sent });
});

// Get member emails for a club (president only)
app.get("/api/activities/:id/members", requireAuth, (req, res) => {
  const user = getUserById(req.session.userId);
  const activities = getActivitiesByPresidentEmail(user.email);
  const club = activities.find(a => a.id === parseInt(req.params.id));
  if (!club) return res.status(403).json({ error: "You are not the president of this club" });
  const members = getClubMembers(club.id);
  res.json({ members });
});

// ─── ADMIN ROUTES ───

const ROSTER_EXPORT_COLUMNS = [
  { key: "roster_name", label: "Roster Name" },
  { key: "roster_email", label: "Roster Email" },
  { key: "roster_is_admin", label: "Roster Admin" },
  { key: "roster_added_at", label: "Roster Added At" },
  { key: "registered", label: "Registered In Portal" },
  { key: "user_id", label: "Portal User ID" },
  { key: "user_name", label: "Portal Name" },
  { key: "user_email", label: "Portal Email" },
  { key: "user_is_admin", label: "Portal Admin" },
  { key: "welcome_email_sent", label: "Welcome Email Sent" },
  { key: "user_created_at", label: "Portal Created At" },
  { key: "avatar_url", label: "Avatar URL" },
  { key: "google_sub", label: "Google Subject ID" },
  { key: "selected_industries", label: "Selected Industries" },
  { key: "selected_areas", label: "Selected Areas" },
  { key: "email_alerts", label: "Email Alerts Enabled" },
  { key: "saved_opps_count", label: "Saved Opportunities Count" },
  { key: "joined_clubs_count", label: "Joined Clubs Count" },
  { key: "internship_history_count", label: "Internship History Count" },
  { key: "saved_opps_json", label: "Saved Opportunities (JSON)" },
  { key: "joined_clubs_json", label: "Joined Clubs (JSON)" },
  { key: "club_email_prefs_json", label: "Club Email Prefs (JSON)" },
  { key: "internship_history_json", label: "Internship History (JSON)" },
];

function safeParseJson(raw, fallback) {
  if (typeof raw !== "string" || !raw.trim()) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function formatJsonArrayList(raw) {
  const parsed = safeParseJson(raw, []);
  return Array.isArray(parsed) ? parsed.map((v) => String(v)).join("; ") : "";
}

function normalizeCsvCell(value) {
  const str = value === null || value === undefined ? "" : String(value);
  if (!/[",\n\r]/.test(str)) return str;
  return `"${str.replace(/"/g, '""')}"`;
}

function normalizeHtmlCell(value) {
  return String(value === null || value === undefined ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getRosterExportRows() {
  const rows = db.prepare(`
    SELECT
      r.name AS roster_name,
      r.email AS roster_email,
      r.is_admin AS roster_is_admin,
      r.created_at AS roster_added_at,
      CASE WHEN u.id IS NOT NULL THEN 1 ELSE 0 END AS registered,
      u.id AS user_id,
      u.name AS user_name,
      u.email AS user_email,
      u.is_admin AS user_is_admin,
      u.welcome_email_sent AS welcome_email_sent,
      u.created_at AS user_created_at,
      u.avatar_url AS avatar_url,
      u.google_sub AS google_sub,
      up.selected_industries AS selected_industries_json,
      up.selected_areas AS selected_areas_json,
      up.email_alerts AS email_alerts,
      up.saved_opps AS saved_opps_json,
      up.joined_clubs AS joined_clubs_json,
      up.club_email_prefs AS club_email_prefs_json,
      up.internship_history AS internship_history_json
    FROM roster r
    LEFT JOIN users u ON LOWER(u.email) = LOWER(r.email)
    LEFT JOIN user_preferences up ON up.user_id = u.id
    ORDER BY r.created_at DESC
  `).all();

  return rows.map((row) => {
    const savedOpps = safeParseJson(row.saved_opps_json, []);
    const joinedClubs = safeParseJson(row.joined_clubs_json, []);
    const internshipHistory = safeParseJson(row.internship_history_json, []);
    return {
      roster_name: row.roster_name || "",
      roster_email: row.roster_email || "",
      roster_is_admin: row.roster_is_admin ? "Yes" : "No",
      roster_added_at: row.roster_added_at || "",
      registered: row.registered ? "Yes" : "No",
      user_id: row.user_id || "",
      user_name: row.user_name || "",
      user_email: row.user_email || "",
      user_is_admin: row.user_is_admin ? "Yes" : "No",
      welcome_email_sent: row.welcome_email_sent ? "Yes" : "No",
      user_created_at: row.user_created_at || "",
      avatar_url: row.avatar_url || "",
      google_sub: row.google_sub || "",
      selected_industries: formatJsonArrayList(row.selected_industries_json),
      selected_areas: formatJsonArrayList(row.selected_areas_json),
      email_alerts: row.email_alerts === null || row.email_alerts === undefined ? "" : (row.email_alerts ? "Yes" : "No"),
      saved_opps_count: Array.isArray(savedOpps) ? savedOpps.length : 0,
      joined_clubs_count: Array.isArray(joinedClubs) ? joinedClubs.length : 0,
      internship_history_count: Array.isArray(internshipHistory) ? internshipHistory.length : 0,
      saved_opps_json: row.saved_opps_json || "[]",
      joined_clubs_json: row.joined_clubs_json || "[]",
      club_email_prefs_json: row.club_email_prefs_json || "{}",
      internship_history_json: row.internship_history_json || "[]",
    };
  });
}

function buildRosterCsv(rows) {
  const header = ROSTER_EXPORT_COLUMNS.map((col) => normalizeCsvCell(col.label)).join(",");
  const lines = rows.map((row) =>
    ROSTER_EXPORT_COLUMNS.map((col) => normalizeCsvCell(row[col.key])).join(",")
  );
  return [header, ...lines].join("\n");
}

function buildRosterExcelHtml(rows) {
  const header = ROSTER_EXPORT_COLUMNS.map((col) => `<th>${normalizeHtmlCell(col.label)}</th>`).join("");
  const body = rows
    .map((row) => {
      const cells = ROSTER_EXPORT_COLUMNS.map(
        (col) => `<td style="mso-number-format:'\\@';">${normalizeHtmlCell(row[col.key])}</td>`
      ).join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body>
  <table border="1">
    <thead><tr>${header}</tr></thead>
    <tbody>${body}</tbody>
  </table>
</body>
</html>`;
}

function exportDateStamp() {
  return new Date().toISOString().slice(0, 10);
}

// Roster
app.get("/api/admin/roster", requireAdmin, (req, res) => {
  res.json({ roster: getAllRoster() });
});

app.get("/api/admin/roster/export.csv", requireAdmin, (req, res) => {
  const rows = getRosterExportRows();
  const csv = buildRosterCsv(rows);
  const filename = `uatx-roster-export-${exportDateStamp()}.csv`;
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send("\uFEFF" + csv);
});

app.get("/api/admin/roster/export.xls", requireAdmin, (req, res) => {
  const rows = getRosterExportRows();
  const html = buildRosterExcelHtml(rows);
  const filename = `uatx-roster-export-${exportDateStamp()}.xls`;
  res.setHeader("Content-Type", "application/vnd.ms-excel; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send("\uFEFF" + html);
});

app.get("/api/admin/roster/export.exl", requireAdmin, (req, res) => {
  const rows = getRosterExportRows();
  const html = buildRosterExcelHtml(rows);
  const filename = `uatx-roster-export-${exportDateStamp()}.exl`;
  res.setHeader("Content-Type", "application/vnd.ms-excel; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send("\uFEFF" + html);
});

app.post("/api/admin/roster", requireAdmin, (req, res) => {
  const { name, email, is_admin } = req.body;
  if (!name || !email) return res.status(400).json({ error: "Name and email are required" });
  addToRoster(name, email, is_admin);
  res.json({ ok: true, roster: getAllRoster() });
});

app.delete("/api/admin/roster/:id", requireAdmin, (req, res) => {
  removeFromRoster(req.params.id);
  res.json({ ok: true, roster: getAllRoster() });
});

app.post("/api/admin/roster/csv", requireAdmin, (req, res) => {
  const { csv } = req.body;
  if (!csv) return res.status(400).json({ error: "Missing csv data" });

  const lines = csv.split("\n").filter((l) => l.trim());
  const rows = [];

  // Detect column layout from header row (if present)
  let colMap = null;
  const firstParts = lines[0].split(",").map((s) => s.trim().replace(/^["']|["']$/g, "").toLowerCase());
  const headerKeywords = ["first", "last", "name", "email", "school"];
  if (firstParts.some(p => headerKeywords.some(k => p.includes(k)))) {
    colMap = {};
    firstParts.forEach((col, i) => {
      if (col.includes("first")) colMap.first = i;
      else if (col.includes("last")) colMap.last = i;
      else if (col.includes("email")) colMap.email = i;
      else if (col === "name") colMap.name = i;
    });
    lines.shift(); // remove header
  }

  for (const line of lines) {
    const parts = line.split(",").map((s) => s.trim().replace(/^["']|["']$/g, ""));
    if (parts.length < 2) continue;

    let name, email;

    if (colMap) {
      // Use detected column layout
      const first = colMap.first !== undefined ? parts[colMap.first] : "";
      const last = colMap.last !== undefined ? parts[colMap.last] : "";
      name = colMap.name !== undefined ? parts[colMap.name] : (first + " " + last).trim();
      email = colMap.email !== undefined ? parts[colMap.email] : "";

      // Generate email if column missing or empty
      if (!email && first && last) {
        email = (first[0] + last).toLowerCase().replace(/[^a-z0-9]/g, "") + "@student.uaustin.org";
      }
    } else {
      // No header — auto-detect
      const hasEmail = parts.some(p => p.includes("@"));
      if (hasEmail) {
        if (parts[0].includes("@")) { email = parts[0]; name = parts.slice(1).join(" "); }
        else { email = parts.find(p => p.includes("@")); name = parts.filter(p => p !== email).join(" "); }
      } else if (parts.length >= 2) {
        const [first, last] = parts;
        name = first + " " + last;
        email = (first[0] + last).toLowerCase().replace(/[^a-z0-9]/g, "") + "@student.uaustin.org";
      }
    }

    if (name && email) rows.push({ name, email });
  }
  if (rows.length === 0) return res.status(400).json({ error: "No valid rows found" });

  bulkAddToRoster(rows);
  res.json({ ok: true, added: rows.length, roster: getAllRoster() });
});

// Opportunities (admin CRUD)
app.get("/api/admin/opportunities", requireAdmin, (req, res) => {
  res.json({ opportunities: getAllOpportunities() });
});

app.post("/api/admin/opportunities", requireAdmin, async (req, res) => {
  const { opportunity, notify } = req.body;
  const normalizedOpp = normalizeOpportunity(opportunity || {});
  if (!normalizedOpp.org || !normalizedOpp.title) {
    return res.status(400).json({ error: "Organization and title are required" });
  }

  const id = createOpportunity(normalizedOpp);

  // Send notifications if requested
  let notified = 0;
  if (notify && normalizedOpp.industry) {
    const students = getStudentsForNotification(normalizedOpp.industry);
    for (const student of students) {
      await sendOpportunityNotification(student.email, student.name, { ...normalizedOpp, id });
      notified++;
    }
  }

  res.json({ ok: true, id, notified, opportunities: getAllOpportunities() });
});

app.put("/api/admin/opportunities/:id", requireAdmin, (req, res) => {
  const { opportunity } = req.body;
  const normalizedOpp = normalizeOpportunity(opportunity || {});
  if (!normalizedOpp.org || !normalizedOpp.title) {
    return res.status(400).json({ error: "Organization and title are required" });
  }
  updateOpportunity(req.params.id, normalizedOpp);
  res.json({ ok: true, opportunities: getAllOpportunities() });
});

app.delete("/api/admin/opportunities/:id", requireAdmin, (req, res) => {
  deleteOpportunity(req.params.id);
  res.json({ ok: true, opportunities: getAllOpportunities() });
});

// Activities (admin — includes pending)
app.get("/api/admin/activities", requireAdmin, (req, res) => {
  res.json({ activities: getAllActivities() });
});

app.post("/api/admin/activities", requireAdmin, (req, res) => {
  const { activity } = req.body;
  if (!activity || !activity.title) return res.status(400).json({ error: "Title is required" });
  if (isPastDateOnly(activity.event_date)) return res.status(400).json({ error: "Event date cannot be in the past" });
  createActivity(activity);
  res.json({ ok: true, activities: getAllActivities() });
});

app.put("/api/admin/activities/:id", requireAdmin, (req, res) => {
  const { activity } = req.body;
  if (!activity || !activity.title) return res.status(400).json({ error: "Title is required" });
  if (isPastDateOnly(activity.event_date)) return res.status(400).json({ error: "Event date cannot be in the past" });
  updateActivity(req.params.id, activity);
  res.json({ ok: true, activities: getAllActivities() });
});

app.put("/api/admin/activities/:id/approve", requireAdmin, (req, res) => {
  approveActivity(req.params.id);
  res.json({ ok: true, activities: getAllActivities() });
});

app.delete("/api/admin/activities/:id", requireAdmin, (req, res) => {
  deleteActivity(req.params.id);
  res.json({ ok: true, activities: getAllActivities() });
});

const GOOGLE_CALENDAR_HOST_ALLOWLIST = ["google.com", "googleusercontent.com"];

function isBlockedIcsHost(hostname) {
  const host = String(hostname || "").toLowerCase().trim();
  if (!host) return true;
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host === "::1") return true;
  if (host.endsWith(".local")) return true;

  // Block common private/loopback IPv4 ranges for outbound fetch safety.
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    const parts = host.split(".").map((part) => Number(part));
    if (parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
    if (parts[0] === 10) return true;
    if (parts[0] === 127) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  }

  return false;
}

function normalizeIcsSourceInput(inputValue) {
  const raw = String(inputValue || "").trim();
  if (!raw) return "";
  if (/^webcals?:\/\//i.test(raw)) return "https://" + raw.replace(/^webcals?:\/\//i, "");
  if (raw.startsWith("//")) return "https:" + raw;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.includes("@")) return raw;
  if (/^[a-z0-9.-]+\.[a-z]{2,}([/:?#].*)?$/i.test(raw)) return "https://" + raw;
  return raw;
}

function decodeIcsText(value) {
  return String(value || "")
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

function unfoldIcsLines(icsText) {
  const sourceLines = String(icsText || "").replace(/\r\n/g, "\n").split("\n");
  const unfolded = [];
  for (const line of sourceLines) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && unfolded.length) {
      unfolded[unfolded.length - 1] += line.slice(1);
    } else {
      unfolded.push(line);
    }
  }
  return unfolded;
}

function parseIcsProperty(line) {
  const idx = line.indexOf(":");
  if (idx < 0) return null;
  const left = line.slice(0, idx);
  const value = line.slice(idx + 1);
  const parts = left.split(";");
  const name = String(parts.shift() || "").trim().toUpperCase();
  const params = {};
  for (const part of parts) {
    const eqIdx = part.indexOf("=");
    if (eqIdx < 0) continue;
    const key = part.slice(0, eqIdx).trim().toUpperCase();
    const paramValue = part.slice(eqIdx + 1).trim().replace(/^"|"$/g, "");
    if (key) params[key] = paramValue;
  }
  return { name, params, value };
}

function parseIcsDateToIso(rawValue) {
  const raw = String(rawValue || "").trim();
  if (!raw) return null;
  const ymd = raw.match(/^(\d{4})(\d{2})(\d{2})/);
  if (ymd) return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  const tzOffsetMs = parsed.getTimezoneOffset() * 60000;
  return new Date(parsed.getTime() - tzOffsetMs).toISOString().split("T")[0];
}

function isAllowedGoogleCalendarHost(hostname) {
  const host = String(hostname || "").toLowerCase();
  return GOOGLE_CALENDAR_HOST_ALLOWLIST.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`)
  );
}

function buildGoogleCalendarIcsUrlFromId(calendarId) {
  const id = String(calendarId || "").trim().replace(/^mailto:/i, "");
  if (!id) return "";
  return `https://calendar.google.com/calendar/ical/${encodeURIComponent(id)}/public/basic.ics`;
}

function resolveGoogleCalendarIcsUrl(inputValue) {
  const raw = normalizeIcsSourceInput(inputValue);
  if (!raw) return "";

  // Calendar IDs are common in Google Calendar settings.
  if (!/^https?:\/\//i.test(raw)) {
    if (raw.includes("@")) return buildGoogleCalendarIcsUrlFromId(raw);
    return "";
  }

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return "";
  }
  const protocol = String(parsed.protocol || "").toLowerCase();
  if (protocol !== "https:" && protocol !== "http:") return "";
  if (isBlockedIcsHost(parsed.hostname)) return "";

  // For Google links, convert calendar page URLs with cid/src into ICS feeds.
  if (isAllowedGoogleCalendarHost(parsed.hostname)) {
    const cid = parsed.searchParams.get("cid") || parsed.searchParams.get("src");
    if (cid) return buildGoogleCalendarIcsUrlFromId(cid);
  }

  const lowerPath = parsed.pathname.toLowerCase();
  if (lowerPath.endsWith(".ics") || lowerPath.endsWith(".ical")) return parsed.toString();

  // Accept common iCal query-based endpoints (for non-Google providers).
  const query = parsed.search.toLowerCase();
  if (query.includes("ical") || query.includes(".ics") || query.includes("format=ics")) {
    return parsed.toString();
  }

  return "";
}

function validateIcsPayload(rawText) {
  const text = String(rawText || "");
  if (!text.trim()) {
    return { error: "iCalendar file is empty." };
  }
  if (text.length > 4_000_000) {
    return { error: "Calendar feed is too large to import." };
  }
  if (!/BEGIN:VCALENDAR/i.test(text)) {
    return { error: "The provided source is not a valid iCalendar feed." };
  }
  return { text };
}

function parseGoogleCalendarIcs(icsText) {
  const lines = unfoldIcsLines(icsText);
  let calendarName = "";
  let current = null;
  const rawEvents = [];

  for (const line of lines) {
    const prop = parseIcsProperty(line);
    if (!prop) continue;

    if (prop.name === "BEGIN" && String(prop.value).toUpperCase() === "VEVENT") {
      current = {};
      continue;
    }
    if (prop.name === "END" && String(prop.value).toUpperCase() === "VEVENT") {
      if (current) rawEvents.push(current);
      current = null;
      continue;
    }

    if (!current) {
      if (prop.name === "X-WR-CALNAME") calendarName = decodeIcsText(prop.value).trim();
      continue;
    }

    if (prop.name === "UID") current.uid = decodeIcsText(prop.value).trim();
    if (prop.name === "SUMMARY") current.summary = decodeIcsText(prop.value).trim();
    if (prop.name === "DESCRIPTION") current.description = decodeIcsText(prop.value).trim();
    if (prop.name === "DTSTART") current.dtstart = prop.value;
    if (prop.name === "LOCATION") current.location = decodeIcsText(prop.value).trim();
    if (prop.name === "URL") current.url = decodeIcsText(prop.value).trim();
    if (prop.name === "ORGANIZER") {
      current.organizer_cn = prop.params.CN ? decodeIcsText(prop.params.CN).trim() : "";
      current.organizer_raw = decodeIcsText(prop.value).trim();
    }
  }

  const events = rawEvents
    .map((raw) => {
      const title = String(raw.summary || "").trim();
      if (!title) return null;
      const date = parseIcsDateToIso(raw.dtstart);
      const location = String(raw.location || "").trim();
      const description = String(raw.description || "").trim();
      const org = String(raw.organizer_cn || "").trim() || calendarName || "";
      const url = normalizePublicUrl(raw.url || "", { allowRelative: false }) || "";

      const descParts = [];
      if (description) descParts.push(description.replace(/\s+/g, " ").trim());
      if (location) descParts.push(`Location: ${location}`);

      return {
        source_uid: raw.uid || "",
        title,
        org,
        type: "",
        date,
        location,
        url,
        img: null,
        description: descParts.join(" | ").slice(0, 500),
        detail_content: "",
      };
    })
    .filter(Boolean)
    .slice(0, 500);

  events.sort((a, b) => {
    if (!a.date && !b.date) return a.title.localeCompare(b.title);
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.localeCompare(b.date);
  });

  return { calendarName, events };
}

function buildEventDedupKey(event) {
  return [
    String(event.title || "").trim().toLowerCase(),
    String(event.date || "").trim(),
    String(event.org || "").trim().toLowerCase(),
    event.is_community ? "community" : "program",
  ].join("|");
}

function buildOpportunityDedupKey(opportunity) {
  return [
    String(opportunity.org || "").trim().toLowerCase(),
    String(opportunity.title || "").trim().toLowerCase(),
    String(opportunity.deadline || "").trim(),
  ].join("|");
}

// Events (admin CRUD)
app.get("/api/admin/events", requireAdmin, (req, res) => {
  res.json({ events: getAllEvents() });
});

app.post("/api/admin/events/google-calendar/preview", requireAdmin, async (req, res) => {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const uploadedIcsText = typeof body.ics_text === "string" ? body.ics_text : "";
  const uploadedFileName = typeof body.file_name === "string" ? body.file_name.trim() : "";
  const source = String(body.source || body.calendar_url || body.calendar_id || "").trim();
  let icsText = "";
  let sourceUrl = "";
  let sourceName = "";

  if (uploadedIcsText.trim()) {
    const validated = validateIcsPayload(uploadedIcsText);
    if (validated.error) return res.status(400).json({ error: validated.error });
    icsText = validated.text;
    sourceName = uploadedFileName || "Uploaded iCal file";
  } else {
    const icsUrl = resolveGoogleCalendarIcsUrl(source);
    if (!icsUrl) {
      return res.status(400).json({
        error: "Provide a direct public ICS/iCal URL, a Google Calendar ID (example@group.calendar.google.com), or upload an .ics/.ical file.",
      });
    }

    let response;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      try {
        response = await fetch(icsUrl, {
          signal: controller.signal,
          redirect: "follow",
          headers: { Accept: "text/calendar, text/plain;q=0.9, */*;q=0.5" },
        });
      } finally {
        clearTimeout(timeout);
      }
    } catch (err) {
      return res.status(502).json({ error: "Could not reach Google Calendar feed." });
    }

    if (!response.ok) {
      return res.status(400).json({ error: `Google Calendar feed returned HTTP ${response.status}.` });
    }

    const fetchedIcsText = await response.text();
    const validated = validateIcsPayload(fetchedIcsText);
    if (validated.error) return res.status(400).json({ error: validated.error });
    icsText = validated.text;
    sourceUrl = icsUrl;
  }

  const parsed = parseGoogleCalendarIcs(icsText);
  res.json({
    ok: true,
    calendar_name: parsed.calendarName || sourceName,
    source_url: sourceUrl,
    events: parsed.events,
  });
});

app.post("/api/admin/events/google-calendar/import", requireAdmin, (req, res) => {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const incoming = Array.isArray(body.events) ? body.events : [];
  if (incoming.length === 0) return res.status(400).json({ error: "No events selected for import." });
  if (incoming.length > 500) return res.status(400).json({ error: "Too many events selected." });

  const existingEventKeys = new Set(getAllEvents().map((event) => buildEventDedupKey(event)));
  const existingOppKeys = new Set(getAllOpportunities().map((opp) => buildOpportunityDedupKey(opp)));

  let added = 0;
  const skipped = [];
  const importedUids = [];
  const importedKeys = [];

  for (const raw of incoming) {
    const targetRaw = raw && typeof raw.target === "string" ? raw.target.trim().toLowerCase() : "";
    const eventTarget = targetRaw === "community" || targetRaw === "opportunities" ? targetRaw : "programs";
    const isCommunity = eventTarget === "community";
    const selectedType = raw && typeof raw.import_type === "string" && raw.import_type.trim()
      ? raw.import_type.trim()
      : (raw && typeof raw.type === "string" ? raw.type.trim() : "");

    if (eventTarget === "opportunities") {
      const normalizedOpp = normalizeOpportunity({
        org: raw && typeof raw.org === "string" ? raw.org : "",
        title: raw && typeof raw.title === "string" ? raw.title : "",
        description: raw && typeof raw.description === "string" ? raw.description : "",
        industry: raw && typeof raw.industry === "string" ? raw.industry : "",
        type: selectedType || "Program",
        location: raw && typeof raw.location === "string" ? raw.location : "",
        deadline: raw && typeof raw.date === "string" && raw.date.trim() ? raw.date : null,
        paid: false,
        featured: false,
        logo: raw && typeof raw.img === "string" ? raw.img : "",
        detail_content: raw && typeof raw.detail_content === "string" ? raw.detail_content : "",
        apply_url: raw && typeof raw.url === "string" ? raw.url : "",
      });

      if (!normalizedOpp.org || !normalizedOpp.title) {
        skipped.push({ title: normalizedOpp.title || "", reason: "Missing organization or title" });
        continue;
      }
      if (isPastDateOnly(normalizedOpp.deadline)) {
        skipped.push({ title: normalizedOpp.title, reason: "Deadline is in the past" });
        continue;
      }

      const key = buildOpportunityDedupKey(normalizedOpp);
      if (existingOppKeys.has(key)) {
        skipped.push({ title: normalizedOpp.title, reason: "Duplicate opportunity" });
        continue;
      }

      createOpportunity(normalizedOpp);
      existingOppKeys.add(key);
      added++;
      importedKeys.push(key);
    } else {
      const payload = normalizeAdminEventPayload({
        title: raw && typeof raw.title === "string" ? raw.title : "",
        org: raw && typeof raw.org === "string" ? raw.org : "",
        type: selectedType,
        date: raw && typeof raw.date === "string" && raw.date.trim() ? raw.date : null,
        description: raw && typeof raw.description === "string" ? raw.description : "",
        detail_content: raw && typeof raw.detail_content === "string" ? raw.detail_content : "",
        url: raw && typeof raw.url === "string" ? raw.url : "",
        img: raw && typeof raw.img === "string" ? raw.img : "",
        is_community: isCommunity,
      });

      if (!payload.title) {
        skipped.push({ title: "", reason: "Missing title" });
        continue;
      }
      if (!payload.is_community && !payload.type) payload.type = "Workshop";
      if (isPastDateOnly(payload.date)) {
        skipped.push({ title: payload.title, reason: "Date is in the past" });
        continue;
      }

      const key = buildEventDedupKey(payload);
      if (existingEventKeys.has(key)) {
        skipped.push({ title: payload.title, reason: "Duplicate event" });
        continue;
      }

      createEvent(payload);
      existingEventKeys.add(key);
      added++;
      importedKeys.push(key);
    }

    if (raw && typeof raw.source_uid === "string" && raw.source_uid.trim()) {
      importedUids.push(raw.source_uid.trim());
    }
  }

  res.json({
    ok: true,
    target: "mixed",
    added,
    skipped: skipped.length,
    skipped_items: skipped.slice(0, 50),
    imported_uids: importedUids,
    imported_keys: importedKeys,
    events: getAllEvents(),
    opportunities: getAllOpportunities(),
  });
});

app.post("/api/admin/events", requireAdmin, (req, res) => {
  const event = normalizeAdminEventPayload(req.body && req.body.event);
  if (!event.title) return res.status(400).json({ error: "Title is required" });
  if (isPastDateOnly(event.date)) return res.status(400).json({ error: "Event date cannot be in the past" });
  createEvent(event);
  res.json({ ok: true, events: getAllEvents() });
});

app.put("/api/admin/events/:id", requireAdmin, (req, res) => {
  const event = normalizeAdminEventPayload(req.body && req.body.event);
  if (!event.title) return res.status(400).json({ error: "Title is required" });
  if (isPastDateOnly(event.date)) return res.status(400).json({ error: "Event date cannot be in the past" });
  updateEvent(req.params.id, event);
  res.json({ ok: true, events: getAllEvents() });
});

app.delete("/api/admin/events/:id", requireAdmin, (req, res) => {
  deleteEvent(req.params.id);
  res.json({ ok: true, events: getAllEvents() });
});

// Students (read-only view for admin)
app.get("/api/admin/students", requireAdmin, (req, res) => {
  res.json({ students: getAllStudents() });
});

// Single student detail by email (for roster expand)
app.get("/api/admin/student/:email", requireAdmin, (req, res) => {
  const user = require("./db").db.prepare(
    "SELECT * FROM users WHERE LOWER(email) = LOWER(?)"
  ).get(req.params.email);
  if (!user) return res.json({ student: null });
  const prefs = getPreferences(user.id);
  res.json({ student: { ...user, is_admin: !!user.is_admin }, preferences: prefs });
});

// Admin: update a student's preferences/profile
app.put("/api/admin/student/:email/preferences", requireAdmin, (req, res) => {
  const user = require("./db").db.prepare(
    "SELECT * FROM users WHERE LOWER(email) = LOWER(?)"
  ).get(req.params.email);
  if (!user) return res.status(404).json({ error: "Student not found" });
  setPreferences(user.id, req.body);
  const prefs = getPreferences(user.id);
  res.json({ ok: true, preferences: prefs });
});

// ─── BLOG (secret path, no auth) ───

app.get("/blog", (req, res) => res.sendFile(path.join(DIR, "blog.html")));
app.get("/blog-bg.jpg", (req, res) => res.sendFile(path.join(DIR, "blog-bg.jpg")));

app.get("/api/blog/posts", (req, res) => {
  const posts = getAllBlogPosts().map(p => ({
    id: p.id,
    title: p.title,
    excerpt: p.content.replace(/<[^>]*>/g, ""),
    created_at: p.created_at,
  }));
  res.json({ posts });
});

app.get("/api/blog/posts/:id", (req, res) => {
  const post = getBlogPostById(req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found" });
  res.json({ post });
});

app.post("/api/blog/posts", requireAdmin, (req, res) => {
  const { title, content } = req.body;
  const t = title || (content || "").replace(/<[^>]*>/g, "").substring(0, 120) || "Untitled";
  const id = createBlogPost(t, content || "");
  res.json({ ok: true, id });
});

app.put("/api/blog/posts/:id", requireAdmin, (req, res) => {
  const { title, content } = req.body;
  const existing = getBlogPostById(req.params.id);
  if (!existing) return res.status(404).json({ error: "Post not found" });
  const t = title || (content || "").replace(/<[^>]*>/g, "").substring(0, 120) || "Untitled";
  updateBlogPost(req.params.id, t, content || "");
  res.json({ ok: true });
});

app.delete("/api/blog/posts/:id", requireAdmin, (req, res) => {
  const existing = getBlogPostById(req.params.id);
  if (!existing) return res.status(404).json({ error: "Post not found" });
  deleteBlogPost(req.params.id);
  res.json({ ok: true });
});

// ─── START ───

app.listen(PORT, () => {
  console.log(`UATX Student Portal`);
  console.log(`──────────────────────────────`);
  console.log(`  Home:   http://localhost:${PORT}`);
  console.log(`  Admin:  http://localhost:${PORT}/admin`);
  console.log(`  Blog:   http://localhost:${PORT}/blog`);
  console.log(`──────────────────────────────`);
});
