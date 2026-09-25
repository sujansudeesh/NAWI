import React, { useState } from 'react';
import {
  Thermometer,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Zap,
  Check,
  Trash2,
} from 'lucide-react';
import {
  TestSession,
  AccuracyClass,
  MassUnit,
  UserRole,
} from '../../types';
import {
  generatePrescribedTemperatureStages,
  recordStaticTemperatureObservation,
  evaluateStaticTemperatureSession,
  StaticTemperatureObservation,
  TemperatureStageConfig,
} from '../../services/influenceTemperatureService';
import { useToast } from '../common/Toast';

interface StaticTemperatureWizardProps {
  session: TestSession;
  activeRole: UserRole;
  onUpdateSession: (updatedSession: TestSession) => void;
  isReadOnly?: boolean;
}

export const StaticTemperatureWizard: React.FC<StaticTemperatureWizardProps> = ({
  session,
  activeRole,
  onUpdateSession,
  isReadOnly = false,
}) => {
  const { showToast } = useToast();

  const minTemp = -10;
  const maxTemp = 40;
  const accuracyClass = session.accuracyClass || 'Class III';

  const stages = generatePrescribedTemperatureStages(accuracyClass, minTemp, maxTemp);
  const existingObs: StaticTemperatureObservation[] = session.staticTemperatureObservations || [];

  const [activeStageId, setActiveStageId] = useState<string>(stages[0]?.id || 'STAGE_20C_REF');

  // Input state for active stage
  const currentStage = stages.find((s) => s.id === activeStageId) || stages[0];
  const [actualTempInput, setActualTempInput] = useState<string>(currentStage.targetTemp.toString());
  const [humidityInput, setHumidityInput] = useState<string>('50');
  const [soakTimeInput, setSoakTimeInput] = useState<string>(currentStage.defaultSoakTimeMinutes.toString());
  const [refLoadInput, setRefLoadInput] = useState<string>('10.0');
  const [scaleReadingInput, setScaleReadingInput] = useState<string>('10.002');
  const [zeroIndicationInput, setZeroIndicationInput] = useState<string>('0.000');
  const [notesInput, setNotesInput] = useState<string>('');

  const parseInterval = (str?: string): { eVal: number; eUnit: MassUnit } => {
    if (!str) return { eVal: 5, eUnit: 'g' };
    const parts = str.trim().split(/\s+/);
    const val = parseFloat(parts[0]);
    const unit = (parts[1] as MassUnit) || 'g';
    return { eVal: isNaN(val) ? 5 : val, eUnit: unit };
  };

  const { eVal, eUnit } = parseInterval(session.verificationInterval);

  const handleStageSelect = (stage: TemperatureStageConfig) => {
    setActiveStageId(stage.id);
    setActualTempInput(stage.targetTemp.toString());
    setSoakTimeInput(stage.defaultSoakTimeMinutes.toString());

    // Populate existing if available
    const existing = existingObs.find((o) => o.stageId === stage.id);
    if (existing) {
      setActualTempInput(existing.actualTemperature.toString());
      setHumidityInput(existing.relativeHumidity.toString());
      setSoakTimeInput(existing.soakTimeMinutes.toString());
      setRefLoadInput(existing.referenceLoad.toString());
      setScaleReadingInput(existing.indicatedValue.toString());
      setZeroIndicationInput(existing.zeroIndication.toString());
      setNotesInput(existing.notes || '');
    }
  };

  const handleSaveObservation = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    const actualTemp = parseFloat(actualTempInput);
    const humidity = parseFloat(humidityInput);
    const soakMins = parseInt(soakTimeInput, 10);
    const refLoad = parseFloat(refLoadInput);
    const scaleReading = parseFloat(scaleReadingInput);
    const zeroInd = parseFloat(zeroIndicationInput) || 0;

    if (isNaN(actualTemp) || isNaN(refLoad) || isNaN(scaleReading)) {
      showToast('Invalid Input', 'Please enter valid numerical temperature and load values.', 'warning');
      return;
    }

    const newObs = recordStaticTemperatureObservation({
      stageId: currentStage.id,
      stageLabel: currentStage.label,
      targetTemperature: currentStage.targetTemp,
      actualTemperature: actualTemp,
      relativeHumidity: isNaN(humidity) ? 50 : humidity,
      soakTimeMinutes: isNaN(soakMins) ? 60 : soakMins,
      referenceLoad: refLoad,
      loadUnit: 'kg',
      indicatedValue: scaleReading,
      zeroIndication: zeroInd,
      accuracyClass,
      verificationIntervalE: eVal,
      eUnit,
      notes: notesInput,
    });

    const filtered = existingObs.filter((o) => o.stageId !== currentStage.id);
    const updatedObsList = [...filtered, newObs].sort((a, b) => {
      const idxA = stages.findIndex((s) => s.id === a.stageId);
      const idxB = stages.findIndex((s) => s.id === b.stageId);
      return idxA - idxB;
    });

    const sessionEval = evaluateStaticTemperatureSession({
      specifiedMinTemp: minTemp,
      specifiedMaxTemp: maxTemp,
      accuracyClass,
      observations: updatedObsList,
    });

    const updatedSession: TestSession = {
      ...session,
      staticTemperatureObservations: updatedObsList,
      staticTemperatureSession: sessionEval as any,
    };

    onUpdateSession(updatedSession);
    showToast(
      'Observation Saved',
      `${currentStage.label}: Error = ${newObs.calculatedError > 0 ? '+' : ''}${newObs.calculatedError} kg (${newObs.passed ? 'Within MPE' : 'Exceeds MPE'})`,
      newObs.passed ? 'success' : 'warning'
    );
  };

  const handleDeleteObservation = (stageId: string) => {
    if (isReadOnly) return;
    const updatedObsList = existingObs.filter((o) => o.stageId !== stageId);
    const sessionEval = evaluateStaticTemperatureSession({
      specifiedMinTemp: minTemp,
      specifiedMaxTemp: maxTemp,
      accuracyClass,
      observations: updatedObsList,
    });
    const updatedSession: TestSession = {
      ...session,
      staticTemperatureObservations: updatedObsList,
      staticTemperatureSession: sessionEval as any,
    };
    onUpdateSession(updatedSession);
    showToast('Observation Removed', 'Static temperature observation point removed.', 'info');
  };

  const evaluatedSession = evaluateStaticTemperatureSession({
    specifiedMinTemp: minTemp,
    specifiedMaxTemp: maxTemp,
    accuracyClass,
    observations: existingObs,
  });

  return (
    <div className="space-y-6 text-xs">
      {/* Top Protocol Banner */}
      <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl shadow-md space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Thermometer className="w-5 h-5 text-teal-400" />
              <h3 className="text-base font-extrabold text-white">
                OIML R 76-1:2006 Static Temperature Test Protocol (Clause 5.3.1 / A.5.3.1)
              </h3>
            </div>
            <p className="text-xs text-slate-300">
              Prescribed Operating Temperature Range:{' '}
              <span className="font-mono font-bold text-teal-300">
                {minTemp} °C to +{maxTemp} °C
              </span>{' '}
              ({maxTemp - minTemp} °C Span) • Tolerance: <span className="font-mono font-bold text-slate-100">Table 6 MPE</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1.5 font-extrabold text-xs rounded-lg border flex items-center gap-1.5 ${
                evaluatedSession.overallResult === 'COMPLETED_WITHIN_LIMITS'
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                  : evaluatedSession.overallResult === 'NEEDS_ATTENTION'
                  ? 'bg-rose-950 text-rose-300 border-rose-700'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              {evaluatedSession.overallResult === 'COMPLETED_WITHIN_LIMITS' ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> COMPLETED WITHIN LIMITS
                </>
              ) : evaluatedSession.overallResult === 'NEEDS_ATTENTION' ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-rose-400" /> EXCEEDS MPE LIMITS
                </>
              ) : (
                `PROGRESS: ${existingObs.length} OF ${stages.length} STAGES`
              )}
            </span>
          </div>
        </div>

        {/* Temperature Stage Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-1 select-none">
          {stages.map((stg) => {
            const obs = existingObs.find((o) => o.stageId === stg.id);
            const isSelected = activeStageId === stg.id;

            return (
              <button
                key={stg.id}
                type="button"
                onClick={() => handleStageSelect(stg)}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-teal-600 text-white border-teal-400 shadow-md ring-2 ring-teal-300'
                    : obs
                    ? obs.passed
                      ? 'bg-emerald-950/80 text-emerald-200 border-emerald-800'
                      : 'bg-rose-950/80 text-rose-200 border-rose-800'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                }`}
              >
                <div className="text-[10px] font-bold opacity-80 uppercase block truncate">
                  {stg.id.replace('STAGE_', '')}
                </div>
                <div className="font-extrabold text-xs mt-0.5 truncate">{stg.label.split(':')[1] || stg.label}</div>
                <div className="text-[10px] mt-1 opacity-90 flex items-center justify-between">
                  <span>{stg.targetTemp > 0 ? `+${stg.targetTemp}` : stg.targetTemp} °C</span>
                  {obs && <span>{obs.passed ? '✓ Pass' : '✕ Fail'}</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stage Data Entry Form & Observation Record */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Form */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h4 className="text-sm font-extrabold text-slate-900">{currentStage.label}</h4>
              <p className="text-xs text-slate-500">{currentStage.description}</p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">
              Target: {currentStage.targetTemp > 0 ? `+${currentStage.targetTemp}` : currentStage.targetTemp} °C
            </span>
          </div>

          <form onSubmit={handleSaveObservation} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="font-bold text-slate-800 block">Actual Chamber Temp (°C) *</label>
                <input
                  type="number"
                  step="0.1"
                  value={actualTempInput}
                  onChange={(e) => setActualTempInput(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-mono text-slate-900 font-bold focus:ring-2 focus:ring-teal-500"
                  required
                  disabled={isReadOnly}
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-800 block">Relative Humidity (%) *</label>
                <input
                  type="number"
                  step="1"
                  value={humidityInput}
                  onChange={(e) => setHumidityInput(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-mono text-slate-900 focus:ring-2 focus:ring-teal-500"
                  required
                  disabled={isReadOnly}
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-800 block">Soak Time (Minutes) *</label>
                <input
                  type="number"
                  step="5"
                  value={soakTimeInput}
                  onChange={(e) => setSoakTimeInput(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-mono text-slate-900 focus:ring-2 focus:ring-teal-500"
                  required
                  disabled={isReadOnly}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="font-bold text-slate-800 block">Certified Test Load (kg) *</label>
                <input
                  type="number"
                  step="0.001"
                  value={refLoadInput}
                  onChange={(e) => setRefLoadInput(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-mono text-slate-900 font-bold focus:ring-2 focus:ring-teal-500"
                  required
                  disabled={isReadOnly}
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-800 block">Zero Indication (kg)</label>
                <input
                  type="number"
                  step="0.001"
                  value={zeroIndicationInput}
                  onChange={(e) => setZeroIndicationInput(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-mono text-slate-900 focus:ring-2 focus:ring-teal-500"
                  disabled={isReadOnly}
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-800 block">Scale Reading (kg) *</label>
                <input
                  type="number"
                  step="0.001"
                  value={scaleReadingInput}
                  onChange={(e) => setScaleReadingInput(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-mono text-slate-900 font-bold focus:ring-2 focus:ring-teal-500"
                  required
                  disabled={isReadOnly}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-800 block">Notes / Chamber Observations</label>
              <input
                type="text"
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                placeholder="e.g. 2 hours soak time completed, temperature sensor calibrated."
                className="w-full p-2.5 rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-teal-500"
                disabled={isReadOnly}
              />
            </div>

            {!isReadOnly && (
              <button
                type="submit"
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Save Temperature Stage Observation
              </button>
            )}
          </form>
        </div>

        {/* Right 1 Col: Summary Observation Table */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-xs">
          <div className="border-b border-slate-100 pb-3">
            <h4 className="text-sm font-extrabold text-slate-900">Recorded Temperature Stages</h4>
            <p className="text-xs text-slate-500">Summary of logged temperature observations.</p>
          </div>

          {existingObs.length > 0 ? (
            <div className="space-y-3">
              {existingObs.map((obs) => (
                <div
                  key={obs.id}
                  className={`p-3 rounded-xl border space-y-1.5 ${
                    obs.passed ? 'bg-slate-50 border-slate-200' : 'bg-rose-50 border-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{obs.stageLabel.split(':')[0]}</span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 font-bold text-[10px] rounded ${
                          obs.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {obs.passed ? '✓ WITHIN MPE' : '✕ EXCEEDS MPE'}
                      </span>
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => handleDeleteObservation(obs.stageId)}
                          className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-700">
                    <div>
                      Temp: <span className="font-bold">{obs.actualTemperature} °C</span>
                    </div>
                    <div>
                      RH: <span className="font-bold">{obs.relativeHumidity}%</span>
                    </div>
                    <div>
                      Load: <span className="font-bold">{obs.referenceLoad} kg</span>
                    </div>
                    <div>
                      Error:{' '}
                      <span className={`font-bold ${obs.passed ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {obs.calculatedError > 0 ? '+' : ''}
                        {obs.calculatedError} kg
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl space-y-2">
              <Thermometer className="w-8 h-8 mx-auto text-slate-300" />
              <p>No temperature stage observations recorded yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
