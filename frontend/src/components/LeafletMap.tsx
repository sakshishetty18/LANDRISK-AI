import { MapContainer, TileLayer, Marker, Polygon, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";
import type { LandParcel, MapProject } from "../services/api";

const RISK_COLOR: Record<string, string> = {
  LOW: "#22c55e",
  MEDIUM: "#f59e0b",
  HIGH: "#f97316",
  CRITICAL: "#ef4444",
  UNSCORED: "#64748b",
};

function riskIcon(category: string) {
  const color = RISK_COLOR[category] || RISK_COLOR.UNSCORED;
  return L.divIcon({
    className: "leaflet-risk-marker",
    html: `<span class="leaflet-risk-dot" style="--marker-color:${color}"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -8],
  });
}

function FitBounds({ points, parcels }: { points: MapProject[]; parcels: LandParcel[] }) {
  const map = useMap();
  useEffect(() => {
    const locations: [number, number][] = points.map((point) => [point.latitude, point.longitude]);
    for (const parcel of parcels) {
      const ring = parcel.geometry?.coordinates[0] || [];
      locations.push(...ring.map(([longitude, latitude]) => [latitude, longitude] as [number, number]));
    }
    if (locations.length === 0) return;
    const bounds = L.latLngBounds(locations);
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 8 });
  }, [points, parcels, map]);
  return null;
}

export function LeafletMap({
  points,
  parcels = [],
  onSelect,
  onSelectParcel,
  height,
}: {
  points: MapProject[];
  parcels?: LandParcel[];
  onSelect?: (projectId: string) => void;
  onSelectParcel?: (parcelId: string) => void;
  height?: string | number;
}) {
  return (
    <MapContainer
      center={[22.5, 80]}
      zoom={5}
      style={{ height: height ?? "100%", width: "100%", background: "#080e1d" }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds points={points} parcels={parcels} />
      {parcels.filter(parcel => parcel.geometry?.type === "Polygon").map(parcel => (
        <Polygon
          key={parcel.parcel_id}
          positions={parcel.geometry!.coordinates[0].map(([longitude, latitude]) => [latitude, longitude] as [number, number])}
          pathOptions={{ color: parcel.acquisition_status === "ACQUIRED" ? "#168449" : "#1a4c96", weight: 2, fillOpacity: 0.18 }}
          eventHandlers={{ click: () => onSelectParcel?.(parcel.parcel_id) }}
        >
          <Popup>
            <div className="leaflet-popup-body">
              <strong>{parcel.parcel_id}</strong>
              <div>Project: {parcel.project_id}</div>
              <div>Survey: {parcel.survey_number}</div>
              <div>{parcel.village}, {parcel.district}</div>
              <div>Area: {parcel.area_hectares} ha</div>
              <div>Acquisition: {parcel.acquisition_status}</div>
              <button className="text-button" onClick={() => onSelectParcel?.(parcel.parcel_id)}>View parcel details</button>
            </div>
          </Popup>
        </Polygon>
      ))}
      {points.map((p) => (
        <Marker key={p.project_id} position={[p.latitude, p.longitude]} icon={riskIcon(p.risk_category)}>
          <Popup>
            <div className="leaflet-popup-body">
              <strong>{p.project_name}</strong>
              <div>{p.project_id}</div>
              <div>{p.district}, {p.state}</div>
              <div>Stage: {p.current_stage}</div>
              {p.risk_score !== null && (
                <>
                  <div>Risk: {p.risk_category} ({p.risk_score}/100)</div>
                  <div>Delay probability: {((p.probability_of_delay ?? 0) * 100).toFixed(1)}%</div>
                  <div>Expected delay: {p.expected_delay_days?.toFixed(0)} days</div>
                </>
              )}
              {onSelect && (
                <button className="text-button" onClick={() => onSelect(p.project_id)}>
                  Open project intelligence →
                </button>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
