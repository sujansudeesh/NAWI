import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Report, TestSession } from '../types';
import { getReportsStore } from '../mock/store';
import { testSessionService } from './testSessionService';
import { pdfGeneratorService } from './pdfGeneratorService';
import { auditService } from './auditService';

export interface ReportVersionRecord {
  id: string;
  reportId: string;
  versionNumber: number;
  sessionSnapshot: TestSession;
  generatedBy?: string;
  generatedByName?: string;
  generatedAt: string;
  storagePath: string;
  status: 'DRAFT' | 'APPROVED' | 'FINAL';
  signedUrl?: string;
}

export const reportService = {
  /**
   * Get all reports
   */
  async getReports(): Promise<Report[]> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('reports')
        .select('*, test_sessions(*, instruments(*))')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((row) => this.mapRowToReport(row));
      }
    }

    return getReportsStore();
  },

  /**
   * Get report by Session ID or Report ID
   */
  async getReportBySessionId(sessionId: string): Promise<Report | null> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('reports')
        .select('*, test_sessions(*, instruments(*))')
        .or(`session_id.eq.${sessionId},id.eq.${sessionId},report_code.eq.${sessionId}`)
        .maybeSingle();

      if (!error && data) {
        return this.mapRowToReport(data);
      }
    }

    const reports = getReportsStore();
    return reports.find((r) => r.testSessionId === sessionId || r.id === sessionId || r.reportNumber === sessionId) || null;
  },

  /**
   * Generate & Store Real Report PDF + Version Snapshot
   */
  async generateRealReport(
    sessionId: string,
    userProfile?: { id: string; name?: string; fullName?: string; role: string },
    statusOverride?: 'DRAFT' | 'APPROVED' | 'FINAL'
  ): Promise<{ report: Report; pdfUrl: string; pdfBytes: Uint8Array }> {
    // 1. Fetch authoritative session data from backend service
    const session = (await testSessionService.getAllSessionsAsync()).find((s) => s.id === sessionId) || testSessionService.getSession(sessionId);

    if (!session) {
      throw new Error('Test session not found. Cannot generate report.');
    }

    const isFinalized = session.workflowStatus === 'FINALIZED';
    const isApproved = session.workflowStatus === 'APPROVED' || session.workflowStatus === 'TECHNICALLY_APPROVED';

    const status: 'DRAFT' | 'APPROVED' | 'FINAL' = statusOverride || (isFinalized ? 'FINAL' : isApproved ? 'APPROVED' : 'DRAFT');

    // 2. Safe report & certificate ID formatting
    const existingReport = await this.getReportBySessionId(sessionId);
    const reportCode = existingReport?.reportNumber || `NAWI-2026-${Math.floor(100000 + Math.random() * 900000)}`;
    const certificateId = existingReport?.certificateId || `CERT-IN-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    // 3. Determine next version number
    let nextVersion = 1;
    let reportDbId = existingReport?.id;

    if (isSupabaseConfigured() && supabase && reportDbId) {
      const { count } = await supabase
        .from('report_versions')
        .select('*', { count: 'exact', head: true })
        .eq('report_id', reportDbId);

      if (count !== null) {
        nextVersion = count + 1;
      }
    }

    // 4. Generate REAL PDF binary using pdfGeneratorService
    const pdfBytes = await pdfGeneratorService.generateReportPDF({
      session,
      reportCode,
      certificateId,
      status,
      testingOfficerName: session.assignedOfficer || 'Dr. Ananya Rao',
      reviewerName: session.reviewer || session.reviewedBy || 'Vikramaditya Verma',
      approverName: session.approver || session.approvedBy || session.finalizedBy || 'Dr. K. S. Murthy',
    });

    const storagePath = `sessions/${sessionId}/reports/${reportCode}_v${nextVersion}.pdf`;
    let signedUrl = '';

    // 5. Upload PDF to Supabase Storage & insert records if configured
    if (isSupabaseConfigured() && supabase) {
      const { error: uploadErr } = await supabase.storage
        .from('generated-reports')
        .upload(storagePath, pdfBytes, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (uploadErr) {
        console.warn('Failed to upload PDF to generated-reports bucket:', uploadErr);
      } else {
        const { data: urlData } = await supabase.storage
          .from('generated-reports')
          .createSignedUrl(storagePath, 86400); // 24 hour URL
        signedUrl = urlData?.signedUrl || '';
      }

      // Upsert report row
      const { data: dbReport, error: repErr } = await supabase
        .from('reports')
        .upsert({
          report_code: reportCode,
          session_id: sessionId,
          report_status: status === 'FINAL' ? 'FINALIZED' : status === 'APPROVED' ? 'APPROVED' : 'DRAFT',
          evaluation_result: session.overallEvaluationResult || 'UNDER_EVALUATION',
          generated_by: userProfile?.id,
          report_data: {
            certificateId,
            reportNumber: reportCode,
            storagePath,
            pdfUrl: signedUrl,
          },
        }, { onConflict: 'report_code' })
        .select()
        .single();

      if (!repErr && dbReport) {
        reportDbId = dbReport.id;
        // Insert report_versions snapshot
        await supabase.from('report_versions').insert({
          report_id: dbReport.id,
          version_number: nextVersion,
          session_snapshot: session,
          generated_by: userProfile?.id,
          storage_path: storagePath,
          status,
        });
      }
    }

    // Local Blob URL fallback
    if (!signedUrl) {
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      signedUrl = URL.createObjectURL(blob);
    }

    const reportResult: Report = {
      id: reportDbId || `REP-2026-${Math.floor(100 + Math.random() * 900)}`,
      reportNumber: reportCode,
      certificateId,
      testSessionId: sessionId,
      instrumentId: session.instrumentId,
      instrumentModel: session.instrumentModel,
      manufacturer: session.manufacturer,
      accuracyClass: session.accuracyClass,
      issueDate: new Date().toISOString().split('T')[0],
      status: status === 'FINAL' ? 'Finalized' : status === 'APPROVED' ? 'Approved' : 'Draft',
      testingOfficer: session.assignedOfficer || 'Dr. Ananya Rao',
      technicalReviewer: session.reviewer || 'Vikramaditya Verma',
      labDirector: session.approver || 'Dr. K. S. Murthy',
      verdict: session.overallEvaluationResult === 'NON_COMPLIANT' ? 'Non-Compliant' : 'Compliant',
      downloadUrl: signedUrl,
    };

    // Log Audit Event
    await auditService.logAuditEvent({
      userId: userProfile?.id,
      sessionId,
      action: status === 'FINAL' ? 'Report Finalized' : 'Report Generated',
      entityType: 'REPORT',
      entityId: reportResult.id,
      details: `Generated ${status} report PDF v${nextVersion} (${reportCode})`,
      userFullName: userProfile?.name,
      userRole: userProfile?.role,
    });

    return { report: reportResult, pdfUrl: signedUrl, pdfBytes };
  },

  /**
   * Fetch version history for a report
   */
  async getReportVersions(reportId: string): Promise<ReportVersionRecord[]> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('report_versions')
        .select('*, profiles(full_name)')
        .eq('report_id', reportId)
        .order('version_number', { ascending: false });

      if (!error && data) {
        return Promise.all(
          data.map(async (row) => {
            let signedUrl = '';
            if (row.storage_path) {
              const { data: urlData } = await supabase!.storage
                .from('generated-reports')
                .createSignedUrl(row.storage_path, 3600);
              signedUrl = urlData?.signedUrl || '';
            }
            return {
              id: row.id,
              reportId: row.report_id,
              versionNumber: row.version_number,
              sessionSnapshot: row.session_snapshot,
              generatedBy: row.generated_by,
              generatedByName: row.profiles?.full_name || 'System Officer',
              generatedAt: row.generated_at,
              storagePath: row.storage_path,
              status: row.status as any,
              signedUrl,
            };
          })
        );
      }
    }

    return [];
  },

  /**
   * Save Report object
   */
  async saveReport(report: Report): Promise<Report> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('reports')
        .upsert({
          report_code: report.reportNumber,
          session_id: report.testSessionId,
          report_status: report.status.toUpperCase(),
          evaluation_result: report.verdict === 'Compliant' ? 'COMPLIANT' : 'NON_COMPLIANT',
          report_data: report,
        }, { onConflict: 'report_code' })
        .select()
        .single();

      if (!error && data) {
        return this.mapRowToReport(data);
      }
    }

    return report;
  },

  /**
   * Map DB Row to Report object
   */
  mapRowToReport(row: any): Report {
    const session = row.test_sessions;
    const instrument = session?.instruments;

    return {
      id: row.id,
      reportNumber: row.report_code || `REP-${row.id.substring(0, 8)}`,
      certificateId: row.report_data?.certificateId || `CERT-IN-2026-${row.id.substring(0, 4)}`,
      testSessionId: row.session_id,
      instrumentId: session?.instrument_id || row.report_data?.instrumentId || '',
      instrumentModel: instrument?.model || row.report_data?.instrumentModel || 'Instrument Standard',
      manufacturer: instrument?.manufacturer || row.report_data?.manufacturer || 'Metrology Manufacturer',
      accuracyClass: instrument?.accuracy_class || row.report_data?.accuracyClass || 'Class III',
      issueDate: (row.created_at || new Date().toISOString()).substring(0, 10),
      status: (row.report_status === 'FINALIZED' ? 'Finalized' : row.report_status === 'APPROVED' ? 'Approved' : 'Draft') as any,
      testingOfficer: row.report_data?.testingOfficer || 'Dr. Ananya Rao',
      technicalReviewer: row.report_data?.technicalReviewer || 'Vikramaditya Verma',
      labDirector: row.report_data?.labDirector || 'Dr. K. S. Murthy',
      verdict: row.evaluation_result === 'COMPLIANT' ? 'Compliant' : 'Non-Compliant',
      downloadUrl: row.report_data?.pdfUrl,
    };
  },
};
