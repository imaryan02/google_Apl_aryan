export type ZoneRiskLevel = 'safe' | 'warning' | 'critical';

export interface Zone {
  id: string;
  stadiumId: string;
  name: string;
  code: string; // ZONE_A to ZONE_H
  capacity: number;
  currentDensity: number; // percentage 0-100
  movementSpeed: 'normal' | 'slow' | 'stagnant';
  riskLevel: ZoneRiskLevel;
  cameraId: string;
  warningThreshold: number;
  criticalThreshold: number;
}
