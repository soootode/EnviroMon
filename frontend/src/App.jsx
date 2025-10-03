import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';

import Layout from './env-monitor-layout'; 
import Dashboard from './pages/env-monitor-dashboard';
// اصلاح در خط زیر انجام شده است
import Historical from './pages/env-monitor-historical';
import Status from './pages/status-page';
import Project from './pages/project-page';
import 'leaflet/dist/leaflet.css';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="historical" element={<Historical />} />
          <Route path="status" element={<Status />} />
          <Route path="project" element={<Project />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;