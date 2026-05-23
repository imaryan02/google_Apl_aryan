import React, { useState, useEffect } from 'react';
import { DashboardLayout } from './shared/layouts/DashboardLayout';
import { CommandDashboard } from './features/dashboard/pages/CommandDashboard';
import { SmartRoutingManager } from './features/dashboard/components/SmartRoutingManager';
import { socketService } from './shared/services/socketService';
import { VipMovementControlDeck } from './features/dashboard/components/VipMovementControlDeck';
import { CCTVScannerManager } from './features/dashboard/components/CCTVScannerManager';
import { AlertCenterManager } from './features/dashboard/components/AlertCenterManager';
import { AICopilotManager } from './features/dashboard/components/AICopilotManager';
import { API_BASE_URL } from './shared/config/api';
import { useDashboardStore } from './shared/store/dashboardStore';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    // Connect to local backend, fallback dynamically if needed
    socketService.connect(API_BASE_URL);

    // Fetch initial state from backend REST API
    const loadInitData = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/dashboard/init`);
        if (res.ok) {
          const data = await res.json();
          useDashboardStore.getState().setInitialState(data);
          console.log('[App] Initialized dashboard state from backend.');
        } else {
          console.warn('[App] Failed to fetch initial dashboard state. Using mockups.');
        }
      } catch (err) {
        console.error('[App] Error fetching initial dashboard state:', err);
      }
    };

    loadInitData();

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
