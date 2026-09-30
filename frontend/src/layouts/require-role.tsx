import { Navigate, Outlet } from "react-router";

import { useAuthStore } from "@/lib/auth-store";
import type { User } from "@/lib/types";

export default function RequireRole({ role }: { role: User["role"] }) {
  const currentRole = useAuthStore((s) => s.role);
  if (currentRole !== role) return <Navigate to="/" replace />;
  return <Outlet />;
}
