import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { TestSession, WorkflowStatus, WorkflowHistoryEvent, UserRole, Report, AuditLog } from '../types';
import { INITIAL_TEST_SESSIONS, INITIAL_REPORTS } from '../mock/data';
import { addAuditLog } from '../mock/store';
import { calculateSessionProgress, calculateOverallEvaluationResult, isSessionReadyForReview } from './evaluationResultService';

const STORAGE_KEYS = {
  TEST_SESSIONS: 'nawi_test_sessions',
  REPORTS: 'nawi_reports',
};

/**
 * Normalizes legacy test session status to formal WorkflowStatus.
 */
export function normalizeWorkflowStatus(session: Partial<TestSession>): WorkflowStatus {
  if (session.workflowStatus) return session.workflowStatus;
  
  const status = session.status;
  if (status === 'Finalized') return 'FINALIZED';
  if (status === 'Compliant') return 'APPROVED';
  if (status === 'Awaiting Review') return 'UNDER_REVIEW';
  if (status === 'Non-Compliant') return 'FINALIZED';
  return 'IN_PROGRESS';
}

/**
 * Maps WorkflowStatus to legacy user-facing TestSessionStatus badge string.
 */
export function mapWorkflowToDisplayStatus(workflowStatus: WorkflowStatus): TestSession['status'] {
  switch (workflowStatus) {
    case 'DRAFT':
    case 'IN_PROGRESS':
    case 'TESTING_COMPLETE':
      return 'In Progress';
    case 'UNDER_REVIEW':
    case 'TECHNICALLY_APPROVED':
      return 'Awaiting Review';
    case 'CHANGES_REQUESTED':
      return 'In Progress';
    case 'APPROVED':
      return 'Compliant';
    case 'FINALIZED':
      return 'Finalized';
    default:
      return 'In Progress';
  }
}

/**
 * Returns human-readable label for WorkflowStatus.
 */
export function getWorkflowStatusLabel(workflowStatus?: WorkflowStatus): string {
  switch (workflowStatus) {
    case 'DRAFT':
      return 'Draft';
    case 'IN_PROGRESS':
      return 'In Progress';
    case 'TESTING_COMPLETE':
      return 'Testing Complete';
    case 'UNDER_REVIEW':
      return 'Under Review';
    case 'CHANGES_REQUESTED':
      return 'Changes Requested';
    case 'TECHNICALLY_APPROVED':
      return 'Technically Approved';
    case 'APPROVED':
      return 'Approved';
    case 'FINALIZED':
      return 'Finalized';
    default:
      return 'In Progress';
  }
}

/**
 * Dispatches global storage and application events for immediate multi-view re-rendering.
 */
function notifySubscribers() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('nawi_session_updated'));
    window.dispatchEvent(new Event('storage'));
  }
}

/**
 * Centralized Session Service (Single Source of Truth)
 */
export const testSessionService = {
  /**
   * Retrieves all test sessions from persistent storage or Supabase.
   */
  async getAllSessionsAsync(): Promise<TestSession[]> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('test_sessions')
        .select(`
          *,
          instruments (*),
          session_tests (*, test_observations (*)),
          workflow_history (*)
        `)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((row) => this.mapRowToSession(row));
      }
    }

    return this.getAllSessions();
  },

  /**
   * Synchronous getAllSessions for local fallback / instant state access
   */
  getAllSessions(): TestSession[] {
    const saved = localStorage.getItem(STORAGE_KEYS.TEST_SESSIONS);
    let sessions: TestSession[] = [];

    if (saved) {
      try {
        sessions = JSON.parse(saved);
      } catch {
        sessions = INITIAL_TEST_SESSIONS;
      }
    } else {
      sessions = INITIAL_TEST_SESSIONS;
    }

    // Ensure all sessions have valid normalized workflowStatus and history
    let updated = false;
    const normalizedSessions = sessions.map((s) => {
      const ws = normalizeWorkflowStatus(s);
      if (s.workflowStatus !== ws || !s.workflowHistory) {
        updated = true;
        return {
          ...s,
          workflowStatus: ws,
          workflowHistory: s.workflowHistory || [
            {
              id: `wh-init-${s.id}`,
              fromStatus: 'DRAFT',
              toStatus: ws,
              user: s.assignedOfficer || 'Testing Officer',
              role: 'Testing Officer' as UserRole,
              timestamp: s.startedOn || new Date().toISOString().substring(0, 10),
              comment: 'Initial test session initialized.',
            },
          ],
        };
      }
      return s;
    });

    if (updated || !saved) {
      localStorage.setItem(STORAGE_KEYS.TEST_SESSIONS, JSON.stringify(normalizedSessions));
    }

    return normalizedSessions;
  },

  /**
   * Gets latest state for a specific test session by ID.
   */
  getSession(id: string): TestSession | undefined {
    const sessions = this.getAllSessions();
    return sessions.find((s) => s.id === id);
  },

  getLatestSessionState(id: string): TestSession | undefined {
    return this.getSession(id);
  },

  /**
   * Saves or creates a test session persistently in Supabase and Local Storage.
   */
  saveSession(session: TestSession): TestSession[] {
    const current = this.getAllSessions();
    const index = current.findIndex((s) => s.id === session.id);

    // Calculate dynamic progress and overall evaluation result from central evaluationResultService
    const { progressPercentage, moduleConfigs } = calculateSessionProgress(session);
    const overallEvalResult = calculateOverallEvaluationResult(session);

    const updatedSession: TestSession = {
      ...session,
      progress: progressPercentage,
      moduleConfigs,
      overallEvaluationResult: overallEvalResult,
      overallVerdict: overallEvalResult === 'NON_COMPLIANT' ? 'Non-Compliant' : overallEvalResult === 'COMPLIANT' ? 'Compliant' : 'Under Evaluation',
      workflowStatus: normalizeWorkflowStatus(session),
    };

    let updatedList: TestSession[];
    if (index >= 0) {
      updatedList = [...current];
      updatedList[index] = updatedSession;
    } else {
      updatedList = [updatedSession, ...current];
    }

    localStorage.setItem(STORAGE_KEYS.TEST_SESSIONS, JSON.stringify(updatedList));

    // Save to Supabase in background if configured
    if (isSupabaseConfigured() && supabase) {
      this.syncSessionToSupabase(updatedSession).catch((err) => {
        console.error('Background Supabase session sync failed:', err);
      });
    }

    // Synchronize matching report state
    this.syncReportState(updatedSession);

    // Notify UI components
    notifySubscribers();

    return updatedList;
  },

  /**
   * Saves test session record to Supabase
   */
  async syncSessionToSupabase(session: TestSession) {
    if (!isSupabaseConfigured() || !supabase) return;

    // 1. Upsert test_sessions row
    const { data: dbSession, error: sessionErr } = await supabase
      .from('test_sessions')
      .upsert({
        session_code: session.id,
        instrument_id: session.instrumentId && session.instrumentId.includes('-') ? session.instrumentId : undefined,
        test_context: session.testContext || 'TYPE_EXAMINATION',
        verification_mode: session.verificationMode || 'INITIAL_VERIFICATION',
        workflow_status: session.workflowStatus || 'IN_PROGRESS',
        evaluation_result: session.overallEvaluationResult || 'UNDER_EVALUATION',
        rule_standard: 'OIML R 76-1',
        rule_version: '2006',
        submitted_at: session.submittedAt,
        reviewed_at: session.reviewedAt,
        approved_at: session.approvedAt,
        finalized_at: session.finalizedAt,
      }, { onConflict: 'session_code' })
      .select()
      .single();

    if (sessionErr || !dbSession) {
      console.warn('Failed to sync session row to Supabase:', sessionErr);
      return;
    }

    // 2. Upsert session_tests for each module
    const modules = session.selectedTests || ['accuracy', 'repeatability', 'eccentricity', 'discrimination', 'zeroSetting', 'tare'];
    for (const modKey of modules) {
      const dbType = modKey.toUpperCase();
      const config = session.moduleConfigs?.[modKey];
      await supabase.from('session_tests').upsert({
        session_id: dbSession.id,
        test_type: dbType,
        required: config?.required ?? true,
        applicability_status: config?.applicable ? 'APPLICABLE' : 'NOT_APPLICABLE',
        completion_status: config?.status || 'NOT_STARTED',
        result: config?.result || 'INCOMPLETE',
      }, { onConflict: 'session_id,test_type' });
    }
  },

  /**
   * Updates partial properties on a session by ID.
   */
  updateSession(id: string, updates: Partial<TestSession>): TestSession | undefined {
    const session = this.getSession(id);
    if (!session) return undefined;

    const merged = { ...session, ...updates };
    this.saveSession(merged);
    return this.getSession(id);
  },

  /**
   * Formal Workflow State Transition Handler.
   */
  updateWorkflowStatus(
    id: string,
    toStatus: WorkflowStatus,
    metadata?: {
      user?: string;
      role?: UserRole;
      comments?: string;
      reason?: string;
    }
  ): TestSession | undefined {
    const session = this.getSession(id);
    if (!session) return undefined;

    const fromStatus = session.workflowStatus || normalizeWorkflowStatus(session);
    const currentUser = metadata?.user || (metadata?.role === 'Technical Reviewer' ? 'Vikramaditya Verma' : metadata?.role === 'Approving Officer / Lab Director' ? 'Dr. K. S. Murthy' : 'Dr. Ananya Rao');
    const currentRole = metadata?.role || 'Testing Officer';
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const commentText = metadata?.comments || metadata?.reason || `Workflow transition: ${fromStatus} -> ${toStatus}`;

    const updatedSession: TestSession = {
      ...session,
      workflowStatus: toStatus,
      status: mapWorkflowToDisplayStatus(toStatus),
    };

    if (toStatus === 'UNDER_REVIEW') {
      updatedSession.submittedBy = currentUser;
      updatedSession.submittedAt = timestamp;
    } else if (toStatus === 'CHANGES_REQUESTED') {
      updatedSession.correctionReason = metadata?.reason || metadata?.comments || 'Correction required by reviewer';
      updatedSession.correctionRequestedBy = currentUser;
      updatedSession.correctionRequestedAt = timestamp;
      updatedSession.reviewerComments = metadata?.comments || updatedSession.correctionReason;
    } else if (toStatus === 'TECHNICALLY_APPROVED') {
      updatedSession.reviewedBy = currentUser;
      updatedSession.reviewedAt = timestamp;
      updatedSession.reviewerComments = metadata?.comments || 'Technical review verified and approved.';
      updatedSession.reviewer = currentUser;
    } else if (toStatus === 'APPROVED') {
      updatedSession.approvedBy = currentUser;
      updatedSession.approvedAt = timestamp;
      updatedSession.approver = currentUser;
      updatedSession.overallVerdict = 'Compliant';
    } else if (toStatus === 'FINALIZED') {
      updatedSession.finalizedBy = currentUser;
      updatedSession.finalizedAt = timestamp;
      updatedSession.completedOn = timestamp;
      updatedSession.approver = currentUser;
      updatedSession.overallVerdict = 'Compliant';
      updatedSession.progress = 100;
    }

    const newHistoryEvent: WorkflowHistoryEvent = {
      id: `wh-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      fromStatus,
      toStatus,
      user: currentUser,
      role: currentRole,
      timestamp,
      comment: commentText,
    };

    updatedSession.workflowHistory = [newHistoryEvent, ...(session.workflowHistory || [])];

    // Persist session
    this.saveSession(updatedSession);

    // Audit Event
    addAuditLog({
      id: `LOG-${Date.now()}`,
      timestamp,
      user: currentUser,
      role: currentRole,
      action: `Workflow Status: ${getWorkflowStatusLabel(toStatus)}`,
      details: `${session.instrumentModel} (${id}) moved to ${getWorkflowStatusLabel(toStatus)}. ${commentText}`,
      instrumentOrSessionId: id,
    });

    return this.getSession(id);
  },

  /**
   * Synchronizes matching Report record with current session workflow status.
   */
  syncReportState(session: TestSession) {
    const rawReports = localStorage.getItem(STORAGE_KEYS.REPORTS);
    let reports: Report[] = rawReports ? JSON.parse(rawReports) : INITIAL_REPORTS;

    const existingReportIdx = reports.findIndex((r) => r.testSessionId === session.id);
    
    let reportStatus: Report['status'] = 'Draft';
    if (session.workflowStatus === 'UNDER_REVIEW' || session.workflowStatus === 'CHANGES_REQUESTED' || session.workflowStatus === 'TECHNICALLY_APPROVED') {
      reportStatus = 'Awaiting Review';
    } else if (session.workflowStatus === 'APPROVED') {
      reportStatus = 'Approved';
    } else if (session.workflowStatus === 'FINALIZED') {
      reportStatus = 'Finalized';
    }

    if (existingReportIdx >= 0) {
      reports[existingReportIdx] = {
        ...reports[existingReportIdx],
        status: reportStatus,
        technicalReviewer: session.reviewedBy || reports[existingReportIdx].technicalReviewer,
        labDirector: session.approvedBy || session.finalizedBy || reports[existingReportIdx].labDirector,
        verdict: session.overallVerdict || reports[existingReportIdx].verdict,
      };
    } else if (session.workflowStatus === 'APPROVED' || session.workflowStatus === 'FINALIZED' || session.workflowStatus === 'TECHNICALLY_APPROVED' || session.workflowStatus === 'UNDER_REVIEW') {
      const newReport: Report = {
        id: `REP-2026-${Math.floor(100 + Math.random() * 900)}`,
        reportNumber: `LM-OIML-R76-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        certificateId: `CERT-IN-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        testSessionId: session.id,
        instrumentId: session.instrumentId,
        instrumentModel: session.instrumentModel,
        manufacturer: session.manufacturer,
        accuracyClass: session.accuracyClass,
        issueDate: new Date().toISOString().split('T')[0],
        status: reportStatus,
        testingOfficer: session.assignedOfficer || 'Dr. Ananya Rao',
        technicalReviewer: session.reviewedBy || 'Vikramaditya Verma',
        labDirector: session.approvedBy || session.finalizedBy || 'Dr. K. S. Murthy',
        verdict: session.overallVerdict || 'Compliant',
      };
      reports = [newReport, ...reports];
    }

    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));
  },

  /**
   * Helper to map Supabase session row to TestSession object
   */
  mapRowToSession(row: any): TestSession {
    const instrument = row.instruments;

    return {
      id: row.session_code || row.id,
      instrumentId: row.instrument_id || '',
      instrumentModel: instrument?.model || row.instrument_model || 'Precision Weighing Unit',
      serialNumber: instrument?.serial_number || 'SN-2026',
      manufacturer: instrument?.manufacturer || 'Mettler Toledo Ltd.',
      accuracyClass: instrument?.accuracy_class || 'Class III',
      maxCapacity: `${instrument?.max_capacity || 30} ${instrument?.max_unit || 'kg'}`,
      verificationInterval: `${instrument?.verification_interval_e || 5} ${instrument?.verification_interval_e_unit || 'g'}`,
      startedOn: row.started_at ? new Date(row.started_at).toLocaleString() : new Date().toLocaleString(),
      completedOn: row.finalized_at ? new Date(row.finalized_at).toLocaleString() : undefined,
      progress: 50,
      status: mapWorkflowToDisplayStatus(row.workflow_status),
      workflowStatus: row.workflow_status as WorkflowStatus,
      testContext: row.test_context || 'TYPE_EXAMINATION',
      assignedOfficer: 'Dr. Ananya Rao',
      ambientTemp: 22.0,
      relativeHumidity: 50,
      barometricPressure: 1013.2,
      weighingObservations: [],
      repeatabilityObservations: [],
      eccentricityObservations: [],
      tareObservations: [],
      discriminationObservations: [],
      zeroSettingObservations: [],
      workflowHistory: (row.workflow_history || []).map((wh: any) => ({
        id: wh.id,
        fromStatus: wh.from_status,
        toStatus: wh.to_status,
        user: wh.user_id || 'System User',
        role: 'Testing Officer',
        timestamp: wh.created_at,
        comment: wh.comment,
      })),
    };
  },
};

/**
 * Permission checks for role-specific actions
 */
export function canEditTestSession(session: TestSession, role: UserRole): boolean {
  const ws = session.workflowStatus || normalizeWorkflowStatus(session);
  if (ws === 'FINALIZED') return false;
  if (role === 'Testing Officer' || role === 'ADMIN') {
    return ws === 'DRAFT' || ws === 'IN_PROGRESS' || ws === 'CHANGES_REQUESTED';
  }
  return false;
}

export function canSubmitForReview(session: TestSession, role: UserRole): boolean {
  if (role !== 'Testing Officer' && role !== 'ADMIN') return false;
  const ws = session.workflowStatus || normalizeWorkflowStatus(session);
  return ws === 'DRAFT' || ws === 'IN_PROGRESS' || ws === 'CHANGES_REQUESTED' || ws === 'TESTING_COMPLETE';
}

export function canTechnicalReview(session: TestSession, role: UserRole): boolean {
  if (role !== 'Technical Reviewer' && role !== 'ADMIN') return false;
  const ws = session.workflowStatus || normalizeWorkflowStatus(session);
  return ws === 'UNDER_REVIEW';
}

export function canDirectorApprove(session: TestSession, role: UserRole): boolean {
  if (role !== 'Approving Officer / Lab Director' && role !== 'ADMIN') return false;
  const ws = session.workflowStatus || normalizeWorkflowStatus(session);
  return ws === 'TECHNICALLY_APPROVED' || ws === 'APPROVED';
}
