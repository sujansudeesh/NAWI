import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { AuditLog } from '../types';
import { getAuditLogsStore, addAuditLog as addAuditLogToMockStore } from '../mock/store';

export const auditService = {
  /**
   * Fetch all audit events from append-only log table
   */
  async getAuditEvents(): Promise<AuditLog[]> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('audit_events')
        .select('*, profiles(full_name, role)')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((row) => ({
          id: row.id,
          timestamp: row.created_at ? new Date(row.created_at).toISOString().replace('T', ' ').substring(0, 19) : '',
          user: row.profiles?.full_name || 'System User',
          role: row.profiles?.role || 'Officer',
          action: row.action,
          details: typeof row.details === 'string' ? row.details : JSON.stringify(row.details?.description || row.details || ''),
          instrumentOrSessionId: row.session_id || row.instrument_id || row.entity_id || 'GENERAL',
        }));
      }
    }

    return getAuditLogsStore();
  },

  /**
   * Log an audit event
   */
  async logAuditEvent(event: {
    userId?: string;
    sessionId?: string;
    instrumentId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    details: any;
    userFullName?: string;
    userRole?: string;
  }): Promise<AuditLog> {
    const formattedDetails = typeof event.details === 'string' ? event.details : JSON.stringify(event.details);

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('audit_events')
        .insert({
          user_id: event.userId,
          session_id: event.sessionId,
          instrument_id: event.instrumentId,
          action: event.action,
          entity_type: event.entityType,
          entity_id: event.entityId,
          details: typeof event.details === 'object' ? event.details : { description: event.details },
        })
        .select('*, profiles(full_name, role)')
        .single();

      if (!error && data) {
        return {
          id: data.id,
          timestamp: new Date(data.created_at).toISOString().replace('T', ' ').substring(0, 19),
          user: data.profiles?.full_name || event.userFullName || 'System User',
          role: data.profiles?.role || event.userRole || 'Officer',
          action: data.action,
          details: formattedDetails,
          instrumentOrSessionId: data.session_id || data.instrument_id || data.entity_id || 'GENERAL',
        };
      }
    }

    // Local Fallback
    const newLog: AuditLog = {
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      user: event.userFullName || 'Dr. Ananya Rao',
      role: event.userRole || 'Testing Officer',
      action: event.action,
      details: formattedDetails,
      instrumentOrSessionId: event.sessionId || event.instrumentId || event.entityId || 'GENERAL',
    };

    addAuditLogToMockStore(newLog);
    return newLog;
  },
};
