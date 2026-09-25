import React, { useState } from 'react';
import { ChevronDown, ChevronUp, BookOpen, Info, CheckCircle2, AlertTriangle } from 'lucide-react';
import { MassUnit, ZeroSettingType } from '../../types';

interface ZeroSettingCalculationExplanationPanelProps {
  ruleStandard?: string;
  procedureRef?: string;
  zeroSettingType?: ZeroSettingType;
  eVal: number;
  eUnit: MassUnit;
  suggestedIncrement: number;
  changeoverAdditionalLoad: number;
  calculatedZeroError: number;
  calculatedZeroErrorFormatted: string;
  permissibleZeroDeviation: number;
  permissibleZeroDeviationFormatted: string;
  passed: boolean;
  defaultExpanded?: boolean;
}

export const ZeroSettingCalculationExplanationPanel: React.FC<ZeroSettingCalculationExplanationPanelProps> = ({
  ruleStandard = 'OIML R 76-1:2006 §4.5.2',
  procedureRef = 'Procedure A.4.2.3',
  zeroSettingType = 'SEMI_AUTOMATIC',
  eVal,
  eUnit,
  suggestedIncrement,
  changeoverAdditionalLoad,
  calculatedZeroError,
  calculatedZeroErrorFormatted,
  permissibleZeroDeviation,
  permissibleZeroDeviationFormatted,
  passed,
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
  const halfE = (eVal * 0.5).toFixed(2);

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
            [ View Calculation &amp; OIML Breakdown ]
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
            {passed ? '✓ WITHIN LIMIT' : '✕ EXCEEDS LIMIT'}
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
          {/* Citation Banner */}
          <div className="flex items-start gap-2 p-2.5 bg-slate-900 rounded-lg border border-slate-800">
            <Info className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
            <div className="text-[11px] space-y-0.5 text-slate-300 font-sans">
              <span className="font-bold text-white uppercase">{ruleStandard} ({procedureRef})</span>
              <p className="text-slate-400">
                After zero setting, the effect of the deviation from zero on the weighing result must not exceed ±0.25e ({permissibleZeroDeviationFormatted}). Pre-rounding zero error is calculated using changeover point P0 = I + 0.5e − ΔL.
              </p>
            </div>
          </div>

          {/* Formula & Step Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-200">
            <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 space-y-1.5">
              <span className="text-[10px] text-slate-400 uppercase font-sans font-bold">Metrological Parameters</span>
              <div className="flex justify-between py-0.5 border-b border-slate-800">
                <span className="text-slate-400">Zero-Setting Type:</span>
                <span className="font-bold text-teal-300">{zeroSettingType}</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-slate-800">
                <span className="text-slate-400">Verification Interval (e):</span>
                <span className="font-bold text-teal-300">{eVal} {eUnit}</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-slate-800">
                <span className="text-slate-400">Suggested Increment (0.1e):</span>
                <span className="font-bold text-teal-300">{suggestedIncrement} {eUnit}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-400">Additional Load at Changeover (ΔL):</span>
                <span className="font-bold text-teal-300">{changeoverAdditionalLoad} {eUnit}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 space-y-1.5">
              <span className="text-[10px] text-slate-400 uppercase font-sans font-bold">Changeover Calculation</span>
              <div className="flex justify-between py-0.5 border-b border-slate-800">
                <span className="text-slate-400">Indication at Zero (I):</span>
                <span className="font-bold text-white">0 {eUnit}</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-slate-800">
                <span className="text-slate-400">Pre-Rounding Formula (P0):</span>
                <span className="font-bold text-amber-300">0 + 0.5e − ΔL</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-slate-800">
                <span className="text-slate-400">P0 = {halfE} − {changeoverAdditionalLoad}:</span>
                <span className="font-bold text-white">{calculatedZeroErrorFormatted}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-400">Permissible Zero Deviation (±0.25e):</span>
                <span className="font-bold text-emerald-300">{permissibleZeroDeviationFormatted}</span>
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
                <span className="text-[10px] text-slate-400 uppercase font-sans font-bold block">Calculated Zero Error (E0)</span>
                <span className="text-sm font-bold text-white">{calculatedZeroErrorFormatted}</span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-sans font-bold block">Zero-setting Accuracy Check</span>
              <span
                className={`font-bold font-mono text-xs px-2.5 py-1 rounded inline-block ${
                  passed
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                    : 'bg-amber-950 text-amber-300 border border-amber-700'
                }`}
              >
                {passed ? '✓ ZERO SETTING WITHIN LIMIT' : '✕ ZERO SETTING EXCEEDS LIMIT'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
