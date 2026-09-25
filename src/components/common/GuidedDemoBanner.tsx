import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, X, Award, ChevronRight } from 'lucide-react';

interface GuidedDemoBannerProps {
  currentStep?: number; // 1 to 10
  onClose: () => void;
}

export const GuidedDemoBanner: React.FC<GuidedDemoBannerProps> = ({ currentStep = 1, onClose }) => {
  const navigate = useNavigate();

  const demoSteps = [
    { num: 1, title: '1. Instrument', route: '/instruments/INS-2026-001' },
    { num: 2, title: '2. Test Plan', route: '/test-sessions/TS-2026-101' },
    { num: 3, title: '3. Accuracy', route: '/test-sessions/TS-2026-101' },
    { num: 4, title: '4. Repeatability', route: '/test-sessions/TS-2026-101' },
    { num: 5, title: '5. Eccentricity', route: '/test-sessions/TS-2026-101' },
    { num: 6, title: '6. Discrimination', route: '/test-sessions/TS-2026-101' },
    { num: 7, title: '7. Zero Setting', route: '/test-sessions/TS-2026-101' },
    { num: 8, title: '8. Tare Test', route: '/test-sessions/TS-2026-101' },
    { num: 9, title: '9. Review Queue', route: '/test-sessions/TS-2026-101' },
    { num: 10, title: '10. Certificate & QR', route: '/reports/REP-2026-001' },
  ];

  return (
    <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-slate-950 text-white p-4 rounded-xl border border-teal-500/40 shadow-xl space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-xs">
          <Award className="w-4 h-4 text-teal-400" />
          <span className="text-teal-400 uppercase tracking-wider">SIH 2026 Guided Metrology Evaluator Scenario</span>
          <span className="bg-teal-900/80 text-teal-300 text-[10px] px-2 py-0.5 rounded border border-teal-700/50">
            MetriScale Pro 500 (Class III, Max 30kg, e=5g)
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded transition-colors"
          title="Exit Guided Demo"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 10-Step Progress Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-1.5 text-xs font-semibold select-none">
        {demoSteps.map((st) => {
          const isActive = currentStep === st.num;
          const isCompleted = currentStep > st.num;

          return (
            <button
              key={st.num}
              onClick={() => navigate(st.route)}
              className={`p-1.5 rounded-lg text-left transition-all ${
                isActive
                  ? 'bg-teal-600 text-white shadow-md ring-2 ring-teal-400 font-extrabold scale-105'
                  : isCompleted
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/80'
                  : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center justify-between text-[9px] opacity-80">
                <span>Step {st.num}</span>
                {isCompleted && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />}
              </div>
              <span className="text-[11px] truncate block mt-0.5">{st.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
