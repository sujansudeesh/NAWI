import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldCheck, Award, CheckCircle2, AlertTriangle, FileText, ArrowLeft, Building2 } from 'lucide-react';
import { reportService } from '../services/reportService';
import { testSessionService } from '../services/testSessionService';
import { Logo } from '../components/common/Logo';
import { Badge } from '../components/common/Badge';
import { Report, TestSession } from '../types';

export const ReportVerification: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [session, setSession] = useState<TestSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVerificationData = async () => {
      if (!reportId) return;
      setLoading(true);
      try {
        const foundReport = await reportService.getReportBySessionId(reportId);
        if (foundReport) {
          setReport(foundReport);
          const foundSession = (await testSessionService.getAllSessionsAsync()).find(
            (s) => s.id === foundReport.testSessionId || s.id === reportId
          );
          if (foundSession) setSession(foundSession);
        } else {
          // Direct session lookup fallback
          const foundSession = (await testSessionService.getAllSessionsAsync()).find(
            (s) => s.id === reportId
          );
          if (foundSession) {
            setSession(foundSession);
            setReport({
              id: `REP-${foundSession.id}`,
              reportNumber: `NAWI-2026-${foundSession.id.substring(0, 6)}`,
              certificateId: `CERT-IN-2026-${foundSession.id.substring(0, 4)}`,
              testSessionId: foundSession.id,
              instrumentId: foundSession.instrumentId,
              instrumentModel: foundSession.instrumentModel,
              manufacturer: foundSession.manufacturer,
              accuracyClass: foundSession.accuracyClass,
              issueDate: foundSession.completedOn || new Date().toISOString().substring(0, 10),
              status: foundSession.workflowStatus === 'FINALIZED' ? 'Finalized' : foundSession.workflowStatus === 'APPROVED' ? 'Approved' : 'Draft',
              testingOfficer: foundSession.assignedOfficer || 'Dr. Ananya Rao',
              technicalReviewer: foundSession.reviewer || 'Vikramaditya Verma',
              labDirector: foundSession.approver || 'Dr. K. S. Murthy',
              verdict: foundSession.overallEvaluationResult === 'NON_COMPLIANT' ? 'Non-Compliant' : 'Compliant',
            });
          }
        }
      } catch (err) {
        console.error('Report verification lookup failed:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchVerificationData();
  }, [reportId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Verifying Legal Metrology Certificate Authenticity...</p>
        </div>
      </div>
    );
  }

  if (!report && !session) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4 text-white">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
          <h2 className="text-lg font-bold">Verification Record Not Found</h2>
          <p className="text-xs text-slate-400">
            No official type evaluation certificate or report record matches identifier <code className="font-mono text-teal-400">{reportId}</code>.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Laboratory Portal
          </Link>
        </div>
      </div>
    );
  }

  const isCompliant = report?.verdict === 'Compliant' || session?.overallEvaluationResult === 'COMPLIANT';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-teal-500 selection:text-slate-950 py-12 px-4 flex flex-col justify-between">
      <div className="max-w-2xl mx-auto w-full space-y-8">
        {/* Header Logo */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <Logo variant="dark" showSubtitle={true} showSIHBadge={true} />
          <span className="px-3 py-1 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" /> Public Verification
          </span>
        </div>

        {/* Verification Status Card */}
        <div className={`p-6 rounded-2xl border ${isCompliant ? 'bg-emerald-950/40 border-emerald-500/30' : 'bg-rose-950/40 border-rose-500/30'} space-y-4`}>
          <div className="flex items-center gap-3">
            {isCompliant ? (
              <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-8 h-8" />
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <AlertTriangle className="w-8 h-8" />
              </div>
            )}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Official Certificate Record Status</span>
              <h1 className="text-xl font-extrabold text-white">
                {isCompliant ? 'VALID & COMPLIANT OIML EVALUATION' : 'NON-COMPLIANT EVALUATION RECORD'}
              </h1>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed border-t border-slate-800/80 pt-3">
            This verification registry confirms that the Non-Automatic Weighing Instrument (NAWI) listed below was evaluated at the National Legal Metrology Laboratory under OIML Recommendation R 76-1:2006.
          </p>
        </div>

        {/* Safe Public Metadata Details Grid */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
            <FileText className="w-4 h-4" /> Instrument & Certificate Metadata
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
              <span className="text-[10px] font-sans font-bold text-slate-500 block uppercase">Report Number</span>
              <span className="font-extrabold text-white">{report?.reportNumber}</span>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
              <span className="text-[10px] font-sans font-bold text-slate-500 block uppercase">Certificate ID</span>
              <span className="font-extrabold text-teal-300">{report?.certificateId}</span>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
              <span className="text-[10px] font-sans font-bold text-slate-500 block uppercase">Instrument Model</span>
              <span className="font-bold text-white">{report?.instrumentModel}</span>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
              <span className="text-[10px] font-sans font-bold text-slate-500 block uppercase">Serial Number</span>
              <span className="font-bold text-slate-300">{session?.serialNumber || 'SN-2026-XP600'}</span>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
              <span className="text-[10px] font-sans font-bold text-slate-500 block uppercase">Manufacturer</span>
              <span className="font-bold text-slate-300 truncate block">{report?.manufacturer}</span>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
              <span className="text-[10px] font-sans font-bold text-slate-500 block uppercase">Accuracy Class</span>
              <span className="font-bold text-emerald-400">{report?.accuracyClass}</span>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
              <span className="text-[10px] font-sans font-bold text-slate-500 block uppercase">Certificate Status</span>
              <span className="font-bold text-white uppercase">{report?.status}</span>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
              <span className="text-[10px] font-sans font-bold text-slate-500 block uppercase">Issue Date</span>
              <span className="font-bold text-slate-300">{report?.issueDate}</span>
            </div>
          </div>
        </div>

        {/* Footer Notice */}
        <div className="text-center space-y-2 text-[11px] text-slate-500">
          <p>National Legal Metrology Laboratory • Type Evaluation Registry</p>
          <p>Smart India Hackathon 2026 • Problem SIH26035</p>
        </div>
      </div>
    </div>
  );
};
