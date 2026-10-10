import { Navigate, Outlet } from "react-router";

import { useAuthStore } from "@/lib/auth-store";
import type { User } from "@/lib/types";

// อนุญาตให้เข้าหน้าย่อยเฉพาะผู้ใช้ตามบทบาทที่กำหนด
export default function RequireRole({ role }: { role: User["role"] }) {
  const currentRole = useAuthStore((s) => s.role);
  if (currentRole !== role) return <Navigate to="/" replace />;
  return <Outlet />;
}
