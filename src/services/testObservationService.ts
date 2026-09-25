import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  WeighingTestObservation,
  RepeatabilityTestObservation,
  EccentricityTestObservation,
  DiscriminationTestObservation,
  ZeroSettingTestObservation,
  TareNetWeighingObservation,
  TareSettingObservation,
} from '../types';

export const testObservationService = {
  /**
   * Save a single test observation row to Supabase test_observations table
   */
  async saveObservation(sessionTestId: string, observation: {
    observationType: string;
    referenceValue?: number;
    referenceUnit?: string;
    indicatedValue?: number;
    indicatedUnit?: string;
    calculatedError?: number;
    errorUnit?: string;
    mpeValue?: number;
    mpeUnit?: string;
    result?: string;
    position?: string;
    trialNumber?: number;
    seriesName?: string;
    notes?: string;
    metadata?: any;
    recordedBy?: string;
  }) {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('test_observations')
        .insert({
          session_test_id: sessionTestId,
          observation_type: observation.observationType,
          reference_value: observation.referenceValue,
          reference_unit: observation.referenceUnit || 'g',
          indicated_value: observation.indicatedValue,
          indicated_unit: observation.indicatedUnit || 'g',
          calculated_error: observation.calculatedError,
          error_unit: observation.errorUnit || 'g',
          mpe_value: observation.mpeValue,
          mpe_unit: observation.mpeUnit || 'g',
          result: observation.result,
          position: observation.position,
          trial_number: observation.trialNumber,
          series_name: observation.seriesName,
          notes: observation.notes,
          metadata: observation.metadata || {},
          recorded_by: observation.recordedBy,
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving observation to Supabase:', error);
      }
      return data;
    }
    return observation;
  },

  /**
   * Format & Save Accuracy / Weighing Observation
   */
  async saveWeighingObservation(sessionTestId: string, obs: WeighingTestObservation, userId?: string) {
    return this.saveObservation(sessionTestId, {
      observationType: 'WEIGHING_ACCURACY',
      referenceValue: obs.load,
      indicatedValue: obs.indicatedValue,
      calculatedError: obs.calculatedError,
      mpeValue: obs.mpeLimit,
      mpeUnit: obs.mpeUnit || 'g',
      result: obs.passed ? 'WITHIN_MPE' : 'EXCEEDS_MPE',
      seriesName: obs.direction,
      notes: obs.notes,
      metadata: {
        deltaL: obs.deltaL,
        adjustedError: obs.adjustedError,
        indicatedDifferenceFormatted: obs.indicatedDifferenceFormatted,
        ruleStandard: 'OIML R 76-1:2006',
      },
      recordedBy: userId,
    });
  },

  /**
   * Format & Save Repeatability Observation
   */
  async saveRepeatabilityObservation(sessionTestId: string, obs: RepeatabilityTestObservation, userId?: string) {
    return this.saveObservation(sessionTestId, {
      observationType: 'REPEATABILITY',
      referenceValue: obs.load,
      indicatedValue: obs.indicatedValue,
      calculatedError: obs.error,
      trialNumber: obs.runNumber,
      metadata: {
        zeroIndication: obs.zeroIndication,
        ruleStandard: 'OIML R 76-1:2006',
      },
      recordedBy: userId,
    });
  },

  /**
   * Format & Save Eccentricity Observation
   */
  async saveEccentricityObservation(sessionTestId: string, obs: EccentricityTestObservation, userId?: string) {
    return this.saveObservation(sessionTestId, {
      observationType: 'ECCENTRICITY',
      referenceValue: obs.load,
      indicatedValue: obs.indicatedValue,
      calculatedError: obs.error,
      mpeValue: obs.mpeValue,
      mpeUnit: obs.mpeUnit || 'g',
      result: obs.passed ? 'WITHIN_MPE' : 'EXCEEDS_MPE',
      position: obs.locationLabel,
      trialNumber: obs.position,
      metadata: {
        indicatedDifferenceFormatted: obs.indicatedDifferenceFormatted,
        ruleStandard: 'OIML R 76-1:2006',
      },
      recordedBy: userId,
    });
  },

  /**
   * Format & Save Discrimination Observation
   */
  async saveDiscriminationObservation(sessionTestId: string, obs: DiscriminationTestObservation, userId?: string) {
    return this.saveObservation(sessionTestId, {
      observationType: 'DISCRIMINATION',
      referenceValue: obs.load,
      referenceUnit: obs.loadUnit,
      indicatedValue: obs.finalIndication || obs.initialIndication,
      indicatedUnit: obs.dUnit,
      result: obs.passed ? 'CONFIRMED' : 'NOT_OBSERVED',
      position: obs.testPointId,
      notes: obs.notes,
      metadata: {
        testPointLabel: obs.testPointLabel,
        scaleIntervalD: obs.scaleIntervalD,
        oneTenthD: obs.oneTenthD,
        onePointFourD: obs.onePointFourD,
        initialIndication: obs.initialIndication,
        transitionIndication: obs.transitionIndication,
        expectedFinalIndication: obs.expectedFinalIndication,
        finalIndication: obs.finalIndication,
        ruleStandard: 'OIML R 76-1:2006 Clause 3.8',
      },
      recordedBy: userId,
    });
  },

  /**
   * Format & Save Zero-Setting Accuracy Observation
   */
  async saveZeroSettingObservation(sessionTestId: string, obs: ZeroSettingTestObservation, userId?: string) {
    return this.saveObservation(sessionTestId, {
      observationType: 'ZERO_SETTING_ACCURACY',
      referenceValue: 0,
      indicatedValue: 0,
      calculatedError: obs.calculatedZeroError,
      mpeValue: obs.permissibleZeroDeviation,
      mpeUnit: obs.eUnit,
      result: obs.passed ? 'WITHIN_LIMIT' : 'EXCEEDS_LIMIT',
      notes: obs.notes,
      metadata: {
        zeroSettingType: obs.zeroSettingType,
        verificationIntervalE: obs.verificationIntervalE,
        changeoverAdditionalLoad: obs.changeoverAdditionalLoad,
        ruleStandard: 'OIML R 76-1:2006 Clause 4.5.2 / A.4.2.3',
      },
      recordedBy: userId,
    });
  },

  /**
   * Format & Save Tare Test Observation
   */
  async saveTareSettingObservation(sessionTestId: string, obs: TareSettingObservation, userId?: string) {
    return this.saveObservation(sessionTestId, {
      observationType: 'TARE_SETTING_ACCURACY',
      referenceValue: obs.appliedTareLoad,
      referenceUnit: obs.tareLoadUnit,
      indicatedValue: obs.displayedIndicationAfterTare,
      calculatedError: obs.calculatedTareZeroError,
      mpeValue: obs.permissibleTareZeroError,
      result: obs.passed ? 'WITHIN_LIMIT' : 'EXCEEDS_LIMIT',
      notes: obs.notes,
      metadata: {
        changeoverAdditionalLoad: obs.changeoverAdditionalLoad,
        ruleStandard: 'OIML R 76-1:2006 Clause 4.6.3 / A.4.6.2',
      },
      recordedBy: userId,
    });
  },

  async saveTareNetWeighingObservation(sessionTestId: string, obs: TareNetWeighingObservation, userId?: string) {
    return this.saveObservation(sessionTestId, {
      observationType: 'TARE_NET_WEIGHING',
      referenceValue: obs.referenceNetLoad,
      indicatedValue: obs.displayedNetReading,
      calculatedError: obs.netError,
      mpeValue: obs.mpeLimit,
      mpeUnit: obs.mpeUnit,
      result: obs.passed ? 'WITHIN_MPE' : 'EXCEEDS_MPE',
      trialNumber: obs.stepIndex,
      seriesName: obs.stepLabel,
      notes: obs.notes,
      metadata: {
        appliedTareLoad: obs.appliedTareLoad,
        calculatedGrossLoad: obs.calculatedGrossLoad,
        netErrorFormatted: obs.netErrorFormatted,
        ruleStandard: 'OIML R 76-1:2006 Clause 3.5.3.3 / A.4.6.1',
      },
      recordedBy: userId,
    });
  },
};
