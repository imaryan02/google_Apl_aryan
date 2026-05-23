import React from 'react';
import { useDashboardStore } from '../../../shared/store/dashboardStore';
import { Card } from '../../../shared/components/Card';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip 
} from 'recharts';

export const CrowdHealthPanel: React.FC = () => {
  const { currentOccupancy, stadiumCapacity, crowdHealthScore } = useDashboardStore();

  // Mock historical occupancy and risk levels for Recharts
  const data = [
    { time: '10:40', occupancy: 40100, health: 96 },
    { time: '10:45', occupancy: 45400, health: 94 },
    { time: '10:50', occupancy: 51200, health: 90 },
    { time: '10:55', occupancy: 56900, health: 85 },
    { time: '11:00', occupancy: 59800, health: 81 },
    { time: '11:05', occupancy: 61200, health: 79 },
    { time: '11:10', occupancy: currentOccupancy, health: crowdHealthScore },
  ];

  const occupancyPercent = ((currentOccupancy / stadiumCapacity) * 100).toFixed(1);

  return (
    <Card 
      title="Diagnostics & Trends" 
      subtitle="60-Minute Operational Crowd Curve"
      className="h-full flex flex-col"
    >
      <div className="flex gap-4 items-center justify-between mb-2">
        {/* Numerical Indicators */}
        <div className="flex gap-4 font-mono">
          <div className="flex flex-col">
            <span className="text-[9px] text-cyber-muted uppercase tracking-wider">LOAD FACTOR:</span>
            <span className="text-cyber-primary text-xs font-bold text-glow">
              {currentOccupancy.toLocaleString()} / {stadiumCapacity.toLocaleString()} ({occupancyPercent}%)
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] text-cyber-muted uppercase tracking-wider">HEALTH SCORE:</span>
            <span className={`text-xs font-bold ${
              crowdHealthScore > 80 ? 'text-cyber-success' : crowdHealthScore > 50 ? 'text-cyber-warning' : 'text-cyber-danger'
            }`}>
              {crowdHealthScore}% status
            </span>
          </div>
        </div>

        {/* Diagnostic Heartbeat Indicator */}
        <div className="flex items-center gap-1.5 font-mono text-[9px] text-cyber-success bg-cyber-success/5 border border-cyber-success/20 px-2 py-0.5 rounded-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-cyber-success animate-ping"></span>
          <span>TELEMETRY STABLE</span>
        </div>
      </div>

      {/* Recharts Glowing Chart Area */}
      <div className="w-full h-[155px] font-mono text-[9px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="colorOccupancy" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.25}/>
                <stop offset="95%" stopColor="#00f0ff" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorHealth" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="time" 
              stroke="#64748b" 
              tickSize={4}
              style={{ fontSize: '8px', fill: '#64748b' }}
            />
            <YAxis 
              stroke="#64748b" 
              style={{ fontSize: '8px', fill: '#64748b' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#0d1326', 
                borderColor: '#182542', 
                borderRadius: '2px',
                fontSize: '9px',
                fontFamily: 'monospace',
                color: '#e2e8f0'
              }}
            />
            <Area 
              type="monotone" 
              dataKey="occupancy" 
              stroke="#00f0ff" 
              strokeWidth={1.5}
              fillOpacity={1} 
              fill="url(#colorOccupancy)" 
              name="Occupancy"
            />
            <Area 
              type="monotone" 
              dataKey="health" 
              stroke="#8b5cf6" 
              strokeWidth={1.5}
              fillOpacity={1} 
              fill="url(#colorHealth)" 
              name="Cohesion Score"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
