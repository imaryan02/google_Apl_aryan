import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Route, 
  UserCheck, 
  Bell, 
  Radio, 
  ChevronLeft,
  ChevronRight,
  Camera,
  Sparkles
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Command Deck', icon: LayoutDashboard, badge: null },
    { id: 'routing', label: 'Smart Routing', icon: Route, badge: '8 Paths' },
    { id: 'vip', label: 'VIP Movement', icon: UserCheck, badge: '2 Active' },
    { id: 'alerts', label: 'Alert Center', icon: Bell, badge: '2 Act', critical: true },
    { id: 'zones', label: 'CCTV Scanner', icon: Camera, badge: '8 Cameras' },
    { id: 'copilot', label: 'AI Copilot', icon: Sparkles, badge: 'Agent' }
  ];

  return (
    <div 
      className={`h-full border-r border-white/10 bg-black/30 backdrop-blur-xl transition-all duration-300 flex flex-col ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Top Identity Block */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg border border-cyber-primary/30 bg-cyber-primary/10">
              <Radio className="h-5 w-5 text-cyber-primary" />
            </div>
            <div className="flex flex-col">
              <span className="font-orbitron font-bold text-sm tracking-wide text-cyber-text">Stadium Command</span>
              <span className="text-[9px] font-mono text-cyber-muted tracking-widest uppercase">Operations OS 1.0</span>
            </div>
          </div>
        )}
        {collapsed && (
          <Radio className="h-6 w-6 text-cyber-primary mx-auto" />
        )}
        <button 
          onClick={() => setCollapsed(!collapsed)} 
          className="text-cyber-muted hover:text-cyber-primary p-1 rounded-md focus:outline-none transition-colors border border-transparent hover:border-cyber-border"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 py-4 flex flex-col gap-1.5 px-3">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative group w-full flex items-center p-3 rounded-lg font-orbitron transition-all duration-200 select-none ${
                isActive 
                  ? 'bg-cyber-primary/14 ring-1 ring-cyber-primary/30 text-cyber-primary font-bold shadow-glow' 
                  : 'hover:bg-white/6 text-cyber-muted hover:text-cyber-text'
              }`}
            >
              <Icon className={`h-4 w-4 transition-transform duration-300 group-hover:scale-110 ${collapsed ? 'mx-auto' : 'mr-3'}`} />
              
              {!collapsed && (
                <span className="text-xs font-bold tracking-wide">{item.label}</span>
              )}

              {/* Item Badges */}
              {!collapsed && item.badge && (
                <span className={`ml-auto font-mono text-[9px] px-1.5 py-0.5 rounded-full border ${
                  item.critical 
                    ? 'bg-cyber-danger/10 border-cyber-danger text-cyber-danger animate-pulse'
                    : 'bg-white/5 border-white/10 text-cyber-muted'
                }`}>
                  {item.badge}
                </span>
              )}

              {/* Collapsed Tooltips */}
              {collapsed && (
                <div className="absolute left-16 scale-0 group-hover:scale-100 transition-all duration-200 bg-cyber-card border border-cyber-border p-2 rounded-md text-xs font-orbitron text-cyber-text shadow-glow z-50">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* System Integrity Metric Footer */}
      <div className="p-4 border-t border-white/10 flex flex-col gap-2 font-mono">
        {!collapsed ? (
          <>
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-cyber-muted uppercase">SYS ENCRYPTION</span>
              <span className="text-cyber-success font-bold text-glow-success uppercase">SECURE</span>
            </div>
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-cyber-success to-cyber-primary h-full shadow-glow-success" style={{ width: '92%' }}></div>
            </div>
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-cyber-muted uppercase">LINK INTEGRITY</span>
              <span className="text-cyber-primary font-bold text-glow uppercase">100% ONLINE</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <span className="glow-dot bg-cyber-success"></span>
            <span className="glow-dot bg-cyber-primary animate-pulse"></span>
          </div>
        )}
      </div>
    </div>
  );
};
