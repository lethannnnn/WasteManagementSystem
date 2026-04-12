interface SkeletonProps {
  width?: string
  height?: string
  borderRadius?: string
  className?: string
}

export function Skeleton({ width = '100%', height = '1rem', borderRadius = '4px', className = '' }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height, borderRadius }}
      aria-hidden="true"
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <Skeleton width="48px" height="48px" borderRadius="12px" />
      <div className="skeleton-card-body">
        <Skeleton width="60%" height="0.75rem" />
        <Skeleton width="40%" height="1.75rem" style={{ marginTop: '0.4rem' } as any} />
        <Skeleton width="50%" height="0.65rem" style={{ marginTop: '0.3rem' } as any} />
      </div>
    </div>
  )
}

export function SkeletonRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="skeleton-row">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: '1rem' }}>
          <Skeleton height="0.875rem" width={i === 0 ? '140px' : i === cols - 1 ? '80px' : '100px'} />
        </td>
      ))}
    </tr>
  )
}
