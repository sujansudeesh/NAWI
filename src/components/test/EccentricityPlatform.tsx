import React from 'react';
import { CheckCircle2, AlertTriangle, Circle, Truck, Layers, Info } from 'lucide-react';
import { EccentricityTestObservation, EccentricityProfile } from '../../types';
import { getEccentricityPositions } from '../../services/eccentricityService';
import { OIML_ENGINE_NOTICE } from '../../utils/oimlEngine';

interface EccentricityPlatformProps {
  currentPosition: number;
  onSelectPosition: (positionId: number) => void;
  observations: EccentricityTestObservation[];
  profile?: EccentricityProfile;
  numSupports?: number;
}

export const EccentricityPlatform: React.FC<EccentricityPlatformProps> = ({
  currentPosition,
  onSelectPosition,
  observations,
  profile = 'STANDARD_UP_TO_4_SUPPORTS',
  numSupports = 4,
}) => {
  const positions = getEccentricityPositions(profile, numSupports);

  const getPositionStatus = (posId: number) => {
    const obs = observations.find((o) => o.position === posId);
    if (!obs) {
      if (posId === currentPosition) return 'current';
      return 'pending';
    }
    return obs.passed ? 'pass' : 'fail';
  };

  // Special layout for ROLLING_LOAD (Vehicle scales / Weighbridges)
  if (profile === 'ROLLING_LOAD') {
    return (
      <div className="bg-slate-900 rounded-xl p-6 text-white border border-slate-800 space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          <Truck className="w-5 h-5 text-teal-400 shrink-0" />
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400">
              Eccentricity Test — Rolling Load Procedure (OIML R 76-1 §3.6.2.2)
            </h4>
            <p className="text-xs font-medium text-slate-300">
              Vehicle scales / weighbridges use a concentrated rolling axle load (~0.8 × Max).
            </p>
          </div>
        </div>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-slate-400 text-xs">
            <Info className="w-5 h-5 text-teal-400 shrink-0" />
            <span>
              Select an axle test position on the platform to enter recorded readings for approach, middle, and exit axles.
            </span>
          </div>
          <div className="flex gap-2 shrink-0">
            {positions.map((pos) => {
              const status = getPositionStatus(pos.id);
              const isSelected = currentPosition === pos.id;

              let btnClass = 'bg-slate-800 text-slate-400 border-slate-700';
              if (status === 'current') btnClass = 'bg-teal-600 text-white border-teal-400 ring-2 ring-teal-400';
              else if (status === 'pass') btnClass = 'bg-emerald-950 text-emerald-300 border-emerald-600';
              else if (status === 'fail') btnClass = 'bg-amber-950 text-amber-300 border-amber-600';

              return (
                <button
                  key={pos.id}
                  type="button"
                  onClick={() => onSelectPosition(pos.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${btnClass} ${
                    isSelected ? 'ring-2 ring-white scale-105' : ''
                  }`}
                >
                  Pos {pos.id}: {pos.shortLabel}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Position class mapping for standard 4-quadrant receptor
  const getQuadrantPositionClass = (quadrant?: string) => {
    switch (quadrant) {
      case 'FL':
        return 'top-6 left-6';
      case 'FR':
        return 'top-6 right-6';
      case 'RL':
        return 'bottom-6 left-6';
      case 'RR':
        return 'bottom-6 right-6';
      default:
        return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
    }
  };

  return (
    <div className="bg-slate-900 rounded-xl p-6 text-white border border-slate-800 space-y-4">
      {/* Header & Helper Text */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-teal-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400">
              Eccentricity Test (Top-Down Platform Diagram)
            </h4>
          </div>
          <p className="text-xs font-medium text-slate-200">
            “Place the same reference test load at each marked quadrant on the weighing receptor and enter the displayed scale reading.”
          </p>
          <p className="text-[11px] text-slate-400 italic">
            ℹ {OIML_ENGINE_NOTICE}
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[10px] font-semibold shrink-0 flex-wrap">
          <span className="flex items-center gap-1 text-teal-400">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse" /> Active Position
          </span>
          <span className="flex items-center gap-1 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Within MPE
          </span>
          <span className="flex items-center gap-1 text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Exceeds MPE
          </span>
          <span className="flex items-center gap-1 text-slate-500">
            <Circle className="w-3.5 h-3.5 text-slate-500" /> Pending
          </span>
        </div>
      </div>

      {/* Visual Pan Diagram */}
      <div className="relative w-full max-w-md mx-auto aspect-4/3 bg-slate-950 rounded-xl border-2 border-slate-800 shadow-inner p-4 flex items-center justify-center">
        {/* Subtle grid lines dividing 4 quadrants */}
        <div className="absolute inset-4 border border-dashed border-slate-800 rounded-lg pointer-events-none" />
        <div className="absolute inset-y-4 left-1/2 -translate-x-1/2 w-px border-r border-dashed border-slate-800 pointer-events-none" />
        <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-px border-b border-dashed border-slate-800 pointer-events-none" />

        {/* Quadrant Labels Background */}
        <div className="absolute top-2 left-3 text-[9px] font-mono text-slate-700 uppercase">Front-Left</div>
        <div className="absolute top-2 right-3 text-[9px] font-mono text-slate-700 uppercase">Front-Right</div>
        <div className="absolute bottom-2 left-3 text-[9px] font-mono text-slate-700 uppercase">Rear-Left</div>
        <div className="absolute bottom-2 right-3 text-[9px] font-mono text-slate-700 uppercase">Rear-Right</div>

        {/* Position Hotspots */}
        {positions.map((pos) => {
          const status = getPositionStatus(pos.id);
          const isSelected = currentPosition === pos.id;
          const posClass = profile === 'STANDARD_UP_TO_4_SUPPORTS'
            ? getQuadrantPositionClass(pos.quadrant)
            : 'relative m-1';

          let btnClass = 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700';
          let StatusIcon = Circle;

          if (status === 'current') {
            btnClass = 'bg-teal-600 text-white border-teal-400 ring-4 ring-teal-500/30 shadow-lg scale-105';
          } else if (status === 'pass') {
            btnClass = 'bg-emerald-950 text-emerald-300 border-emerald-600 hover:bg-emerald-900';
            StatusIcon = CheckCircle2;
          } else if (status === 'fail') {
            btnClass = 'bg-amber-950 text-amber-300 border-amber-600 hover:bg-amber-900';
            StatusIcon = AlertTriangle;
          }

          return (
            <button
              key={pos.id}
              type="button"
              onClick={() => onSelectPosition(pos.id)}
              className={`absolute ${posClass} flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all cursor-pointer ${btnClass} ${
                isSelected ? 'ring-2 ring-white z-10 scale-105' : ''
              }`}
            >
              <div className="flex items-center gap-1 text-[11px] font-bold">
                <StatusIcon className="w-3.5 h-3.5 shrink-0" />
                <span>Pos {pos.id}</span>
              </div>
              <span className="text-[10px] font-medium opacity-80 mt-0.5">{pos.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
