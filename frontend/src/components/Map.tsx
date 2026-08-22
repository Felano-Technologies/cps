

export default function Map({ className = '' }: { className?: string }) {
  // Placeholder for real Mapbox/Leaflet integration
  return (
    <div className={`map-surface ${className}`.trim()}>
      <div className="map-routes" />
    </div>
  );
}
