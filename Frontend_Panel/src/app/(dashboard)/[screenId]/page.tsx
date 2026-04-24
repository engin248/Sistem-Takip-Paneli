"use client";
import { useParams } from 'next/navigation';
import MainDashboard from '@/components/panels/MainDashboard';
import HealthDashboard from '@/components/panels/HealthDashboard';
import PlanningPanel from '@/components/panels/PlanningPanel';
import AgentPanel from '@/components/panels/AgentPanel';
import ArgePanel from '@/components/panels/ArgePanel';
import AutomationPanel from '@/components/panels/AutomationPanel';
import TaskBoard from '@/components/panels/TaskBoard';
import SystemErrorsPanel from '@/components/panels/SystemErrorsPanel';
import CommunicationHubPanel from '@/components/panels/CommunicationHubPanel';
import CoreBrainPanel from '@/components/panels/CoreBrainPanel';
import AlarmPanel from '@/components/panels/AlarmPanel';
import PersonnelPerformancePanel from '@/components/panels/PersonnelPerformancePanel';
import JobMonitorPanel from '@/components/panels/JobMonitorPanel';
import ScreenErrorBoundary from '@/components/layout/ScreenErrorBoundary';

export default function ScreenPage() {
  const params = useParams();
  const screenId = params?.screenId as string;

  const renderScreen = () => {
    switch (screenId) {
      case 'STP-00': return <MainDashboard />;
      case 'STP-01': return <HealthDashboard />;
      case 'STP-02': return <PlanningPanel />;
      case 'STP-03': return <AgentPanel />;
      case 'STP-04': return <ArgePanel />;
      case 'STP-05': return <AutomationPanel />;
      case 'STP-06': return <TaskBoard />;
      case 'STP-07': return <SystemErrorsPanel />;
      case 'STP-08': return <CommunicationHubPanel />;
      case 'STP-10': return <CoreBrainPanel />;
      case 'STP-11': return <AlarmPanel />;
      case 'STP-12': return <PersonnelPerformancePanel />;
      case 'STP-16': return <JobMonitorPanel />;
      default: return <div className="p-10 text-cyan-500 font-mono">SİSTEM MESAJI: EKRAN YAPILANDIRILIYOR... [{screenId}]</div>;
    }
  };

  return (
    <div className={screenId === 'STP-10' ? "w-full overflow-hidden h-full" : "w-full p-6"}>
      <ScreenErrorBoundary screenId={screenId}>
        {renderScreen()}
      </ScreenErrorBoundary>
    </div>
  );
}
