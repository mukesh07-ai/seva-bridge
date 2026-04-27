"use client";
import Link from "next/link";
import { useAuth } from "./context/AuthContext";
import { Heart, MapPin, Shield, Star, Clock, Users, ArrowRight, CheckCircle, Stethoscope, Activity, Pill, Bandage } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const stats = [
  { label: "Active Volunteers", value: "2,400+", icon: Users },
  { label: "Patients Served", value: "18,000+", icon: Heart },
  { label: "Cities Covered", value: "120+", icon: MapPin },
  { label: "Avg. Response Time", value: "< 15 min", icon: Clock },
];

const services = [
  { icon: Activity, title: "Vitals Monitoring", desc: "BP, SpO₂, Sugar — Level 1", color: "bg-blue-50 text-blue-600", level: "L1" },
  { icon: Bandage, title: "Wound Care", desc: "Sterile dressing & suture care — Level 2", color: "bg-green-50 text-green-600", level: "L2" },
  { icon: Pill, title: "Medication Mgmt", desc: "Oral/IV medication support — Level 3", color: "bg-purple-50 text-purple-600", level: "L3" },
  { icon: Stethoscope, title: "Advanced Care", desc: "Catheter, NGT & specialised care — Level 4", color: "bg-rose-50 text-rose-600", level: "L4" },
];

const steps = [
  { step: "01", title: "Book a Service", desc: "Select the care you need and share your location." },
  { step: "02", title: "Get Matched", desc: "Our GPS engine finds the 5 closest verified volunteers." },
  { step: "03", title: "Receive Care", desc: "Volunteer arrives, provides care, uploads health report." },
  { step: "04", title: "Pay Securely", desc: "Pay only after the session — cash, UPI, or card." },
];

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      if (user.role === "PATIENT") router.push("/dashboard/patient");
      else if (user.role === "VOLUNTEER") router.push("/dashboard/volunteer");
      else if (user.role === "ADMIN") router.push("/dashboard/admin");
    }
  }, [user, loading, router]);

  return (
    <main className="min-h-screen">
      {/* ── Navbar ── */}
      <nav className="glass sticky top-0 z-50 border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 gradient-brand rounded-lg flex items-center justify-center">
              <Heart className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-xl text-gradient">Seva-Bridge</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors px-4 py-2">
              Sign In
            </Link>
            <Link href="/auth/register" className="gradient-brand text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="gradient-hero pt-20 pb-28 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold px-4 py-1.5 rounded-full mb-6 animate-fade-in">
            <Shield className="w-3.5 h-3.5" />
            Verified Medical Volunteers — Background Checked
          </div>
          <h1 className="font-display text-5xl sm:text-6xl font-bold text-slate-900 leading-tight mb-6 animate-slide-up">
            Post-Discharge Care,<br />
            <span className="text-gradient">Right at Your Door</span>
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed animate-slide-up">
            Seva-Bridge connects recovering patients with qualified medical students and volunteers for safe, affordable home healthcare — powered by real-time GPS matching.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up">
            <Link href="/auth/register?role=PATIENT"
              className="gradient-brand text-white font-semibold px-8 py-4 rounded-2xl hover:opacity-90 transition-all hover:shadow-glow flex items-center justify-center gap-2">
              Book Care Now <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/auth/register?role=VOLUNTEER"
              className="bg-white border-2 border-blue-200 text-blue-700 font-semibold px-8 py-4 rounded-2xl hover:border-blue-400 hover:bg-blue-50 transition-all flex items-center justify-center gap-2">
              Become a Volunteer <Heart className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="max-w-7xl mx-auto px-4 -mt-12 mb-20">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-white rounded-2xl p-6 shadow-card-lg border border-slate-100 card-hover text-center">
              <Icon className="w-6 h-6 text-blue-500 mx-auto mb-3" />
              <div className="font-display text-2xl font-bold text-slate-900">{value}</div>
              <div className="text-sm text-slate-500 mt-1">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Services ── */}
      <section className="max-w-7xl mx-auto px-4 mb-24">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl font-bold text-slate-900 mb-3">Skill-Matched Services</h2>
          <p className="text-slate-500">Every task is matched to a volunteer's verified skill level</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map(({ icon: Icon, title, desc, color, level }) => (
            <div key={title} className="bg-white rounded-2xl p-6 shadow-card border border-slate-100 card-hover">
              <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center mb-4`}>
                <Icon className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{level}</span>
              <h3 className="font-display font-semibold text-slate-900 mt-3 mb-1">{title}</h3>
              <p className="text-sm text-slate-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it Works ── */}
      <section className="bg-gradient-to-br from-slate-900 to-blue-950 py-24 px-4 mb-24">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl font-bold text-white mb-3">How Seva-Bridge Works</h2>
            <p className="text-blue-200">Care delivered in four simple steps</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map(({ step, title, desc }) => (
              <div key={step} className="text-center">
                <div className="w-14 h-14 gradient-brand rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-glow">
                  <span className="font-display font-bold text-white text-lg">{step}</span>
                </div>
                <h3 className="font-display font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-blue-200 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust Section ── */}
      <section className="max-w-7xl mx-auto px-4 mb-24">
        <div className="bg-white rounded-3xl p-10 shadow-card-lg border border-slate-100">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            {[
              { icon: Shield, title: "Background Verified", desc: "Every volunteer is ID-verified and credential-checked by our admin team." },
              { icon: Star, title: "Rated & Reviewed", desc: "Post-session ratings ensure quality and accountability on every booking." },
              { icon: CheckCircle, title: "Encrypted Health Data", desc: "Vitals and health reports are stored securely with access controls." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title}>
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-display font-semibold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-slate-900 text-slate-400 py-10 px-4 text-center text-sm">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Heart className="w-4 h-4 text-blue-400" />
          <span className="font-display font-semibold text-white">Seva-Bridge</span>
        </div>
        <p>© 2025 Seva-Bridge. Post-Discharge Healthcare Platform. All rights reserved.</p>
      </footer>
    </main>
  );
}
