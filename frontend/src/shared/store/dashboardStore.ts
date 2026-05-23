import { create } from 'zustand';
import type { Zone, ZoneRiskLevel } from '../../core/types/zone.types';
import type { Route } from '../../core/types/route.types';
import type { Alert } from '../../core/types/alert.types';
import type { VipMovement } from '../../core/types/vip.types';
import type { AgentRecommendation } from '../../core/types/agent.types';

interface DashboardState {
  // Global Operational Telemetry
  stadiumName: string;
  stadiumCapacity: number;
  currentOccupancy: number;
  matchPhase: string;
  globalRiskLevel: ZoneRiskLevel;
  crowdHealthScore: number;
  emergencyMode: boolean;
  systemTime: string;

  // Domain Telemetry Arrays
  zones: Zone[];
  routes: Route[];
  alerts: Alert[];
  vipMovements: VipMovement[];
  agentRecommendations: AgentRecommendation[];

  // Interactive Operations Actions
  toggleEmergencyMode: () => void;
  approveRecommendation: (id: string) => void;
  rejectRecommendation: (id: string) => void;
  updateZoneDensity: (code: string, density: number) => void;
  updateRouteStatus: (id: string, status: Route['status']) => void;
  updateVipStatus: (id: string, status: VipMovement['movementStatus']) => void;
  addAlert: (alert: Omit<Alert, 'id' | 'createdAt'>) => void;
  resolveAlert: (id: string) => void;
  setSystemTime: (time: string) => void;
  recalculateGlobalRisk: () => void;
  onActionTriggered?: (action: string, payload: any) => void;
  
  // Real-time synchronization actions
  syncZone: (code: string, updates: Partial<Zone>) => void;
  syncRoute: (id: string, updates: Partial<Route>) => void;
  syncVip: (id: string, updates: Partial<VipMovement>) => void;
  deleteVip: (id: string) => void;
  syncAlert: (id: string, updates: Partial<Alert>) => void;
  syncRecommendation: (id: string, updates: Partial<AgentRecommendation>) => void;
}

// Initial robust seed data for hackathon
const initialZones: Zone[] = [
  { id: 'z1', stadiumId: 's1', name: 'Gate A Entrance', code: 'ZONE_A', capacity: 10000, currentDensity: 42, movementSpeed: 'normal', riskLevel: 'safe', cameraId: 'cam1', warningThreshold: 70, criticalThreshold: 85 },
  { id: 'z2', stadiumId: 's1', name: 'North Concourse', code: 'ZONE_B', capacity: 8000, currentDensity: 65, movementSpeed: 'normal', riskLevel: 'safe', cameraId: 'cam2', warningThreshold: 70, criticalThreshold: 85 },
  { id: 'z3', stadiumId: 's1', name: 'VIP East Lounge', code: 'ZONE_C', capacity: 5000, currentDensity: 28, movementSpeed: 'normal', riskLevel: 'safe', cameraId: 'cam3', warningThreshold: 70, criticalThreshold: 85 },
  { id: 'z4', stadiumId: 's1', name: 'Lower Deck South', code: 'ZONE_D', capacity: 15000, currentDensity: 88, movementSpeed: 'slow', riskLevel: 'critical', cameraId: 'cam4', warningThreshold: 70, criticalThreshold: 85 },
  { id: 'z5', stadiumId: 's1', name: 'Upper Deck West', code: 'ZONE_E', capacity: 12000, currentDensity: 52, movementSpeed: 'normal', riskLevel: 'safe', cameraId: 'cam5', warningThreshold: 70, criticalThreshold: 85 },
  { id: 'z6', stadiumId: 's1', name: 'Gate F Plaza', code: 'ZONE_F', capacity: 11000, currentDensity: 74, movementSpeed: 'slow', riskLevel: 'warning', cameraId: 'cam6', warningThreshold: 70, criticalThreshold: 85 },
  { id: 'z7', stadiumId: 's1', name: 'Food Court West', code: 'ZONE_G', capacity: 9000, currentDensity: 48, movementSpeed: 'normal', riskLevel: 'safe', cameraId: 'cam7', warningThreshold: 70, criticalThreshold: 85 },
  { id: 'z8', stadiumId: 's1', name: 'Press & Media Deck', code: 'ZONE_H', capacity: 4000, currentDensity: 15, movementSpeed: 'normal', riskLevel: 'safe', cameraId: 'cam8', warningThreshold: 70, criticalThreshold: 85 },
];

const initialRoutes: Route[] = [
  { id: 'r1', stadiumId: 's1', name: 'R-01', fromZoneId: 'z1', toLocation: 'Gate A Exit', routeType: 'public', capacity: 5000, status: 'open', priority: 1, assignedTeamId: 't1', isEmergencyLane: false },
  { id: 'r2', stadiumId: 's1', name: 'R-02', fromZoneId: 'z2', toLocation: 'Gate B Main Exit', routeType: 'public', capacity: 4000, status: 'open', priority: 1, assignedTeamId: null, isEmergencyLane: false },
  { id: 'r3', stadiumId: 's1', name: 'R-03 (VIP East)', fromZoneId: 'z3', toLocation: 'Secure VIP Parking', routeType: 'vip', capacity: 1000, status: 'reserved', priority: 2, assignedTeamId: 't2', isEmergencyLane: false },
  { id: 'r4', stadiumId: 's1', name: 'R-04 (Choke Point)', fromZoneId: 'z4', toLocation: 'South Plaza Gate 4', routeType: 'public', capacity: 6000, status: 'restricted', priority: 1, assignedTeamId: 't3', isEmergencyLane: false },
  { id: 'r5', stadiumId: 's1', name: 'R-08 Bypass', fromZoneId: 'z4', toLocation: 'Gate 6 Outer Plaza', routeType: 'public', capacity: 8000, status: 'blocked', priority: 3, assignedTeamId: null, isEmergencyLane: false },
  { id: 'r6', stadiumId: 's1', name: 'E-01 (Primary)', fromZoneId: 'z4', toLocation: 'Emergency Exit Tunnel 1', routeType: 'emergency', capacity: 3000, status: 'open', priority: 5, assignedTeamId: null, isEmergencyLane: true },
  { id: 'r7', stadiumId: 's1', name: 'E-02 (Alternate)', fromZoneId: 'z6', toLocation: 'Emergency Exit Tunnel 2', routeType: 'emergency', capacity: 3000, status: 'open', priority: 5, assignedTeamId: null, isEmergencyLane: true },
  { id: 'r8', stadiumId: 's1', name: 'R-12 VIP backup', fromZoneId: 'z3', toLocation: 'VVIP Helipad', routeType: 'vip', capacity: 500, status: 'open', priority: 2, assignedTeamId: null, isEmergencyLane: false },
];

const initialAlerts: Alert[] = [
  { id: 'a1', stadiumId: 's1', zoneId: 'z4', zoneCode: 'ZONE_D', alertType: 'congestion', severity: 'critical', title: 'South Deck Congestion Critical', description: 'Zone D density has exceeded 85% and speed is dropping. High risk of crowd compression.', status: 'active', source: 'system', createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString() },
  { id: 'a2', stadiumId: 's1', zoneId: 'z6', zoneCode: 'ZONE_F', alertType: 'stampede_risk', severity: 'high', title: 'Plaza Exit Obstruction Warning', description: 'Gate F Plaza bottleneck buildup. Exits are slow due to route restrictions.', status: 'active', source: 'system', createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString() },
];

const initialVips: VipMovement[] = [
  { id: 'v1', stadiumId: 's1', vipName: 'Senator Vance & Convoy', arrivalTime: '11:45 AM', entryGate: 'Gate C VVIP Entrance', destination: 'VIP Box 12', securityLevel: 'VVIP', expectedPeople: 12, convoySize: 3, primaryRouteId: 'r3', backupRouteId: 'r8', assignedTeamId: 't2', movementStatus: 'active' },
  { id: 'v2', stadiumId: 's1', vipName: 'Ambassador Thorne', arrivalTime: '12:15 PM', entryGate: 'VVIP Helipad', destination: 'Press & Media Deck', securityLevel: 'VIP', expectedPeople: 4, convoySize: 1, primaryRouteId: 'r8', backupRouteId: 'r3', assignedTeamId: 't1', movementStatus: 'planned' },
  { id: 'v3', stadiumId: 's1', vipName: 'Narendra Modi', arrivalTime: '01:00 PM', entryGate: 'Gate C VVIP Entrance', destination: 'VIP Box 01', securityLevel: 'VVIP', expectedPeople: 20, convoySize: 5, primaryRouteId: 'r3', backupRouteId: 'r8', assignedTeamId: 't2', movementStatus: 'planned' },
  { id: 'v4', stadiumId: 's1', vipName: 'Amit Shah', arrivalTime: '01:30 PM', entryGate: 'Gate C VVIP Entrance', destination: 'VIP Box 02', securityLevel: 'VVIP', expectedPeople: 15, convoySize: 4, primaryRouteId: 'r3', backupRouteId: 'r8', assignedTeamId: 't2', movementStatus: 'planned' },
  { id: 'v5', stadiumId: 's1', vipName: 'Mukesh Ambani', arrivalTime: '02:00 PM', entryGate: 'VVIP Helipad', destination: 'Presidential Suite', securityLevel: 'VVIP', expectedPeople: 8, convoySize: 3, primaryRouteId: 'r8', backupRouteId: 'r3', assignedTeamId: 't1', movementStatus: 'planned' },
  { id: 'v6', stadiumId: 's1', vipName: 'Sharukh Khan', arrivalTime: '02:30 PM', entryGate: 'Gate A Entrance', destination: 'Corporate Box B', securityLevel: 'VIP', expectedPeople: 6, convoySize: 2, primaryRouteId: 'r1', backupRouteId: 'r2', assignedTeamId: 't1', movementStatus: 'planned' }
];

const initialRecommendations: AgentRecommendation[] = [
  {
    id: 'rec1',
    stadiumId: 's1',
    alertId: 'a1',
    agentType: 'smart_routing',
    severity: 'high',
    summary: 'Zone D Congestion mitigation suggested.',
    recommendation: 'Open Alternate Route R-08 (Gate 6 Outer Plaza Bypass) and reroute incoming crowd.',
    reasoning: 'Zone D density is currently 88% with stagnant movement speed. Open Route R-08 immediately has an available capacity of 8,000 to relieve 34% of pressure towards the South Exit in under 4 minutes.',
    suggestedActions: [
      'Unblock Route R-08',
      'Deploy Security Team Alpha to Zone D corridor',
      'Redirect crowd via digital signage and audio systems'
    ],
    status: 'pending',
    createdAt: new Date().toISOString()
  },
  {
    id: 'rec2',
    stadiumId: 's1',
    alertId: 'a2',
    agentType: 'vip_coordination',
    severity: 'medium',
    summary: 'VIP primary route conflict warning.',
    recommendation: 'Reserve Backup Route R-12 for Senator Vance convoy due to heavy Gate F overcrowding.',
    reasoning: 'Primary VIP Route R-3 cuts through North Concourse B (65% density) and Gate F Plaza (74% density, High Alert). Rerouting convoy via Route R-12 (VVIP Helipad path) ensures zero crowd intersections.',
    suggestedActions: [
      'Switch VIP Transit path to Backup Route R-12',
      'Assign Security Team Beta to Helipad Exit'
    ],
    status: 'pending',
    createdAt: new Date(Date.now() - 1 * 60 * 1000).toISOString()
  }
];

export const useDashboardStore = create<DashboardState>((set, get) => ({
  stadiumName: 'Apex Coliseum',
  stadiumCapacity: 80000,
  currentOccupancy: 62450,
  matchPhase: 'Second Half - Min 72',
  globalRiskLevel: 'warning',
  crowdHealthScore: 78,
  emergencyMode: false,
  systemTime: new Date().toLocaleTimeString(),

  zones: initialZones,
  routes: initialRoutes,
  alerts: initialAlerts,
  vipMovements: initialVips,
  agentRecommendations: initialRecommendations,

  setSystemTime: (time) => set({ systemTime: time }),

  toggleEmergencyMode: () => {
    const isCurrentlyEmergency = get().emergencyMode;
    const newEmergencyState = !isCurrentlyEmergency;

    // Side effect of emergency mode: mark all zones risk level as critical/warning and open all emergency lanes
    const updatedZones = get().zones.map(z => ({
      ...z,
      riskLevel: newEmergencyState ? ('critical' as ZoneRiskLevel) : (z.currentDensity >= 85 ? 'critical' : z.currentDensity >= 70 ? 'warning' : 'safe' as ZoneRiskLevel),
    }));

    const updatedRoutes = get().routes.map(r => {
      if (r.isEmergencyLane || r.routeType === 'emergency') {
        return { ...r, status: newEmergencyState ? ('open' as const) : ('open' as const) };
      }
      return r;
    });

    // Create high importance alert when emergency is triggered
    let updatedAlerts = [...get().alerts];
    if (newEmergencyState) {
      const emergencyAlert: Alert = {
        id: `alert-emerg-${Date.now()}`,
        stadiumId: 's1',
        zoneId: 'z4',
        zoneCode: 'GLOBAL',
        alertType: 'emergency_incident',
        severity: 'critical',
        title: 'GLOBAL EVACUATION ALERT TRIGGERED',
        description: 'System-wide emergency override activated by Stadium Commander. All primary and secondary evacuation lanes are opened.',
        status: 'active',
        source: 'system',
        createdAt: new Date().toISOString()
      };
      updatedAlerts.unshift(emergencyAlert);
    } else {
      updatedAlerts = updatedAlerts.filter(a => a.alertType !== 'emergency_incident');
    }

    set({
      emergencyMode: newEmergencyState,
      zones: updatedZones,
      routes: updatedRoutes,
      alerts: updatedAlerts,
      crowdHealthScore: newEmergencyState ? 24 : 78
    });

    get().recalculateGlobalRisk();
    get().onActionTriggered?.('toggleEmergencyMode', newEmergencyState);
  },

  approveRecommendation: (id) => {
    const recommendations = get().agentRecommendations;
    const updatedRecommendations = recommendations.map(rec => 
      rec.id === id ? { ...rec, status: 'approved' as const, reviewedAt: new Date().toISOString() } : rec
    );

    // Apply the operational changes simulated by the AI suggestion
    let updatedRoutes = [...get().routes];
    let updatedVips = [...get().vipMovements];
    let updatedZones = [...get().zones];
    let updatedAlerts = [...get().alerts];

    if (id === 'rec1') {
      // Unblock Route R-08 and lower Zone D density
      updatedRoutes = updatedRoutes.map(r => 
        r.name.includes('R-08') ? { ...r, status: 'open' as const } : r
      );
      updatedZones = updatedZones.map(z => 
        z.code === 'ZONE_D' ? { ...z, currentDensity: 54, riskLevel: 'safe' as ZoneRiskLevel, movementSpeed: 'normal' as const } : z
      );
      // Resolve alert associated
      updatedAlerts = updatedAlerts.map(a => 
        a.id === 'a1' ? { ...a, status: 'resolved' as const, resolvedAt: new Date().toISOString() } : a
      );
    } else if (id === 'rec2') {
      // Switch VIP Transit Route
      updatedVips = updatedVips.map(v => 
        v.id === 'v1' ? { ...v, primaryRouteId: 'r8' } : v
      );
      // Resolve the VIP overlap risk alert
      updatedAlerts = updatedAlerts.map(a => 
        a.id === 'a2' ? { ...a, status: 'resolved' as const, resolvedAt: new Date().toISOString() } : a
      );
    }

    set({
      agentRecommendations: updatedRecommendations,
      routes: updatedRoutes,
      vipMovements: updatedVips,
      zones: updatedZones,
      alerts: updatedAlerts
    });

    get().recalculateGlobalRisk();
    get().onActionTriggered?.('approveRecommendation', id);
  },

  rejectRecommendation: (id) => {
    const recommendations = get().agentRecommendations;
    const updatedRecommendations = recommendations.map(rec => 
      rec.id === id ? { ...rec, status: 'rejected' as const, reviewedAt: new Date().toISOString() } : rec
    );
    set({ agentRecommendations: updatedRecommendations });
    get().onActionTriggered?.('rejectRecommendation', id);
  },

  updateZoneDensity: (code, density) => {
    const updatedZones = get().zones.map(z => {
      if (z.code === code) {
        let risk: ZoneRiskLevel = 'safe';
        let speed: Zone['movementSpeed'] = 'normal';
        if (density >= z.criticalThreshold) {
          risk = 'critical';
          speed = 'stagnant';
        } else if (density >= z.warningThreshold) {
          risk = 'warning';
          speed = 'slow';
        }
        return {
          ...z,
          currentDensity: density,
          riskLevel: risk,
          movementSpeed: speed
        };
      }
      return z;
    });

    set({ zones: updatedZones });
    get().recalculateGlobalRisk();
  },

  updateRouteStatus: (id, status) => {
    const updatedRoutes = get().routes.map(r => 
      r.id === id ? { ...r, status } : r
    );
    set({ routes: updatedRoutes });
    get().onActionTriggered?.('updateRouteStatus', { id, status });
  },

  updateVipStatus: (id, status) => {
    const updatedVips = get().vipMovements.map(v => 
      v.id === id ? { ...v, movementStatus: status } : v
    );
    set({ vipMovements: updatedVips });
    get().onActionTriggered?.('updateVipStatus', { id, status });
  },

  addAlert: (alert) => {
    const newAlert: Alert = {
      ...alert,
      id: `alert-new-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    set(state => ({ alerts: [newAlert, ...state.alerts] }));
    get().recalculateGlobalRisk();
  },

  resolveAlert: (id) => {
    const updatedAlerts = get().alerts.map(a => 
      a.id === id ? { ...a, status: 'resolved' as const, resolvedAt: new Date().toISOString() } : a
    );
    set({ alerts: updatedAlerts });
    get().recalculateGlobalRisk();
  },

  recalculateGlobalRisk: () => {
    const activeAlerts = get().alerts.filter(a => a.status === 'active');
    const zones = get().zones;
    
    // Calculate global crowd health score
    let criticalCount = 0;
    let warningCount = 0;
    zones.forEach(z => {
      if (z.riskLevel === 'critical') criticalCount++;
      else if (z.riskLevel === 'warning') warningCount++;
    });

    let health = 94 - (criticalCount * 25) - (warningCount * 10);
    if (get().emergencyMode) {
      health = 24;
    }
    health = Math.max(10, Math.min(100, health));

    // Determine global risk level
    let globalRisk: ZoneRiskLevel = 'safe';
    if (get().emergencyMode || criticalCount > 0 || activeAlerts.some(a => a.severity === 'critical')) {
      globalRisk = 'critical';
    } else if (warningCount > 0 || activeAlerts.some(a => a.severity === 'high' || a.severity === 'medium')) {
      globalRisk = 'warning';
    }

    set({
      crowdHealthScore: health,
      globalRiskLevel: globalRisk
    });
  },

  syncZone: (code, updates) => {
    const updatedZones = get().zones.map(z => 
      z.code === code ? { ...z, ...updates } : z
    );
    set({ zones: updatedZones });
    get().recalculateGlobalRisk();
  },

  syncRoute: (id, updates) => {
    const updatedRoutes = get().routes.map(r => 
      r.id === id ? { ...r, ...updates } : r
    );
    set({ routes: updatedRoutes });
  },

  syncVip: (id, updates) => {
    const vips = get().vipMovements;
    const exists = vips.some(v => v.id === id);
    if (exists) {
      const updatedVips = vips.map(v => 
        v.id === id ? { ...v, ...updates } : v
      );
      set({ vipMovements: updatedVips });
    } else {
      const newVip: VipMovement = {
        id,
        stadiumId: updates.stadiumId || 's1',
        vipName: updates.vipName || 'Unknown VIP',
        arrivalTime: updates.arrivalTime || new Date().toLocaleTimeString(),
        entryGate: updates.entryGate || 'Gate A',
        destination: updates.destination || 'VIP Lounge',
        securityLevel: updates.securityLevel || 'Standard',
        expectedPeople: updates.expectedPeople || 1,
        convoySize: updates.convoySize || 1,
        primaryRouteId: updates.primaryRouteId || '',
        backupRouteId: updates.backupRouteId || '',
        assignedTeamId: updates.assignedTeamId || '',
        movementStatus: updates.movementStatus || 'planned'
      };
      set({ vipMovements: [...vips, newVip] });
    }
  },

  deleteVip: (id) => {
    const updatedVips = get().vipMovements.filter(v => v.id !== id);
    set({ vipMovements: updatedVips });
  },

  syncAlert: (id, updates) => {
    const updatedAlerts = get().alerts.map(a => 
      a.id === id ? { ...a, ...updates } : a
    );
    set({ alerts: updatedAlerts });
    get().recalculateGlobalRisk();
  },

  syncRecommendation: (id, updates) => {
    const recs = get().agentRecommendations;
    const exists = recs.some(r => r.id === id);
    if (exists) {
      const updatedRecs = recs.map(r => 
        r.id === id ? { ...r, ...updates } : r
      );
      set({ agentRecommendations: updatedRecs });
    } else {
      const newRec = {
        id,
        stadiumId: updates.stadiumId || 's1',
        alertId: updates.alertId || undefined,
        agentType: updates.agentType || 'smart_routing',
        severity: updates.severity || 'high',
        summary: updates.summary || 'AI Operations Recommendation',
        recommendation: updates.recommendation || '',
        reasoning: updates.reasoning || '',
        suggestedActions: updates.suggestedActions || [],
        status: updates.status || 'pending',
        createdAt: updates.createdAt || new Date().toISOString(),
        reviewedAt: updates.reviewedAt || undefined,
        reviewedBy: updates.reviewedBy || undefined
      };
      set({ agentRecommendations: [...recs, newRec] });
    }
    get().recalculateGlobalRisk();
  }
}));
