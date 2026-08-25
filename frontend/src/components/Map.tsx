import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const defaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface GeoPoint {
  lat: number;
  lng: number;
}

export interface MapMarkerInput {
  label: string;
  address: string;
}

interface MapProps {
  className?: string;
  markers: MapMarkerInput[];
  showRoute?: boolean;
}

const geocodeCache = new globalThis.Map<string, GeoPoint | null>();

async function geocode(address: string): Promise<GeoPoint | null> {
  if (geocodeCache.has(address)) {
    return geocodeCache.get(address) ?? null;
  }
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`
    );
    const data = await res.json();
    const point: GeoPoint | null = data[0]
      ? { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
      : null;
    geocodeCache.set(address, point);
    return point;
  } catch {
    geocodeCache.set(address, null);
    return null;
  }
}

export default function Map({ className = '', markers, showRoute = false }: MapProps) {
  const [points, setPoints] = useState<Array<{ label: string; point: GeoPoint }>>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty'>('loading');

  const addressKey = useMemo(() => markers.map(m => m.address).join('|'), [markers]);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    (async () => {
      const resolved: Array<{ label: string; point: GeoPoint }> = [];
      for (const marker of markers) {
        const point = await geocode(marker.address);
        if (point) resolved.push({ label: marker.label, point });
      }
      if (!cancelled) {
        setPoints(resolved);
        setStatus(resolved.length > 0 ? 'ready' : 'empty');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [addressKey]);

  if (status === 'loading') {
    return (
      <div className={`map-surface ${className}`.trim()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '13px', fontWeight: 600 }}>
        Loading map…
      </div>
    );
  }

  if (status === 'empty') {
    return (
      <div className={`map-surface ${className}`.trim()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '13px', fontWeight: 600 }}>
        Location unavailable
      </div>
    );
  }

  const center: [number, number] = [points[0].point.lat, points[0].point.lng];

  return (
    <div className={`map-surface ${className}`.trim()}>
      <MapContainer center={center} zoom={13} scrollWheelZoom={false} style={{ width: '100%', height: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.map((p, i) => (
          <Marker key={i} position={[p.point.lat, p.point.lng]} icon={defaultIcon}>
            <Popup>{p.label}</Popup>
          </Marker>
        ))}
        {showRoute && points.length > 1 && (
          <Polyline positions={points.map(p => [p.point.lat, p.point.lng] as [number, number])} color="#078c35" weight={4} dashArray="8 8" />
        )}
      </MapContainer>
    </div>
  );
}
