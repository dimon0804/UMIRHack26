import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { Spinner } from "@/components/Spinner";

export function PrivateRoute({ children }: { children: ReactNode }) {
  const { user, authHydrated } = useApp();
  const loc = useLocation();
  if (!authHydrated) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-emerald-600 dark:text-emerald-400">
        <Spinner />
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }
  return <>{children}</>;
}
