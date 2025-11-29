/**
 * Types for NASA InSight Mars Weather API
 * Based on official API documentation
 */

export interface InSightWeatherData {
  sol_keys: string[];
  validity_checks: ValidityChecks;
  [sol: string]: SolData | string[] | ValidityChecks;
}

export interface SolData {
  AT?: SensorData; // Atmospheric Temperature
  HWS?: SensorData; // Horizontal Wind Speed
  PRE?: SensorData; // Atmospheric Pressure
  WD?: WindDirectionData;
  First_UTC: string;
  Last_UTC: string;
  Season: string;
  Northern_season?: string;
  Southern_season?: string;
  Month_ordinal?: number;
}

export interface SensorData {
  av: number; // Average
  ct: number; // Count
  mn: number; // Minimum
  mx: number; // Maximum
}

export interface WindDirectionData {
  [compassPoint: string]: CompassPointData | null;
  most_common: CompassPointData | null;
}

export interface CompassPointData {
  compass_degrees: number;
  compass_point: string;
  compass_right: number;
  compass_up: number;
  ct: number;
}

export interface ValidityChecks {
  sol_hours_required: number;
  sols_checked: string[];
  [sol: string]: SolValidityCheck | number | string[];
}

export interface SolValidityCheck {
  AT?: SensorValidity;
  HWS?: SensorValidity;
  PRE?: SensorValidity;
  WD?: SensorValidity;
}

export interface SensorValidity {
  sol_hours_with_data: number[];
  valid: boolean;
}

