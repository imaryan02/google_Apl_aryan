export type RouteType = 'public' | 'vip' | 'staff' | 'emergency';
export type RouteStatus = 'open' | 'restricted' | 'blocked' | 'reserved';

export interface Route {
  id: string;
  stadiumId: string;
  name: string; // e.g. R-01, E-02
  fromZoneId: string; // zone table ID
  toLocation: string; // destination name
  routeType: RouteType;
  capacity: number;
  status: RouteStatus;
  priority: number;
  assignedTeamId: string | null;
  isEmergencyLane: boolean;
}
