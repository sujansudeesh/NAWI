import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Scale, Building2, Cpu, BarChart2, PlayCircle, UploadCloud, Plus } from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { DocumentViewer } from '../components/common/DocumentViewer';
import { documentService, DocumentRecord, DocumentType } from '../services/documentService';
import { instrumentService } from '../services/instrumentService';
import { testSessionService } from '../services/testSessionService';
import { authService } from '../services/authService';
import { useToast } from '../components/common/Toast';
import { calculateVerificationIntervals, calculateTestProgress } from '../utils/metrologyService';
import { Instrument, TestSession } from '../types';

export const InstrumentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [instrument, setInstrument] = useState<Instrument | null>(null);
  const [relatedSessions, setRelatedSessions] = useState<TestSession[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<DocumentType>('INSTRUMENT_PHOTO');

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const inst = await instrumentService.getInstrumentById(id);
      if (inst) {
        setInstrument(inst);
        const sessions = await testSessionService.getAllSessionsAsync();
        setRelatedSessions(sessions.filter((s) => s.instrumentId === inst.id || s.instrumentId === id));
        const docs = await documentService.getDocuments({ instrumentId: inst.id });
        setDocuments(docs);
      }
    } catch (err) {
      console.error('Error loading instrument details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !instrument) return;

    setUploading(true);
    try {
      const userProfile = await authService.getCurrentProfile();
      const uploaded = await documentService.uploadDocument({
        file,
        documentType: selectedDocType,
        instrumentId: instrument.id,
        userProfile: userProfile || undefined,
        description: `Uploaded ${selectedDocType.toLowerCase().replace('_', ' ')} for ${instrument.model.modelName}`,
      });

      setDocuments((prev) => [uploaded, ...prev]);
      showToast('Document Uploaded', `${file.name} saved to secure instrument storage.`, 'success');
    } catch (err: any) {
      showToast('Upload Error', err.message || 'Failed to upload document.', 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteDocument = async (doc: DocumentRecord) => {
    try {
      const userProfile = await authService.getCurrentProfile();
      await documentService.deleteDocument(doc, userProfile || undefined);
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      showToast('Document Deleted', `Removed ${doc.fileName}`, 'info');
    } catch (err: any) {
      showToast('Delete Error', err.message || 'Unable to delete document.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-slate-400 space-y-3">
        <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs">Loading instrument profile and legal metrology documentation...</p>
      </div>
    );
  }

  if (!instrument) {
    return (
      <div className="py-12 text-center text-slate-500 space-y-3">
        <p className="font-bold text-slate-700">Instrument Record Not Found</p>
        <button onClick={() => navigate('/instruments')} className="text-xs font-semibold text-teal-600 hover:underline">
          Back to Instruments Registry
        </button>
      </div>
    );
  }

  const maxUnit = instrument.metrology.maxUnit;
  const minUnit = instrument.metrology.minUnit;
  const dUnit = instrument.metrology.dUnit;
  const eUnit = instrument.metrology.eUnit;
  const n = instrument.metrology.verificationScaleIntervalsN ?? calculateVerificationIntervals(
    instrument.metrology.maxCapacity,
    maxUnit,
    instrument.metrology.verificationIntervalE,
    eUnit
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Back button & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate('/instruments')}
          className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Instruments Registry
        </button>

        <div className="flex items-center gap-3">
          <Link
            to={`/test-sessions?instrumentId=${instrument.id}`}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-lg transition-colors shadow-xs"
          >
            <PlayCircle className="w-4 h-4" /> Start OIML Test Session
          </Link>
        </div>
      </div>

      {/* Main Spec Card Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-slate-900 text-teal-400 rounded-xl">
              <Scale className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">{instrument.model.modelName}</h2>
                <Badge status={instrument.status} />
              </div>
              <p className="text-xs text-slate-500 font-mono">
                REG ID: {instrument.id} • S/N: {instrument.model.serialNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-600 font-medium overflow-x-auto pb-1">
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center min-w-[90px]">
              <span className="text-[10px] uppercase text-slate-400 block font-bold">Class</span>
              <span className="font-bold text-slate-900">{instrument.metrology.accuracyClass}</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center min-w-[90px]">
              <span className="text-[10px] uppercase text-slate-400 block font-bold">Min</span>
              <span className="font-bold text-slate-900">{instrument.metrology.minCapacity} {minUnit}</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center min-w-[90px]">
              <span className="text-[10px] uppercase text-slate-400 block font-bold">Max</span>
              <span className="font-bold text-slate-900">{instrument.metrology.maxCapacity} {maxUnit}</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center min-w-[90px]">
              <span className="text-[10px] uppercase text-slate-400 block font-bold">Interval (e)</span>
              <span className="font-bold text-teal-700 font-mono">{instrument.metrology.verificationIntervalE} {eUnit}</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center min-w-[90px]">
              <span className="text-[10px] uppercase text-slate-400 block font-bold">Intervals (n)</span>
              <span className="font-bold text-slate-900 font-mono">{n > 0 ? n.toLocaleString() : '-'}</span>
            </div>
          </div>
        </div>

        {/* 3 Detail Grid Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Column 1: Manufacturer */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-900 pb-1 border-b border-slate-100">
              <Building2 className="w-4 h-4 text-teal-600" />
              <span>Manufacturer Details</span>
            </div>
            <div className="space-y-1 text-slate-600">
              <p className="font-semibold text-slate-900">{instrument.manufacturer.name}</p>
              <p>{instrument.manufacturer.address}</p>
              <p>Country: <span className="font-medium text-slate-800">{instrument.manufacturer.country}</span></p>
              <p>Contact: <span className="font-medium text-slate-800">{instrument.manufacturer.contactPerson}</span></p>
              <p>Email: <span className="font-mono text-slate-800">{instrument.manufacturer.email}</span></p>
            </div>
          </div>

          {/* Column 2: Equipment Model */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-900 pb-1 border-b border-slate-100">
              <Cpu className="w-4 h-4 text-teal-600" />
              <span>Equipment Specs</span>
            </div>
            <div className="space-y-1 text-slate-600">
              <p>Type: <span className="font-semibold text-slate-900">{instrument.model.instrumentType}</span></p>
              <p>Firmware: <span className="font-mono text-slate-800">{instrument.model.firmwareVersion}</span></p>
              <p>Year: <span className="font-medium text-slate-800">{instrument.model.yearOfManufacture}</span></p>
              <p>Intended Use: <span className="font-medium text-slate-800">{instrument.model.intendedApplication}</span></p>
            </div>
          </div>

          {/* Column 3: Metrology Characteristics */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-900 pb-1 border-b border-slate-100">
              <BarChart2 className="w-4 h-4 text-teal-600" />
              <span>Metrological Specs (OIML R-76)</span>
            </div>
            <div className="space-y-1.5 text-slate-600">
              <p>Accuracy Class: <span className="font-bold text-slate-900">{instrument.metrology.accuracyClass}</span></p>
              <p>Maximum Capacity (Max): <span className="font-semibold text-slate-900">{instrument.metrology.maxCapacity} {maxUnit}</span></p>
              <p>Minimum Capacity (Min): <span className="font-semibold text-slate-900">{instrument.metrology.minCapacity} {minUnit}</span></p>
              <p>Scale Interval (d): <span className="font-mono font-semibold text-slate-900">{instrument.metrology.scaleIntervalD} {dUnit}</span></p>
              <p>Verification Interval (e): <span className="font-mono font-bold text-teal-700">{instrument.metrology.verificationIntervalE} {eUnit}</span></p>
              <p>Scale Intervals Count (n): <span className="font-mono font-bold text-slate-900">{n > 0 ? n.toLocaleString() : '-'}</span></p>
              <p>Subtractive Tare: <span className="font-semibold text-slate-900">{instrument.metrology.tareRange || '-'} {maxUnit}</span></p>
              <p>Temp Limits: <span className="font-semibold text-slate-900">{instrument.metrology.tempRangeMin}°C to {instrument.metrology.tempRangeMax}°C</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* DOCUMENT & PHOTO UPLOAD SECTION */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-teal-600" />
              Upload Instrument Documentation & Photos
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Attach official nameplate photos, technical datasheets, user manuals or pattern approvals.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedDocType}
              onChange={(e) => setSelectedDocType(e.target.value as DocumentType)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-hidden"
            >
              <option value="INSTRUMENT_PHOTO">Instrument Photo</option>
              <option value="NAMEPLATE_PHOTO">Nameplate Photo</option>
              <option value="TECHNICAL_DATASHEET">Technical Datasheet</option>
              <option value="USER_MANUAL">User Manual</option>
              <option value="PREVIOUS_CERTIFICATE">Previous Certificate</option>
              <option value="OTHER">Other Document</option>
            </select>

            <label className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg cursor-pointer transition-colors shadow-xs">
              <Plus className="w-3.5 h-3.5" />
              <span>{uploading ? 'Uploading...' : 'Upload File'}</span>
              <input type="file" onChange={handleFileUpload} disabled={uploading} className="hidden" accept="image/*,.pdf,.docx" />
            </label>
          </div>
        </div>

        {/* Render DocumentViewer */}
        <DocumentViewer
          documents={documents}
          onDelete={handleDeleteDocument}
          canDelete={true}
          title="Instrument Documents & Nameplate Media"
          allowFilter={true}
        />
      </div>

      {/* Associated OIML Test Sessions */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Associated Evaluation Sessions</h3>
            <p className="text-xs text-slate-500">Historical test records and observations for this unit.</p>
          </div>
          <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md">
            {relatedSessions.length} Sessions Found
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                <th className="py-3 px-4">Test Session ID</th>
                <th className="py-3 px-4">Started On</th>
                <th className="py-3 px-4">Assigned Officer</th>
                <th className="py-3 px-4">Progress</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {relatedSessions.length > 0 ? (
                relatedSessions.map((session) => (
                  <tr
                    key={session.id}
                    onClick={() => navigate(`/test-sessions/${session.id}`)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{session.id}</td>
                    <td className="py-3.5 px-4 text-slate-600">{session.startedOn}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-800">{session.assignedOfficer}</td>
                    <td className="py-3.5 px-4 w-32">
                      {(() => {
                        const { percentage } = calculateTestProgress(session);
                        return (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-teal-500 rounded-full" style={{ width: `${percentage}%` }} />
                            </div>
                            <span className="text-[10px] font-mono text-slate-500">{percentage}%</span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge status={session.status} size="sm" />
                    </td>
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
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No active or completed test sessions recorded for this instrument yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
