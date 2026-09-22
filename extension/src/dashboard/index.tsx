import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import "../index.css";
import "../i18n";
import Actions from "./Actions";
import Layout from "./Layout";
import MeetingList from "./MeetingList";
import MeetingDetail from "./MeetingDetail";
import Settings from "./Settings";
import Onboarding from "./Onboarding";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route path="onboarding" element={<Onboarding />} />
          <Route index element={<MeetingList />} />
          <Route path="actions" element={<Actions />} />
          <Route path="meeting/:id" element={<MeetingDetail />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </HashRouter>
  </StrictMode>,
);
