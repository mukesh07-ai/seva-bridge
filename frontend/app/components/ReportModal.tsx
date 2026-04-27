"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { 
  X, Activity, Pill, Bandage, Stethoscope, 
  Calendar, User, FileText, Loader2, IndianRupee,
  Activity as VitalsIcon, Thermometer, Droplets, HeartPulse
} from "lucide-react";

interface Report {
  id: string;
  bookingId: string;
  vitalsData: {
    bp?: string;
    sugar?: string;
    spo2?: string;
    temp?: string;
  };
  notes?: string;
  fileUrls: string;
  createdAt: string;
}

interface ReportModalProps {
  bookingId: string;
  onClose: () => void;
  token: string | null;
}

const API = process.env.NEXT_PUBLIC_API_URL;

export default function ReportModal({ bookingId, onClose, token }: ReportModalProps) {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const { data } = await axios.get(`${API}/reports/${bookingId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setReport(data.data);
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to load report");
      } finally {
        setLoading(false);
      }
    };

    if (bookingId && token) fetchReport();
  }, [bookingId, token]);

  const files = report?.fileUrls ? JSON.parse(report.fileUrls) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between gradient-brand text-white">
          <div>
            <h2 className="font-display text-xl font-bold">Medical Report</h2>
            <p className="text-xs opacity-70">ID: {bookingId.slice(0, 8)}...</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-surface/30">
          {loading ? (
            <div className="py-20 flex flex-col items-center gap-3 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-sm font-medium">Fetching health data...</p>
            </div>
          ) : error ? (
            <div className="py-12 text-center text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">{error}</p>
            </div>
          ) : report ? (
            <div className="space-y-6">
              {/* Vitals Grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Blood Pressure", value: report.vitalsData.bp, icon: HeartPulse, color: "text-rose-600 bg-rose-50" },
                  { label: "Blood Sugar", value: report.vitalsData.sugar, icon: Droplets, color: "text-orange-600 bg-orange-50" },
                  { label: "SpO₂", value: report.vitalsData.spo2, icon: Activity, color: "text-blue-600 bg-blue-50" },
                  { label: "Temperature", value: report.vitalsData.temp, icon: Thermometer, color: "text-amber-600 bg-amber-50" },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <div className={`w-8 h-8 ${color} rounded-lg flex items-center justify-center mb-2`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-sans">{label}</p>
                    <p className="font-display text-base font-bold text-slate-900 mt-0.5">{value || "N/A"}</p>
                  </div>
                ))}
              </div>

              {/* Notes */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-3">
                  <FileText className="w-3.5 h-3.5" /> Volunteer Notes
                </h3>
                <p className="text-sm text-slate-700 leading-relaxed italic whitespace-pre-wrap">
                  "{report.notes || "No additional notes provided."}"
                </p>
              </div>

              {/* Meta */}
              <div className="flex items-center gap-6 py-2">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Generated On</span>
                  <span className="text-xs font-medium text-slate-700">{new Date(report.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button onClick={onClose} className="px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-white transition-all shadow-sm">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
