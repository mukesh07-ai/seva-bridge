"use client";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  Heart, MapPin, Clock, Star, Activity, Pill, Bandage, Stethoscope,
  AlertCircle, CheckCircle, Loader2, Search, LogOut, User, ChevronRight,
  Calendar, IndianRupee, Shield, FileText
} from "lucide-react";
import dynamic from "next/dynamic";
import { useRealtime } from "../../context/SocketContext";
import ReportModal from "../../components/ReportModal";

const API = process.env.NEXT_PUBLIC_API_URL;

// Lazy-load map to avoid SSR issues
const BookingMap = dynamic(() => import("../../components/BookingMap"), { ssr: false, loading: () => <div className="h-64 bg-slate-100 rounded-2xl flex items-center justify-center text-sm text-slate-500">Loading map...</div> });

const SERVICE_COLORS: Record<string, string> = {
  VITALS_MONITORING:     "bg-blue-50 text-blue-700 border-blue-200",
  WOUND_CARE:            "bg-green-50 text-green-700 border-green-200",
  MEDICATION_MANAGEMENT: "bg-purple-50 text-purple-700 border-purple-200",
  ADVANCED_CARE:         "bg-rose-50 text-rose-700 border-rose-200",
};

const SERVICE_ICONS: Record<string, React.ElementType> = {
  VITALS_MONITORING:     Activity,
  WOUND_CARE:            Bandage,
  MEDICATION_MANAGEMENT: Pill,
  ADVANCED_CARE:         Stethoscope,
};

const STATUS_STYLES: Record<string, string> = {
  PENDING:     "bg-yellow-50 text-yellow-700 border-yellow-200",
  ACCEPTED:    "bg-blue-50 text-blue-700 border-blue-200",
  IN_PROGRESS: "bg-purple-50 text-purple-700 border-purple-200",
  COMPLETED:   "bg-green-50 text-green-700 border-green-200",
  CANCELLED:   "bg-red-50 text-red-700 border-red-200",
};

export default function PatientDashboard() {
  const { user, token, logout, loading } = useAuth();
  const router = useRouter();

  const [services, setServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [matches, setMatches] = useState<VolunteerMatch[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [step, setStep] = useState<"browse" | "match" | "confirm">("browse");
  const [searching, setSearching] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState("");
  const [tab, setTab] = useState<"services" | "bookings">("services");
  const [selectedReportBooking, setSelectedReportBooking] = useState<string | null>(null);

  interface Service {
    id: string; name: string; description: string; category: string; basePrice: number;
  }
  interface VolunteerMatch {
    volunteerId: string; volunteerName: string; avatar?: string;
    skillLevel: string; rating: number; distanceKm: number;
    estimatedCost: number; eta: number;
  }
  interface Booking {
    id: string; status: string; totalAmount: number; createdAt: string;
    service: { name: string; category: string };
    volunteer?: { user: { name: string } };
    patientLat?: number; patientLng?: number;
    volunteerLat?: number; volunteerLng?: number;
  }

  const headers = { Authorization: `Bearer ${token}` };

  const fetchServices = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/services`, { headers });
      setServices(data.data);
    } catch { /* silent */ }
  }, [token]);

  const fetchBookings = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/bookings`, { headers });
      setBookings(data.data);
    } catch { /* silent */ }
  }, [token]);

  // ── REALTIME: Auto-refresh data ───────────────────────────────────────────
  useRealtime("booking:update", fetchBookings);
  useRealtime("report:new", fetchBookings);

  useEffect(() => {
    if (!loading && !user) { router.push("/auth/login"); return; }
    if (!loading && user?.role !== "PATIENT") { router.push("/"); return; }
    if (user) { fetchServices(); fetchBookings(); }
  }, [user, loading, router, fetchServices, fetchBookings]);

  const getLocation = () =>
    new Promise<{ lat: number; lng: number }>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => reject(new Error("Location access denied"))
      );
    });

  const handleFindVolunteers = async (svc: Service) => {
    setSelectedService(svc);
    setLocationError("");
    setSearching(true);
    try {
      const loc = await getLocation();
      setUserLocation(loc);
      const { data } = await axios.post(`${API}/bookings/match`, {
        serviceId: svc.id, patientLat: loc.lat, patientLng: loc.lng, radiusKm: 25,
      }, { headers });
      setMatches(data.data.matches);
      setStep("match");
    } catch (err: unknown) {
      const e = err as Error;
      setLocationError(e.message || "Failed to find volunteers");
    } finally {
      setSearching(false);
    }
  };

  const handleBook = async (match: VolunteerMatch) => {
    if (!selectedService || !userLocation) return;
    setConfirming(true);
    try {
      await axios.post(`${API}/bookings`, {
        serviceId: selectedService.id,
        patientLat: userLocation.lat, patientLng: userLocation.lng,
        volunteerId: match.volunteerId,
      }, { headers });
      setStep("browse");
      setMatches([]);
      setSelectedService(null);
      setTab("bookings");
      await fetchBookings();
    } catch { /* silent */ }
    finally { setConfirming(false); }
  };

  if (loading) return (
    <div className="min-h-screen gradient-hero flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
    </div>
  );

  const activeBookings = bookings.filter((b) => ["PENDING", "ACCEPTED", "IN_PROGRESS"].includes(b.status));
  const completedBookings = bookings.filter((b) => b.status === "COMPLETED");

  return (
    <div className="min-h-screen bg-surface">
      {/* Sidebar */}
      <div className="flex h-screen">
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
                <User className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-semibold text-sm text-slate-900">{user?.name}</p>
                <p className="text-xs text-slate-500">Patient</p>
              </div>
            </div>
          </div>

          <nav className="p-4 flex-1">
            {["services", "bookings"].map((t) => (
              <button key={t} onClick={() => setTab(t as typeof tab)}
                className={`w-full text-left px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all ${
                  tab === t ? "bg-blue-600 text-white shadow-glow" : "text-slate-600 hover:bg-slate-50"
                }`}>
                {t === "services" ? "🩺 Book Services" : "📋 My Bookings"}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-slate-100">
            <button onClick={logout} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: "Active Bookings", value: activeBookings.length, icon: Clock, color: "text-blue-600 bg-blue-50" },
              { label: "Completed", value: completedBookings.length, icon: CheckCircle, color: "text-green-600 bg-green-50" },
              { label: "Total Spent", value: `₹${bookings.filter(b => b.status === "COMPLETED").reduce((s, b) => s + b.totalAmount, 0).toFixed(0)}`, icon: IndianRupee, color: "text-purple-600 bg-purple-50" },
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

          {/* ── SERVICES TAB ── */}
          {tab === "services" && step === "browse" && (
            <div className="animate-fade-in">
              <h2 className="font-display text-xl font-bold text-slate-900 mb-4">Available Services</h2>
              {locationError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">
                  <AlertCircle className="w-4 h-4" />{locationError}
                </div>
              )}
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {services.map((svc) => {
                  const Icon = SERVICE_ICONS[svc.category] || Activity;
                  return (
                    <div key={svc.id} className={`bg-white rounded-2xl p-5 border shadow-card card-hover ${SERVICE_COLORS[svc.category]} border`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${SERVICE_COLORS[svc.category]}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold bg-white/70 px-2 py-0.5 rounded-full border">
                          ₹{svc.basePrice}+
                        </span>
                      </div>
                      <h3 className="font-display font-semibold text-slate-900 mb-1">{svc.name}</h3>
                      <p className="text-xs text-slate-500 mb-4">{svc.description}</p>
                      <button onClick={() => handleFindVolunteers(svc)} disabled={searching}
                        className="w-full gradient-brand text-white text-sm font-semibold py-2.5 rounded-xl hover:opacity-90 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                        {searching ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Finding...</> : <><Search className="w-3.5 h-3.5" /> Find Volunteers</>}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── MATCH RESULTS ── */}
          {tab === "services" && step === "match" && (
            <div className="animate-fade-in">
              <div className="flex items-center gap-3 mb-6">
                <button onClick={() => setStep("browse")} className="text-sm text-blue-600 hover:underline flex items-center gap-1">← Back</button>
                <h2 className="font-display text-xl font-bold text-slate-900">
                  Volunteers near you for <span className="text-gradient">{selectedService?.name}</span>
                </h2>
              </div>

              {/* Map */}
              {userLocation && (
                <div className="h-64 mb-6 rounded-2xl overflow-hidden border border-slate-200 shadow-card">
                  <BookingMap center={[userLocation.lat, userLocation.lng]} matches={matches} />
                </div>
              )}

              {matches.length === 0 ? (
                <div className="text-center py-16 text-slate-500">
                  <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="font-medium">No volunteers found nearby</p>
                  <p className="text-sm mt-1">Try expanding the search radius or try again later.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {matches.map((m, i) => (
                    <div key={m.volunteerId} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-card flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 gradient-brand rounded-full flex items-center justify-center text-white font-bold text-lg relative">
                          {m.volunteerName[0]}
                          {i === 0 && <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[10px] px-1 rounded-full">Best</span>}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{m.volunteerName}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="flex items-center gap-1 text-xs text-slate-500"><MapPin className="w-3 h-3" />{m.distanceKm} km</span>
                            <span className="flex items-center gap-1 text-xs text-slate-500"><Clock className="w-3 h-3" />~{m.eta} min</span>
                            <span className="flex items-center gap-1 text-xs text-yellow-600"><Star className="w-3 h-3 fill-yellow-400" />{m.rating.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-display font-bold text-lg text-slate-900">₹{m.estimatedCost}</p>
                        <button onClick={() => handleBook(m)} disabled={confirming}
                          className="mt-2 gradient-brand text-white text-xs font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition-all disabled:opacity-60 flex items-center gap-1">
                          {confirming ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                          Book Now
                        </button>
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
              <h2 className="font-display text-xl font-bold text-slate-900 mb-4">My Bookings</h2>
              {bookings.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="font-medium">No bookings yet</p>
                  <button onClick={() => setTab("services")} className="mt-3 text-sm text-blue-600 hover:underline">Browse Services →</button>
                </div>
              ) : (
                <div className="space-y-3">
                  {bookings.map((b) => (
                    <div key={b.id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-card">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-slate-900">{b.service.name}</h3>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_STYLES[b.status]}`}>{b.status.replace("_", " ")}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><User className="w-3 h-3" />{b.volunteer?.user?.name || "Awaiting Volunteer"}</span>
                        <span className="flex items-center gap-1"><IndianRupee className="w-3 h-3" />₹{b.totalAmount}</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(b.createdAt).toLocaleDateString()}</span>
                        {["IN_PROGRESS", "COMPLETED"].includes(b.status) && (
                          <button 
                            onClick={() => setSelectedReportBooking(b.id)}
                            className="ml-auto flex items-center gap-1 text-blue-600 hover:underline font-bold"
                          >
                            <FileText className="w-3 h-3" /> View Report
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

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
        </main>
      </div>
    </div>
  );
}
