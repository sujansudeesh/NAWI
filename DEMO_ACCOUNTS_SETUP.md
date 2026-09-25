# NAWI Verify — Authorized Demo Accounts & Roles Setup

During SIH evaluations and live demonstrations, NAWI Verify supports role switching to demonstrate the multi-tier legal metrology workflow (**Testing Officer** -> **Technical Reviewer** -> **Lab Director / Approving Officer**).

---

## 1. Pre-configured Authorized Demo Accounts

| User Name | Role | Email | Purpose in Workflow |
| :--- | :--- | :--- | :--- |
| **Dr. Ananya Rao** | `Testing Officer` | `officer@nawiverify.demo` | Conducts physical tests, records observations, uploads evidence photos, and submits session for technical review. |
| **Vikramaditya Verma** | `Technical Reviewer` | `v.verma@nawiverify.demo` | Reviews test observations against OIML R 76-1 MPE tolerances, requests changes, or approves technical compliance. |
| **Dr. K. S. Murthy** | `Lab Director / Approving Officer` | `director@nawiverify.demo` | Performs final administrative sign-off, locks test records, and issues official Verification Certificates with QR verification. |

---

## 2. Switching Roles in Demo Mode

When `VITE_DEMO_MODE=true` is enabled:
1. The **Role Switcher** widget appears in the top navigation header bar.
2. Evaluators can click any role name (`Testing Officer`, `Technical Reviewer`, `Lab Director`) to instantly switch permissions and perspective without logging out.
3. The active role is persisted in `localStorage` under `nawi_demo_role`.

---

## 3. Creating Demo Users in Supabase Authentication

If testing with a live Supabase backend, execute the following script in Supabase SQL Editor to seed the authorized accounts:

```sql
-- Seed Profiles for Demo Accounts
INSERT INTO public.profiles (id, full_name, email, role, organization)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Dr. Ananya Rao', 'officer@nawiverify.demo', 'TESTING_OFFICER', 'National Legal Metrology Laboratory'),
  ('00000000-0000-0000-0000-000000000002', 'Vikramaditya Verma', 'v.verma@nawiverify.demo', 'TECHNICAL_REVIEWER', 'National Legal Metrology Laboratory'),
  ('00000000-0000-0000-0000-000000000003', 'Dr. K. S. Murthy', 'director@nawiverify.demo', 'LAB_DIRECTOR', 'National Legal Metrology Laboratory')
ON CONFLICT (email) DO UPDATE 
SET role = EXCLUDED.role, full_name = EXCLUDED.full_name;
```

---
*NAWI Verify — Legal Metrology Multi-Role Verification Workflow*
