export type VipMovementStatus = 'planned' | 'active' | 'completed' | 'cancelled' | 'delayed';

export interface VipMovement {
  id: string;
  stadiumId: string;
  vipName: string;
  arrivalTime: string;
  entryGate: string;
  destination: string;
  securityLevel: 'VVIP' | 'VIP' | 'Standard';
  expectedPeople: number;
  convoySize: number;
  primaryRouteId: string;
  backupRouteId: string;
  assignedTeamId: string;
  movementStatus: VipMovementStatus;
}
