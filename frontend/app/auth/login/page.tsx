"use client";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Heart, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { Suspense } from "react";

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getDashboardPath = (role: string) => {
    const map: Record<string, string> = {
      ADMIN: "/dashboard/admin",
      PATIENT: "/dashboard/patient",
      VOLUNTEER: "/dashboard/volunteer",
    };
    return map[role] ?? "/dashboard/patient";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const loggedInUser = await login(form.email, form.password);
      router.push(getDashboardPath(loggedInUser.role));
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr?.response?.data?.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 gradient-brand rounded-xl flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-2xl text-gradient">Seva-Bridge</span>
          </Link>
          <h1 className="font-display text-2xl font-bold text-slate-900">Welcome back</h1>
          <p className="text-slate-500 mt-1 text-sm">Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-card-lg border border-slate-100 p-8">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-5 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="password">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm pr-11"
                  placeholder="••••••••"
                  required
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full gradient-brand text-white font-semibold py-3.5 rounded-xl hover:opacity-90 transition-all disabled:opacity-60 flex items-center justify-center gap-2 text-sm">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</> : "Sign In"}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/auth/register" className="text-blue-600 font-semibold hover:underline">Create one</Link>
          </p>

          {/* Demo credentials */}
          <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-xs font-semibold text-blue-800 mb-2">Demo Credentials</p>
            <p className="text-xs text-blue-700">Admin: <span className="font-mono">admin@sevabridge.in</span> / <span className="font-mono">Admin@1234</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
