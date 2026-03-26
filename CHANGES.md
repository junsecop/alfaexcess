# Alfanex Attendance App — Changes Log

All features and fixes added to the project.

---

## Bug Fixes

### RLS Policy Violation (Supabase Row-Level Security)
**Problem:** `new row violates row-level security policy` errors on billing and profile picture uploads.
**Fix:** Switched all 4 Supabase client instances from the anon key (`SUPABASE_KEY`) to the service role key (`SUPABASE_SERVICE_KEY`). The service role bypasses RLS — required for backend operations that use custom JWT auth instead of Supabase Auth.
**Files:** `attend/api/lib/db.js`, `server/config/supabaseDb.js`, `server/routes/billing.js`, `server/routes/uploads.js`

---

## UI / Branding

### Browser Tab Icon & Title
- Favicon changed to `title.png` (place file in `attend/public/title.png`)
- Browser tab title changed from `"attend"` to `"Alfanex"`
**File:** `attend/index.html`

### Sidebar — Logo Removed
Logo image was not visible on dark sidebar background. Reverted to text: "A" + "Alfanex".
**File:** `attend/src/components/Sidebar.jsx`

### Sidebar — Scrollbar Hidden
Added `.no-scrollbar` CSS utility to hide scrollbar while keeping scroll functionality.
**Files:** `attend/src/index.css`, `attend/src/components/Sidebar.jsx`

### Sidebar — Overflow Fix (100% Browser Zoom)
Replaced `minHeight: 100vh` with `h-full` on sidebar to stop it overflowing the viewport.
**File:** `attend/src/components/Sidebar.jsx`

---

## Auth & Profile

### Logout in Topbar Profile Dropdown
Profile avatar in topbar is now a dropdown showing user info + red **Sign out** button.
**File:** `attend/src/components/Topbar.jsx`

### Logout in Settings Page
Added **Sign out** button below "Change photo" section, styled to match "Save Profile" button.
**File:** `attend/src/pages/Settings.jsx`

---

## Contact Page (WhatsApp)

### New Page: Contact (`/whatsapp`)
Two tabs:
- **Contacts** — lists all staff with phone numbers, search by name/department, WhatsApp chat button per contact
- **Message Generator** — fill in customer name, date/time, purpose, optional product (with image), notes → generates formatted message → Copy or Share on WhatsApp

**Files:** `attend/src/pages/WhatsApp.jsx` (new), `attend/src/App.jsx`

### Sidebar Nav — Renamed to "Contact"
WhatsApp nav item renamed from `"WhatsApp"` to `"Contact"` with WhatsApp SVG icon.
**File:** `attend/src/components/Sidebar.jsx`

---

## Tasks — Payment Collection

### Task Creation — Customer Info Fields
New optional section in the "Assign Task" modal:
- **Amount to Collect (₹)** — stored as `collect:500` in the task's tags array
- **Phone Number** — stored as `phone:9876543210`
- **Location** — stored as `location:https://maps...` with GPS capture button

**File:** `attend/src/pages/WorkLog.jsx`

### Task Cards — Customer Badges
Task cards now show:
- Purple badge `₹500 to collect` (pending tasks with collect amount)
- Green WhatsApp button linking to customer phone
- Purple button linking to customer location (Google Maps)

**File:** `attend/src/pages/WorkLog.jsx`

### Payment Modal on Mark Done
When staff changes status to "Done" and the task has a `collect:` tag, a payment modal appears automatically before completing:
- **✅ Collected** → enter actual amount received → saves `payment:collected` + `paidamt:500`
- **❌ Not Collected** → enter customer name → saves `payment:pending` + `customer:Name`
- **Skip** → task completes without recording (staff can record later)

**File:** `attend/src/pages/WorkLog.jsx`

### Payment Badges on Done Tasks
Done task cards show payment status:
- `✓ ₹500 Collected` (green)
- `⚠ Payment Pending · Customer Name` (red)
- `⏳ Payment not recorded` (orange)
- **Edit Payment** button (admin/manager)
- **+ Record Payment** button (staff, if not yet recorded)

**File:** `attend/src/pages/WorkLog.jsx`

### Backend — Task Status PATCH Accepts Tags
`PATCH /api/tasks/:id/status` now accepts optional `tags` in body to save payment metadata alongside status update.
**Files:** `server/routes/tasks.js`, `attend/api/index.js`

---

## Billing — Collections Tab

### New Tab: Collections (Admin/Manager Only)
Billing page gains a **Collections** tab showing monthly payment analytics from field tasks:
- Summary cards: Total Collected (₹), Pending count, Collection Rate %
- Per-staff breakdown bar
- Collected payments list with WhatsApp button
- Pending follow-up list with customer name + WhatsApp "Call" button
- Month filter

**File:** `attend/src/pages/Billing.jsx`

---

## CSV Downloads

### Attendance — CSV Hidden from Staff
Download CSV button in Attendance page is now only visible to admin and manager. Staff can no longer download attendance data.
- Before: staff could download their own attendance CSV
- After: CSV download is admin/manager only

**File:** `attend/src/pages/Attendance.jsx`

### Billing — Download CSV Added
New `↓ Download CSV` button added to Billing page header (admin/manager only). Downloads `billing-YYYY-MM.csv` with columns: Title, Type, Category, Amount, Status, Month, Submitted By, Admin Note. Button disabled when no bills are loaded.
**File:** `attend/src/pages/Billing.jsx`

---

## Attendance — Auto Checkout

### Auto-Close Yesterday's Attendance
When a staff member opens the Dashboard (loads `/attendance/today`), the system checks if **yesterday's** attendance record for that person is still open (checked in but no checkout). If so:
- Checkout is set to `05:30 PM`
- A notification is created: `"yesterday record closed office 5:30 pm"`
- A yellow banner appears on the Dashboard with the same message

**Logic:** Runs only for the currently logged-in user. Only triggers if `checkIn` exists and `checkOut` is null for yesterday's date.

**Files:** `attend/api/index.js`, `server/routes/attendance.js`, `attend/src/pages/Dashboard.jsx`

---

## Presentation

### PRESENTATION.html Updated
Updated across multiple sessions to reflect all features:
- Added sections: Tasks + Payment Collection, Contact & WhatsApp, Collections analytics, Auto Checkout
- Added hero tags: Payment Collection, Task Assignment, WhatsApp Contacts, Auto Checkout 5:30 PM
- Summary table: Fixed CSV rows (staff can no longer download), added billing CSV row, added auto-checkout row
- Overview cards: Added Auto Checkout card
- Nav links updated

**File:** `PRESENTATION.html`

---

## Tag Format Reference (Tasks)

Tags stored in `Task.tags String[]` field — no schema changes required:

| Tag | Example | Meaning |
|---|---|---|
| `phone:` | `phone:9876543210` | Customer phone number |
| `location:` | `location:https://maps.google.com/...` | Customer location |
| `collect:` | `collect:500` | Amount to collect |
| `payment:` | `payment:collected` or `payment:pending` | Payment status |
| `paidamt:` | `paidamt:500` | Actual amount collected |
| `customer:` | `customer:Ravi Kumar` | Customer name (for pending follow-up) |
