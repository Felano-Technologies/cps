import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  radius?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ width = '100%', height = '1em', radius, className = '', style }: SkeletonProps) {
  return (
    <span
      className={`skeleton ${className}`.trim()}
      style={{ width, height, borderRadius: radius, ...style }}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({ lines = 3, lastLineWidth = '60%', gap = 8 }: { lines?: number; lastLineWidth?: string; gap?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height="0.9em" width={i === lines - 1 ? lastLineWidth : '100%'} />
      ))}
    </div>
  );
}

export function SkeletonCircle({ size = 40, className = '' }: { size?: number; className?: string }) {
  return <Skeleton width={size} height={size} radius="50%" className={className} />;
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`skeleton-card ${className}`.trim()}>
      <Skeleton height={140} radius="var(--radius-md)" />
      <div style={{ marginTop: 14 }}>
        <Skeleton height="1.1em" width="70%" />
        <div style={{ marginTop: 8 }}>
          <SkeletonText lines={2} />
        </div>
      </div>
    </div>
  );
}

export function SkeletonStatCard({ className = '' }: { className?: string }) {
  return (
    <div className={`skeleton-card ${className}`.trim()}>
      <Skeleton height="0.75em" width="50%" />
      <div style={{ marginTop: 14 }}>
        <Skeleton height="2rem" width="45%" />
      </div>
    </div>
  );
}

export function SkeletonRow({ cols = 4, avatar = false }: { cols?: number; avatar?: boolean }) {
  return (
    <tr className="skeleton-row">
      {Array.from({ length: cols }).map((_, c) => (
        <td key={c}>
          {avatar && c === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <SkeletonCircle size={30} />
              <Skeleton height="0.9em" width="70%" />
            </div>
          ) : (
            <Skeleton height="0.9em" width={c === 0 ? '80%' : '55%'} />
          )}
        </td>
      ))}
    </tr>
  );
}

export function SkeletonTableRows({ rows = 5, cols = 4, avatar = false }: { rows?: number; cols?: number; avatar?: boolean }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <SkeletonRow key={r} cols={cols} avatar={avatar} />
      ))}
    </>
  );
}

export function SkeletonListItem() {
  return (
    <div className="skeleton-list-item">
      <SkeletonCircle size={36} />
      <div style={{ flex: 1 }}>
        <Skeleton height="0.9em" width="55%" />
        <div style={{ marginTop: 6 }}>
          <Skeleton height="0.78em" width="35%" />
        </div>
      </div>
    </div>
  );
}
