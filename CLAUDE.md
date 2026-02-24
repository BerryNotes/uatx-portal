# UATX Student Portal Project

## Overview
Rebuilding an existing Google Sites student portal (https://sites.google.com/student.uaustin.org/testtest/student-portal) as standalone HTML. Two versions:
- **Replica** — pixel-perfect copy of the Google Sites original
- **Prototype** — improved version with search, filters, calendar, profiles (React 18 + Babel standalone)

## Files
- `server.js` — Node.js dev server on port 3333. Routes: `/` → landing, `/replica` → replica, `/prototype` → prototype. Serves images from `UATX Portal Images/` folder via `/images/` URL path.
- `index.html` — Dark landing page with cards linking to both versions
- `uatx-existing-portal-replica.html` — Single-file HTML/CSS/JS replica (main focus)
- `uatx-portal-prototype.html` — React 18 prototype (not yet modified)
- `uatx-portal-prototype.jsx` — Same as above in JSX module format
- `uatx-portal-plan-v3.docx` — Planning doc
- `UATX Portal Images/` — Screenshots for home page sections:
  - `studnt portal.png` — University of Austin interior (welcome section image)
  - `linkedin.png` — LinkedIn logo (LinkedIn section image)
  - `finance skill dev.png` — Businessman with briefcase (Finance Skills section image)
  - `merit first exams.png` — Leaf/star logo (MeritFirst section image)

## Replica Structure
Single HTML file with sidebar navigation + multiple "pages" shown/hidden via JS.

### Pages
1. **Home** — 5 sections in order:
   - Welcome to the UATX Student Opportunity Portal (with `studnt portal.png` image)
   - Unpaid Internship Support (text only, no image)
   - Join the LinkedIn Group (with `linkedin.png`, layout: text LEFT, image RIGHT — uses `.reverse` class)
   - Finance Skills Development (with `finance skill dev.png`)
   - MeritFirst Exams (with `merit first exams.png`, layout reversed)
2. **Opportunities** — Grid of internship/job cards generated from JS array
3. **Events** — Event cards with dates

### Styling
- **Font**: Roboto (Google Fonts) — sans-serif everywhere, NO serif fonts
- **Hero banner**: 50vh height, Austin skyline photo (`https://t3.ftcdn.net/jpg/05/22/31/18/360_F_522311897_jvzAtywbLH7UVsfgVWIfL4kPRA2sg8L0.jpg`) with dark overlay
- **Divider bar below hero**: 30px tall, dark navy (`var(--navy-dark)`)
- **Sidebar**: 264px wide, dark navy background
- **CSS variables**: --navy (#1a2332), --gold (#c9a84c), --cream (#f5f0e8)
- **Alternating section bands**: odd=navy-dark, even=#d5cfc5 (beige-gray)
- **Light band text**: adapted colors for readability on light backgrounds

### Home Section Layout
- `.info-section` — flexbox row with `.info-text` and `.info-img`
- `.info-section.reverse` — flips to `row-reverse` (image left, text right)
- Images are 180x180px with border-radius 8px

### Opportunities
- Generated from JS array with org, title, desc, initials
- Per-company logo styles in `logoStyles` object
- Logos are 100x100px with white backgrounds
- First opportunity: GovAI "DC Senate Fellowship"

## Dev Workflow
```
cd "C:\Users\peter\Downloads\UATX Student Portal"
node server.js
```
- http://localhost:3333 — Landing page
- http://localhost:3333/replica — Google Sites replica
- http://localhost:3333/prototype — Improved prototype

## Current Status
- Replica home page mostly done, needs visual comparison with screenshots to refine
- Images wired up but server needs restart after server.js changes
- Prototype not yet modified
- Individual opportunity detail pages not yet created (user says "those are simple")

## TODO
- Continue refining replica to match Google Sites screenshots exactly
- Build out the improved prototype version
- Create individual opportunity pages
