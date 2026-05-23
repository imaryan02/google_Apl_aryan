import React, { useState } from 'react';
import { useDashboardStore } from '../../../shared/store/dashboardStore';
import { Card } from '../../../shared/components/Card';
import { Badge } from '../../../shared/components/Badge';
import { 
  Bell, CheckCircle, XCircle, AlertTriangle, Clock, Search, 
  Radio, Cpu, History, Sparkles, Check 
} from 'lucide-react';
import { API_BASE_URL } from '../../../shared/config/api';

export const AlertCenterManager: React.FC = () => {
  const { 
    alerts, 
    agentRecommendations, 
    approveRecommendation, 
    rejectRecommendation, 
    resolveAlert 
  } = useDashboardStore();

  // Search & Filter state for Resolved History
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Loading indicator states
  const [resolvingAlertId, setResolvingAlertId] = useState<string | null>(null);

  // Filtered lists
  const activeAlerts = alerts.filter(a => a.status === 'active');
  const resolvedAlerts = alerts.filter(a => a.status === 'resolved');

  // Apply search/filters on historical resolved alerts
  const filteredHistory = resolvedAlerts.filter(a => {
    const matchesSearch = 
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (a.description && a.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      a.zoneCode.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesSeverity = severityFilter === 'ALL' || a.severity.toUpperCase() === severityFilter;
    const matchesType = typeFilter === 'ALL' || a.alertType === typeFilter;

    return matchesSearch && matchesSeverity && matchesType;
  });

  // Calculate resolution duration string
  const getResolutionDuration = (createdAt: string, resolvedAt?: string) => {
    if (!resolvedAt) return 'N/A';
    try {
      const created = new Date(createdAt).getTime();
      const resolved = new Date(resolvedAt).getTime();
      const diffMs = resolved - created;
      if (diffMs <= 0) return '0s';
      
      const diffSecs = Math.floor(diffMs / 1000);
      const minutes = Math.floor(diffSecs / 60);
      const seconds = diffSecs % 60;
      
      if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
      }
      return `${seconds}s`;
    } catch (e) {
      return 'N/A';
    }
  };

  // Helper to format ISO timestamp to readable HH:MM:SS
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) {
      return 'N/A';
    }
  };

  // Manual Resolve Alert call to backend REST API: PATCH /api/alerts/{id}/resolve
  const handleResolveAlert = async (alertId: string) => {
    setResolvingAlertId(alertId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/alerts/${alertId}/resolve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        throw new Error('Failed to resolve alert on the server.');
      }

      // Optimistically update store
      resolveAlert(alertId);

    } catch (err: any) {
      console.error(err);
      alert(`Error resolving alert: ${err.message || 'Server unresponsive'}`);
    } finally {
      setResolvingAlertId(null);
    }
  };

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'red';
      case 'high': return 'amber';
      case 'medium': return 'cyan';
      default: return 'gray';
    }
  };

  const getAlertIcon = (type: string, severity: string) => {
    const isCritical = severity.toLowerCase() === 'critical' || severity.toLowerCase() === 'high';
    if (type === 'unusual_activity' || type === 'emergency_incident') {
      return <AlertTriangle size={15} className={isCritical ? 'text-cyber-danger animate-pulse' : 'text-cyber-warning'} />;
    }
    return <Bell size={15} className="text-cyber-primary" />;
  };

  return (
    <div className="flex flex-col h-full max-h-full overflow-hidden select-none bg-cyber-bg">
      {/* Tactical HUD Header */}
      <div className="bg-cyber-card border-b border-cyber-border py-3 px-6 flex justify-between items-center shrink-0 shadow-sm relative z-10">
        <div className="flex items-center gap-2.5">
          <Bell className="h-5 w-5 text-cyber-primary animate-pulse" />
          <div>
            <h1 className="font-orbitron font-extrabold text-sm tracking-wider uppercase text-cyber-text">
              Command Dispatch & Alert Center
            </h1>
            <p className="text-[10px] font-mono text-cyber-muted tracking-widest uppercase">
              Real-time threat monitoring, AI Advisory check, and incident history audit log
            </p>
          </div>
        </div>
        
        {/* Status ribbon */}
        <div className="flex items-center gap-4 font-mono text-[10px]">
          <div className="flex items-center gap-1.5">
            <span className="glow-dot bg-cyber-danger"></span>
            <span className="text-cyber-text uppercase font-bold">{activeAlerts.length} Active Alerts</span>
          </div>
          <div className="h-4 border-r border-cyber-border/80"></div>
          <div className="flex items-center gap-1.5">
            <CheckCircle size={10} className="text-cyber-success" />
            <span className="text-cyber-muted uppercase">{resolvedAlerts.length} Resolved Incidents</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Split column layout (Active alerts left, resolved history right) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 p-5 min-h-0 overflow-y-auto lg:overflow-hidden">
        
        {/* Left Column: Active Alerts and their corresponding AI suggestions (7 cols) */}
        <div className="lg:col-span-7 h-full flex flex-col min-h-0 overflow-hidden">
          <Card 
            title="Active Operational Threats" 
            subtitle="Live feeds requiring commander intervention"
            className="flex-1 flex flex-col min-h-0 overflow-hidden"
          >
            {activeAlerts.length === 0 ? (
              // Empty clean state
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center font-mono">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.02),transparent_60%)] pointer-events-none"></div>
                <div className="h-16 w-16 rounded-full bg-cyber-success/5 flex items-center justify-center border border-cyber-success/20 shadow-glow-success relative">
                  <span className="absolute inset-0 rounded-full border border-cyber-success animate-ping opacity-25"></span>
                  <Check size={28} className="text-cyber-success" />
                </div>
                <h3 className="font-orbitron font-extrabold text-xs tracking-wider uppercase text-cyber-success mt-4">
                  all sectors clear
                </h3>
                <p className="text-[10px] text-cyber-muted uppercase tracking-wider mt-1.5 max-w-sm">
                  CCTV Analytics and telemetry check indicate normal crowd flows. No safety threats flagged.
                </p>
              </div>
            ) : (
              // Active Alerts List
              <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4">
                {activeAlerts.map(alert => {
                  // Find associated pending AI Recommendation
                  const rec = agentRecommendations.find(r => r.alertId === alert.id && r.status === 'pending');

                  return (
                    <div 
                      key={alert.id}
                      className={`border rounded-xl p-4 shadow-sm flex flex-col gap-3.5 transition-all bg-cyber-card ${
                        alert.severity === 'critical' 
                          ? 'border-cyber-danger/30 hover:border-cyber-danger-glow' 
                          : alert.severity === 'high' 
                            ? 'border-cyber-warning/30 hover:border-cyber-warning-glow' 
                            : 'border-cyber-border hover:border-cyber-border-glow'
                      }`}
                    >
                      {/* Alert Header */}
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex items-start gap-2.5">
                          <div className={`p-1.5 rounded-lg border mt-0.5 ${
                            alert.severity === 'critical' 
                              ? 'bg-cyber-danger/5 border-cyber-danger/25' 
                              : alert.severity === 'high' 
                                ? 'bg-cyber-warning/5 border-cyber-warning/25' 
                                : 'bg-cyber-primary/5 border-cyber-primary/25'
                          }`}>
                            {getAlertIcon(alert.alertType, alert.severity)}
                          </div>
                          
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-cyber-text font-orbitron">{alert.title}</span>
                            <span className="text-[10px] text-cyber-muted mt-0.5 leading-relaxed">{alert.description}</span>
                          </div>
                        </div>

                        {/* Badges / Meta */}
                        <div className="flex flex-col items-end gap-1.5 shrink-0 select-none font-mono text-[9px]">
                          <Badge variant={getSeverityBadgeColor(alert.severity)} className="text-[8px] uppercase">
                            {alert.severity}
                          </Badge>
                          <div className="flex items-center gap-1 text-cyber-muted mt-0.5">
                            <Radio size={9} className="text-cyber-primary animate-pulse" />
                            <span>{alert.zoneCode}</span>
                          </div>
                          <div className="flex items-center gap-1 text-cyber-muted">
                            <Clock size={9} />
                            <span>{formatTime(alert.createdAt)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Associated AI Advisory Box */}
                      {rec ? (
                        <div className="border border-cyber-primary/20 bg-cyber-primary/5 rounded-lg p-3.5 relative overflow-hidden flex flex-col gap-2.5">
                          {/* Design Accent details */}
                          <span className="absolute top-0 right-0 bg-cyber-primary/10 border-b border-l border-cyber-primary/25 px-2 py-0.5 font-mono text-[8px] text-cyber-primary uppercase tracking-wider flex items-center gap-1">
                            <Sparkles size={8} />
                            AI ADVISORY
                          </span>

                          <div className="flex items-start gap-2">
                            <Cpu size={14} className="text-cyber-primary mt-0.5 shrink-0" />
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-mono font-bold text-cyber-primary uppercase tracking-wider">AI Operations Suggestion:</span>
                              <span className="text-[10px] font-sans text-cyber-text/90 leading-relaxed font-bold">{rec.recommendation}</span>
                              {rec.reasoning && (
                                <span className="text-[9px] font-mono text-cyber-muted mt-1 leading-normal italic">
                                  Reasoning: {rec.reasoning}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Action Checklist */}
                          {rec.suggestedActions && rec.suggestedActions.length > 0 && (
                            <div className="border-t border-cyber-primary/10 pt-2 flex flex-col gap-1.5">
                              <span className="text-[8px] font-mono text-cyber-muted uppercase tracking-widest font-bold">Suggested Actions Checklist:</span>
                              <div className="flex flex-col gap-1.5 pl-1">
                                {rec.suggestedActions.map((action, idx) => (
                                  <div key={idx} className="flex items-start gap-2 text-[9px] font-mono text-cyber-text/80">
                                    <span className="text-cyber-primary text-[8px] mt-0.5">•</span>
                                    <span>{action}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* AI Action buttons */}
                          <div className="flex gap-2.5 border-t border-cyber-primary/10 pt-3 mt-1 select-none">
                            <button
                              onClick={() => approveRecommendation(rec.id)}
                              className="bg-cyber-primary text-white font-orbitron text-[10px] font-bold uppercase px-3 py-1.5 rounded hover:bg-cyber-primary/95 transition-all shadow-glow active:scale-[0.97] cursor-pointer flex items-center gap-1"
                            >
                              <CheckCircle size={10} />
                              <span>Approve & Dispatch</span>
                            </button>
                            <button
                              onClick={() => rejectRecommendation(rec.id)}
                              className="border border-cyber-border hover:border-cyber-border-glow bg-cyber-bg hover:bg-cyber-border/10 text-cyber-muted hover:text-cyber-text font-orbitron text-[10px] font-bold uppercase px-3 py-1.5 rounded transition-all active:scale-[0.97] cursor-pointer flex items-center gap-1"
                            >
                              <XCircle size={10} />
                              <span>Dismiss</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        // Standard active alert - no AI action pending
                        <div className="flex justify-between items-center border-t border-cyber-border/30 pt-2.5 select-none">
                          <span className="text-[9px] font-mono text-cyber-muted italic flex items-center gap-1.5">
                            <Clock size={10} className="animate-spin" style={{ animationDuration: '3s' }} />
                            Awaiting operational diagnostics or resolving...
                          </span>
                          
                          <button
                            onClick={() => handleResolveAlert(alert.id)}
                            disabled={resolvingAlertId === alert.id}
                            className="border border-cyber-success/35 hover:border-transparent bg-cyber-success/5 hover:bg-cyber-success text-cyber-success hover:text-white font-orbitron text-[9px] font-bold uppercase px-3 py-1 rounded transition-all active:scale-[0.95] cursor-pointer flex items-center gap-1"
                          >
                            <Check size={9} />
                            <span>{resolvingAlertId === alert.id ? 'RESOLVING...' : 'MARK RESOLVED'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Historical Audit log timeline (5 cols) */}
        <div className="lg:col-span-5 h-full flex flex-col min-h-0 overflow-hidden">
          <Card 
            title="Incident Audit Logs" 
            subtitle="Archive registry of resolved stadium events"
            className="flex-1 flex flex-col min-h-0 overflow-hidden"
          >
            {/* Search and Filters panel */}
            <div className="border border-cyber-border/60 bg-cyber-bg/40 p-3 rounded-xl mb-4 flex flex-col gap-2 shrink-0 select-none">
              {/* Search bar */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-cyber-muted" />
                <input
                  type="text"
                  placeholder="Search logs by Sector or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-cyber-card border border-cyber-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-cyber-text placeholder-cyber-muted focus:outline-none focus:border-cyber-primary/75"
                />
              </div>

              {/* Filters dropdown grid */}
              <div className="grid grid-cols-2 gap-2 mt-0.5">
                {/* Severity filter */}
                <div>
                  <label className="text-[8px] font-mono text-cyber-muted uppercase block mb-0.5">Severity</label>
                  <select
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value)}
                    className="w-full bg-cyber-card border border-cyber-border rounded px-2 py-1 text-[10px] font-mono text-cyber-text focus:outline-none focus:border-cyber-primary"
                  >
                    <option value="ALL">ALL SEVERITIES</option>
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>

                {/* Alert Type filter */}
                <div>
                  <label className="text-[8px] font-mono text-cyber-muted uppercase block mb-0.5">Alert Type</label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full bg-cyber-card border border-cyber-border rounded px-2 py-1 text-[10px] font-mono text-cyber-text focus:outline-none focus:border-cyber-primary"
                  >
                    <option value="ALL">ALL TYPES</option>
                    <option value="congestion">CONGESTION</option>
                    <option value="stampede_risk">STAMPEDE RISK</option>
                    <option value="unusual_activity">UNUSUAL ACTIVITY</option>
                    <option value="vip_conflict">VIP CONFLICT</option>
                    <option value="route_blockage">ROUTE BLOCK</option>
                    <option value="emergency_incident">EMERGENCY</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Resolved Log Archive Feed */}
            {filteredHistory.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4 font-mono text-cyber-muted text-[10px] border border-dashed border-cyber-border rounded-xl">
                <History size={16} className="mb-2 text-cyber-muted/50" />
                <span>NO INCIDENTS MATCH CRITERIA</span>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2.5">
                {filteredHistory.map(alert => (
                  <div 
                    key={alert.id}
                    className="border border-cyber-border/45 bg-cyber-bg/10 hover:bg-cyber-bg/25 p-3 rounded-lg flex flex-col gap-1.5 transition-all"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <CheckCircle size={11} className="text-cyber-success shrink-0" />
                        <span className="text-[11px] font-bold text-cyber-text/90 font-orbitron">{alert.title}</span>
                      </div>
                      <Badge variant="gray" className="text-[7px] uppercase font-mono py-0">
                        {alert.severity}
                      </Badge>
                    </div>

                    <div className="flex justify-between items-center text-[9px] font-mono text-cyber-muted mt-1 select-none">
                      <div className="flex gap-2 items-center">
                        <span>Sector: <b className="text-cyber-text/80">{alert.zoneCode}</b></span>
                        <span className="text-cyber-border">•</span>
                        <span>Duration: <b className="text-cyber-success font-bold">{getResolutionDuration(alert.createdAt, alert.resolvedAt)}</b></span>
                      </div>
                      
                      <div className="flex gap-1.5 items-center">
                        <span>Resolved {formatTime(alert.resolvedAt || alert.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

      </div>
    </div>
  );
};

export default AlertCenterManager;
