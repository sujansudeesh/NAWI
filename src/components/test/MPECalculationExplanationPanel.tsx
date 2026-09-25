import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Calculator, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { MPECheckResult } from '../../services/oimlComplianceService';

interface MPECalculationExplanationPanelProps {
  checkResult: MPECheckResult;
  title?: string;
  defaultExpanded?: boolean;
}

export const MPECalculationExplanationPanel: React.FC<MPECalculationExplanationPanelProps> = ({
  checkResult,
  title = 'How was this calculated?',
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const { mpeResult, status, isPassed, indicatedDifferenceFormatted } = checkResult;

  return (
    <div className="bg-slate-900 text-slate-100 rounded-xl border border-slate-800 overflow-hidden text-xs">
      {/* Header / Toggle Button */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 bg-slate-900 hover:bg-slate-850 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-teal-400 shrink-0" />
          <span className="font-bold text-white tracking-wide">{title}</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
            {mpeResult.ruleVersion}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick Summary Badge when collapsed */}
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="text-slate-400">Allowed:</span>
            <span className="font-bold text-teal-300">±{mpeResult.mpeValue} {mpeResult.mpeUnit}</span>
            <span className="text-slate-600">|</span>
            <span
              className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                isPassed
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-amber-950 text-amber-300 border border-amber-800'
              }`}
            >
              {isPassed ? '✓ WITHIN MPE' : '✕ EXCEEDS MPE'}
            </span>
          </div>

          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>

      {/* Expandable Panel Body */}
      {isExpanded && (
        <div className="p-4 border-t border-slate-800 bg-slate-950 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 font-mono">
            {/* Box 1: Class & e */}
            <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
              <span className="text-[10px] uppercase text-slate-400 font-sans font-bold block">
                Accuracy Class & e
              </span>
              <div className="font-bold text-teal-400 text-sm">{mpeResult.accuracyClass}</div>
              <div className="text-slate-300 text-[11px]">
                e = {mpeResult.e} {mpeResult.eUnit}
              </div>
            </div>

            {/* Box 2: Reference Load & Load in e */}
            <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
              <span className="text-[10px] uppercase text-slate-400 font-sans font-bold block">
                Load in e Intervals
              </span>
              <div className="font-bold text-white text-sm">
                {checkResult.referenceLoad} {checkResult.referenceLoadUnit}
              </div>
              <div className="text-teal-400 font-bold text-[11px]">
                {mpeResult.loadInE.toLocaleString()}e
              </div>
            </div>

            {/* Box 3: Table 6 MPE Band */}
            <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
              <span className="text-[10px] uppercase text-slate-400 font-sans font-bold block">
                Table 6 MPE Band
              </span>
              <div className="font-bold text-amber-400 text-sm">{mpeResult.bandLabel}</div>
              <div className="text-slate-400 text-[10px] font-sans">{mpeResult.bandText}</div>
            </div>

            {/* Box 4: Maximum Permissible Error */}
            <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
              <span className="text-[10px] uppercase text-slate-400 font-sans font-bold block">
                Calculated MPE
              </span>
              <div className="font-bold text-teal-300 text-sm">
                ±{mpeResult.mpeValue} {mpeResult.mpeUnit}
              </div>
              <div className="text-slate-400 text-[10px]">
                (±{mpeResult.mpeValueInTestLoadUnit} {mpeResult.testLoadUnit})
              </div>
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="bg-slate-900 rounded-lg p-3.5 border border-slate-800 space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400 font-sans">Accuracy Class:</span>
              <span className="font-bold text-white">{mpeResult.accuracyClass}</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400 font-sans">Verification interval (e):</span>
              <span className="font-bold text-white">{mpeResult.e} {mpeResult.eUnit}</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400 font-sans">Reference Load:</span>
              <span className="font-bold text-white">{checkResult.referenceLoad} {checkResult.referenceLoadUnit}</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400 font-sans">Load in verification intervals:</span>
              <span className="font-bold text-teal-400">{mpeResult.loadInE.toLocaleString()}e</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400 font-sans">Applicable MPE band:</span>
              <span className="font-bold text-amber-400">{mpeResult.bandLabel} ({mpeResult.bandText})</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400 font-sans">Verification Mode:</span>
              <span className="font-bold text-slate-300 uppercase">{mpeResult.mode.replace('_', ' ')}</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400 font-sans">Maximum Permissible Error:</span>
              <span className="font-bold text-teal-300">±{mpeResult.mpeValue} {mpeResult.mpeUnit}</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400 font-sans">Measured difference:</span>
              <span className="font-bold text-white">{indicatedDifferenceFormatted}</span>
            </div>

            <div className="flex items-center justify-between pt-1.5 font-sans">
              <span className="font-bold text-slate-300">MPE Check Status:</span>
              <span
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-extrabold font-mono text-xs ${
                  isPassed
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                    : 'bg-amber-950 text-amber-300 border border-amber-700'
                }`}
              >
                {isPassed ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> WITHIN MPE
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> EXCEEDS MPE
                  </>
                )}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2 text-[10px] text-slate-400 font-sans italic pt-1">
            <Info className="w-3.5 h-3.5 text-teal-500 shrink-0 mt-0.5" />
            <p>
              Calculated dynamically via OIML R 76-1:2006 Table 6 Compliance Engine. Does not represent final legal verification until digital rounding error correction is applied.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
