# NAWI Verify — SIH Jury Questions & Answers (Q&A)

This document provides concise, technically accurate answers for common jury questions during SIH evaluations.

---

## ❓ Frequently Asked Questions

### Q1: What is NAWI Verify?
> **Answer**: NAWI Verify is an automated, ISO/IEC 17025-compliant Legal Metrology Verification System for Non-Automatic Weighing Instruments (NAWI) based on OIML R 76-1:2006 standards.

### Q2: What is OIML R 76-1:2006?
> **Answer**: OIML R 76-1 is the international recommendation published by the International Organization of Legal Metrology defining metrological and technical requirements for weighing scales used in commercial trade, healthcare, and industrial verification.

### Q3: What are $d$ and $e$?
> **Answer**: 
> - $d$ is the **actual scale interval** (the smallest division displayed on the instrument screen).
> - $e$ is the **verification scale interval** (the value expressed in units of mass used for the classification and verification of the instrument).

### Q4: How is $n$ calculated?
> **Answer**: $n = \text{Max} / e$, calculated after normalizing Max and $e$ to the exact same mass unit (e.g. $30\text{ kg} / 5\text{ g} = 30\,000\text{ g} / 5\text{ g} = 6000$).

### Q5: Why not just use Excel? (Section 43)
> **Answer**: Excel can perform isolated calculations. NAWI Verify additionally integrates instrument configuration, automatic test plan applicability, versioned OIML rules, guided test execution, raw measurement traceability, role-based review workflows, database persistence, evidence photo storage, report versioning, and public QR verification links.

### Q6: What makes NAWI Verify unique? (Section 44)
> **Answer**: The main differentiator is the versioned rule-driven evaluation engine connected to a multi-role laboratory workflow. Instead of asking officers to manually guess Pass or Fail, officers enter raw measurements and NAWI Verify determines the applicable rule, calculates errors, explains the decision, preserves traceability, and carries that result into review and reporting.

### Q7: Is this AI? (Section 31)
> **Answer**: No. NAWI Verify uses a deterministic **OIML Rule Engine**, **Decision Support System**, and **Applicability Engine**. Legal metrology tolerances require 100% deterministic compliance under international standards rather than probabilistic AI models.

### Q8: Is the weighing machine directly connected? (Section 33)
> **Answer**: 
> - **CURRENT SIH PROTOTYPE**: Certified test weights are physically applied by the laboratory officer, who enters the displayed scale reading into NAWI Verify.
> - **FUTURE EXPANSION**: Direct data acquisition through supported RS-232 / USB instrument data interfaces.

### Q9: What happens when a test fails?
> **Answer**: If an observation exceeds MPE tolerances, the calculation engine flags the observation as `EXCEEDS_MPE`, updates the test status to `Exceeds Limit`, sets overall session verdict to `NON_COMPLIANT`, alerts the reviewer in the workspace, and logs the non-conformity in the test report.

### Q10: How do you prevent data manipulation?
> **Answer**: Authenticated user accounts (Supabase Auth), Row-Level Security (RLS) PostgreSQL policies, role separation (officer cannot self-approve), complete ISO/IEC 17025 audit logs, and immutable read-only status on finalized reports.

---
*NAWI Verify — Legal Metrology Q&A Reference*
