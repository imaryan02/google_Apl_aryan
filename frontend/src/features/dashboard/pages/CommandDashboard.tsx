import React from 'react';
import { DashboardTopBar } from '../components/DashboardTopBar';
import { ZoneStatusCard } from '../components/ZoneStatusCard';
import { StadiumRadarMap } from '../components/StadiumRadarMap';
import { AgentRecommendationPanel } from '../components/AgentRecommendationPanel';
import { EmergencyControlPanel } from '../components/EmergencyControlPanel';
import { CrowdHealthPanel } from '../components/CrowdHealthPanel';
import { LiveAlertFeed } from '../components/LiveAlertFeed';
import { useDashboardStore } from '../../../shared/store/dashboardStore';
import { Activity, AlertTriangle, Route, ShieldCheck, Users } from 'lucide-react';

export const CommandDashboard: React.FC = () => {
  const {
    currentOccupancy,
    stadiumCapacity,
    crowdHealthScore,
    zones,
    routes,
    alerts,
    vipMovements
  } = useDashboardStore();

  const occupancyPercent = Math.round((currentOccupancy / stadiumCapacity) * 100);
  const criticalZones = zones.filter((zone) => zone.riskLevel === 'critical').length;
  const activeAlerts = alerts.filter((alert) => alert.status === 'active').length;
  const openRoutes = routes.filter((route) => route.status === 'open').length;
  const activeVips = vipMovements.filter((vip) => vip.movementStatus === 'active').length;

  const kpis = [
    {
      label: 'Occupancy',
      value: `${occupancyPercent}%`,
      detail: `${currentOccupancy.toLocaleString()} inside`,
      icon: Users,
      tone: 'text-cyber-primary',
    },
    {
      label: 'Crowd Health',
      value: `${crowdHealthScore}%`,
      detail: crowdHealthScore > 80 ? 'stable flow' : crowdHealthScore > 50 ? 'pressure rising' : 'intervention needed',
      icon: Activity,
      tone: crowdHealthScore > 80 ? 'text-cyber-success' : crowdHealthScore > 50 ? 'text-cyber-warning' : 'text-cyber-danger',
    },
    {
      label: 'Open Routes',
      value: `${openRoutes}/${routes.length}`,
      detail: `${activeVips} VIP movement active`,
      icon: Route,
      tone: 'text-cyber-vip',
    },
    {
      label: 'Active Alerts',
      value: String(activeAlerts),
      detail: `${criticalZones} critical sectors`,
      icon: activeAlerts > 0 ? AlertTriangle : ShieldCheck,
      tone: activeAlerts > 0 ? 'text-cyber-warning' : 'text-cyber-success',
    },
  ];

  return (
    <div className="flex flex-col h-full max-h-full overflow-hidden select-none">
      <DashboardTopBar />

      <section className="grid grid-cols-1 gap-3 px-5 pt-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="cyber-panel p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-cyber-muted font-mono">{item.label}</p>
                  <p className={`mt-1 text-3xl font-black ${item.tone}`}>{item.value}</p>
                  <p className="mt-1 text-xs text-cyber-muted">{item.detail}</p>
                </div>
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/6">
                  <Icon className={`h-5 w-5 ${item.tone}`} />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <div className="flex-1 grid grid-cols-12 gap-4 p-5 min-h-0 overflow-hidden">
        <div className="col-span-12 xl:col-span-3 h-full flex flex-col min-h-0 overflow-hidden">
          <ZoneStatusCard />
        </div>

        <div className="col-span-12 xl:col-span-6 h-full flex flex-col gap-4 min-h-0 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-hidden">
            <StadiumRadarMap />
          </div>
          <div className="h-[220px] shrink-0">
            <CrowdHealthPanel />
          </div>
        </div>

        <div className="col-span-12 xl:col-span-3 h-full flex flex-col gap-4 min-h-0 overflow-hidden">
          <AgentRecommendationPanel className="flex-[3] min-h-0" />
          <LiveAlertFeed className="flex-[2] min-h-0" />
          <EmergencyControlPanel className="shrink-0" />
        </div>
      </div>
    </div>
  );
};
export default CommandDashboard;
