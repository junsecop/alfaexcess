# Alfanex Attendance & Management App

A full-stack attendance and business management system built for alfanex.in.

---

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Express.js (ESM)
- **Database**: Supabase PostgreSQL (via REST API)
- **File Storage**: Supabase Storage
- **Auth**: JWT (httpOnly cookies) + bcryptjs

---

## Features

### Auth & Users
- Login / Logout / JWT refresh token
- Roles: `admin`, `manager`, `staff`
- Manager has full admin permissions
- Admin can create, edit, and deactivate users
- Admin can reset any user's password

### Attendance
- Check-in (auto marks `late` if after 9:30 AM)
- Check-out: Full Day or Half Day
- Admin/Manager can mark absence or leave for any user
- View all attendance with filters (month, user, status)
- Attendance stats overview

### Billing
- Staff submits bills with optional file attachment
- Admin/Manager can approve or reject bills with a reason
- Admin can delete bills from the database
- Spending report breakdown by category and month

### Data Uploads
- Upload documents (PDF, images, Excel) to Supabase Storage
- Admin/Manager only
- Filter uploads by month and document type
- Delete removes file from Supabase Storage and DB

---

## Pages

| Page | Description |
|------|-------------|
| Dashboard | Today's check-in/out with Full Day / Half Day checkout |
| Attendance | Personal records + admin view of all staff |
| Billing | Submit, approve, reject, and delete bills |
| Data Uploads | Upload and manage documents |
| Users | Add, edit, deactivate users, reset passwords |
| Settings | Profile information |

---

## Setup

### 1. Supabase
- Create a project at [supabase.com](https://supabase.com)
- Run `server/setup.sql` in the Supabase SQL Editor to create all tables
- Go to **Storage** → create a bucket named `uploads` (set to Public)
- Get your project URL and anon key from **Settings → API**

### 2. Backend

```bash
cd server
npm install
```

Create `server/.env`:

```env
PORT=5003
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
CLIENT_URL=http://localhost:5173
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_anon_key
```

Start the server:

```bash
npm run dev
```

Default admin account (auto-seeded on first run):
- Email: `admin@alfanex.com`
- Password: `admin123`

### 3. Frontend

```bash
cd attend
npm install
npm run dev
```

---

## Deployment

- **Backend**: Render.com — set Root Directory to `server`
- **Frontend**: Vercel — set Root Directory to `attend`

---

## Project Structure

```
├── attend/          # React frontend (Vite)
│   └── src/
│       ├── pages/
│       ├── components/
│       ├── context/
│       └── api/
├── server/          # Express backend
│   ├── routes/
│   ├── config/
│   ├── middleware/
│   └── utils/
└── README.md
```

---

© 2025 Alfanex · alfanex.in
