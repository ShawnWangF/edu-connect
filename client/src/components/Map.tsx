import { useEffect, useRef } from "react";
import L from "leaflet";
import { cn } from "@/lib/utils";

export type MapPoint = {
  id: string | number;
  lat: number;
  lng: number;
  label: string;
  color?: string;
  subtitle?: string;
  meta?: string;
};

interface MapViewProps {
  className?: string;
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  points?: MapPoint[];
  onMapReady?: (map: L.Map) => void;
}

const DEFAULT_CENTER = { lat: 22.3193, lng: 114.1694 };
const DEFAULT_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const DEFAULT_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function markerHtml(point: MapPoint) {
  const color = point.color || "#ff1744";
  return `
    <div style="
      background:${color};
      width:8px;
      height:8px;
      border-radius:999px;
      border:1px solid rgba(255,255,255,.95);
      box-shadow:0 0 0 3px rgba(255,23,68,.18),0 0 12px rgba(255,23,68,.75);
    "></div>
  `;
}

function popupHtml(point: MapPoint) {
  return `
    <div style="font-size:12px;line-height:1.5;min-width:120px">
      <strong>${point.label}</strong>
    </div>
  `;
}

export function MapView({
  className,
  initialCenter = DEFAULT_CENTER,
  initialZoom = 11,
  points = [],
  onMapReady,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = L.map(mapContainer.current, {
      center: [initialCenter.lat, initialCenter.lng],
      zoom: initialZoom,
      zoomControl: true,
    });

    L.tileLayer(import.meta.env.VITE_OSM_TILE_URL || DEFAULT_TILE_URL, {
      attribution: import.meta.env.VITE_OSM_ATTRIBUTION || DEFAULT_ATTRIBUTION,
      maxZoom: 19,
    }).addTo(map);

    markerLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    onMapReady?.(map);

    return () => {
      map.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
    };
  }, [initialCenter.lat, initialCenter.lng, initialZoom, onMapReady]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = markerLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    const validPoints = points.filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
    const bounds: L.LatLngTuple[] = [];

    validPoints.forEach((point) => {
      const icon = L.divIcon({
        html: markerHtml(point),
        className: "hkeiu-map-marker",
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      L.marker([point.lat, point.lng], { icon })
        .bindPopup(popupHtml(point), { closeButton: false })
        .addTo(layer);
      bounds.push([point.lat, point.lng]);
    });

    if (bounds.length === 1) {
      map.setView(bounds[0], Math.max(initialZoom, 13));
    } else if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [36, 36], maxZoom: 14 });
    }
  }, [points, initialZoom]);

  return (
    <div className={cn("relative h-[500px] w-full overflow-hidden bg-slate-100", className)}>
      <div ref={mapContainer} className="absolute inset-0" />
      {points.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-50/70 text-sm text-slate-500">
          暫無可顯示坐標
        </div>
      )}
    </div>
  );
}
