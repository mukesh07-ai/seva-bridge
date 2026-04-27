"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { Loader2 } from "lucide-react";

export default function DashboardRedirect() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/auth/login");
      return;
    }
    const map: Record<string, string> = {
      ADMIN: "/dashboard/admin",
      PATIENT: "/dashboard/patient",
      VOLUNTEER: "/dashboard/volunteer",
    };
    router.replace(map[user.role] ?? "/dashboard/patient");
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="flex flex-col items-center gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        <p className="text-sm font-medium">Redirecting to your dashboard…</p>
      </div>
    </div>
  );
}
