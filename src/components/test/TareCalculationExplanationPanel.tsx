import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Scale, CheckCircle2, ShieldCheck, Layers } from 'lucide-react';
import { AccuracyClass, MassUnit, TareType } from '../../types';

interface TareCalculationExplanationPanelProps {
  accuracyClass: AccuracyClass;
  verificationIntervalE: number;
  eUnit: MassUnit;
  tareType: TareType;
  maximumTareEffect: number;
  maximumTareUnit: MassUnit;
  appliedTare?: number;
  availableNetCapacity?: number;
}

export const TareCalculationExplanationPanel: React.FC<TareCalculationExplanationPanelProps> = ({
  accuracyClass,
  verificationIntervalE,
  eUnit,
  tareType,
  maximumTareEffect,
  maximumTareUnit,
  appliedTare = 5.0,
  availableNetCapacity = 25.0,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const quarterE = Number((verificationIntervalE * 0.25).toFixed(4));
  const halfE = Number((verificationIntervalE * 0.5).toFixed(4));

  return (
    <div className="bg-slate-900/90 border border-slate-700/70 rounded-xl overflow-hidden shadow-lg transition-all">
      {/* Expandable Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-800/60 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/30">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              OIML R 76-1:2006 Tare Test Specification & Visual Metrology Guide
              <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                Clause 4.6 & §3.5.3.3
              </span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Subtractive Tare ({maximumTareEffect} {maximumTareUnit} Max) • Permissible Tare-Setting Limit: ±0.25e (±{quarterE} {eUnit})
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-indigo-400 text-xs font-medium">
          <span>{isOpen ? 'Hide Guidance' : 'View Procedure & Breakdown'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded Breakdown Content */}
      {isOpen && (
        <div className="p-5 border-t border-slate-800 bg-slate-950/60 text-xs text-slate-300 space-y-5">
          {/* Visual Diagram: GROSS = TARE + NET */}
          <div className="p-4 bg-slate-900 border border-indigo-500/30 rounded-xl space-y-3">
            <h5 className="font-semibold text-indigo-300 flex items-center gap-2 text-xs uppercase tracking-wider">
              <Layers className="w-4 h-4" /> Visual Tare Principle: GROSS PHYSICAL LOAD = TARE LOAD + NET LOAD
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-lg">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">1. Tare Load (Container)</span>
                <span className="text-lg font-bold text-amber-400 font-mono mt-1 block">{appliedTare} {maximumTareUnit}</span>
                <span className="text-[11px] text-slate-400">Placed on pan & TARE pressed</span>
                <div className="mt-2 text-[10px] text-teal-400 font-mono font-semibold bg-teal-500/10 py-1 rounded">
                  Display: 0.000 NET
                </div>
              </div>

              <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-lg">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">2. Added Reference Net Load</span>
                <span className="text-lg font-bold text-cyan-400 font-mono mt-1 block">10.000 {maximumTareUnit}</span>
                <span className="text-[11px] text-slate-400">Material placed inside container</span>
                <div className="mt-2 text-[10px] text-cyan-300 font-mono font-semibold bg-cyan-500/10 py-1 rounded">
                  Display: 10.003 NET
                </div>
              </div>

              <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-lg">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">3. Total Gross Load on Pan</span>
                <span className="text-lg font-bold text-indigo-400 font-mono mt-1 block">{(appliedTare + 10).toFixed(3)} {maximumTareUnit}</span>
                <span className="text-[11px] text-slate-400">Physical load borne by load cell</span>
                <div className="mt-2 text-[10px] text-indigo-300 font-mono font-semibold bg-indigo-500/10 py-1 rounded">
                  Gross = {appliedTare} + 10 = {(appliedTare + 10).toFixed(1)} {maximumTareUnit}
                </div>
              </div>
            </div>
          </div>

          {/* OIML Clause Reference Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-lg space-y-2">
              <h5 className="font-semibold text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> STEP 1: Tare-Setting Accuracy (Clause 4.6.3 / A.4.6.2)
              </h5>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                After activating the tare device with container on load receptor (I = 0 NET), small weights (0.1e) are added to find the changeover load ΔL.
              </p>
              <div className="p-2 bg-slate-950 font-mono text-[11px] text-emerald-300 rounded border border-slate-800">
                Tare Zero Error: E<sub>T</sub> = 0.5e - ΔL = {halfE} {eUnit} - ΔL
              </div>
              <p className="text-slate-400 text-[10px]">
                OIML Limit: |E<sub>T</sub>| ≤ 0.25e (<strong>±{quarterE} {eUnit}</strong> for e = {verificationIntervalE} {eUnit}).
              </p>
            </div>

            <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-lg space-y-2">
              <h5 className="font-semibold text-slate-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" /> STEP 2: Net Weighing Performance (Clause 3.5.3.3 / A.4.6.1)
              </h5>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                With tare active, certified NET test loads are placed on the instrument. Maximum permissible error (MPE) applies directly to the indicated NET value.
              </p>
              <div className="p-2 bg-slate-950 font-mono text-[11px] text-cyan-300 rounded border border-slate-800">
                Remaining Net Capacity = Max ({25 + appliedTare}) - Applied Tare ({appliedTare}) = {availableNetCapacity} {maximumTareUnit}
              </div>
              <p className="text-slate-400 text-[10px]">
                Subtractive tare reduces total net weighing range to prevent overloading load receptor.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
