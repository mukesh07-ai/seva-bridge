"use client";
import { useState, Suspense } from "react";
import { useAuth } from "../../context/AuthContext";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Heart, Eye, EyeOff, Loader2, AlertCircle, User, Stethoscope } from "lucide-react";

function RegisterForm() {
  const { register } = useAuth();
  const searchParams = useSearchParams();
  const defaultRole = (searchParams.get("role") as "PATIENT" | "VOLUNTEER") || "PATIENT";
  const router = useRouter();

  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", role: defaultRole });
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
    if (form.password.length < 8) return setError("Password must be at least 8 characters");
    setLoading(true);
    try {
      const newUser = await register(form);
      router.push(getDashboardPath(newUser.role));
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr?.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 gradient-brand rounded-xl flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-2xl text-gradient">Seva-Bridge</span>
          </Link>
          <h1 className="font-display text-2xl font-bold text-slate-900">Create your account</h1>
          <p className="text-slate-500 mt-1 text-sm">Join the Seva-Bridge community</p>
        </div>

        <div className="bg-white rounded-3xl shadow-card-lg border border-slate-100 p-8">
          {/* Role Selector */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              { role: "PATIENT", label: "I need care", icon: User, desc: "Book home healthcare" },
              { role: "VOLUNTEER", label: "I provide care", icon: Stethoscope, desc: "Earn while helping" },
            ].map(({ role, label, icon: Icon, desc }) => (
              <button key={role} type="button"
                onClick={() => setForm({ ...form, role: role as "PATIENT" | "VOLUNTEER" })}
                className={`p-4 rounded-2xl border-2 text-left transition-all ${
                  form.role === role
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200 hover:border-blue-200"
                }`}>
                <Icon className={`w-5 h-5 mb-2 ${form.role === role ? "text-blue-600" : "text-slate-400"}`} />
                <div className={`font-semibold text-sm ${form.role === role ? "text-blue-700" : "text-slate-700"}`}>{label}</div>
                <div className="text-xs text-slate-400 mt-0.5">{desc}</div>
              </button>
            ))}
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-5 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="reg-name">Full Name</label>
              <input id="reg-name" type="text" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                placeholder="Dr. / Mr. / Ms. Full Name" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="reg-email">Email address</label>
              <input id="reg-email" type="email" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                placeholder="you@example.com" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="reg-phone">Phone Number</label>
              <input id="reg-phone" type="tel" value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                placeholder="+91 9876543210" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="reg-password">Password</label>
              <div className="relative">
                <input id="reg-password" type={showPwd ? "text" : "password"} value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm pr-11"
                  placeholder="Min. 8 characters" required />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full gradient-brand text-white font-semibold py-3.5 rounded-xl hover:opacity-90 transition-all disabled:opacity-60 flex items-center justify-center gap-2 text-sm mt-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</> : "Create Account"}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-blue-600 font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return <Suspense><RegisterForm /></Suspense>;
}
