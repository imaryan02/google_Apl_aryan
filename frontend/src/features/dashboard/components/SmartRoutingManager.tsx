import React, { useState, useEffect } from 'react';
import { useDashboardStore } from '../../../shared/store/dashboardStore';
import { Card } from '../../../shared/components/Card';
import { Badge } from '../../../shared/components/Badge';
import { 
  Network, ArrowRight, Lock, Unlock, AlertTriangle, 
  Gauge, Clock, Compass, Shield, Zap, RefreshCw, CheckCircle 
} from 'lucide-react';
import { API_BASE_URL } from '../../../shared/config/api';

const ZONE_CODES = new Set(['ZONE_A', 'ZONE_B', 'ZONE_C', 'ZONE_D', 'ZONE_E', 'ZONE_F', 'ZONE_G', 'ZONE_H']);

interface PathfinderResult {
  success: boolean;
  source: string;
  destination: string;
  path: string[];
  total_weight: number;
  bottleneck_capacity: number;
  estimated_clearance_time: number;
  reason: string;
  edges: Array<{
    from_node: string;
    to_node: string;
    name: string;
    type: string;
    weight: number;
    capacity: number;
  }>;
}

export const SmartRoutingManager: React.FC = () => {
  const { zones, routes, updateRouteStatus, emergencyMode } = useDashboardStore();
  
  // Pathfinder State
  const [sourceZone, setSourceZone] = useState<string>('ZONE_D');
  const [targetExit, setTargetExit] = useState<string>('AUTO');
  const [emergencyOverride, setEmergencyOverride] = useState<boolean>(false);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [pathResult, setPathResult] = useState<PathfinderResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync emergency mode check
  useEffect(() => {
    if (emergencyMode) {
      setEmergencyOverride(true);
    }
  }, [emergencyMode]);

  // Extract unique exit locations from database routes
  const exits = Array.from(new Set(routes.map(r => r.toLocation)));

  const getZoneName = (zoneId: string) => {
    const zone = zones.find(z => z.id === zoneId);
    return zone ? zone.name : 'Unknown Zone';
  };

  const getZoneCode = (zoneId: string) => {
    const zone = zones.find(z => z.id === zoneId);
    return zone ? zone.code : 'UNKNOWN';
  };

  const getRouteStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="green">Open / Clear</Badge>;
      case 'restricted':
        return <Badge variant="amber">Restricted</Badge>;
      case 'reserved':
        return <Badge variant="cyan">VIP Reserved</Badge>;
      case 'blocked':
        return <Badge variant="red">Blocked / Choked</Badge>;
      default:
        return <Badge variant="gray">{status}</Badge>;
    }
  };

  const getRouteTypeBadge = (type: string) => {
    switch (type) {
      case 'vip':
        return <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-cyber-vip border border-cyber-vip/35 bg-cyber-vip/5 px-2 py-0.5 rounded">VIP</span>;
      case 'emergency':
        return <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-cyber-danger border border-cyber-danger/35 bg-cyber-danger/5 px-2 py-0.5 rounded">Emergency</span>;
      case 'staff':
        return <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-cyber-muted border border-cyber-border-glow bg-cyber-bg px-2 py-0.5 rounded">Staff</span>;
      default:
        return <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-cyber-primary border border-cyber-primary/35 bg-cyber-primary/5 px-2 py-0.5 rounded">Public</span>;
    }
  };

  // Run dynamic shortest path algorithm against FastAPI backend
  const calculatePath = async () => {
    setIsCalculating(true);
    setErrorMsg(null);
    setPathResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/routes/suggest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from_zone_code: sourceZone,
          to_location: targetExit === 'AUTO' ? null : targetExit,
          emergency_mode: emergencyOverride
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Path computation failed.');
      }

      const data = await response.json();
      setPathResult(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Connection lost to dynamic routing engine.');
    } finally {
      setIsCalculating(false);
    }
  };

  // Apply manual overrides for routes traversed in the calculated path
  const executePathOverrides = () => {
    if (!pathResult) return;
    
    // Reroute actions: open all restricted/blocked exit edges in this path
    pathResult.edges.forEach(edge => {
      if (edge.type === 'exit') {
        const route = routes.find(r => r.name === edge.name);
        if (route && route.status !== 'open') {
          updateRouteStatus(route.id, 'open');
        }
      }
    });

    // Reset path calculations to sync with fresh route updates
    setTimeout(() => {
      calculatePath();
    }, 400);
  };

  // Trigger manual route block/open toggles directly from dashboard
  const toggleRouteStatus = (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'open' ? 'blocked' : 'open';
    updateRouteStatus(id, nextStatus);
  };

  return (
    <div className="flex flex-col h-full max-h-full overflow-hidden select-none bg-cyber-bg">
      
      {/* HUD Controller Banner */}
      <div className="flex justify-between items-center bg-cyber-card border-b border-cyber-border p-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-cyber-primary/10 flex items-center justify-center text-cyber-primary shadow-glow">
            <Network size={14} className="animate-pulse" />
          </div>
          <div>
            <h1 className="font-orbitron font-extrabold text-sm tracking-wider uppercase text-cyber-text">
              SMART CROWD ROUTING DECK
            </h1>
            <p className="text-[10px] text-cyber-muted font-mono leading-none mt-0.5">
              NetworkX Graph Engine Adjacency Matrix Egress Controller
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={emergencyMode ? "red" : "cyan"} pulse className="font-mono text-[9px] uppercase tracking-wider">
            {emergencyMode ? "EMERGENCY EGRESS PROTOCOLS ACTIVE" : "ROUTING GRAPH SYNCHRONIZED"}
          </Badge>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-4 p-4 min-h-0 overflow-hidden">
        
        {/* Left Column: Physical Route Overrides Table (Spans 7 cols) */}
        <div className="col-span-12 lg:col-span-7 h-full flex flex-col min-h-0 overflow-hidden">
          <Card 
            title="Physical Egress Route Controls" 
            subtitle="Manual operator status overrides & telemetry metrics"
            className="flex-1 flex flex-col min-h-0 overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto pr-1">
              <div className="min-w-full divide-y divide-cyber-border border border-cyber-border rounded-lg overflow-hidden bg-cyber-bg/30">
                <div className="grid grid-cols-12 bg-cyber-card p-3 text-[10px] font-mono text-cyber-muted uppercase tracking-wider border-b border-cyber-border font-bold">
                  <div className="col-span-2">ROUTE</div>
                  <div className="col-span-3">ORIGIN SECTOR</div>
                  <div className="col-span-3">DESTINATION</div>
                  <div className="col-span-1 text-center">TYPE</div>
                  <div className="col-span-2 text-center">STATUS</div>
                  <div className="col-span-1 text-right">ACTION</div>
                </div>
                
                <div className="divide-y divide-cyber-border">
                  {routes.map((route) => {
                    const zoneCode = getZoneCode(route.fromZoneId);
                    const zoneName = getZoneName(route.fromZoneId);
                    const isBlocked = route.status === 'blocked';
                    
                    return (
                      <div 
                        key={route.id}
                        id={`route-row-${route.id}`}
                        className={`grid grid-cols-12 p-3 text-xs items-center transition-all hover:bg-cyber-card/70 font-sans ${isBlocked ? 'bg-cyber-danger/5' : ''}`}
                      >
                        {/* Name */}
                        <div className="col-span-2 font-mono font-bold text-cyber-text tracking-wide">
                          {route.name}
                        </div>
                        
                        {/* Origin Zone */}
                        <div className="col-span-3 flex flex-col leading-none">
                          <span className="font-mono text-[9px] text-cyber-primary font-bold">{zoneCode}</span>
                          <span className="text-[10px] text-cyber-muted truncate mt-0.5">{zoneName}</span>
                        </div>
                        
                        {/* Destination */}
                        <div className="col-span-3 font-medium text-cyber-text truncate">
                          {route.toLocation}
                        </div>
                        
                        {/* Type */}
                        <div className="col-span-1 text-center">
                          {getRouteTypeBadge(route.routeType)}
                        </div>
                        
                        {/* Status */}
                        <div className="col-span-2 text-center">
                          {getRouteStatusBadge(route.status)}
                        </div>
                        
                        {/* Quick Override Toggle Button */}
                        <div className="col-span-1 text-right">
                          <button
                            onClick={() => toggleRouteStatus(route.id, route.status)}
                            title={isBlocked ? "Unblock route" : "Block route"}
                            className={`p-1 rounded transition-all focus:outline-none ${
                              isBlocked 
                                ? 'bg-cyber-success/10 text-cyber-success border border-cyber-success/30 hover:bg-cyber-success/20' 
                                : 'bg-cyber-danger/10 text-cyber-danger border border-cyber-danger/30 hover:bg-cyber-danger/20'
                            }`}
                          >
                            {isBlocked ? <Unlock size={12} /> : <Lock size={12} />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
            {/* Table Footer Stats */}
            <div className="border-t border-cyber-border/40 pt-3 mt-3 flex items-center justify-between font-mono text-[9px] text-cyber-muted shrink-0">
              <div className="flex items-center gap-4">
                <span>TOTAL INSTANTIATED PATHS: {routes.length}</span>
                <span className="text-cyber-danger font-bold">
                  BLOCKED SECTORS: {routes.filter(r => r.status === 'blocked').length}
                </span>
                <span className="text-cyber-vip font-bold">
                  VIP RESERVED: {routes.filter(r => r.status === 'reserved').length}
                </span>
              </div>
              <span className="text-cyber-primary font-bold">ALL EGRESS METRICS DYNAMICALLY MONITORED</span>
            </div>
          </Card>
        </div>

        {/* Right Column: Dynamic Pathfinder Calculator (Spans 5 cols) */}
        <div className="col-span-12 lg:col-span-5 h-full flex flex-col min-h-0 overflow-hidden">
          <Card 
            title="Dijkstra Egress Pathfinder" 
            subtitle="Compute dynamic congestion-aware crowd routing"
            className="flex-1 flex flex-col min-h-0 overflow-hidden"
          >
            {/* Pathfinder Input Form */}
            <div className="grid grid-cols-2 gap-3 mb-4 shrink-0 bg-cyber-bg/30 p-3 rounded-lg border border-cyber-border">
              {/* Source Zone */}
              <div className="flex flex-col gap-1">
                <label className="font-mono text-[9px] text-cyber-muted uppercase tracking-wider font-bold">
                  Crowd Sector (Origin)
                </label>
                <select
                  value={sourceZone}
                  onChange={(e) => setSourceZone(e.target.value)}
                  className="bg-cyber-card border border-cyber-border text-cyber-text text-xs p-2 rounded-lg font-mono tracking-wide focus:outline-none focus:border-cyber-primary"
                >
                  {zones.map((zone) => (
                    <option key={zone.id} value={zone.code}>
                      {zone.code} - {zone.name.split(' ')[0]} ({zone.currentDensity}%)
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Exit */}
              <div className="flex flex-col gap-1">
                <label className="font-mono text-[9px] text-cyber-muted uppercase tracking-wider font-bold">
                  Target Exit Gate
                </label>
                <select
                  value={targetExit}
                  onChange={(e) => setTargetExit(e.target.value)}
                  className="bg-cyber-card border border-cyber-border text-cyber-text text-xs p-2 rounded-lg font-mono tracking-wide focus:outline-none focus:border-cyber-primary"
                >
                  <option value="AUTO">★ Dynamic Auto-Egress Exit</option>
                  {exits.map((exit) => (
                    <option key={exit} value={exit}>
                      {exit}
                    </option>
                  ))}
                </select>
              </div>

              {/* Controls */}
              <div className="col-span-2 flex items-center justify-between border-t border-cyber-border/40 pt-2.5 mt-1">
                <label className="flex items-center gap-1.5 cursor-pointer font-mono text-[9px] text-cyber-muted uppercase tracking-tighter">
                  <input
                    type="checkbox"
                    checked={emergencyOverride}
                    disabled={emergencyMode}
                    onChange={(e) => setEmergencyOverride(e.target.checked)}
                    className="h-3 w-3 accent-cyber-primary cursor-pointer rounded border-cyber-border"
                  />
                  <span>Emergency Lane Override</span>
                </label>

                <button
                  onClick={calculatePath}
                  disabled={isCalculating}
                  className="flex items-center gap-1 bg-cyber-primary text-white text-[10px] font-mono px-3.5 py-1.5 rounded-lg shadow-glow hover:bg-cyber-primary/95 transition-all focus:outline-none uppercase font-bold disabled:opacity-50"
                >
                  {isCalculating ? (
                    <>
                      <RefreshCw size={11} className="animate-spin" />
                      <span>Computing...</span>
                    </>
                  ) : (
                    <>
                      <Zap size={11} className="animate-bounce" />
                      <span>Calculate Route</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Pathfinder Output Area */}
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto pr-1">
              {errorMsg && (
                <div className="border border-cyber-danger/35 bg-cyber-danger/5 p-4 rounded-lg flex gap-3 text-cyber-danger text-xs font-mono">
                  <AlertTriangle className="h-5 w-5 shrink-0 animate-bounce" />
                  <div className="flex flex-col gap-1">
                    <span className="font-bold uppercase tracking-wider">GRAPH EVACUATION CHOCKED</span>
                    <span>{errorMsg}</span>
                  </div>
                </div>
              )}

              {!pathResult && !errorMsg && (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-16 text-cyber-muted font-mono gap-2 border border-dashed border-cyber-border/40 bg-cyber-bg/10 rounded-sm">
                  <Compass className="h-7 w-7 text-cyber-primary/60 shadow-glow" />
                  <span className="text-[9px] tracking-widest uppercase">STANDBY FOR EGRESS PATH CALCULATOR</span>
                  <span className="text-[8px] text-cyber-muted/60">Select crowd sector and target exit to model dynamic routing</span>
                </div>
              )}

              {pathResult && (
                <div className="flex flex-col gap-4">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="border border-cyber-border bg-cyber-card p-2 rounded-lg flex flex-col items-center text-center relative overflow-hidden">
                      <Clock size={12} className="text-cyber-primary mb-1" />
                      <span className="font-mono text-xs font-bold text-cyber-text">
                        {pathResult.estimated_clearance_time}m
                      </span>
                      <span className="font-mono text-[7px] text-cyber-muted uppercase tracking-tighter mt-0.5">
                        Clearance Time
                      </span>
                    </div>

                    <div className="border border-cyber-border bg-cyber-card p-2 rounded-lg flex flex-col items-center text-center relative overflow-hidden">
                      <Gauge size={12} className="text-cyber-success mb-1" />
                      <span className="font-mono text-xs font-bold text-cyber-text">
                        {pathResult.bottleneck_capacity.toLocaleString()}
                      </span>
                      <span className="font-mono text-[7px] text-cyber-muted uppercase tracking-tighter mt-0.5">
                        Bottleneck cap
                      </span>
                    </div>

                    <div className="border border-cyber-border bg-cyber-card p-2 rounded-lg flex flex-col items-center text-center relative overflow-hidden">
                      <Shield size={12} className="text-cyber-vip mb-1" />
                      <span className="font-mono text-xs font-bold text-cyber-text">
                        {pathResult.total_weight.toFixed(1)}
                      </span>
                      <span className="font-mono text-[7px] text-cyber-muted uppercase tracking-tighter mt-0.5">
                        Graph cost index
                      </span>
                    </div>
                  </div>

                  {/* Nodes pipeline visualizer */}
                  <div className="flex flex-col gap-1.5 bg-cyber-card border border-cyber-border p-3.5 rounded-lg relative overflow-hidden">
                    <span className="font-mono text-[8px] text-cyber-muted uppercase tracking-widest font-bold">
                      dynamic egress pipeline visualizer
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {pathResult.path.map((node, index) => {
                        const isLast = index === pathResult.path.length - 1;
                        const isZone = ZONE_CODES.has(node);
                        
                        return (
                          <React.Fragment key={index}>
                            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-mono text-[9px] font-bold border transition-all ${
                              isLast 
                                ? 'bg-cyber-danger/10 text-cyber-danger border-cyber-danger/30 shadow-glow-danger' 
                                : isZone 
                                  ? 'bg-cyber-primary/10 text-cyber-primary border-cyber-primary/30' 
                                  : 'bg-cyber-success/15 text-cyber-success border-cyber-success/35 shadow-glow-success'
                            }`}>
                              <span>{node.replace('ZONE_', '')}</span>
                            </div>
                            
                            {!isLast && (
                              <ArrowRight size={10} className="text-cyber-muted animate-pulse shrink-0" />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>

                  {/* AI Advisory Rationale */}
                  <div className="flex flex-col gap-1.5 bg-cyber-card border border-cyber-primary/20 p-3.5 rounded-lg relative overflow-hidden shadow-glow">
                    <span className="font-mono text-[8px] text-cyber-primary uppercase tracking-widest font-bold flex items-center gap-1.5">
                      <Zap size={10} className="animate-pulse" />
                      smart routing agent advisory
                    </span>
                    <p className="text-[10px] text-cyber-text/80 font-sans leading-relaxed mt-1">
                      {pathResult.reason}
                    </p>
                  </div>

                  {/* Executive Action override buttons */}
                  {pathResult.edges.some(edge => edge.type === 'exit' && routes.find(r => r.name === edge.name)?.status !== 'open') ? (
                    <button
                      onClick={executePathOverrides}
                      className="w-full flex items-center justify-center gap-1.5 bg-cyber-success/15 border border-cyber-success/40 hover:bg-cyber-success/25 text-cyber-success text-xs font-mono py-2 rounded-lg transition-all focus:outline-none uppercase font-bold shadow-glow-success shrink-0"
                    >
                      <CheckCircle size={13} />
                      <span>Execute Rerouting Path Overrides</span>
                    </button>
                  ) : (
                    <div className="w-full flex items-center justify-center gap-1.5 bg-cyber-bg/50 border border-cyber-border text-cyber-muted text-[10px] font-mono py-2 rounded-lg select-none shrink-0 uppercase tracking-tighter">
                      <CheckCircle size={12} className="text-cyber-success" />
                      <span>Calculated path lanes are fully cleared</span>
                    </div>
                  )}

                </div>
              )}
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
};
export default SmartRoutingManager;
