const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = "UATX Student Portal <onboarding@resend.dev>";

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

async function sendEmail({ to, subject, html, replyTo }) {
  if (!RESEND_API_KEY || RESEND_API_KEY === "re_xxxxxxxxxxxx") {
    console.log(`[email] Skipped (no API key): "${subject}" → ${to}`);
    return { skipped: true };
  }
  try {
    const payload = { from: FROM_EMAIL, to, subject, html };
    if (replyTo) payload.reply_to = replyTo;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error(`[email] Failed: ${res.status}`, data);
      return { error: data };
    }
    console.log(`[email] Sent: "${subject}" → ${to}`);
    return data;
  } catch (err) {
    console.error(`[email] Error:`, err.message);
    return { error: err.message };
  }
}

// ─── TEMPLATES ───

const wrapper = (content) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border:1px solid #e0d8c8;">
    <div style="background:#1a2332;padding:24px 32px;text-align:center;">
      <span style="color:#c9a84c;font-size:20px;font-weight:700;letter-spacing:1px;">UATX</span>
      <span style="color:#f5f0e8;font-size:14px;margin-left:8px;opacity:0.7;">Student Portal</span>
    </div>
    <div style="padding:32px;">
      ${content}
    </div>
    <div style="padding:16px 32px;background:#f9f7f3;border-top:1px solid #e0d8c8;text-align:center;">
      <span style="font-size:11px;color:#999;">University of Austin &middot; Student Opportunity Portal</span>
    </div>
  </div>
</body>
</html>`;

function sendWelcomeEmail(to, name) {
  const firstName = escapeHtml(name.split(" ")[0]);
  return sendEmail({
    to,
    subject: "Welcome to the UATX Student Portal",
    html: wrapper(`
      <h2 style="margin:0 0 16px;color:#1a2332;font-size:22px;">Welcome, ${firstName}!</h2>
      <p style="margin:0 0 16px;color:#2c2c2c;font-size:15px;line-height:1.7;">
        Your account on the UATX Student Opportunity Portal is now active.
      </p>
      <p style="margin:0 0 16px;color:#2c2c2c;font-size:15px;line-height:1.7;">
        Here's what you can do:
      </p>
      <ul style="margin:0 0 20px;padding-left:20px;color:#2c2c2c;font-size:14px;line-height:1.8;">
        <li>Browse internships, fellowships, and job opportunities</li>
        <li>Set your industry interests to get personalized recommendations</li>
        <li>Enable email alerts to be notified when new opportunities match your interests</li>
        <li>Track your applications and save opportunities for later</li>
      </ul>
      <p style="margin:0;color:#2c2c2c;font-size:15px;line-height:1.7;">
        Head to your <strong>Profile</strong> tab to set your preferences and get started.
      </p>
    `),
  });
}

function sendOpportunityNotification(to, name, opportunity) {
  const firstName = escapeHtml(name.split(" ")[0]);
  const deadlineStr = opportunity.deadline
    ? new Date(opportunity.deadline).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "Rolling";
  const title = escapeHtml(opportunity.title);
  const org = escapeHtml(opportunity.org);
  const desc = escapeHtml(opportunity.description);
  const loc = escapeHtml(opportunity.location);
  const type = escapeHtml(opportunity.type || "Internship");
  const industry = escapeHtml(opportunity.industry);
  return sendEmail({
    to,
    subject: `New Opportunity: ${opportunity.title} at ${opportunity.org}`,
    html: wrapper(`
      <h2 style="margin:0 0 16px;color:#1a2332;font-size:22px;">New Opportunity</h2>
      <p style="margin:0 0 8px;color:#2c2c2c;font-size:15px;line-height:1.7;">
        Hi ${firstName}, a new opportunity matching your interests was just posted:
      </p>
      <div style="margin:20px 0;padding:20px;background:#f9f7f3;border-left:3px solid #c9a84c;">
        <h3 style="margin:0 0 4px;color:#1a2332;font-size:17px;">${title}</h3>
        <p style="margin:0 0 12px;color:#c9a84c;font-size:13px;font-weight:600;">${org}</p>
        <p style="margin:0 0 8px;color:#2c2c2c;font-size:14px;line-height:1.6;">${desc}</p>
        <p style="margin:0;font-size:13px;color:#6b6b6b;">
          ${loc ? loc + " &middot; " : ""}${type} &middot; Deadline: ${deadlineStr}
          ${opportunity.paid ? ' &middot; <span style="color:#4a7c59;font-weight:600;">Paid</span>' : ""}
        </p>
      </div>
      <p style="margin:0;color:#6b6b6b;font-size:12px;">
        You're receiving this because you have email alerts enabled and "${industry}" is in your interests.
        Update your preferences in the Portal to change your notification settings.
      </p>
    `),
  });
}

function sendClubEmail(to, memberName, clubTitle, presidentName, presidentEmail, subject, message) {
  return sendEmail({
    to,
    replyTo: presidentEmail,
    subject: `${clubTitle}: ${subject}`,
    html: `<pre style="font-family:sans-serif;white-space:pre-wrap;margin:0;">${escapeHtml(message)}</pre>`,
  });
}

function sendClubSubmissionNotification(adminEmail, activity, submitterName) {
  const name = escapeHtml(submitterName);
  const title = escapeHtml(activity.title);
  const category = escapeHtml(activity.category);
  const desc = escapeHtml(activity.description);
  const meetDay = escapeHtml(activity.meet_day);
  const presEmail = escapeHtml(activity.president_email);
  return sendEmail({
    to: adminEmail,
    subject: `New Club Submission: ${activity.title}`,
    html: wrapper(`
      <h2 style="margin:0 0 16px;color:#1a2332;font-size:22px;">New Club Submission</h2>
      <p style="margin:0 0 16px;color:#2c2c2c;font-size:15px;line-height:1.7;">
        <strong>${name}</strong> submitted a new club for review:
      </p>
      <div style="margin:20px 0;padding:20px;background:#f9f7f3;border-left:3px solid #c9a84c;">
        <h3 style="margin:0 0 8px;color:#1a2332;font-size:17px;">${title}</h3>
        ${category ? '<p style="margin:0 0 6px;color:#c9a84c;font-size:13px;font-weight:600;">' + category + '</p>' : ''}
        ${desc ? '<p style="margin:0 0 8px;color:#2c2c2c;font-size:14px;line-height:1.6;">' + desc + '</p>' : ''}
        <p style="margin:0;font-size:13px;color:#6b6b6b;">
          ${meetDay ? 'Meets: ' + meetDay + ' &middot; ' : ''}
          ${presEmail ? 'President: ' + presEmail : ''}
        </p>
      </div>
      <p style="margin:0;color:#2c2c2c;font-size:14px;line-height:1.7;">
        Go to the <strong>Admin Dashboard</strong> to approve or reject this submission.
      </p>
    `),
  });
}

module.exports = { sendWelcomeEmail, sendOpportunityNotification, sendClubEmail, sendClubSubmissionNotification };
