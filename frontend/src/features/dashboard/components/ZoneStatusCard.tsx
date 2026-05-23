import React from 'react';
import { useDashboardStore } from '../../../shared/store/dashboardStore';
import { Card } from '../../../shared/components/Card';
import { Badge } from '../../../shared/components/Badge';
import { Camera, Plus, Minus } from 'lucide-react';

export const ZoneStatusCard: React.FC = () => {
  const { zones, updateZoneDensity } = useDashboardStore();

  const getRiskColor = (risk: string) => {
    if (risk === 'critical') return 'red';
    if (risk === 'warning') return 'amber';
    return 'green';
  };

  const getBarColor = (density: number) => {
    if (density >= 85) return 'bg-cyber-danger shadow-glow-danger';
    if (density >= 70) return 'bg-cyber-warning shadow-glow-warning';
    return 'bg-cyber-success shadow-glow-success';
  };

  return (
    <Card 
      title="Sector Telemetry" 
      subtitle="8 Intelligent CCTV Monitored Zones"
      className="h-full flex flex-col overflow-hidden"
    >
      <div className="flex-1 flex flex-col gap-2.5 overflow-y-auto pr-1">
        {zones.map((zone) => (
          <div 
            key={zone.id} 
            id={`zone-${zone.code}`}
            className="border border-white/10 bg-white/5 p-3 rounded-lg hover:border-cyber-primary/40 hover:bg-white/8 transition-all flex flex-col gap-2.5 relative group"
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-cyber-primary">{zone.code}</span>
                <span className="text-xs font-sans text-cyber-text/90">{zone.name}</span>
              </div>
              
              <div className="flex items-center gap-1.5">
                <Badge variant={getRiskColor(zone.riskLevel)} className="text-[9px] px-1.5 py-0">
                  {zone.riskLevel}
                </Badge>
                <div className="flex items-center gap-0.5 text-cyber-muted text-[10px] font-mono">
                  <Camera size={10} className="text-cyber-muted" />
                  <span>{zone.cameraId}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono mt-0.5">
              <div className="flex items-center gap-3">
                <span className="text-cyber-muted uppercase">DENSITY:</span>
                <span className={`font-bold ${
                  zone.currentDensity >= 85 ? 'text-cyber-danger' : zone.currentDensity >= 70 ? 'text-cyber-warning' : 'text-cyber-success'
                }`}>
                  {Math.round(zone.currentDensity)}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-cyber-muted uppercase">FLOW SPEED:</span>
                <span className={`font-bold ${
                  zone.movementSpeed === 'stagnant' ? 'text-cyber-danger' : zone.movementSpeed === 'slow' ? 'text-cyber-warning' : 'text-cyber-success'
                }`}>
                  {zone.movementSpeed}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 bg-white/10 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${getBarColor(zone.currentDensity)}`}
                  style={{ width: `${Math.min(100, zone.currentDensity)}%` }}
                ></div>
              </div>
              
              {/* Density Simulator Overrides */}
              <div className="opacity-40 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                <button
                  onClick={() => updateZoneDensity(zone.code, Math.max(0, zone.currentDensity - 5))}
                  title="Simulate Decreasing Crowd"
                  className="bg-white/8 hover:bg-cyber-primary/20 text-cyber-muted hover:text-cyber-primary border border-white/10 p-1 rounded-md active:scale-[0.9] transition-all"
                >
                  <Minus size={10} />
                </button>
                <button
                  onClick={() => updateZoneDensity(zone.code, Math.min(100, zone.currentDensity + 5))}
                  title="Simulate Crowd Buildup"
                  className="bg-white/8 hover:bg-cyber-primary/20 text-cyber-muted hover:text-cyber-primary border border-white/10 p-1 rounded-md active:scale-[0.9] transition-all"
                >
                  <Plus size={10} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
