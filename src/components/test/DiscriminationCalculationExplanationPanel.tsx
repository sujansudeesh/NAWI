import React, { useState } from 'react';
import { ChevronDown, ChevronUp, BookOpen, Info, CheckCircle2, AlertTriangle } from 'lucide-react';
import { MassUnit } from '../../types';

interface DiscriminationCalculationExplanationPanelProps {
  ruleStandard?: string;
  procedureRef?: string;
  dVal: number;
  dUnit: MassUnit;
  oneTenthD: number;
  onePointFourD: number;
  initialIndication: number;
  expectedLowerIndication: number;
  expectedFinalIndication: number;
  observedFinalIndication: number;
  loadUnit?: MassUnit;
  passed: boolean;
  defaultExpanded?: boolean;
}

export const DiscriminationCalculationExplanationPanel: React.FC<DiscriminationCalculationExplanationPanelProps> = ({
  ruleStandard = 'OIML R 76-1:2006 §3.8',
  procedureRef = 'Procedure A.4.8.2 (Digital Indication)',
  dVal,
  dUnit,
  oneTenthD,
  onePointFourD,
  initialIndication,
  expectedLowerIndication,
  expectedFinalIndication,
  observedFinalIndication,
  loadUnit = 'kg',
  passed,
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl text-white overflow-hidden font-sans transition-all shadow-md">
      {/* Header Button */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 bg-slate-900 hover:bg-slate-800/80 flex items-center justify-between text-left transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-teal-400 shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wider text-teal-300">
            [ View Procedure &amp; Calculation Breakdown ]
          </span>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            — {ruleStandard} {procedureRef}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
              passed
                ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                : 'bg-amber-950 text-amber-300 border-amber-700'
            }`}
          >
            {passed ? '✓ RESPONSE CONFIRMED' : '✕ NOT OBSERVED'}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
          )}
        </div>
      </button>

      {/* Expanded Details Body */}
      {isExpanded && (
        <div className="p-4 border-t border-slate-800 bg-slate-950 text-xs space-y-4 font-mono">
          {/* Rule Citation Banner */}
          <div className="flex items-start gap-2 p-2.5 bg-slate-900 rounded-lg border border-slate-800">
            <Info className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
            <div className="text-[11px] space-y-0.5 text-slate-300 font-sans">
              <span className="font-bold text-white uppercase">{ruleStandard} ({procedureRef})</span>
              <p className="text-slate-400">
                For digital indication instruments, an additional load of 1.4d applied after establishing the I − d transition point must cause the indication to increase unambiguously by one scale interval to I + d.
              </p>
            </div>
          </div>

          {/* Formula Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-200">
            <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 space-y-1.5">
              <span className="text-[10px] text-slate-400 uppercase font-sans font-bold">Parameters</span>
              <div className="flex justify-between py-0.5 border-b border-slate-800">
                <span className="text-slate-400">Actual Scale Interval (d):</span>
                <span className="font-bold text-teal-300">{dVal} {dUnit}</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-slate-800">
                <span className="text-slate-400">Small Increment Weight (0.1d):</span>
                <span className="font-bold text-teal-300">{oneTenthD} {dUnit}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-400">Applied Test Load (1.4d):</span>
                <span className="font-bold text-teal-300">{onePointFourD} {dUnit}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 space-y-1.5">
              <span className="text-[10px] text-slate-400 uppercase font-sans font-bold">Expected vs Observed</span>
              <div className="flex justify-between py-0.5 border-b border-slate-800">
                <span className="text-slate-400">Initial Indication (I):</span>
                <span className="font-bold text-white">{initialIndication.toFixed(3)} {loadUnit}</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-slate-800">
                <span className="text-slate-400">Expected Lower (I - d):</span>
                <span className="font-bold text-amber-300">{expectedLowerIndication.toFixed(3)} {loadUnit}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-400">Expected Final (I + d):</span>
                <span className="font-bold text-emerald-300">{expectedFinalIndication.toFixed(3)} {loadUnit}</span>
              </div>
            </div>
          </div>

          {/* Final Verification Result */}
          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {passed ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              )}
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-sans font-bold block">Observed Final Indication</span>
                <span className="text-sm font-bold text-white">{observedFinalIndication.toFixed(3)} {loadUnit}</span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-sans font-bold block">Discrimination Verdict</span>
              <span
                className={`font-bold font-mono text-xs px-2.5 py-1 rounded inline-block ${
                  passed
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                    : 'bg-amber-950 text-amber-300 border border-amber-700'
                }`}
              >
                {passed ? '✓ DISCRIMINATION RESPONSE CONFIRMED' : '✕ EXPECTED INDICATION CHANGE NOT OBSERVED'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
