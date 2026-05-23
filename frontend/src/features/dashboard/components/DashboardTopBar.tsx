import React, { useEffect } from 'react';
import { useDashboardStore } from '../../../shared/store/dashboardStore';
import { Badge } from '../../../shared/components/Badge';
import { Trophy, Activity, Clock, Heart, Cpu, RadioTower } from 'lucide-react';

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
    <header className="z-10 mx-5 mt-4 flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-black/28 px-5 py-4 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center gap-4">
        <div className="grid h-11 w-11 place-items-center rounded-lg border border-cyber-primary/30 bg-cyber-primary/10">
          <Trophy className="h-5 w-5 text-cyber-primary" />
        </div>
        <div className="flex flex-col">
          <span className="font-orbitron text-lg font-black tracking-wide text-cyber-text">
            {stadiumName}
          </span>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] font-mono text-cyber-muted">
            <Activity className="h-3 w-3 text-cyber-success" />
            <span className="uppercase tracking-wider">{matchPhase}</span>
          </div>
        </div>
      </div>

      <div className="hidden items-center gap-5 lg:flex">
        <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
          <span className="text-[10px] font-mono text-cyber-muted uppercase tracking-widest">Risk</span>
          <Badge 
            variant={getRiskBadgeVariant()} 
            pulse={emergencyMode || globalRiskLevel !== 'safe'}
            className="text-[10px]"
          >
            {emergencyMode ? 'EVACUATION ACTIVE' : `${globalRiskLevel} risk`}
          </Badge>
        </div>

        <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
          <span className="text-[10px] font-mono text-cyber-muted uppercase tracking-widest">Flow</span>
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-cyber-danger fill-cyber-danger/25" />
            <span className={`font-orbitron font-bold text-sm ${getHealthColorClass()}`}>
              {crowdHealthScore}%
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-2 text-cyber-primary border border-cyber-primary/20 bg-cyber-primary/10 px-3 py-2 rounded-lg font-mono text-xs sm:flex">
          <Cpu className="h-3.5 w-3.5" />
          <span className="text-[10px] uppercase font-bold tracking-wider">AI Active</span>
        </div>
        
        <div className="flex items-center gap-2 text-cyber-text/80 font-mono text-xs rounded-lg border border-white/10 bg-white/5 px-3 py-2">
          <RadioTower className="h-3.5 w-3.5 text-cyber-success" />
          <Clock className="h-3.5 w-3.5 text-cyber-muted" />
          <span>{systemTime}</span>
        </div>
      </div>
    </header>
  );
};
