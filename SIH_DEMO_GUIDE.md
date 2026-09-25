# NAWI Verify — SIH 2026 Live Presentation & Evaluator Demo Guide

This guide provides a structured **3 to 5-minute presentation script and demonstration workflow** for presenting **NAWI Verify** to the Smart India Hackathon (SIH) jury.

---

## 🎯 High-Level Pitch (30 Seconds)

> **"Respected Judges, Legal Metrology in India and worldwide relies on rigorous verification of Non-Automatic Weighing Instruments under OIML R 76-1 standards. Currently, field officers manually record readings on paper, risk tolerance calculation errors, and lack auditability.
> 
> NAWI Verify is an automated, ISO/IEC 17025-compliant Legal Metrology Verification System. It automates OIML R 76-1 MPE tolerances, enforces applicability rules, manages multi-tier technical review workflows, and issues authentic QR-verifiable certificates with full audit trails."**

---

## 🎬 Step-by-Step Evaluator Demo Flow (4 Minutes)

### Step 1: Dashboard & Role Switcher (30 Seconds)
1. **Action**: Open the Dashboard (`/`). Point out the **Guided SIH Demo Banner** and the **Role Switcher** widget in the top header (`Testing Officer` -> `Technical Reviewer` -> `Lab Director`).
2. **Key Talking Point**:
   > *"NAWI Verify models real-world laboratory hierarchy. The Testing Officer executes tests, the Technical Reviewer audits calculations, and the Laboratory Director signs official certificates."*

### Step 2: Instrument Registration & Verification Parameters (30 Seconds)
1. **Action**: Click **Instruments** -> Select `INS-2026-002` (`MetriScale Pro 500`).
2. **Key Talking Point**:
   > *"Here is the instrument profile. Notice the verification scale interval \(e = 5\text{ g}\), Maximum capacity \(\text{Max} = 30\text{ kg}\), scale intervals \(n = 6000\), and Subtractive Tare limit of \(10\text{ kg}\). The system automatically calculates \(n = \text{Max} / e\)."*

### Step 3: Test Plan & Applicability Engine (30 Seconds)
1. **Action**: Click **▶ Start Guided SIH Demo** or open session `TS-2026-101`. Select **📋 Test Plan & Rules**.
2. **Key Talking Point**:
   > *"Not every test applies to every scale. Our Test Plan Engine automatically evaluates the instrument context. For instance, Tare testing is APPLICABLE because a tare device is present, while AC Mains testing is disabled for battery-operated units."*

### Step 4: Test Execution & MPE Calculation Engine (60 Seconds)
1. **Action**: Click **⚡ Load Passing Demo Readings** on the SIH Evaluator Toolbar.
2. **Walkthrough**:
   - **Zero-Setting Accuracy**: Show changeover load \(\Delta L = 2.0\text{ g}\) yielding zero error \(E_0 = +0.5\text{ g}\) within \(\pm 0.25e = \pm 1.25\text{ g}\).
   - **Tare Test**: Show Subtractive Tare setting error \(E_T = +0.5\text{ g}\) and net weighing across 5 load points.
   - **Eccentricity (Corner Load)**: Show 4 platform corner readings evaluated against \(\pm 1e\) MPE.
   - **Weighing Accuracy**: Show 5 reference load points (Min, 500e, 2000e, 5000e, Max).
3. **Interactive Failing Demo**:
   - **Action**: Click **⚠️ Simulate Non-Conformity**.
   - **Key Talking Point**:
     > *"Watch how the calculation engine dynamically catches an out-of-tolerance reading (+8g on Corner #4). The system immediately flags the position as EXCEEDS MPE, updates the session verdict to NON_COMPLIANT, and alerts the reviewer."*
   - **Action**: Click **⚡ Load Passing Demo Readings** to reset to compliant state.

### Step 5: Technical Review & Workflow State Machine (30 Seconds)
1. **Action**: Click **Submit for Technical Review**. Switch role to `Technical Reviewer` (`v.verma@nawiverify.demo`).
2. **Action**: Go to **📋 Review & Approval** tab. Click **Approve Technical Review**.
3. **Key Talking Point**:
   > *"The state machine strictly prevents illegal transitions. An officer cannot self-approve a report, and finalized reports are immutably locked."*

### Step 6: Certificate Generation & Public QR Verification (30 Seconds)
1. **Action**: Switch role to `Lab Director` (`director@nawiverify.demo`) -> Click **Finalize & Issue Certificate**.
2. **Action**: View Report `REP-2026-001`. Point out the embedded **QR Code** and click **Verify Certificate**.
3. **Key Talking Point**:
   > *"The system generates an official PDF Verification Certificate embedded with a cryptographically secure QR verification link. Anyone scanning the QR code can instantly verify authenticity against the database."*

---

## 🛡️ Technical Summary for Jury Questions

- **Metrology Standard**: OIML R 76-1:2006 (Non-Automatic Weighing Instruments).
- **Backend Architecture**: PostgreSQL + Supabase with Row-Level Security (RLS) policies.
- **Audit Compliance**: ISO/IEC 17025 trace logs recording user ID, timestamp, action, and IP address.
- **Automated Test Coverage**: 180 / 180 metrology unit tests passing.

---
*NAWI Verify — Empowering Legal Metrology with Precision & Auditability*
