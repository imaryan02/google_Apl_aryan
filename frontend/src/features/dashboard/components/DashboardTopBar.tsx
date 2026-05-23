import React, { useEffect } from 'react';
import { useDashboardStore } from '../../../shared/store/dashboardStore';
import { Badge } from '../../../shared/components/Badge';
import { 
  Trophy, 
  Activity, 
  Clock, 
  Heart, 
  Cpu
} from 'lucide-react';

export const DashboardTopBar: React.FC = () => {
  const { 
    stadiumName, 
    matchPhase, 
    globalRiskLevel, 
    crowdHealthScore, 
    emergencyMode,
    systemTime,
    setSystemTime 
  } = useDashboardStore();

  useEffect(() => {
    const timer = setInterval(() => {
      setSystemTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, [setSystemTime]);

  const getRiskBadgeVariant = () => {
    if (emergencyMode || globalRiskLevel === 'critical') return 'red';
    if (globalRiskLevel === 'warning') return 'amber';
    return 'green';
  };

  const getHealthColorClass = () => {
    if (crowdHealthScore > 80) return 'text-cyber-success text-glow-success';
    if (crowdHealthScore > 50) return 'text-cyber-warning text-glow-warning';
    return 'text-cyber-danger text-glow-danger animate-pulse';
  };

  return (
    <header className="cyber-panel border-b border-cyber-border/80 px-6 py-3 flex items-center justify-between z-10">
      {/* Stadium Identity / Pulse */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-cyber-primary" />
          <span className="font-orbitron font-black text-sm uppercase tracking-widest text-cyber-text">
            {stadiumName}
          </span>
        </div>
        <div className="h-4 w-[1px] bg-cyber-border/40"></div>
        <div className="flex items-center gap-1 text-[11px] font-mono text-cyber-muted">
          <Activity className="h-3 w-3 text-cyber-success animate-pulse" />
          <span className="uppercase tracking-wider">{matchPhase}</span>
        </div>
      </div>

      {/* Center Tactical Diagnostics */}
      <div className="flex items-center gap-8">
        {/* Global Threat Matrix */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-cyber-muted uppercase tracking-widest">THREAT MATRIX:</span>
          <Badge 
            variant={getRiskBadgeVariant()} 
            pulse={emergencyMode || globalRiskLevel !== 'safe'}
            className="text-[10px]"
          >
            {emergencyMode ? 'EVACUATION ACTIVE' : `${globalRiskLevel} risk`}
          </Badge>
        </div>

        {/* Global Crowd Health Score */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-cyber-muted uppercase tracking-widest">CROWD COHESION:</span>
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-cyber-danger fill-cyber-danger/25" />
            <span className={`font-orbitron font-bold text-sm ${getHealthColorClass()}`}>
              {crowdHealthScore}%
            </span>
          </div>
        </div>
      </div>

      {/* Clock HUD */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-cyber-primary border border-cyber-primary/20 bg-cyber-primary/5 px-3 py-1 rounded-sm font-mono text-xs">
          <Cpu className="h-3.5 w-3.5 animate-pulse" />
          <span className="text-[10px] uppercase font-bold tracking-wider">AI COPROCESSOR ACTIVE</span>
        </div>
        
        <div className="flex items-center gap-2 text-cyber-text/80 font-mono text-xs">
          <Clock className="h-3.5 w-3.5 text-cyber-muted" />
          <span>{systemTime}</span>
        </div>
      </div>
    </header>
  );
};
