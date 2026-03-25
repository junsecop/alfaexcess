# Alfanex Attendance App — Claude Context

## Project Overview
Internal workforce management system for **Alfanex Solutions Pvt. Ltd.**
- Attendance tracking, billing, tasks, user management, file uploads
- ~75% complete as of March 2026

## Stack

### Frontend — `attend/`
- React 19 + Vite 8 + Tailwind CSS 4
- React Router 7, Axios
- Entry: `attend/src/main.jsx` → `App.jsx`
- Dev server: `npm run dev` (port 5173, proxies `/api` → localhost:5003)

### Backend — `server/`
- Express.js (ESM) + Node.js
- Entry: `server/server.js` (port 5003)
- Dev: `npm run dev` (nodemon)

### Database & Storage
- **Supabase PostgreSQL** — production database
- **Supabase Storage** — file uploads (bills, docs, products)
- Custom Prisma-like adapter at `server/config/db.js` (uses Supabase REST API, mimics Prisma syntax)
- Prisma schema at `server/prisma/schema.prisma` (reference only)

### Auth
- JWT with httpOnly cookies (access + refresh tokens)
- `server/middleware/auth.js` — `protect` + `requireRole(...roles)`
- Roles: `staff` / `manager` / `admin`

## Deployment
- Frontend: Vercel (static build from `attend/dist/`)
- Backend: Vercel Serverless Function at `attend/api/index.js`
- `attend/api/lib/db.js` — Supabase-backed db adapter used in production (same API as server/config/db.js)

## Key Design Decisions
- **Direct upload to Supabase Storage** via signed URLs — browser uploads directly, bypasses Vercel 4.5MB limit
- **IST timezone** (`Asia/Kolkata`) everywhere, 12-hour format for display
- Admin check-in creates `status: 'visit'` (not attendance), notifies all active users
- Soft delete (deactivate) for users, not permanent delete
- Late threshold: after 09:30 IST = `late`, otherwise `present`

## Attendance Statuses
`present` | `late` | `absent` | `leave` | `half_day` | `visit`

## Branding Colors
- Purple: `#684df4`
- Navy: `#17184a`
- Lime: `#c8f04a`
- Background: `#f7f8fc`

## Pages (`attend/src/pages/`)
| File | Purpose |
|---|---|
| `Login.jsx` | Auth — name or email + password |
| `Dashboard.jsx` | Today's check-in/out (Full/Half Day) |
| `Attendance.jsx` | Personal records + admin all-staff view |
| `Billing.jsx` | Submit/approve/reject bills |
| `WorkLog.jsx` | Work log tracking |
| `DataUploads.jsx` | Upload/manage documents |
| `Products.jsx` | Product management |
| `Users.jsx` | Add/edit/deactivate users, reset passwords |
| `Notifications.jsx` | Notification center |
| `Settings.jsx` | Profile info |

## Components (`attend/src/components/`)
- `Layout.jsx` — main wrapper
- `Sidebar.jsx` — collapsible desktop / slide-in drawer mobile
- `Topbar.jsx` — top nav
- `PrivateRoute.jsx` — route guard

## API Routes (`server/routes/` and `attend/api/index.js`)
- `POST /api/auth/login` — returns JWT cookie
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/attendance/checkin` — GPS optional, admin creates visit
- `POST /api/attendance/checkout` — optional halfDay flag
- `GET /api/attendance/my` — own records, filter by `?month=YYYY-MM`
- `GET /api/attendance/today`
- `GET /api/attendance/all` — admin/manager
- `PATCH /api/attendance/:id` — admin/manager edit
- `POST /api/attendance/mark` — admin/manager mark any user
- `POST /api/attendance/sync` — sync to Google Sheets
- `GET /api/attendance/stats`
- `GET/POST/PATCH/DELETE /api/billing/`
- `GET/POST/PATCH/DELETE /api/tasks/`
- `GET/POST/PATCH/DELETE /api/products/`
- `GET/POST/DELETE /api/uploads/`
- `GET/PATCH /api/notifications/`
- `GET/POST/PATCH/DELETE /api/users/`

## Environment Variables (server/.env)
```
PORT=5003
JWT_SECRET=...
JWT_REFRESH_SECRET=...
CLIENT_URL=http://localhost:5173
SUPABASE_URL=...
SUPABASE_KEY=...
```
Vercel env vars: same keys set in Vercel dashboard.

## Pending / In Progress
- Profile page UI (backend routes exist, frontend may need polish)
- Any remaining frontend features

## Google Sheets Integration
- `server/utils/sheets.js` — syncs attendance records to Google Sheet
- Triggered via `POST /api/attendance/sync` (admin/manager only)
