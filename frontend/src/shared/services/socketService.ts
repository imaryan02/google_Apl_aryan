import { io, Socket } from 'socket.io-client';
import { useDashboardStore } from '../store/dashboardStore';

import type { Route } from '../../core/types/route.types';
import type { Alert } from '../../core/types/alert.types';
import type { VipMovement } from '../../core/types/vip.types';
import { API_BASE_URL } from '../config/api';


class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;

  public connect(backendUrl: string = API_BASE_URL) {
    if (this.socket) return;

    console.log(`[SocketService] Connecting to ${backendUrl}...`);
    this.socket = io(backendUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    this.setupListeners();

    // Bind Zustand store action triggers to socket emits (decoupled event mediator pattern)
    useDashboardStore.setState({
      onActionTriggered: (action, payload) => {
        if (!this.socket || !this.isConnected) return;
        
        if (action === 'approveRecommendation') {
          this.socket.emit('operator_approve_recommendation', { recommendation_id: payload });
        } else if (action === 'rejectRecommendation') {
          this.socket.emit('operator_reject_recommendation', { recommendation_id: payload });
        } else if (action === 'updateRouteStatus') {
          this.socket.emit('operator_update_route', { route_id: payload.id, status: payload.status });
        } else if (action === 'toggleEmergencyMode') {
          this.socket.emit('operator_activate_emergency', { emergency_mode: payload });
        } else if (action === 'updateVipStatus') {
          this.socket.emit('operator_update_vip_status', { vip_id: payload.id, movement_status: payload.status });
        }
      }
    });
  }

  public disconnect() {
    if (!this.socket) return;
    console.log('[SocketService] Disconnecting...');
    this.socket.disconnect();
    this.socket = null;
    this.isConnected = false;
  }

  private setupListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('[SocketService] Connected successfully. Connection ID:', this.socket?.id);
      this.isConnected = true;
      useDashboardStore.setState({ systemTime: new Date().toLocaleTimeString() });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[SocketService] Disconnected. Reason:', reason);
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('[SocketService] Connection error:', error);
      this.isConnected = false;
    });

    // 1. system:welcome
    this.socket.on('system:welcome', (data) => {
      console.log('[SocketService] Welcome message received from server:', data);
    });

    // 2. zone:update
    this.socket.on('zone:update', (data: { 
      id: string, 
      code: string, 
      current_density: number, 
      risk_level: string, 
      movement_speed: string,
      warning_threshold?: number,
      critical_threshold?: number
    }) => {
      console.log('[SocketService] Zone updated received:', data);
      const updates: any = {
        currentDensity: data.current_density,
        riskLevel: data.risk_level as any,
        movementSpeed: data.movement_speed as any
      };
      if (data.warning_threshold !== undefined) updates.warningThreshold = data.warning_threshold;
      if (data.critical_threshold !== undefined) updates.criticalThreshold = data.critical_threshold;
      useDashboardStore.getState().syncZone(data.code, updates);
    });

    // 3. route:update
    this.socket.on('route:update', (data: { id: string, status: string }) => {
      console.log('[SocketService] Route updated received:', data);
      useDashboardStore.getState().syncRoute(data.id, {
        status: data.status as any
      });
    });

    // 4. vip:update
    this.socket.on('vip:update', (data: any) => {
      console.log('[SocketService] VIP updated received:', data);
      const updates: Partial<VipMovement> = {};
      if (data.stadium_id !== undefined) updates.stadiumId = data.stadium_id;
      if (data.vip_name !== undefined) updates.vipName = data.vip_name;
      if (data.arrival_time !== undefined) updates.arrivalTime = data.arrival_time;
      if (data.entry_gate !== undefined) updates.entryGate = data.entry_gate;
      if (data.destination !== undefined) updates.destination = data.destination;
      if (data.security_level !== undefined) updates.securityLevel = data.security_level;
      if (data.expected_people !== undefined) updates.expectedPeople = Number(data.expected_people);
      if (data.convoy_size !== undefined) updates.convoySize = Number(data.convoy_size);
      if (data.primary_route_id !== undefined) updates.primaryRouteId = data.primary_route_id;
      if (data.backup_route_id !== undefined) updates.backupRouteId = data.backup_route_id;
      if (data.assigned_team_id !== undefined) updates.assignedTeamId = data.assigned_team_id;
      if (data.movement_status !== undefined) updates.movementStatus = data.movement_status as any;
      useDashboardStore.getState().syncVip(data.id, updates);
    });

    // 4b. vip:delete
    this.socket.on('vip:delete', (data: { id: string }) => {
      console.log('[SocketService] VIP deleted received:', data);
      useDashboardStore.getState().deleteVip(data.id);
    });

    // 5. alert:new
    this.socket.on('alert:new', (data: any) => {
      console.log('[SocketService] New Alert received:', data);
      const currentAlerts = useDashboardStore.getState().alerts;
      if (!currentAlerts.some(a => a.id === data.id)) {
        const newAlert: Alert = {
          id: data.id,
          stadiumId: data.stadium_id || 's1',
          zoneId: data.zone_id,
          zoneCode: data.zone_code,
          alertType: data.alert_type,
          severity: data.severity as any,
          title: data.title,
          description: data.description,
          status: data.status as any,
          source: data.source as any,
          createdAt: data.created_at || new Date().toISOString()
        };
        useDashboardStore.setState({ alerts: [newAlert, ...currentAlerts] });
        useDashboardStore.getState().recalculateGlobalRisk();
      }
    });

    // 6. alert:resolved
    this.socket.on('alert:resolved', (data: { id: string, status: string, resolved_at?: string }) => {
      console.log('[SocketService] Alert resolved received:', data);
      useDashboardStore.getState().syncAlert(data.id, {
        status: 'resolved' as const,
        resolvedAt: data.resolved_at || new Date().toISOString()
      });
    });

    // 7. agent:recommendation
    this.socket.on('agent:recommendation', (data: any) => {
      console.log('[SocketService] Recommendation update received:', data);
      const updates: any = {};
      if (data.status) updates.status = data.status;
      if (data.reviewed_at) updates.reviewedAt = data.reviewed_at;
      if (data.reviewed_by) updates.reviewedBy = data.reviewed_by;
      if (data.stadium_id) updates.stadiumId = data.stadium_id;
      if (data.alert_id) updates.alertId = data.alert_id;
      if (data.agent_type) updates.agentType = data.agent_type;
      if (data.severity) updates.severity = data.severity;
      if (data.summary) updates.summary = data.summary;
      if (data.recommendation) updates.recommendation = data.recommendation;
      if (data.reasoning) updates.reasoning = data.reasoning;
      if (data.suggested_actions) updates.suggestedActions = data.suggested_actions;
      if (data.created_at) updates.createdAt = data.created_at;
      
      useDashboardStore.getState().syncRecommendation(data.id, updates);
    });

    // 8. emergency:triggered
    this.socket.on('emergency:triggered', (data: { emergency_mode: boolean, crowd_health_score: number }) => {
      console.log('[SocketService] Emergency override signal received:', data);
      useDashboardStore.setState({
        emergencyMode: data.emergency_mode,
        crowdHealthScore: data.crowd_health_score
      });
      useDashboardStore.getState().recalculateGlobalRisk();
    });
  }

  // OUTWARD OPERATIONS EMITTERS (Frontend commands -> Backend persists and broadcasts)
  
  public emitApproveRecommendation(recommendationId: string) {
    if (!this.socket || !this.isConnected) return;
    console.log('[SocketService] Emitting approve recommendation:', recommendationId);
    this.socket.emit('operator_approve_recommendation', { recommendation_id: recommendationId });
  }

  public emitRejectRecommendation(recommendationId: string) {
    if (!this.socket || !this.isConnected) return;
    console.log('[SocketService] Emitting reject recommendation:', recommendationId);
    this.socket.emit('operator_reject_recommendation', { recommendation_id: recommendationId });
  }

  public emitUpdateRouteStatus(routeId: string, status: Route['status']) {
    if (!this.socket || !this.isConnected) return;
    console.log('[SocketService] Emitting update route status:', routeId, status);
    this.socket.emit('operator_update_route', { route_id: routeId, status });
  }

  public emitActivateEmergency(active: boolean) {
    if (!this.socket || !this.isConnected) return;
    console.log('[SocketService] Emitting activate emergency:', active);
    this.socket.emit('operator_activate_emergency', { emergency_mode: active });
  }

  public emitUpdateVipStatus(vipId: string, status: VipMovement['movementStatus']) {
    if (!this.socket || !this.isConnected) return;
    console.log('[SocketService] Emitting update VIP status:', vipId, status);
    this.socket.emit('operator_update_vip_status', { vip_id: vipId, movement_status: status });
  }
}

export const socketService = new SocketService();
