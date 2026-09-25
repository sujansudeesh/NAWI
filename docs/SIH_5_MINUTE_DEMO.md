# NAWI Verify — 5-Minute Deep Dive Presentation Script

This script provides an extended **5-minute technical demonstration sequence** for deep-dive jury sessions.

---

## ⏱️ Extended 5-Minute Sequence

1. **0:00–0:30 — Problem Statement & High-Level Pitch**
   - Present current paper-based manual testing limitations in legal metrology laboratories.
   - Introduce NAWI Verify: OIML R 76-1:2006 rule-driven evaluation and reporting system.

2. **0:30–1:15 — Instrument Profile & Metrological Classification**
   - Open `MetriScale Pro 500` (`MTP500-SIH-001`).
   - Explain $d = 5\text{ g}$, $e = 5\text{ g}$, $n = \text{Max} / e = 6000$ scale intervals.
   - Highlight Table 3 classification limits ($n \in [500, 10\,000]$ for Class III).

3. **1:15–2:00 — Test Plan Applicability Matrix**
   - Open Evaluation Test Plan View.
   - Explain how `testPlanService.ts` evaluates context (`TYPE_EXAMINATION` vs `INITIAL_VERIFICATION`).
   - Show why static temperature is excluded for field verification while tare testing is included.

4. **2:00–3:15 — OIML Calculation Engine & Changeover Error ($E_c$)**
   - Load 10 kg accuracy observation.
   - Click **View Calculation** $\rightarrow$ Show $P = I + 0.5e - \Delta L$, $E = P - L$, $E_0$, $E_c = E - E_0$.
   - Click **Why this result?** to demonstrate dynamic, non-hardcoded rule explainability.

5. **3:15–4:00 — Non-Conformity Simulation & Data Model Propagation**
   - Click **⚠️ Simulate Non-Conformity** (+8g error on Corner #4).
   - Show immediate propagation: Eccentricity Exceeds MPE $\rightarrow$ Overall Verdict NON_COMPLIANT $\rightarrow$ Review Workspace alert $\rightarrow$ Report preview header.

6. **4:00–4:30 — Multi-Role Workflow & Row-Level Security**
   - Switch between Testing Officer, Technical Reviewer, and Lab Director roles.
   - Demonstrate request changes comment log and final administrative locking.

7. **4:30–5:00 — Authentic Report Generation & QR Code Verification**
   - Finalize certificate $\rightarrow$ View generated PDF.
   - Demonstrate scanning the embedded QR code to verify certificate authenticity at `/verify-report/:id`.

---
*NAWI Verify — ISO/IEC 17025 Legal Metrology System*
