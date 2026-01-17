import { BrowserRouter, Routes, Route } from "react-router-dom";

import EntryPage from "../pages/EntryPage";
import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";
import CreateSessionPage from "../pages/CreateSessionPage";
import JoinSessionPage from "../pages/JoinSessionPage";
import SessionPage from "../pages/SessionPage";
import RequireAuth from "../components/RequireAuth";
import JoinViaLink from "../pages/JoinViaLink";
import AutoJoin from "../pages/AutoJoin";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<EntryPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/join/:sessionCode" element={<JoinViaLink />} />

        <Route
  path="/auto-join"
  element={
    <RequireAuth>
      <AutoJoin />
    </RequireAuth>
  }
/>
        {/* Protected */}
        <Route
          path="/session/create"
          element={
            <RequireAuth>
              <CreateSessionPage />
            </RequireAuth>
          }
        />

        <Route
          path="/session/join"
          element={
            <RequireAuth>
              <JoinSessionPage />
            </RequireAuth>
          }
        />

        <Route
          path="/session/:id"
          element={
            <RequireAuth>
              <SessionPage />
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
