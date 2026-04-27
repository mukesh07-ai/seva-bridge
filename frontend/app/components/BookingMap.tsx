"use client";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default icon paths
/* eslint-disable @typescript-eslint/no-explicit-any */
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const shadowUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png";

const patientIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl,
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const volunteerIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl,
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

interface VolunteerMatch {
  volunteerId: string;
  volunteerName: string;
  distanceKm: number;
  estimatedCost: number;
  eta: number;
}

interface BookingMapProps {
  center: LatLngExpression;
  matches?: VolunteerMatch[];
  volunteerPos?: LatLngExpression;
}

export default function BookingMap({ center, matches = [], volunteerPos }: BookingMapProps) {
  const centerArr = center as [number, number];

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ height: "100%", width: "100%" }}
      className="rounded-2xl"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />

      {/* Patient Marker */}
      <Marker position={center} icon={patientIcon}>
        <Popup>
          <strong>Your Location</strong><br />
          <span className="text-xs text-gray-500">Service request origin</span>
        </Popup>
      </Marker>

      {/* Search Radius: 25km */}
      <Circle
        center={center}
        radius={25000}
        pathOptions={{
          color: "#2563eb",
          fillColor: "#3b82f6",
          fillOpacity: 0.05,
          weight: 1.5,
          dashArray: "6",
        }}
      />

      {/* Volunteer Markers */}
      {matches.map((m, i) => {
        const offset = (i + 1) * 0.02;
        const angle = (i * 72 * Math.PI) / 180;
        const volPos: [number, number] = [
          centerArr[0] + offset * Math.cos(angle),
          centerArr[1] + offset * Math.sin(angle),
        ];

        return (
          <Marker key={m.volunteerId} position={volPos} icon={volunteerIcon}>
            <Popup>
              <div className="min-w-[160px]">
                <strong className="text-sm">{m.volunteerName}</strong>
                <div className="text-xs text-gray-600 mt-1">
                  <div>📍 {m.distanceKm} km away</div>
                  <div>⏱ ~{m.eta} min ETA</div>
                  <div>💰 Est. ₹{m.estimatedCost}</div>
                </div>
                {i === 0 && (
                  <span className="inline-block mt-1.5 text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                    Best Match
                  </span>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}

      {volunteerPos && (
        <Marker position={volunteerPos} icon={volunteerIcon}>
          <Popup><strong>Volunteer En Route</strong></Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
