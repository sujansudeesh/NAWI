import React from 'react';
import {
  Zap,
  ShieldAlert,
  Radio,
  BatteryCharging,
  Sliders,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Layers,
} from 'lucide-react';
import { TestSession, UserRole, TestPlanItem } from '../../types';
import { generateRecommendedTestPlan } from '../../services/testPlanService';

interface DisturbanceModulesViewProps {
  session: TestSession;
  activeRole: UserRole;
  isReadOnly?: boolean;
}

interface DisturbanceModuleMeta {
  id: string;
  name: string;
  clause: string;
  category: 'INFLUENCE' | 'DISTURBANCE' | 'STABILITY';
  description: string;
  testParamsSummary: string;
  icon: React.ReactNode;
}

const DISTURBANCE_MODULE_METAS: DisturbanceModuleMeta[] = [
  {
    id: 'dampHeat',
    name: 'Damp Heat, Steady State Test',
    clause: 'OIML R 76-1 Clause 5.3.3 / A.5.3.3',
    category: 'INFLUENCE',
    description: 'Exposes electronic NAWI to +40 °C at 85% relative humidity for 2 days to evaluate humidity degradation.',
    testParamsSummary: '+40 °C, 85% RH, 48 Hours Soak Time',
    icon: <Radio className="w-5 h-5 text-indigo-600" />,
  },
  {
    id: 'voltageVariation',
    name: 'AC / DC Voltage Variation Test',
    clause: 'OIML R 76-1 Clause 5.4.1 / A.5.4.1',
    category: 'DISTURBANCE',
    description: 'Varies AC mains supply voltage between +10% and -15% of nominal voltage Unom during weighing.',
    testParamsSummary: '0.85 Unom to 1.10 Unom',
    icon: <Zap className="w-5 h-5 text-amber-600" />,
  },
  {
    id: 'voltageDips',
    name: 'Voltage Dips & Short Interruptions',
    clause: 'OIML R 76-1 Clause 5.4.1 / A.5.4.2',
    category: 'DISTURBANCE',
    description: 'Applies short power line dips (100% reduction for 0.5 cycle, 50% for 1 cycle, 20% for 10 cycles).',
    testParamsSummary: '100%, 50%, 20% Dips at 50/60 Hz',
    icon: <BatteryCharging className="w-5 h-5 text-rose-600" />,
  },
  {
    id: 'acBursts',
    name: 'Electrical Fast Transients / Bursts',
    clause: 'OIML R 76-1 Clause 5.4.2 / A.5.4.3',
    category: 'DISTURBANCE',
    description: 'Applies fast transient bursts to AC/DC power supply and I/O signal lines.',
    testParamsSummary: '1 kV Power Lines, 0.5 kV I/O Lines',
    icon: <Zap className="w-5 h-5 text-purple-600" />,
  },
  {
    id: 'electrostaticDischarge',
    name: 'Electrostatic Discharge (ESD)',
    clause: 'OIML R 76-1 Clause 5.4.3 / A.5.4.4',
    category: 'DISTURBANCE',
    description: 'Applies direct and indirect electrostatic discharges to operator accessible surfaces.',
    testParamsSummary: '6 kV Contact Discharge, 8 kV Air Discharge',
    icon: <ShieldAlert className="w-5 h-5 text-blue-600" />,
  },
  {
    id: 'surgeImmunity',
    name: 'Surge Immunity Test',
    clause: 'OIML R 76-1 Clause 5.4.4 / A.5.4.5',
    category: 'DISTURBANCE',
    description: 'Evaluates power line surge withstand capability during high voltage switching transients.',
    testParamsSummary: '1 kV Line-to-Line, 2 kV Line-to-Ground',
    icon: <Zap className="w-5 h-5 text-orange-600" />,
  },
  {
    id: 'radiatedRf',
    name: 'Radiated Electromagnetic Fields Immunity',
    clause: 'OIML R 76-1 Clause 5.4.5 / A.5.4.6',
    category: 'DISTURBANCE',
    description: 'Exposes electronic weighing scale to radiated RF fields from 80 MHz to 2000 MHz.',
    testParamsSummary: '80 MHz – 2000 MHz at 10 V/m Field Strength',
    icon: <Radio className="w-5 h-5 text-teal-600" />,
  },
  {
    id: 'conductedRf',
    name: 'Conducted Radio-Frequency Fields Immunity',
    clause: 'OIML R 76-1 Clause 5.4.6 / A.5.4.7',
    category: 'DISTURBANCE',
    description: 'Injects RF currents into power and data signal cables from 150 kHz to 80 MHz.',
    testParamsSummary: '150 kHz – 80 MHz at 10 V RMS',
    icon: <Radio className="w-5 h-5 text-cyan-600" />,
  },
  {
    id: 'vehiclePowerDisturbance',
    name: 'Road Vehicle Power Supply Disturbances',
    clause: 'OIML R 76-1 Clause 5.4.7 / A.5.4.8',
    category: 'DISTURBANCE',
    description: 'Simulates vehicle battery supply voltage transients, load dumps, and cranking dips for mobile scales.',
    testParamsSummary: '12 V / 24 V DC ISO 7637 Pulses',
    icon: <BatteryCharging className="w-5 h-5 text-emerald-600" />,
  },
  {
    id: 'spanStability',
    name: '28-Day Span Stability Logging',
    clause: 'OIML R 76-1 Clause 5.3.2 / A.5.2',
    category: 'STABILITY',
    description: 'Performs 28-day environmental chamber span logging to verify long-term metrological drift stability.',
    testParamsSummary: '28-Day Logging Protocol, Half Max Load',
    icon: <Sliders className="w-5 h-5 text-slate-700" />,
  },
];

export const DisturbanceModulesView: React.FC<DisturbanceModulesViewProps> = ({
  session,
}) => {
  const planItems: TestPlanItem[] =
    session.testPlan && session.testPlan.length > 0
      ? session.testPlan
      : generateRecommendedTestPlan(session as any, session.testContext || 'TYPE_EXAMINATION');

  return (
    <div className="space-y-6 text-xs">
      {/* Top Banner */}
      <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl shadow-md space-y-2">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-teal-400" />
          <h3 className="text-base font-extrabold text-white">
            OIML R 76-1:2006 Influence, Electronic & Disturbance Test Framework
          </h3>
        </div>
        <p className="text-xs text-slate-300">
          Structured observation schemas and test equipment integration framework for electronic NAWI performance testing (Clause 5.3, 5.4 & Annex A.5).
        </p>
      </div>

      {/* Grid of Disturbance & Electronic Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DISTURBANCE_MODULE_METAS.map((mod) => {
          const planItem = planItems.find((p) => p.id === mod.id);
          const isApplicable = planItem ? planItem.status === 'APPLICABLE' : session.testContext === 'TYPE_EXAMINATION';
          const isRequiresConfirmation = planItem?.status === 'REQUIRES_LAB_CONFIRMATION';

          return (
            <div
              key={mod.id}
              className={`p-4 rounded-xl border space-y-3 transition-all ${
                isApplicable
                  ? 'bg-white border-slate-200 shadow-xs hover:border-slate-300'
                  : 'bg-slate-50/70 border-slate-200 text-slate-600'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="p-2 bg-slate-100 rounded-lg shrink-0 mt-0.5">{mod.icon}</div>
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-extrabold text-slate-900">{mod.name}</h4>
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-semibold">
                      {mod.clause}
                    </span>
                  </div>
                </div>

                <div>
                  {isApplicable ? (
                    <span className="px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-300 font-extrabold text-[10px] rounded-lg flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3 text-amber-600" /> RULE ENGINE PENDING
                    </span>
                  ) : isRequiresConfirmation ? (
                    <span className="px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-[10px] rounded-lg flex items-center gap-1 shrink-0">
                      <AlertTriangle className="w-3 h-3 text-amber-600" /> REQUIRES CONFIRMATION
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-600 border border-slate-300 font-extrabold text-[10px] rounded-lg flex items-center gap-1 shrink-0">
                      <XCircle className="w-3 h-3 text-slate-400" /> NOT APPLICABLE
                    </span>
                  )}
                </div>
              </div>

              <p className="text-slate-600 text-[11px] leading-relaxed">{mod.description}</p>

              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-500 font-sans">Parameters:</span>
                <span className="font-bold text-slate-800">{mod.testParamsSummary}</span>
              </div>

              {/* Status Banner */}
              {isApplicable ? (
                <div className="p-2.5 bg-amber-50/80 border border-amber-200/80 rounded-lg text-[11px] text-amber-900 flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Workflow prepared — verified rule engine pending.</strong> Structured schema registered. Official laboratory test chamber interface pending.
                  </span>
                </div>
              ) : (
                <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-lg text-[11px] text-slate-600 flex items-center gap-2">
                  <Info className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{planItem?.reason || 'Not applicable for this verification context or instrument characteristics.'}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
