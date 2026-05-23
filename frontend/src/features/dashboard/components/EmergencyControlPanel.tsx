import React from 'react';
import { useDashboardStore } from '../../../shared/store/dashboardStore';
import { Card } from '../../../shared/components/Card';
import { Badge } from '../../../shared/components/Badge';
import { Flame, Zap, AlertTriangle, ShieldCheck } from 'lucide-react';

interface PanelProps {
  className?: string;
}

export const EmergencyControlPanel: React.FC<PanelProps> = ({ className = '' }) => {
  const { emergencyMode, toggleEmergencyMode, routes } = useDashboardStore();
  const emergencyRoutes = routes.filter(r => r.isEmergencyLane || r.routeType === 'emergency');

  return (
    <Card 
      title="System Overrides" 
      subtitle="High-Security Mission Control Controls"
      className={`${className} flex flex-col overflow-hidden`}
      glowColor={emergencyMode ? 'red' : 'none'}
    >
      <div className="flex flex-col gap-3 justify-between">
        
        {/* Warning Indicator */}
        <div className={`p-3 border rounded-lg flex gap-3 items-start transition-all ${
          emergencyMode 
            ? 'border-cyber-danger bg-cyber-danger/15 animate-pulse shadow-glow-danger' 
            : 'border-white/10 bg-white/5'
        }`}>
          <div className="mt-0.5 shrink-0">
            {emergencyMode ? (
              <Flame className="h-5 w-5 text-cyber-danger animate-bounce" />
            ) : (
              <ShieldCheck className="h-5 w-5 text-cyber-success" />
            )}
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-orbitron font-bold text-xs uppercase text-cyber-text tracking-wider">
              {emergencyMode ? 'EVACUATION SYSTEM ACTIVE' : 'ALL CORE SYSTEMS LOCK'}
            </span>
            <p className="text-[9px] font-sans text-cyber-muted leading-relaxed">
              {emergencyMode 
                ? 'System-wide emergency override triggered. Broadcast channels deployed, alternate routes opened, security personnel guided.' 
                : 'Emergency overrides inactive. In case of localized stampede risk, VIP breach, or threat detection, invoke the switch below.'}
            </p>
          </div>
        </div>

        {/* Status of Emergency Evacuation Lanes */}
        <div className="border border-white/10 bg-black/18 p-2.5 rounded-lg flex flex-col gap-1.5 font-mono text-[9px]">
          <span className="text-cyber-muted uppercase tracking-widest font-bold">EVACUATION TACTICAL ROUTES:</span>
          <div className="flex flex-col gap-1">
            {emergencyRoutes.map(route => (
              <div key={route.id} className="flex justify-between items-center py-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-cyber-primary">{route.name}</span>
                  <span className="text-cyber-text/60">({route.toLocation})</span>
                </div>
                <Badge variant={emergencyMode ? 'green' : 'gray'} className="text-[7px] px-1 py-0">
                  {emergencyMode ? 'ACTIVE evacuation' : 'STANDBY'}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Physical Override Actuator Button */}
        <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
          {emergencyMode ? (
            <button
              onClick={toggleEmergencyMode}
              className="w-full bg-cyber-success/15 border border-cyber-success hover:border-cyber-success hover:bg-cyber-success/25 text-cyber-success text-xs font-orbitron font-black uppercase tracking-widest py-3 rounded-lg shadow-glow-success active:scale-[0.98] transition-all flex items-center justify-center gap-2 select-none"
            >
              <Zap size={14} className="animate-pulse" />
              <span>DEACTIVATE SYSTEM OVERRIDE</span>
            </button>
          ) : (
            <button
              onClick={toggleEmergencyMode}
              className="w-full bg-cyber-danger/10 border border-cyber-danger hover:border-cyber-danger hover:bg-cyber-danger/25 text-cyber-danger text-xs font-orbitron font-black uppercase tracking-widest py-3 rounded-lg shadow-glow-danger active:scale-[0.98] transition-all flex items-center justify-center gap-2 select-none"
            >
              <AlertTriangle size={14} className="animate-bounce" />
              <span>TRIGGER SYSTEM-WIDE EVACUATION</span>
            </button>
          )}
          <span className="text-[8px] font-mono text-center text-cyber-muted tracking-wide">
            WARNING: Activating emergency broadcast redirects all smart signage to exit lanes.
          </span>
        </div>

      </div>
    </Card>
  );
};
