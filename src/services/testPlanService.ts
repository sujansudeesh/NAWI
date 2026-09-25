import {
  TestContext,
  TestCategory,
  ApplicabilityStatus,
  DecisionSource,
  TestPlanItem,
  AdministrativeChecklistItem,
  Instrument,
  MetrologicalCharacteristics,
} from '../types';

export interface InstrumentSpecsInput {
  accuracyClass?: string;
  maxCapacity?: number;
  minCapacity?: number;
  scaleIntervalD?: number;
  verificationIntervalE?: number;
  digitalIndication?: boolean;
  zeroSettingType?: string;
  tareDeviceAvailable?: boolean;
  tareType?: string;
  loadReceptorType?: string;
  numberOfSupports?: number;
  powerSupplyType?: string;
  electronicInstrument?: boolean;
  vehicleScale?: boolean;
  multiInterval?: boolean;
  multipleRange?: boolean;
}

export const CATEGORY_LABELS: Record<TestCategory, { label: string; description: string }> = {
  ADMINISTRATIVE: {
    label: 'Administrative Examination',
    description: 'Pre-test documentation, markings, photographs, and stamping arrangements per OIML R 76 Annex A.',
  },
  METROLOGICAL: {
    label: 'Metrological / Performance Tests',
    description: 'Core weighing accuracy, MPE limits, repeatability, eccentricity, zero-setting, and tare tests.',
  },
  INFLUENCE: {
    label: 'Influence Factor Tests',
    description: 'Environmental temperature (-10°C to +40°C) and damp heat steady-state testing during Type Examination.',
  },
  DISTURBANCE: {
    label: 'Disturbance & Electronic Immunity Tests',
    description: 'AC/DC voltage variations, ESD, electrical bursts, surges, RF immunity, and vehicle power supply disturbances.',
  },
  STABILITY: {
    label: 'Stability & Tilt Tests',
    description: '28-day span stability logging and level cut-off sensor mechanisms for non-level installations.',
  },
};

/**
 * Generates initial default OIML R 76 Annex A Administrative Examination Checklist
 */
export function getDefaultAdministrativeChecklist(): AdministrativeChecklistItem[] {
  return [
    {
      id: 'docAvailable',
      label: 'Technical Documentation & Type Approval Certificate Available',
      clause: 'OIML R 76-1 Annex A §A.1',
      completed: true,
      notes: 'OIML TAC and circuit schematics verified.',
    },
    {
      id: 'photosTaken',
      label: 'Instrument & Nameplate Photographs Captured',
      clause: 'OIML R 76-1 Annex A §A.1.1',
      completed: true,
      notes: 'High-res photos of data plate, display, and load receptor archived.',
    },
    {
      id: 'techSpecsVerified',
      label: 'Technical Specifications & Range Limits Verified',
      clause: 'OIML R 76-1 Annex A §A.2',
      completed: true,
      notes: 'Max, Min, e, d match submitted manufacturer specification sheet.',
    },
    {
      id: 'operatingInstructionsPresent',
      label: 'Operating Instructions & Manual Provided',
      clause: 'OIML R 76-1 Annex A §A.2.1',
      completed: true,
      notes: 'User manual in official language present.',
    },
    {
      id: 'metrologicalCharsRecorded',
      label: 'Metrological Characteristics Recorded (Class, Max, Min, e, d)',
      clause: 'OIML R 76-1 Clause 3.1',
      completed: true,
      notes: 'Accuracy class and scale intervals confirmed.',
    },
    {
      id: 'descriptiveMarkingsReviewed',
      label: 'Descriptive Markings & Inscriptions Reviewed',
      clause: 'OIML R 76-1 Clause 3.9',
      completed: true,
      notes: 'Mandatory inscriptions (Max, Min, e, Class, Serial No.) checked on nameplate.',
    },
    {
      id: 'stampingArrangementsReviewed',
      label: 'Stamping & Securing Arrangements Reviewed',
      clause: 'OIML R 76-1 Clause 4.18',
      completed: true,
      notes: 'Physical lead seals and electronic audit counter checked.',
    },
  ];
}

/**
 * Central Rule Engine generating Recommended Test Plan based on Instrument Characteristics and Test Context.
 */
export function generateRecommendedTestPlan(
  instrument: Instrument | InstrumentSpecsInput,
  testContext: TestContext = 'TYPE_EXAMINATION'
): TestPlanItem[] {
  let metrology: InstrumentSpecsInput;
  if ('metrology' in instrument && instrument.metrology) {
    const m = (instrument as Instrument).metrology;
    metrology = {
      accuracyClass: m.accuracyClass,
      maxCapacity: m.maxCapacity,
      minCapacity: m.minCapacity,
      scaleIntervalD: m.scaleIntervalD,
      verificationIntervalE: m.verificationIntervalE,
      digitalIndication: true,
      zeroSettingType: m.zeroSettingType || 'SEMI_AUTOMATIC',
      tareDeviceAvailable: m.tareDeviceAvailable ?? true,
      tareType: m.tareType || 'SUBTRACTIVE',
      numberOfSupports: 4,
      powerSupplyType: 'AC_MAINS',
      electronicInstrument: true,
      vehicleScale: (instrument as Instrument).model?.instrumentType === 'Weighbridge',
      multiInterval: m.isMultiInterval || false,
    };
  } else {
    metrology = instrument as InstrumentSpecsInput;
  }

  const isTypeExam = testContext === 'TYPE_EXAMINATION';
  const isInitialVerif = testContext === 'INITIAL_VERIFICATION';

  const tareAvail = metrology.tareDeviceAvailable ?? true;
  const tareType = metrology.tareType ?? 'SUBTRACTIVE';
  const hasTare = tareAvail && tareType !== 'NONE';

  const dVal = metrology.scaleIntervalD ?? 5;
  const isDigital = metrology.digitalIndication ?? true;
  const isElectronic = metrology.electronicInstrument ?? true;
  const isMainsPowered = metrology.powerSupplyType !== 'BATTERY_ONLY';
  const isVehicleScale = metrology.vehicleScale ?? false;
  const isVehicleSupply = metrology.powerSupplyType === 'VEHICLE_BATTERY' || isVehicleScale;

  const plan: TestPlanItem[] = [
    // 1. ADMINISTRATIVE EXAMINATION
    {
      id: 'adminChecklist',
      name: 'Administrative Examination Checklist',
      category: 'ADMINISTRATIVE',
      ruleReference: 'OIML R 76-1 Annex A / A.1 - A.3',
      applicableContexts: ['TYPE_EXAMINATION', 'INITIAL_VERIFICATION', 'IN_SERVICE_INSPECTION'],
      status: 'APPLICABLE',
      reason: 'Administrative examination of documentation, markings, photos, and seals applies across all verification contexts.',
      requiredByDefault: true,
      isSelected: true,
      decisionSource: 'RECOMMENDED_ENGINE',
    },

    // 2. METROLOGICAL PERFORMANCE TESTS
    {
      id: 'accuracy',
      name: 'Weighing Performance & Accuracy Test (MPE)',
      category: 'METROLOGICAL',
      ruleReference: 'OIML R 76-1 Clause 3.5.1 / A.4.4',
      applicableContexts: ['TYPE_EXAMINATION', 'INITIAL_VERIFICATION', 'IN_SERVICE_INSPECTION'],
      status: 'APPLICABLE',
      reason: 'Core weighing accuracy test evaluating scale indications against MPE limits applies to all NAWI instruments.',
      requiredByDefault: true,
      isSelected: true,
      decisionSource: 'RECOMMENDED_ENGINE',
    },
    {
      id: 'repeatability',
      name: 'Repeatability Test',
      category: 'METROLOGICAL',
      ruleReference: 'OIML R 76-1 Clause 3.6.1 / A.4.10',
      applicableContexts: ['TYPE_EXAMINATION', 'INITIAL_VERIFICATION', 'IN_SERVICE_INSPECTION'],
      status: 'APPLICABLE',
      reason: isTypeExam
        ? 'Type Examination requires 2 series (approx 0.5 Max and 1.0 Max; 10 weighings if Max < 1000 kg, at least 3 if Max >= 1000 kg) per OIML R 76-1 A.4.10.'
        : 'Routine Verification requires 1 series at approx 0.8 Max (3 weighings for Class III/IIII, 6 for Class I/II) per OIML R 76-1 A.4.10.',
      requiredByDefault: true,
      isSelected: true,
      decisionSource: 'RECOMMENDED_ENGINE',
    },
    {
      id: 'eccentricity',
      name: 'Eccentric Loading Test',
      category: 'METROLOGICAL',
      ruleReference: 'OIML R 76-1 Clause 3.6.2 / A.4.7',
      applicableContexts: ['TYPE_EXAMINATION', 'INITIAL_VERIFICATION', 'IN_SERVICE_INSPECTION'],
      status: 'APPLICABLE',
      reason: 'Off-centre load position test applies to all load receptors (standard L = 1/3(Max + TareAdd), >4 supports L = 1/(N-1)(Max + TareAdd), tanks L = 1/10(Max + TareAdd)).',
      requiredByDefault: true,
      isSelected: true,
      decisionSource: 'RECOMMENDED_ENGINE',
    },
    {
      id: 'discrimination',
      name: 'Digital Discrimination Test',
      category: 'METROLOGICAL',
      ruleReference: 'OIML R 76-1 Clause 3.8 / A.4.8',
      applicableContexts: ['TYPE_EXAMINATION'],
      status: isTypeExam && isDigital && dVal >= 0.005 ? 'APPLICABLE' : 'NOT_APPLICABLE',
      reason: isTypeExam
        ? isDigital
          ? 'Digital discrimination test (1.4d additional load) included for Type Examination of digital indication instruments.'
          : 'NOT APPLICABLE: Instrument does not use digital indication.'
        : `NOT APPLICABLE for ${isInitialVerif ? 'Initial Verification' : 'In-Service Inspection'} context (Required primarily during Type Examination per Clause 3.8 / A.4.8).`,
      requiredByDefault: isTypeExam,
      isSelected: isTypeExam && isDigital && dVal >= 0.005,
      decisionSource: 'RECOMMENDED_ENGINE',
    },
    {
      id: 'zeroSetting',
      name: 'Zero-Setting Accuracy Test',
      category: 'METROLOGICAL',
      ruleReference: 'OIML R 76-1 Clause 4.5.2 / A.4.2.3',
      applicableContexts: ['TYPE_EXAMINATION', 'INITIAL_VERIFICATION', 'IN_SERVICE_INSPECTION'],
      status: 'APPLICABLE',
      reason: 'Zero-setting accuracy test (|E0| <= 0.25e limit) applies to non-automatic, semi-automatic, and automatic zero devices.',
      requiredByDefault: true,
      isSelected: true,
      decisionSource: 'RECOMMENDED_ENGINE',
    },
    {
      id: 'tare',
      name: 'Tare Operation & Net Weighing Test',
      category: 'METROLOGICAL',
      ruleReference: 'OIML R 76-1 Clause 4.6 / A.4.6',
      applicableContexts: ['TYPE_EXAMINATION', 'INITIAL_VERIFICATION', 'IN_SERVICE_INSPECTION'],
      status: hasTare ? 'APPLICABLE' : 'NOT_APPLICABLE',
      reason: hasTare
        ? `Included because instrument has an active tare device (tareDeviceAvailable = true, type: ${tareType}).`
        : 'NOT APPLICABLE because instrument has no tare device (tareDeviceAvailable = false or tareType = NONE).',
      requiredByDefault: hasTare,
      isSelected: hasTare,
      decisionSource: 'RECOMMENDED_ENGINE',
    },

    // 3. INFLUENCE FACTOR TESTS
    {
      id: 'tempEffectZero',
      name: 'Static Temperature Test (-10°C to +40°C)',
      category: 'INFLUENCE',
      ruleReference: 'OIML R 76-1 Clause 5.3.1 / A.5.3.1',
      applicableContexts: ['TYPE_EXAMINATION'],
      status: isTypeExam && isElectronic ? 'APPLICABLE' : 'NOT_APPLICABLE',
      reason: isTypeExam
        ? isElectronic
          ? 'Static temperature chamber testing (-10°C to +40°C) included for Type Examination of electronic instruments.'
          : 'NOT APPLICABLE: Mechanical non-electronic instrument.'
        : 'NOT APPLICABLE for Routine Verification (Laboratory Type Approval environmental test).',
      requiredByDefault: isTypeExam && isElectronic,
      isSelected: isTypeExam && isElectronic,
      decisionSource: 'RECOMMENDED_ENGINE',
    },
    {
      id: 'dampHeat',
      name: 'Damp Heat, Steady State Test',
      category: 'INFLUENCE',
      ruleReference: 'OIML R 76-1 Clause 5.3.3 / A.5.3.3',
      applicableContexts: ['TYPE_EXAMINATION'],
      status: isTypeExam && isElectronic ? 'APPLICABLE' : 'NOT_APPLICABLE',
      reason: isTypeExam
        ? isElectronic
          ? 'Chamber damp heat test (85% RH at +40°C for 2 days) included for electronic instruments.'
          : 'NOT APPLICABLE: Mechanical instrument.'
        : 'NOT APPLICABLE for Routine Verification.',
      requiredByDefault: false,
      isSelected: false,
      decisionSource: 'RECOMMENDED_ENGINE',
    },

    // 4. DISTURBANCE & ELECTRONIC IMMUNITY TESTS
    {
      id: 'voltageVariation',
      name: 'AC / DC Voltage Variation Test',
      category: 'DISTURBANCE',
      ruleReference: 'OIML R 76-1 Clause 5.4.1 / A.5.4.1',
      applicableContexts: ['TYPE_EXAMINATION'],
      status: isTypeExam && isElectronic && isMainsPowered ? 'APPLICABLE' : 'NOT_APPLICABLE',
      reason: isTypeExam
        ? isElectronic && isMainsPowered
          ? 'AC mains voltage variation test (+10% to -15% Unom) included for AC mains operated electronic instruments.'
          : 'NOT APPLICABLE: Instrument is battery-only operated.'
        : 'NOT APPLICABLE for Routine Verification.',
      requiredByDefault: false,
      isSelected: false,
      decisionSource: 'RECOMMENDED_ENGINE',
    },
    {
      id: 'voltageDips',
      name: 'Voltage Dips & Short Interruptions',
      category: 'DISTURBANCE',
      ruleReference: 'OIML R 76-1 Clause 5.4.1 / A.5.4.2',
      applicableContexts: ['TYPE_EXAMINATION'],
      status: isTypeExam && isElectronic && isMainsPowered ? 'APPLICABLE' : 'NOT_APPLICABLE',
      reason: isTypeExam && isElectronic && isMainsPowered
        ? 'Power mains dip and short interruption immunity test included for AC powered instruments.'
        : 'NOT APPLICABLE: Instrument is not connected to AC mains.',
      requiredByDefault: false,
      isSelected: false,
      decisionSource: 'RECOMMENDED_ENGINE',
    },
    {
      id: 'acBursts',
      name: 'Electrical Fast Transients / Bursts',
      category: 'DISTURBANCE',
      ruleReference: 'OIML R 76-1 Clause 5.4.2 / A.5.4.3',
      applicableContexts: ['TYPE_EXAMINATION'],
      status: isTypeExam && isElectronic ? 'APPLICABLE' : 'NOT_APPLICABLE',
      reason: isTypeExam && isElectronic
        ? 'Electrical fast transient burst immunity test included for electronic weighing systems.'
        : 'NOT APPLICABLE: Non-electronic instrument.',
      requiredByDefault: false,
      isSelected: false,
      decisionSource: 'RECOMMENDED_ENGINE',
    },
    {
      id: 'electrostaticDischarge',
      name: 'Electrostatic Discharge (ESD)',
      category: 'DISTURBANCE',
      ruleReference: 'OIML R 76-1 Clause 5.4.3 / A.5.4.4',
      applicableContexts: ['TYPE_EXAMINATION'],
      status: isTypeExam && isElectronic ? 'APPLICABLE' : 'NOT_APPLICABLE',
      reason: isTypeExam && isElectronic
        ? 'ESD immunity test (6 kV contact, 8 kV air discharge) included for electronic instruments.'
        : 'NOT APPLICABLE: Mechanical instrument.',
      requiredByDefault: false,
      isSelected: false,
      decisionSource: 'RECOMMENDED_ENGINE',
    },
    {
      id: 'surgeImmunity',
      name: 'Surge Immunity Test',
      category: 'DISTURBANCE',
      ruleReference: 'OIML R 76-1 Clause 5.4.4 / A.5.4.5',
      applicableContexts: ['TYPE_EXAMINATION'],
      status: isTypeExam && isElectronic && isMainsPowered ? 'APPLICABLE' : 'NOT_APPLICABLE',
      reason: isTypeExam && isElectronic && isMainsPowered
        ? 'Mains power line surge immunity test included for AC mains connected instruments.'
        : 'NOT APPLICABLE: Non-mains powered instrument.',
      requiredByDefault: false,
      isSelected: false,
      decisionSource: 'RECOMMENDED_ENGINE',
    },
    {
      id: 'radiatedRf',
      name: 'Radiated Electromagnetic Fields Immunity',
      category: 'DISTURBANCE',
      ruleReference: 'OIML R 76-1 Clause 5.4.5 / A.5.4.6',
      applicableContexts: ['TYPE_EXAMINATION'],
      status: isTypeExam && isElectronic ? 'APPLICABLE' : 'NOT_APPLICABLE',
      reason: isTypeExam && isElectronic
        ? 'Radiated RF field immunity test (80 MHz to 2000 MHz at 10 V/m) included for electronic instruments.'
        : 'NOT APPLICABLE: Mechanical instrument.',
      requiredByDefault: false,
      isSelected: false,
      decisionSource: 'RECOMMENDED_ENGINE',
    },
    {
      id: 'conductedRf',
      name: 'Conducted Radio-Frequency Fields Immunity',
      category: 'DISTURBANCE',
      ruleReference: 'OIML R 76-1 Clause 5.4.6 / A.5.4.7',
      applicableContexts: ['TYPE_EXAMINATION'],
      status: isTypeExam && isElectronic && isMainsPowered ? 'APPLICABLE' : 'NOT_APPLICABLE',
      reason: isTypeExam && isElectronic && isMainsPowered
        ? 'Conducted RF immunity test (150 kHz to 80 MHz at 10 V) included for I/O and mains cables.'
        : 'NOT APPLICABLE: Battery-only instrument with no power/data cables.',
      requiredByDefault: false,
      isSelected: false,
      decisionSource: 'RECOMMENDED_ENGINE',
    },
    {
      id: 'vehiclePowerDisturbance',
      name: 'Road Vehicle Power Supply Disturbances',
      category: 'DISTURBANCE',
      ruleReference: 'OIML R 76-1 Clause 5.4.7 / A.5.4.8',
      applicableContexts: ['TYPE_EXAMINATION'],
      status: isTypeExam && isElectronic && isVehicleSupply ? 'APPLICABLE' : 'NOT_APPLICABLE',
      reason: isTypeExam && isElectronic && isVehicleSupply
        ? 'Road vehicle 12 V / 24 V DC battery supply voltage transient test included for vehicle-powered scales.'
        : 'NOT APPLICABLE: Instrument is not powered by road vehicle supply network.',
      requiredByDefault: false,
      isSelected: false,
      decisionSource: 'RECOMMENDED_ENGINE',
    },

    // 5. STABILITY & OTHER TESTS
    {
      id: 'spanStability',
      name: '28-Day Span Stability Logging',
      category: 'STABILITY',
      ruleReference: 'OIML R 76-1 Clause 5.3.2 / A.5.2',
      applicableContexts: ['TYPE_EXAMINATION'],
      status: 'REQUIRES_LAB_CONFIRMATION',
      reason: 'REQUIRES LAB CONFIRMATION: Requires 28-day environmental chamber logging setup. Lab Director must confirm if long-term stability protocol is active.',
      requiredByDefault: false,
      isSelected: false,
      decisionSource: 'RECOMMENDED_ENGINE',
    },
  ];

  return plan;
}

/**
 * Manually overrides applicability status or selection of a test in the plan.
 */
export function overrideTestApplicability(
  plan: TestPlanItem[],
  testId: string,
  newStatus: ApplicabilityStatus,
  isSelected: boolean,
  reason: string,
  user: string
): TestPlanItem[] {
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

  return plan.map((item) => {
    if (item.id === testId) {
      return {
        ...item,
        status: newStatus,
        isSelected,
        reason: `[Manual Override by ${user}]: ${reason}`,
        decisionSource: 'MANUAL_OVERRIDE',
        overriddenBy: user,
        overriddenAt: now,
        overrideReason: reason,
      };
    }
    return item;
  });
}
