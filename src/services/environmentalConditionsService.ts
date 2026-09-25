export interface StructuredEnvironmentalReading {
  id: string;
  timestamp: string;
  temperature: number; // Ambient or Chamber Temperature in °C
  humidity: number; // Relative Humidity in %
  barometricPressure?: number; // Pressure in hPa
  supplyVoltage?: number; // V AC or V DC
  supplyFrequency?: number; // Hz (e.g. 50 Hz or 60 Hz)
  isStabilized: boolean; // Soak time / thermal stabilization status
  notes?: string;
}

/**
 * Creates a structured environmental record linked to test observations.
 */
export function createEnvironmentalReading(params: {
  temperature: number;
  humidity: number;
  barometricPressure?: number;
  supplyVoltage?: number;
  supplyFrequency?: number;
  isStabilized?: boolean;
  notes?: string;
}): StructuredEnvironmentalReading {
  return {
    id: `ENV-${Date.now()}`,
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    temperature: params.temperature,
    humidity: params.humidity,
    barometricPressure: params.barometricPressure ?? 1013.2,
    supplyVoltage: params.supplyVoltage ?? 230,
    supplyFrequency: params.supplyFrequency ?? 50,
    isStabilized: params.isStabilized ?? true,
    notes: params.notes || '',
  };
}

/**
 * Formats a structured environmental reading into a concise human-readable string.
 */
export function formatEnvironmentalReading(reading: StructuredEnvironmentalReading): string {
  const parts = [
    `Temp: ${reading.temperature} °C`,
    `RH: ${reading.humidity}%`,
  ];
  if (reading.barometricPressure) {
    parts.push(`Pressure: ${reading.barometricPressure} hPa`);
  }
  if (reading.supplyVoltage) {
    parts.push(`Voltage: ${reading.supplyVoltage} V`);
  }
  if (reading.supplyFrequency) {
    parts.push(`Freq: ${reading.supplyFrequency} Hz`);
  }
  return parts.join(' • ');
}

/**
 * Validates environmental reading values against reasonable physical limits.
 */
export function validateEnvironmentalSanity(reading: Partial<StructuredEnvironmentalReading>): {
  isValid: boolean;
  errorMessage?: string;
} {
  if (reading.temperature !== undefined && (reading.temperature < -40 || reading.temperature > 80)) {
    return { isValid: false, errorMessage: 'Temperature out of physical test range (-40 °C to +80 °C).' };
  }
  if (reading.humidity !== undefined && (reading.humidity < 0 || reading.humidity > 100)) {
    return { isValid: false, errorMessage: 'Relative humidity must be between 0% and 100%.' };
  }
  if (reading.barometricPressure !== undefined && (reading.barometricPressure < 700 || reading.barometricPressure > 1200)) {
    return { isValid: false, errorMessage: 'Barometric pressure out of range (700 hPa to 1200 hPa).' };
  }
  if (reading.supplyVoltage !== undefined && reading.supplyVoltage < 0) {
    return { isValid: false, errorMessage: 'Supply voltage cannot be negative.' };
  }
  return { isValid: true };
}
