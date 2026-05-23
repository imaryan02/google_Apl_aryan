import React, { useState, useEffect } from 'react';
import { DashboardLayout } from './shared/layouts/DashboardLayout';
import { CommandDashboard } from './features/dashboard/pages/CommandDashboard';
import { SmartRoutingManager } from './features/dashboard/components/SmartRoutingManager';
import { socketService } from './shared/services/socketService';
import { VipMovementControlDeck } from './features/dashboard/components/VipMovementControlDeck';
import { CCTVScannerManager } from './features/dashboard/components/CCTVScannerManager';
import { AlertCenterManager } from './features/dashboard/components/AlertCenterManager';
import { AICopilotManager } from './features/dashboard/components/AICopilotManager';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    // Connect to local backend, fallback dynamically if needed
    socketService.connect('http://localhost:8000');
    return () => {
      socketService.disconnect();
    };
  }, []);

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <CommandDashboard />;
      case 'routing':
        return <SmartRoutingManager />;
      case 'vip':
        return <VipMovementControlDeck />;
      case 'alerts':
        return <AlertCenterManager />;
      case 'zones':
        return <CCTVScannerManager />;
      case 'copilot':
        return <AICopilotManager />;
      default:
        return <CommandDashboard />;
    }
  };

  return (
    <DashboardLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderActiveTabContent()}
    </DashboardLayout>
  );
};

export default App;
