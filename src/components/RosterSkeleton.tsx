export function RosterSkeleton() {
  return (
    <div className="roster-loading" role="status" aria-live="polite">
      <span className="sr-only">Loading the athlete roster</span>
      <div className="card-grid" aria-hidden="true">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="roster-skeleton">
            <div className="skeleton-block skeleton-label" />
            <div className="skeleton-block skeleton-portrait" />
            <div className="skeleton-block skeleton-heading" />
            <div className="skeleton-block skeleton-label" />
          </div>
        ))}
      </div>
    </div>
  );
}
