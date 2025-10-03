import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './Layout';
import Dashboard from './pages/Dashboard';
import Historical from './pages/Historical';
import Status from './pages/Status';
import Project from './pages/Project';

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