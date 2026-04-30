export function SkeletonLoader() {
  return (
    <div className="app">
      <header className="app-header">
        <div className="skel" style={{ width: 260, height: 28 }} />
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <div className="skel" style={{ width: 90, height: 36, borderRadius: 6 }} />
          <div className="skel" style={{ width: 90, height: 36, borderRadius: 6 }} />
        </div>
      </header>

      <div className="dashboard-content">
        {/* KPI cards */}
        <div className="kpi-grid" style={{ marginBottom: '2rem' }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="kpi-card" style={{ gap: 0 }}>
              <div className="skel" style={{ width: '55%', height: 11, marginBottom: 10 }} />
              <div className="skel" style={{ width: '75%', height: 30, marginBottom: 8 }} />
              <div className="skel" style={{ width: '45%', height: 10 }} />
            </div>
          ))}
        </div>

        {/* Table placeholders */}
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="dashboard-card" style={{ marginBottom: '2rem' }}>
            <div className="card-header">
              <div className="skel" style={{ width: 220, height: 22 }} />
            </div>
            <div style={{ paddingTop: '1rem' }}>
              <div className="skel" style={{ height: 40, marginBottom: 6, borderRadius: 4 }} />
              {Array.from({ length: 6 }).map((_, j) => (
                <div key={j} className="skel" style={{ height: 44, marginBottom: 4, borderRadius: 4 }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
