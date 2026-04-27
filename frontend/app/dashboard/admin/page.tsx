"use client";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  Heart, Users, IndianRupee, Activity, CheckCircle, XCircle,
  Loader2, LogOut, Clock, Shield, AlertTriangle, TrendingUp,
  UserCheck, UserX, Eye, BarChart3, Settings, ExternalLink, FileText
} from "lucide-react";
import { useRealtime } from "../../context/SocketContext";
import ReportModal from "../../components/ReportModal";

const API = process.env.NEXT_PUBLIC_API_URL;

interface Analytics {
  summary: {
    totalUsers: number; totalPatients: number; totalVolunteers: number;
    verifiedVolunteers: number; totalBookings: number; activeBookings: number;
    completedBookings: number; totalRevenue: number; weeklyRevenue: number;
    pendingVerifications: number;
  };
  recentBookings: RecentBooking[];
}

interface UnverifiedVol {
  id: string; isVerified: boolean; skillLevel: string;
  qualification?: string; yearOfStudy?: number; certificationUrl?: string;
  createdAt: string;
  user: { id: string; name: string; email: string; phone?: string; avatar?: string };
}

interface RecentBooking {
  id: string; status: string; totalAmount: number; createdAt: string;
  service: { name: string };
  patient: { user: { name: string } };
  volunteer?: { user: { name: string } };
}

const STATUS_STYLES: Record<string, string> = {
  PENDING:     "bg-yellow-50 text-yellow-700 border-yellow-200",
  ACCEPTED:    "bg-blue-50 text-blue-700 border-blue-200",
  IN_PROGRESS: "bg-purple-50 text-purple-700 border-purple-200",
  COMPLETED:   "bg-green-50 text-green-700 border-green-200",
  CANCELLED:   "bg-red-50 text-red-700 border-red-200",
};

const SKILL_COLORS: Record<string, string> = {
  LEVEL_1: "bg-blue-100 text-blue-700",
  LEVEL_2: "bg-green-100 text-green-700",
  LEVEL_3: "bg-purple-100 text-purple-700",
  LEVEL_4: "bg-rose-100 text-rose-700",
};

export default function AdminDashboard() {
  const { user, token, logout, loading } = useAuth();
  const router = useRouter();

  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [unverified, setUnverified] = useState<UnverifiedVol[]>([]);
  const [tab, setTab] = useState<"overview" | "volunteers" | "bookings">("overview");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [skillLevelMap, setSkillLevelMap] = useState<Record<string, string>>({});

  const headers = { Authorization: `Bearer ${token}` };

  const [selectedReportBooking, setSelectedReportBooking] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/admin/analytics`, { headers });
      setAnalytics(data.data);
    } catch { /* silent */ }
  }, [token]);

  const fetchUnverified = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/volunteers/unverified`, { headers });
      setUnverified(data.data);
    } catch { /* silent */ }
  }, [token]);

  // ── REALTIME: Auto-refresh data ───────────────────────────────────────────
  useRealtime("platform:update", () => {
    fetchAnalytics();
    fetchUnverified();
  });

  useEffect(() => {
    if (!loading && !user) { router.push("/auth/login"); return; }
    if (!loading && user?.role !== "ADMIN") { router.push("/"); return; }
    if (user) { fetchAnalytics(); fetchUnverified(); }
  }, [user, loading, router, fetchAnalytics, fetchUnverified]);

  const handleVerify = async (id: string, approve: boolean) => {
    setProcessingId(id);
    try {
      await axios.patch(`${API}/volunteers/verify/${id}`, {
        isVerified: approve,
        skillLevel: skillLevelMap[id] || "LEVEL_1",
      }, { headers });
      await Promise.all([fetchUnverified(), fetchAnalytics()]);
    } catch { /* silent */ }
    finally { setProcessingId(null); }
  };

  if (loading || !analytics) return (
    <div className="min-h-screen gradient-hero flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
    </div>
  );

  const { summary, recentBookings } = analytics;

  const statCards = [
    { label: "Total Users", value: summary.totalUsers, icon: Users, color: "from-blue-500 to-blue-700", sub: `${summary.totalPatients} patients · ${summary.totalVolunteers} volunteers` },
    { label: "Total Revenue", value: `₹${summary.totalRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, icon: IndianRupee, color: "from-green-500 to-green-700", sub: `₹${summary.weeklyRevenue.toFixed(0)} this week` },
    { label: "Active Bookings", value: summary.activeBookings, icon: Activity, color: "from-purple-500 to-purple-700", sub: `${summary.completedBookings} completed total` },
    { label: "Pending Verifications", value: summary.pendingVerifications, icon: AlertTriangle, color: "from-amber-500 to-orange-600", sub: "Volunteers awaiting approval" },
  ];

  return (
    <div className="min-h-screen bg-surface flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 flex flex-col shadow-xl hidden lg:flex">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 gradient-brand rounded-lg flex items-center justify-center">
              <Heart className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-lg text-white">Seva-Bridge</span>
          </div>
          <span className="text-xs text-slate-500 mt-1 block">Admin Panel</span>
        </div>

        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-xl">
            <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm text-white">{user?.name}</p>
              <p className="text-xs text-slate-400">Administrator</p>
            </div>
          </div>
        </div>

        <nav className="p-4 flex-1 space-y-1">
          {[
            { id: "overview", label: "Overview", icon: BarChart3 },
            { id: "volunteers", label: "Verify Volunteers", icon: UserCheck },
            { id: "bookings", label: "Recent Bookings", icon: Clock },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id as typeof tab)}
              className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-medium transition-all ${
                tab === id
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}>
              <Icon className="w-4 h-4" />{label}
              {id === "volunteers" && summary.pendingVerifications > 0 && (
                <span className="ml-auto bg-amber-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {summary.pendingVerifications}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button onClick={logout} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-xl transition-all">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">

        {/* ── OVERVIEW TAB ── */}
        {tab === "overview" && (
          <div className="animate-fade-in">
            <div className="mb-6">
              <h1 className="font-display text-2xl font-bold text-slate-900">Platform Overview</h1>
              <p className="text-slate-500 text-sm mt-1">Real-time analytics for Seva-Bridge</p>
            </div>

            {/* Stat Cards */}
            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
              {statCards.map(({ label, value, icon: Icon, color, sub }) => (
                <div key={label} className={`bg-gradient-to-br ${color} rounded-2xl p-6 text-white shadow-card-lg`}>
                  <Icon className="w-6 h-6 opacity-80 mb-4" />
                  <div className="font-display text-3xl font-bold">{value}</div>
                  <div className="text-sm font-medium mt-1 opacity-90">{label}</div>
                  <div className="text-xs opacity-70 mt-1">{sub}</div>
                </div>
              ))}
            </div>

            {/* Platform Health */}
            <div className="grid md:grid-cols-3 gap-5 mb-8">
              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900">Verification Rate</h3>
                  <UserCheck className="w-4 h-4 text-green-500" />
                </div>
                <div className="text-3xl font-display font-bold text-slate-900 mb-1">
                  {summary.totalVolunteers > 0
                    ? Math.round((summary.verifiedVolunteers / summary.totalVolunteers) * 100) : 0}%
                </div>
                <div className="text-xs text-slate-500">{summary.verifiedVolunteers} of {summary.totalVolunteers} volunteers verified</div>
                <div className="w-full bg-slate-100 rounded-full h-2 mt-3">
                  <div className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${summary.totalVolunteers > 0 ? (summary.verifiedVolunteers / summary.totalVolunteers) * 100 : 0}%` }} />
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900">Completion Rate</h3>
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                </div>
                <div className="text-3xl font-display font-bold text-slate-900 mb-1">
                  {summary.totalBookings > 0
                    ? Math.round((summary.completedBookings / summary.totalBookings) * 100) : 0}%
                </div>
                <div className="text-xs text-slate-500">{summary.completedBookings} of {summary.totalBookings} bookings completed</div>
                <div className="w-full bg-slate-100 rounded-full h-2 mt-3">
                  <div className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${summary.totalBookings > 0 ? (summary.completedBookings / summary.totalBookings) * 100 : 0}%` }} />
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900">Weekly Revenue</h3>
                  <IndianRupee className="w-4 h-4 text-purple-500" />
                </div>
                <div className="text-3xl font-display font-bold text-slate-900 mb-1">
                  ₹{summary.weeklyRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </div>
                <div className="text-xs text-slate-500">Last 7 days revenue</div>
                <div className="flex items-center gap-1 mt-3 text-xs text-green-600">
                  <TrendingUp className="w-3 h-3" />
                  <span>Total: ₹{summary.totalRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            </div>

            {/* Recent Bookings Preview */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-display font-semibold text-slate-900">Recent Bookings</h3>
                <button onClick={() => setTab("bookings")} className="text-xs text-blue-600 hover:underline">View all →</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      {["Service", "Patient", "Volunteer", "Amount", "Status", "Date"].map((h) => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {recentBookings.slice(0, 5).map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-4 font-medium text-slate-900">{b.service.name}</td>
                        <td className="px-5 py-4 text-slate-600">{b.patient.user.name}</td>
                        <td className="px-5 py-4 text-slate-600">{b.volunteer?.user?.name || <span className="text-slate-300">—</span>}</td>
                        <td className="px-5 py-4 font-semibold text-slate-900">₹{b.totalAmount}</td>
                        <td className="px-5 py-4">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_STYLES[b.status]}`}>
                            {b.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-500 text-xs">
                          {new Date(b.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </td>
                        <td className="px-5 py-4 text-right">
                          {b.status === "COMPLETED" && (
                            <button onClick={() => setSelectedReportBooking(b.id)} className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-all" title="View Report">
                              <FileText className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Report Modal */}
            {selectedReportBooking && (
              <ReportModal
                bookingId={selectedReportBooking}
                token={token}
                onClose={() => setSelectedReportBooking(null)}
              />
            )}
          </div>
        )}

        {/* ── VOLUNTEERS VERIFICATION TAB ── */}
        {tab === "volunteers" && (
          <div className="animate-fade-in">
            <div className="mb-6">
              <h1 className="font-display text-2xl font-bold text-slate-900">Volunteer Verification</h1>
              <p className="text-slate-500 text-sm mt-1">Review and approve volunteer credentials</p>
            </div>

            {unverified.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-16 text-center">
                <CheckCircle className="w-14 h-14 text-green-400 mx-auto mb-4" />
                <h3 className="font-display font-semibold text-slate-900 text-lg mb-2">All caught up!</h3>
                <p className="text-sm text-slate-500">No volunteers pending verification right now.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {unverified.map((vol) => (
                  <div key={vol.id} className="bg-white rounded-2xl border border-amber-100 shadow-card p-6">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 gradient-brand rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0">
                          {vol.user.name[0]}
                        </div>
                        <div>
                          <h3 className="font-display font-semibold text-slate-900">{vol.user.name}</h3>
                          <p className="text-sm text-slate-500">{vol.user.email}</p>
                          {vol.user.phone && <p className="text-xs text-slate-400 mt-0.5">📞 {vol.user.phone}</p>}

                          <div className="flex flex-wrap gap-2 mt-3">
                            {vol.qualification && (
                              <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                                🎓 {vol.qualification}
                              </span>
                            )}
                            {vol.yearOfStudy && (
                              <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                                📅 Year {vol.yearOfStudy}
                              </span>
                            )}
                            <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-medium">
                              ⏳ Pending
                            </span>
                          </div>

                          {vol.certificationUrl && (
                            <a href={vol.certificationUrl} target="_blank" rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-2">
                              <ExternalLink className="w-3 h-3" /> View Certificate
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 items-end">
                        {/* Skill Level Selector */}
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Assign Skill Level</label>
                          <select
                            value={skillLevelMap[vol.id] || "LEVEL_1"}
                            onChange={(e) => setSkillLevelMap({ ...skillLevelMap, [vol.id]: e.target.value })}
                            className="text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                            <option value="LEVEL_1">Level 1 — Vitals Only</option>
                            <option value="LEVEL_2">Level 2 — + Wound Care</option>
                            <option value="LEVEL_3">Level 3 — + Medication</option>
                            <option value="LEVEL_4">Level 4 — Advanced (All)</option>
                          </select>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleVerify(vol.id, true)}
                            disabled={processingId === vol.id}
                            className="flex items-center gap-1.5 bg-green-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-green-700 transition-all disabled:opacity-50">
                            {processingId === vol.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <UserCheck className="w-3.5 h-3.5" />}
                            Approve
                          </button>
                          <button
                            onClick={() => handleVerify(vol.id, false)}
                            disabled={processingId === vol.id}
                            className="flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-200 text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-red-100 transition-all disabled:opacity-50">
                            <UserX className="w-3.5 h-3.5" /> Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── BOOKINGS TAB ── */}
        {tab === "bookings" && (
          <div className="animate-fade-in">
            <div className="mb-6">
              <h1 className="font-display text-2xl font-bold text-slate-900">All Recent Bookings</h1>
              <p className="text-slate-500 text-sm mt-1">Last 10 bookings across the platform</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      {["#", "Service", "Patient", "Volunteer", "Amount", "Status", "Date"].map((h) => (
                        <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {recentBookings.map((b, i) => (
                      <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-4 text-slate-400 text-xs font-mono">{i + 1}</td>
                        <td className="px-5 py-4 font-medium text-slate-900">{b.service.name}</td>
                        <td className="px-5 py-4 text-slate-600">{b.patient.user.name}</td>
                        <td className="px-5 py-4 text-slate-600">{b.volunteer?.user?.name || <span className="text-slate-300 text-xs">Unassigned</span>}</td>
                        <td className="px-5 py-4 font-bold text-slate-900">₹{b.totalAmount}</td>
                        <td className="px-5 py-4">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_STYLES[b.status]}`}>
                            {b.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-400 text-xs">
                          {new Date(b.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {recentBookings.length === 0 && (
                  <div className="text-center py-16 text-slate-400">
                    <Clock className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                    <p className="text-sm">No bookings found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
