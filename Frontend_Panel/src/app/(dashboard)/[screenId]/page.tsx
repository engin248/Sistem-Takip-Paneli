"use client";
import { useParams } from 'next/navigation';
import MainDashboard from '@/components/panels/MainDashboard';
import HealthDashboard from '@/components/panels/HealthDashboard';
import PlanningPanel from '@/components/panels/PlanningPanel';
import AgentPanel from '@/components/panels/AgentPanel';
import ArgePanel from '@/components/panels/ArgePanel';
import AutomationPanel from '@/components/panels/AutomationPanel';
import SystemErrorsPanel from '@/components/panels/SystemErrorsPanel';
import CommunicationHubPanel from '@/components/panels/CommunicationHubPanel';
import CoreBrainPanel from '@/components/panels/CoreBrainPanel';
import JobMonitorPanel from '@/components/panels/JobMonitorPanel';
import ScreenErrorBoundary from '@/components/layout/ScreenErrorBoundary';

export default function ScreenPage() {
  const params = useParams();
  const screenId = params?.screenId as string;

  const renderScreen = () => {
    switch (screenId) {
      case 'SCR-00': return <MainDashboard />;
      case 'SCR-01': return <HealthDashboard />;
      case 'SCR-02': return <PlanningPanel />;
      case 'SCR-03': return <AgentPanel />;
      case 'SCR-04': return <ArgePanel />;
      case 'SCR-05': return <AutomationPanel />;
      case 'SCR-07': return <SystemErrorsPanel />;
      case 'SCR-08': return <CommunicationHubPanel />;
      case 'SCR-10': return <CoreBrainPanel />;
      case 'SCR-16': return <JobMonitorPanel />;
      default: return <div className="p-10 text-cyan-500 font-mono">SİSTEM MESAJI: EKRAN YAPILANDIRILIYOR... [{screenId}]</div>;
    }
  };

  return (
    <div className={screenId === 'SCR-10' ? "w-full overflow-hidden h-full" : "w-full p-6"}>
      <ScreenErrorBoundary screenId={screenId}>
        {renderScreen()}
      </ScreenErrorBoundary>
    </div>
  );
}
