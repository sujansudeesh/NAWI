import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Building2,
  Cpu,
  BarChart2,
  FileCheck,
  Save,
  UploadCloud,
  CheckCircle2,
  PlayCircle,
  Eye,
} from 'lucide-react';
import { AccuracyClass, InstrumentType, Instrument, MassUnit } from '../types';
import { instrumentService } from '../services/instrumentService';
import { useToast } from '../components/common/Toast';
import { Modal } from '../components/common/Modal';
import {
  calculateVerificationIntervals,
  validateMetrologyInputs,
} from '../utils/metrologyService';

export const RegisterInstrument: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Success Post-Registration Dialog State
  const [registeredInst, setRegisteredInst] = useState<Instrument | null>(null);

  // Form State - Step 1: Basic Info
  const [mfgName, setMfgName] = useState('Mettler Toledo Metrology Ltd.');
  const [mfgAddress, setMfgAddress] = useState('Plot 42, Electronics City Phase II, Bengaluru');
  const [mfgCountry, setMfgCountry] = useState('India');
  const [mfgContactPerson, setMfgContactPerson] = useState('Rajesh K. Sharma');
  const [mfgEmail, setMfgEmail] = useState('r.sharma@mettler.demo');
  const [mfgPhone, setMfgPhone] = useState('+91 98765 43210');

  // Form State - Step 2: Metrological Characteristics (OIML R-76)
  const [accuracyClass, setAccuracyClass] = useState<AccuracyClass>('Class III');
  const [maxCapacity, setMaxCapacity] = useState<number>(30);
  const [maxUnit, setMaxUnit] = useState<MassUnit>('kg');
  const [minCapacity, setMinCapacity] = useState<number>(0.1);
  const [minUnit, setMinUnit] = useState<MassUnit>('kg');
  const [scaleIntervalD, setScaleIntervalD] = useState<number>(5);
  const [dUnit, setDUnit] = useState<MassUnit>('g');
  const [verificationIntervalE, setVerificationIntervalE] = useState<number>(5);
  const [eUnit, setEUnit] = useState<MassUnit>('g');
  const [tareRange, setTareRange] = useState<number>(15);
  const [tempMin, setTempMin] = useState<number>(10);
  const [tempMax, setTempMax] = useState<number>(40);
  const [isMultiInterval, setIsMultiInterval] = useState<boolean>(false);

  // Auto-calculated n = Max / e
  const calculatedN = calculateVerificationIntervals(
    maxCapacity,
    maxUnit,
    verificationIntervalE,
    eUnit
  );

  // Form State - Step 3: Technical Details
  const [instrumentType, setInstrumentType] = useState<InstrumentType>('Electronic Weighing Scale');
  const [modelName, setModelName] = useState('PrecisionPro XP-600');
  const [serialNumber, setSerialNumber] = useState(`XP600-${Math.floor(1000 + Math.random() * 9000)}`);
  const [firmwareVersion, setFirmwareVersion] = useState('v3.4.1-OIML');
  const [yearOfMfg, setYearOfMfg] = useState(2026);
  const [intendedApp, setIntendedApp] = useState('Commercial Trade Verification & Quality Inspection');

  // Automatic Weighing Exclusion Guard Modal State
  const [automaticExclusionModalOpen, setAutomaticExclusionModalOpen] = useState(false);
  const [automaticExclusionCategory, setAutomaticExclusionCategory] = useState('');

  const AUTOMATIC_WEIGHING_CATEGORIES = [
    'AUTOMATIC_CATCHWEIGHER',
    'AUTOMATIC_GRAVIMETRIC_FILLER',
    'CONTINUOUS_TOTALIZER',
    'AUTOMATIC_RAIL_WEIGHBRIDGE',
    'AUTOMATIC_WEIGHING_IN_MOTION',
  ];

  const handleInstrumentTypeChange = (val: string) => {
    if (AUTOMATIC_WEIGHING_CATEGORIES.includes(val)) {
      setAutomaticExclusionCategory(val.replace(/_/g, ' '));
      setAutomaticExclusionModalOpen(true);
      return;
    }
    setInstrumentType(val as InstrumentType);
  };

  const [notes, setNotes] = useState('Primary laboratory calibration reference unit.');

  const handleSaveDraft = () => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLastSaved(`Saved just now at ${timeStr}`);
    showToast('Draft Saved', 'Instrument registration progress preserved.', 'info');
  };

  const handleStep2Next = () => {
    const errorMsg = validateMetrologyInputs({
      accuracyClass,
      maxCapacity,
      maxUnit,
      minCapacity,
      minUnit,
      scaleIntervalD,
      dUnit,
      verificationIntervalE,
      eUnit,
    });

    if (errorMsg) {
      showToast('Validation Error', errorMsg, 'error');
      return;
    }

    setCurrentStep(3);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errorMsg = validateMetrologyInputs({
      accuracyClass,
      maxCapacity,
      maxUnit,
      minCapacity,
      minUnit,
      scaleIntervalD,
      dUnit,
      verificationIntervalE,
      eUnit,
    });

    if (errorMsg) {
      showToast('Validation Error', errorMsg, 'error');
      return;
    }

    setSaving(true);
    try {
      const finalN = calculateVerificationIntervals(
        maxCapacity,
        maxUnit,
        verificationIntervalE,
        eUnit
      );

      const newInst: Instrument = {
        id: `INS-2026-0${Math.floor(10 + Math.random() * 90)}`,
        manufacturer: {
          name: mfgName,
          address: mfgAddress,
          country: mfgCountry,
          contactPerson: mfgContactPerson,
          email: mfgEmail,
          phone: mfgPhone,
        },
        model: {
          instrumentType,
          modelName,
          serialNumber,
          firmwareVersion,
          yearOfManufacture: Number(yearOfMfg),
          intendedApplication: intendedApp,
        },
        metrology: {
          accuracyClass,
          maxCapacity: Number(maxCapacity),
          maxUnit,
          minCapacity: Number(minCapacity),
          minUnit,
          scaleIntervalD: Number(scaleIntervalD),
          dUnit,
          verificationIntervalE: Number(verificationIntervalE),
          eUnit,
          verificationScaleIntervalsN: finalN,
          tareRange: Number(tareRange),
          tempRangeMin: Number(tempMin),
          tempRangeMax: Number(tempMax),
          isMultiInterval,
        },
        registeredDate: new Date().toISOString().split('T')[0],
        lastEvaluated: 'Pending Initial Test',
        status: 'Under Evaluation',
        notes,
      };

      const saved = await instrumentService.saveInstrument(newInst);
      showToast('Instrument Registered', `${saved.model.modelName} saved to database.`, 'success');
      setRegisteredInst(saved);
    } catch (err: any) {
      showToast('Registration Error', err.message || 'Unable to save instrument.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const stepsList = [
    { num: 1, label: '1 Basic Info', icon: Building2 },
    { num: 2, label: '2 Metrological', icon: BarChart2 },
    { num: 3, label: '3 Technical', icon: Cpu },
    { num: 4, label: '4 Documents', icon: UploadCloud },
    { num: 5, label: '5 Review', icon: FileCheck },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-8">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/instruments')}
          className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Instruments
        </button>

        <div className="flex items-center gap-3">
          {lastSaved && <span className="text-[11px] text-slate-500 font-medium">{lastSaved}</span>}
          <button
            type="button"
            onClick={handleSaveDraft}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors border border-slate-200"
          >
            <Save className="w-3.5 h-3.5" /> Save Draft
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Wizard Header */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 space-y-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Instrument Registration</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Register a new Non-Automatic Weighing Instrument (NAWI) for OIML R-76 type evaluation.
            </p>
          </div>

          {/* 5 Progress Tabs */}
          <div className="grid grid-cols-5 gap-2 pt-1 select-none">
            {stepsList.map((st) => {
              const Icon = st.icon;
              const isActive = currentStep === st.num;
              const isPast = currentStep > st.num;

              return (
                <button
                  key={st.num}
                  type="button"
                  onClick={() => setCurrentStep(st.num as any)}
                  className={`flex items-center justify-center gap-1.5 p-2.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs font-bold'
                      : isPast
                      ? 'bg-teal-50 text-teal-800 border border-teal-200'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{st.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Form Steps */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* STEP 1: Basic Information */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-900 font-bold text-sm">
                <Building2 className="w-4 h-4 text-teal-600" />
                <span>Step 1 — Basic Information (Manufacturer & Applicant)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Manufacturer Name *</label>
                  <input
                    type="text"
                    required
                    value={mfgName}
                    onChange={(e) => setMfgName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:border-teal-600"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Registered Address *</label>
                  <input
                    type="text"
                    required
                    value={mfgAddress}
                    onChange={(e) => setMfgAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:border-teal-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Country *</label>
                  <input
                    type="text"
                    required
                    value={mfgCountry}
                    onChange={(e) => setMfgCountry(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:border-teal-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Person *</label>
                  <input
                    type="text"
                    required
                    value={mfgContactPerson}
                    onChange={(e) => setMfgContactPerson(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:border-teal-600"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Continue to Metrological Details <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Metrological Characteristics */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-900 font-bold text-sm">
                <BarChart2 className="w-4 h-4 text-teal-600" />
                <span>Step 2 — METROLOGICAL CHARACTERISTICS (OIML R-76 Parameters)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Accuracy Class Dropdown */}
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Accuracy Class *</label>
                  <select
                    value={accuracyClass}
                    onChange={(e) => setAccuracyClass(e.target.value as AccuracyClass)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-extrabold text-xs focus:outline-hidden focus:border-teal-600"
                  >
                    <option value="Class I">Class I (Special Accuracy)</option>
                    <option value="Class II">Class II (High Accuracy)</option>
                    <option value="Class III">Class III (Medium Accuracy)</option>
                    <option value="Class IIII">Class IIII (Ordinary Accuracy)</option>
                  </select>
                </div>

                {/* Maximum Capacity (Max) */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Maximum Capacity (Max) *</label>
                  <div className="flex items-center">
                    <input
                      type="number"
                      step="any"
                      required
                      value={maxCapacity}
                      onChange={(e) => setMaxCapacity(Number(e.target.value))}
                      placeholder="30"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-l-lg text-slate-900 font-mono font-bold focus:outline-hidden focus:border-teal-600"
                    />
                    <select
                      value={maxUnit}
                      onChange={(e) => setMaxUnit(e.target.value as MassUnit)}
                      className="px-2.5 py-2 bg-slate-200 text-slate-800 font-bold rounded-r-lg border border-l-0 border-slate-200"
                    >
                      <option value="mg">mg</option>
                      <option value="ct">ct (ct = 0.2g)</option>
                      <option value="g">g</option>
                      <option value="kg">kg</option>
                      <option value="t">t</option>
                    </select>
                  </div>
                </div>

                {/* Minimum Capacity (Min) */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Minimum Capacity (Min) *</label>
                  <div className="flex items-center">
                    <input
                      type="number"
                      step="any"
                      required
                      value={minCapacity}
                      onChange={(e) => setMinCapacity(Number(e.target.value))}
                      placeholder="0.1"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-l-lg text-slate-900 font-mono focus:outline-hidden focus:border-teal-600"
                    />
                    <select
                      value={minUnit}
                      onChange={(e) => setMinUnit(e.target.value as MassUnit)}
                      className="px-2.5 py-2 bg-slate-200 text-slate-800 font-bold rounded-r-lg border border-l-0 border-slate-200"
                    >
                      <option value="mg">mg</option>
                      <option value="ct">ct (ct = 0.2g)</option>
                      <option value="g">g</option>
                      <option value="kg">kg</option>
                      <option value="t">t</option>
                    </select>
                  </div>
                </div>

                {/* Scale Interval (d) */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Scale Interval (d) *</label>
                  <div className="flex items-center">
                    <input
                      type="number"
                      step="any"
                      required
                      value={scaleIntervalD}
                      onChange={(e) => setScaleIntervalD(Number(e.target.value))}
                      placeholder="5"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-l-lg text-slate-900 font-mono focus:outline-hidden focus:border-teal-600"
                    />
                    <select
                      value={dUnit}
                      onChange={(e) => setDUnit(e.target.value as MassUnit)}
                      className="px-2.5 py-2 bg-slate-200 text-slate-800 font-bold rounded-r-lg border border-l-0 border-slate-200"
                    >
                      <option value="mg">mg</option>
                      <option value="ct">ct (ct = 0.2g)</option>
                      <option value="g">g</option>
                      <option value="kg">kg</option>
                      <option value="t">t</option>
                    </select>
                  </div>
                </div>

                {/* Verification Scale Interval (e) */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Verification Scale Interval (e) *</label>
                  <div className="flex items-center">
                    <input
                      type="number"
                      step="any"
                      required
                      value={verificationIntervalE}
                      onChange={(e) => setVerificationIntervalE(Number(e.target.value))}
                      placeholder="5"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-l-lg text-slate-900 font-mono focus:outline-hidden focus:border-teal-600"
                    />
                    <select
                      value={eUnit}
                      onChange={(e) => setEUnit(e.target.value as MassUnit)}
                      className="px-2.5 py-2 bg-slate-200 text-slate-800 font-bold rounded-r-lg border border-l-0 border-slate-200"
                    >
                      <option value="mg">mg</option>
                      <option value="ct">ct (ct = 0.2g)</option>
                      <option value="g">g</option>
                      <option value="kg">kg</option>
                      <option value="t">t</option>
                    </select>
                  </div>
                </div>

                {/* AUTO-CALCULATED n = Max / e Card */}
                <div className="sm:col-span-2 p-4 bg-slate-900 text-white rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold uppercase text-teal-400">
                        Verification Scale Intervals (n)
                      </span>
                      <span className="text-[10px] font-bold bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded border border-teal-500/30">
                        AUTO-CALCULATED
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      n is automatically calculated as Max ÷ e.
                    </p>
                  </div>
                  <div className="text-2xl font-extrabold font-mono text-teal-300">
                    n = {calculatedN.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={handleStep2Next}
                  className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Continue to Technical Details <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Technical Details */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-900 font-bold text-sm">
                <Cpu className="w-4 h-4 text-teal-600" />
                <span>Step 3 — Technical Details</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    NAWI Instrument Category / Type *
                  </label>
                  <select
                    value={instrumentType}
                    onChange={(e) => handleInstrumentTypeChange(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold focus:outline-hidden focus:border-teal-600"
                  >
                    <optgroup label="Laboratory & Precision Balances (Class I & II)">
                      <option value="Analytical Balance">Analytical Balance (Class I)</option>
                      <option value="Precision Balance">Precision Balance (Class I / II)</option>
                      <option value="Laboratory Balance">Laboratory Balance</option>
                      <option value="Jewellery / Gem Balance">Jewellery / Gem Balance (Class II)</option>
                    </optgroup>

                    <optgroup label="Commercial & Retail Scales (Class III)">
                      <option value="Electronic Weighing Scale">Electronic Weighing Scale</option>
                      <option value="Retail Weighing Scale">Retail Weighing Scale</option>
                      <option value="Price Computing Scale">Price Computing Scale</option>
                      <option value="Label Printing Scale">Label Printing Scale</option>
                      <option value="Bench Scale">Bench Scale</option>
                      <option value="Counting Scale">Counting Scale</option>
                      <option value="Postal / Parcel Scale">Postal / Parcel Scale</option>
                    </optgroup>

                    <optgroup label="Industrial & Heavy-Capacity Scales">
                      <option value="Platform Scale">Platform Scale</option>
                      <option value="Floor Scale">Floor Scale</option>
                      <option value="Pallet Scale">Pallet Scale</option>
                      <option value="Industrial Receiving Scale">Industrial Receiving Scale</option>
                      <option value="Heavy Duty Industrial Scale">Heavy Duty Industrial Scale</option>
                      <option value="Agricultural Produce Scale">Agricultural Produce Scale</option>
                      <option value="Waste Weighing Scale">Waste Weighing Scale</option>
                      <option value="Portable Weighing Scale">Portable Weighing Scale</option>
                    </optgroup>

                    <optgroup label="Medical & Veterinary Scales">
                      <option value="Medical Weighing Scale">Medical Weighing Scale</option>
                      <option value="Baby Weighing Scale">Baby Weighing Scale</option>
                      <option value="Veterinary Scale">Veterinary Scale</option>
                      <option value="Livestock Scale">Livestock Scale</option>
                    </optgroup>

                    <optgroup label="Overhead & Crane Scales">
                      <option value="Hanging Scale">Hanging Scale</option>
                      <option value="Crane Scale">Crane Scale</option>
                    </optgroup>

                    <optgroup label="Vehicle & Axle Weighbridges">
                      <option value="Static Vehicle Weighbridge">Static Vehicle Weighbridge</option>
                      <option value="Truck Scale">Truck Scale</option>
                      <option value="Static Axle Weighing Scale">Static Axle Weighing Scale</option>
                      <option value="Weighbridge">Weighbridge (Generic)</option>
                    </optgroup>

                    <optgroup label="Mechanical & Non-Self-Indicating">
                      <option value="Mechanical Platform Scale">Mechanical Platform Scale</option>
                      <option value="Non-Self-Indicating Instrument">Non-Self-Indicating Instrument</option>
                    </optgroup>

                    <optgroup label="Other NAWI Categories">
                      <option value="Other NAWI">Other Non-Automatic Instrument</option>
                    </optgroup>

                    <optgroup label="⚠️ Excluded Automatic Weighing Instruments (OIML R 76 Excluded)">
                      <option value="AUTOMATIC_CATCHWEIGHER">🚫 Automatic Catchweigher (Governed by OIML R 51)</option>
                      <option value="AUTOMATIC_GRAVIMETRIC_FILLER">🚫 Automatic Gravimetric Filling Instrument (Governed by OIML R 61)</option>
                      <option value="CONTINUOUS_TOTALIZER">🚫 Continuous Totalizing Automatic Instrument (Governed by OIML R 50)</option>
                      <option value="AUTOMATIC_RAIL_WEIGHBRIDGE">🚫 Automatic Rail-Weighbridge (Governed by OIML R 106)</option>
                      <option value="AUTOMATIC_WEIGHING_IN_MOTION">🚫 Automatic Weighing-in-Motion / WIM (Governed by OIML R 134)</option>
                    </optgroup>
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Select the approved metrological classification category per manufacturer pattern approval documentation.
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Model Name / Number *</label>
                  <input
                    type="text"
                    required
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Serial Number *</label>
                  <input
                    type="text"
                    required
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Continue to Documents <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Documents */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-900 font-bold text-sm">
                <UploadCloud className="w-4 h-4 text-teal-600" />
                <span>Step 4 — Document Uploads</span>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                <span className="font-bold text-slate-900 block">Uploaded Pattern Approval Document</span>
                <p className="text-slate-500 font-mono">cert_XP600_approved.pdf (1.2 MB)</p>
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(5)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Continue to Review & Submit <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Final Review */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-900 font-bold text-sm">
                <FileCheck className="w-4 h-4 text-teal-600" />
                <span>Step 5 — Final Review</span>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Manufacturer</span>
                  <span className="font-bold text-slate-900">{mfgName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Model & Serial</span>
                  <span className="font-bold text-slate-900">{modelName} ({serialNumber})</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Accuracy Class</span>
                  <span className="font-bold text-slate-900">{accuracyClass}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Max Capacity</span>
                  <span className="font-bold text-slate-900">{maxCapacity} {maxUnit}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Min Capacity</span>
                  <span className="font-bold text-slate-900">{minCapacity} {minUnit}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Scale Intervals</span>
                  <span className="font-bold text-slate-900">
                    d = {scaleIntervalD} {dUnit} • e = {verificationIntervalE} {eUnit}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Intervals (n)</span>
                  <span className="font-bold font-mono text-teal-700">n = {calculatedN.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Previous
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg transition-colors shadow-md cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <span>Saving to Database...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Register Instrument
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* POST-REGISTRATION SUCCESS MODAL */}
      {registeredInst && (
        <Modal
          isOpen={!!registeredInst}
          onClose={() => navigate('/instruments')}
          title="Instrument Registered Successfully"
          subtitle={`Instrument ID: ${registeredInst.id}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-center py-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <div>
              <h3 className="text-base font-extrabold text-slate-900">{registeredInst.model.modelName}</h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {registeredInst.metrology.accuracyClass} • Max: {registeredInst.metrology.maxCapacity} {registeredInst.metrology.maxUnit} • n: {registeredInst.metrology.verificationScaleIntervalsN.toLocaleString()}
              </p>
            </div>
            <p className="text-xs text-slate-600">
              The instrument has been added to the Legal Metrology Registry and is saved in the Supabase database.
            </p>

            <div className="flex items-center justify-center gap-3 pt-3">
              <button
                onClick={() => navigate(`/instruments/${registeredInst.id}`)}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
              >
                <Eye className="w-4 h-4" /> View Instrument
              </button>
              <button
                onClick={() => navigate(`/test-sessions?instrumentId=${registeredInst.id}`)}
                className="flex items-center gap-1.5 px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg transition-colors shadow-xs cursor-pointer"
              >
                <PlayCircle className="w-4 h-4" /> Start Test
              </button>
            </div>
          </div>
        </Modal>
      )}
      {/* AUTOMATIC WEIGHING EXCLUSION GUARD MODAL */}
      {automaticExclusionModalOpen && (
        <Modal
          isOpen={automaticExclusionModalOpen}
          onClose={() => setAutomaticExclusionModalOpen(false)}
          title="Automatic Weighing Instrument Excluded from OIML R 76 Scope"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 text-amber-700 rounded-xl space-y-1">
              <span className="font-bold block text-sm text-amber-900">
                ⚠️ Category Excluded: {automaticExclusionCategory}
              </span>
              <p className="text-amber-800 leading-relaxed">
                OIML R 76-1:2006 applies <strong>strictly to Non-Automatic Weighing Instruments (NAWI)</strong> requiring operator intervention during weighing.
              </p>
            </div>

            <div className="space-y-2 text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-800 block">Governing International Standards for Automatic Categories:</span>
              <ul className="list-disc list-inside space-y-1 font-mono text-[11px] text-slate-700">
                <li>Automatic Catchweighers $\rightarrow$ <strong>OIML R 51</strong></li>
                <li>Automatic Gravimetric Filling Instruments $\rightarrow$ <strong>OIML R 61</strong></li>
                <li>Continuous Totalizing Automatic Instruments $\rightarrow$ <strong>OIML R 50</strong></li>
                <li>Automatic Rail-Weighbridges $\rightarrow$ <strong>OIML R 106</strong></li>
                <li>Automatic Weighing-in-Motion (WIM) $\rightarrow$ <strong>OIML R 134</strong></li>
              </ul>
            </div>

            <p className="text-slate-500">
              Please select an approved Non-Automatic Weighing Instrument (NAWI) category (e.g. Platform Scale, Analytical Balance, Static Vehicle Weighbridge) to proceed with OIML R 76 type evaluation.
            </p>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setAutomaticExclusionModalOpen(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                Acknowledge & Return to NAWI Selection
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
