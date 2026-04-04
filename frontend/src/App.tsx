import type { ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { AmbientBackdrop } from "@/components/AmbientBackdrop";
import { AppHeader } from "@/components/AppHeader";
import { PrivateRoute } from "@/components/PrivateRoute";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { SimulationBreachPage } from "@/pages/SimulationBreachPage";
import { SimulationLinkLabPage } from "@/pages/SimulationLinkLabPage";
import { SimulationRunPage } from "@/pages/SimulationRunPage";
import { ResultsPage } from "@/pages/ResultsPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { CertificatePage } from "@/pages/CertificatePage";
import { LeaderboardPage } from "@/pages/LeaderboardPage";
import { VerifyPage } from "@/pages/VerifyPage";
import { LiveSocPage } from "@/pages/LiveSocPage";

function Shell({ children }: { children: ReactNode }) {
  const { user } = useApp();
  const loc = useLocation();
  const hidePulseHeader = loc.pathname === "/live-soc" || /\/sim\/run\/[^/]+\/breach$/.test(loc.pathname);
  return (
    <div className="relative min-h-screen">
      <AmbientBackdrop />
      {user && !hidePulseHeader && <AppHeader />}
      <main className="relative min-h-[min(100dvh,100vh)] min-w-0 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] print:pb-0 print:pt-0">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/verify/:id" element={<VerifyPage />} />
        <Route path="/live-soc" element={<LiveSocPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <DashboardPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/link-lab"
          element={
            <PrivateRoute>
              <SimulationLinkLabPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/sim/run/:id/breach"
          element={
            <PrivateRoute>
              <SimulationBreachPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/sim/run/:id/link-lab"
          element={
            <PrivateRoute>
              <SimulationLinkLabPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/sim/run/:id"
          element={
            <PrivateRoute>
              <SimulationRunPage />
            </PrivateRoute>
          }
        />
        <Route path="/scenario/:id" element={<Navigate to="/dashboard" replace />} />
        <Route
          path="/results/:id"
          element={
            <PrivateRoute>
              <ResultsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <ProfilePage />
            </PrivateRoute>
          }
        />
        <Route
          path="/certificate"
          element={
            <PrivateRoute>
              <CertificatePage />
            </PrivateRoute>
          }
        />
        <Route
          path="/leaderboard"
          element={
            <PrivateRoute>
              <LeaderboardPage />
            </PrivateRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Shell>
  );
}
