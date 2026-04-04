import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { AmbientBackdrop } from "@/components/AmbientBackdrop";
import { AppHeader } from "@/components/AppHeader";
import { PrivateRoute } from "@/components/PrivateRoute";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { SimulationRunPage } from "@/pages/SimulationRunPage";
import { ResultsPage } from "@/pages/ResultsPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { CertificatePage } from "@/pages/CertificatePage";
import { LeaderboardPage } from "@/pages/LeaderboardPage";
import { VerifyPage } from "@/pages/VerifyPage";

function Shell({ children }: { children: ReactNode }) {
  const { user } = useApp();
  return (
    <div className="relative min-h-screen">
      <AmbientBackdrop />
      {user && <AppHeader />}
      <div className={`relative ${user ? "pt-[8.75rem] print:pt-4 sm:pt-32 md:pt-36" : ""}`}>{children}</div>
    </div>
  );
}

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/verify/:id" element={<VerifyPage />} />
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
