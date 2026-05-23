import React from 'react';
import { DashboardTopBar } from '../components/DashboardTopBar';
import { ZoneStatusCard } from '../components/ZoneStatusCard';
import { StadiumRadarMap } from '../components/StadiumRadarMap';
import { AgentRecommendationPanel } from '../components/AgentRecommendationPanel';
import { EmergencyControlPanel } from '../components/EmergencyControlPanel';
import { CrowdHealthPanel } from '../components/CrowdHealthPanel';
import { LiveAlertFeed } from '../components/LiveAlertFeed';

export const CommandDashboard: React.FC = () => {
  return (
    <div className="flex flex-col h-full max-h-full overflow-hidden select-none bg-cyber-bg">
      {/* Tactical Operation Banner */}
      <DashboardTopBar />

      {/* Main 100vh locked grid layout */}
      <div className="flex-1 grid grid-cols-12 gap-4 p-4 min-h-0 overflow-hidden">
        
        {/* Left Column: Telemetry (Spans 3 cols) */}
        <div className="col-span-12 lg:col-span-3 h-full flex flex-col min-h-0 overflow-hidden">
          <ZoneStatusCard />
        </div>

        {/* Center Column: Radar Map & Telemetry Curves (Spans 6 cols) */}
        <div className="col-span-12 lg:col-span-6 h-full flex flex-col gap-4 min-h-0 overflow-hidden">
          {/* Interactive SONAR Radar Map */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <StadiumRadarMap />
          </div>
          
          {/* Area charts and telemetry logs */}
          <div className="h-[210px] shrink-0">
            <CrowdHealthPanel />
          </div>
        </div>

        {/* Right Column: Advisory & Incident Overrides (Spans 3 cols) */}
        <div className="col-span-12 lg:col-span-3 h-full flex flex-col gap-4 min-h-0 overflow-hidden">
          {/* AI Advisory Panel */}
          <AgentRecommendationPanel className="flex-[3] min-h-0" />

          {/* Active Alerts List */}
          <LiveAlertFeed className="flex-[2] min-h-0" />

          {/* Manual emergency overrides */}
          <EmergencyControlPanel className="shrink-0" />
        </div>

      </div>
    </div>
  );
};
export default CommandDashboard;
