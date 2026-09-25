import { Instrument, TestSession, Report, AuditLog, User } from '../types';
import { testSessionService } from '../services/testSessionService';
import {
  INITIAL_INSTRUMENTS,
  INITIAL_TEST_SESSIONS,
  INITIAL_REPORTS,
  INITIAL_AUDIT_LOGS,
  CURRENT_USER,
  MOCK_USERS,
} from './data';

const STORAGE_KEYS = {
  AUTH: 'nawi_auth_state',
  INSTRUMENTS: 'nawi_instruments',
  TEST_SESSIONS: 'nawi_test_sessions',
  REPORTS: 'nawi_reports',
  AUDIT_LOGS: 'nawi_audit_logs',
  USERS: 'nawi_users',
};

import { isSupabaseConfigured } from '../lib/supabase';

// Auth helper
export function getAuthState(): { isAuthenticated: boolean; user: User | null } {
  // When Supabase is configured, localStorage is NOT an authentication authority
  if (isSupabaseConfigured()) {
    localStorage.removeItem(STORAGE_KEYS.AUTH);
    return { isAuthenticated: false, user: null };
  }

  const saved = localStorage.getItem(STORAGE_KEYS.AUTH);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed.isAuthenticated === 'boolean') {
        return parsed;
      }
    } catch {
      // fallback
    }
  }
  return { isAuthenticated: true, user: CURRENT_USER };
}

export function setAuthState(isAuthenticated: boolean, user: User | null = CURRENT_USER) {
  if (isSupabaseConfigured()) {
    localStorage.removeItem(STORAGE_KEYS.AUTH);
    return;
  }
  localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify({ isAuthenticated, user }));
}

// Instruments store
export function getInstrumentsStore(): Instrument[] {
  const saved = localStorage.getItem(STORAGE_KEYS.INSTRUMENTS);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // fallback
    }
  }
  localStorage.setItem(STORAGE_KEYS.INSTRUMENTS, JSON.stringify(INITIAL_INSTRUMENTS));
  return INITIAL_INSTRUMENTS;
}

export function addInstrument(instrument: Instrument): Instrument[] {
  const current = getInstrumentsStore();
  const updated = [instrument, ...current];
  localStorage.setItem(STORAGE_KEYS.INSTRUMENTS, JSON.stringify(updated));
  
  // Add audit log
  addAuditLog({
    id: `LOG-${Date.now()}`,
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    user: CURRENT_USER.name,
    role: CURRENT_USER.role,
    action: 'Instrument Registered',
    details: `Registered ${instrument.model.modelName} (${instrument.id})`,
    instrumentOrSessionId: instrument.id,
  });

  return updated;
}

// Test Sessions store
export function getTestSessionsStore(): TestSession[] {
  return testSessionService.getAllSessions();
}

export function updateTestSession(session: TestSession): TestSession[] {
  return testSessionService.saveSession(session);
}

export function resetGuidedDemoSession(): TestSession[] {
  const current = getTestSessionsStore();
  const initialDemo = INITIAL_TEST_SESSIONS.find((s) => s.id === 'TS-2026-101') || INITIAL_TEST_SESSIONS[0];

  const resetDemo: TestSession = {
    ...initialDemo,
    progress: 0,
    status: 'In Progress',
    workflowStatus: 'IN_PROGRESS',
    weighingObservations: [],
    repeatabilityObservations: [],
    eccentricityObservations: [],
    discriminationObservations: [],
    zeroSettingObservations: [],
    tareObservations: [],
    tareTestSession: undefined,
    submittedBy: undefined,
    submittedAt: undefined,
    reviewedBy: undefined,
    reviewedAt: undefined,
    reviewerComments: undefined,
    approvedBy: undefined,
    approvedAt: undefined,
    finalizedBy: undefined,
    finalizedAt: undefined,
    workflowHistory: [
      {
        id: `wh-reset-${Date.now()}`,
        fromStatus: 'RESET',
        toStatus: 'IN_PROGRESS',
        user: 'Dr. Ananya Rao',
        role: 'Testing Officer',
        timestamp: new Date().toISOString().substring(0, 16),
        comment: 'Guided SIH Demo session reset to clean initial state.',
      },
    ],
  };

  const updatedList = current.map((s) => (s.id === 'TS-2026-101' ? resetDemo : s));
  localStorage.setItem(STORAGE_KEYS.TEST_SESSIONS, JSON.stringify(updatedList));

  addAuditLog({
    id: `LOG-${Date.now()}`,
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    user: 'Dr. Ananya Rao',
    role: 'Testing Officer',
    action: 'Reset Guided Demo Session',
    details: 'Reset TS-2026-101 (MetriScale Pro 500) to clean starting evaluation state.',
    instrumentOrSessionId: 'TS-2026-101',
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('nawi_session_updated'));
    window.dispatchEvent(new Event('storage'));
  }

  return updatedList;
}

// Reports store
export function getReportsStore(): Report[] {
  const saved = localStorage.getItem(STORAGE_KEYS.REPORTS);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // fallback
    }
  }
  localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(INITIAL_REPORTS));
  return INITIAL_REPORTS;
}

// Audit logs store
export function getAuditLogsStore(): AuditLog[] {
  const saved = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // fallback
    }
  }
  localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(INITIAL_AUDIT_LOGS));
  return INITIAL_AUDIT_LOGS;
}

export function addAuditLog(log: AuditLog): AuditLog[] {
  const current = getAuditLogsStore();
  const updated = [log, ...current];
  localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(updated));
  return updated;
}

// Users store
export function getUsersStore(): User[] {
  const saved = localStorage.getItem(STORAGE_KEYS.USERS);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // fallback
    }
  }
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(MOCK_USERS));
  return MOCK_USERS;
}
