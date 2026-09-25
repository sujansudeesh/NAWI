import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  PlayCircle,
  RotateCcw,
  FileText,
  Clock,
  AlertTriangle,
  ChevronRight,
  FileCheck2,
  Award,
  Server,
  ShieldCheck,
} from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { resetGuidedDemoSession } from '../mock/store';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { GuidedDemoBanner } from '../components/common/GuidedDemoBanner';
import { GuidedDemoIntroModal } from '../components/common/GuidedDemoIntroModal';
import { SystemArchitectureModal } from '../components/common/SystemArchitectureModal';
import { DemoReadinessModal } from '../components/common/DemoReadinessModal';
import { StartTestWizardModal } from '../components/test/StartTestWizardModal';
import { authService } from '../services/authService';
import { User, TestSession, Report } from '../types';
import { useToast } from '../components/common/Toast';
import { testSessionService } from '../services/testSessionService';
import { reportService } from '../services/reportService';
import { calculateSessionProgress } from '../services/evaluationResultService';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [testSessions, setTestSessions] = useState<TestSession[]>(() => testSessionService.getAllSessions());
  const [reports, setReports] = useState<Report[]>([]);
  const [authUser, setAuthUser] = useState<User | null>(null);

  const [showDemoBanner, setShowDemoBanner] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isDemoIntroOpen, setIsDemoIntroOpen] = useState(false);
  const [isArchitectureOpen, setIsArchitectureOpen] = useState(false);
  const [isReadinessOpen, setIsReadinessOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const handleSync = async () => {
      const user = await authService.getCurrentUser();
      if (isMounted && user) {
        setAuthUser(user);
      }
      const fetchedSessions = await testSessionService.getAllSessionsAsync();
      const fetchedReports = await reportService.getReports();
      if (isMounted) {
        setTestSessions(fetchedSessions);
        setReports(fetchedReports);
      }
    };

    handleSync();

    const unsubscribe = authService.onAuthStateChange((user) => {
      if (isMounted) {
        setAuthUser(user);
      }
    });

    window.addEventListener('nawi_session_updated', handleSync);
    return () => {
      isMounted = false;
      unsubscribe();
      window.removeEventListener('nawi_session_updated', handleSync);
    };
  }, []);

  // Active in-progress session for "Continue Where You Left Off"
  const activeSession = testSessions.find((s) => s.workflowStatus === 'IN_PROGRESS' || s.workflowStatus === 'DRAFT' || s.status === 'In Progress') || testSessions[0];

  const ongoingCount = testSessions.filter((s) => s.workflowStatus === 'DRAFT' || s.workflowStatus === 'IN_PROGRESS' || s.workflowStatus === 'TESTING_COMPLETE').length;
  const needsReviewCount = testSessions.filter((s) => s.workflowStatus === 'UNDER_REVIEW').length;
  const issuesCount = testSessions.filter((s) => s.workflowStatus === 'CHANGES_REQUESTED').length;
  const awaitingApprovalCount = testSessions.filter((s) => s.workflowStatus === 'TECHNICALLY_APPROVED' || s.workflowStatus === 'APPROVED').length;

  const complianceData = [
    { name: 'Compliant', value: testSessions.filter(s => s.overallEvaluationResult === 'COMPLIANT' || s.overallVerdict === 'Compliant').length || 1, color: '#10b981' },
    { name: 'Under Evaluation', value: testSessions.filter(s => s.overallEvaluationResult === 'UNDER_EVALUATION' || s.overallVerdict === 'Under Evaluation' || !s.overallVerdict).length || 1, color: '#f59e0b' },
    { name: 'Non-Compliant', value: testSessions.filter(s => s.overallEvaluationResult === 'NON_COMPLIANT' || s.overallVerdict === 'Non-Compliant').length || 0, color: '#f43f5e' },
  ];

  const testingStages = [
    { label: 'Registered', count: testSessions.length + 5 },
    { label: 'Testing', count: ongoingCount },
    { label: 'Technical Review', count: needsReviewCount },
    { label: 'Approval', count: awaitingApprovalCount },
    { label: 'Completed', count: reports.filter((r) => r.status === 'Finalized').length },
  ];

  const completedReports = reports.filter((r) => r.status === 'Finalized').slice(0, 3);

  const handleStartGuidedDemo = () => {
    resetGuidedDemoSession();
    setShowDemoBanner(true);
    showToast('Guided SIH Demo Started', 'Reset demo session TS-2026-101 (MetriScale Pro 500) to clean state.', 'info');
    navigate('/test-sessions/TS-2026-101');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      {/* GUIDED SIH DEMO BANNER (If active) */}
      {showDemoBanner && (
        <GuidedDemoBanner currentStep={1} onClose={() => setShowDemoBanner(false)} />
      )}

      {/* 1. TOP WELCOME AREA + 4 QUICK ACTION BUTTONS */}
      <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Good Morning, {authUser?.name || 'Metrology Officer'}
            </h2>
            <p className="text-xs text-slate-600 mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
              Role: <span className="font-bold text-slate-900">{authUser?.role || 'TESTING_OFFICER'}</span> • Organization: <span className="font-bold text-slate-900">{authUser?.department || 'National Legal Metrology Laboratory'}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              onClick={() => setIsArchitectureOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 transition-colors cursor-pointer"
              title="View technical architecture and security stack"
            >
              <Server className="w-3.5 h-3.5 text-slate-600" />
              <span>Architecture</span>
            </button>

            <button
              onClick={() => setIsReadinessOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 transition-colors cursor-pointer"
              title="Run automated system diagnostics before presentation"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
              <span>Readiness</span>
            </button>

            <button
              onClick={() => setIsDemoIntroOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-700 to-teal-900 hover:from-teal-800 hover:to-slate-950 text-white font-extrabold text-xs rounded-xl shadow-md transition-all hover:scale-[1.01] shrink-0 cursor-pointer"
            >
              <Award className="w-4 h-4 text-teal-300" />
              <span>▶ START SIH DEMO</span>
            </button>
          </div>
        </div>

        {/* 4 Clear Quick Action Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {/* Start New Test (Strongest Primary) */}
          <button
            onClick={() => setIsWizardOpen(true)}
            className="flex items-center justify-center gap-2 p-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md shadow-teal-900/20 transition-all hover:scale-[1.01]"
          >
            <PlayCircle className="w-4 h-4 shrink-0" />
            <span>▶ Start New Test</span>
          </button>

          {/* Resume Test (Secondary Strong) */}
          {activeSession && (
            <Link
              to={`/test-sessions/${activeSession.id}`}
              className="flex items-center justify-center gap-2 p-3.5 bg-slate-900 hover:bg-slate-800 text-teal-400 font-bold text-xs rounded-xl shadow-xs transition-all hover:scale-[1.01]"
            >
              <RotateCcw className="w-4 h-4 shrink-0 text-teal-400" />
              <span>↻ Resume Test</span>
            </Link>
          )}

          {/* Register Instrument */}
          <Link
            to="/instruments/new"
            className="flex items-center justify-center gap-2 p-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl border border-slate-200 transition-all"
          >
            <Plus className="w-4 h-4 shrink-0 text-slate-600" />
            <span>+ Register Instrument</span>
          </Link>

          {/* View Reports */}
          <Link
            to="/reports"
            className="flex items-center justify-center gap-2 p-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl border border-slate-200 transition-all"
          >
            <FileText className="w-4 h-4 shrink-0 text-slate-600" />
            <span>▣ View Reports</span>
          </Link>
        </div>
      </div>

      {/* 2. CONTINUE WHERE YOU LEFT OFF (Highlighted Card near Top) */}
      {activeSession && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 text-white p-6 rounded-xl border border-slate-800 shadow-md relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(#14b8a6_1px,transparent_1px)] [background-size:12px_12px] opacity-10 pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                <RotateCcw className="w-3 h-3" /> CONTINUE WHERE YOU LEFT OFF
              </span>
              <div>
                <h3 className="text-lg font-extrabold text-white tracking-tight">{activeSession.instrumentModel}</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Test ID: <span className="text-slate-200 font-bold">{activeSession.id}</span> • S/N:{' '}
                  <span className="text-slate-200">{activeSession.serialNumber}</span>
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs pt-1">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block font-semibold">Current Step</span>
                  <span className="font-bold text-teal-300">Eccentricity Test</span>
                </div>
                <div className="h-6 w-px bg-slate-800" />
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block font-semibold">Completion</span>
                  <span className="font-bold text-white">
                    {calculateSessionProgress(activeSession).completedCount} of {calculateSessionProgress(activeSession).totalCount} tests completed ({calculateSessionProgress(activeSession).progressPercentage}%)
                  </span>
                </div>
                <div className="h-6 w-px bg-slate-800 hidden sm:block" />
                <div className="hidden sm:block">
                  <span className="text-[10px] text-slate-400 uppercase block font-semibold">Last Saved</span>
                  <span className="text-slate-300">Recently</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate(`/test-sessions/${activeSession.id}`)}
              className="px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <span>Continue Testing</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 3. MY WORK TODAY (4 Clickable Summary Cards) */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">My Work Today</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Ongoing Tests */}
          <div
            onClick={() => navigate('/test-sessions')}
            className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-teal-500/60 cursor-pointer transition-all group flex items-center justify-between"
          >
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-500 block">Ongoing Tests</span>
              <span className="text-2xl font-extrabold text-slate-900 block">{ongoingCount}</span>
              <span className="text-[11px] font-semibold text-teal-600 group-hover:underline flex items-center gap-1">
                View List <ChevronRight className="w-3 h-3" />
              </span>
            </div>
            <div className="p-3 rounded-lg bg-sky-50 text-sky-700 border border-sky-100">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          {/* Card 2: Needs Review */}
          <div
            onClick={() => navigate('/test-sessions?status=UNDER_REVIEW')}
            className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-amber-500/60 cursor-pointer transition-all group flex items-center justify-between"
          >
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-500 block">Needs Review</span>
              <span className="text-2xl font-extrabold text-slate-900 block">{needsReviewCount}</span>
              <span className="text-[11px] font-semibold text-amber-600 group-hover:underline flex items-center gap-1">
                View Queue <ChevronRight className="w-3 h-3" />
              </span>
            </div>
            <div className="p-3 rounded-lg bg-amber-50 text-amber-700 border border-amber-100">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>

          {/* Card 3: Issues to Correct */}
          <div
            onClick={() => navigate('/test-sessions?status=CHANGES_REQUESTED')}
            className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-rose-500/60 cursor-pointer transition-all group flex items-center justify-between"
          >
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-500 block">Issues to Correct</span>
              <span className="text-2xl font-extrabold text-rose-600 block">{issuesCount}</span>
              <span className="text-[11px] font-semibold text-rose-600 group-hover:underline flex items-center gap-1">
                Fix Issue <ChevronRight className="w-3 h-3" />
              </span>
            </div>
            <div className="p-3 rounded-lg bg-rose-50 text-rose-700 border border-rose-100">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>

          {/* Card 4: Reports Awaiting Approval */}
          <div
            onClick={() => navigate('/reports')}
            className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-teal-500/60 cursor-pointer transition-all group flex items-center justify-between"
          >
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-500 block">Reports Awaiting Approval</span>
              <span className="text-2xl font-extrabold text-slate-900 block">{awaitingApprovalCount}</span>
              <span className="text-[11px] font-semibold text-teal-600 group-hover:underline flex items-center gap-1">
                View Reports <ChevronRight className="w-3 h-3" />
              </span>
            </div>
            <div className="p-3 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
              <FileCheck2 className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* 4. ATTENTION REQUIRED SECTION */}
      <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900">Attention Required</h3>
          </div>
          <span className="text-[11px] font-semibold text-slate-500">3 Priority Tasks</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* URGENT RED */}
          <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/60 flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-200 text-rose-900">
                ⚠ URGENT CORRECTION
              </span>
              <h4 className="text-xs font-bold text-rose-950">Eccentricity Observation Requires Correction</h4>
              <p className="text-[11px] text-rose-800 leading-relaxed">
                <strong>WHAT:</strong> Corner #4 observation marked outside tolerance (+50g error).<br />
                <strong>WHY:</strong> Prevents certificate issuing for TruckMaster WB-60T.<br />
                <strong>ACTION:</strong> Re-verify load cell #4 reading or adjust observation.
              </p>
            </div>
            <button
              onClick={() => navigate('/test-sessions/TS-2026-103')}
              className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
            >
              Open Test
            </button>
          </div>

          {/* PENDING AMBER */}
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/60 flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-200 text-amber-900">
                PENDING AUDIT
              </span>
              <h4 className="text-xs font-bold text-amber-950">2 Tests Need Technical Review</h4>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                <strong>WHAT:</strong> Cubis II Micro-Balance test completed by officer.<br />
                <strong>WHY:</strong> Requires senior auditor sign-off per lab quality standard.<br />
                <strong>ACTION:</strong> Review observations and confirm compliance verdict.
              </p>
            </div>
            <button
              onClick={() => navigate('/test-sessions/TS-2026-102')}
              className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
            >
              Review Now
            </button>
          </div>

          {/* INFO BLUE */}
          <div className="p-4 rounded-xl border border-sky-200 bg-sky-50/60 flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-sky-200 text-sky-900">
                APPROVAL READY
              </span>
              <h4 className="text-xs font-bold text-sky-950">Report LM-OIML-R76-2026-0883 Awaiting Approval</h4>
              <p className="text-[11px] text-sky-800 leading-relaxed">
                <strong>WHAT:</strong> Type Evaluation Certificate generated for Cubis II.<br />
                <strong>WHY:</strong> Needs Director signature for official release.<br />
                <strong>ACTION:</strong> Sign and finalize certificate document.
              </p>
            </div>
            <button
              onClick={() => navigate('/reports/REP-2026-003')}
              className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
            >
              Open Report
            </button>
          </div>
        </div>
      </div>

      {/* 5. ONGOING TESTS (Main Work Table) */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">ONGOING TESTS</h3>
            <p className="text-xs text-slate-500">Active test sessions assigned to your laboratory workstation.</p>
          </div>
          <Link to="/test-sessions" className="text-xs font-semibold text-teal-600 hover:underline">
            View All Tests
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                <th className="py-3 px-4">Test ID</th>
                <th className="py-3 px-4">Instrument</th>
                <th className="py-3 px-4">Serial Number</th>
                <th className="py-3 px-4">Current Test</th>
                <th className="py-3 px-4">Progress</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {testSessions.map((ts) => {
                const { completedCount, totalCount, progressPercentage: percentage } = calculateSessionProgress(ts);
                return (
                  <tr
                    key={ts.id}
                    onClick={() => navigate(`/test-sessions/${ts.id}`)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{ts.id}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{ts.instrumentModel}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-500">{ts.serialNumber}</td>
                    <td className="py-3.5 px-4 font-medium text-teal-800">
                      {percentage === 100
                        ? 'All Tests Completed'
                        : percentage > 60
                        ? 'Eccentricity Test'
                        : percentage > 30
                        ? 'Repeatability Test'
                        : 'Weighing Accuracy'}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden w-24">
                            <div
                              className={`h-full rounded-full ${
                                percentage === 100 ? 'bg-emerald-500' : 'bg-teal-600'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-bold text-slate-800">{percentage}%</span>
                        </div>
                        <span className="text-[10px] text-slate-500 block">
                          {completedCount} of {totalCount} tests completed
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge status={ts.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/test-sessions/${ts.id}`);
                        }}
                        className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg transition-colors shadow-xs cursor-pointer"
                      >
                        {ts.status === 'Awaiting Review' ? 'Review' : percentage === 100 ? 'View Report' : 'Continue'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6 & 7. LAB SUMMARY */}
      <div className="space-y-3 pt-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Lab Summary</h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider">Testing Stages Pipeline</h4>
              <span className="text-xs text-slate-500">{testSessions.length * 3 + 15} Total Units</span>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {testingStages.map((stg, idx) => (
                <div
                  key={stg.label}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-1"
                >
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Stage 0{idx + 1}</span>
                  <span className="text-xs font-bold text-slate-800 block truncate">{stg.label}</span>
                  <span className="text-lg font-extrabold text-slate-900 block">{stg.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="border-b border-slate-100 pb-3">
              <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider">Test Status Proportion</h4>
            </div>

            <div className="h-36 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={complianceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={55}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {complianceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '11px',
                    }}
                  />
                  <Legend verticalAlign="bottom" height={20} wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* 8. RECENTLY COMPLETED REPORTS */}
      {completedReports.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900">RECENTLY COMPLETED REPORTS</h3>
            <Link to="/reports" className="text-xs font-semibold text-teal-600 hover:underline">
              View All Reports
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                  <th className="py-3 px-4">Report Number</th>
                  <th className="py-3 px-4">Instrument Model</th>
                  <th className="py-3 px-4">Manufacturer</th>
                  <th className="py-3 px-4">Issue Date</th>
                  <th className="py-3 px-4">Verdict</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {completedReports.map((rep) => (
                  <tr key={rep.id} className="hover:bg-slate-50/80">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{rep.reportNumber}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{rep.instrumentModel}</td>
                    <td className="py-3.5 px-4 text-slate-600">{rep.manufacturer}</td>
                    <td className="py-3.5 px-4 text-slate-500">{rep.issueDate}</td>
                    <td className="py-3.5 px-4">
                      <Badge status={rep.verdict} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => navigate(`/reports/${rep.id}`)}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded transition-colors cursor-pointer"
                      >
                        View Report
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Start New Test Setup Wizard Modal */}
      <StartTestWizardModal isOpen={isWizardOpen} onClose={() => setIsWizardOpen(false)} />

      {/* SIH Presentation & Judge Modals */}
      <GuidedDemoIntroModal isOpen={isDemoIntroOpen} onClose={() => setIsDemoIntroOpen(false)} />
      <SystemArchitectureModal isOpen={isArchitectureOpen} onClose={() => setIsArchitectureOpen(false)} />
      <DemoReadinessModal isOpen={isReadinessOpen} onClose={() => setIsReadinessOpen(false)} />
    </div>
  );
};
