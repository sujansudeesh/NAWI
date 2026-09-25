import React, { useState } from 'react';
import {
  Scale,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
  Info,
  ShieldCheck,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import {
  TestSession,
  Instrument,
  MassUnit,
  AccuracyClass,
  TareType,
  TareSettingObservation,
  TareNetWeighingObservation,
} from '../../types';
import {
  calculateSuggestedTareTestLoad,
  calculateAvailableNetCapacity,
  validateTareLoadInput,
  validateNetLoadInput,
  calculateTareSettingError,
  generateSuggestedNetLoadPoints,
  evaluateTareNetObservation,
  evaluateOverallTareTest,
} from '../../services/tareService';
import { TareCalculationExplanationPanel } from './TareCalculationExplanationPanel';

interface TareWizardProps {
  session: TestSession;
  instrument?: Instrument;
  onSaveTareSetting: (obs: TareSettingObservation) => void;
  onSaveNetObservation: (obs: TareNetWeighingObservation) => void;
  onCompleteTareTest: (overallResult: string) => void;
}

export const TareWizard: React.FC<TareWizardProps> = ({
  session,
  instrument,
  onSaveTareSetting,
  onSaveNetObservation,
  onCompleteTareTest,
}) => {
  const accuracyClass: AccuracyClass = instrument?.metrology.accuracyClass || session.accuracyClass || 'Class III';
  const eVal = instrument?.metrology.verificationIntervalE || 5;
  const eUnit: MassUnit = instrument?.metrology.eUnit || 'g';
  const maxCapacity = instrument?.metrology.maxCapacity || 30;
  const minCapacity = instrument?.metrology.minCapacity || 0.1;
  const maxTareEffect = instrument?.metrology.maximumTareEffect || 10;
  const maxTareUnit: MassUnit = instrument?.metrology.maximumTareUnit || 'kg';
  const tareType: TareType = instrument?.metrology.tareType || 'SUBTRACTIVE';

  // Check if tare test session exists
  const existingTareSession = session.tareTestSession;
  const existingTareSetting = existingTareSession?.tareSettingObservation;
  const existingNetObs = existingTareSession?.netWeighingObservations || [];

  // Active step (1: Tare Setting Accuracy, 2: Net Weighing Performance)
  const [activeTab, setActiveTab] = useState<'TARE_SETTING' | 'NET_WEIGHING'>(
    existingTareSetting ? 'NET_WEIGHING' : 'TARE_SETTING'
  );

  // Step 1 State: Tare Setting
  const suggestedTareInfo = calculateSuggestedTareTestLoad(maxTareEffect, maxTareUnit);
  const [appliedTareLoadInput, setAppliedTareLoadInput] = useState<string>(
    existingTareSetting?.appliedTareLoad?.toString() || suggestedTareInfo.recommended.toString()
  );
  const [isTareActivated, setIsTareActivated] = useState<boolean>(!!existingTareSetting);
  const [displayedIndicationAfterTare, setDisplayedIndicationAfterTare] = useState<string>(
    existingTareSetting?.displayedIndicationAfterTare?.toString() || '0.000'
  );
  const [changeoverDeltaLInput, setChangeoverDeltaLInput] = useState<string>(
    existingTareSetting?.changeoverAdditionalLoad?.toString() || '2.0'
  );
  const [tareSettingErrorMessage, setTareSettingErrorMessage] = useState<string | null>(null);

  // Computed Tare Setting
  const appliedTareVal = parseFloat(appliedTareLoadInput) || 0;
  const deltaLVal = parseFloat(changeoverDeltaLInput);
  const currentTareSettingEval = !isNaN(deltaLVal) && deltaLVal >= 0
    ? calculateTareSettingError(deltaLVal, eVal, eUnit)
    : null;

  // Step 2 State: Net Weighing
  const netCapacity = calculateAvailableNetCapacity(maxCapacity, appliedTareVal, tareType);
  const suggestedNetPoints = generateSuggestedNetLoadPoints({
    accuracyClass,
    eVal,
    eUnit,
    minCapacity,
    maxCapacity,
    appliedTare: appliedTareVal,
    tareType,
    loadUnit: maxTareUnit,
  });

  const [selectedPointIndex, setSelectedPointIndex] = useState<number>(0);
  const currentPoint = suggestedNetPoints[selectedPointIndex] || suggestedNetPoints[0];

  const [refNetLoadInput, setRefNetLoadInput] = useState<string>(currentPoint.referenceNetLoad.toString());
  const [displayedNetInput, setDisplayedNetInput] = useState<string>(
    (currentPoint.referenceNetLoad + 0.003).toString() // realistic default (+3 g)
  );
  const [netErrorMessage, setNetErrorMessage] = useState<string | null>(null);

  // Computed Net Observation Preview
  const refNetVal = parseFloat(refNetLoadInput);
  const dispNetVal = parseFloat(displayedNetInput);
  const previewNetEval =
    !isNaN(refNetVal) && !isNaN(dispNetVal) && refNetVal > 0
      ? evaluateTareNetObservation({
          appliedTare: appliedTareVal,
          referenceNet: refNetVal,
          displayedNet: dispNetVal,
          accuracyClass,
          eVal,
          eUnit,
          loadUnit: maxTareUnit,
          stepIndex: currentPoint.stepIndex,
          stepLabel: currentPoint.stepLabel,
        })
      : null;

  // Handler: Select Net Point
  const handleSelectPoint = (idx: number) => {
    setSelectedPointIndex(idx);
    const pt = suggestedNetPoints[idx];
    setRefNetLoadInput(pt.referenceNetLoad.toString());
    const existingObs = existingNetObs.find((o) => o.stepIndex === pt.stepIndex);
    if (existingObs) {
      setDisplayedNetInput(existingObs.displayedNetReading.toString());
    } else {
      setDisplayedNetInput((pt.referenceNetLoad + 0.003).toString());
    }
    setNetErrorMessage(null);
  };

  // Handler: Save Step 1 Tare Setting
  const handleSaveTareSettingStep = () => {
    setTareSettingErrorMessage(null);
    const tareVal = parseFloat(appliedTareLoadInput);
    const validateTare = validateTareLoadInput(tareVal, maxTareEffect, maxCapacity);
    if (!validateTare.isValid) {
      setTareSettingErrorMessage(validateTare.errorMessage || 'Invalid tare load input.');
      return;
    }

    const deltaL = parseFloat(changeoverDeltaLInput);
    if (isNaN(deltaL) || deltaL < 0) {
      setTareSettingErrorMessage('Changeover load ΔL must be a non-negative number.');
      return;
    }

    if (deltaL > eVal * 5) {
      setTareSettingErrorMessage("Changeover load appears inconsistent with the instrument's verification interval. Please check the value.");
      return;
    }

    const evalResult = calculateTareSettingError(deltaL, eVal, eUnit);
    const obs: TareSettingObservation = {
      id: `tare-setting-${Date.now()}`,
      appliedTareLoad: tareVal,
      tareLoadUnit: maxTareUnit,
      displayedIndicationAfterTare: parseFloat(displayedIndicationAfterTare) || 0,
      suggestedIncrement: Number((eVal * 0.1).toFixed(4)),
      changeoverAdditionalLoad: deltaL,
      calculatedTareZeroError: evalResult.tareZeroError,
      permissibleTareZeroError: evalResult.permissibleTareZeroError,
      passed: evalResult.passed,
      resultStatus: evalResult.resultStatus,
      recordedAt: new Date().toISOString(),
    };

    onSaveTareSetting(obs);
    setActiveTab('NET_WEIGHING');
  };

  // Handler: Save Net Observation
  const handleSaveNetObservationStep = () => {
    setNetErrorMessage(null);
    const refNet = parseFloat(refNetLoadInput);
    const validateNet = validateNetLoadInput(refNet, minCapacity, netCapacity, maxTareUnit);
    if (!validateNet.isValid) {
      setNetErrorMessage(validateNet.errorMessage || 'Invalid net load input.');
      return;
    }

    const dispNet = parseFloat(displayedNetInput);
    if (isNaN(dispNet) || dispNet < 0) {
      setNetErrorMessage('Displayed net reading must be a non-negative number.');
      return;
    }

    const obs = evaluateTareNetObservation({
      appliedTare: appliedTareVal,
      referenceNet: refNet,
      displayedNet: dispNet,
      accuracyClass,
      eVal,
      eUnit,
      loadUnit: maxTareUnit,
      stepIndex: currentPoint.stepIndex,
      stepLabel: currentPoint.stepLabel,
    });

    onSaveNetObservation(obs);

    // Auto-advance to next point if available
    if (selectedPointIndex < suggestedNetPoints.length - 1) {
      handleSelectPoint(selectedPointIndex + 1);
    }
  };

  // Handler: Complete Tare Test
  const handleCompleteFullTareTest = () => {
    const overall = evaluateOverallTareTest(existingTareSetting, existingNetObs, 5);
    onCompleteTareTest(overall.overallResult);
  };

  return (
    <div className="space-y-6">
      {/* Explanation Banner Panel */}
      <TareCalculationExplanationPanel
        accuracyClass={accuracyClass}
        verificationIntervalE={eVal}
        eUnit={eUnit}
        tareType={tareType}
        maximumTareEffect={maxTareEffect}
        maximumTareUnit={maxTareUnit}
        appliedTare={appliedTareVal}
        availableNetCapacity={netCapacity}
      />

      {/* Tab Navigation Header */}
      <div className="flex border-b border-slate-800 bg-slate-900/60 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('TARE_SETTING')}
          className={`flex-1 py-3 px-4 font-semibold text-xs rounded-lg flex items-center justify-center gap-2 transition-all ${
            activeTab === 'TARE_SETTING'
              ? 'bg-teal-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>STEP 1 — Tare-Setting Accuracy</span>
          {existingTareSetting && (
            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
              existingTareSetting.passed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
            }`}>
              {existingTareSetting.passed ? '✓ PASSED' : '✕ FAILED'}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('NET_WEIGHING')}
          disabled={!existingTareSetting}
          className={`flex-1 py-3 px-4 font-semibold text-xs rounded-lg flex items-center justify-center gap-2 transition-all ${
            activeTab === 'NET_WEIGHING'
              ? 'bg-teal-600 text-white shadow-md'
              : !existingTareSetting
              ? 'text-slate-600 cursor-not-allowed'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>STEP 2 — Net Weighing Performance</span>
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-800 text-slate-300">
            {existingNetObs.length} / 5 Points
          </span>
        </button>
      </div>

      {/* STEP 1: TARE-SETTING ACCURACY */}
      {activeTab === 'TARE_SETTING' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Step 1: OIML Tare-Device Setting Accuracy Check
                <span className="text-xs font-normal text-slate-400"> Clause 4.6.3 / A.4.6.2</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Establish tare zero and verify that pre-rounding zero error E<sub>T</sub> does not exceed ±0.25e (±{(eVal * 0.25).toFixed(2)} {eUnit}).
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Maximum Tare Specification</span>
              <span className="text-sm font-mono font-bold text-teal-400">{maxTareEffect} {maxTareUnit} ({tareType})</span>
            </div>
          </div>

          {/* Error Alert */}
          {tareSettingErrorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{tareSettingErrorMessage}</span>
            </div>
          )}

          {/* Inputs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Card: Apply Tare Load */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-4">
              <h4 className="text-xs uppercase font-bold text-slate-300 tracking-wider flex items-center gap-2">
                1. Apply Tare Container Load
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                “Place the tare load/container on the instrument and activate the tare function.”
              </p>

              <div>
                <label className="block text-xs text-slate-400 mb-1 font-medium">
                  Tare Load Value ({maxTareUnit}) — Suggested {suggestedTareInfo.recommended} {maxTareUnit} (1/3 to 2/3 Max Tare)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.001"
                    value={appliedTareLoadInput}
                    onChange={(e) => setAppliedTareLoadInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-slate-100 focus:outline-none focus:border-teal-500"
                    placeholder="5.000"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-mono">{maxTareUnit}</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setIsTareActivated(true)}
                  className={`w-full py-2.5 px-4 font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-2 ${
                    isTareActivated
                      ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-teal-600 hover:bg-teal-700 text-white shadow-md'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isTareActivated ? '✓ TARE APPLIED & ACTIVE' : 'Activate Tare Device [ Tare Applied ]'}</span>
                </button>
              </div>

              {/* Tare Active Badge Display */}
              {isTareActivated && (
                <div className="p-3 bg-teal-950/40 border border-teal-500/30 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-teal-400" />
                    <span className="font-mono text-xs font-bold text-teal-300 tracking-wider">TARE ACTIVE</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    0.000 NET
                  </span>
                </div>
              )}
            </div>

            {/* Right Card: Changeover Method & Calculation */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-4">
              <h4 className="text-xs uppercase font-bold text-slate-300 tracking-wider flex items-center gap-2">
                2. Changeover Point ΔL Entry
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Add small weights ($0.1e = {(eVal * 0.1).toFixed(1)} {eUnit}$) until displayed indication changes over to $0 + e$.
              </p>

              <div>
                <label className="block text-xs text-slate-400 mb-1 font-medium">
                  Additional Load at Changeover ΔL ({eUnit})
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={changeoverDeltaLInput}
                    onChange={(e) => setChangeoverDeltaLInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-slate-100 focus:outline-none focus:border-teal-500"
                    placeholder="2.0"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-mono">{eUnit}</span>
                </div>
              </div>

              {/* Calculated Error Breakdown */}
              {currentTareSettingEval && (
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">Calculated Tare Zero Error (E<sub>T</sub>):</span>
                    <span className="font-bold text-slate-100">{currentTareSettingEval.tareZeroErrorFormatted}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">Permissible Limit (±0.25e):</span>
                    <span className="font-bold text-teal-400">{currentTareSettingEval.permissibleTareZeroErrorFormatted}</span>
                  </div>

                  <div className={`mt-2 p-2.5 rounded text-center text-xs font-bold tracking-wider uppercase border ${
                    currentTareSettingEval.passed
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}>
                    {currentTareSettingEval.resultText}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Button */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveTareSettingStep}
              className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2"
            >
              <span>Save Tare-Setting Result & Proceed to Net Weighing</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: NET WEIGHING PERFORMANCE */}
      {activeTab === 'NET_WEIGHING' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Step 2: Net Weighing Performance Test
                <span className="text-xs font-normal text-slate-400"> Clause 3.5.3.3 / A.4.6.1</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Evaluate indicated NET values across 5 net load steps within available net capacity.
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Active Tare Container</span>
              <span className="text-sm font-mono font-bold text-amber-400">{appliedTareVal} {maxTareUnit}</span>
              <span className="text-[10px] text-slate-400 block font-mono">Available Net: 0 to {netCapacity} {maxTareUnit}</span>
            </div>
          </div>

          {/* Load Points Selector Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {suggestedNetPoints.map((pt, idx) => {
              const obs = existingNetObs.find((o) => o.stepIndex === pt.stepIndex);
              const isSelected = selectedPointIndex === idx;
              return (
                <button
                  key={pt.stepIndex}
                  onClick={() => handleSelectPoint(idx)}
                  className={`p-3 rounded-lg border text-left transition-all relative ${
                    isSelected
                      ? 'bg-teal-950/80 border-teal-500 text-white shadow-md'
                      : obs
                      ? 'bg-slate-950 border-slate-700 text-slate-300'
                      : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Point {pt.stepIndex}</div>
                  <div className="text-xs font-mono font-bold mt-0.5 text-teal-300">{pt.referenceNetLoad} {pt.loadUnit} NET</div>
                  <div className="text-[9px] text-slate-500 truncate mt-1">{pt.stepLabel}</div>

                  {obs && (
                    <span className={`absolute top-2 right-2 text-[10px] font-bold ${
                      obs.passed ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {obs.passed ? '✓' : '✕'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Observation Entry Form */}
          <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-xs font-bold uppercase text-slate-200 tracking-wider">
                Recording Point {currentPoint.stepIndex}: {currentPoint.stepLabel}
              </h4>
              <span className="text-xs text-slate-400 font-mono">GROSS = TARE ({appliedTareVal}) + NET</span>
            </div>

            {netErrorMessage && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{netErrorMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-medium">
                  Certified Reference Net Load ({maxTareUnit})
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.001"
                    value={refNetLoadInput}
                    onChange={(e) => setRefNetLoadInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-mono">{maxTareUnit}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1 font-medium">
                  Displayed Net Reading ({maxTareUnit})
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.001"
                    value={displayedNetInput}
                    onChange={(e) => setDisplayedNetInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-mono">{maxTareUnit}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1 font-medium">
                  Total Gross Physical Load (Pan)
                </label>
                <div className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm font-mono text-indigo-300 font-bold">
                  {previewNetEval ? `${previewNetEval.calculatedGrossLoad} ${maxTareUnit}` : '—'}
                </div>
              </div>
            </div>

            {/* Calculated Preview Panel */}
            {previewNetEval && (
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between font-mono text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Net Error:</span>
                  <span className="font-bold text-slate-100">{previewNetEval.netErrorFormatted}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">OIML MPE Limit:</span>
                  <span className="font-bold text-teal-400">±{(previewNetEval.mpeLimit * (maxTareUnit === 'kg' ? 1000 : 1)).toFixed(1)} g</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Status:</span>
                  <span className={`font-bold ${previewNetEval.passed ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {previewNetEval.passed ? 'WITHIN MPE' : 'EXCEEDS MPE'}
                  </span>
                </div>
                <div>
                  <button
                    onClick={handleSaveNetObservationStep}
                    className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg transition-all"
                  >
                    Save Observation
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Observations Summary Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase text-slate-300 tracking-wider">
              Recorded Net Observations Summary Table ({existingNetObs.length} / 5 Points)
            </h4>
            <div className="overflow-x-auto border border-slate-800 rounded-xl">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                  <tr>
                    <th className="p-2.5">Point</th>
                    <th className="p-2.5">Tare Load</th>
                    <th className="p-2.5">Reference Net</th>
                    <th className="p-2.5">Gross Load</th>
                    <th className="p-2.5">Displayed Net</th>
                    <th className="p-2.5">Net Error</th>
                    <th className="p-2.5">MPE Limit</th>
                    <th className="p-2.5">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900/50">
                  {existingNetObs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-4 text-center text-slate-500 font-sans italic text-xs">
                        No net weighing observations recorded yet. Click "Save Observation" above to record points.
                      </td>
                    </tr>
                  ) : (
                    existingNetObs.map((obs) => (
                      <tr key={obs.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-2.5 font-bold text-slate-300">P{obs.stepIndex}</td>
                        <td className="p-2.5 text-amber-400">{obs.appliedTareLoad} {maxTareUnit}</td>
                        <td className="p-2.5 text-cyan-300 font-bold">{obs.referenceNetLoad} {maxTareUnit}</td>
                        <td className="p-2.5 text-indigo-300">{obs.calculatedGrossLoad} {maxTareUnit}</td>
                        <td className="p-2.5 text-slate-100">{obs.displayedNetReading} {maxTareUnit}</td>
                        <td className="p-2.5 font-bold text-slate-200">{obs.netErrorFormatted}</td>
                        <td className="p-2.5 text-teal-400">±{(obs.mpeLimit * (maxTareUnit === 'kg' ? 1000 : 1)).toFixed(1)} g</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            obs.passed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                          }`}>
                            {obs.passed ? 'WITHIN MPE' : 'EXCEEDS MPE'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Complete Full Test Button */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              onClick={() => setActiveTab('TARE_SETTING')}
              className="px-4 py-2 border border-slate-700 text-slate-300 hover:bg-slate-800 rounded-lg text-xs font-bold transition-all"
            >
              ← Back to Tare-Setting Check
            </button>

            <button
              onClick={handleCompleteFullTareTest}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Complete OIML Tare Test</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
