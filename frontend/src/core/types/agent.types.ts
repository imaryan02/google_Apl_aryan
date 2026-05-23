import type { AlertSeverity } from './alert.types';

export type AgentType = 
  | 'crowd_monitoring' 
  | 'prediction' 
  | 'smart_routing' 
  | 'vip_coordination' 
  | 'emergency_response';

export type RecommendationStatus = 'pending' | 'approved' | 'rejected' | 'modified' | 'executed';

export interface AgentRecommendation {
  id: string;
  stadiumId: string;
  alertId?: string;
  agentType: AgentType;
  severity: AlertSeverity;
  summary: string;
  recommendation: string;
  reasoning: string;
  suggestedActions: string[];
  status: RecommendationStatus;
  reviewedBy?: string;
  createdAt: string;
  reviewedAt?: string;
}
