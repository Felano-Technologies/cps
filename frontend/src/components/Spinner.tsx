interface SpinnerProps {
  size?: number;
  className?: string;
  dark?: boolean;
}

export function Spinner({ size = 22, className = '', dark = false }: SpinnerProps) {
  return (
    <span
      className={`spinner ${dark ? 'spinner-on-dark' : ''} ${className}`.trim()}
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    />
  );
}

export function PageLoader({ label = 'Loading…', dark = false, minHeight }: { label?: string; dark?: boolean; minHeight?: string }) {
  return (
    <div className={`page-loader ${dark ? 'page-loader-on-dark' : ''}`.trim()} style={minHeight ? { minHeight } : undefined}>
      <Spinner size={28} dark={dark} />
      <span>{label}</span>
    </div>
  );
}
