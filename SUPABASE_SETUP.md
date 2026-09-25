# Supabase Backend Setup Guide — NAWI Verify

This guide provides step-by-step instructions to configure the real **Supabase PostgreSQL Database**, **Authentication**, and **Row Level Security (RLS)** for the NAWI Verify legal metrology verification system.

---

## 1. Create a Supabase Project

1. Go to [Supabase Console](https://supabase.com/dashboard) and sign in.
2. Click **New Project**.
3. Set Project Name: `nawi-verify-prod` (or your preferred name).
4. Set Database Password (store securely).
5. Select your Region and click **Create New Project**.

---

## 2. Configure Environment Variables

1. Navigate to **Project Settings** $\rightarrow$ **API** in the Supabase Dashboard.
2. Copy the **Project URL** and `anon` **Public API Key**.
3. In your project root, create `.env` (copied from `.env.example`):

```bash
cp .env.example .env
```

4. Populate `.env` with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> [!IMPORTANT]
> Do NOT commit `.env` or secret service role keys to Git repository.

---

## 3. Run Database Schema Migration

1. In Supabase Dashboard, go to **SQL Editor**.
2. Click **New Query**.
3. Copy the full contents of `supabase/schema.sql` from your repository and paste it into the editor.
4. Click **Run** to execute the migration.
5. Confirm that all 9 tables (`profiles`, `instruments`, `test_sessions`, `session_tests`, `test_observations`, `review_comments`, `workflow_history`, `audit_events`, `reports`) are created with Row Level Security (RLS) enabled.

---

## 4. Enable Authentication & Create Initial Users

1. In Supabase Dashboard, go to **Authentication** $\rightarrow$ **Users**.
2. Click **Add User** $\rightarrow$ **Create User**.
3. Create accounts for each legal metrology role:
   - **Testing Officer**: `officer@nawiverify.demo`
   - **Technical Reviewer**: `reviewer@nawiverify.demo`
   - **Approving Officer**: `approver@nawiverify.demo`
   - **Admin**: `admin@nawiverify.demo`
4. Set secure passwords for each account.

---

## 5. Configure User Profiles & Roles

Run the following SQL snippet in the **SQL Editor** to assign canonical roles to created users:

```sql
UPDATE public.profiles
SET role = 'TESTING_OFFICER', full_name = 'Dr. Ananya Rao'
WHERE email = 'officer@nawiverify.demo';

UPDATE public.profiles
SET role = 'TECHNICAL_REVIEWER', full_name = 'Vikramaditya Verma'
WHERE email = 'reviewer@nawiverify.demo';

UPDATE public.profiles
SET role = 'APPROVING_OFFICER', full_name = 'Dr. K. S. Murthy'
WHERE email = 'approver@nawiverify.demo';

UPDATE public.profiles
SET role = 'ADMIN', full_name = 'System Administrator'
WHERE email = 'admin@nawiverify.demo';
```

---

## 6. Seed Initial Instrument Data (Optional)

1. In Supabase **SQL Editor**, run the script `supabase/seed.sql` to populate default OIML reference instruments (`MetriScale Pro 500`, `HeavyLoad VX-3000`, `DirectWeigh NT-15`).

---

## 7. Run Application & Verify Real Backend Persistence

1. Start dev server:
   ```bash
   npm run dev
   ```
2. Log in using `officer@nawiverify.demo`.
3. Register an instrument or execute a test session.
4. Refresh browser or switch accounts to verify real PostgreSQL persistence!
