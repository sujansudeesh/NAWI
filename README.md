# NAWI Verify — OIML R 76-1:2006 Legal Metrology Verification System

**NAWI Verify** is a digital Legal Metrology Test Evaluation and Reporting System designed for non-automatic weighing instruments (NAWI) under **OIML R 76-1:2006** international standards.

---

## 🚀 Key Features

- **Versioned OIML R 76-1:2006 Rule Engine**: Automated MPE calculation, Table 6 boundary verification, initial vs. in-service tolerance doubling.
- **Changeover Point & Corrected Error ($E_c$)**: Complete OIML A.4.4.3 changeover equation ($P = I + 0.5e - \Delta L$, $E = P - L$, $E_c = E - E_0$).
- **Test Plan & Applicability Engine**: Dynamic test plan selection based on instrument context and OIML requirements.
- **Multi-Role Laboratory Workflow**: Hierarchy role-switching between **Testing Officer**, **Technical Reviewer**, and **Laboratory Director**.
- **Real PDF Report & QR Verification**: Authentic PDF certificate generation embedded with a cryptographically verifiable QR authentication link.
- **ISO/IEC 17025 Audit Trail**: Comprehensive event logging (timestamp, user, role, action, IP).

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts
- **Backend**: Supabase Cloud Platform (PostgreSQL, Auth, Storage)
- **Rule Engine**: Version-locked TypeScript OIML Rule Modules (`src/rules/oimlR76/2006/`)
- **Report Engine**: `pdf-lib` & `qrcode`
- **Testing**: Node.js automated metrology unit test suite (177 tests passing)

---

## 📦 Setup & Installation

```bash
# Install dependencies
npm install

# Run metrology test suite
npm run test:metrology

# Run development server
npm run dev

# Build for production
npm run build
```

---

## 📑 Documentation Links

- [SIH 3-Minute Presentation Script](docs/SIH_3_MINUTE_DEMO.md)
- [SIH 5-Minute Deep Dive Script](docs/SIH_5_MINUTE_DEMO.md)
- [SIH Jury Q&A Guide](docs/SIH_JUDGE_QA.md)
- [OIML R 76-1:2006 Rule Audit Matrix](docs/OIML_R76_RULE_AUDIT.md)
- [Final Metrology Validation Report](docs/OIML_R76_FINAL_VALIDATION.md)
- [Deployment Guide](DEPLOYMENT.md)

---
*NAWI Verify — ISO/IEC 17025 & OIML R 76-1:2006 Legal Metrology System*
