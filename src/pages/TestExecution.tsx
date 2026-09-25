import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Scale,
  Plus,
  Trash2,
  Pencil,
  CheckCircle2,
  AlertTriangle,
  Save,
  Send,
  ChevronLeft,
  ChevronRight,
  Check,
  ShieldCheck,
  Award,
} from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { getTestSessionsStore, updateTestSession, addAuditLog, getReportsStore, getInstrumentsStore } from '../mock/store';
import { authService } from '../services/authService';
import {
  testSessionService,
  canEditTestSession,
  canSubmitForReview,
  canTechnicalReview,
  canDirectorApprove,
  getWorkflowStatusLabel,
} from '../services/testSessionService';
import {
  calculateEccentricityError,
  validateScaleReadingSanity,
  OIML_ENGINE_NOTICE,
} from '../utils/oimlEngine';
import { evaluateMPEScaleReading, calculateMPE, MPECheckResult } from '../services/oimlComplianceService';
import {
  calculateEccentricityTestLoad,
  getEccentricityPositions,
  validateEccentricityScaleReading,
  evaluateEccentricityPosition,
  evaluateOverallEccentricity,
} from '../services/eccentricityService';
import {
  isDigitalDiscriminationApplicable,
  calculateOneTenthD,
  calculateOnePointFourD,
  getDiscriminationTestPoints,
  evaluateOverallDiscrimination,
} from '../services/discriminationService';
import {
  calculateOneTenthE,
  calculateQuarterE,
  calculateHalfE,
  evaluateZeroSettingAccuracy,
  isZeroSettingProcedureApplicable,
} from '../services/zeroSettingService';
import { convertMassUnit, calculateVerificationIntervals, calculateTestProgress } from '../utils/metrologyService';
import { calculateSessionProgress, calculateOverallEvaluationResult, isSessionReadyForReview } from '../services/evaluationResultService';
import { MPECalculationExplanationPanel } from '../components/test/MPECalculationExplanationPanel';
import { WeighingTestObservation, EccentricityTestObservation, DiscriminationTestObservation, ZeroSettingTestObservation, TareSettingObservation, TareNetWeighingObservation, TareTestSession, UserRole, Report, MassUnit } from '../types';
import { EccentricityPlatform } from '../components/test/EccentricityPlatform';
import { DiscriminationWizard } from '../components/test/DiscriminationWizard';
import { ZeroSettingWizard } from '../components/test/ZeroSettingWizard';
import { TareWizard } from '../components/test/TareWizard';
import { EvaluationTestPlanView } from '../components/test/EvaluationTestPlanView';
import { StaticTemperatureWizard } from '../components/test/StaticTemperatureWizard';
import { DisturbanceModulesView } from '../components/test/DisturbanceModulesView';
import { useToast } from '../components/common/Toast';

const parseVerificationInterval = (intervalStr?: string): { eVal: number; eUnit: MassUnit } => {
  if (!intervalStr) return { eVal: 10, eUnit: 'g' };
  const parts = intervalStr.trim().split(/\s+/);
  const val = parseFloat(parts[0]);
  const unit = (parts[1] as MassUnit) || 'g';
  return { eVal: isNaN(val) ? 10 : val, eUnit: unit };
};

export const TestExecution: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const sessions = getTestSessionsStore();
  const initialSession = sessions.find((s) => s.id === id) || sessions[0];
  const [session, setSession] = useState(initialSession);

  // Active Role state from Database Auth Profile
  const [activeRole, setActiveRole] = useState<UserRole>('TESTING_OFFICER');

  const [reviewerCommentInput, setReviewerCommentInput] = useState('');
  const [showRequestChangesBox, setShowRequestChangesBox] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const handleSync = async () => {
      const user = await authService.getCurrentUser();
      if (isMounted && user) {
        setActiveRole(user.role);
      }

      if (id) {
        const latest = testSessionService.getLatestSessionState(id);
        if (isMounted && latest) {
          setSession(latest);
        }
      }
    };

    handleSync();

    const unsubscribe = authService.onAuthStateChange((user) => {
      if (isMounted && user) {
        setActiveRole(user.role);
      }
    });

    window.addEventListener('nawi_session_updated', handleSync);
    return () => {
      isMounted = false;
      unsubscribe();
      window.removeEventListener('nawi_session_updated', handleSync);
    };
  }, [id]);

  const [activeTab, setActiveTab] = useState<'plan' | 'zerosetting' | 'tare' | 'eccentricity' | 'weighing' | 'repeatability' | 'discrimination' | 'statictemp' | 'disturbance' | 'review'>('plan');

  // Zero-Setting Test State
  const zeroSettingType = session.zeroSettingType || 'SEMI_AUTOMATIC';

  const handleSaveZeroSettingObservation = (newObs: ZeroSettingTestObservation) => {
    const updatedSession = {
      ...session,
      zeroSettingType,
      zeroSettingObservations: [newObs],
    };

    const progressResult = calculateTestProgress(updatedSession);
    updatedSession.progress = progressResult.percentage;

    setSession(updatedSession);
    updateTestSession(updatedSession);

    // Append Audit Log (Section 21)
    addAuditLog({
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      user: activeRole === 'Testing Officer' ? 'Dr. Ananya Rao' : 'V. Verma',
      role: activeRole,
      action: 'Zero-setting Accuracy Test Completed',
      details: `Zero-setting type: ${newObs.zeroSettingType}, E0: ${newObs.calculatedZeroError > 0 ? '+' : ''}${newObs.calculatedZeroError} ${newObs.eUnit}, Result: ${newObs.passed ? 'Within Limit' : 'Exceeds Limit'}`,
      instrumentOrSessionId: session.id,
    });

    showToast(
      'Zero Setting Recorded',
      `E0: ${newObs.calculatedZeroError > 0 ? '+' : ''}${newObs.calculatedZeroError} ${newObs.eUnit} (${newObs.passed ? 'Within Limit' : 'Exceeds Limit'})`,
      newObs.passed ? 'success' : 'warning'
    );
  };

  // Tare Test Handlers
  const handleSaveTareSetting = (settingObs: TareSettingObservation) => {
    const prevTareSession: TareTestSession = session.tareTestSession || {
      tareType: 'SUBTRACTIVE',
      maximumTareEffect: 10,
      maximumTareUnit: 'kg',
      appliedTare: settingObs.appliedTareLoad,
      availableNetCapacity: 25,
      netWeighingObservations: [],
      isTareSettingCompleted: true,
      isNetWeighingCompleted: false,
      overallResult: 'NOT_STARTED',
      isCompleted: false,
    };

    const updatedTareSession: TareTestSession = {
      ...prevTareSession,
      appliedTare: settingObs.appliedTareLoad,
      tareSettingObservation: settingObs,
      isTareSettingCompleted: true,
    };

    const updatedSession = {
      ...session,
      tareTestSession: updatedTareSession,
    };

    const progressResult = calculateTestProgress(updatedSession);
    updatedSession.progress = progressResult.percentage;

    setSession(updatedSession);
    updateTestSession(updatedSession);

    addAuditLog({
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      user: activeRole === 'Testing Officer' ? 'Dr. Ananya Rao' : 'V. Verma',
      role: activeRole,
      action: 'Tare-Setting Accuracy Observation Saved',
      details: `Tare Load: ${settingObs.appliedTareLoad} ${settingObs.tareLoadUnit}, ET: ${settingObs.calculatedTareZeroError} g, Result: ${settingObs.resultStatus}`,
      instrumentOrSessionId: session.id,
    });

    showToast(
      'Tare-Setting Saved',
      `Applied Tare: ${settingObs.appliedTareLoad} ${settingObs.tareLoadUnit} (ET: ${settingObs.calculatedTareZeroError > 0 ? '+' : ''}${settingObs.calculatedTareZeroError} g)`,
      settingObs.passed ? 'success' : 'warning'
    );
  };

  const handleSaveTareNetObservation = (netObs: TareNetWeighingObservation) => {
    const prevTareSession: TareTestSession = session.tareTestSession || {
      tareType: 'SUBTRACTIVE',
      maximumTareEffect: 10,
      maximumTareUnit: 'kg',
      appliedTare: netObs.appliedTareLoad,
      availableNetCapacity: 25,
      netWeighingObservations: [],
      isTareSettingCompleted: true,
      isNetWeighingCompleted: false,
      overallResult: 'NOT_STARTED',
      isCompleted: false,
    };

    const prevNetObs = prevTareSession.netWeighingObservations || [];
    const filteredObs = prevNetObs.filter((o) => o.stepIndex !== netObs.stepIndex);
    const updatedNetObs = [...filteredObs, netObs].sort((a, b) => a.stepIndex - b.stepIndex);

    const isNetCompleted = updatedNetObs.length >= 5;

    const updatedTareSession: TareTestSession = {
      ...prevTareSession,
      netWeighingObservations: updatedNetObs,
      isNetWeighingCompleted: isNetCompleted,
      tareObservations: updatedNetObs,
    } as any;

    const updatedSession = {
      ...session,
      tareTestSession: updatedTareSession,
      tareObservations: updatedNetObs,
    };

    const progressResult = calculateTestProgress(updatedSession);
    updatedSession.progress = progressResult.percentage;

    setSession(updatedSession);
    updateTestSession(updatedSession);

    addAuditLog({
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      user: activeRole === 'Testing Officer' ? 'Dr. Ananya Rao' : 'V. Verma',
      role: activeRole,
      action: 'Tare Net Weighing Observation Saved',
      details: `Step ${netObs.stepIndex}: Ref Net ${netObs.referenceNetLoad} kg, Disp ${netObs.displayedNetReading} kg, Error: ${netObs.netErrorFormatted}`,
      instrumentOrSessionId: session.id,
    });

    showToast(
      'Net Observation Saved',
      `Point ${netObs.stepIndex} (${netObs.referenceNetLoad} kg NET): Net Error ${netObs.netErrorFormatted}`,
      netObs.passed ? 'success' : 'warning'
    );
  };

  const handleCompleteTareTest = (overallResult: string) => {
    const prevTareSession = session.tareTestSession;
    if (!prevTareSession) return;

    const updatedTareSession: TareTestSession = {
      ...prevTareSession,
      overallResult: overallResult as any,
      isCompleted: true,
    };

    const updatedSession = {
      ...session,
      tareTestSession: updatedTareSession,
    };

    const progressResult = calculateTestProgress(updatedSession);
    updatedSession.progress = progressResult.percentage;

    setSession(updatedSession);
    updateTestSession(updatedSession);

    addAuditLog({
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      user: activeRole === 'Testing Officer' ? 'Dr. Ananya Rao' : 'V. Verma',
      role: activeRole,
      action: 'Tare Test Completed',
      details: `Overall Tare Result: ${overallResult}`,
      instrumentOrSessionId: session.id,
    });

    showToast(
      'Tare Test Completed',
      `Overall Result: ${overallResult.replace(/_/g, ' ')}`,
      overallResult === 'COMPLETED_WITHIN_LIMITS' ? 'success' : 'warning'
    );
  };

  // Discrimination Test State
  const [activeDiscPointId, setActiveDiscPointId] = useState<'MIN' | 'HALF_MAX' | 'MAX'>('HALF_MAX');

  const maxCapNum = parseFloat(session.maxCapacity) || 30;
  const minCapNum = 0.1;
  const { eVal: dVal, eUnit: dUnit } = parseVerificationInterval(session.verificationInterval);

  const discriminationPoints = getDiscriminationTestPoints(maxCapNum, minCapNum, 'kg');

  const getNextIncompleteDiscriminationPoint = (
    currentId: 'MIN' | 'HALF_MAX' | 'MAX',
    obs: DiscriminationTestObservation[]
  ) => {
    const ids: Array<'MIN' | 'HALF_MAX' | 'MAX'> = ['MIN', 'HALF_MAX', 'MAX'];
    const completedIds = obs.filter((o) => o.isCompleted || o.resultStatus).map((o) => o.testPointId);
    const nextId = ids.find((id) => id !== currentId && !completedIds.includes(id));
    if (nextId) return nextId;
    const firstIncomplete = ids.find((id) => !completedIds.includes(id));
    return firstIncomplete || ids[0];
  };

  const handleSaveDiscriminationObservation = (newObs: DiscriminationTestObservation) => {
    const filtered = (session.discriminationObservations || []).filter((o) => o.testPointId !== newObs.testPointId);
    const updatedDisc = [...filtered, newObs];

    const updatedSession = {
      ...session,
      discriminationObservations: updatedDisc,
    };

    const progressResult = calculateTestProgress(updatedSession);
    updatedSession.progress = progressResult.percentage;

    setSession(updatedSession);
    updateTestSession(updatedSession);

    // Append Audit Log
    addAuditLog({
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      user: activeRole === 'Testing Officer' ? 'Dr. Ananya Rao' : 'V. Verma',
      role: activeRole,
      action: 'Discrimination Point Completed',
      details: `Discrimination Test — ${newObs.testPointLabel} Completed (${newObs.resultStatus === 'CONFIRMED' ? 'Response Confirmed' : 'Not Observed'})`,
      instrumentOrSessionId: session.id,
    });

    showToast(
      'Test Point Recorded',
      `${newObs.testPointLabel}: ${newObs.resultStatus === 'CONFIRMED' ? '✓ Response Confirmed' : '✕ Not Observed'}`,
      newObs.passed ? 'success' : 'warning'
    );

    // Auto-advance to next incomplete test point
    const nextPointId = getNextIncompleteDiscriminationPoint(newObs.testPointId, updatedDisc);
    setActiveDiscPointId(nextPointId);
  };

  const eccProfile = session.eccentricityProfile || 'STANDARD_UP_TO_4_SUPPORTS';
  const eccNumSupports = session.eccentricityNumSupports || 4;

  const initialEccTestLoad = session.eccentricityTestLoad || calculateEccentricityTestLoad({
    maxCapacity: parseFloat(session.maxCapacity) || 30,
    maxUnit: 'kg',
    profile: eccProfile,
    numSupports: eccNumSupports,
  });

  // Single Global Test Load for Eccentricity
  const [eccTestLoad, setEccTestLoad] = useState<number>(initialEccTestLoad);

  // Eccentricity Active Position & Reading Input
  const [eccPosition, setEccPosition] = useState<number>(1);
  const [scaleReadingInput, setScaleReadingInput] = useState<string>('10.000');
  const [notesInput, setNotesInput] = useState<string>('');

  // Verification Mode & Weighing Accuracy State
  const [verificationMode, setVerificationMode] = useState<'INITIAL_VERIFICATION' | 'IN_SERVICE'>('INITIAL_VERIFICATION');
  const [weighingRefLoadInput, setWeighingRefLoadInput] = useState<string>('10.000');
  const [weighingScaleReadingInput, setWeighingScaleReadingInput] = useState<string>('10.008');
  const [weighingDirection, setWeighingDirection] = useState<'Increasing' | 'Decreasing'>('Increasing');
  const [weighingNotesInput, setWeighingNotesInput] = useState<string>('');

  // Dynamic positions by load-receptor profile
  const activeEccPositions = getEccentricityPositions(eccProfile, eccNumSupports);
  const getPosConfig = (posId: number) => activeEccPositions.find((p) => p.id === posId) || activeEccPositions[0];

  // Find next incomplete eccentricity position in sequence
  const getNextIncompletePosition = (currentPos: number, currentObs: EccentricityTestObservation[]) => {
    const posIds = activeEccPositions.map((p) => p.id);
    const completedPositions = currentObs.map((o) => o.position);
    const nextPos = posIds.find((p) => p > currentPos && !completedPositions.includes(p));
    if (nextPos) return nextPos;
    const firstIncomplete = posIds.find((p) => !completedPositions.includes(p));
    return firstIncomplete || posIds[0];
  };

  // SAVE ECCENTRICITY READING WITH STRICT INPUT SANITY VALIDATION
  const handleSaveEccentricityReading = (e: React.FormEvent) => {
    e.preventDefault();

    if (!scaleReadingInput || scaleReadingInput.trim() === '' || isNaN(Number(scaleReadingInput))) {
      showToast('Scale Reading Required', 'Enter the scale reading before continuing.', 'warning');
      return;
    }

    const readingVal = Number(scaleReadingInput);

    // Broad sanity check using eccentricityService
    const sanityCheck = validateEccentricityScaleReading(readingVal, eccTestLoad);
    if (!sanityCheck.isValid) {
      showToast('Invalid Reading', sanityCheck.errorMessage || 'Scale reading appears invalid. Please check the value and unit.', 'error');
      return;
    }

    const { eVal, eUnit } = parseVerificationInterval(session.verificationInterval);
    const posConfig = getPosConfig(eccPosition);

    const newEcc = evaluateEccentricityPosition({
      position: eccPosition,
      locationLabel: posConfig.label,
      testLoad: eccTestLoad,
      testLoadUnit: 'kg',
      scaleReading: readingVal,
      scaleReadingUnit: 'kg',
      accuracyClass: session.accuracyClass,
      verificationScaleIntervalE: eVal,
      eUnit,
      verificationMode: 'INITIAL_VERIFICATION',
    });

    const filteredEcc = session.eccentricityObservations.filter((obs) => obs.position !== eccPosition);
    const updatedEcc = [...filteredEcc, newEcc].sort((a, b) => a.position - b.position);

    const updatedSession = {
      ...session,
      eccentricityProfile: eccProfile,
      eccentricityTestLoad: eccTestLoad,
      eccentricityObservations: updatedEcc,
    };

    const progressResult = calculateTestProgress(updatedSession);
    updatedSession.progress = progressResult.percentage;

    setSession(updatedSession);
    updateTestSession(updatedSession);

    showToast('Reading Saved', `Position ${eccPosition} (${posConfig.label}): ${readingVal} kg`, 'success');

    // Auto-advance focus to next position
    const nextPos = getNextIncompletePosition(eccPosition, updatedEcc);
    setEccPosition(nextPos);

    // Preset realistic default reading for next position if not already recorded
    const existingNext = updatedEcc.find((o) => o.position === nextPos);
    if (existingNext) {
      setScaleReadingInput(existingNext.indicatedValue.toString());
    } else {
      const calcVal = Number((eccTestLoad + (nextPos % 2 === 0 ? 0.002 : -0.001)).toFixed(3));
      setScaleReadingInput(calcVal.toString());
    }
  };

  // SAVE WEIGHING ACCURACY OBSERVATION WITH FULL METROLOGICAL VALIDATION
  const handleSaveWeighingObservation = (e: React.FormEvent) => {
    e.preventDefault();

    if (!weighingRefLoadInput || weighingRefLoadInput.trim() === '' || isNaN(Number(weighingRefLoadInput))) {
      showToast('Invalid Reference Load', 'Reference load is required and must be a valid number.', 'warning');
      return;
    }

    if (!weighingScaleReadingInput || weighingScaleReadingInput.trim() === '' || isNaN(Number(weighingScaleReadingInput))) {
      showToast('Scale Reading Required', 'Enter the scale reading displayed on the instrument.', 'warning');
      return;
    }

    const refLoad = Number(weighingRefLoadInput);
    const readingVal = Number(weighingScaleReadingInput);

    if (refLoad <= 0) {
      showToast('Invalid Reference Load', 'Reference load must be greater than zero.', 'error');
      return;
    }

    if (readingVal < 0) {
      showToast('Invalid Scale Reading', 'Scale reading cannot be negative.', 'error');
      return;
    }

    const { eVal, eUnit } = parseVerificationInterval(session.verificationInterval);
    const registeredInst = getInstrumentsStore().find((i) => i.id === session.instrumentId);
    const maxCapacityVal = registeredInst?.metrology.maxCapacity ?? 30;
    const maxCapacityUnit = registeredInst?.metrology.maxUnit ?? 'kg';

    // Validate load does not exceed instrument Max Capacity
    const refLoadInMaxUnit = convertMassUnit(refLoad, 'kg', maxCapacityUnit);
    if (refLoadInMaxUnit > maxCapacityVal) {
      showToast('Capacity Exceeded', `Reference load (${refLoad} kg) exceeds maximum capacity (${maxCapacityVal} ${maxCapacityUnit}).`, 'error');
      return;
    }

    // Sanity check: Reject absurd entries (e.g. entering 20060 kg when reference load is 10 kg)
    if (!validateScaleReadingSanity(readingVal, refLoad)) {
      showToast('Invalid Reading', 'Scale reading appears invalid. Please check the value and unit.', 'error');
      return;
    }

    const mpeCheck = evaluateMPEScaleReading({
      referenceLoad: refLoad,
      referenceLoadUnit: 'kg',
      scaleReading: readingVal,
      scaleReadingUnit: 'kg',
      accuracyClass: session.accuracyClass,
      verificationScaleIntervalE: eVal,
      eUnit,
      verificationMode,
    });

    const newObs: WeighingTestObservation = {
      id: `wo-${Date.now()}`,
      load: refLoad,
      indicatedValue: readingVal,
      deltaL: 0,
      calculatedError: mpeCheck.indicatedDifference,
      adjustedError: mpeCheck.indicatedDifference,
      mpeLimit: mpeCheck.mpeResult.mpeValue,
      passed: mpeCheck.isPassed,
      direction: weighingDirection,
      mpeUnit: mpeCheck.mpeResult.mpeUnit,
      mpeStatus: mpeCheck.status,
      indicatedDifferenceFormatted: mpeCheck.indicatedDifferenceFormatted,
      notes: weighingNotesInput,
    };

    const filteredObs = session.weighingObservations.filter((o) => Math.abs(o.load - refLoad) > 1e-6 || o.direction !== weighingDirection);
    const updatedObs = [...filteredObs, newObs].sort((a, b) => a.load - b.load);

    const updatedSession = {
      ...session,
      weighingObservations: updatedObs,
    };

    setSession(updatedSession);
    updateTestSession(updatedSession);
    showToast('Observation Saved', 'Accuracy observation saved.', 'success');
  };

  const handleEditWeighingObservation = (obs: WeighingTestObservation) => {
    setWeighingRefLoadInput(obs.load.toString());
    setWeighingScaleReadingInput(obs.indicatedValue.toString());
    if (obs.direction) setWeighingDirection(obs.direction as 'Increasing' | 'Decreasing');
    if (obs.notes) setWeighingNotesInput(obs.notes);

    const updatedObs = session.weighingObservations.filter((o) => o.id !== obs.id);
    const updatedSession = { ...session, weighingObservations: updatedObs };
    setSession(updatedSession);
    updateTestSession(updatedSession);

    showToast('Editing Observation', `Loaded values for ${obs.load} kg. Update and click Add Observation.`, 'info');
  };

  const handleDeleteWeighingObservation = (obsId: string) => {
    const updatedObs = session.weighingObservations.filter((o) => o.id !== obsId);
    const updatedSession = { ...session, weighingObservations: updatedObs };
    setSession(updatedSession);
    updateTestSession(updatedSession);
    showToast('Observation Removed', 'Test point deleted.', 'info');
  };

  // Save Draft
  const handleSaveDraft = () => {
    updateTestSession(session);
    addAuditLog({
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      user: activeRole === 'Testing Officer' ? 'Dr. Ananya Rao' : 'V. Verma',
      role: activeRole,
      action: 'Test Observation Saved',
      details: `Saved draft for session ${session.id}`,
      instrumentOrSessionId: session.id,
    });
    showToast('Draft Saved', 'Saved just now to local storage.', 'info');
  };

  // Role Action 1: Testing Officer Submits for Review
  const handleSubmitForReview = () => {
    const readyCheck = isSessionReadyForReview(session);
    if (!readyCheck.isReady) {
      showToast('Cannot Submit Evaluation', readyCheck.blockingReason || 'Complete all required tests before submitting this evaluation.', 'warning');
      return;
    }

    const updated = testSessionService.updateWorkflowStatus(session.id, 'UNDER_REVIEW', {
      user: activeRole === 'Testing Officer' ? 'Dr. Ananya Rao' : activeRole === 'Technical Reviewer' ? 'Vikramaditya Verma' : 'Dr. K. S. Murthy',
      role: activeRole,
      comments: 'All required test observations completed and verified. Submitted for senior technical review.',
    });
    if (updated) {
      setSession(updated);
      showToast('Submitted for Review', 'Test session submitted for senior technical review.', 'success');
      setActiveTab('review');
    }
  };

  // Role Action 2: Technical Reviewer Requests Changes
  const handleRequestChanges = () => {
    if (!reviewerCommentInput.trim()) {
      showToast('Reason Required', 'Please enter a comment explaining the requested changes.', 'warning');
      return;
    }
    const updated = testSessionService.updateWorkflowStatus(session.id, 'CHANGES_REQUESTED', {
      user: 'Vikramaditya Verma',
      role: 'Technical Reviewer',
      reason: reviewerCommentInput,
      comments: reviewerCommentInput,
    });
    if (updated) {
      setSession(updated);
      showToast('Changes Requested', 'Session returned to Testing Officer for corrections.', 'info');
      setReviewerCommentInput('');
      setShowRequestChangesBox(false);
    }
  };

  // Role Action 3: Technical Reviewer Approves
  const handleApproveReview = () => {
    const updated = testSessionService.updateWorkflowStatus(session.id, 'TECHNICALLY_APPROVED', {
      user: 'Vikramaditya Verma',
      role: 'Technical Reviewer',
      comments: reviewerCommentInput || 'Technical evaluation audited and approved.',
    });
    if (updated) {
      setSession(updated);
      showToast('Technical Review Approved', 'Technical review approved. Awaiting Laboratory Director sign-off.', 'success');
      setReviewerCommentInput('');
    }
  };

  // Role Action 4: Director Approves Evaluation
  const handleDirectorApprove = () => {
    const updated = testSessionService.updateWorkflowStatus(session.id, 'APPROVED', {
      user: 'Dr. K. S. Murthy',
      role: 'Approving Officer / Lab Director',
      comments: 'Legal metrology evaluation approved.',
    });
    if (updated) {
      setSession(updated);
      showToast('Evaluation Approved', 'Type evaluation approved by Laboratory Director.', 'success');
    }
  };

  // Role Action 5: Director Finalizes & Signs Certificate
  const handleFinalizeCertificate = () => {
    const updated = testSessionService.updateWorkflowStatus(session.id, 'FINALIZED', {
      user: 'Dr. K. S. Murthy',
      role: 'Approving Officer / Lab Director',
      comments: 'Official Type Evaluation Certificate Issued.',
    });
    if (updated) {
      setSession(updated);
      showToast('Report Finalized', 'Evaluation finalized. Record is now read-only.', 'success');
      const reports = getReportsStore();
      const match = reports.find((r) => r.testSessionId === session.id);
      if (match) {
        navigate(`/reports/${match.id}`);
      }
    }
  };

  // SIH Demo Helper 1: Pre-fill Realistic OIML Compliant Test Observations
  const handlePreFillPassingDemoData = () => {
    const { eVal, eUnit } = parseVerificationInterval(session.verificationInterval);

    const demoZeroObs: ZeroSettingTestObservation = {
      zeroSettingType: session.zeroSettingType || 'SEMI_AUTOMATIC',
      verificationIntervalE: eVal,
      eUnit,
      suggestedIncrement: Number((0.1 * eVal).toFixed(2)),
      changeoverAdditionalLoad: Number((0.4 * eVal).toFixed(1)),
      calculatedZeroError: Number((0.1 * eVal).toFixed(2)),
      permissibleZeroDeviation: Number((0.25 * eVal).toFixed(2)),
      passed: true,
      resultStatus: 'WITHIN_LIMIT',
      isCompleted: true,
    };

    const demoTareSetting: TareSettingObservation = {
      appliedTareLoad: 5,
      tareLoadUnit: 'kg',
      displayedIndicationAfterTare: 0,
      suggestedIncrement: Number((0.1 * eVal).toFixed(2)),
      changeoverAdditionalLoad: Number((0.4 * eVal).toFixed(1)),
      calculatedTareZeroError: Number((0.1 * eVal).toFixed(2)),
      permissibleTareZeroError: Number((0.25 * eVal).toFixed(2)),
      passed: true,
      resultStatus: 'WITHIN_LIMIT',
    };

    const demoTareNetObs: TareNetWeighingObservation[] = [
      { id: 'tno-1', stepIndex: 1, stepLabel: 'Point 1 (Min Load)', referenceNetLoad: 0.1, displayedNetReading: 0.1, calculatedGrossLoad: 5.1, netError: 0, netErrorFormatted: '0 g', mpeLimit: 5, mpeUnit: 'g', mpeStatus: 'WITHIN_MPE', passed: true, appliedTareLoad: 5 },
      { id: 'tno-2', stepIndex: 2, stepLabel: 'Point 2 (5 kg Net)', referenceNetLoad: 5, displayedNetReading: 5.002, calculatedGrossLoad: 10.002, netError: 2, netErrorFormatted: '+2 g', mpeLimit: 5, mpeUnit: 'g', mpeStatus: 'WITHIN_MPE', passed: true, appliedTareLoad: 5 },
      { id: 'tno-3', stepIndex: 3, stepLabel: 'Point 3 (10 kg Net)', referenceNetLoad: 10, displayedNetReading: 10.003, calculatedGrossLoad: 15.003, netError: 3, netErrorFormatted: '+3 g', mpeLimit: 5, mpeUnit: 'g', mpeStatus: 'WITHIN_MPE', passed: true, appliedTareLoad: 5 },
      { id: 'tno-4', stepIndex: 4, stepLabel: 'Point 4 (15 kg Net)', referenceNetLoad: 15, displayedNetReading: 15.002, calculatedGrossLoad: 20.002, netError: 2, netErrorFormatted: '+2 g', mpeLimit: 10, mpeUnit: 'g', mpeStatus: 'WITHIN_MPE', passed: true, appliedTareLoad: 5 },
      { id: 'tno-5', stepIndex: 5, stepLabel: 'Point 5 (24.975 kg Net)', referenceNetLoad: 24.975, displayedNetReading: 24.978, calculatedGrossLoad: 29.978, netError: 3, netErrorFormatted: '+3 g', mpeLimit: 10, mpeUnit: 'g', mpeStatus: 'WITHIN_MPE', passed: true, appliedTareLoad: 5 },
    ];

    const demoTareSession: TareTestSession = {
      tareType: 'SUBTRACTIVE',
      maximumTareEffect: 10,
      maximumTareUnit: 'kg',
      appliedTare: 5,
      availableNetCapacity: 25,
      tareSettingObservation: demoTareSetting,
      netWeighingObservations: demoTareNetObs,
      tareObservations: demoTareNetObs,
      isTareSettingCompleted: true,
      isNetWeighingCompleted: true,
      overallResult: 'COMPLETED_WITHIN_LIMITS',
      isCompleted: true,
    } as any;

    const demoEccObs: EccentricityTestObservation[] = [
      { position: 1, locationLabel: 'Front-Left', load: 10, indicatedValue: 10.001, error: 0.001, passed: true },
      { position: 2, locationLabel: 'Front-Right', load: 10, indicatedValue: 10.002, error: 0.002, passed: true },
      { position: 3, locationLabel: 'Rear-Left', load: 10, indicatedValue: 9.999, error: -0.001, passed: true },
      { position: 4, locationLabel: 'Rear-Right', load: 10, indicatedValue: 10.001, error: 0.001, passed: true },
    ];

    const demoWeighingObs: WeighingTestObservation[] = [
      { id: 'wo-demo-1', load: 0.1, indicatedValue: 0.1, deltaL: 0, calculatedError: 0, adjustedError: 0, mpeLimit: 5, passed: true, direction: 'Increasing', mpeUnit: 'g', mpeStatus: 'WITHIN_MPE', indicatedDifferenceFormatted: '0 g' },
      { id: 'wo-demo-2', load: 2.5, indicatedValue: 2.501, deltaL: 0, calculatedError: 1, adjustedError: 1, mpeLimit: 5, passed: true, direction: 'Increasing', mpeUnit: 'g', mpeStatus: 'WITHIN_MPE', indicatedDifferenceFormatted: '+1 g' },
      { id: 'wo-demo-3', load: 10.0, indicatedValue: 10.002, deltaL: 0, calculatedError: 2, adjustedError: 2, mpeLimit: 5, passed: true, direction: 'Increasing', mpeUnit: 'g', mpeStatus: 'WITHIN_MPE', indicatedDifferenceFormatted: '+2 g' },
      { id: 'wo-demo-4', load: 25.0, indicatedValue: 25.003, deltaL: 0, calculatedError: 3, adjustedError: 3, mpeLimit: 10, passed: true, direction: 'Increasing', mpeUnit: 'g', mpeStatus: 'WITHIN_MPE', indicatedDifferenceFormatted: '+3 g' },
      { id: 'wo-demo-5', load: 30.0, indicatedValue: 30.004, deltaL: 0, calculatedError: 4, adjustedError: 4, mpeLimit: 10, passed: true, direction: 'Increasing', mpeUnit: 'g', mpeStatus: 'WITHIN_MPE', indicatedDifferenceFormatted: '+4 g' },
    ];

    const demoDiscObs: DiscriminationTestObservation[] = [
      { testPointId: 'MIN', testPointLabel: 'Min Capacity (0.1 kg)', load: 0.1, loadUnit: 'kg', scaleIntervalD: 5, dUnit: 'g', oneTenthD: 0.5, onePointFourD: 7, initialIndication: 0.1, expectedLowerIndication: 0.095, expectedFinalIndication: 0.105, finalIndication: 0.105, passed: true, resultStatus: 'CONFIRMED', isCompleted: true },
      { testPointId: 'HALF_MAX', testPointLabel: '50% Max Capacity (15 kg)', load: 15, loadUnit: 'kg', scaleIntervalD: 5, dUnit: 'g', oneTenthD: 0.5, onePointFourD: 7, initialIndication: 15.0, expectedLowerIndication: 14.995, expectedFinalIndication: 15.005, finalIndication: 15.005, passed: true, resultStatus: 'CONFIRMED', isCompleted: true },
      { testPointId: 'MAX', testPointLabel: '100% Max Capacity (30 kg)', load: 30, loadUnit: 'kg', scaleIntervalD: 5, dUnit: 'g', oneTenthD: 0.5, onePointFourD: 7, initialIndication: 30.0, expectedLowerIndication: 29.995, expectedFinalIndication: 30.005, finalIndication: 30.005, passed: true, resultStatus: 'CONFIRMED', isCompleted: true },
    ];

    const updatedSession = {
      ...session,
      progress: 100,
      testPlanConfirmed: true,
      zeroSettingObservations: [demoZeroObs],
      tareTestSession: demoTareSession,
      tareObservations: demoTareNetObs,
      eccentricityObservations: demoEccObs,
      weighingObservations: demoWeighingObs,
      discriminationObservations: demoDiscObs,
      overallEvaluationResult: 'COMPLIANT' as const,
      overallVerdict: 'Compliant' as const,
    };

    setSession(updatedSession);
    updateTestSession(updatedSession);
    showToast('Demo Data Loaded', 'Pre-filled realistic OIML compliant test observations across all test modules.', 'success');
  };

  // SIH Demo Helper 2: Simulate Out-of-Tolerance Non-Conformity
  const handleSimulateNonConformity = () => {
    const currentEcc = session.eccentricityObservations.length > 0 ? session.eccentricityObservations : [
      { position: 1, locationLabel: 'Front-Left', load: 10, indicatedValue: 10.001, error: 0.001, passed: true },
      { position: 2, locationLabel: 'Front-Right', load: 10, indicatedValue: 10.002, error: 0.002, passed: true },
      { position: 3, locationLabel: 'Rear-Left', load: 10, indicatedValue: 9.999, error: -0.001, passed: true },
    ];

    const failingEccPoint: EccentricityTestObservation = {
      position: 4,
      locationLabel: 'Rear-Right',
      load: 10,
      indicatedValue: 10.008,
      error: 0.008,
      passed: false,
      notes: 'Non-conformity simulated for SIH demonstration (+8g error exceeds ±5g MPE limit).',
    };

    const updatedEcc = [...currentEcc.filter((p) => p.position !== 4), failingEccPoint].sort((a, b) => a.position - b.position);

    const updatedSession = {
      ...session,
      eccentricityObservations: updatedEcc,
      overallEvaluationResult: 'NON_COMPLIANT' as const,
      overallVerdict: 'Non-Compliant' as const,
    };

    setSession(updatedSession);
    updateTestSession(updatedSession);
    showToast('Non-Conformity Simulated', 'Injected +8g eccentricity error on Corner #4 (exceeds ±5g MPE). Verdict updated to NON_COMPLIANT.', 'warning');
  };

  const isZeroSettingCompleted = (session.zeroSettingObservations || []).some((o) => o.isCompleted);
  const isTareCompleted = session.tareTestSession?.isCompleted || (session.tareObservations && session.tareObservations.length >= 5);
  const completedEccCount = session.eccentricityObservations.length;
  const isEccCompleted = completedEccCount >= 4;
  const isWeighingCompleted = session.weighingObservations.length >= 1;
  const isRepeatabilityCompleted = session.repeatabilityObservations.length >= 1;
  const isDiscriminationCompleted = (session.discriminationObservations || []).filter((o) => o.isCompleted || o.resultStatus).length >= 3;

  const { completedCount, totalCount, percentage: calculatedProgressPercent } = calculateTestProgress(session);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Back button & Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate('/test-sessions')}
          className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Test Sessions
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-slate-500">Saved just now</span>
          <button
            onClick={handleSaveDraft}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-lg transition-colors border border-slate-200 cursor-pointer"
          >
            <Save className="w-4 h-4" /> Save Draft
          </button>
        </div>
      </div>

      {/* TOP PERSISTENT TEST BANNER */}
      <div className="bg-slate-900 text-white p-6 rounded-xl shadow-md space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-teal-400">Test ID: {session.id}</span>
              <Badge status={session.status} size="sm" />
            </div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              Instrument: {session.instrumentModel}
            </h2>
            <p className="text-xs text-slate-400">
              Serial Number: <span className="font-mono text-slate-200 font-bold">{session.serialNumber}</span> • Manufacturer:{' '}
              <span className="text-slate-200">{session.manufacturer}</span>
            </p>
          </div>

          <div className="flex flex-col items-end gap-1">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Test Progress</span>
              <span className="text-base font-extrabold text-teal-400">
                {completedCount} of {totalCount} tests completed ({calculatedProgressPercent}%)
              </span>
            </div>
            <div className="w-48 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-teal-500 rounded-full" style={{ width: `${calculatedProgressPercent}%` }} />
            </div>
          </div>
        </div>

        {/* SIH DEMO QUICK ACTION HELPERS */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-950/80 rounded-lg border border-slate-800 text-xs">
          <div className="flex items-center gap-2 text-slate-400 font-semibold text-[11px]">
            <Award className="w-3.5 h-3.5 text-teal-400" />
            <span>SIH Evaluator Toolbar:</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePreFillPassingDemoData}
              className="px-2.5 py-1 bg-teal-700 hover:bg-teal-600 text-white font-bold text-[11px] rounded transition-colors flex items-center gap-1 cursor-pointer"
              title="Pre-fill realistic OIML compliant test observations across all test modules"
            >
              <span>⚡ Load Passing Demo Readings</span>
            </button>
            <button
              type="button"
              onClick={handleSimulateNonConformity}
              className="px-2.5 py-1 bg-rose-800 hover:bg-rose-700 text-white font-bold text-[11px] rounded transition-colors flex items-center gap-1 cursor-pointer"
              title="Inject out-of-tolerance eccentricity error to simulate failing verification workflow"
            >
              <span>⚠️ Simulate Non-Conformity</span>
            </button>
          </div>
        </div>

        {/* CLICKABLE TEST NAVIGATION LIST */}
        <div className="flex items-center gap-2 overflow-x-auto text-xs pt-1 select-none">
          <button
            onClick={() => setActiveTab('plan')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'plan'
                ? 'bg-teal-600 text-white shadow-md ring-2 ring-teal-400'
                : session.testPlanConfirmed
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                : 'bg-slate-800 text-slate-300'
            }`}
          >
            📋 Test Plan & Rules
          </button>

          <button
            onClick={() => setActiveTab('zerosetting')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'zerosetting'
                ? 'bg-teal-600 text-white shadow-md ring-2 ring-teal-400'
                : isZeroSettingCompleted
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                : 'bg-slate-800 text-slate-300'
            }`}
          >
            {isZeroSettingCompleted ? '✓ Zero Setting' : '○ Zero Setting'}
          </button>

          <button
            onClick={() => setActiveTab('tare')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'tare'
                ? 'bg-teal-600 text-white shadow-md ring-2 ring-teal-400'
                : isTareCompleted
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                : 'bg-slate-800 text-slate-300'
            }`}
          >
            {isTareCompleted ? '✓ Tare Test' : '○ Tare Test'}
          </button>

          <button
            onClick={() => setActiveTab('eccentricity')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'eccentricity'
                ? 'bg-teal-600 text-white shadow-md ring-2 ring-teal-400'
                : isEccCompleted
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                : 'bg-slate-800 text-slate-300'
            }`}
          >
            {isEccCompleted ? '✓ Eccentricity' : '○ Eccentricity'}
          </button>

          <button
            onClick={() => setActiveTab('weighing')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'weighing'
                ? 'bg-teal-600 text-white shadow-md ring-2 ring-teal-400'
                : isWeighingCompleted
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                : 'bg-slate-800 text-slate-300'
            }`}
          >
            {isWeighingCompleted ? '✓ Accuracy' : '○ Accuracy'}
          </button>

          <button
            onClick={() => setActiveTab('repeatability')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'repeatability'
                ? 'bg-teal-600 text-white shadow-md ring-2 ring-teal-400'
                : isRepeatabilityCompleted
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                : 'bg-slate-800 text-slate-300'
            }`}
          >
            {isRepeatabilityCompleted ? '✓ Repeatability' : '○ Repeatability'}
          </button>

          <button
            onClick={() => setActiveTab('discrimination')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'discrimination'
                ? 'bg-teal-600 text-white shadow-md ring-2 ring-teal-400'
                : isDiscriminationCompleted
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                : 'bg-slate-800 text-slate-300'
            }`}
          >
            {isDiscriminationCompleted ? '✓ Discrimination' : '○ Discrimination'}
          </button>

          <button
            onClick={() => setActiveTab('statictemp')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'statictemp'
                ? 'bg-teal-600 text-white shadow-md ring-2 ring-teal-400'
                : (session.staticTemperatureObservations || []).length >= 5
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                : 'bg-slate-800 text-slate-300'
            }`}
          >
            {(session.staticTemperatureObservations || []).length >= 5 ? '✓ Static Temp' : '🌡️ Static Temp'}
          </button>

          <button
            onClick={() => setActiveTab('disturbance')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'disturbance'
                ? 'bg-teal-600 text-white shadow-md ring-2 ring-teal-400'
                : 'bg-slate-800 text-slate-300'
            }`}
          >
            ⚡ Electronic & Disturbance
          </button>

          <button
            onClick={() => setActiveTab('review')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'review' ? 'bg-teal-600 text-white shadow-md' : 'bg-amber-950 text-amber-300 border border-amber-800'
            }`}
          >
            📋 Review & Approval
          </button>
        </div>
      </div>

      {/* TEST MODULE CONTAINER */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* TAB -1: EVALUATION TEST PLAN & RULES */}
        {activeTab === 'plan' && (
          <div className="p-6">
            <EvaluationTestPlanView
              session={session}
              activeRole={activeRole}
              onUpdateSession={(updated) => {
                setSession(updated);
                updateTestSession(updated);
              }}
              isReadOnly={!canEditTestSession(session, activeRole)}
            />
          </div>
        )}

        {/* TAB -2: STATIC TEMPERATURE TEST */}
        {activeTab === 'statictemp' && (
          <div className="p-6">
            <StaticTemperatureWizard
              session={session}
              activeRole={activeRole}
              onUpdateSession={(updated) => {
                setSession(updated);
                updateTestSession(updated);
              }}
              isReadOnly={!canEditTestSession(session, activeRole)}
            />
          </div>
        )}

        {/* TAB -3: DISTURBANCE & ELECTRONIC IMMUNITY FRAMEWORK */}
        {activeTab === 'disturbance' && (
          <div className="p-6">
            <DisturbanceModulesView
              session={session}
              activeRole={activeRole}
              isReadOnly={!canEditTestSession(session, activeRole)}
            />
          </div>
        )}

        {/* TAB 0: ZERO-SETTING ACCURACY TEST */}
        {activeTab === 'zerosetting' && (
          <div className="p-6 space-y-6">
            {/* Tab Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Zero-Setting Accuracy Test</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Official OIML R 76-1:2006 §4.5.2 &amp; Test Procedure A.4.2.3.
                </p>
              </div>

              <div className="flex items-center gap-3 bg-slate-900 text-white p-3 rounded-xl border border-slate-800 shrink-0 text-xs font-mono">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-sans font-bold">Zero-Setting Type</span>
                  <span className="font-bold text-teal-400">{zeroSettingType}</span>
                </div>
                <span className="text-slate-700">|</span>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-sans font-bold">Verification Interval (e)</span>
                  <span className="font-bold text-teal-300">{dVal} {dUnit}</span>
                </div>
                <span className="text-slate-700">|</span>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-sans font-bold">Allowed Limit (±0.25e)</span>
                  <span className="font-bold text-teal-300">±{(dVal * 0.25).toFixed(2)} {dUnit}</span>
                </div>
              </div>
            </div>

            {/* Guided Zero-Setting Wizard */}
            <ZeroSettingWizard
              zeroSettingType={zeroSettingType}
              eVal={dVal}
              eUnit={dUnit}
              existingObservation={(session.zeroSettingObservations || [])[0]}
              onSaveObservation={handleSaveZeroSettingObservation}
            />

            {/* Summary Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                Zero-Setting Accuracy Summary Table
              </h4>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <th className="py-2.5 px-4">Zero-Setting Type</th>
                      <th className="py-2.5 px-4">Verification Interval (e)</th>
                      <th className="py-2.5 px-4">Changeover Load (ΔL)</th>
                      <th className="py-2.5 px-4">Calculated Zero Error (E0)</th>
                      <th className="py-2.5 px-4">Allowed Limit (±0.25e)</th>
                      <th className="py-2.5 px-4">Zero-setting Accuracy Check</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-mono text-slate-800">
                    {session.zeroSettingObservations && session.zeroSettingObservations.length > 0 ? (
                      session.zeroSettingObservations.map((z, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4 font-sans font-bold text-slate-900">{z.zeroSettingType}</td>
                          <td className="py-2.5 px-4 font-bold">{z.verificationIntervalE} {z.eUnit}</td>
                          <td className="py-2.5 px-4 text-teal-700 font-bold">{z.changeoverAdditionalLoad.toFixed(1)} {z.eUnit}</td>
                          <td className="py-2.5 px-4 font-bold">
                            {z.calculatedZeroError > 0 ? '+' : ''}{z.calculatedZeroError.toFixed(2)} {z.eUnit}
                          </td>
                          <td className="py-2.5 px-4 font-bold text-teal-700">±{z.permissibleZeroDeviation.toFixed(2)} {z.eUnit}</td>
                          <td className="py-2.5 px-4 font-sans">
                            <span
                              className={`px-2.5 py-0.5 rounded font-bold inline-flex items-center gap-1 ${
                                z.passed
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                                  : 'bg-amber-50 text-amber-800 border border-amber-300'
                              }`}
                            >
                              {z.passed ? '✓ Within Limit' : '✕ Exceeds Limit'}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-400 font-sans">
                          No zero-setting accuracy observation recorded yet. Follow the guided steps above.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200">
              <div />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-lg transition-colors border border-slate-200 cursor-pointer"
                >
                  Save Draft
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!(session.zeroSettingObservations || []).some((o) => o.isCompleted)) {
                      showToast('Zero Setting Incomplete', 'Record a valid changeover observation before continuing.', 'warning');
                      return;
                    }
                    setActiveTab('eccentricity');
                    showToast('Zero Setting Saved', 'Progress updated cleanly.', 'success');
                  }}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg cursor-pointer shadow-xs"
                >
                  Save &amp; Continue <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 0.5: OIML TARE OPERATION TEST */}
        {activeTab === 'tare' && (
          <div className="p-6 space-y-6">
            <TareWizard
              session={session}
              instrument={getInstrumentsStore().find((i) => i.id === session.instrumentId)}
              onSaveTareSetting={handleSaveTareSetting}
              onSaveNetObservation={handleSaveTareNetObservation}
              onCompleteTareTest={handleCompleteTareTest}
            />
          </div>
        )}

        {/* TAB 1: ECCENTRICITY TEST */}
        {activeTab === 'eccentricity' && (
          <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Eccentricity Test</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Official OIML R 76-1:2006 §3.6.2 & Test Procedure A.4.7 compliance engine.
                </p>
              </div>

              {/* Single Global Test Load Input */}
              <div className="flex items-center gap-2 bg-slate-900 text-white p-2.5 rounded-xl border border-slate-800 shrink-0">
                <span className="text-xs font-bold text-teal-400 uppercase">Test Load (1/3 Max):</span>
                <div className="flex items-center">
                  <input
                    type="number"
                    step="0.001"
                    required
                    value={eccTestLoad}
                    onChange={(e) => setEccTestLoad(Number(e.target.value))}
                    className="w-24 px-2 py-1 bg-slate-800 text-white font-mono font-bold text-xs rounded-l border border-slate-700"
                  />
                  <span className="px-2 py-1 bg-slate-700 text-slate-300 font-bold text-xs rounded-r">kg</span>
                </div>
              </div>
            </div>

            {/* Overall Eccentricity Evaluation Banner */}
            {(() => {
              const overallEval = evaluateOverallEccentricity(session.eccentricityObservations, eccProfile, eccNumSupports);
              return (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-900 text-white rounded-xl border border-slate-800 text-xs gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-teal-400 uppercase">Overall Status:</span>
                    <span className={`font-bold font-mono px-2 py-0.5 rounded text-[11px] ${
                      overallEval.isPassed
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                        : overallEval.isComplete
                        ? 'bg-amber-950 text-amber-300 border border-amber-700'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}>
                      {overallEval.summaryText}
                    </span>
                  </div>
                  <div className="text-slate-400 text-[11px] font-mono">
                    Progress: {overallEval.completedPositions} / {overallEval.totalPositions} Positions Recorded
                  </div>
                </div>
              );
            })()}

            {/* Top-Down Platform Diagram */}
            <EccentricityPlatform
              currentPosition={eccPosition}
              profile={eccProfile}
              numSupports={eccNumSupports}
              onSelectPosition={(posId) => {
                setEccPosition(posId);
                const existingObs = session.eccentricityObservations.find((o) => o.position === posId);
                if (existingObs) {
                  setScaleReadingInput(existingObs.indicatedValue.toString());
                } else {
                  const calcVal = Number((eccTestLoad + (posId % 2 === 0 ? 0.002 : -0.001)).toFixed(3));
                  setScaleReadingInput(calcVal.toString());
                }
              }}
              observations={session.eccentricityObservations}
            />

            {(() => {
              const { eVal, eUnit } = parseVerificationInterval(session.verificationInterval);
              const readingVal = !scaleReadingInput || isNaN(Number(scaleReadingInput)) ? eccTestLoad : Number(scaleReadingInput);
              const currentMPECheck = evaluateMPEScaleReading({
                referenceLoad: eccTestLoad,
                referenceLoadUnit: 'kg',
                scaleReading: readingVal,
                scaleReadingUnit: 'kg',
                accuracyClass: session.accuracyClass,
                verificationScaleIntervalE: eVal,
                eUnit,
                verificationMode: 'INITIAL_VERIFICATION',
              });
              const currentPosConfig = getPosConfig(eccPosition);

              return (
                <>
                  {/* Selected Position Reading Form */}
                  <form onSubmit={handleSaveEccentricityReading} className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between font-bold text-xs text-slate-900 border-b border-slate-200 pb-2">
                      <span>Record Reading for Position {eccPosition} — {currentPosConfig.label}</span>
                      <span className="text-slate-600 font-mono text-[11px]">Test Load: {eccTestLoad.toFixed(3)} kg</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Reference Load (L)</label>
                        <div className="px-3 py-2 bg-slate-200 rounded-lg font-mono text-slate-800 font-bold">
                          {eccTestLoad.toFixed(3)} kg
                        </div>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Scale Reading (I) *</label>
                        <div className="flex items-center">
                          <input
                            type="number"
                            step="0.001"
                            required
                            value={scaleReadingInput}
                            onChange={(e) => setScaleReadingInput(e.target.value)}
                            placeholder="10.000"
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-l-lg font-mono text-slate-900 font-bold focus:outline-hidden focus:border-teal-600"
                          />
                          <span className="px-3 py-2 bg-slate-200 text-slate-700 font-bold rounded-r-lg border border-l-0 border-slate-200">
                            kg
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Notes (Optional)</label>
                        <input
                          type="text"
                          value={notesInput}
                          onChange={(e) => setNotesInput(e.target.value)}
                          placeholder="e.g. Reading stabilized"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900"
                        />
                      </div>
                    </div>

                    {/* Calculated Difference & Live MPE Check */}
                    <div className="p-3 bg-white rounded-lg border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3 font-mono flex-wrap">
                        <div>
                          <span className="text-slate-500">Difference (I - L): </span>
                          <span className="font-bold text-slate-900">{currentMPECheck.indicatedDifferenceFormatted}</span>
                        </div>
                        <span className="text-slate-300">|</span>
                        <div>
                          <span className="text-slate-500">Allowed MPE: </span>
                          <span className="font-bold text-teal-700">±{currentMPECheck.mpeResult.mpeValue} {currentMPECheck.mpeResult.mpeUnit}</span>
                        </div>
                        <span className="text-slate-300">|</span>
                        <div>
                          <span className="text-slate-500">MPE Check: </span>
                          <span
                            className={`font-bold font-mono px-2 py-0.5 rounded text-[11px] ${
                              currentMPECheck.isPassed
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}
                          >
                            {currentMPECheck.isPassed ? '✓ WITHIN MPE' : '✕ EXCEEDS MPE'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg transition-colors shadow-xs shrink-0 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" /> Save Reading
                      </button>
                    </div>
                  </form>

                  {/* Expandable MPE Calculation Breakdown Panel */}
                  <MPECalculationExplanationPanel checkResult={currentMPECheck} defaultExpanded={false} />
                </>
              );
            })()}

            {/* Position Readings Summary Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <th className="py-2.5 px-4">Position #</th>
                    <th className="py-2.5 px-4">Location</th>
                    <th className="py-2.5 px-4">Reference Load</th>
                    <th className="py-2.5 px-4">Scale Reading</th>
                    <th className="py-2.5 px-4">Measured Difference</th>
                    <th className="py-2.5 px-4">Allowed MPE</th>
                    <th className="py-2.5 px-4">MPE Check Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-mono text-slate-800">
                  {session.eccentricityObservations.length > 0 ? (
                    session.eccentricityObservations.map((ecc) => {
                      const { eVal, eUnit } = parseVerificationInterval(session.verificationInterval);
                      const mpeCheck = evaluateMPEScaleReading({
                        referenceLoad: ecc.load,
                        referenceLoadUnit: 'kg',
                        scaleReading: ecc.indicatedValue,
                        scaleReadingUnit: 'kg',
                        accuracyClass: session.accuracyClass,
                        verificationScaleIntervalE: eVal,
                        eUnit,
                        verificationMode: 'INITIAL_VERIFICATION',
                      });

                      return (
                        <tr key={ecc.position} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4 font-sans font-bold">Position {ecc.position}</td>
                          <td className="py-2.5 px-4 font-sans text-slate-700">{ecc.locationLabel}</td>
                          <td className="py-2.5 px-4">{ecc.load.toFixed(3)} kg</td>
                          <td className="py-2.5 px-4 font-bold">{ecc.indicatedValue.toFixed(3)} kg</td>
                          <td className="py-2.5 px-4 font-bold">
                            {mpeCheck.indicatedDifferenceFormatted}
                          </td>
                          <td className="py-2.5 px-4 font-bold text-teal-700">
                            ±{mpeCheck.mpeResult.mpeValue} {mpeCheck.mpeResult.mpeUnit}
                          </td>
                          <td className="py-2.5 px-4 font-sans">
                            <span
                              className={`px-2.5 py-0.5 rounded font-bold inline-flex items-center gap-1 ${
                                mpeCheck.isPassed
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                                  : 'bg-amber-50 text-amber-800 border border-amber-300'
                              }`}
                            >
                              {mpeCheck.isPassed ? '✓ Within MPE' : '✕ Exceeds MPE'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400 font-sans">
                        No position readings saved yet. Click Position 1 (Front Left) above to start.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* CLEAR BOTTOM NAVIGATION TOOLBAR */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('weighing')}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Previous Test
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-lg transition-colors border border-slate-200 cursor-pointer"
                >
                  Save Draft
                </button>

                {isEccCompleted ? (
                  <button
                    type="button"
                    onClick={() => setActiveTab('review')}
                    className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-lg transition-colors shadow-md cursor-pointer"
                  >
                    <Check className="w-4 h-4" /> Complete Test & Continue
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveTab('weighing')}
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    Save & Continue <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: WEIGHING ACCURACY & PERFORMANCE TEST */}
        {activeTab === 'weighing' && (
          <div className="p-6 space-y-6">
            {/* Context Header Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-slate-900">Weighing Performance & Accuracy Test</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 font-bold">
                    OIML R 76-1:2006
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Record scale readings for certified reference loads to evaluate errors against Table 6 MPE limits.
                </p>
              </div>

              {/* Verification Mode Selector */}
              <div className="flex items-center gap-2 bg-slate-900 text-white p-2 rounded-xl border border-slate-800 shrink-0 text-xs">
                <span className="font-bold text-teal-400 pl-1 uppercase text-[11px]">Mode:</span>
                <button
                  type="button"
                  onClick={() => setVerificationMode('INITIAL_VERIFICATION')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    verificationMode === 'INITIAL_VERIFICATION'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Initial Verification
                </button>
                <button
                  type="button"
                  onClick={() => setVerificationMode('IN_SERVICE')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    verificationMode === 'IN_SERVICE'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  In-Service
                </button>
              </div>
            </div>

            {/* Instrument Specification Banner Card */}
            {(() => {
              const registeredInst = getInstrumentsStore().find((i) => i.id === session.instrumentId);
              const { eVal, eUnit } = parseVerificationInterval(session.verificationInterval);
              const maxCapVal = registeredInst?.metrology.maxCapacity ?? 30;
              const maxCapUnit = registeredInst?.metrology.maxUnit ?? 'kg';
              const minCapVal = registeredInst?.metrology.minCapacity ?? 0.1;
              const minCapUnit = registeredInst?.metrology.minUnit ?? maxCapUnit;
              const dScaleVal = registeredInst?.metrology.scaleIntervalD ?? eVal;
              const dScaleUnit = registeredInst?.metrology.dUnit ?? eUnit;
              const nIntervals = registeredInst?.metrology.verificationScaleIntervalsN ?? calculateVerificationIntervals(maxCapVal, maxCapUnit, eVal, eUnit);

              return (
                <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-teal-400">
                      Instrument Metrological Context
                    </span>
                    <span className="text-xs font-mono text-slate-400">ID: {session.instrumentId}</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 text-xs font-mono">
                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Class</span>
                      <span className="font-bold text-teal-300 text-sm">{session.accuracyClass}</span>
                    </div>

                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Max Cap</span>
                      <span className="font-bold text-white text-sm">{maxCapVal} {maxCapUnit}</span>
                    </div>

                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Min Cap</span>
                      <span className="font-bold text-white text-sm">{minCapVal} {minCapUnit}</span>
                    </div>

                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Interval (e)</span>
                      <span className="font-bold text-teal-400 text-sm">{eVal} {eUnit}</span>
                    </div>

                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Interval (d)</span>
                      <span className="font-bold text-white text-sm">{dScaleVal} {dScaleUnit}</span>
                    </div>

                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Intervals (n)</span>
                      <span className="font-bold text-white text-sm">{nIntervals.toLocaleString()}</span>
                    </div>

                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Mode</span>
                      <span className="font-bold text-amber-400 text-[11px] uppercase">
                        {verificationMode === 'INITIAL_VERIFICATION' ? 'Initial' : 'In-Service'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Suggested Load Points Helper */}
            {(() => {
              const registeredInst = getInstrumentsStore().find((i) => i.id === session.instrumentId);
              const { eVal, eUnit } = parseVerificationInterval(session.verificationInterval);
              const maxCapVal = registeredInst?.metrology.maxCapacity ?? 30;
              const minCapVal = registeredInst?.metrology.minCapacity ?? 0.1;

              // Suggested load points in kg
              const suggested500e = Number(convertMassUnit(500 * eVal, eUnit, 'kg').toFixed(3));
              const suggested2000e = Number(convertMassUnit(2000 * eVal, eUnit, 'kg').toFixed(3));
              const suggestedHalf = Number((maxCapVal / 2).toFixed(3));

              const suggestions = [
                { label: `Min (${minCapVal} kg)`, val: minCapVal },
                { label: `500e Band (${suggested500e} kg)`, val: suggested500e },
                { label: `2000e Band (${suggested2000e} kg)`, val: suggested2000e },
                { label: `50% Max (${suggestedHalf} kg)`, val: suggestedHalf },
                { label: `100% Max (${maxCapVal} kg)`, val: maxCapVal },
              ].filter((s) => s.val > 0 && s.val <= maxCapVal);

              return (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Scale className="w-4 h-4 text-teal-600" />
                      Suggested Test Load Points (Demo Helper):
                    </span>
                    <span className="text-[10px] text-slate-500 italic">
                      ℹ Suggested for demo/workflow speed. Officers may enter any prescribed test load.
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {suggestions.map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setWeighingRefLoadInput(s.val.toString());
                          setWeighingScaleReadingInput((s.val + (s.val === 10 ? 0.008 : 0.001)).toFixed(3));
                        }}
                        className="px-3 py-1.5 bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-400 rounded-lg text-slate-700 hover:text-teal-900 font-mono font-semibold transition-colors cursor-pointer text-xs shadow-2xs"
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Observation Form */}
            {(() => {
              const { eVal, eUnit } = parseVerificationInterval(session.verificationInterval);
              const refNum = isNaN(Number(weighingRefLoadInput)) || Number(weighingRefLoadInput) <= 0 ? 10 : Number(weighingRefLoadInput);
              const readingNum = isNaN(Number(weighingScaleReadingInput)) || Number(weighingScaleReadingInput) < 0 ? refNum : Number(weighingScaleReadingInput);

              const liveMPECheck = evaluateMPEScaleReading({
                referenceLoad: refNum,
                referenceLoadUnit: 'kg',
                scaleReading: readingNum,
                scaleReadingUnit: 'kg',
                accuracyClass: session.accuracyClass,
                verificationScaleIntervalE: eVal,
                eUnit,
                verificationMode,
              });

              return (
                <>
                  <form onSubmit={handleSaveWeighingObservation} className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between font-bold text-xs text-slate-900 border-b border-slate-200 pb-2">
                      <span>Add Weighing Performance Observation</span>
                      <span className="text-slate-600 font-mono text-[11px]">Mode: {verificationMode.replace('_', ' ')}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Reference Load (L) *</label>
                        <div className="flex items-center">
                          <input
                            type="number"
                            step="0.001"
                            required
                            value={weighingRefLoadInput}
                            onChange={(e) => setWeighingRefLoadInput(e.target.value)}
                            placeholder="10.000"
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-l-lg font-mono text-slate-900 font-bold focus:outline-hidden focus:border-teal-600"
                          />
                          <span className="px-3 py-2 bg-slate-200 text-slate-700 font-bold rounded-r-lg border border-l-0 border-slate-200">
                            kg
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Scale Reading (I) *</label>
                        <div className="flex items-center">
                          <input
                            type="number"
                            step="0.001"
                            required
                            value={weighingScaleReadingInput}
                            onChange={(e) => setWeighingScaleReadingInput(e.target.value)}
                            placeholder="10.008"
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-l-lg font-mono text-slate-900 font-bold focus:outline-hidden focus:border-teal-600"
                          />
                          <span className="px-3 py-2 bg-slate-200 text-slate-700 font-bold rounded-r-lg border border-l-0 border-slate-200">
                            kg
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Load Direction</label>
                        <select
                          value={weighingDirection}
                          onChange={(e) => setWeighingDirection(e.target.value as 'Increasing' | 'Decreasing')}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium"
                        >
                          <option value="Increasing">Increasing (Ascending)</option>
                          <option value="Decreasing">Decreasing (Descending)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Notes (Optional)</label>
                        <input
                          type="text"
                          value={weighingNotesInput}
                          onChange={(e) => setWeighingNotesInput(e.target.value)}
                          placeholder="e.g. Stable reading"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900"
                        />
                      </div>
                    </div>

                    {/* Calculated Live Error & MPE Check */}
                    <div className="p-3.5 bg-white rounded-lg border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3 font-mono flex-wrap">
                        <div>
                          <span className="text-slate-500">Measured Error (I - L): </span>
                          <span className="font-bold text-slate-900">{liveMPECheck.indicatedDifferenceFormatted}</span>
                        </div>
                        <span className="text-slate-300">|</span>
                        <div>
                          <span className="text-slate-500">Allowed MPE: </span>
                          <span className="font-bold text-teal-700">±{liveMPECheck.mpeResult.mpeValue} {liveMPECheck.mpeResult.mpeUnit}</span>
                        </div>
                        <span className="text-slate-300">|</span>
                        <div>
                          <span className="text-slate-500">MPE Check: </span>
                          <span
                            className={`font-bold font-mono px-2.5 py-0.5 rounded text-[11px] ${
                              liveMPECheck.isPassed
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}
                          >
                            {liveMPECheck.isPassed ? '✓ WITHIN MPE' : '✕ EXCEEDS MPE'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg transition-colors shadow-xs shrink-0 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" /> Add Observation
                      </button>
                    </div>
                  </form>

                  {/* Expandable MPE Calculation Breakdown Panel */}
                  <MPECalculationExplanationPanel checkResult={liveMPECheck} defaultExpanded={false} />
                </>
              );
            })()}

            {/* Weighing Observations Summary Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <th className="py-2.5 px-4">Obs #</th>
                    <th className="py-2.5 px-4">Reference Load</th>
                    <th className="py-2.5 px-4">Scale Reading</th>
                    <th className="py-2.5 px-4">Difference</th>
                    <th className="py-2.5 px-4">Allowed MPE</th>
                    <th className="py-2.5 px-4">MPE Check</th>
                    <th className="py-2.5 px-4">Notes</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-mono text-slate-800">
                  {session.weighingObservations.length > 0 ? (
                    session.weighingObservations.map((obs, idx) => {
                      const { eVal, eUnit } = parseVerificationInterval(session.verificationInterval);
                      const mpeCheck = evaluateMPEScaleReading({
                        referenceLoad: obs.load,
                        referenceLoadUnit: 'kg',
                        scaleReading: obs.indicatedValue,
                        scaleReadingUnit: 'kg',
                        accuracyClass: session.accuracyClass,
                        verificationScaleIntervalE: eVal,
                        eUnit,
                        verificationMode,
                      });

                      return (
                        <tr key={obs.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4 font-sans font-bold text-slate-900">#{idx + 1}</td>
                          <td className="py-2.5 px-4 font-bold">{obs.load.toFixed(3)} kg</td>
                          <td className="py-2.5 px-4 font-bold">{obs.indicatedValue.toFixed(3)} kg</td>
                          <td className="py-2.5 px-4 font-bold">
                            {mpeCheck.indicatedDifferenceFormatted}
                          </td>
                          <td className="py-2.5 px-4 font-bold text-teal-700">
                            ±{mpeCheck.mpeResult.mpeValue} {mpeCheck.mpeResult.mpeUnit}
                          </td>
                          <td className="py-2.5 px-4 font-sans">
                            <span
                              className={`px-2 py-0.5 rounded font-bold inline-flex items-center gap-1 ${
                                mpeCheck.isPassed
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                                  : 'bg-amber-50 text-amber-800 border border-amber-300'
                              }`}
                            >
                              {mpeCheck.isPassed ? '✓ Within MPE' : '✕ Exceeds MPE'}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-sans text-slate-500">{obs.notes || '—'}</td>
                          <td className="py-2.5 px-4 text-right font-sans">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleEditWeighingObservation(obs)}
                                className="p-1 rounded text-teal-600 hover:bg-teal-50 cursor-pointer"
                                title="Edit Observation"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteWeighingObservation(obs.id)}
                                className="p-1 rounded text-rose-500 hover:bg-rose-50 cursor-pointer"
                                title="Delete Observation"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                        No weighing accuracy test points recorded yet. Use the form above to add observation points.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('eccentricity')}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Previous Test (Eccentricity)
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-lg transition-colors border border-slate-200 cursor-pointer"
                >
                  Save Draft
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (session.weighingObservations.length === 0) {
                      showToast('No Observations', 'Record at least one weighing accuracy observation point before completing.', 'warning');
                      return;
                    }
                    setActiveTab('repeatability');
                    showToast('Accuracy Test Saved', 'Progress updated cleanly.', 'success');
                  }}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg cursor-pointer shadow-xs"
                >
                  Save & Continue <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'repeatability' && (
          <div className="p-6 space-y-6">
            <div className="pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Repeatability Evaluation</h3>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <p className="font-bold text-slate-900">10 Runs at 50% & 100% Max Capacity</p>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('weighing')}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Previous Test (Accuracy)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('discrimination')}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg cursor-pointer"
              >
                Save &amp; Continue to Discrimination <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: DISCRIMINATION TEST */}
        {activeTab === 'discrimination' && (
          <div className="p-6 space-y-6">
            {/* Tab Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Discrimination Test</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Official OIML R 76-1:2006 §3.8 &amp; Test Procedure A.4.8.2 (Digital Indication).
                </p>
              </div>

              {/* Scale Interval Breakdown Display */}
              <div className="flex items-center gap-3 bg-slate-900 text-white p-3 rounded-xl border border-slate-800 shrink-0 text-xs font-mono">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-sans font-bold">Scale Interval (d)</span>
                  <span className="font-bold text-teal-400">{dVal} {dUnit}</span>
                </div>
                <span className="text-slate-700">|</span>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-sans font-bold">0.1d (Increment)</span>
                  <span className="font-bold text-teal-300">{(dVal * 0.1).toFixed(1)} {dUnit}</span>
                </div>
                <span className="text-slate-700">|</span>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-sans font-bold">1.4d (Test Weight)</span>
                  <span className="font-bold text-teal-300">{(dVal * 1.4).toFixed(1)} {dUnit}</span>
                </div>
              </div>
            </div>

            {/* Helper Info Banner */}
            <div className="p-3 bg-teal-50 border border-teal-200 text-teal-900 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span>ℹ NAWI Verify calculates the small additional test weights automatically from d ({dVal} {dUnit}).</span>
              <span className="font-mono text-[11px] font-bold text-teal-800 shrink-0">
                0.1d = {(dVal * 0.1).toFixed(1)} {dUnit} • 1.4d = {(dVal * 1.4).toFixed(1)} {dUnit}
              </span>
            </div>

            {/* Applicability Warning Banner if applicable */}
            {(() => {
              const appCheck = isDigitalDiscriminationApplicable({
                testContext: session.testContext || 'TYPE_EXAMINATION',
                dVal,
                dUnit,
                isDigital: true,
              });

              if (!appCheck.isApplicable) {
                return (
                  <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    <div>
                      <span className="font-bold uppercase block text-[11px] text-amber-950">Procedure Applicability Notice</span>
                      <span>{appCheck.message}</span>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Overall Status Banner */}
            {(() => {
              const overallEval = evaluateOverallDiscrimination(session.discriminationObservations || []);
              return (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-900 text-white rounded-xl border border-slate-800 text-xs gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-teal-400 uppercase">Overall Status:</span>
                    <span
                      className={`font-bold font-mono px-2 py-0.5 rounded text-[11px] ${
                        overallEval.isPassed
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                          : overallEval.isComplete
                          ? 'bg-amber-950 text-amber-300 border border-amber-700'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {overallEval.summaryText}
                    </span>
                  </div>
                  <div className="text-slate-400 text-[11px] font-mono">
                    Progress: {overallEval.completedCount} / 3 Required Test Points Completed
                  </div>
                </div>
              );
            })()}

            {/* 3 Required Load Points Navigation Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 pb-3">
              {discriminationPoints.map((pt) => {
                const obs = (session.discriminationObservations || []).find((o) => o.testPointId === pt.id);
                const isDone = obs?.isCompleted || obs?.resultStatus;
                const isSelected = activeDiscPointId === pt.id;

                let badgeClass = 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200';
                if (isSelected) badgeClass = 'bg-teal-600 text-white border-teal-600 ring-2 ring-teal-500/20 shadow-sm';
                else if (isDone) badgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-300';

                return (
                  <button
                    key={pt.id}
                    type="button"
                    onClick={() => setActiveDiscPointId(pt.id)}
                    className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition-all shrink-0 cursor-pointer ${badgeClass}`}
                  >
                    {isDone ? '✓ ' : isSelected ? '● ' : '○ '}
                    {pt.label} ({pt.baseLoad.toFixed(3)} {pt.unit})
                  </button>
                );
              })}
            </div>

            {/* Wizard Component for Selected Load Point */}
            {(() => {
              const activePt = discriminationPoints.find((p) => p.id === activeDiscPointId) || discriminationPoints[0];
              const activeObs = (session.discriminationObservations || []).find((o) => o.testPointId === activePt.id);

              return (
                <DiscriminationWizard
                  key={activePt.id}
                  testPoint={activePt}
                  dVal={dVal}
                  dUnit={dUnit}
                  existingObservation={activeObs}
                  onSaveObservation={handleSaveDiscriminationObservation}
                />
              );
            })()}

            {/* Discrimination Observations Summary Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                Discrimination Test Summary Table
              </h4>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <th className="py-2.5 px-4">Test Point</th>
                      <th className="py-2.5 px-4">Base Load</th>
                      <th className="py-2.5 px-4">Scale Interval (d)</th>
                      <th className="py-2.5 px-4">Applied 1.4d</th>
                      <th className="py-2.5 px-4">Initial I</th>
                      <th className="py-2.5 px-4">Transition (I − d)</th>
                      <th className="py-2.5 px-4">Final Indication</th>
                      <th className="py-2.5 px-4">Expected (I + d)</th>
                      <th className="py-2.5 px-4">Discrimination Check</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-mono text-slate-800">
                    {session.discriminationObservations && session.discriminationObservations.length > 0 ? (
                      session.discriminationObservations.map((disc) => (
                        <tr key={disc.testPointId} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4 font-sans font-bold text-slate-900">{disc.testPointLabel}</td>
                          <td className="py-2.5 px-4 font-bold">{disc.load.toFixed(3)} {disc.loadUnit}</td>
                          <td className="py-2.5 px-4 text-teal-700 font-bold">{disc.scaleIntervalD} {disc.dUnit}</td>
                          <td className="py-2.5 px-4 text-teal-700 font-bold">{disc.onePointFourD} {disc.dUnit}</td>
                          <td className="py-2.5 px-4 font-bold">{disc.initialIndication.toFixed(3)} {disc.loadUnit}</td>
                          <td className="py-2.5 px-4 font-bold text-amber-700">
                            {(disc.transitionIndication || disc.expectedLowerIndication || 0).toFixed(3)} {disc.loadUnit}
                          </td>
                          <td className="py-2.5 px-4 font-bold">
                            {(disc.finalIndication || 0).toFixed(3)} {disc.loadUnit}
                          </td>
                          <td className="py-2.5 px-4 font-bold text-emerald-700">
                            {(disc.expectedFinalIndication || 0).toFixed(3)} {disc.loadUnit}
                          </td>
                          <td className="py-2.5 px-4 font-sans">
                            <span
                              className={`px-2.5 py-0.5 rounded font-bold inline-flex items-center gap-1 ${
                                disc.passed
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                                  : 'bg-amber-50 text-amber-800 border border-amber-300'
                              }`}
                            >
                              {disc.passed ? '✓ Response Confirmed' : '✕ Not Observed'}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9} className="py-6 text-center text-slate-400 font-sans">
                          No discrimination test points recorded yet. Select Test Point 1 (Minimum Load) above to begin.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('repeatability')}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Previous Test (Repeatability)
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-lg transition-colors border border-slate-200 cursor-pointer"
                >
                  Save Draft
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if ((session.discriminationObservations || []).filter((o) => o.isCompleted || o.resultStatus).length < 3) {
                      showToast('Incomplete Discrimination Test', 'Complete all 3 required test points (Min, Half Max, Max) before continuing.', 'warning');
                      return;
                    }
                    setActiveTab('review');
                    showToast('Discrimination Test Saved', 'All 3 test points confirmed.', 'success');
                  }}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg cursor-pointer shadow-xs"
                >
                  Save &amp; Continue to Review <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'review' && (
          <div className="p-6 space-y-6">
            <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Test Session Review &amp; Sign-Off</h3>
                <p className="text-xs text-slate-500">Summary of all completed test modules and current workflow status.</p>
              </div>
              <Badge status={session.status} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1">
                <span className="font-bold text-emerald-950 block">Weighing Accuracy Test</span>
                <span className="text-emerald-700 font-semibold">✓ Completed (6 points)</span>
              </div>

              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1">
                <span className="font-bold text-emerald-950 block">Repeatability Test</span>
                <span className="text-emerald-700 font-semibold">✓ Completed (10 runs)</span>
              </div>

              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1">
                <span className="font-bold text-emerald-950 block">Eccentricity Test</span>
                <span className="text-emerald-700 font-semibold">
                  {isEccCompleted ? '✓ Completed (4 positions)' : '● In Progress'}
                </span>
              </div>

              <div
                className={`p-4 rounded-xl border space-y-1 ${
                  isDiscriminationCompleted ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
                }`}
              >
                <span className="font-bold text-slate-950 block">Discrimination Test</span>
                <span className={`font-semibold ${isDiscriminationCompleted ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {isDiscriminationCompleted ? '✓ Completed (3 points)' : '● In Progress'}
                </span>
              </div>
            </div>

            {/* ROLE-SPECIFIC WORKFLOW ACTION BOX */}
            <div className="p-6 bg-slate-900 text-white rounded-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
                    Role Action Portal: {activeRole}
                  </span>
                  <Badge status={session.workflowStatus || session.status} size="sm" />
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  State: {getWorkflowStatusLabel(session.workflowStatus)}
                </span>
              </div>

              {/* Highlight correction reason if CHANGES_REQUESTED */}
              {session.workflowStatus === 'CHANGES_REQUESTED' && session.correctionReason && (
                <div className="p-3.5 bg-rose-950/80 border border-rose-700/60 rounded-xl text-xs space-y-1">
                  <span className="font-bold text-rose-300 block flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    Correction Requested by Reviewer ({session.correctionRequestedBy}):
                  </span>
                  <p className="text-rose-200 font-mono italic pl-5">"{session.correctionReason}"</p>
                </div>
              )}

              {/* TESTING OFFICER ACTIONS */}
              {activeRole === 'Testing Officer' && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-xs text-slate-300">
                    {canSubmitForReview(session, activeRole)
                      ? 'Confirm all readings are recorded before submitting for senior technical review.'
                      : `Session is currently ${getWorkflowStatusLabel(session.workflowStatus)}. Locked for editing.`}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab('weighing')}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      Return to Test
                    </button>
                    {canSubmitForReview(session, activeRole) && (
                      <button
                        onClick={handleSubmitForReview}
                        className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-lg transition-colors shadow-md cursor-pointer"
                      >
                        <Send className="w-4 h-4" /> Submit for Review
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* TECHNICAL REVIEWER ACTIONS */}
              {activeRole === 'Technical Reviewer' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-300">
                    As Senior Technical Reviewer, audit recorded observations and approve or request correction.
                  </p>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-300 block">
                      Reviewer Audit Comments (Persisted):
                    </label>
                    <textarea
                      rows={2}
                      value={reviewerCommentInput}
                      onChange={(e) => setReviewerCommentInput(e.target.value)}
                      placeholder="Enter technical audit notes, observations status, or reason for correction..."
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-teal-500 font-mono"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <span className="text-[11px] text-slate-400">
                      Current State: <strong className="text-teal-300">{getWorkflowStatusLabel(session.workflowStatus)}</strong>
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleRequestChanges}
                        className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" /> Request Changes
                      </button>

                      <button
                        type="button"
                        onClick={handleApproveReview}
                        className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-colors shadow-md cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4" /> Technical Approve
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* LAB DIRECTOR ACTIONS */}
              {activeRole === 'Approving Officer / Lab Director' && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-slate-300">
                      As Laboratory Director, provide official evaluation approval and issue the final OIML R-76 Certificate.
                    </p>
                    <div className="text-[11px] text-teal-400 font-mono">
                      State: <strong>{getWorkflowStatusLabel(session.workflowStatus)}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {session.workflowStatus === 'TECHNICALLY_APPROVED' && (
                      <button
                        type="button"
                        onClick={handleDirectorApprove}
                        className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-colors shadow-md cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Approve Evaluation
                      </button>
                    )}

                    {(session.workflowStatus === 'APPROVED' || session.workflowStatus === 'TECHNICALLY_APPROVED') && (
                      <button
                        type="button"
                        onClick={handleFinalizeCertificate}
                        className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-lg transition-colors shadow-md cursor-pointer"
                      >
                        <Award className="w-4 h-4" /> Finalize & Issue Certificate
                      </button>
                    )}

                    {session.workflowStatus === 'FINALIZED' && (
                      <span className="px-4 py-2 bg-emerald-950 text-emerald-300 border border-emerald-700 font-bold text-xs rounded-lg flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-emerald-400" /> Certificate Finalized
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* WORKFLOW HISTORY & REVIEW AUDIT LOG (PART 42 & 43) */}
            <div className="p-6 bg-white rounded-xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-teal-600" />
                  Workflow Transition & Audit History Log
                </h4>
                <span className="text-[11px] text-slate-500 font-mono">
                  {(session.workflowHistory || []).length} Transition Events Recorded
                </span>
              </div>

              {(session.workflowHistory || []).length > 0 ? (
                <div className="space-y-3">
                  {session.workflowHistory?.map((evt) => (
                    <div
                      key={evt.id}
                      className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900">{evt.user}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold">
                            {evt.role}
                          </span>
                          <span className="text-slate-400">→</span>
                          <Badge status={evt.toStatus} size="sm" />
                        </div>
                        {evt.comment && (
                          <p className="text-slate-600 font-mono text-[11px] italic pt-0.5">
                            "{evt.comment}"
                          </p>
                        )}
                      </div>

                      <span className="text-[11px] font-mono text-slate-400 shrink-0">
                        {evt.timestamp}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-400 font-mono">
                  No workflow history transitions logged yet.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
