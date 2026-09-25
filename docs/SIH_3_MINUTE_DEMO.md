# NAWI Verify — 3-Minute SIH Presentation Script

This script provides an exact **3-minute live demonstration sequence** for presenting NAWI Verify to the SIH evaluation jury.

---

## ⏱️ Timeline & Action Sequence

| Time | Presentation Phase | What to Click | What to Say (Narrative Script) | Expected Screen |
| :--- | :--- | :--- | :--- | :--- |
| **0:00–0:20** | **Problem & Intro** | Open Home Dashboard $\rightarrow$ Click **▶ START SIH DEMO** | *"Respected Judges, Legal Metrology in India tests thousands of commercial weighing scales daily. Current paper workflows cause calculation errors and lack auditability. NAWI Verify converts OIML R 76-1 testing into a rule-driven digital workflow."* | **Guided Demo Intro Modal** |
| **0:20–0:40** | **Instrument Profile** | Select `MetriScale Pro 500` (`MTP500-SIH-001`) | *"Here is our demo scale: Class III, Max 30kg, verification interval e=5g. Notice how the system automatically calculates n = Max ÷ e = 6,000 scale intervals."* | **Instrument Detail View** |
| **0:40–1:00** | **Automatic Test Plan** | Click **📋 Test Plan & Rules** | *"The Test Plan Engine dynamically selects applicable tests. Tare testing is included because a tare device exists, while climate chamber tests are excluded for field verification."* | **Evaluation Test Plan View** |
| **1:00–1:45** | **Core Calculation & View Calculation** | Click **⚡ Load Passing Demo Data** $\rightarrow$ Click **View Calculation** | *"Let's record a 10kg load reading of 10.003kg. Clicking 'View Calculation' reveals the exact OIML A.4.4.3 changeover equation: P = I + 0.5e - ΔL, yielding corrected error Ec = +3g against ±5g MPE. The result is WITHIN MPE."* | **Accuracy Test View + Calculation Modal** |
| **1:45–2:10** | **Secondary Tests** | Click through **Zero Setting**, **Tare**, **Eccentricity**, **Discrimination** | *"Zero-setting, Tare net weighing, 4-corner Eccentricity, and 1.4d Discrimination are evaluated against OIML standards with 100% test progress."* | **Test Execution Tabs** |
| **2:10–2:30** | **Simulate Non-Conformity** | Click **⚠️ Simulate Non-Conformity** | *"If an officer records an out-of-tolerance reading (+8g on Rear Right corner), the real rule engine immediately flags EXCEEDS MPE and propagates NON_COMPLIANT status to the review queue and report."* | **Eccentricity View (Non-Compliant)** |
| **2:30–2:45** | **Multi-Role Review** | Click **⚡ Load Passing Demo Data** $\rightarrow$ **Submit Review** $\rightarrow$ Switch role to `Technical Reviewer` $\rightarrow$ Click **Technically Approve** | *"Testing Officers cannot self-approve. The Technical Reviewer audits calculations and approves the evaluation."* | **Review Workspace** |
| **2:45–3:00** | **Report & QR Verification** | Switch role to `Lab Director` $\rightarrow$ **Finalize** $\rightarrow$ View Report `REP-2026-001` | *"The Lab Director approves and locks the certificate. Scanning the embedded QR code instantly authenticates the record against our database."* | **Final PDF Certificate & QR View** |

---
*NAWI Verify — ISO/IEC 17025 Legal Metrology Verification System*
