import { Routes, Route, Navigate } from 'react-router';
import { AppShell } from './components/AppShell';
import { CommandCenter } from './pages/CommandCenter';
import { IncidentExplorer } from './pages/IncidentExplorer';
import { InvestigationWorkspace } from './pages/InvestigationWorkspace';
import { ApprovalDesk } from './pages/ApprovalDesk';
import { AuditLedger } from './pages/AuditLedger';
import { ScenarioLab } from './pages/ScenarioLab';
import { ToastContainer } from './components/ToastContainer';

export function App() {
  return (
    <>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/command-center" replace />} />
          <Route path="command-center" element={<CommandCenter />} />
          <Route path="incidents" element={<IncidentExplorer />} />
          <Route path="investigation/:alertId" element={<InvestigationWorkspace />} />
          <Route path="approvals" element={<ApprovalDesk />} />
          <Route path="audit" element={<AuditLedger />} />
          <Route path="scenario" element={<ScenarioLab />} />
        </Route>
      </Routes>
      <ToastContainer />
    </>
  );
}

