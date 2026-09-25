import React, { useState, useEffect } from 'react';
import { Search, ShieldCheck } from 'lucide-react';
import { auditService } from '../services/auditService';
import { AuditLog } from '../types';

export const AuditTrail: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleSync = async () => {
      setLoading(true);
      const fetchedLogs = await auditService.getAuditEvents();
      setLogs(fetchedLogs);
      setLoading(false);
    };

    handleSync();

    window.addEventListener('storage', handleSync);
    window.addEventListener('nawi_session_updated', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('nawi_session_updated', handleSync);
    };
  }, []);

  const filteredLogs = logs.filter((log) => {
    return (
      searchTerm === '' ||
      log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.instrumentOrSessionId.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Laboratory Activity Audit Trail</h2>
          <p className="text-xs text-slate-500 mt-1">
            Append-only activity log designed to support laboratory traceability workflows.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 bg-slate-900 text-teal-400 font-mono text-xs rounded-lg flex items-center gap-1.5 font-bold">
            <ShieldCheck className="w-4 h-4" /> Traceability Log
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search audit trail by officer, action type, session ID or details..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
          />
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                <th className="py-3 px-4">Log ID & Timestamp</th>
                <th className="py-3 px-4">Officer / User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Action Event</th>
                <th className="py-3 px-4">Target Entity ID</th>
                <th className="py-3 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-sans">
                    Loading audit events...
                  </td>
                </tr>
              ) : filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900">{log.id}</div>
                    <div className="text-[10px] text-slate-400 font-sans">{log.timestamp}</div>
                  </td>
                  <td className="py-3.5 px-4 font-sans font-semibold text-slate-900">{log.user}</td>
                  <td className="py-3.5 px-4 font-sans text-slate-500">{log.role}</td>
                  <td className="py-3.5 px-4 font-sans">
                    <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-medium text-slate-800 text-[11px]">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-teal-700">{log.instrumentOrSessionId}</td>
                  <td className="py-3.5 px-4 font-sans text-slate-600">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
