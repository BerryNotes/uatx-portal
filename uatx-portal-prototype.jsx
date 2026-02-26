import { useState, useEffect, useRef } from "react";

const COLORS = {
  navy: "#1a2332",
  navyLight: "#243044",
  navyDark: "#111a26",
  gold: "#c9a84c",
  goldLight: "#d4b96a",
  goldMuted: "#a08839",
  cream: "#f5f0e8",
  creamDark: "#e8e0d0",
  white: "#ffffff",
  text: "#2c2c2c",
  textLight: "#6b6b6b",
  border: "#e0d8c8",
  success: "#4a7c59",
  alert: "#c75c3a",
};

const INDUSTRIES = [
  "Finance & Banking",
  "Technology",
  "Law & Policy",
  "Government",
  "Nonprofit",
  "Media & Journalism",
  "Consulting",
  "Healthcare",
  "Education",
  "Energy",
  "Real Estate",
  "Defense & Security",
];

const SAMPLE_INTERNSHIPS = [
  { id: 1, org: "Maynard Nexsen", title: "Legal Internship Program", industry: "Law & Policy", type: "Internship", deadline: "2025-03-15", description: "Gain hands-on experience in corporate and regulatory law at a major firm.", location: "Austin, TX", paid: true, featured: true },
  { id: 2, org: "Hudson Institute", title: "Policy Research Fellow", industry: "Government", type: "Fellowship", deadline: "2025-03-22", description: "Research and write policy briefs on national security and economic policy topics.", location: "Washington, D.C.", paid: true, featured: true },
  { id: 3, org: "Bloom", title: "Influencer Marketing Intern", industry: "Media & Journalism", type: "Internship", deadline: "2025-04-01", description: "Work with top brands on influencer campaigns, content strategy, and social analytics.", location: "Remote", paid: true, featured: false },
  { id: 4, org: "Setna IO", title: "Software Engineering Intern", industry: "Technology", type: "Internship", deadline: "2025-03-28", description: "Build and ship features for enterprise security products.", location: "Austin, TX", paid: true, featured: false },
  { id: 5, org: "Casas Por Cristo", title: "Community Development Intern", industry: "Nonprofit", type: "Internship", deadline: "2025-04-10", description: "Coordinate housing projects and community outreach programs.", location: "El Paso, TX", paid: false, featured: false },
  { id: 6, org: "Claremont Institute", title: "Publius Research Fellowship", industry: "Government", type: "Fellowship", deadline: "2025-03-30", description: "Study American political thought and constitutional governance.", location: "Claremont, CA", paid: true, featured: true },
  { id: 7, org: "Hertog Foundation", title: "Political Studies Program", industry: "Education", type: "Program", deadline: "2025-04-05", description: "Intensive seminar on political philosophy and statesmanship.", location: "Washington, D.C.", paid: true, featured: false },
  { id: 8, org: "New American Industrial Alliance", title: "Economic Policy Intern", industry: "Consulting", type: "Internship", deadline: "2025-04-15", description: "Research industrial policy and help draft policy recommendations.", location: "Washington, D.C.", paid: true, featured: false },
  { id: 9, org: "Office of the Texas Governor", title: "Governor's Office Intern", industry: "Government", type: "Internship", deadline: "2025-03-20", description: "Support legislative affairs and constituent services.", location: "Austin, TX", paid: false, featured: true },
  { id: 10, org: "Futures Forge", title: "Venture Fellow", industry: "Finance & Banking", type: "Fellowship", deadline: "2025-04-08", description: "Evaluate startups and learn venture capital fundamentals.", location: "Austin, TX", paid: true, featured: false },
  { id: 11, org: "Senator Ted Cruz", title: "Senate Office Intern", industry: "Government", type: "Internship", deadline: "2025-03-25", description: "Work on legislative research, constituent correspondence, and policy briefings.", location: "Washington, D.C.", paid: false, featured: false },
  { id: 12, org: "Colloquium", title: "DC Political Science Journal", industry: "Media & Journalism", type: "Internship", deadline: "2025-04-12", description: "Edit and publish articles on political science and public affairs.", location: "Washington, D.C.", paid: false, featured: false },
];

const SAMPLE_EVENTS = [
  { id: 1, title: "Texas Stock Exchange Visit", date: "2025-03-10", type: "Field Trip", org: "UATX" },
  { id: 2, title: "AHA Foundation Speaker Series", date: "2025-03-14", type: "Event", org: "AHA Foundation" },
  { id: 3, title: "Forge Leadership Summit", date: "2025-06-15", type: "Conference", org: "Colps & Forge" },
  { id: 4, title: "AEI Summer Honors Program", date: "2025-06-01", type: "Program", org: "AEI" },
  { id: 5, title: "Study Abroad: Israel", date: "2025-05-20", type: "Travel", org: "UATX" },
  { id: 6, title: "Austin Institute Forum", date: "2025-03-28", type: "Event", org: "Austin Institute" },
];

const SAMPLE_ACTIVITIES = [
  { id: 1, title: "Debate Society", members: 24, category: "Academic", meetDay: "Tuesdays", desc: "Weekly debates on policy, philosophy, and current affairs." },
  { id: 2, title: "Entrepreneurship Club", members: 18, category: "Professional", meetDay: "Thursdays", desc: "Workshops, pitch nights, and startup mentorship." },
  { id: 3, title: "Outdoor Adventure Club", members: 32, category: "Recreation", meetDay: "Saturdays", desc: "Hiking, camping, and exploring the Texas Hill Country." },
  { id: 4, title: "Film & Media Society", members: 15, category: "Creative", meetDay: "Wednesdays", desc: "Screenings, discussions, and student film production." },
  { id: 5, title: "Investment Club", members: 20, category: "Professional", meetDay: "Mondays", desc: "Manage a student portfolio and discuss market trends." },
  { id: 6, title: "Intramural Sports", members: 45, category: "Recreation", meetDay: "Various", desc: "Flag football, basketball, volleyball, and more." },
];

// Shield/crest SVG placeholder
const UATXCrest = () => (
  <svg width="40" height="48" viewBox="0 0 40 48" fill="none">
    <path d="M20 0L40 8V28C40 38 30 46 20 48C10 46 0 38 0 28V8L20 0Z" fill={COLORS.gold} />
    <path d="M20 4L36 10V28C36 36 28 42 20 44C12 42 4 36 4 28V10L20 4Z" fill={COLORS.navy} />
    <text x="20" y="28" textAnchor="middle" fill={COLORS.gold} fontSize="10" fontFamily="Georgia, serif" fontWeight="bold">U</text>
  </svg>
);

const Badge = ({ children, color = COLORS.gold, bg }) => (
  <span style={{
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: "3px",
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.5px",
    textTransform: "uppercase",
    color: color,
    backgroundColor: bg || `${color}18`,
    border: `1px solid ${color}30`,
  }}>{children}</span>
);

const Button = ({ children, variant = "primary", size = "md", onClick, style = {} }) => {
  const base = {
    cursor: "pointer",
    border: "none",
    fontFamily: "'Libre Franklin', sans-serif",
    fontWeight: 600,
    letterSpacing: "0.5px",
    transition: "all 0.2s ease",
    textTransform: "uppercase",
    fontSize: size === "sm" ? "11px" : "13px",
    padding: size === "sm" ? "6px 14px" : "10px 24px",
  };
  const variants = {
    primary: { backgroundColor: COLORS.gold, color: COLORS.navy, ...base },
    secondary: { backgroundColor: "transparent", color: COLORS.gold, border: `1px solid ${COLORS.gold}`, ...base },
    ghost: { backgroundColor: "transparent", color: COLORS.textLight, border: `1px solid ${COLORS.border}`, ...base },
  };
  return <button style={{ ...variants[variant], ...style }} onClick={onClick}>{children}</button>;
};

// ─── NAV ───
const Sidebar = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: "home", label: "Home", icon: "⌂" },
    { id: "opportunities", label: "Opportunities", icon: "◈" },
    { id: "calendar", label: "Calendar", icon: "▦" },
    { id: "profile", label: "My Profile", icon: "○" },
    { id: "community", label: "Community", icon: "⬡" },
    { id: "events", label: "Events & Travel", icon: "✦" },
  ];
  return (
    <div style={{
      width: 220,
      minHeight: "100vh",
      backgroundColor: COLORS.navy,
      borderRight: `1px solid ${COLORS.navyLight}`,
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
    }}>
      <div style={{ padding: "24px 20px", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${COLORS.navyLight}` }}>
        <UATXCrest />
        <div>
          <div style={{ color: COLORS.cream, fontSize: 13, fontFamily: "Georgia, serif", fontWeight: 700, lineHeight: 1.2 }}>UATX</div>
          <div style={{ color: COLORS.goldMuted, fontSize: 10, letterSpacing: "1.5px", textTransform: "uppercase", fontFamily: "'Libre Franklin', sans-serif" }}>Student Portal</div>
        </div>
      </div>
      <nav style={{ padding: "16px 0", flex: 1 }}>
        {tabs.map(t => (
          <div
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: "10px 20px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 13,
              fontFamily: "'Libre Franklin', sans-serif",
              fontWeight: activeTab === t.id ? 600 : 400,
              color: activeTab === t.id ? COLORS.gold : COLORS.cream + "99",
              backgroundColor: activeTab === t.id ? COLORS.navyLight : "transparent",
              borderLeft: activeTab === t.id ? `3px solid ${COLORS.gold}` : "3px solid transparent",
              transition: "all 0.15s ease",
              letterSpacing: "0.3px",
            }}
          >
            <span style={{ fontSize: 16, opacity: 0.7 }}>{t.icon}</span>
            {t.label}
          </div>
        ))}
      </nav>
      <div style={{ padding: "16px 20px", borderTop: `1px solid ${COLORS.navyLight}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: COLORS.goldMuted, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.navy, fontSize: 12, fontWeight: 700 }}>JS</div>
          <div>
            <div style={{ color: COLORS.cream, fontSize: 12, fontWeight: 600 }}>Jane Smith</div>
            <div style={{ color: COLORS.goldMuted, fontSize: 10 }}>Class of 2027</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── HOME ───
const HomePage = ({ setActiveTab }) => (
  <div>
    {/* Hero */}
    <div style={{
      background: `linear-gradient(135deg, ${COLORS.navy} 0%, ${COLORS.navyLight} 100%)`,
      padding: "48px 40px",
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 0, right: 0, width: 300, height: 300, background: `radial-gradient(circle, ${COLORS.gold}08 0%, transparent 70%)`, borderRadius: "50%" }} />
      <div style={{ position: "relative" }}>
        <h1 style={{ color: COLORS.cream, fontFamily: "Georgia, serif", fontSize: 32, fontWeight: 700, margin: 0, lineHeight: 1.3 }}>
          Welcome to the UATX<br />Student Opportunity Portal
        </h1>
        <p style={{ color: COLORS.cream + "aa", fontSize: 15, maxWidth: 560, marginTop: 12, lineHeight: 1.6, fontFamily: "'Libre Franklin', sans-serif" }}>
          Your home base for discovering internships, fellowships, and career opportunities curated by the UATX Talent Network.
        </p>
        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
          <Button onClick={() => setActiveTab("opportunities")}>Browse Opportunities</Button>
          <Button variant="secondary" onClick={() => setActiveTab("profile")}>Update My Interests</Button>
        </div>
      </div>
    </div>

    <div style={{ padding: "32px 40px" }}>
      {/* Quick Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 36 }}>
        {[
          { label: "Open Positions", value: "12", sub: "3 new this week" },
          { label: "Upcoming Deadlines", value: "5", sub: "Next: Mar 15" },
          { label: "Your Applications", value: "2", sub: "1 pending review" },
          { label: "Saved Opportunities", value: "4", sub: "2 closing soon" },
        ].map((s, i) => (
          <div key={i} style={{
            padding: "20px",
            backgroundColor: COLORS.white,
            border: `1px solid ${COLORS.border}`,
            borderTop: `3px solid ${COLORS.gold}`,
          }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: COLORS.navy, fontFamily: "Georgia, serif" }}>{s.value}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, marginTop: 4 }}>{s.label}</div>
            <div style={{ fontSize: 11, color: COLORS.textLight, marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Featured */}
      <h2 style={{ fontFamily: "Georgia, serif", fontSize: 20, color: COLORS.navy, margin: "0 0 16px", fontWeight: 700 }}>Featured Opportunities</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: 36 }}>
        {SAMPLE_INTERNSHIPS.filter(i => i.featured).slice(0, 4).map(item => (
          <div key={item.id} style={{
            padding: "20px",
            backgroundColor: COLORS.white,
            border: `1px solid ${COLORS.border}`,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 11, color: COLORS.textLight, textTransform: "uppercase", letterSpacing: "0.5px" }}>{item.org}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.navy, fontFamily: "Georgia, serif", marginTop: 2 }}>{item.title}</div>
              </div>
              <Badge>{item.type}</Badge>
            </div>
            <p style={{ fontSize: 13, color: COLORS.textLight, lineHeight: 1.5, margin: 0 }}>{item.description}</p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: 8, borderTop: `1px solid ${COLORS.border}` }}>
              <span style={{ fontSize: 12, color: COLORS.textLight }}>📍 {item.location}</span>
              <span style={{ fontSize: 12, color: COLORS.alert, fontWeight: 600 }}>Deadline: {new Date(item.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <h2 style={{ fontFamily: "Georgia, serif", fontSize: 20, color: COLORS.navy, margin: "0 0 16px", fontWeight: 700 }}>Quick Links</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {[
          { title: "LinkedIn Group", desc: "Join the UATX Talent Network on LinkedIn", action: "Join Now" },
          { title: "MeritFirst Exams", desc: "Demonstrate your skills through practical assessments", action: "Learn More" },
          { title: "Finance Skills Development", desc: "Build competitive finance skills with up to $250 reimbursed", action: "Get Started" },
        ].map((link, i) => (
          <div key={i} style={{
            padding: "20px",
            backgroundColor: COLORS.navyDark,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.cream, fontFamily: "Georgia, serif" }}>{link.title}</div>
            <p style={{ fontSize: 13, color: COLORS.cream + "88", lineHeight: 1.5, margin: 0, flex: 1 }}>{link.desc}</p>
            <Button variant="secondary" size="sm">{link.action}</Button>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ─── OPPORTUNITIES ───
const OpportunitiesPage = () => {
  const [search, setSearch] = useState("");
  const [filterIndustry, setFilterIndustry] = useState("All");
  const [filterType, setFilterType] = useState("All");

  const filtered = SAMPLE_INTERNSHIPS.filter(i => {
    const matchSearch = i.title.toLowerCase().includes(search.toLowerCase()) || i.org.toLowerCase().includes(search.toLowerCase());
    const matchIndustry = filterIndustry === "All" || i.industry === filterIndustry;
    const matchType = filterType === "All" || i.type === filterType;
    return matchSearch && matchIndustry && matchType;
  });

  const selectStyle = {
    padding: "8px 12px",
    border: `1px solid ${COLORS.border}`,
    backgroundColor: COLORS.white,
    fontSize: 13,
    color: COLORS.text,
    fontFamily: "'Libre Franklin', sans-serif",
    cursor: "pointer",
    outline: "none",
    minWidth: 160,
  };

  return (
    <div style={{ padding: "32px 40px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: 26, color: COLORS.navy, margin: 0 }}>Job & Internship Opportunities</h1>
        <Button size="sm" variant="ghost" style={{ fontSize: 11 }}>+ Submit a Listing</Button>
      </div>

      {/* Filters */}
      <div style={{
        display: "flex",
        gap: 12,
        marginBottom: 24,
        padding: "16px 20px",
        backgroundColor: COLORS.white,
        border: `1px solid ${COLORS.border}`,
        alignItems: "center",
      }}>
        <input
          type="text"
          placeholder="Search opportunities..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1,
            padding: "8px 12px",
            border: `1px solid ${COLORS.border}`,
            fontSize: 13,
            fontFamily: "'Libre Franklin', sans-serif",
            outline: "none",
          }}
        />
        <select value={filterIndustry} onChange={e => setFilterIndustry(e.target.value)} style={selectStyle}>
          <option value="All">All Industries</option>
          {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={selectStyle}>
          <option value="All">All Types</option>
          <option>Internship</option>
          <option>Fellowship</option>
          <option>Program</option>
        </select>
      </div>

      <div style={{ fontSize: 12, color: COLORS.textLight, marginBottom: 16 }}>{filtered.length} opportunities found</div>

      {/* Listings */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.map(item => (
          <div key={item.id} style={{
            padding: "20px 24px",
            backgroundColor: COLORS.white,
            border: `1px solid ${COLORS.border}`,
            display: "flex",
            alignItems: "center",
            gap: 20,
            transition: "border-color 0.15s ease",
          }}>
            {/* Org icon placeholder */}
            <div style={{
              width: 48, height: 48, borderRadius: 4,
              backgroundColor: COLORS.navyDark,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: COLORS.gold, fontSize: 16, fontWeight: 700, fontFamily: "Georgia, serif",
              flexShrink: 0,
            }}>
              {item.org.charAt(0)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: COLORS.navy, fontFamily: "Georgia, serif" }}>{item.title}</span>
                <Badge>{item.type}</Badge>
                {item.paid && <Badge color={COLORS.success}>Paid</Badge>}
              </div>
              <div style={{ fontSize: 12, color: COLORS.textLight }}>{item.org} · {item.location}</div>
              <p style={{ fontSize: 13, color: COLORS.text, margin: "6px 0 0", lineHeight: 1.4 }}>{item.description}</p>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: COLORS.alert, fontWeight: 600, marginBottom: 8 }}>
                Due {new Date(item.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </div>
              <Badge color={COLORS.navyLight}>{item.industry}</Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── CALENDAR ───
const CalendarPage = () => {
  const [month] = useState(2); // March 2025
  const deadlines = SAMPLE_INTERNSHIPS.map(i => ({ ...i, dateObj: new Date(i.deadline) }));
  const events = SAMPLE_EVENTS.map(e => ({ ...e, dateObj: new Date(e.date) }));

  const daysInMonth = 31; // March
  const firstDay = 6; // March 1, 2025 is Saturday
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  const getItems = (day) => {
    if (!day) return [];
    const items = [];
    deadlines.forEach(dl => { if (dl.dateObj.getMonth() === month && dl.dateObj.getDate() === day) items.push({ type: "deadline", label: dl.org }); });
    events.forEach(ev => { if (ev.dateObj.getMonth() === month && ev.dateObj.getDate() === day) items.push({ type: "event", label: ev.title }); });
    return items;
  };

  return (
    <div style={{ padding: "32px 40px" }}>
      <h1 style={{ fontFamily: "Georgia, serif", fontSize: 26, color: COLORS.navy, margin: "0 0 8px" }}>Calendar</h1>
      <p style={{ color: COLORS.textLight, fontSize: 13, margin: "0 0 24px" }}>Application deadlines and upcoming events</p>

      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <Badge color={COLORS.alert}>● Application Deadlines</Badge>
        <Badge color={COLORS.success}>● Events & Programs</Badge>
      </div>

      <div style={{ backgroundColor: COLORS.white, border: `1px solid ${COLORS.border}`, padding: 24 }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <span style={{ fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 700, color: COLORS.navy }}>March 2025</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1, backgroundColor: COLORS.border }}>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
            <div key={d} style={{ padding: "8px", textAlign: "center", fontSize: 11, fontWeight: 600, color: COLORS.textLight, backgroundColor: COLORS.cream, textTransform: "uppercase", letterSpacing: "0.5px" }}>{d}</div>
          ))}
          {days.map((day, i) => {
            const items = getItems(day);
            return (
              <div key={i} style={{
                minHeight: 80,
                padding: "6px 8px",
                backgroundColor: day ? COLORS.white : COLORS.cream,
                position: "relative",
              }}>
                {day && (
                  <>
                    <div style={{ fontSize: 13, fontWeight: items.length ? 700 : 400, color: items.length ? COLORS.navy : COLORS.textLight }}>{day}</div>
                    {items.map((item, j) => (
                      <div key={j} style={{
                        fontSize: 9,
                        padding: "2px 4px",
                        marginTop: 2,
                        borderRadius: 2,
                        backgroundColor: item.type === "deadline" ? COLORS.alert + "15" : COLORS.success + "15",
                        color: item.type === "deadline" ? COLORS.alert : COLORS.success,
                        fontWeight: 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}>{item.label}</div>
                    ))}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming list */}
      <h2 style={{ fontFamily: "Georgia, serif", fontSize: 18, color: COLORS.navy, margin: "32px 0 16px" }}>Upcoming Deadlines</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {deadlines.sort((a, b) => a.dateObj - b.dateObj).slice(0, 5).map(dl => (
          <div key={dl.id} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 16px", backgroundColor: COLORS.white, border: `1px solid ${COLORS.border}`,
          }}>
            <div>
              <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.navy }}>{dl.title}</span>
              <span style={{ fontSize: 12, color: COLORS.textLight, marginLeft: 8 }}>at {dl.org}</span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.alert }}>
              {dl.dateObj.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── PROFILE ───
const ProfilePage = () => {
  const [selectedIndustries, setSelectedIndustries] = useState(["Finance & Banking", "Law & Policy", "Government"]);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const toggleIndustry = (ind) => {
    setSelectedIndustries(prev => prev.includes(ind) ? prev.filter(i => i !== ind) : [...prev, ind]);
  };

  return (
    <div style={{ padding: "32px 40px" }}>
      <h1 style={{ fontFamily: "Georgia, serif", fontSize: 26, color: COLORS.navy, margin: "0 0 24px" }}>My Profile</h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Interests */}
        <div style={{ backgroundColor: COLORS.white, border: `1px solid ${COLORS.border}`, padding: 24 }}>
          <h3 style={{ fontFamily: "Georgia, serif", fontSize: 18, color: COLORS.navy, margin: "0 0 4px" }}>Industry Interests</h3>
          <p style={{ fontSize: 12, color: COLORS.textLight, margin: "0 0 16px" }}>Select industries to get matched opportunities and email alerts.</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {INDUSTRIES.map(ind => (
              <div
                key={ind}
                onClick={() => toggleIndustry(ind)}
                style={{
                  padding: "6px 14px",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  border: `1px solid ${selectedIndustries.includes(ind) ? COLORS.gold : COLORS.border}`,
                  backgroundColor: selectedIndustries.includes(ind) ? COLORS.gold + "15" : COLORS.white,
                  color: selectedIndustries.includes(ind) ? COLORS.goldMuted : COLORS.textLight,
                  transition: "all 0.15s ease",
                }}
              >{ind}</div>
            ))}
          </div>
          <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <div
              onClick={() => setEmailAlerts(!emailAlerts)}
              style={{
                width: 36, height: 20, borderRadius: 10, cursor: "pointer",
                backgroundColor: emailAlerts ? COLORS.gold : COLORS.border,
                position: "relative", transition: "background-color 0.2s ease",
              }}
            >
              <div style={{
                width: 16, height: 16, borderRadius: "50%", backgroundColor: COLORS.white,
                position: "absolute", top: 2,
                left: emailAlerts ? 18 : 2,
                transition: "left 0.2s ease",
                boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
              }} />
            </div>
            <span style={{ fontSize: 13, color: COLORS.text }}>Email me when new opportunities match my interests</span>
          </div>
          <Button style={{ marginTop: 16 }} size="sm">Save Preferences</Button>
        </div>

        {/* Internship History */}
        <div style={{ backgroundColor: COLORS.white, border: `1px solid ${COLORS.border}`, padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h3 style={{ fontFamily: "Georgia, serif", fontSize: 18, color: COLORS.navy, margin: 0 }}>Internship History</h3>
              <p style={{ fontSize: 12, color: COLORS.textLight, margin: "4px 0 0" }}>Log your past and current internship experiences.</p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setShowForm(!showForm)}>+ Add Entry</Button>
          </div>

          {showForm && (
            <div style={{
              padding: 16,
              backgroundColor: COLORS.cream,
              border: `1px solid ${COLORS.border}`,
              marginBottom: 16,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.navy, marginBottom: 4 }}>Log New Internship</div>
              {[
                { label: "Organization", placeholder: "e.g. Hudson Institute" },
                { label: "Role Title", placeholder: "e.g. Policy Research Intern" },
                { label: "Industry", placeholder: "Select...", type: "select" },
                { label: "Start Date", placeholder: "", type: "date" },
                { label: "End Date", placeholder: "", type: "date" },
              ].map((field, i) => (
                <div key={i}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: COLORS.textLight, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 4 }}>{field.label}</label>
                  {field.type === "select" ? (
                    <select style={{ width: "100%", padding: "8px", border: `1px solid ${COLORS.border}`, fontSize: 13, backgroundColor: COLORS.white }}>
                      <option>Select industry...</option>
                      {INDUSTRIES.map(ind => <option key={ind}>{ind}</option>)}
                    </select>
                  ) : (
                    <input type={field.type || "text"} placeholder={field.placeholder} style={{ width: "100%", padding: "8px", border: `1px solid ${COLORS.border}`, fontSize: 13, boxSizing: "border-box" }} />
                  )}
                </div>
              ))}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: COLORS.textLight, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 4 }}>Description / Key Takeaways</label>
                <textarea rows={3} placeholder="What did you work on? What did you learn?" style={{ width: "100%", padding: "8px", border: `1px solid ${COLORS.border}`, fontSize: 13, resize: "vertical", boxSizing: "border-box", fontFamily: "'Libre Franklin', sans-serif" }} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Button size="sm">Submit</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {/* Sample history entries */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { org: "Senator Ted Cruz", role: "Legislative Intern", dates: "Jun – Aug 2024", industry: "Government" },
              { org: "Futures Forge", role: "Venture Fellow", dates: "Jan – May 2024", industry: "Finance & Banking" },
            ].map((entry, i) => (
              <div key={i} style={{ padding: "12px 16px", border: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.navy }}>{entry.role}</div>
                  <div style={{ fontSize: 12, color: COLORS.textLight }}>{entry.org} · {entry.dates}</div>
                </div>
                <Badge color={COLORS.navyLight}>{entry.industry}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── COMMUNITY ───
const CommunityPage = () => {
  const [filter, setFilter] = useState("All");
  const categories = ["All", "Academic", "Professional", "Creative", "Recreation"];
  const filtered = filter === "All" ? SAMPLE_ACTIVITIES : SAMPLE_ACTIVITIES.filter(a => a.category === filter);

  return (
    <div style={{ padding: "32px 40px" }}>
      <h1 style={{ fontFamily: "Georgia, serif", fontSize: 26, color: COLORS.navy, margin: "0 0 8px" }}>Community</h1>
      <p style={{ color: COLORS.textLight, fontSize: 13, margin: "0 0 24px" }}>Student activities, clubs, and campus life</p>

      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {categories.map(cat => (
          <div
            key={cat}
            onClick={() => setFilter(cat)}
            style={{
              padding: "6px 16px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              backgroundColor: filter === cat ? COLORS.navy : COLORS.white,
              color: filter === cat ? COLORS.gold : COLORS.textLight,
              border: `1px solid ${filter === cat ? COLORS.navy : COLORS.border}`,
              transition: "all 0.15s ease",
            }}
          >{cat}</div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {filtered.map(club => (
          <div key={club.id} style={{
            backgroundColor: COLORS.white,
            border: `1px solid ${COLORS.border}`,
            overflow: "hidden",
          }}>
            <div style={{ height: 8, backgroundColor: COLORS.navy }} />
            <div style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <h3 style={{ fontFamily: "Georgia, serif", fontSize: 16, color: COLORS.navy, margin: 0 }}>{club.title}</h3>
                <Badge>{club.category}</Badge>
              </div>
              <p style={{ fontSize: 13, color: COLORS.textLight, lineHeight: 1.5, margin: "0 0 12px" }}>{club.desc}</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTop: `1px solid ${COLORS.border}` }}>
                <span style={{ fontSize: 11, color: COLORS.textLight }}>{club.members} members · {club.meetDay}</span>
                <Button size="sm" variant="secondary">Join</Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── EVENTS & TRAVEL ───
const EventsPage = () => (
  <div style={{ padding: "32px 40px" }}>
    <h1 style={{ fontFamily: "Georgia, serif", fontSize: 26, color: COLORS.navy, margin: "0 0 8px" }}>UATX Sponsored Events & Travel</h1>
    <p style={{ color: COLORS.textLight, fontSize: 13, margin: "0 0 24px" }}>Conferences, study abroad, and travel programs sponsored by the university</p>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
      {[
        { title: "Texas Stock Exchange Visit", type: "Student Visit", date: "March 10, 2025", desc: "Tour the new Texas Stock Exchange headquarters and meet industry leaders." },
        { title: "AHA Foundation Speaker Series", type: "VIP Event Partnership", date: "March 14, 2025", desc: "Hear from leading voices on human rights and civil liberties." },
        { title: "Study Abroad: Israel", type: "Study Abroad", date: "May 20, 2025", desc: "Immersive cultural and academic experience in Israel." },
        { title: "AEI Summer Honors Program", type: "Summer Program", date: "June 1, 2025", desc: "Intensive program on policy analysis and political economy." },
        { title: "Austin Institute Forum", type: "Conference", date: "March 28, 2025", desc: "The Austin Institute's forum on religion, science, and the future." },
        { title: "Forge Leadership Summit", type: "Conference", date: "June 15, 2025", desc: "Leadership development conference in Nashville and Columbus." },
      ].map((event, i) => (
        <div key={i} style={{
          backgroundColor: COLORS.white,
          border: `1px solid ${COLORS.border}`,
          overflow: "hidden",
        }}>
          <div style={{
            height: 100,
            background: `linear-gradient(135deg, ${COLORS.navy} 0%, ${COLORS.navyLight} 100%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <span style={{ color: COLORS.gold, fontFamily: "Georgia, serif", fontSize: 18, fontWeight: 700, textAlign: "center", padding: "0 16px" }}>{event.title}</span>
          </div>
          <div style={{ padding: 20 }}>
            <Badge>{event.type}</Badge>
            <p style={{ fontSize: 13, color: COLORS.textLight, lineHeight: 1.5, margin: "10px 0" }}>{event.desc}</p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTop: `1px solid ${COLORS.border}` }}>
              <span style={{ fontSize: 12, color: COLORS.text, fontWeight: 600 }}>{event.date}</span>
              <Button size="sm">Learn More</Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ─── MAIN APP ───
export default function App() {
  const [activeTab, setActiveTab] = useState("home");

  const pages = {
    home: <HomePage setActiveTab={setActiveTab} />,
    opportunities: <OpportunitiesPage />,
    calendar: <CalendarPage />,
    profile: <ProfilePage />,
    community: <CommunityPage />,
    events: <EventsPage />,
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Libre Franklin', sans-serif", backgroundColor: COLORS.cream }}>
      <link href="https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div style={{ flex: 1, minWidth: 0, overflowY: "auto", maxHeight: "100vh" }}>
        {pages[activeTab]}
      </div>
    </div>
  );
}
