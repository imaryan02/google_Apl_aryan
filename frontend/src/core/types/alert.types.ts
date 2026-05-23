export type AlertType = 
  | 'congestion' 
  | 'stampede_risk' 
  | 'vip_conflict' 
  | 'route_blockage' 
  | 'emergency_incident' 
  | 'camera_failure';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertStatus = 'active' | 'resolved';

export interface Alert {
  id: string;
  stadiumId: string;
  zoneId: string;
  zoneCode: string;
  alertType: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  status: AlertStatus;
  source: 'system' | 'ai_agent';
  createdAt: string;
  resolvedAt?: string;
}

export interface Incident {
  id: string;
  stadiumId: string;
  alertId: string;
  zoneId: string;
  incidentType: string;
  severity: AlertSeverity;
  assignedTeamId: string;
  status: 'open' | 'investigating' | 'resolved';
  responseNotes?: string;
  startedAt: string;
  resolvedAt?: string;
}
