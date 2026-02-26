require("dotenv").config();
const express = require("express");
const session = require("express-session");
const path = require("path");
const fs = require("fs");

const {
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
  updateActivityNextEvent,
  seedActivities,
  getClubMembers,
  getAllMemberCounts,
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

app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));

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
  const activities = getApprovedActivities();
  const clubEvents = getAllClubEvents();
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
    if (ev.description) lines.push("DESCRIPTION:" + icsEscape(ev.description));
    if (ev.org) lines.push('ORGANIZER;CN="' + icsEscape(ev.org) + '":mailto:noreply@uaustinportal.org');
    lines.push("END:VEVENT");
  });

  // Club events
  clubEvents.forEach((ce) => {
    if (!ce.date) return;
    const dt = icsDate(ce.date);
    if (!dt) return;
    const club = activities.find(a => a.id === ce.activity_id);
    const clubName = club ? club.title : "Club";
    lines.push("BEGIN:VEVENT");
    lines.push("UID:clubevent-" + ce.id + "@uaustinportal.org");
    lines.push("DTSTART:" + dt);
    lines.push("SUMMARY:[Club] " + icsEscape(clubName + " — " + ce.title));
    if (club && club.description) lines.push("DESCRIPTION:" + icsEscape(club.description));
    if (ce.location) lines.push("LOCATION:" + icsEscape(ce.location));
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
    const { email, name, sub: googleSub, picture: avatarUrl, hd } = payload;

    // Restrict to UATX domains (students + faculty)
    const ALLOWED_DOMAINS = ["student.uaustin.org", "uaustin.org"];
    if (!ALLOWED_DOMAINS.includes(hd)) {
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
  if (body.internship_history && body.internship_history.length > 50) return res.status(400).json({ error: "Too many internship history entries" });
  if (JSON.stringify(body).length > 50000) return res.status(400).json({ error: "Payload too large" });
  setPreferences(req.session.userId, body);
  res.json({ ok: true });
});

// ─── OPPORTUNITIES ROUTES ───

app.get("/api/opportunities", requireAuth, (req, res) => {
  res.json({ opportunities: getAllOpportunities() });
});

// ─── EVENTS ROUTES ───

app.get("/api/events", requireAuth, (req, res) => {
  res.json({ events: getAllEvents() });
});

// ─── ACTIVITIES ROUTES ───

app.get("/api/activities", requireAuth, (req, res) => {
  res.json({ activities: getApprovedActivities() });
});

app.get("/api/activities/member-counts", requireAuth, (req, res) => {
  res.json({ counts: getAllMemberCounts() });
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

// Update next event for a club (president only)
app.put("/api/activities/:id/next-event", requireAuth, (req, res) => {
  const user = getUserById(req.session.userId);
  const activities = getActivitiesByPresidentEmail(user.email);
  const club = activities.find(a => a.id === parseInt(req.params.id));
  if (!club) return res.status(403).json({ error: "You are not the president of this club" });
  const { title, date, location } = req.body;
  updateActivityNextEvent(club.id, title, date, location);
  res.json({ ok: true });
});

// ─── CLUB EVENTS (president-managed) ───

app.get("/api/club-events", requireAuth, (req, res) => {
  res.json({ club_events: getAllClubEvents() });
});

app.get("/api/activities/:id/events", requireAuth, (req, res) => {
  res.json({ events: getClubEventsByActivity(parseInt(req.params.id)) });
});

app.post("/api/activities/:id/events", requireAuth, (req, res) => {
  const user = getUserById(req.session.userId);
  const activities = getActivitiesByPresidentEmail(user.email);
  const club = activities.find(a => a.id === parseInt(req.params.id));
  if (!club) return res.status(403).json({ error: "You are not the president of this club" });
  const { title, date, location } = req.body;
  if (!title) return res.status(400).json({ error: "Title is required" });
  createClubEvent(club.id, title, date, location);
  res.json({ ok: true, events: getClubEventsByActivity(club.id) });
});

app.put("/api/club-events/:id", requireAuth, (req, res) => {
  const user = getUserById(req.session.userId);
  const evt = getClubEventById(parseInt(req.params.id));
  if (!evt) return res.status(404).json({ error: "Event not found" });
  const activities = getActivitiesByPresidentEmail(user.email);
  if (!activities.find(a => a.id === evt.activity_id)) return res.status(403).json({ error: "You are not the president of this club" });
  const { title, date, location } = req.body;
  if (!title) return res.status(400).json({ error: "Title is required" });
  updateClubEvent(evt.id, title, date, location);
  res.json({ ok: true, events: getClubEventsByActivity(evt.activity_id) });
});

app.delete("/api/club-events/:id", requireAuth, (req, res) => {
  const user = getUserById(req.session.userId);
  const evt = getClubEventById(parseInt(req.params.id));
  if (!evt) return res.status(404).json({ error: "Event not found" });
  const activities = getActivitiesByPresidentEmail(user.email);
  if (!activities.find(a => a.id === evt.activity_id)) return res.status(403).json({ error: "You are not the president of this club" });
  deleteClubEvent(evt.id);
  res.json({ ok: true, events: getClubEventsByActivity(evt.activity_id) });
});

// ─── ADMIN ROUTES ───

// Roster
app.get("/api/admin/roster", requireAdmin, (req, res) => {
  res.json({ roster: getAllRoster() });
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
  if (!opportunity || !opportunity.org || !opportunity.title) {
    return res.status(400).json({ error: "Organization and title are required" });
  }

  const id = createOpportunity(opportunity);

  // Send notifications if requested
  let notified = 0;
  if (notify && opportunity.industry) {
    const students = getStudentsForNotification(opportunity.industry);
    for (const student of students) {
      await sendOpportunityNotification(student.email, student.name, { ...opportunity, id });
      notified++;
    }
  }

  res.json({ ok: true, id, notified, opportunities: getAllOpportunities() });
});

app.put("/api/admin/opportunities/:id", requireAdmin, (req, res) => {
  const { opportunity } = req.body;
  if (!opportunity || !opportunity.org || !opportunity.title) {
    return res.status(400).json({ error: "Organization and title are required" });
  }
  updateOpportunity(req.params.id, opportunity);
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
  createActivity(activity);
  res.json({ ok: true, activities: getAllActivities() });
});

app.put("/api/admin/activities/:id", requireAdmin, (req, res) => {
  const { activity } = req.body;
  if (!activity || !activity.title) return res.status(400).json({ error: "Title is required" });
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

// Events (admin CRUD)
app.get("/api/admin/events", requireAdmin, (req, res) => {
  res.json({ events: getAllEvents() });
});

app.post("/api/admin/events", requireAdmin, (req, res) => {
  const { event } = req.body;
  if (!event || !event.title) return res.status(400).json({ error: "Title is required" });
  createEvent(event);
  res.json({ ok: true, events: getAllEvents() });
});

app.put("/api/admin/events/:id", requireAdmin, (req, res) => {
  const { event } = req.body;
  if (!event || !event.title) return res.status(400).json({ error: "Title is required" });
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

app.post("/api/blog/posts", (req, res) => {
  const { title, content } = req.body;
  const t = title || (content || "").replace(/<[^>]*>/g, "").substring(0, 120) || "Untitled";
  const id = createBlogPost(t, content || "");
  res.json({ ok: true, id });
});

app.put("/api/blog/posts/:id", (req, res) => {
  const { title, content } = req.body;
  const existing = getBlogPostById(req.params.id);
  if (!existing) return res.status(404).json({ error: "Post not found" });
  const t = title || (content || "").replace(/<[^>]*>/g, "").substring(0, 120) || "Untitled";
  updateBlogPost(req.params.id, t, content || "");
  res.json({ ok: true });
});

app.delete("/api/blog/posts/:id", (req, res) => {
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
