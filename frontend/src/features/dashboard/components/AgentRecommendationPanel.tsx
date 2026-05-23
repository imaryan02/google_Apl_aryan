import React from 'react';
import { useDashboardStore } from '../../../shared/store/dashboardStore';
import { Card } from '../../../shared/components/Card';
import { Badge } from '../../../shared/components/Badge';
import { Cpu, Check, X, Shield, ArrowRight } from 'lucide-react';

interface PanelProps {
  className?: string;
}

export const AgentRecommendationPanel: React.FC<PanelProps> = ({ className = '' }) => {
  const { agentRecommendations, approveRecommendation, rejectRecommendation } = useDashboardStore();
  const pendingRecommendations = agentRecommendations.filter(rec => rec.status === 'pending');

  const getAgentLabel = (agentType: string) => {
    switch (agentType) {
      case 'smart_routing':
        return 'routing agent';
      case 'vip_coordination':
        return 'vip coordination agent';
      case 'emergency_response':
        return 'emergency responder';
      case 'prediction':
        return 'safety predictor';
      default:
        return 'crowd analyzer';
    }
  };

  return (
    <Card 
      title="AI Tactical Recommendations" 
      subtitle="Google ADK Multi-Agent Advisory"
      className={`${className} flex flex-col overflow-hidden`}
    >
      <div className="flex flex-col gap-3">
        {pendingRecommendations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-cyber-muted font-mono gap-2 border border-dashed border-cyber-border/40 bg-cyber-bg/10 rounded-sm">
            <Shield className="h-7 w-7 text-cyber-primary/60 shadow-glow" />
            <span className="text-[9px] tracking-widest uppercase">SYS ADVISORY OPTIMAL</span>
            <span className="text-[8px] text-cyber-muted/60">No pending overrides required</span>
          </div>
        ) : (
          pendingRecommendations.map((rec) => (
            <div 
              key={rec.id}
              className="border border-cyber-primary/20 bg-cyber-card/80 p-3 rounded-lg relative flex flex-col gap-2.5 transition-all shadow-glow hover:border-cyber-primary/50"
            >
              {/* Agent Badge Info */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5 text-cyber-primary">
                  <Cpu size={12} className="animate-pulse" />
                  <span className="font-mono text-[9px] font-bold uppercase tracking-wider">
                    {getAgentLabel(rec.agentType)}
                  </span>
                </div>
                <Badge variant={rec.severity === 'high' ? 'red' : rec.severity === 'medium' ? 'amber' : 'cyan'} className="text-[8px] font-bold px-1.5 py-0">
                  {rec.severity} threat
                </Badge>
              </div>

              {/* Recommendation Title & Body */}
              <div className="flex flex-col gap-1">
                <h4 className="font-orbitron font-bold text-xs text-cyber-text tracking-wide uppercase leading-snug">
                  {rec.summary}
                </h4>
                <p className="text-[10px] font-sans text-cyber-text/80 leading-relaxed bg-cyber-bg/30 p-2 rounded-lg border border-cyber-border/20">
                  {rec.recommendation}
                </p>
              </div>

              {/* Reasoning Explainer */}
              <div className="flex flex-col gap-1">
                <span className="font-mono text-[8px] text-cyber-muted uppercase tracking-widest">DECISION REASONING:</span>
                <p className="text-[9px] font-sans text-cyber-muted leading-normal">
                  {rec.reasoning}
                </p>
              </div>

              {/* Proposed Checklist Actions */}
              <div className="flex flex-col gap-1">
                <span className="font-mono text-[8px] text-cyber-muted uppercase tracking-widest font-bold">PROPOSED ACTIONS:</span>
                <ul className="flex flex-col gap-1 pl-1">
                  {rec.suggestedActions.map((action, index) => (
                    <li key={index} className="flex items-start gap-1.5 text-[9px] text-cyber-text/75 font-mono">
                      <ArrowRight size={10} className="text-cyber-primary mt-0.5 shrink-0" />
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Operator Command Buttons (Human-in-the-Loop Override) */}
              <div className="flex items-center gap-2 border-t border-cyber-border/40 pt-2.5 mt-1 justify-end">
                <span className="text-[8px] font-mono text-cyber-muted mr-auto uppercase tracking-tighter">OPERATOR VERDICT REQUIRED:</span>
                <button
                  onClick={() => rejectRecommendation(rec.id)}
                  title="Reject AI suggestion"
                  className="flex items-center gap-1 bg-cyber-danger/10 border border-cyber-danger/30 hover:border-cyber-danger text-cyber-danger hover:bg-cyber-danger/25 text-[10px] font-mono px-2.5 py-1 rounded-lg transition-all focus:outline-none uppercase font-bold"
                >
                  <X size={10} />
                  <span>Reject</span>
                </button>
                
                <button
                  onClick={() => approveRecommendation(rec.id)}
                  title="Approve and execute recommendation"
                  className="flex items-center gap-1 bg-cyber-success/15 border border-cyber-success/40 hover:border-cyber-success text-cyber-success hover:bg-cyber-success/30 text-[10px] font-mono px-3 py-1 rounded-lg shadow-glow-success transition-all focus:outline-none uppercase font-bold"
                >
                  <Check size={10} />
                  <span>Approve & Execute</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};
