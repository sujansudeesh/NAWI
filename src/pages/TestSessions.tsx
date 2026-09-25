import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ClipboardList, Plus, Search, Filter, PlayCircle, Eye, RefreshCw } from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { getTestSessionsStore, getInstrumentsStore, updateTestSession } from '../mock/store';
import { TestSession } from '../types';
import { calculateTestProgress } from '../utils/metrologyService';

import { testSessionService } from '../services/testSessionService';

export const TestSessions: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const filterInstId = searchParams.get('instrumentId') || '';
  const filterStatusParam = searchParams.get('status') || 'All';

  const [sessions, setSessions] = useState(() => testSessionService.getAllSessions());
  const instruments = getInstrumentsStore();

  const [searchTerm, setSearchTerm] = useState(filterInstId);
  const [statusFilter, setStatusFilter] = useState(filterStatusParam);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInstId, setSelectedInstId] = useState(instruments[0]?.id || '');

  React.useEffect(() => {
    const handleSync = () => {
      setSessions(testSessionService.getAllSessions());
    };

    handleSync();

    window.addEventListener('storage', handleSync);
    window.addEventListener('nawi_session_updated', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('nawi_session_updated', handleSync);
    };
  }, []);

  const filteredSessions = sessions.filter((s) => {
    const matchesSearch =
      searchTerm === '' ||
      s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.instrumentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.instrumentModel.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.manufacturer.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'All' ||
      s.status === statusFilter ||
      s.workflowStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    const inst = instruments.find((i) => i.id === selectedInstId) || instruments[0];

    const newSession: TestSession = {
      id: `TS-2026-${Math.floor(100 + Math.random() * 900)}`,
      instrumentId: inst.id,
      instrumentModel: inst.model.modelName,
      serialNumber: inst.model.serialNumber,
      manufacturer: inst.manufacturer.name,
      accuracyClass: inst.metrology.accuracyClass,
      maxCapacity: `${inst.metrology.maxCapacity} ${inst.metrology.maxUnit}`,
      verificationInterval: `${inst.metrology.verificationIntervalE} ${inst.metrology.eUnit}`,
      startedOn: new Date().toISOString().replace('T', ' ').substring(0, 16),
      progress: 0,
      status: 'In Progress',
      assignedOfficer: 'Dr. Ananya Rao',
      ambientTemp: 22.0,
      relativeHumidity: 50,
      barometricPressure: 1013.0,
      weighingObservations: [],
      repeatabilityObservations: [],
      eccentricityObservations: [],
      tareObservations: [],
      discriminationObservations: [],
    };

    updateTestSession(newSession);
    setSessions(getTestSessionsStore());
    setIsModalOpen(false);
    navigate(`/test-sessions/${newSession.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">OIML R-76 Test Sessions</h2>
          <p className="text-xs text-slate-500 mt-1">
            Active evaluation logs, prescribed test observations, and compliance reviews.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-lg transition-colors shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4" />
          Start New Test Session
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Test ID, Instrument ID, model, or manufacturer..."
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full md:w-auto">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 hidden md:block" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full md:w-auto px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-hidden focus:border-teal-600"
            >
              <option value="All">All Test Session Statuses</option>
              <option value="In Progress">In Progress</option>
              <option value="Awaiting Review">Awaiting Review</option>
              <option value="Compliant">Compliant</option>
              <option value="Non-Compliant">Non-Compliant</option>
              <option value="Finalized">Finalized</option>
            </select>
          </div>

          <button
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('All');
            }}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
            title="Reset Filters"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Test Sessions Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                <th className="py-3 px-4">Test ID</th>
                <th className="py-3 px-4">Instrument ID</th>
                <th className="py-3 px-4">Model & Manufacturer</th>
                <th className="py-3 px-4">Class</th>
                <th className="py-3 px-4">Started On</th>
                <th className="py-3 px-4">Progress</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Officer</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredSessions.map((session) => (
                <tr
                  key={session.id}
                  onClick={() => navigate(`/test-sessions/${session.id}`)}
                  className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                >
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{session.id}</td>
                  <td className="py-3.5 px-4 font-mono text-slate-600">{session.instrumentId}</td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900">{session.instrumentModel}</div>
                    <div className="text-[10px] text-slate-500">{session.manufacturer}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge status={session.accuracyClass} size="sm" />
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">{session.startedOn}</td>
                  <td className="py-3.5 px-4 w-32">
                    {(() => {
                      const { percentage } = calculateTestProgress(session);
                      return (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                percentage === 100 ? 'bg-emerald-500' : 'bg-teal-500'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-slate-500">{percentage}%</span>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge status={session.status} size="sm" />
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 font-medium">{session.assignedOfficer}</td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/test-sessions/${session.id}`);
                      }}
                      className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[11px] rounded transition-colors"
                    >
                      Open Workspace
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Start New Session Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Initiate OIML R-76 Test Session"
        subtitle="Select a registered instrument to begin prescribed metrological evaluations."
        maxWidth="md"
      >
        <form onSubmit={handleCreateSession} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select Registered Instrument
            </label>
            <select
              value={selectedInstId}
              onChange={(e) => setSelectedInstId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:outline-hidden focus:border-teal-600"
            >
              {instruments.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.id} — {inst.model.modelName} ({inst.metrology.accuracyClass}, S/N: {inst.model.serialNumber})
                </option>
              ))}
            </select>
          </div>

          <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg text-xs text-teal-800 space-y-1">
            <p className="font-semibold">OIML R-76 Evaluation Protocol</p>
            <p className="text-[11px] text-teal-700">
              Initializes prescribed test modules: Weighing performance, repeatability, eccentricity loading, subtractive tare, and discrimination.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg transition-colors shadow-xs"
            >
              <PlayCircle className="w-4 h-4" /> Start Evaluation Workspace
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
