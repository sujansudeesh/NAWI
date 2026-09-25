import React, { useState } from 'react';
import { Settings as SettingsIcon, Save, ShieldCheck, Building2, Sliders } from 'lucide-react';

export const Settings: React.FC = () => {
  const [labName, setLabName] = useState('National Legal Metrology Testing Laboratory');
  const [labApprovalNo, setLabApprovalNo] = useState('NML-LM-IND-2026-004');
  const [accreditationStandard, setAccreditationStandard] = useState('ISO/IEC 17025:2017');
  const [oimlVersion, setOimlVersion] = useState('OIML R-76-1 Edition 2006 (E)');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Laboratory settings updated successfully.');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">System & Metrology Settings</h2>
          <p className="text-xs text-slate-500 mt-1">
            Laboratory identification, OIML R-76 standard version defaults, and accreditation metadata.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-lg transition-colors shadow-xs"
        >
          <Save className="w-4 h-4" /> Save Configuration
        </button>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Lab Profile */}
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
            <Building2 className="w-4 h-4 text-teal-600" />
            <span>Laboratory Accreditation & Profile</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Laboratory Name</label>
              <input
                type="text"
                value={labName}
                onChange={(e) => setLabName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold focus:outline-hidden focus:border-teal-600"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Approval / Accreditation No.</label>
              <input
                type="text"
                value={labApprovalNo}
                onChange={(e) => setLabApprovalNo(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:outline-hidden focus:border-teal-600"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Accreditation Standard</label>
              <input
                type="text"
                value={accreditationStandard}
                onChange={(e) => setAccreditationStandard(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:border-teal-600"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Active OIML Recommendation</label>
              <input
                type="text"
                value={oimlVersion}
                onChange={(e) => setOimlVersion(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:border-teal-600"
              />
            </div>
          </div>
        </div>

        {/* Metrology Engine Info */}
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
            <Sliders className="w-4 h-4 text-teal-600" />
            <span>OIML R-76 MPE Engine Microservice Endpoint</span>
          </div>

          <div className="p-4 bg-slate-900 text-teal-300 rounded-xl font-mono text-xs space-y-2">
            <div className="flex items-center justify-between text-white font-bold">
              <span>Client-side Central Mock Engine Status</span>
              <span className="text-emerald-400 text-[11px] bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">ACTIVE (MOCK DATA LAYER)</span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans">
              All MPE tolerances (Class I, II, III, IV) and error formulas are routed through `src/utils/oimlEngine.ts` for clean backend integration.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
};
