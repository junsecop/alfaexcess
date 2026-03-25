# Alfanex — Vercel + Supabase Setup Guide

---

## STEP 1 — Create Supabase Project

1. Go to https://supabase.com and sign in
2. Click **New Project**
3. Fill in:
   - Name: `alfanex`
   - Database Password: (save this somewhere safe)
   - Region: pick closest to India (e.g. Singapore)
4. Wait for project to finish provisioning (~1 min)

---

## STEP 2 — Run Database Schema

1. In Supabase → click **SQL Editor** in left sidebar
2. Click **New Query**
3. Open `server/setup.sql` from this project
4. Copy the entire contents and paste into the SQL Editor
5. Click **Run**
6. You should see: "Success. No rows returned"

This creates all 7 tables and disables RLS automatically.

---

## STEP 3 — Create Storage Bucket

1. In Supabase → click **Storage** in left sidebar
2. Click **New Bucket**
3. Name it exactly: `uploads`
4. Toggle **Public bucket** → ON
5. Click **Save**

### Set Bucket Policy (allow uploads)
1. Click on the `uploads` bucket
2. Go to **Policies** tab
3. Click **New Policy** → **For full customization**
4. Add this policy:

```sql
CREATE POLICY "Allow all operations"
ON storage.objects
FOR ALL
TO public
USING (bucket_id = 'uploads')
WITH CHECK (bucket_id = 'uploads');
```

Or simply click **"Allow access to all users"** if that option appears.

---

## STEP 4 — Get Your API Keys

1. In Supabase → **Project Settings** (gear icon) → **API**
2. Copy these two values:

| Key | Where to find |
|-----|--------------|
| `SUPABASE_URL` | "Project URL" section |
| `SUPABASE_KEY` | "service_role" key under "Project API keys" |

> Use the **service_role** key — NOT the anon key.
> Never share or commit the service_role key.

---

## STEP 5 — Update Local .env

Open `server/.env` and update:

```
PORT=5003
JWT_SECRET=any_random_long_string_here
JWT_REFRESH_SECRET=another_random_long_string_here
CLIENT_URL=http://localhost:5173
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_KEY=eyJhbGci...your_service_role_key
```

---

## STEP 6 — Deploy to Vercel

### 6a — Push code to GitHub first
```bash
git add .
git commit -m "ready for deployment"
git push origin main
```

### 6b — Connect to Vercel
1. Go to https://vercel.com and sign in
2. Click **Add New → Project**
3. Import your GitHub repository
4. Set **Root Directory** to: `attend`
5. Framework: **Vite**
6. Click **Deploy** (it will fail first — that's OK, we need to add env vars)

### 6c — Add Environment Variables in Vercel
1. Go to your Vercel project → **Settings → Environment Variables**
2. Add each variable:

| Name | Value |
|------|-------|
| `SUPABASE_URL` | your Supabase project URL |
| `SUPABASE_KEY` | your service_role key |
| `JWT_SECRET` | same as your local .env |
| `JWT_REFRESH_SECRET` | same as your local .env |
| `CLIENT_URL` | your Vercel app URL (e.g. https://alfanex.vercel.app) |
| `NODE_ENV` | `production` |

3. Click **Save**

### 6d — Redeploy
1. Go to **Deployments** tab
2. Click the three dots on the latest deployment
3. Click **Redeploy**

---

## STEP 7 — Update CORS for Production

After you get your Vercel URL (e.g. `https://alfanex.vercel.app`):

1. In Vercel env vars, set `CLIENT_URL` = your actual Vercel URL
2. Redeploy once more

---

## STEP 8 — Verify Everything Works

Open your Vercel URL and:

- [ ] Login page loads
- [ ] Login with `admin@alfanex.com` / `admin123`
- [ ] Dashboard shows check-in button
- [ ] Submit a bill with a file attachment
- [ ] Admin sees the bill in Approvals tab
- [ ] File opens when clicking "View File"

---

## Default Admin Account

Created automatically on first server start:

```
Email:    admin@alfanex.com
Password: admin123
```

Change this password immediately after first login.

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `new row violates row-level security` | You used anon key — switch to service_role key |
| `Failed to load resource 404` on upload-url | Server not running or env vars missing |
| `CORS error` | CLIENT_URL env var doesn't match your frontend URL |
| `JWT malformed` | JWT_SECRET is different between local and Vercel |
| File upload fails | Storage bucket not named `uploads` or not set to public |
| Login fails after redeploy | JWT_SECRET changed — users need to log in again |
