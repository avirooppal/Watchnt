import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route } from 'react-router-dom';
import '../index.css';
import Layout from './Layout';
import MeetingList from './MeetingList';
import MeetingDetail from './MeetingDetail';
import Settings from './Settings';
import Onboarding from './Onboarding';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<MeetingList />} />
          <Route path="meeting/:id" element={<MeetingDetail />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </HashRouter>
  </StrictMode>,
);
