# NAWI Verify — Production Deployment Guide

This guide provides step-by-step instructions for deploying **NAWI Verify** (OIML R 76-1 Non-Automatic Weighing Instrument Legal Metrology Verification System) to production environments using **Vercel / Netlify** and **Supabase Backend**.

---

## 1. Prerequisites

- **Node.js**: v18.0.0 or higher
- **Supabase Account**: [https://supabase.com](https://supabase.com)
- **Vercel Account** or **Netlify Account**: For frontend hosting

---

## 2. Supabase Backend Setup

### A. Create Project & Database
1. Log in to [Supabase Console](https://database.supabase.com) and create a new project `nawi-verify-prod`.
2. Select your region and set a strong database password.

### B. Run Database Schema Migrations
1. Open the **SQL Editor** in Supabase.
2. Copy the contents of [`supabase/schema.sql`](file:///Users/sujansudeesh/Desktop/ai%20chat%20bot/SIH002/TEAM%20LEON5/SIH35/supabase/schema.sql) and execute the SQL query.
3. Verify that all 11 tables (`profiles`, `instruments`, `test_sessions`, `session_tests`, `test_observations`, `review_comments`, `workflow_history`, `audit_events`, `reports`, `documents`, `report_versions`) are created with Row Level Security (RLS) enabled.

### C. Seed Initial Data (Optional)
1. In the SQL Editor, run [`supabase/seed.sql`](file:///Users/sujansudeesh/Desktop/ai%20chat%20bot/SIH002/TEAM%20LEON5/SIH35/supabase/seed.sql) to pre-populate standard reference instruments and demo users.

### D. Setup Storage Buckets
Run the following SQL script to create the 3 required private storage buckets:

```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('instrument-documents', 'instrument-documents', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('test-evidence', 'test-evidence', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('generated-reports', 'generated-reports', false) ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
CREATE POLICY "Authenticated users can upload files" ON storage.objects FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can view files" ON storage.objects FOR SELECT USING (auth.role() = 'authenticated');
```

---

## 3. Environment Variables Configuration

Set up the following environment variables in your deployment dashboard (e.g. Vercel Project Settings -> Environment Variables):

| Variable Name | Required | Description | Example Value |
| :--- | :--- | :--- | :--- |
| `VITE_APP_ENV` | Yes | App runtime mode (`PRODUCTION` / `DEMO`) | `PRODUCTION` |
| `VITE_DEMO_MODE` | Yes | Enable/disable quick demo switches | `false` |
| `VITE_SUPABASE_URL` | Yes | Supabase Project API URL | `https://xyz.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase Anonymous Client Key | `eyJhbGciOi...` |

---

## 4. Deploying Frontend to Vercel

1. Connect your GitHub repository to Vercel.
2. Select **Vite** framework preset.
3. Configure Build Command: `npm run build` (`tsc && vite build`).
4. Output Directory: `dist`.
5. Add the environment variables listed above.
6. Click **Deploy**.

---

## 5. Security & Verification Audit

Before launching in production:
1. Verify Row Level Security is active on all Supabase tables.
2. Confirm HTTPS certificate binding and SSL redirect on Vercel domain.
3. Run `npx tsx scripts/runTests.js` to ensure all 180 OIML R 76-1 metrology unit tests pass.

---
*NAWI Verify — ISO/IEC 17025 Compliant Legal Metrology Verification System*
