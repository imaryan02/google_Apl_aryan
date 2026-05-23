import React, { useState, useRef, useEffect } from 'react';
import { useDashboardStore } from '../../../shared/store/dashboardStore';
import { Button } from '../../../shared/components/Button';
import { 
  Send, 
  Terminal, 
  ArrowRight, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  MapPin, 
  User, 
  Cpu,
  HelpCircle
} from 'lucide-react';
import { Badge } from '../../../shared/components/Badge';
import { API_BASE_URL } from '../../../shared/config/api';

interface CopilotAction {
  type: string;
  route_name?: string | null;
  route_status?: string | null;
  zone_code?: string | null;
  alert_id?: string | null;
  emergency_active?: boolean | null;
}

interface Message {
  id: string;
  sender: 'user' | 'copilot';
  text: string;
  timestamp: string;
  actionExecuted?: {
    type: string;
    details: string;
  } | null;
  pathResult?: any;
}

export const AICopilotManager: React.FC = () => {
  const { 
    routes, 
    emergencyMode, 
    toggleEmergencyMode, 
    updateRouteStatus, 
    resolveAlert,
    alerts
  } = useDashboardStore();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'copilot',
      text: 'Apex Coliseum AI Tactical Copilot active. I have loaded live metrics for all sectors, active threats, and egress corridors. How can I assist your team?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Suggested Prompts
  const suggestedPrompts = [
    { text: 'Evaluate Sector D congestions', query: 'Evaluate Sector D congestions' },
    { text: 'Open Route R-08 Bypass', query: 'unblock Route R-08' },
    { text: 'Calculate Dijkstra route from ZONE_D', query: 'calculate path from ZONE_D' },
    { text: 'Activate global emergency mode', query: 'trigger emergency evacuation alert' },
  ];

  const executeSystemAction = async (action: CopilotAction): Promise<{ type: string; details: string } | null> => {
    const { type, route_name, route_status, alert_id, emergency_active } = action;
    
    if (type === 'update_route' && route_name && route_status) {
      const route = routes.find(r => r.name.toLowerCase() === route_name.toLowerCase());
      if (route) {
        updateRouteStatus(route.id, route_status as any);
        return {
          type: 'Route Status Override',
          details: `Route [${route.name}] has been set to [${route_status.toUpperCase()}].`
        };
      } else {
        return {
          type: 'Action Failed',
          details: `Route "${route_name}" could not be identified in current stadium network.`
        };
      }
    }

    if (type === 'emergency' && emergency_active !== undefined && emergency_active !== null) {
      if (emergencyMode !== emergency_active) {
        toggleEmergencyMode();
        return {
          type: 'Emergency Override Signal',
          details: `Stadium-wide evacuation state set to [${emergency_active ? 'ACTIVE' : 'INACTIVE'}]. All egress tunnels cleared.`
        };
      }
      return {
        type: 'State Unchanged',
        details: `Emergency mode is already set to ${emergency_active ? 'ACTIVE' : 'INACTIVE'}.`
      };
    }

    if (type === 'resolve_alert' && alert_id) {
      const targetAlert = alerts.find(a => a.id === alert_id || a.id.slice(0, 8) === alert_id || (alert_id === 'a1' && a.id === 'a1') || (alert_id === 'a2' && a.id === 'a2'));
      if (targetAlert) {
        try {
          await fetch(`${API_BASE_URL}/api/alerts/${targetAlert.id}/resolve`, {
            method: 'PATCH'
          });
          resolveAlert(targetAlert.id);
          return {
            type: 'Alert Resolved',
            details: `Alert [${targetAlert.title}] in Sector ${targetAlert.zoneCode} was successfully resolved on main console.`
          };
        } catch (e) {
          resolveAlert(targetAlert.id);
          return {
            type: 'Alert Resolved (Offline)',
            details: `Alert [${targetAlert.title}] resolved locally.`
          };
        }
      }
      return {
        type: 'Action Failed',
        details: `Alert "${alert_id}" not found or already resolved.`
      };
    }

    return null;
  };

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: textToSend })
      });

      if (!response.ok) {
        throw new Error('AI Copilot service did not respond.');
      }

      const data = await response.json();
      const action = data.action as CopilotAction;
      
      let actionDetails: { type: string; details: string } | null = null;
      let pathResult: any = null;

      if (action && action.type !== 'none') {
        actionDetails = await executeSystemAction(action);

        if (action.type === 'route_suggest' && action.zone_code) {
          try {
            const routeRes = await fetch(`${API_BASE_URL}/api/routes/suggest`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                from_zone_code: action.zone_code,
                to_location: null,
                emergency_mode: emergencyMode
              })
            });
            if (routeRes.ok) {
              pathResult = await routeRes.json();
            }
          } catch (e) {
            console.error("Failed to query pathfinder engine:", e);
          }
        }
      }

      const copilotMsg: Message = {
        id: `copilot-${Date.now()}`,
        sender: 'copilot',
        text: data.response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        actionExecuted: actionDetails,
        pathResult: pathResult
      };

      setMessages(prev => [...prev, copilotMsg]);
    } catch (err: any) {
      console.error(err);
      const errorMsg: Message = {
        id: `error-${Date.now()}`,
        sender: 'copilot',
        text: `Tactical Interface Error: Could not connect to the Gemini backend service. Please verify server connection.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-h-full overflow-hidden select-none bg-cyber-bg">
      
      {/* HUD Header */}
      <div className="bg-cyber-card border-b border-cyber-border py-3 px-6 flex justify-between items-center shrink-0 shadow-sm relative z-10">
        <div className="flex items-center gap-2.5">
          <Terminal className="h-5 w-5 text-cyber-primary animate-pulse" />
          <div>
            <h1 className="font-orbitron font-extrabold text-sm tracking-wider uppercase text-cyber-text">
              Tactical AI Command Copilot
            </h1>
            <p className="text-[10px] font-mono text-cyber-muted tracking-widest uppercase">
              Natural Language Action Routing Engine & Network Orchestrator
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 font-mono text-[9px]">
          <span className="glow-dot bg-cyber-success"></span>
          <span className="text-cyber-text uppercase font-bold">Agent Online</span>
          <span className="text-cyber-muted">•</span>
          <span className="text-cyber-muted font-bold">Gemini 2.5 Flash</span>
        </div>
      </div>

      {/* Main Terminal Interface */}
      <div className="flex-1 flex flex-col min-h-0 p-5 gap-4 overflow-hidden relative">
        
        {/* Hacker Console Log Grid */}
        <div className="flex-1 overflow-y-auto bg-cyber-card/65 border border-cyber-border rounded-xl p-4 flex flex-col gap-4 font-mono text-xs shadow-inner relative">
          
          {/* Subtle grid pattern background */}
          <div className="absolute inset-0 bg-cyber-grid bg-[size:20px_20px] opacity-15 pointer-events-none"></div>
          
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex gap-3 max-w-[85%] relative z-10 ${
                msg.sender === 'user' ? 'self-end flex-row-reverse' : 'self-start'
              }`}
            >
              {/* Avatar Icon */}
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border ${
                msg.sender === 'user'
                  ? 'bg-cyber-secondary/15 border-cyber-secondary/30 text-cyber-secondary'
                  : 'bg-cyber-primary/10 border-cyber-primary/30 text-cyber-primary shadow-glow'
              }`}>
                {msg.sender === 'user' ? <User size={14} /> : <Cpu size={14} />}
              </div>

              {/* Message bubble */}
              <div className="flex flex-col gap-1.5">
                <div className={`rounded-xl p-3.5 border leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-cyber-secondary/5 border-cyber-secondary/20 text-cyber-text'
                    : 'bg-cyber-bg/75 border-cyber-border text-cyber-text/90'
                }`}>
                  <p className="whitespace-pre-line text-[11px] font-sans">{msg.text}</p>
                  
                  {/* Action executed notification block */}
                  {msg.actionExecuted && (
                    <div className="mt-3 border border-cyber-success/35 bg-cyber-success/5 p-2 rounded-lg flex items-start gap-2 text-[10px] text-cyber-success">
                      <CheckCircle2 size={13} className="shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold uppercase tracking-wider text-[9px] block">SYSTEM ACTION COMMITTED:</span>
                        <span className="font-semibold block mt-0.5">{msg.actionExecuted.type}</span>
                        <p className="text-cyber-text/75 text-[9px] mt-0.5">{msg.actionExecuted.details}</p>
                      </div>
                    </div>
                  )}

                  {/* Render dynamic Dijkstra router visualization if present */}
                  {msg.pathResult && msg.pathResult.success && (
                    <div className="mt-3 border border-cyber-primary/30 bg-cyber-primary/5 p-3 rounded-lg flex flex-col gap-2.5 font-sans">
                      <div className="flex items-center justify-between border-b border-cyber-primary/20 pb-1.5">
                        <span className="font-bold text-cyber-primary uppercase tracking-wider text-[9px] flex items-center gap-1 font-mono">
                          <MapPin size={10} />
                          Pathfinder Dynamic Egress advice
                        </span>
                        <Badge variant="cyan" className="scale-75 origin-right">DIJKSTRA</Badge>
                      </div>
                      
                      {/* Egress Path Steps */}
                      <div className="flex flex-wrap items-center gap-1.5 py-1">
                        {msg.pathResult.path.map((node: string, index: number) => (
                          <React.Fragment key={index}>
                            <span className="bg-cyber-bg border border-cyber-border px-2 py-0.5 rounded text-[10px] text-cyber-text font-bold font-mono">
                              {node}
                            </span>
                            {index < msg.pathResult.path.length - 1 && (
                              <ArrowRight size={10} className="text-cyber-muted" />
                            )}
                          </React.Fragment>
                        ))}
                      </div>

                      {/* Travel Metrics */}
                      <div className="grid grid-cols-3 gap-2 border-t border-cyber-primary/10 pt-2 font-mono text-[9px] text-cyber-muted">
                        <div className="flex items-center gap-1">
                          <Clock size={10} className="text-cyber-primary" />
                          <span>Clearance: <b>{msg.pathResult.estimated_clearance_time.toFixed(1)}m</b></span>
                        </div>
                        <div>
                          <span>Bottleneck: <b>{msg.pathResult.bottleneck_capacity} pax/m</b></span>
                        </div>
                        <div>
                          <span>Cost: <b>{msg.pathResult.total_weight.toFixed(1)}</b></span>
                        </div>
                      </div>

                      {/* Pathfinder Summary explanation */}
                      <p className="text-[9px] text-cyber-text/80 border-t border-cyber-primary/10 pt-1.5 italic leading-normal">
                        Reasoning: {msg.pathResult.reason}
                      </p>
                    </div>
                  )}

                  {msg.pathResult && !msg.pathResult.success && (
                    <div className="mt-3 border border-cyber-danger/30 bg-cyber-danger/5 p-2.5 rounded-lg flex items-start gap-2 text-[10px] text-cyber-danger">
                      <AlertCircle size={13} className="shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold uppercase tracking-wider text-[9px] block">PATH CALCULATIONS FAILED:</span>
                        <p className="mt-0.5">{msg.pathResult.reason}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Timestamp */}
                <span className={`text-[8px] font-mono text-cyber-muted px-1.5 ${
                  msg.sender === 'user' ? 'self-end' : 'self-start'
                }`}>
                  {msg.timestamp}
                </span>
              </div>
            </div>
          ))}

          {/* Loader bubble */}
          {isLoading && (
            <div className="flex gap-3 max-w-[85%] self-start relative z-10 animate-pulse">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border bg-cyber-primary/10 border-cyber-primary/30 text-cyber-primary">
                <Cpu size={14} className="animate-spin" style={{ animationDuration: '3s' }} />
              </div>
              <div className="flex flex-col gap-1">
                <div className="rounded-xl p-3 border bg-cyber-bg/75 border-cyber-border text-cyber-muted flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-cyber-primary animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="h-2 w-2 rounded-full bg-cyber-primary animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="h-2 w-2 rounded-full bg-cyber-primary animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  <span className="text-[10px] font-mono uppercase tracking-wider ml-1">Analyzing stadium node grid...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Suggested Prompts Grid */}
        <div className="shrink-0 flex flex-col gap-2">
          <span className="font-mono text-[8px] text-cyber-muted uppercase tracking-widest font-bold flex items-center gap-1">
            <HelpCircle size={10} />
            Quick Command Suggestions:
          </span>
          <div className="flex flex-wrap gap-2">
            {suggestedPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(p.query)}
                disabled={isLoading}
                className="text-[10px] font-mono border border-cyber-border hover:border-cyber-primary-glow hover:text-cyber-primary bg-cyber-card hover:bg-cyber-primary/5 py-1 px-2.5 rounded-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                {p.text}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="shrink-0 flex gap-3 relative z-10">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend(inputText);
            }}
            disabled={isLoading}
            placeholder="Type tactical command (e.g. 'unblock R-08 Bypass', 'suggest route ZONE_D', 'resolve alert a1')..."
            className="flex-1 bg-cyber-card border border-cyber-border rounded-xl px-4 py-3 text-xs font-mono text-cyber-text placeholder-cyber-muted focus:outline-none focus:border-cyber-primary/75 shadow-inner disabled:opacity-50"
          />
          <Button 
            variant="primary" 
            size="md"
            onClick={() => handleSend(inputText)}
            disabled={isLoading || !inputText.trim()}
            className="flex items-center gap-1.5 shadow-glow"
          >
            <span>Execute</span>
            <Send size={12} />
          </Button>
        </div>

      </div>

    </div>
  );
};

export default AICopilotManager;
