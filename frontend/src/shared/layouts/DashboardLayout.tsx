import React from 'react';
import { Sidebar } from '../components/Sidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  activeTab,
  setActiveTab
}) => {
  return (
    <div className="tactical-scanlines flex h-screen w-screen bg-cyber-bg text-cyber-text overflow-hidden font-sans">
      {/* HUD scanline grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] pointer-events-none z-40 opacity-40"></div>
      
      {/* Side navigation HUD */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main tactical operational viewport */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(24,37,66,0.15),transparent_60%)] pointer-events-none"></div>
        {children}
      </main>
    </div>
  );
};
