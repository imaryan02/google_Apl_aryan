import React from 'react';
import { useDashboardStore } from '../../../shared/store/dashboardStore';
import { Card } from '../../../shared/components/Card';
import { Badge } from '../../../shared/components/Badge';
import { ShieldAlert, Info, AlertTriangle, CheckCircle } from 'lucide-react';

interface PanelProps {
  className?: string;
}

export const LiveAlertFeed: React.FC<PanelProps> = ({ className = '' }) => {
  const { alerts, resolveAlert } = useDashboardStore();
  const activeAlerts = alerts.filter(a => a.status === 'active');

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <ShieldAlert className="h-5 w-5 text-cyber-danger fill-cyber-danger/10 animate-bounce" />;
      case 'high':
        return <AlertTriangle className="h-5 w-5 text-cyber-danger animate-pulse" />;
      case 'medium':
        return <AlertTriangle className="h-5 w-5 text-cyber-warning" />;
      default:
        return <Info className="h-5 w-5 text-cyber-primary" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'red';
      case 'high':
        return 'red';
      case 'medium':
        return 'amber';
      default:
        return 'cyan';
    }
  };

  return (
    <Card 
      title="Alert Center Feed" 
      subtitle="Real-Time Incident Notifications"
      className={`${className} flex flex-col overflow-hidden`}
    >
      <div className="flex flex-col gap-2.5">
        {activeAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-cyber-muted font-mono gap-2 border border-dashed border-white/15 bg-white/5 rounded-lg">
            <CheckCircle className="h-8 w-8 text-cyber-success/60 shadow-glow-success" />
            <span className="text-[10px] tracking-wider uppercase">ALL SECTORS OPTIMAL</span>
          </div>
        ) : (
          activeAlerts.map((alert) => (
            <div 
              key={alert.id}
              className={`flex items-start gap-3 p-3 border rounded-lg transition-all ${
                alert.severity === 'critical' 
                  ? 'border-cyber-danger/35 bg-cyber-danger/10 shadow-glow-danger' 
                  : alert.severity === 'high'
                  ? 'border-cyber-danger/20 bg-white/6'
                  : 'border-white/10 bg-white/5'
              }`}
            >
              {/* Alert Indicator */}
              <div className="mt-0.5">{getAlertIcon(alert.severity)}</div>

              {/* Alert Detail */}
              <div className="flex-1 flex flex-col gap-1">
                <div className="flex justify-between items-start gap-2">
                  <span className="font-orbitron text-xs font-bold uppercase tracking-wider text-cyber-text">
                    {alert.title}
                  </span>
                  <Badge variant={getSeverityBadge(alert.severity)} className="text-[8px] font-bold px-1 py-0">
                    {alert.severity}
                  </Badge>
                </div>
                
                <p className="text-[10px] font-sans text-cyber-text/70 leading-relaxed">
                  {alert.description}
                </p>

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-cyber-border/30">
                  <div className="flex items-center gap-2 font-mono text-[9px] text-cyber-muted">
                    <span className="text-cyber-primary">{alert.zoneCode}</span>
                    <span>/</span>
                    <span>{new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  
                  <button
                    onClick={() => resolveAlert(alert.id)}
                    className="text-[9px] font-mono text-cyber-success hover:text-cyber-success hover:underline tracking-wider uppercase font-bold focus:outline-none"
                  >
                    Resolve Incident
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};
