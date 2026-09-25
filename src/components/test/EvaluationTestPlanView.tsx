import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Pencil,
  FileCheck2,
  Info,
  Check,
  UserCheck,
  Award,
} from 'lucide-react';
import {
  TestSession,
  TestPlanItem,
  ApplicabilityStatus,
  TestCategory,
  AdministrativeChecklistItem,
  UserRole,
} from '../../types';
import {
  CATEGORY_LABELS,
  overrideTestApplicability,
  generateRecommendedTestPlan,
} from '../../services/testPlanService';
import { Modal } from '../common/Modal';
import { useToast } from '../common/Toast';

interface EvaluationTestPlanViewProps {
  session: TestSession;
  activeRole: UserRole;
  onUpdateSession: (updatedSession: TestSession) => void;
  isReadOnly?: boolean;
}

export const EvaluationTestPlanView: React.FC<EvaluationTestPlanViewProps> = ({
  session,
  activeRole,
  onUpdateSession,
  isReadOnly = false,
}) => {
  const { showToast } = useToast();

  // Selected test plan or generated fallback
  const testPlan: TestPlanItem[] =
    session.testPlan && session.testPlan.length > 0
      ? session.testPlan
      : generateRecommendedTestPlan(session as any, session.testContext || 'TYPE_EXAMINATION');

  const adminChecklist: AdministrativeChecklistItem[] = session.administrativeChecklist || [];

  // Override Modal state
  const [overrideModalTest, setOverrideModalTest] = useState<TestPlanItem | null>(null);
  const [targetStatus, setTargetStatus] = useState<ApplicabilityStatus>('APPLICABLE');
  const [overrideReasonInput, setOverrideReasonInput] = useState('');

  // Handle Admin Checklist toggle
  const handleToggleChecklistItem = (itemId: string) => {
    if (isReadOnly) return;

    const updatedChecklist = adminChecklist.map((item) => {
      if (item.id === itemId) {
        return { ...item, completed: !item.completed };
      }
      return item;
    });

    const updatedSession = {
      ...session,
      administrativeChecklist: updatedChecklist,
    };
    onUpdateSession(updatedSession);
  };

  // Open Override Modal
  const handleOpenOverride = (item: TestPlanItem) => {
    if (isReadOnly) return;
    setOverrideModalTest(item);
    setTargetStatus(item.status === 'APPLICABLE' ? 'NOT_APPLICABLE' : 'APPLICABLE');
    setOverrideReasonInput('');
  };

  // Submit Override
  const handleSaveOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideModalTest) return;

    if (!overrideReasonInput.trim()) {
      showToast('Reason Required', 'Please provide a clear reason for overriding the recommended test status.', 'warning');
      return;
    }

    const userName = activeRole === 'Testing Officer' ? 'Dr. Ananya Rao' : activeRole === 'Technical Reviewer' ? 'Vikramaditya Verma' : 'Dr. K. S. Murthy';

    const isSelected = targetStatus === 'APPLICABLE';
    const updatedPlan = overrideTestApplicability(
      testPlan,
      overrideModalTest.id,
      targetStatus,
      isSelected,
      overrideReasonInput,
      userName
    );

    const updatedSession = {
      ...session,
      testPlan: updatedPlan,
    };

    onUpdateSession(updatedSession);
    setOverrideModalTest(null);
    showToast(
      'Test Plan Updated',
      `Updated ${overrideModalTest.name} to ${targetStatus === 'APPLICABLE' ? 'Applicable' : 'Not Applicable'}.`,
      'info'
    );
  };

  // Confirm Test Plan
  const handleConfirmTestPlan = () => {
    const userName = activeRole === 'Testing Officer' ? 'Dr. Ananya Rao' : activeRole === 'Technical Reviewer' ? 'Vikramaditya Verma' : 'Dr. K. S. Murthy';
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);

    const updatedSession = {
      ...session,
      testPlan,
      testPlanConfirmed: true,
      testPlanConfirmedBy: userName,
      testPlanConfirmedAt: now,
    };

    onUpdateSession(updatedSession);
    showToast('Test Plan Confirmed', `Test plan confirmed by ${userName}.`, 'success');
  };

  // Reset to Engine Recommendation
  const handleResetToEngine = () => {
    const recommended = generateRecommendedTestPlan(session as any, session.testContext || 'TYPE_EXAMINATION');
    const updatedSession = {
      ...session,
      testPlan: recommended,
      testPlanConfirmed: false,
    };
    onUpdateSession(updatedSession);
    showToast('Reset Complete', 'Restored OIML R 76 engine recommended test plan.', 'info');
  };

  // Group by Category
  const categories: TestCategory[] = ['ADMINISTRATIVE', 'METROLOGICAL', 'INFLUENCE', 'DISTURBANCE', 'STABILITY'];

  return (
    <div className="space-y-6">
      {/* Top Banner & Action Controls */}
      <div className="p-5 bg-gradient-to-r from-slate-900 to-teal-950 text-white rounded-xl shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-teal-400" />
              <h3 className="text-base font-extrabold text-white tracking-tight">
                OIML R 76 Evaluation Test Plan & Applicability Engine
              </h3>
            </div>
            <p className="text-xs text-slate-300">
              Context:{' '}
              <span className="font-bold text-teal-300">
                {session.testContext === 'TYPE_EXAMINATION'
                  ? 'Type Examination (OIML R 76-1 Clause 3 & 5)'
                  : session.testContext === 'INITIAL_VERIFICATION'
                  ? 'Initial Verification (Annex A)'
                  : 'In-Service Inspection'}
              </span>{' '}
              • Instrument: <span className="font-mono text-slate-100 font-bold">{session.instrumentModel}</span>
            </p>
          </div>

          {!isReadOnly && (
            <div className="flex items-center gap-2.5">
              <button
                onClick={handleResetToEngine}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                title="Restore original engine recommendations"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" /> Reset to Recommended
              </button>
              <button
                onClick={handleConfirmTestPlan}
                className={`px-4 py-2 text-xs font-extrabold rounded-lg shadow-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  session.testPlanConfirmed
                    ? 'bg-emerald-600 text-white border border-emerald-500'
                    : 'bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                {session.testPlanConfirmed ? '✓ Test Plan Confirmed' : 'Confirm Test Plan'}
              </button>
            </div>
          )}
        </div>

        {session.testPlanConfirmed && (
          <div className="p-2.5 bg-emerald-950/80 border border-emerald-700/60 rounded-lg text-xs text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Test Plan officially confirmed by <strong className="text-white">{session.testPlanConfirmedBy}</strong> on{' '}
              <span className="font-mono">{session.testPlanConfirmedAt}</span>.
            </span>
          </div>
        )}
      </div>

      {/* SECTION 1: ADMINISTRATIVE EXAMINATION CHECKLIST (OIML R 76 Annex A) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-teal-600" />
            <div>
              <h4 className="text-sm font-extrabold text-slate-900">
                1. Administrative Examination (OIML R 76 Annex A §A.1 – A.3)
              </h4>
              <p className="text-xs text-slate-500">
                Documentation capture, descriptive markings, and physical stamping arrangements.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200 font-mono">
            {adminChecklist.filter((i) => i.completed).length} of {adminChecklist.length} Verified
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {adminChecklist.map((item) => (
            <div
              key={item.id}
              onClick={() => handleToggleChecklistItem(item.id)}
              className={`p-3 rounded-xl border transition-all flex items-start gap-3 cursor-pointer select-none ${
                item.completed
                  ? 'bg-slate-50/90 border-slate-200 hover:border-slate-300'
                  : 'bg-amber-50/40 border-amber-200 hover:border-amber-300'
              }`}
            >
              <div
                className={`w-5 h-5 rounded mt-0.5 flex items-center justify-center shrink-0 transition-colors ${
                  item.completed ? 'bg-teal-600 text-white' : 'border-2 border-slate-300 bg-white'
                }`}
              >
                {item.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-bold ${item.completed ? 'text-slate-900' : 'text-slate-700'}`}>
                    {item.label}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                    {item.clause}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 italic">{item.notes}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2 - 5: TEST PLAN CATEGORIES & APPLICABILITY CARDS */}
      {categories.slice(1).map((catKey) => {
        const catInfo = CATEGORY_LABELS[catKey];
        const items = testPlan.filter((item) => item.category === catKey);
        if (items.length === 0) return null;

        return (
          <div key={catKey} className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h4 className="text-sm font-extrabold text-slate-900">{catInfo.label}</h4>
              <p className="text-xs text-slate-500">{catInfo.description}</p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition-all space-y-3 ${
                    item.status === 'APPLICABLE'
                      ? 'bg-white border-slate-200 hover:border-teal-300 shadow-xs'
                      : item.status === 'NOT_APPLICABLE'
                      ? 'bg-slate-50/80 border-slate-200 text-slate-600'
                      : 'bg-amber-50/50 border-amber-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h5 className="text-xs font-extrabold text-slate-900">{item.name}</h5>
                        <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded font-semibold">
                          {item.ruleReference}
                        </span>
                        {item.decisionSource === 'MANUAL_OVERRIDE' && (
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            ✎ Manual Override
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Status Badge */}
                      {item.status === 'APPLICABLE' && (
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 font-extrabold text-xs rounded-lg flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> APPLICABLE
                        </span>
                      )}
                      {item.status === 'NOT_APPLICABLE' && (
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 border border-slate-300 font-extrabold text-xs rounded-lg flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5 text-slate-400" /> NOT APPLICABLE
                        </span>
                      )}
                      {item.status === 'REQUIRES_LAB_CONFIRMATION' && (
                        <span className="px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-xs rounded-lg flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> REQUIRES CONFIRMATION
                        </span>
                      )}

                      {!isReadOnly && (
                        <button
                          onClick={() => handleOpenOverride(item)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors border border-slate-200 flex items-center gap-1 cursor-pointer"
                        >
                          <Pencil className="w-3 h-3 text-slate-500" /> Override
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Rule Explanation */}
                  <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-100 text-xs text-slate-700 space-y-1">
                    <span className="font-bold text-slate-900 block text-[11px] uppercase tracking-wider">
                      Why is this test included / excluded?
                    </span>
                    <p className="text-slate-600 leading-relaxed">{item.reason}</p>

                    {item.decisionSource === 'MANUAL_OVERRIDE' && item.overriddenBy && (
                      <div className="pt-1 text-[11px] text-indigo-700 border-t border-slate-200/60 mt-1 font-mono">
                        Overridden by <strong>{item.overriddenBy}</strong> on {item.overriddenAt}: "{item.overrideReason}"
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* MANUAL OVERRIDE MODAL */}
      <Modal
        isOpen={overrideModalTest !== null}
        onClose={() => setOverrideModalTest(null)}
        title={`Override Test Applicability: ${overrideModalTest?.name}`}
        subtitle="Manually update recommendation and document official justification for audit records."
        maxWidth="md"
      >
        {overrideModalTest && (
          <form onSubmit={handleSaveOverride} className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <span className="font-bold text-slate-900">Current OIML Engine Recommendation:</span>
              <p className="text-slate-600">{overrideModalTest.reason}</p>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-900 block">Select New Status:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTargetStatus('APPLICABLE')}
                  className={`p-2.5 rounded-lg border text-xs font-bold transition-all ${
                    targetStatus === 'APPLICABLE'
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                      : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  ✓ APPLICABLE
                </button>
                <button
                  type="button"
                  onClick={() => setTargetStatus('NOT_APPLICABLE')}
                  className={`p-2.5 rounded-lg border text-xs font-bold transition-all ${
                    targetStatus === 'NOT_APPLICABLE'
                      ? 'bg-slate-800 text-white border-slate-900 shadow-sm'
                      : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  🚫 NOT APPLICABLE
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-900 block">
                Override Justification / Reason <span className="text-rose-500">*</span>:
              </label>
              <textarea
                value={overrideReasonInput}
                onChange={(e) => setOverrideReasonInput(e.target.value)}
                placeholder="Enter regulatory or technical justification for overriding engine recommendation..."
                className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 text-slate-900 font-sans"
                rows={3}
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setOverrideModalTest(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-extrabold rounded-lg shadow-md"
              >
                Save Override & Update Plan
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
