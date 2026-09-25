import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../common/Modal';
import { getInstrumentsStore, updateTestSession } from '../../mock/store';
import { TestSession } from '../../types';
import { PlayCircle, Scale, Thermometer, CheckSquare, ChevronRight, Check } from 'lucide-react';
import { useToast } from '../common/Toast';

import { generateRecommendedTestPlan, getDefaultAdministrativeChecklist } from '../../services/testPlanService';

interface StartTestWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StartTestWizardModal: React.FC<StartTestWizardModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const instruments = getInstrumentsStore();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form state
  const [selectedInstId, setSelectedInstId] = useState(instruments[0]?.id || '');
  const [ambientTemp, setAmbientTemp] = useState<number>(22.0);
  const [humidity, setHumidity] = useState<number>(50);
  const [pressure, setPressure] = useState<number>(1013.2);
  const [officerName, setOfficerName] = useState<string>('Dr. Ananya Rao');

  const selectedInst = instruments.find((i) => i.id === selectedInstId) || instruments[0];

  const handleStartTesting = (e: React.FormEvent) => {
    e.preventDefault();

    const generatedPlan = generateRecommendedTestPlan(selectedInst, 'TYPE_EXAMINATION');
    const adminChecklist = getDefaultAdministrativeChecklist();

    const newSession: TestSession = {
      id: `TS-2026-${Math.floor(100 + Math.random() * 900)}`,
      instrumentId: selectedInst.id,
      instrumentModel: selectedInst.model.modelName,
      serialNumber: selectedInst.model.serialNumber,
      manufacturer: selectedInst.manufacturer.name,
      accuracyClass: selectedInst.metrology.accuracyClass,
      maxCapacity: `${selectedInst.metrology.maxCapacity} ${selectedInst.metrology.maxUnit}`,
      verificationInterval: `${selectedInst.metrology.verificationIntervalE} ${selectedInst.metrology.eUnit}`,
      startedOn: new Date().toISOString().replace('T', ' ').substring(0, 16),
      progress: 0,
      status: 'In Progress',
      workflowStatus: 'IN_PROGRESS',
      testContext: 'TYPE_EXAMINATION',
      assignedOfficer: officerName,
      ambientTemp,
      relativeHumidity: humidity,
      barometricPressure: pressure,
      eccentricityTestLoad: 10.0,
      weighingObservations: [],
      repeatabilityObservations: [],
      eccentricityObservations: [],
      tareObservations: [],
      discriminationObservations: [],
      testPlan: generatedPlan,
      administrativeChecklist: adminChecklist,
    };

    updateTestSession(newSession);
    showToast('Test Session Created', `Started evaluation for ${selectedInst.model.modelName} (${newSession.id})`, 'success');
    onClose();
    navigate(`/test-sessions/${newSession.id}`);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Start New OIML Test Session"
      subtitle="Complete the 4-step setup wizard to initialize metrological evaluation."
      maxWidth="xl"
    >
      <div className="space-y-4">
        {/* Stepper Progress */}
        <div className="grid grid-cols-4 gap-2 text-xs font-semibold select-none pb-2 border-b border-slate-100">
          <div className={`p-2 rounded-lg text-center ${step === 1 ? 'bg-slate-900 text-white font-bold' : 'bg-slate-100 text-slate-500'}`}>
            1. Select Instrument
          </div>
          <div className={`p-2 rounded-lg text-center ${step === 2 ? 'bg-slate-900 text-white font-bold' : 'bg-slate-100 text-slate-500'}`}>
            2. Lab Details
          </div>
          <div className={`p-2 rounded-lg text-center ${step === 3 ? 'bg-slate-900 text-white font-bold' : 'bg-slate-100 text-slate-500'}`}>
            3. Test Plan
          </div>
          <div className={`p-2 rounded-lg text-center ${step === 4 ? 'bg-slate-900 text-white font-bold' : 'bg-slate-100 text-slate-500'}`}>
            4. Confirm & Start
          </div>
        </div>

        {/* STEP 1: Select Instrument */}
        {step === 1 && (
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Select Registered Instrument *</label>
              <select
                value={selectedInstId}
                onChange={(e) => setSelectedInstId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:outline-hidden focus:border-teal-600"
              >
                {instruments.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.id} — {inst.model.modelName} ({inst.metrology.accuracyClass}, S/N: {inst.model.serialNumber})
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Instrument Preview Card */}
            {selectedInst && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between font-bold text-slate-900">
                  <span>{selectedInst.model.modelName}</span>
                  <span className="text-teal-700 font-mono">{selectedInst.metrology.accuracyClass}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-600 text-[11px]">
                  <p>Manufacturer: <span className="font-medium text-slate-800">{selectedInst.manufacturer.name}</span></p>
                  <p>Serial Number: <span className="font-mono text-slate-800">{selectedInst.model.serialNumber}</span></p>
                  <p>Max Capacity: <span className="font-bold text-slate-900">{selectedInst.metrology.maxCapacity} {selectedInst.metrology.maxUnit}</span></p>
                  <p>Interval (e): <span className="font-bold text-slate-900">{selectedInst.metrology.verificationIntervalE} {selectedInst.metrology.eUnit}</span></p>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg transition-colors"
              >
                Continue to Lab Details <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Laboratory Environmental Details */}
        {step === 2 && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ambient Temperature (°C) *</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={ambientTemp}
                  onChange={(e) => setAmbientTemp(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Relative Humidity (%) *</label>
                <input
                  type="number"
                  required
                  value={humidity}
                  onChange={(e) => setHumidity(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Barometric Pressure (hPa) *</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={pressure}
                  onChange={(e) => setPressure(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Testing Officer Name *</label>
                <input
                  type="text"
                  required
                  value={officerName}
                  onChange={(e) => setOfficerName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold"
                />
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg transition-colors"
              >
                Continue to Test Plan <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Recommended Test Plan Preview */}
        {step === 3 && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-900 text-white rounded-lg space-y-1">
              <span className="text-[10px] font-mono text-teal-400 font-bold uppercase">OIML R 76 Recommendation Engine</span>
              <h4 className="font-bold text-xs">Recommended Test Plan for {selectedInst.model.modelName}</h4>
              <p className="text-[11px] text-slate-300">
                Evaluation Context: <strong>Type Examination</strong> • Accuracy Class: <strong>{selectedInst.metrology.accuracyClass}</strong>
              </p>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {generateRecommendedTestPlan(selectedInst, 'TYPE_EXAMINATION').map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-lg border text-xs flex items-center justify-between gap-3 ${
                    item.status === 'APPLICABLE'
                      ? 'bg-slate-50 border-slate-200'
                      : item.status === 'NOT_APPLICABLE'
                      ? 'bg-slate-100/70 border-slate-200 text-slate-500'
                      : 'bg-amber-50 border-amber-200'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{item.name}</span>
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-200/70 px-1.5 py-0.5 rounded">
                        {item.ruleReference}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 italic">{item.reason}</p>
                  </div>

                  <div>
                    {item.status === 'APPLICABLE' && (
                      <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-md border border-emerald-300">
                        ✓ APPLICABLE
                      </span>
                    )}
                    {item.status === 'NOT_APPLICABLE' && (
                      <span className="text-[10px] font-extrabold text-slate-600 bg-slate-200 px-2 py-1 rounded-md border border-slate-300">
                        🚫 NOT APPLICABLE
                      </span>
                    )}
                    {item.status === 'REQUIRES_LAB_CONFIRMATION' && (
                      <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100 px-2 py-1 rounded-md border border-amber-300">
                        ⚠️ CONFIRM
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg transition-colors"
              >
                Continue to Confirm <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Confirm & Start */}
        {step === 4 && (
          <form onSubmit={handleStartTesting} className="space-y-4 text-xs">
            <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2">
              <h4 className="font-bold text-teal-400">Ready to Start Test Evaluation</h4>
              <p className="text-[11px] text-slate-300">
                Session will initialize with instrument <span className="font-bold text-white">{selectedInst.model.modelName}</span> (S/N: {selectedInst.model.serialNumber}).
              </p>
            </div>

            <div className="flex justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors"
              >
                Previous
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg transition-colors shadow-md shadow-teal-900/20"
              >
                <PlayCircle className="w-4 h-4" /> Initialize Test Workspace
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
