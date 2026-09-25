import React, { useState, useEffect } from 'react';
import { ArrowRight, CheckCircle2, AlertTriangle, Layers, Plus, RotateCcw, Scale } from 'lucide-react';
import { MassUnit, DiscriminationTestObservation } from '../../types';
import {
  DiscriminationTestPointConfig,
  calculateOneTenthD,
  calculateOnePointFourD,
  calculateExpectedLowerIndication,
  calculateExpectedFinalIndication,
  evaluateDiscriminationResponse,
} from '../../services/discriminationService';
import { DiscriminationCalculationExplanationPanel } from './DiscriminationCalculationExplanationPanel';

interface DiscriminationWizardProps {
  testPoint: DiscriminationTestPointConfig;
  dVal: number;
  dUnit: MassUnit;
  existingObservation?: DiscriminationTestObservation;
  onSaveObservation: (observation: DiscriminationTestObservation) => void;
}

export const DiscriminationWizard: React.FC<DiscriminationWizardProps> = ({
  testPoint,
  dVal,
  dUnit,
  existingObservation,
  onSaveObservation,
}) => {
  const oneTenth = calculateOneTenthD(dVal, dUnit);
  const onePointFour = calculateOnePointFourD(dVal, dUnit);

  // Wizard state: Step 1 (Base Load), Step 2 (Transition), Step 3 (Apply 1.4d), Step 4 (Final Indication)
  const [step, setStep] = useState<number>(existingObservation?.currentStep || 1);

  // Input states
  const [initialIndication, setInitialIndication] = useState<string>(
    existingObservation?.initialIndication?.toString() || testPoint.baseLoad.toFixed(3)
  );

  const defaultExpectedLower = calculateExpectedLowerIndication(
    existingObservation?.initialIndication || testPoint.baseLoad,
    dVal,
    dUnit,
    testPoint.unit
  );

  const [transitionIndication, setTransitionIndication] = useState<string>(
    existingObservation?.transitionIndication?.toString() || defaultExpectedLower.toFixed(3)
  );

  const defaultExpectedFinal = calculateExpectedFinalIndication(
    existingObservation?.initialIndication || testPoint.baseLoad,
    dVal,
    dUnit,
    testPoint.unit
  );

  const [finalIndication, setFinalIndication] = useState<string>(
    existingObservation?.finalIndication?.toString() || defaultExpectedFinal.toFixed(3)
  );

  const [notes, setNotes] = useState<string>(existingObservation?.notes || '');

  // Reset inputs when switching test points if no existing observation exists
  useEffect(() => {
    if (existingObservation) {
      setStep(existingObservation.currentStep || (existingObservation.isCompleted ? 4 : 1));
      setInitialIndication(existingObservation.initialIndication.toString());
      if (existingObservation.transitionIndication !== undefined) {
        setTransitionIndication(existingObservation.transitionIndication.toString());
      }
      if (existingObservation.finalIndication !== undefined) {
        setFinalIndication(existingObservation.finalIndication.toString());
      }
    } else {
      setStep(1);
      const baseStr = testPoint.baseLoad.toFixed(3);
      setInitialIndication(baseStr);
      const lower = calculateExpectedLowerIndication(testPoint.baseLoad, dVal, dUnit, testPoint.unit);
      setTransitionIndication(lower.toFixed(3));
      const finalVal = calculateExpectedFinalIndication(testPoint.baseLoad, dVal, dUnit, testPoint.unit);
      setFinalIndication(finalVal.toString());
    }
  }, [testPoint.id, existingObservation]);

  // Derived values for active calculations
  const initNum = parseFloat(initialIndication) || testPoint.baseLoad;
  const expLower = calculateExpectedLowerIndication(initNum, dVal, dUnit, testPoint.unit);
  const expFinal = calculateExpectedFinalIndication(initNum, dVal, dUnit, testPoint.unit);
  const obsFinalNum = parseFloat(finalIndication) || expFinal;

  const currentEval = evaluateDiscriminationResponse({
    initialIndication: initNum,
    observedFinalIndication: obsFinalNum,
    dVal,
    dUnit,
    loadUnit: testPoint.unit,
  });

  // Step 1 Submit handler
  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isNaN(initNum) || initNum < 0) return;
    const calcLower = calculateExpectedLowerIndication(initNum, dVal, dUnit, testPoint.unit);
    setTransitionIndication(calcLower.toFixed(3));
    const calcFinal = calculateExpectedFinalIndication(initNum, dVal, dUnit, testPoint.unit);
    setFinalIndication(calcFinal.toFixed(3));
    setStep(2);
  };

  // Step 2 Submit handler
  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(3);
  };

  // Step 3 Continue handler
  const handleStep3Continue = () => {
    setStep(4);
  };

  // Step 4 Final Complete handler
  const handleStep4Complete = (e: React.FormEvent) => {
    e.preventDefault();
    const finalVal = parseFloat(finalIndication);
    if (isNaN(finalVal)) return;

    const evalResult = evaluateDiscriminationResponse({
      initialIndication: initNum,
      observedFinalIndication: finalVal,
      dVal,
      dUnit,
      loadUnit: testPoint.unit,
    });

    const obs: DiscriminationTestObservation = {
      testPointId: testPoint.id,
      testPointLabel: testPoint.label,
      load: testPoint.baseLoad,
      loadUnit: testPoint.unit,
      scaleIntervalD: dVal,
      dUnit,
      oneTenthD: oneTenth.value,
      onePointFourD: onePointFour.value,
      initialIndication: initNum,
      transitionIndication: parseFloat(transitionIndication) || expLower,
      expectedLowerIndication: expLower,
      finalIndication: finalVal,
      expectedFinalIndication: expFinal,
      additionalLoad: onePointFour.value,
      newIndication: finalVal,
      passed: evalResult.passed,
      resultStatus: evalResult.resultStatus,
      currentStep: 4,
      isCompleted: true,
      notes,
    };

    onSaveObservation(obs);
  };

  return (
    <div className="space-y-6">
      {/* Step Wizard Breadcrumb Navigation */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-semibold">
        {[
          { num: 1, title: 'STEP 1 — Base Load' },
          { num: 2, title: 'STEP 2 — Transition Point' },
          { num: 3, title: 'STEP 3 — Apply 1.4d' },
          { num: 4, title: 'STEP 4 — Final Indication' },
        ].map((s) => {
          const isActive = step === s.num;
          const isDone = step > s.num || existingObservation?.isCompleted;

          let cardStyle = 'bg-slate-50 text-slate-500 border-slate-200';
          if (isActive) cardStyle = 'bg-teal-900/10 text-teal-700 border-teal-500 ring-2 ring-teal-500/20';
          else if (isDone) cardStyle = 'bg-emerald-50 text-emerald-800 border-emerald-300';

          return (
            <button
              key={s.num}
              type="button"
              onClick={() => setStep(s.num)}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${cardStyle}`}
            >
              <div className="text-[10px] uppercase font-bold opacity-75">
                {isDone ? '✓ Completed' : `Step ${s.num}`}
              </div>
              <div className="font-extrabold truncate mt-0.5">{s.title}</div>
            </button>
          );
        })}
      </div>

      {/* STEP 1: APPLY BASE LOAD */}
      {step === 1 && (
        <form onSubmit={handleStep1Submit} className="p-6 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <span className="text-xs font-bold text-teal-600 uppercase tracking-wider block">
                STEP 1 — Apply Base Load ({testPoint.shortLabel})
              </span>
              <p className="text-xs text-slate-600 mt-1 font-medium">
                “Place the prescribed test load ({testPoint.baseLoad.toFixed(3)} {testPoint.unit}) on the weighing instrument receptor.”
              </p>
            </div>
            <span className="text-xs font-mono font-bold px-3 py-1 bg-slate-200 text-slate-800 rounded-lg shrink-0">
              Base Load: {testPoint.baseLoad.toFixed(3)} {testPoint.unit}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Initial Displayed Indication (I) *
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  step="0.001"
                  required
                  value={initialIndication}
                  onChange={(e) => setInitialIndication(e.target.value)}
                  placeholder={testPoint.baseLoad.toFixed(3)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-l-lg font-mono text-slate-900 font-bold focus:outline-hidden focus:border-teal-600"
                />
                <span className="px-3 py-2 bg-slate-200 text-slate-700 font-bold rounded-r-lg border border-l-0 border-slate-300">
                  {testPoint.unit}
                </span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Scale Interval (d)</label>
              <div className="px-3 py-2 bg-slate-200 rounded-lg font-mono text-slate-800 font-bold">
                {dVal} {dUnit}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              Record Initial Indication <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {/* STEP 2: ESTABLISH TRANSITION POINT */}
      {step === 2 && (
        <form onSubmit={handleStep2Submit} className="p-6 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <span className="text-xs font-bold text-teal-600 uppercase tracking-wider block">
                STEP 2 — Establish Transition Point (I − d)
              </span>
              <p className="text-xs text-slate-600 mt-1 font-medium">
                “Add the small increment weights ({oneTenth.text}), then remove them successively until the indication decreases unambiguously by one actual scale interval from I to I − d.”
              </p>
            </div>
            <span className="text-xs font-mono font-bold px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-lg shrink-0">
              Expected Lower: {expLower.toFixed(3)} {testPoint.unit}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <span className="text-slate-500 font-semibold block">Small Increment Weight</span>
              <span className="text-sm font-bold font-mono text-teal-700">{oneTenth.text} (0.1d)</span>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <span className="text-slate-500 font-semibold block">Increment Set</span>
              <span className="text-sm font-bold font-mono text-slate-800">10 × {oneTenth.text}</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Observed Transition Indication (I − d) *
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  step="0.001"
                  required
                  value={transitionIndication}
                  onChange={(e) => setTransitionIndication(e.target.value)}
                  placeholder={expLower.toFixed(3)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-l-lg font-mono text-slate-900 font-bold focus:outline-hidden focus:border-teal-600"
                />
                <span className="px-3 py-2 bg-slate-200 text-slate-700 font-bold rounded-r-lg border border-l-0 border-slate-300">
                  {testPoint.unit}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
            >
              Back to Step 1
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              Record Transition <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {/* STEP 3: REPLACE 0.1d AND APPLY 1.4d */}
      {step === 3 && (
        <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <span className="text-xs font-bold text-teal-600 uppercase tracking-wider block">
              STEP 3 — Replace 0.1d Increment &amp; Apply 1.4d Test Load
            </span>
            <p className="text-xs text-slate-600 mt-1 font-medium">
              “Follow the OIML R 76-1 A.4.8.2 instructions carefully before reading the final scale indication.”
            </p>
          </div>

          <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200 text-xs">
            <div className="flex items-start gap-3 p-3 bg-teal-50 border border-teal-200 rounded-lg text-teal-900 font-medium">
              <span className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center shrink-0">1</span>
              <div>
                <span className="font-bold block">Replace one 0.1d increment weight</span>
                <span className="text-slate-600">Gently place one <strong>{oneTenth.text}</strong> weight back onto the load receptor.</span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-teal-50 border border-teal-200 rounded-lg text-teal-900 font-medium">
              <span className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center shrink-0">2</span>
              <div>
                <span className="font-bold block">Apply additional load equal to 1.4d</span>
                <span className="text-slate-600">Gently add the certified test load equal to <strong>{onePointFour.text} (1.4d)</strong> to the load receptor.</span>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
            >
              Back to Step 2
            </button>
            <button
              type="button"
              onClick={handleStep3Continue}
              className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              Continue to Final Reading <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: FINAL INDICATION & CONFIRMATION */}
      {step === 4 && (
        <form onSubmit={handleStep4Complete} className="p-6 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <span className="text-xs font-bold text-teal-600 uppercase tracking-wider block">
                STEP 4 — Final Indication &amp; Discrimination Evaluation
              </span>
              <p className="text-xs text-slate-600 mt-1 font-medium">
                “Enter the final displayed scale indication to evaluate discrimination response.”
              </p>
            </div>
            <span className="text-xs font-mono font-bold px-3 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg shrink-0">
              Expected Final (I + d): {expFinal.toFixed(3)} {testPoint.unit}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Final Displayed Indication *
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  step="0.001"
                  required
                  value={finalIndication}
                  onChange={(e) => setFinalIndication(e.target.value)}
                  placeholder={expFinal.toFixed(3)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-l-lg font-mono text-slate-900 font-bold focus:outline-hidden focus:border-teal-600"
                />
                <span className="px-3 py-2 bg-slate-200 text-slate-700 font-bold rounded-r-lg border border-l-0 border-slate-300">
                  {testPoint.unit}
                </span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Expected Indication (I + d)</label>
              <div className="px-3 py-2 bg-slate-200 rounded-lg font-mono text-slate-800 font-bold">
                {expFinal.toFixed(3)} {testPoint.unit}
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Notes / Observations (Optional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Indication increased by exactly 1d"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
          </div>

          {/* Real-time Discrimination Evaluation Status Box */}
          <div className="p-3 bg-white rounded-lg border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 font-mono flex-wrap">
              <div>
                <span className="text-slate-500">Discrimination Check: </span>
                <span
                  className={`font-bold font-mono px-2.5 py-0.5 rounded text-[11px] ${
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
              className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg transition-colors shadow-xs shrink-0 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" /> Save Test Point Reading
            </button>
          </div>
        </form>
      )}

      {/* Expandable Explanation Panel */}
      <DiscriminationCalculationExplanationPanel
        ruleStandard="OIML R 76-1:2006 §3.8"
        procedureRef="Procedure A.4.8.2"
        dVal={dVal}
        dUnit={dUnit}
        oneTenthD={oneTenth.value}
        onePointFourD={onePointFour.value}
        initialIndication={initNum}
        expectedLowerIndication={expLower}
        expectedFinalIndication={expFinal}
        observedFinalIndication={obsFinalNum}
        loadUnit={testPoint.unit}
        passed={currentEval.passed}
        defaultExpanded={false}
      />
    </div>
  );
};
