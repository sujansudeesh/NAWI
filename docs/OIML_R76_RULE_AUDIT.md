# NAWI Verify — OIML R 76-1:2006 Comprehensive Algorithm Inventory & Rule Audit

This document provides the authoritative, clause-by-clause metrological audit and algorithm inventory for **NAWI Verify** locked to **OIML R 76-1:2006** (*Non-automatic weighing instruments — Part 1: Metrological and technical requirements — Tests*).

---

## Algorithm Inventory

### 1. Canonical Microgram Mass Unit Normalization & Exact Decimal Conversion
- **Exact Source File**: [units.ts](file:///Users/sujansudeesh/Desktop/ai%20chat%20bot/SIH002/TEAM%20LEON5/SIH35/src/rules/oimlR76/2006/units.ts)
- **Exact Function Name**: `toMicrograms(value: number | string, unit: MassUnit): bigint`
- **OIML Clause**: OIML R 76-1:2006 §3.2
- **Test Context**: `TYPE_EXAMINATION`, `INITIAL_VERIFICATION`, `IN_SERVICE_INSPECTION`
- **Inputs**:
  - `value`: `number | string` (mass quantity, e.g. `"0.005"`)
  - `unit`: `MassUnit` (`'mg' | 'g' | 'kg' | 't'`)
- **Outputs**:
  - `micrograms`: `bigint` (exact 64-bit integer representation in Micrograms $\mu\text{g}$)
- **Formula**:
  $$\text{Micrograms} = \text{BigInt}\left(\text{IntPart} + \text{PaddedFrac}_{\text{scale}}\right) + \text{RoundAdd}$$
  Where scale is 3 for mg, 6 for g, 9 for kg, and 12 for t.
- **Limitations**: Exponential scientific notation (e.g. `1e-3`) uses rounded multiplication fallback.

---

### 2. Verification Scale Intervals ($n = \text{Max}/e$) Integral Ratio Calculation
- **Exact Source File**: [units.ts](file:///Users/sujansudeesh/Desktop/ai%20chat%20bot/SIH002/TEAM%20LEON5/SIH35/src/rules/oimlR76/2006/units.ts)
- **Exact Function Name**: `calculateNormalizedNResult(maxCapacity, maxUnit, eVal, eUnit): ScaleIntervalsNResult`
- **OIML Clause**: OIML R 76-1:2006 §3.9 Table 3
- **Test Context**: `TYPE_EXAMINATION`, `INITIAL_VERIFICATION`, `IN_SERVICE_INSPECTION`
- **Inputs**:
  - `maxCapacity`: `number | string`
  - `maxUnit`: `MassUnit`
  - `eVal`: `number | string`
  - `eUnit`: `MassUnit`
- **Outputs**:
  - `n`: `number`
  - `isValidIntegralRatio`: `boolean` (`MaxMicrograms % eMicrograms === 0n`)
  - `remainderMicrograms`: `bigint`
  - `errorMessage`: `string | undefined`
- **Formula**:
  $$n = \frac{\text{toMicrograms}(\text{Max})}{\text{toMicrograms}(e)}, \quad \text{Remainder} = \text{toMicrograms}(\text{Max}) \pmod{\text{toMicrograms}(e)}$$
- **Limitations**: Throws a descriptive validation error if `Remainder !== 0n`.

---

### 3. Repeatability Requirement & Series Evaluation Engine
- **Exact Source File**: [repeatability.ts](file:///Users/sujansudeesh/Desktop/ai%20chat%20bot/SIH002/TEAM%20LEON5/SIH35/src/rules/oimlR76/2006/repeatability.ts)
- **Exact Function Names**:
  - `getOIMLRepeatabilityRequirements(testContext, accuracyClass, maxCapacity, maxUnit)`
  - `evaluateRepeatabilitySeries(input: RepeatabilitySeriesInput)`
- **OIML Clause**: OIML R 76-1:2006 §3.6.1 & Annex A.4.10
- **Test Context**:
  - `TYPE_EXAMINATION`: 2 series (approx 0.5 Max and 1.0 Max). 10 weighings per series if Max < 1000 kg; at least 3 weighings per series if Max $\ge$ 1000 kg.
  - `INITIAL_VERIFICATION` / `IN_SERVICE_INSPECTION`: 1 series at approx 0.8 Max. 3 weighings for Class III & IIII; 6 weighings for Class I & II.
- **Inputs**:
  - `load`: `number`, `loadUnit`: `MassUnit`
  - `readings`: `number[]`
  - `accuracyClass`: `AccuracyClass`, `eVal`: `number`, `eUnit`: `MassUnit`
- **Outputs**:
  - `maxSpread`: `number` ($\max(I) - \min(I)$ in eUnit)
  - `passed`: `boolean` ($|I_{\max} - I_{\min}| \le |\text{MPE}|$)
- **Formula**:
  $$\text{Repeatability Spread} = \max(\text{readings}) - \min(\text{readings}) \le |\text{MPE}|$$
- **Limitations**: Temperature chamber stabilization assumed prior to series execution.

---

### 4. Eccentricity Test Load Derivation & Evaluation Engine
- **Exact Source File**: [eccentricity.ts](file:///Users/sujansudeesh/Desktop/ai%20chat%20bot/SIH002/TEAM%20LEON5/SIH35/src/rules/oimlR76/2006/eccentricity.ts)
- **Exact Function Names**:
  - `deriveOIMLEccentricityTestLoad(maxCapacity, maxUnit, profile, numSupports, additiveTareEffect, usualRollingLoad)`
  - `evaluateEccentricityPositionReading(input: EccentricityPositionInput)`
- **OIML Clause**: OIML R 76-1:2006 §§3.6.2.1–3.6.2.4 & Annex A.4.7
- **Test Context**: `TYPE_EXAMINATION`, `INITIAL_VERIFICATION`, `IN_SERVICE_INSPECTION`
- **Inputs**:
  - `maxCapacity`: `number`, `additiveTareEffect`: `number`
  - `profile`: `EccentricityProfile` (`STANDARD_UP_TO_4_SUPPORTS`, `MORE_THAN_4_SUPPORTS`, `MINIMAL_OFF_CENTRE`, `ROLLING_LOAD`)
  - `numSupports`: `number`
  - `usualRollingLoad`: `number` (optional)
- **Outputs**:
  - `recommendedTestLoad`: `number`
  - `passed`: `boolean` ($|\text{Indication} - \text{Load}| \le \text{MPE}$)
- **Formulas**:
  - Standard ($\le 4$ supports): $L = \frac{1}{3} \times (\text{Max} + T_{\text{add}})$
  - $> 4$ supports ($N$): $L = \frac{1}{N - 1} \times (\text{Max} + T_{\text{add}})$
  - Minimal off-centre (tanks/hoppers): $L = \frac{1}{10} \times (\text{Max} + T_{\text{add}})$
  - Rolling-load (vehicle scales): $L = \min(\text{UsualRollingLoad}, 0.8 \times (\text{Max} + T_{\text{add}}))$
- **Limitations**: Positions for rolling load track are restricted to Beginning, Middle, End.

---

### 5. Zero-Setting Accuracy Evaluation
- **Exact Source File**: [zeroSetting.ts](file:///Users/sujansudeesh/Desktop/ai%20chat%20bot/SIH002/TEAM%20LEON5/SIH35/src/rules/oimlR76/2006/zeroSetting.ts)
- **Exact Function Name**: `evaluateZeroSettingAccuracy(input: ZeroSettingAccuracyInput)`
- **OIML Clause**: OIML R 76-1:2006 §4.5.2 & Annex A.4.2.3
- **Test Context**: `TYPE_EXAMINATION`, `INITIAL_VERIFICATION`, `IN_SERVICE_INSPECTION`
- **Inputs**:
  - `zeroSettingType`: `ZeroSettingType`
  - `eVal`: `number`, `eUnit`: `MassUnit`
  - `changeoverAdditionalLoadDeltaL`: `number` ($\Delta L$ in eUnit)
- **Outputs**:
  - `calculatedZeroErrorE0`: `number` ($E_0 = 0.5e - \Delta L$)
  - `permissibleLimitAbs`: `number` ($0.25e$)
  - `allowableIntervalText`: `string` (`-0.25e <= E0 <= +0.25e`)
  - `inequalityText`: `string` (`|E0| <= 0.25e`)
  - `passed`: `boolean` ($|E_0| \le 0.25e$)
- **Formula**:
  $$E_0 = 0.5e - \Delta L \quad \text{subject to} \quad |E_0| \le 0.25e \quad \left(-0.25e \le E_0 \le +0.25e\right)$$
- **Limitations**: Automatic zero-tracking requires off-zero load to disable tracking mechanism per A.4.2.3.2.

---

### 6. Tare Setting Accuracy & Net Weighing Engine
- **Exact Source File**: [tare.ts](file:///Users/sujansudeesh/Desktop/ai%20chat%20bot/SIH002/TEAM%20LEON5/SIH35/src/rules/oimlR76/2006/tare.ts)
- **Exact Function Names**:
  - `evaluateTareSettingAccuracy(input: TareSettingAccuracyInput)`
  - `evaluateTareNetWeighing(input: TareNetWeighingInput)`
- **OIML Clause**: OIML R 76-1:2006 §§3.5.3.4, 4.6.3 & Annex A.4.6
- **Test Context**: `TYPE_EXAMINATION`, `INITIAL_VERIFICATION`, `IN_SERVICE_INSPECTION`
- **Inputs**:
  - `appliedTareLoad`: `number`, `referenceNetLoad`: `number`, `displayedNetReading`: `number`
  - `tareType`: `'SUBTRACTIVE' | 'ADDITIVE'`
  - `accuracyClass`: `AccuracyClass`, `eVal`: `number`, `eUnit`: `MassUnit`
- **Outputs**:
  - Tare Setting Accuracy: $E_T = 0.5e - \Delta L_{\text{tare}}$ subject to $|E_T| \le 0.25e$ (Interval: $-0.25e \le E_T \le +0.25e$)
  - Net Weighing MPE: Evaluated against Net Load ($L_{\text{net}}$), NOT Gross load.
- **Formulas**:
  $$E_T = 0.5e - \Delta L_{\text{tare}} \le 0.25e, \quad \text{Error}_{\text{net}} = I_{\text{net}} - L_{\text{net}} \le \text{MPE}(L_{\text{net}})$$
- **Limitations**: Preset tare values excluded per §3.5.3.3.

---

### 7. Digital Small-Weight Changeover & Corrected Error Engine
- **Exact Source File**: [errorEvaluation.ts](file:///Users/sujansudeesh/Desktop/ai%20chat%20bot/SIH002/TEAM%20LEON5/SIH35/src/rules/oimlR76/2006/errorEvaluation.ts)
- **Exact Function Name**: `evaluateDigitalIndicationError(input: DigitalErrorEvaluationInput)`
- **OIML Clause**: OIML R 76-1:2006 Annex A.4.4.3
- **Test Context**: `TYPE_EXAMINATION`, `INITIAL_VERIFICATION`, `IN_SERVICE_INSPECTION`
- **Inputs**:
  - `referenceLoad`: `number`, `displayedIndication`: `number`
  - `additionalChangeoverLoadDeltaL`: `number` ($\Delta L$)
  - `zeroErrorE0`: `number` ($E_0$)
  - `eVal`: `number`, `eUnit`: `MassUnit`, `accuracyClass`: `AccuracyClass`
- **Outputs**:
  - `indicationBeforeRoundingP`: `number` ($P = I + 0.5e - \Delta L$)
  - `rawErrorE`: `number` ($E = P - L$)
  - `correctedErrorEc`: `number` ($E_c = E - E_0$)
  - `passed`: `boolean` ($|E_c| \le \text{MPE}$)
- **Formulas**:
  $$P = I + 0.5e - \Delta L, \quad E = P - L, \quad E_c = E - E_0$$
- **Limitations**: Requires small changeover weights (0.1e increments) to establish changeover point.

---

### 8. Digital Discrimination Response Engine
- **Exact Source File**: [discrimination.ts](file:///Users/sujansudeesh/Desktop/ai%20chat%20bot/SIH002/TEAM%20LEON5/SIH35/src/rules/oimlR76/2006/discrimination.ts)
- **Exact Function Name**: `evaluateDigitalDiscriminationTestPoint(input: DiscriminationTestPointInput)`
- **OIML Clause**: OIML R 76-1:2006 §3.8 & Annex A.4.8.2
- **Test Context**: `TYPE_EXAMINATION` (for digital indication instruments with $d \ge 5\text{ mg}$)
- **Inputs**:
  - `testPointId`: `'MIN' | 'HALF_MAX' | 'MAX'`
  - `scaleIntervalD`: `number` ($d$)
  - `initialIndication`: `number` ($I$)
  - `observedFinalIndication`: `number` ($I_{\text{final}}$)
- **Outputs**:
  - `passed`: `boolean` ($I_{\text{final}} = I + d$ upon adding $1.4d$)
- **Formula**:
  $$\Delta I = I_{\text{final}} - I = d \quad \text{upon adding } 1.4d \text{ additional load}$$
- **Limitations**: Applicable strictly during Type Examination for digital indication instruments where $d \ge 5\text{ mg}$.

---

## Metrological Rule Audit Table

| Rule ID | Feature | OIML Clause | Implementation Status | Expected OIML Rule | Golden Tests |
| :--- | :--- | :--- | :---: | :--- | :---: |
| `R76-2006-UNT-01` | Mass Unit Normalization | §3.2 | `VERIFIED` | Microgram string parsing eliminates IEEE 754 binary floating point errors | 3 |
| `R76-2006-CLA-NMAX` | Scale Intervals $n = \text{Max}/e$ | §3.9 Table 3 | `VERIFIED` | $n = \text{Max}/e$; validates $MaxMicrograms \% eMicrograms === 0n$ | 4 |
| `R76-2006-MPE-TBL6` | Initial Verification MPE | §3.5.1 Table 6 | `VERIFIED` | MPE bands: $\pm 0.5e, \pm 1.0e, \pm 1.5e$ | 5 |
| `R76-2006-MPE-INSERVICE` | In-Service Inspection MPE | §3.5.2 | `VERIFIED` | In-service MPE multiplier doubled ($\pm 1.0e, \pm 2.0e, \pm 3.0e$) | 2 |
| `R76-2006-ERR-A443` | Digital Changeover Point ($P$) | §A.4.4.3 | `VERIFIED` | $P = I + 0.5e - \Delta L$, Raw Error $E = P - L$ | 3 |
| `R76-2006-ERR-CORRECTED` | OIML Corrected Error ($E_c$) | §A.4.4.3 | `VERIFIED` | $E_c = E - E_0$ where $E_0$ is zero error | 3 |
| `R76-2006-ZERO-ACC` | Zero-Setting Accuracy ($E_0$) | §4.5.2 & §A.4.2.3 | `VERIFIED` | $|E_0| \le 0.25e$ (Interval: $-0.25e \le E_0 \le +0.25e$) | 4 |
| `R76-2006-TARE-ACC` | Tare-Setting Accuracy ($E_T$) | §4.6.3 & §A.4.6.1 | `VERIFIED` | $|E_T| \le 0.25e$ (Interval: $-0.25e \le E_T \le +0.25e$) | 3 |
| `R76-2006-TARE-NET` | Net Weighing MPE under Tare | §3.5.3.4 & §A.4.6.2 | `VERIFIED` | MPE evaluated on **Net Load** ($L_{\text{net}}$), Net Capacity $= \text{Max} - T$ | 3 |
| `R76-2006-ECC-A47` | Eccentricity Load Derivation | §3.6.2 & §A.4.7 | `VERIFIED` | $1/3(\text{Max}+T_{\text{add}})$, $1/(N-1)(\text{Max}+T_{\text{add}})$, tanks $1/10(\text{Max}+T_{\text{add}})$, rolling cap $0.8(\text{Max}+T_{\text{add}})$ | 5 |
| `R76-2006-DISC-A48` | Discrimination Test ($1.4d$) | §3.8 & §A.4.8 | `VERIFIED` | Uses scale interval $d$; adds $1.4d$ to check display shift to $I + d$ | 2 |
| `R76-2006-REP-A410` | Repeatability Requirements | §3.6.1 & §A.4.10 | `VERIFIED` | Type Exam: 2 series (0.5 & 1.0 Max; 10/3 reps). Verif: 1 series (0.8 Max; 3/6 reps). Max Spread $\le |\text{MPE}|$ | 4 |

---

*NAWI Verify — OIML R 76-1:2006 Formal Metrology Audit Matrix*
