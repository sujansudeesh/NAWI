# NAWI Verify — Presentation Backup & Contingency Plan

This document outlines recovery procedures in case of network, browser, or environment issues during live SIH presentation.

---

## 🛠️ Emergency Contingency Matrix

| Issue | Contingency Action | Recovery Time |
| :--- | :--- | :---: |
| **Internet / Supabase Offline** | The application automatically switches to **Offline Demonstration Snapshot** using local in-memory fallback store. All OIML calculations continue operating offline. | Instant (0s) |
| **Browser Cache / State Stale** | Click **Reset Guided Demo** button on Dashboard or execute `resetGuidedDemoSession()`. | < 2s |
| **PDF Generation Glitch** | Click **View Report Snapshot** to display inline report certificate layout. | < 2s |
| **Demo Session TS-2026-101 Corrupted** | Click **▶ Start Guided SIH Demo** on Dashboard banner to re-seed clean `MetriScale Pro 500` demo state. | < 1s |

---

## 🔁 Recovery Commands

If running locally from terminal:
```bash
# Clean local build verification
npm run build && npm run test:metrology
```

---
*NAWI Verify — Presentation Backup Procedures*
