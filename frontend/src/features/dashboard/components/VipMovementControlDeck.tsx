import React, { useState } from 'react';
import { useDashboardStore } from '../../../shared/store/dashboardStore';
import { Card } from '../../../shared/components/Card';
import { Badge } from '../../../shared/components/Badge';
import { Button } from '../../../shared/components/Button';
import { 
  Shield, 
  Users, 
  Car, 
  Clock, 
  MapPin, 
  AlertTriangle, 
  CheckCircle, 
  Navigation,
  ShieldAlert,
  Loader,
  Edit,
  Trash2,
  Cpu,
  ArrowRight,
  Plus,
  Sparkles,
  X,
  ChevronDown,
  ChevronUp,
  BookOpen
} from 'lucide-react';
import type { VipMovement } from '../../../core/types/vip.types';
import { API_BASE_URL } from '../../../shared/config/api';

interface VipMovementControlDeckProps {
  className?: string;
}

export const VipMovementControlDeck: React.FC<VipMovementControlDeckProps> = ({ className = '' }) => {
  const { 
    vipMovements, 
    routes, 
    zones, 
    updateVipStatus, 
    agentRecommendations,
    approveRecommendation,
    rejectRecommendation
  } = useDashboardStore();

  // Selected VIP convoy for Editing
  const [editingVip, setEditingVip] = useState<VipMovement | null>(null);

  // Expanded VIP IDs set (by default, expand the first convoy if any exist)
  const [expandedVipIds, setExpandedVipIds] = useState<Set<string>>(
    new Set(vipMovements.length > 0 ? [vipMovements[0].id] : [])
  );

  // Toggle Operator Guide manual
  const [showOperatorGuide, setShowOperatorGuide] = useState(true);

  // Form Fields State
  const [vipName, setVipName] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [entryGate, setEntryGate] = useState('Gate C VVIP Entrance');
  const [destination, setDestination] = useState('VIP Box 12');
  const [securityLevel, setSecurityLevel] = useState<'VVIP' | 'VIP' | 'Standard'>('Standard');
  const [expectedPeople, setExpectedPeople] = useState(2);
  const [convoySize, setConvoySize] = useState(1);
  const [primaryRouteId, setPrimaryRouteId] = useState(routes[0]?.id || '');
  const [backupRouteId, setBackupRouteId] = useState(routes[1]?.id || '');
  const [assignedTeamId, setAssignedTeamId] = useState('t1');
  const [movementStatus, setMovementStatus] = useState<VipMovement['movementStatus']>('planned');

  // Toggle expansion of card
  const toggleExpand = (id: string) => {
    setExpandedVipIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Helper to map assigned team ID to readable team name
  const getTeamName = (teamId: string | null) => {
    if (!teamId) return 'Unassigned';
    switch (teamId) {
      case 't1':
        return 'Tactical Team Alpha';
      case 't2':
        return 'VVIP Tactical Escort (Bravo)';
      case 't3':
        return 'Team Charlie (Medical)';
      default:
        return `Responder ${teamId.toUpperCase()}`;
    }
  };

  // Populate form for editing and expand card
  const handleStartEdit = (vip: VipMovement) => {
    setEditingVip(vip);
    setVipName(vip.vipName);
    setArrivalTime(vip.arrivalTime);
    setEntryGate(vip.entryGate || '');
    setDestination(vip.destination || '');
    setSecurityLevel(vip.securityLevel);
    setExpectedPeople(vip.expectedPeople);
    setConvoySize(vip.convoySize);
    setPrimaryRouteId(vip.primaryRouteId || '');
    setBackupRouteId(vip.backupRouteId || '');
    setAssignedTeamId(vip.assignedTeamId || '');
    setMovementStatus(vip.movementStatus);
    
    // Automatically expand when editing
    setExpandedVipIds(prev => new Set(prev).add(vip.id));
  };

  // Reset form / cancel edit
  const handleCancelEdit = () => {
    setEditingVip(null);
    setVipName('');
    setArrivalTime('');
    setEntryGate('Gate C VVIP Entrance');
    setDestination('VIP Box 12');
    setSecurityLevel('Standard');
    setExpectedPeople(2);
    setConvoySize(1);
    setPrimaryRouteId(routes[0]?.id || '');
    setBackupRouteId(routes[1]?.id || '');
    setAssignedTeamId('t1');
    setMovementStatus('planned');
  };

  // Save changes (Create or Update)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vipName.trim()) {
      alert("Please specify a convoy label or VVIP Name.");
      return;
    }

    const payload = {
      stadium_id: 's1',
      vip_name: vipName,
      arrival_time: arrivalTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      entry_gate: entryGate,
      destination: destination,
      security_level: securityLevel,
      expected_people: Number(expectedPeople),
      convoy_size: Number(convoySize),
      primary_route_id: primaryRouteId || null,
      backup_route_id: backupRouteId || null,
      assigned_team_id: assignedTeamId || null,
      movement_status: movementStatus
    };

    try {
      let res;
      if (editingVip) {
        res = await fetch(`${API_BASE_URL}/api/vip-movements/${editingVip.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        const tempId = `vip-new-${Date.now()}`;
        res = await fetch(`${API_BASE_URL}/api/vip-movements/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: tempId, ...payload })
        });
      }

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to save VIP convoy.');
      }

      const savedVip = await res.json();
      
      // Update state locally
      useDashboardStore.getState().syncVip(savedVip.id, {
        id: savedVip.id,
        stadiumId: savedVip.stadium_id,
        vipName: savedVip.vip_name,
        arrivalTime: savedVip.arrival_time,
        entryGate: savedVip.entry_gate,
        destination: savedVip.destination,
        securityLevel: savedVip.security_level,
        expectedPeople: savedVip.expected_people,
        convoySize: savedVip.convoy_size,
        primaryRouteId: savedVip.primary_route_id,
        backupRouteId: savedVip.backup_route_id,
        assignedTeamId: savedVip.assigned_team_id,
        movementStatus: savedVip.movement_status
      });

      handleCancelEdit();
    } catch (err: any) {
      console.error(err);
      alert(`Error saving convoy: ${err.message || 'Server unresponsive'}`);
    }
  };

  // Delete convoy schedule
  const handleDelete = async (vipId: string) => {
    if (!confirm('Are you sure you want to delete this convoy?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/vip-movements/${vipId}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        throw new Error('Failed to delete convoy from server.');
      }
      useDashboardStore.getState().deleteVip(vipId);
      if (editingVip?.id === vipId) {
        handleCancelEdit();
      }
    } catch (err: any) {
      console.error(err);
      alert(`Error deleting convoy: ${err.message || 'Server unresponsive'}`);
    }
  };

  // Stats calculation
  const totalMovements = vipMovements.length;
  const activeTransits = vipMovements.filter(v => v.movementStatus === 'active').length;
  const plannedMovements = vipMovements.filter(v => v.movementStatus === 'planned').length;

  // Count how many current active VIPs have route conflicts
  const activeConflictsCount = vipMovements.filter(vip => {
    if (vip.movementStatus !== 'active' && vip.movementStatus !== 'planned') return false;
    const route = routes.find(r => r.id === vip.primaryRouteId);
    if (!route) return false;
    const startZone = zones.find(z => z.id === route.fromZoneId);
    const isRouteBlocked = route.status === 'blocked' || route.status === 'restricted';
    const isZoneCongested = startZone && (startZone.riskLevel === 'warning' || startZone.riskLevel === 'critical');
    return isRouteBlocked || isZoneCongested;
  }).length;

  // Filter VIP coordination recommendations
  const vipRecommendations = agentRecommendations.filter(
    rec => rec.agentType === 'vip_coordination' && rec.status === 'pending'
  );

  // Dynamic Route Guidance Advice
  const congestedZones = zones.filter(z => z.riskLevel === 'warning' || z.riskLevel === 'critical');
  const blockedRoutes = routes.filter(r => r.status === 'blocked' || r.status === 'restricted');
  
  const generateRouteGuidance = () => {
    if (congestedZones.length > 0) {
      const zonesList = congestedZones.map(z => z.code).join(', ');
      const avoidedRouteNames = blockedRoutes.map(r => r.name).join(', ');
      
      const safeCorridors = routes
        .filter(r => r.status === 'open' && (r.routeType === 'vip' || r.routeType === 'public'))
        .slice(0, 3)
        .map(r => r.name);
      
      return {
        warning: `Sector overcrowding in ${zonesList}. Paths (${avoidedRouteNames || 'none'}) restricted.`,
        recommendation: `Reroute active VVIP convoys to bypass congested sectors. Optimal secure corridors: ${safeCorridors.join(', ') || 'Emergency Tunnels Only'}.`
      };
    }
    return {
      warning: null,
      recommendation: "All sectors report optimal flow. Reserved routes R-03 (VIP East) and R-12 VIP backup are clear of crowd bottlenecks."
    };
  };

  const guidance = generateRouteGuidance();

  return (
    <div className={`flex flex-col gap-4 h-full p-4 overflow-hidden ${className} bg-cyber-bg`}>
      
      {/* Tactical Stats Top Ribbon */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
        <div className="bg-cyber-card border border-cyber-border rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex flex-col">
            <span className="text-[10px] text-cyber-muted uppercase tracking-wider font-mono">Total Convoys</span>
            <span className="text-2xl font-orbitron font-extrabold text-cyber-text mt-1">{totalMovements}</span>
          </div>
          <div className="h-10 w-10 rounded-lg bg-cyber-primary/5 flex items-center justify-center border border-cyber-primary/10">
            <Shield className="h-5 w-5 text-cyber-primary" />
          </div>
        </div>

        <div className="bg-cyber-card border border-cyber-border rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex flex-col">
            <span className="text-[10px] text-cyber-muted uppercase tracking-wider font-mono">Active Transit</span>
            <span className="text-2xl font-orbitron font-extrabold text-cyber-vip mt-1">{activeTransits}</span>
          </div>
          <div className="h-10 w-10 rounded-lg bg-cyber-vip/5 flex items-center justify-center border border-cyber-vip/10">
            <Loader className="h-5 w-5 text-cyber-vip animate-spin" style={{ animationDuration: '3s' }} />
          </div>
        </div>

        <div className="bg-cyber-card border border-cyber-border rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex flex-col">
            <span className="text-[10px] text-cyber-muted uppercase tracking-wider font-mono">Planned</span>
            <span className="text-2xl font-orbitron font-extrabold text-cyber-muted mt-1">{plannedMovements}</span>
          </div>
          <div className="h-10 w-10 rounded-lg bg-cyber-border/5 flex items-center justify-center border border-cyber-border/20">
            <Clock className="h-5 w-5 text-cyber-muted" />
          </div>
        </div>

        <div className={`border rounded-xl p-4 flex items-center justify-between shadow-sm transition-all ${
          activeConflictsCount > 0 
            ? 'bg-cyber-danger/5 border-cyber-danger/30 animate-pulse' 
            : 'bg-cyber-success/5 border-cyber-success/20'
        }`}>
          <div className="flex flex-col">
            <span className="text-[10px] text-cyber-muted uppercase tracking-wider font-mono">Active Conflicts</span>
            <span className={`text-2xl font-orbitron font-extrabold mt-1 ${
              activeConflictsCount > 0 ? 'text-cyber-danger' : 'text-cyber-success'
            }`}>
              {activeConflictsCount > 0 ? `${activeConflictsCount} ALERT` : '0 SECURE'}
            </span>
          </div>
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center border ${
            activeConflictsCount > 0 
              ? 'bg-cyber-danger/10 border-cyber-danger/20' 
              : 'bg-cyber-success/10 border-cyber-success/20'
          }`}>
            {activeConflictsCount > 0 ? (
              <ShieldAlert className="h-5 w-5 text-cyber-danger" />
            ) : (
              <CheckCircle className="h-5 w-5 text-cyber-success" />
            )}
          </div>
        </div>
      </div>

      {/* Main Two-Column Tactical Layout */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-5 min-h-0 overflow-y-auto xl:overflow-hidden pb-4">
        
        {/* Left Column: VIP Registry (7/12 cols) */}
        <div className="xl:col-span-7 flex flex-col min-h-0 xl:overflow-hidden h-full gap-4">
          
          {/* Collapsible System Operator Guide */}
          <div className="bg-cyber-card border border-cyber-primary/20 rounded-xl overflow-hidden shrink-0 shadow-sm relative">
            <div 
              onClick={() => setShowOperatorGuide(!showOperatorGuide)}
              className="px-4 py-2.5 flex items-center justify-between bg-cyber-bg/30 border-b border-cyber-border/40 cursor-pointer select-none"
            >
              <div className="flex items-center gap-2 text-cyber-primary">
                <BookOpen size={13} className="animate-pulse" />
                <span className="font-orbitron font-bold text-[10px] uppercase tracking-wider">Tactical Operator Protocol Manual</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[8px] text-cyber-muted uppercase">Click to toggle instructions</span>
                {showOperatorGuide ? <ChevronUp size={12} className="text-cyber-muted" /> : <ChevronDown size={12} className="text-cyber-muted" />}
              </div>
            </div>
            
            {showOperatorGuide && (
              <div className="p-4 font-mono text-[10px] text-cyber-text/90 flex flex-col gap-2.5 bg-cyber-bg/5 leading-relaxed border-t border-cyber-border/20">
                <p>Welcome to the VIP Tactical Coordination Station. Follow these baseline system parameters:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 pt-1 border-t border-cyber-border/10">
                  <div className="flex items-start gap-2">
                    <span className="text-cyber-primary font-bold">1. Dispatch Convoys:</span>
                    <span>Use the Dispatcher form on the right. Populate VIP details, routes, and security responder allocations.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-cyber-danger font-bold">2. Route Compromises:</span>
                    <span>Red border highlights indicate that a convoy's route is congested (occupancy $\ge 70\%$) or blocked.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-cyber-success font-bold">3. Self-Healing Advisor:</span>
                    <span>Advisories from the AI Route Advisor resolve conflicts automatically when approved, rerouting convoys to safe channels.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-cyber-vip font-bold">4. Collapsible Registry:</span>
                    <span>Click the header of any card in the registry list below to collapse or expand its routing diagnostics.</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* VIP Registry List */}
          <Card 
            title="Tactical VIP Movement Control Panel" 
            subtitle="Active Convoy Telemetry & Sector Guidance" 
            className="flex-1 flex flex-col min-h-0 h-full overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3">
              {vipMovements.map((vip) => {
                const primaryRoute = routes.find(r => r.id === vip.primaryRouteId);
                const backupRoute = routes.find(r => r.id === vip.backupRouteId);
                
                const primaryStartZone = zones.find(z => z.id === primaryRoute?.fromZoneId);
                const backupStartZone = zones.find(z => z.id === backupRoute?.fromZoneId);

                const isRouteBlocked = primaryRoute?.status === 'blocked' || primaryRoute?.status === 'restricted';
                const isZoneCongested = primaryStartZone && (primaryStartZone.riskLevel === 'warning' || primaryStartZone.riskLevel === 'critical');
                const hasConflict = isRouteBlocked || isZoneCongested;
                const isUsingBackup = vip.backupRouteId && vip.primaryRouteId === vip.backupRouteId;

                const isCurrentlyEditing = editingVip?.id === vip.id;
                const isExpanded = expandedVipIds.has(vip.id);

                return (
                  <div 
                    key={vip.id} 
                    className={`border rounded-xl transition-all bg-cyber-card overflow-hidden ${
                      isCurrentlyEditing
                        ? 'border-cyber-primary shadow-glow ring-1 ring-cyber-primary/30'
                        : isUsingBackup 
                          ? 'border-cyber-success/35 shadow-sm'
                          : hasConflict && (vip.movementStatus === 'active' || vip.movementStatus === 'planned')
                            ? 'border-cyber-danger/40 shadow-glow-danger'
                            : 'border-cyber-border hover:border-cyber-border-glow shadow-sm'
                    }`}
                  >
                    
                    {/* Collapsible Card Header */}
                    <div 
                      onClick={() => toggleExpand(vip.id)}
                      className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-cyber-bg/30 select-none transition-colors border-b border-cyber-border/10"
                    >
                      <div className="flex flex-col">
                        <span className="font-orbitron font-extrabold text-xs text-cyber-text tracking-wide uppercase flex items-center gap-2">
                          {vip.vipName}
                          <Badge variant={vip.securityLevel === 'VVIP' ? 'red' : 'blue'} className="scale-75 origin-left">
                            {vip.securityLevel}
                          </Badge>
                        </span>
                        
                        {/* Collapsed Summary Row */}
                        {!isExpanded && (
                          <span className="text-[9px] text-cyber-muted font-mono tracking-wider mt-1">
                            {vip.arrivalTime} • {vip.expectedPeople} pax • {vip.entryGate} → {vip.destination}
                          </span>
                        )}
                        {isExpanded && (
                          <span className="text-[9px] text-cyber-muted font-mono tracking-wider mt-1">
                            CONVOY ID: {vip.id.slice(0, 8).toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleStartEdit(vip)}
                          className={`p-1 rounded-lg border border-transparent transition-all ${
                            isCurrentlyEditing 
                              ? 'text-cyber-primary bg-cyber-primary/10 border-cyber-primary/25' 
                              : 'hover:text-cyber-primary text-cyber-muted hover:bg-cyber-bg'
                          }`}
                          title="Edit Convoy Details"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        
                        <button
                          onClick={() => handleDelete(vip.id)}
                          className="p-1 hover:text-cyber-danger text-cyber-muted transition-colors rounded-lg hover:bg-cyber-bg"
                          title="Delete Convoy"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>

                        <Badge variant={
                          vip.movementStatus === 'active' 
                            ? 'cyan' 
                            : vip.movementStatus === 'completed' 
                              ? 'green' 
                              : 'gray'
                        } className="scale-90">
                          {vip.movementStatus}
                        </Badge>

                        <div className="text-cyber-muted hover:text-cyber-primary transition-colors cursor-pointer" onClick={() => toggleExpand(vip.id)}>
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </div>
                      </div>
                    </div>

                    {/* Expandable Details Area */}
                    {isExpanded && (
                      <div className="p-4 flex flex-col gap-3 bg-cyber-bg/5">
                        
                        {/* Conflict Alert Banner */}
                        {hasConflict && !isUsingBackup && (vip.movementStatus === 'active' || vip.movementStatus === 'planned') && (
                          <div className="border border-cyber-danger/30 bg-cyber-danger/5 text-cyber-danger p-2.5 rounded-lg flex items-start gap-2 text-[10px] font-sans leading-relaxed animate-pulse">
                            <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-cyber-danger mt-0.5" />
                            <div className="flex flex-col">
                              <span className="font-bold font-mono tracking-wider uppercase text-[9px]">Route Compromised Alert</span>
                              <p className="mt-0.5">
                                {primaryRoute?.name} starts in congested {primaryStartZone?.name} ({primaryStartZone?.currentDensity}% density). Approve AI recommendation to switch route.
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Convoy Telemetry Details Grid */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-3 font-mono text-[10px] text-cyber-text/80 mb-1 bg-cyber-bg/25 p-3 rounded-lg border border-cyber-border/40">
                          <div className="flex items-center gap-2">
                            <Users className="h-3.5 w-3.5 text-cyber-muted" />
                            <div>
                              <span className="text-cyber-muted block text-[8px] uppercase tracking-wider">Expected People</span>
                              <span className="font-bold text-cyber-text">{vip.expectedPeople} pax</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Car className="h-3.5 w-3.5 text-cyber-muted" />
                            <div>
                              <span className="text-cyber-muted block text-[8px] uppercase tracking-wider">Convoy Size</span>
                              <span className="font-bold text-cyber-text">{vip.convoySize} vehicles</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-cyber-muted" />
                            <div>
                              <span className="text-cyber-muted block text-[8px] uppercase tracking-wider">Arrival Time</span>
                              <span className="font-bold text-cyber-text">{vip.arrivalTime}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-cyber-muted" />
                            <div>
                              <span className="text-cyber-muted block text-[8px] uppercase tracking-wider">Entry Gate</span>
                              <span className="font-bold text-cyber-text truncate max-w-[120px]" title={vip.entryGate}>
                                {vip.entryGate}
                              </span>
                            </div>
                          </div>

                          <div className="col-span-2 border-t border-cyber-border/30 pt-2 flex items-center gap-2">
                            <Shield className="h-3.5 w-3.5 text-cyber-primary" />
                            <div>
                              <span className="text-cyber-muted block text-[8px] uppercase tracking-wider">Allocated Responder Team</span>
                              <span className="font-bold text-cyber-text">{getTeamName(vip.assignedTeamId)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Routing Visualization */}
                        <div className="flex flex-col gap-2 font-mono text-[9px] border border-cyber-border/40 bg-cyber-bg/10 p-2.5 rounded-lg">
                          <span className="text-cyber-muted uppercase tracking-wider font-bold">ROUTE INTEGRITY GUIDANCE:</span>
                          <div className="flex justify-between items-center py-1 border-b border-cyber-border/20">
                            <div className="flex items-center gap-1.5">
                              <Navigation className="h-3 w-3 text-cyber-primary" />
                              <span className="text-cyber-text/80">Primary:</span>
                              <span className={`font-bold ${isUsingBackup ? 'text-cyber-muted line-through' : 'text-cyber-primary'}`}>
                                {primaryRoute?.name || 'R-03'}
                              </span>
                              <span className="text-cyber-muted">({primaryStartZone?.name || 'Zone C'})</span>
                            </div>
                            {!isUsingBackup && (
                              <Badge variant={hasConflict ? 'red' : 'green'} className="text-[7px] px-1 py-0 scale-90">
                                {hasConflict ? 'COMPROMISED' : 'CLEAR'}
                              </Badge>
                            )}
                          </div>
                          <div className="flex justify-between items-center py-1">
                            <div className="flex items-center gap-1.5">
                              <Navigation className="h-3 w-3 text-cyber-vip" />
                              <span className="text-cyber-text/80">Backup:</span>
                              <span className={`font-bold ${isUsingBackup ? 'text-cyber-success text-glow-success font-black' : 'text-cyber-vip'}`}>
                                {backupRoute?.name || 'R-12'}
                              </span>
                              <span className="text-cyber-muted">({backupStartZone?.name || 'Zone C'})</span>
                            </div>
                          </div>
                        </div>

                        {/* Operator Status Override Buttons */}
                        <div className="border-t border-cyber-border/30 pt-3 flex flex-col gap-2">
                          <span className="font-mono text-[8px] text-cyber-muted uppercase tracking-widest font-bold">
                            OPERATOR STATUS OVERRIDE:
                          </span>
                          <div className="grid grid-cols-3 gap-2">
                            <button
                              onClick={() => updateVipStatus(vip.id, 'planned')}
                              className={`text-[9px] font-mono font-bold uppercase tracking-wider py-1.5 rounded-lg border transition-all active:scale-[0.98] ${
                                vip.movementStatus === 'planned'
                                  ? 'bg-cyber-muted/10 border-cyber-muted text-cyber-muted'
                                  : 'border-cyber-border hover:border-cyber-border-glow hover:bg-cyber-bg/50 text-cyber-muted'
                              }`}
                            >
                              Planned
                            </button>
                            
                            <button
                              onClick={() => updateVipStatus(vip.id, 'active')}
                              className={`text-[9px] font-mono font-bold uppercase tracking-wider py-1.5 rounded-lg border transition-all active:scale-[0.98] ${
                                vip.movementStatus === 'active'
                                  ? 'bg-cyber-vip/10 border-cyber-vip text-cyber-vip shadow-glow-vip font-extrabold'
                                  : 'border-cyber-border hover:border-cyber-border-glow hover:bg-cyber-bg/50 text-cyber-text/70'
                              }`}
                            >
                              Active
                            </button>

                            <button
                              onClick={() => updateVipStatus(vip.id, 'completed')}
                              className={`text-[9px] font-mono font-bold uppercase tracking-wider py-1.5 rounded-lg border transition-all active:scale-[0.98] ${
                                vip.movementStatus === 'completed'
                                  ? 'bg-cyber-success/10 border-cyber-success text-cyber-success shadow-glow-success font-extrabold'
                                  : 'border-cyber-border hover:border-cyber-border-glow hover:bg-cyber-bg/50 text-cyber-text/70'
                              }`}
                            >
                              Completed
                            </button>
                          </div>
                        </div>

                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right Column: Dispatch Form & AI Advisor (5/12 cols) */}
        <div className="xl:col-span-5 flex flex-col gap-4 min-h-0 xl:overflow-hidden h-full">
          
          {/* Dispatch Form Card */}
          <Card 
            title={editingVip ? 'Modify Convoy Details' : 'Dispatch VVIP Convoy'}
            subtitle={editingVip ? 'Update operational route schedules' : 'Deploy new tactical passage schedules'}
            className="shrink-0 shadow-sm"
            headerAction={
              editingVip && (
                <button 
                  onClick={handleCancelEdit}
                  className="flex items-center gap-1 text-[9px] font-mono border border-cyber-border hover:border-cyber-primary rounded px-2 py-0.5 text-cyber-muted hover:text-cyber-primary transition-all"
                >
                  <X size={10} />
                  <span>Cancel Edit</span>
                </button>
              )
            }
          >
            <form onSubmit={handleSave} className="flex flex-col gap-2.5 font-mono text-[9px] text-cyber-text">
              <div className="grid grid-cols-2 gap-2">
                
                {/* VIP Name */}
                <div className="col-span-2 flex flex-col gap-0.5">
                  <label className="text-cyber-muted uppercase tracking-wider text-[7px] font-bold">VVIP Name / Convoy Label</label>
                  <input
                    type="text"
                    required
                    value={vipName}
                    onChange={(e) => setVipName(e.target.value)}
                    placeholder="e.g. Senator Vance & Convoy"
                    className="bg-cyber-bg border border-cyber-border rounded-lg py-1 px-2 focus:outline-none focus:border-cyber-primary text-cyber-text text-[10px]"
                  />
                </div>

                {/* Arrival Time */}
                <div className="flex flex-col gap-0.5">
                  <label className="text-cyber-muted uppercase tracking-wider text-[7px] font-bold">Arrival Time</label>
                  <input
                    type="text"
                    required
                    value={arrivalTime}
                    onChange={(e) => setArrivalTime(e.target.value)}
                    placeholder="e.g. 11:45 AM"
                    className="bg-cyber-bg border border-cyber-border rounded-lg py-1 px-2 focus:outline-none focus:border-cyber-primary text-cyber-text text-[10px]"
                  />
                </div>

                {/* Security Level */}
                <div className="flex flex-col gap-0.5">
                  <label className="text-cyber-muted uppercase tracking-wider text-[7px] font-bold">Security Level</label>
                  <select
                    value={securityLevel}
                    onChange={(e) => setSecurityLevel(e.target.value as any)}
                    className="bg-cyber-bg border border-cyber-border rounded-lg py-1 px-1.5 focus:outline-none focus:border-cyber-primary text-cyber-text text-[10px]"
                  >
                    <option value="Standard">Standard</option>
                    <option value="VIP">VIP</option>
                    <option value="VVIP">VVIP</option>
                  </select>
                </div>

                {/* Entry Gate */}
                <div className="flex flex-col gap-0.5">
                  <label className="text-cyber-muted uppercase tracking-wider text-[7px] font-bold">Entry Gate</label>
                  <input
                    type="text"
                    required
                    value={entryGate}
                    onChange={(e) => setEntryGate(e.target.value)}
                    placeholder="e.g. Gate C VVIP"
                    className="bg-cyber-bg border border-cyber-border rounded-lg py-1 px-2 focus:outline-none focus:border-cyber-primary text-cyber-text text-[10px]"
                  />
                </div>

                {/* Destination */}
                <div className="flex flex-col gap-0.5">
                  <label className="text-cyber-muted uppercase tracking-wider text-[7px] font-bold">Destination</label>
                  <input
                    type="text"
                    required
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="e.g. VIP Box 12"
                    className="bg-cyber-bg border border-cyber-border rounded-lg py-1 px-2 focus:outline-none focus:border-cyber-primary text-cyber-text text-[10px]"
                  />
                </div>

                {/* Expected People */}
                <div className="flex flex-col gap-0.5">
                  <label className="text-cyber-muted uppercase tracking-wider text-[7px] font-bold">Pax Count</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={expectedPeople}
                    onChange={(e) => setExpectedPeople(Number(e.target.value))}
                    className="bg-cyber-bg border border-cyber-border rounded-lg py-1 px-2 focus:outline-none focus:border-cyber-primary text-cyber-text text-[10px]"
                  />
                </div>

                {/* Convoy Size */}
                <div className="flex flex-col gap-0.5">
                  <label className="text-cyber-muted uppercase tracking-wider text-[7px] font-bold">Vehicles Count</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={convoySize}
                    onChange={(e) => setConvoySize(Number(e.target.value))}
                    className="bg-cyber-bg border border-cyber-border rounded-lg py-1 px-2 focus:outline-none focus:border-cyber-primary text-cyber-text text-[10px]"
                  />
                </div>

                {/* Primary Route */}
                <div className="flex flex-col gap-0.5">
                  <label className="text-cyber-muted uppercase tracking-wider text-[7px] font-bold">Primary Route</label>
                  <select
                    value={primaryRouteId}
                    onChange={(e) => setPrimaryRouteId(e.target.value)}
                    className="bg-cyber-bg border border-cyber-border rounded-lg py-1 px-1.5 focus:outline-none focus:border-cyber-primary text-cyber-text text-[10px]"
                  >
                    <option value="">No Route</option>
                    {routes.map(r => (
                      <option key={r.id} value={r.id}>{r.name} ({r.routeType})</option>
                    ))}
                  </select>
                </div>

                {/* Backup Route */}
                <div className="flex flex-col gap-0.5">
                  <label className="text-cyber-muted uppercase tracking-wider text-[7px] font-bold">Backup Route</label>
                  <select
                    value={backupRouteId}
                    onChange={(e) => setBackupRouteId(e.target.value)}
                    className="bg-cyber-bg border border-cyber-border rounded-lg py-1 px-1.5 focus:outline-none focus:border-cyber-primary text-cyber-text text-[10px]"
                  >
                    <option value="">No Backup Route</option>
                    {routes.map(r => (
                      <option key={r.id} value={r.id}>{r.name} ({r.routeType})</option>
                    ))}
                  </select>
                </div>

                {/* Tactical Team */}
                <div className="flex flex-col gap-0.5">
                  <label className="text-cyber-muted uppercase tracking-wider text-[7px] font-bold">Assigned Responder Team</label>
                  <select
                    value={assignedTeamId}
                    onChange={(e) => setAssignedTeamId(e.target.value)}
                    className="bg-cyber-bg border border-cyber-border rounded-lg py-1 px-1.5 focus:outline-none focus:border-cyber-primary text-cyber-text text-[10px]"
                  >
                    <option value="">Unassigned</option>
                    <option value="t1">Tactical Team Alpha</option>
                    <option value="t2">VVIP Tactical Escort (Bravo)</option>
                    <option value="t3">Team Charlie (Medical)</option>
                  </select>
                </div>

                {/* Movement Status */}
                <div className="flex flex-col gap-0.5">
                  <label className="text-cyber-muted uppercase tracking-wider text-[7px] font-bold">Movement Status</label>
                  <select
                    value={movementStatus}
                    onChange={(e) => setMovementStatus(e.target.value as any)}
                    className="bg-cyber-bg border border-cyber-border rounded-lg py-1 px-1.5 focus:outline-none focus:border-cyber-primary text-cyber-text text-[10px]"
                  >
                    <option value="planned">Planned</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="delayed">Delayed</option>
                  </select>
                </div>

              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end pt-2 border-t border-cyber-border/30 select-none">
                <Button 
                  type="submit" 
                  variant="success" 
                  size="sm"
                  className="w-full flex items-center justify-center gap-1 py-1.5 text-[9px]"
                >
                  {editingVip ? <CheckCircle size={10} /> : <Plus size={10} />}
                  <span>{editingVip ? 'Apply Modifications' : 'Deploy Scheduled Convoy'}</span>
                </Button>
              </div>
            </form>
          </Card>

          {/* AI Recommendation / Route Planner Guidance Deck */}
          <Card 
            title="AI Tactical VIP Advisor" 
            subtitle="Real-time secure routing guidance & multi-agent diagnostics"
            className="flex-1 flex flex-col min-h-0 overflow-hidden shadow-sm"
          >
            <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1 pb-2">
              
              {/* Dynamic Security Planner Box */}
              <div className="border border-cyber-primary/20 bg-cyber-primary/5 rounded-xl p-3.5 relative overflow-hidden flex flex-col gap-2 shrink-0">
                <span className="absolute top-0 right-0 bg-cyber-primary/10 border-b border-l border-cyber-primary/25 px-2 py-0.5 font-mono text-[7px] text-cyber-primary uppercase tracking-wider flex items-center gap-1">
                  <Sparkles size={8} className="animate-pulse" />
                  REAL-TIME GUIDE
                </span>

                <div className="flex items-start gap-2">
                  <Cpu size={14} className="text-cyber-primary shrink-0 mt-0.5 animate-pulse" />
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-mono font-bold text-cyber-primary uppercase tracking-wider">Dynamic Routing Guidance:</span>
                    {guidance.warning && (
                      <div className="border border-cyber-danger/35 bg-cyber-danger/5 text-cyber-danger text-[9px] p-2 rounded-lg leading-relaxed flex gap-1.5 items-start mt-1 font-sans">
                        <AlertTriangle size={11} className="shrink-0 mt-0.5 text-cyber-danger animate-pulse" />
                        <span>{guidance.warning}</span>
                      </div>
                    )}
                    <p className="text-[10px] font-sans text-cyber-text/90 leading-relaxed bg-cyber-bg/30 p-2.5 rounded-lg border border-cyber-border/20 mt-1">
                      {guidance.recommendation}
                    </p>
                  </div>
                </div>
              </div>

              {/* Multi-Agent Advisory Actions */}
              {vipRecommendations.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-6 text-cyber-muted font-mono gap-1.5 border border-dashed border-cyber-border/40 bg-cyber-bg/10 rounded-xl">
                  <CheckCircle size={15} className="text-cyber-success" />
                  <span className="text-[8px] tracking-widest uppercase">VIP Corridors Optimal</span>
                  <span className="text-[7px] text-cyber-muted/60">No pending emergency reroutes active</span>
                </div>
              ) : (
                vipRecommendations.map((rec) => (
                  <div 
                    key={rec.id}
                    className="border border-cyber-danger/30 bg-cyber-danger/5 hover:border-cyber-danger/50 p-3.5 rounded-xl flex flex-col gap-2.5 transition-all shadow-glow-danger animate-pulse shrink-0"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1 text-cyber-danger">
                        <Cpu size={12} />
                        <span className="font-mono text-[9px] font-bold uppercase tracking-wider">VIP COORDINATION ADV</span>
                      </div>
                      <Badge variant="red" className="text-[7px] font-bold scale-90">CRITICAL</Badge>
                    </div>

                    <div className="flex flex-col gap-1">
                      <h4 className="font-orbitron font-extrabold text-xs text-cyber-text tracking-wide uppercase leading-tight">
                        {rec.summary}
                      </h4>
                      <p className="text-[9px] font-sans text-cyber-text/80 leading-relaxed bg-cyber-bg/50 p-2 rounded-lg border border-cyber-border/25 mt-0.5">
                        {rec.recommendation}
                      </p>
                    </div>

                    <div className="flex flex-col gap-1 font-mono text-[9px]">
                      <span className="text-cyber-muted text-[8px] uppercase tracking-wider font-bold">Suggested Actions Checklist:</span>
                      <div className="flex flex-col gap-1 mt-0.5 pl-0.5">
                        {rec.suggestedActions.map((action, idx) => (
                          <div key={idx} className="flex items-start gap-1.5 text-cyber-text/80 text-[8px]">
                            <ArrowRight size={8} className="text-cyber-danger mt-0.5" />
                            <span>{action}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end border-t border-cyber-border/20 pt-2.5 mt-1 select-none">
                      <button
                        onClick={() => rejectRecommendation(rec.id)}
                        className="bg-cyber-bg hover:bg-cyber-card border border-cyber-border text-cyber-muted hover:text-cyber-text text-[9px] font-mono px-2 py-1 rounded-lg uppercase transition-all"
                      >
                        Dismiss
                      </button>
                      <button
                        onClick={() => approveRecommendation(rec.id)}
                        className="bg-cyber-success/15 border border-cyber-success/40 hover:border-cyber-success text-cyber-success hover:bg-cyber-success/30 text-[9px] font-mono px-2.5 py-1 rounded-lg font-bold uppercase transition-all shadow-glow-success"
                      >
                        Approve Reroute
                      </button>
                    </div>
                  </div>
                ))
              )}

            </div>
          </Card>
        </div>

      </div>

    </div>
  );
};

export default VipMovementControlDeck;
