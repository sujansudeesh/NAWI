import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, Scale, ArrowRight, RotateCcw, Info } from 'lucide-react';
import { MassUnit, ZeroSettingType, ZeroSettingTestObservation } from '../../types';
import {
  calculateOneTenthE,
  calculateQuarterE,
  calculateHalfE,
  validateZeroSettingInput,
  evaluateZeroSettingAccuracy,
  isZeroSettingProcedureApplicable,
} from '../../services/zeroSettingService';
import { ZeroSettingCalculationExplanationPanel } from './ZeroSettingCalculationExplanationPanel';

interface ZeroSettingWizardProps {
  zeroSettingType?: ZeroSettingType;
  eVal: number;
  eUnit: MassUnit;
  existingObservation?: ZeroSettingTestObservation;
  onSaveObservation: (observation: ZeroSettingTestObservation) => void;
}

export const ZeroSettingWizard: React.FC<ZeroSettingWizardProps> = ({
  zeroSettingType = 'SEMI_AUTOMATIC',
  eVal,
  eUnit,
  existingObservation,
  onSaveObservation,
}) => {
  const oneTenthE = calculateOneTenthE(eVal, eUnit);
  const quarterE = calculateQuarterE(eVal, eUnit);
  const halfE = calculateHalfE(eVal, eUnit);

  const applicability = isZeroSettingProcedureApplicable(zeroSettingType);

  // Guided steps: Step 1 (Activate Zero), Step 2 (Apply Increments & Enter ΔL), Step 3 (Calculated Evaluation)
  const [wizardStep, setWizardStep] = useState<number>(existingObservation?.isCompleted ? 3 : 1);
  const [zeroApplied, setZeroApplied] = useState<boolean>(existingObservation?.isCompleted || false);
  const [deltaLInput, setDeltaLInput] = useState<string>(
    existingObservation?.changeoverAdditionalLoad?.toString() || '2.0'
  );
  const [notesInput, setNotesInput] = useState<string>(existingObservation?.notes || '');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (existingObservation) {
      setZeroApplied(true);
      setWizardStep(3);
      setDeltaLInput(existingObservation.changeoverAdditionalLoad.toString());
    }
  }, [existingObservation]);

  const deltaLNum = parseFloat(deltaLInput);
  const currentEval = !isNaN(deltaLNum) && deltaLNum >= 0
    ? evaluateZeroSettingAccuracy({
        zeroSettingType,
        eVal,
        eUnit,
        changeoverAdditionalLoad: deltaLNum,
      })
    : null;

  // Step 1: Zero Applied Handler
  const handleZeroApplied = () => {
    setZeroApplied(true);
    setWizardStep(2);
  };

  // Step 2 & 3: Save Observation Handler
  const handleSaveObservation = (e: React.FormEvent) => {
    e.preventDefault();

    if (isNaN(deltaLNum) || deltaLNum < 0) {
      setValidationError('Please enter a valid non-negative changeover load.');
      return;
    }

    const sanityCheck = validateZeroSettingInput(deltaLNum, eVal);
    if (!sanityCheck.isValid) {
      setValidationError(sanityCheck.errorMessage || 'Changeover load appears inconsistent. Please check the value.');
      return;
    }

    setValidationError(null);

    const evalResult = evaluateZeroSettingAccuracy({
      zeroSettingType,
      eVal,
      eUnit,
      changeoverAdditionalLoad: deltaLNum,
    });

    const obs: ZeroSettingTestObservation = {
      zeroSettingType,
      verificationIntervalE: eVal,
      eUnit,
      suggestedIncrement: oneTenthE.value,
      changeoverAdditionalLoad: deltaLNum,
      calculatedZeroError: evalResult.zeroError,
      permissibleZeroDeviation: evalResult.permissibleZeroDeviation,
      passed: evalResult.passed,
      resultStatus: evalResult.resultStatus,
      isCompleted: true,
      recordedAt: new Date().toISOString(),
      notes: notesInput,
    };

    setWizardStep(3);
    onSaveObservation(obs);
  };

  if (!applicability.isApplicable) {
    return (
      <div className="p-5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs space-y-2">
        <div className="flex items-center gap-2 font-bold text-amber-950 uppercase">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <span>Procedure Applicability Notice ({zeroSettingType})</span>
        </div>
        <p className="text-amber-800">{applicability.message}</p>
        <p className="text-[11px] text-amber-700 italic">
          ℹ The semi-automatic zero-setting procedure (A.4.2.3.1) applies to Non-Automatic and Semi-Automatic zero devices.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Step Wizard Header */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-semibold">
        {[
          { num: 1, title: 'STEP 1 — Zero Device' },
          { num: 2, title: 'STEP 2 — Changeover Point' },
          { num: 3, title: 'STEP 3 — Accuracy Check' },
        ].map((s) => {
          const isActive = wizardStep === s.num;
          const isDone = wizardStep > s.num || existingObservation?.isCompleted;

          let cardStyle = 'bg-slate-50 text-slate-500 border-slate-200';
          if (isActive) cardStyle = 'bg-teal-900/10 text-teal-700 border-teal-500 ring-2 ring-teal-500/20';
          else if (isDone) cardStyle = 'bg-emerald-50 text-emerald-800 border-emerald-300';

          return (
            <button
              key={s.num}
              type="button"
              onClick={() => {
                if (s.num === 1 || zeroApplied) setWizardStep(s.num);
              }}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${cardStyle}`}
            >
              <div className="text-[10px] uppercase font-bold opacity-75">
                {isDone ? '✓ Completed' : `Step ${s.num}`}
              </div>
              <div className="font-extrabold truncate mt-0.5">{s.title}</div>
            </button>
          );
        })}
      </div>

      {/* STEP 1: ACTIVATE ZERO DEVICE */}
      {wizardStep === 1 && (
        <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 space-y-4 text-xs">
          <div className="border-b border-slate-200 pb-3">
            <span className="text-xs font-bold text-teal-600 uppercase tracking-wider block">
              STEP 1 — Zero the Instrument ({zeroSettingType})
            </span>
            <p className="text-xs text-slate-700 mt-1 font-medium">
              “Ensure the load receptor is in the required zero-setting condition (empty platform), then activate the instrument’s zero-setting function (ZERO / TARE button).”
            </p>
          </div>

          <div className="p-4 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Scale className="w-8 h-8 text-teal-600 shrink-0" />
              <div>
                <span className="font-bold text-slate-900 block">Indication at Zero</span>
                <span className="text-slate-500">Scale indication should display zero (0.000 kg).</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleZeroApplied}
              className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs shrink-0"
            >
              [ Zero Applied ] <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: SMALL INCREMENT WEIGHTS & ΔL INPUT */}
      {(wizardStep === 2 || wizardStep === 3) && (
        <form onSubmit={handleSaveObservation} className="p-6 bg-slate-50 rounded-xl border border-slate-200 space-y-4 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div>
              <span className="text-xs font-bold text-teal-600 uppercase tracking-wider block">
                STEP 2 &amp; 3 — Small Increments &amp; Changeover Point (OIML A.4.2.3)
              </span>
              <p className="text-xs text-slate-600 mt-1 font-medium">
                “Add small test weights (0.1e = {oneTenthE.text}) successively until the display changes unambiguously from zero to one verification scale interval above zero (+1e = {eVal} {eUnit}).”
              </p>
            </div>
            <span className="text-xs font-mono font-bold px-3 py-1 bg-teal-100 text-teal-900 border border-teal-300 rounded-lg shrink-0">
              Permissible Limit (±0.25e): {quarterE.text}
            </span>
          </div>

          {validationError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <span className="text-slate-500 font-semibold block">Suggested Increment (0.1e)</span>
              <span className="text-sm font-bold font-mono text-teal-700">{oneTenthE.text}</span>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <span className="text-slate-500 font-semibold block">Half Verification Interval (0.5e)</span>
              <span className="text-sm font-bold font-mono text-slate-800">{halfE.text}</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Additional Load at Changeover (ΔL) *
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  step="0.1"
                  required
                  value={deltaLInput}
                  onChange={(e) => {
                    setDeltaLInput(e.target.value);
                    setValidationError(null);
                  }}
                  placeholder="2.0"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-l-lg font-mono text-slate-900 font-bold focus:outline-hidden focus:border-teal-600"
                />
                <span className="px-3 py-2 bg-slate-200 text-slate-700 font-bold rounded-r-lg border border-l-0 border-slate-300">
                  {eUnit}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Notes / Observation Remarks (Optional)</label>
            <input
              type="text"
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              placeholder="e.g. Changeover occurred cleanly at 2.0 g"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
            />
          </div>

          {/* Live Zero Error Calculation Display */}
          {currentEval && (
            <div className="p-3 bg-white rounded-lg border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 font-mono">
              <div className="flex items-center gap-3 flex-wrap">
                <div>
                  <span className="text-slate-500">Zero Error (E0 = 0.5e − ΔL): </span>
                  <span className="font-bold text-slate-900">{currentEval.zeroErrorFormatted}</span>
                </div>
                <span className="text-slate-300">|</span>
                <div>
                  <span className="text-slate-500">Allowed (±0.25e): </span>
                  <span className="font-bold text-teal-700">{quarterE.text}</span>
                </div>
                <span className="text-slate-300">|</span>
                <div>
                  <span className="text-slate-500">Status: </span>
                  <span
                    className={`font-bold font-mono px-2 py-0.5 rounded text-[11px] ${
                      currentEval.passed
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}
                  >
                    {currentEval.resultText}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs shrink-0"
              >
                <CheckCircle2 className="w-4 h-4" /> Save Zero Reading
              </button>
            </div>
          )}
        </form>
      )}

      {/* Expandable OIML Calculation Explanation Panel */}
      {currentEval && (
        <ZeroSettingCalculationExplanationPanel
          ruleStandard="OIML R 76-1:2006 §4.5.2"
          procedureRef="Procedure A.4.2.3"
          zeroSettingType={zeroSettingType}
          eVal={eVal}
          eUnit={eUnit}
          suggestedIncrement={oneTenthE.value}
          changeoverAdditionalLoad={parseFloat(deltaLInput) || 2.0}
          calculatedZeroError={currentEval.zeroError}
          calculatedZeroErrorFormatted={currentEval.zeroErrorFormatted}
          permissibleZeroDeviation={currentEval.permissibleZeroDeviation}
          permissibleZeroDeviationFormatted={quarterE.text}
          passed={currentEval.passed}
          defaultExpanded={false}
        />
      )}
    </div>
  );
};
