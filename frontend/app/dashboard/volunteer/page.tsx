"use client";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  Heart, MapPin, Clock, Star, IndianRupee, LogOut, User,
  ToggleLeft, ToggleRight, CheckCircle, XCircle, Loader2,
  Upload, Activity, Stethoscope, AlertCircle, Wallet, Shield, FileText
} from "lucide-react";
import { useRealtime } from "../../context/SocketContext";
import ReportModal from "../../components/ReportModal";

const API = process.env.NEXT_PUBLIC_API_URL;

const LEVEL_LABELS: Record<string, { label: string; color: string; services: string[] }> = {
  LEVEL_1: { label: "Level 1 — Junior", color: "bg-blue-100 text-blue-700", services: ["Vitals Monitoring"] },
  LEVEL_2: { label: "Level 2 — Intermediate", color: "bg-green-100 text-green-700", services: ["Vitals Monitoring", "Wound Care"] },
  LEVEL_3: { label: "Level 3 — Senior", color: "bg-purple-100 text-purple-700", services: ["Vitals", "Wound Care", "Medication Mgmt"] },
  LEVEL_4: { label: "Level 4 — Advanced", color: "bg-rose-100 text-rose-700", services: ["All Services"] },
};

const STATUS_STYLES: Record<string, string> = {
  PENDING:     "bg-yellow-50 text-yellow-700 border-yellow-200",
  ACCEPTED:    "bg-blue-50 text-blue-700 border-blue-200",
  IN_PROGRESS: "bg-purple-50 text-purple-700 border-purple-200",
  COMPLETED:   "bg-green-50 text-green-700 border-green-200",
  CANCELLED:   "bg-red-50 text-red-700 border-red-200",
};

interface Booking {
  id: string; status: string; totalAmount: number; createdAt: string; distanceKm?: number;
  service: { name: string; category: string };
  patient: { user: { name: string; phone?: string } };
  patientLat?: number; patientLng?: number;
}

export default function VolunteerDashboard() {
  const { user, token, logout, loading, refreshUser } = useAuth();
  const router = useRouter();

  const [vol, setVol] = useState<{
    isOnline: boolean; isVerified: boolean; skillLevel: string;
    rating: number; totalEarnings: number;
  } | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [earnings, setEarnings] = useState<{ totalEarnings: number; completedCount: number }>({ totalEarnings: 0, completedCount: 0 });
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [tab, setTab] = useState<"requests" | "earnings">("requests");
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [vitals, setVitals] = useState({ bp: "", sugar: "", spo2: "", temp: "" });
  const [volunteerError, setVolunteerError] = useState("");
  const [selectedReportBooking, setSelectedReportBooking] = useState<string | null>(null);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchProfile = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/volunteers/me`, { headers });
      setVol({
        isOnline: data.data.isOnline,
        isVerified: data.data.isVerified,
        skillLevel: data.data.skillLevel,
        rating: data.data.rating,
        totalEarnings: data.data.totalEarnings,
      });
    } catch { /* silent */ }
  }, [token]);

  const fetchBookings = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/bookings`, { headers });
      setBookings(data.data);
    } catch { /* silent */ }
  }, [token]);

  const fetchEarnings = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/volunteers/earnings`, { headers });
      setEarnings(data.data);
    } catch { /* silent */ }
  }, [token]);

  // ── REALTIME: Auto-refresh data ───────────────────────────────────────────
  useRealtime("booking:new", fetchBookings);
  useRealtime("booking:update", fetchBookings);
  useRealtime("report:new", fetchBookings);

  useEffect(() => {
    if (!loading && !user) { router.push("/auth/login"); return; }
    if (!loading && user?.role !== "VOLUNTEER") { router.push("/"); return; }
    if (user) { fetchProfile(); fetchBookings(); fetchEarnings(); }
  }, [user, loading, router, fetchProfile, fetchBookings, fetchEarnings]);

  const handleToggleOnline = async () => {
    if (!vol) return;
    if (!vol.isVerified) { setVolunteerError("Your account must be verified by an admin before going online."); return; }
    setTogglingOnline(true);
    try {
      const newStatus = !vol.isOnline;
      let lat, lng;
      if (newStatus) {
        await new Promise<void>((res, rej) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => { lat = pos.coords.latitude; lng = pos.coords.longitude; res(); },
            () => rej(new Error("Location required to go online"))
          );
        });
      }
      await axios.patch(`${API}/volunteers/online`, { isOnline: newStatus, latitude: lat, longitude: lng }, { headers });
      setVol({ ...vol, isOnline: newStatus });
    } catch (err: unknown) {
      const e = err as Error;
      setVolunteerError(e.message || "Failed to update status");
    } finally {
      setTogglingOnline(false);
    }
  };

  const handleStatusUpdate = async (bookingId: string, newStatus: string) => {
    setUpdatingStatus(bookingId);
    try {
      await axios.patch(`${API}/bookings/${bookingId}/status`, { status: newStatus }, { headers });
      await fetchBookings();
    } catch { /* silent */ }
    finally { setUpdatingStatus(null); }
  };

  const handleUploadReport = async (bookingId: string) => {
    try {
      const formData = new FormData();
      formData.append("bookingId", bookingId);
      formData.append("vitalsData", JSON.stringify(vitals));
      formData.append("notes", "Health report submitted by volunteer");
      await axios.post(`${API}/reports/upload`, formData, { headers });
      setUploadingFor(null);
      setVitals({ bp: "", sugar: "", spo2: "", temp: "" });
      await fetchBookings();
    } catch { /* silent */ }
  };

  if (loading || !vol) return (
    <div className="min-h-screen gradient-hero flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
    </div>
  );

  const incoming = bookings.filter((b) => b.status === "PENDING");
  const active = bookings.filter((b) => ["ACCEPTED", "IN_PROGRESS"].includes(b.status));
  const levelInfo = LEVEL_LABELS[vol.skillLevel] || LEVEL_LABELS.LEVEL_1;

  return (
    <div className="min-h-screen bg-surface flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-100 flex flex-col shadow-sm hidden lg:flex">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 gradient-brand rounded-lg flex items-center justify-center">
              <Heart className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-lg text-gradient">Seva-Bridge</span>
          </div>
        </div>

        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
            <div className="w-9 h-9 gradient-brand rounded-full flex items-center justify-center">
              <Stethoscope className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm text-slate-900">{user?.name}</p>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${levelInfo.color}`}>{levelInfo.label}</span>
            </div>
          </div>
        </div>

        {/* Online Toggle */}
        <div className="p-4 border-b border-slate-100">
          <div className={`p-4 rounded-2xl ${vol.isOnline ? "bg-green-50 border border-green-200" : "bg-slate-50 border border-slate-200"}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-700">Go Online</span>
              <button onClick={handleToggleOnline} disabled={togglingOnline}
                className={`transition-all ${vol.isOnline ? "text-green-600" : "text-slate-400"} disabled:opacity-50`}>
                {togglingOnline ? <Loader2 className="w-6 h-6 animate-spin" /> : vol.isOnline ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
              </button>
            </div>
            <p className={`text-xs font-medium ${vol.isOnline ? "text-green-700" : "text-slate-500"}`}>
              {vol.isOnline ? "🟢 You are online & visible" : "⚪ You are currently offline"}
            </p>
          </div>
          {volunteerError && <p className="text-xs text-red-600 mt-2 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{volunteerError}</p>}
          {!vol.isVerified && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-2 mt-2">
              ⚠️ Account pending admin verification
            </p>
          )}
        </div>

        <nav className="p-4 flex-1">
          {["requests", "earnings"].map((t) => (
            <button key={t} onClick={() => setTab(t as typeof tab)}
              className={`w-full text-left px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all ${
                tab === t ? "bg-blue-600 text-white shadow-glow" : "text-slate-600 hover:bg-slate-50"
              }`}>
              {t === "requests" ? "📩 Requests" : "💰 Earnings"}
            </button>
          ))}
        </nav>

        {/* Stats */}
        <div className="p-4 border-t border-slate-100">
          <div className="flex gap-3 mb-3">
            <div className="flex-1 text-center bg-yellow-50 rounded-xl p-3">
              <Star className="w-4 h-4 text-yellow-500 mx-auto mb-1 fill-yellow-400" />
              <div className="font-bold text-sm text-slate-900">{vol.rating.toFixed(1)}</div>
              <div className="text-[10px] text-slate-500">Rating</div>
            </div>
            <div className="flex-1 text-center bg-green-50 rounded-xl p-3">
              <IndianRupee className="w-4 h-4 text-green-600 mx-auto mb-1" />
              <div className="font-bold text-sm text-slate-900">₹{earnings.totalEarnings.toFixed(0)}</div>
              <div className="text-[10px] text-slate-500">Earned</div>
            </div>
          </div>
          <button onClick={logout} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto p-6">
        {/* ── Skill Level Banner ── */}
        <div className={`rounded-2xl p-4 mb-6 flex items-center justify-between ${levelInfo.color} border`}>
          <div>
            <p className="font-semibold text-sm">{levelInfo.label}</p>
            <p className="text-xs mt-0.5 opacity-80">You can handle: {levelInfo.services.join(" · ")}</p>
          </div>
          <Shield className="w-6 h-6 opacity-60" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Incoming", value: incoming.length, icon: Clock, color: "text-yellow-600 bg-yellow-50" },
            { label: "Active", value: active.length, icon: Activity, color: "text-blue-600 bg-blue-50" },
            { label: "Completed", value: earnings.completedCount, icon: CheckCircle, color: "text-green-600 bg-green-50" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-2xl p-5 shadow-card border border-slate-100">
              <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="font-display text-2xl font-bold text-slate-900">{value}</div>
              <div className="text-xs text-slate-500 mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* ── REQUESTS TAB ── */}
        {tab === "requests" && (
          <div className="animate-fade-in space-y-6">
            {/* Incoming */}
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900 mb-3">Incoming Requests</h2>
              {incoming.length === 0 ? (
                <div className="bg-white rounded-2xl p-10 text-center border border-slate-100 text-slate-400">
                  <Clock className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm">{vol.isOnline ? "No new requests right now" : "Go online to receive requests"}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {incoming.map((b) => (
                    <div key={b.id} className="bg-white rounded-2xl p-5 border border-yellow-200 shadow-card">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-slate-900">{b.service.name}</h3>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                            <span className="flex items-center gap-1"><User className="w-3 h-3" />{b.patient.user.name}</span>
                            {b.distanceKm && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{b.distanceKm.toFixed(1)} km</span>}
                            <span className="flex items-center gap-1"><IndianRupee className="w-3 h-3" />₹{b.totalAmount}</span>
                          </div>
                        </div>
                        <span className="text-xs font-bold bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">NEW</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleStatusUpdate(b.id, "ACCEPTED")} disabled={updatingStatus === b.id}
                          className="flex-1 gradient-brand text-white text-xs font-semibold py-2.5 rounded-xl hover:opacity-90 transition-all disabled:opacity-60 flex items-center justify-center gap-1">
                          {updatingStatus === b.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />} Accept
                        </button>
                        <button onClick={() => handleStatusUpdate(b.id, "CANCELLED")} disabled={updatingStatus === b.id}
                          className="flex-1 bg-red-50 text-red-600 border border-red-200 text-xs font-semibold py-2.5 rounded-xl hover:bg-red-100 transition-all disabled:opacity-60 flex items-center justify-center gap-1">
                          <XCircle className="w-3 h-3" /> Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Active Bookings */}
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900 mb-3">Active Bookings</h2>
              {active.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">No active bookings</p>
              ) : (
                <div className="space-y-3">
                  {active.map((b) => (
                    <div key={b.id} className="bg-white rounded-2xl p-5 border border-blue-100 shadow-card">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-slate-900">{b.service.name}</h3>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_STYLES[b.status]}`}>{b.status.replace("_", " ")}</span>
                      </div>
                      <p className="text-xs text-slate-500 mb-3">Patient: {b.patient.user.name}</p>

                      <div className="flex gap-2 flex-wrap">
                        {b.status === "ACCEPTED" && (
                          <button onClick={() => handleStatusUpdate(b.id, "IN_PROGRESS")} disabled={updatingStatus === b.id}
                            className="gradient-brand text-white text-xs font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition-all disabled:opacity-60">
                            Start Session →
                          </button>
                        )}
                        {b.status === "IN_PROGRESS" && (
                          <>
                            <button onClick={() => setUploadingFor(b.id)}
                              className="bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold px-4 py-2 rounded-xl hover:bg-purple-100 transition-all flex items-center gap-1">
                              <Upload className="w-3 h-3" /> Upload Report
                            </button>
                            <button onClick={() => handleStatusUpdate(b.id, "COMPLETED")} disabled={updatingStatus === b.id}
                              className="bg-green-50 text-green-700 border border-green-200 text-xs font-semibold px-4 py-2 rounded-xl hover:bg-green-100 transition-all flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Mark Complete
                            </button>
                            <button onClick={() => setSelectedReportBooking(b.id)}
                              className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold px-4 py-2 rounded-xl hover:bg-blue-100 transition-all flex items-center gap-1">
                              <FileText className="w-3 h-3" /> My Report
                            </button>
                          </>
                        )}
                      </div>

                      {/* Report Upload Form */}
                      {uploadingFor === b.id && (
                        <div className="mt-4 p-4 bg-purple-50 rounded-xl border border-purple-200 animate-fade-in">
                          <h4 className="font-semibold text-sm text-purple-900 mb-3">Upload Health Report</h4>
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            {[
                              { key: "bp", label: "Blood Pressure", placeholder: "120/80 mmHg" },
                              { key: "sugar", label: "Blood Sugar", placeholder: "90 mg/dL" },
                              { key: "spo2", label: "SpO₂", placeholder: "98%" },
                              { key: "temp", label: "Temperature", placeholder: "98.6°F" },
                            ].map(({ key, label, placeholder }) => (
                              <div key={key}>
                                <label className="text-xs font-medium text-purple-800 block mb-1">{label}</label>
                                <input type="text" placeholder={placeholder}
                                  value={vitals[key as keyof typeof vitals]}
                                  onChange={(e) => setVitals({ ...vitals, [key]: e.target.value })}
                                  className="w-full px-3 py-2 text-xs rounded-lg border border-purple-200 focus:outline-none focus:ring-1 focus:ring-purple-400" />
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleUploadReport(b.id)}
                              className="gradient-brand text-white text-xs font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition-all">
                              Submit Report
                            </button>
                            <button onClick={() => setUploadingFor(null)}
                              className="bg-white text-slate-600 border border-slate-200 text-xs font-semibold px-4 py-2 rounded-xl hover:bg-slate-50 transition-all">
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── EARNINGS TAB ── */}
        {tab === "earnings" && (
          <div className="animate-fade-in">
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-8 text-white mb-6">
              <div className="flex items-center gap-3 mb-2">
                <Wallet className="w-6 h-6 opacity-80" />
                <span className="text-sm font-medium opacity-80">Total Wallet Balance</span>
              </div>
              <div className="font-display text-4xl font-bold">₹{earnings.totalEarnings.toFixed(2)}</div>
              <p className="text-sm opacity-70 mt-2">{earnings.completedCount} completed sessions</p>
            </div>

            <h3 className="font-display text-lg font-bold text-slate-900 mb-3">Earning History</h3>
            <div className="space-y-3">
              {bookings.filter(b => b.status === "COMPLETED").map((b) => (
                <div key={b.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-card flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm text-slate-900">{b.service.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{new Date(b.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                  </div>
                  <span className="font-bold text-green-700 bg-green-50 px-3 py-1.5 rounded-xl border border-green-200 text-sm">+₹{b.totalAmount}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Report Modal */}
      {selectedReportBooking && (
        <ReportModal 
          bookingId={selectedReportBooking} 
          token={token} 
          onClose={() => setSelectedReportBooking(null)} 
        />
      )}
    </div>
  );
}
