import type React from "react";

export function PageSkeleton(): React.JSX.Element {
  return (
    <div className="grid" style={{ gridTemplateColumns: "1fr", gap: 16 }} aria-hidden="true">
      <div className="card">
        <div className="skeleton-line" style={{ width: "35%" }} />
        <div className="skeleton-line" style={{ width: "70%", marginTop: 12 }} />
        <div className="skeleton-line" style={{ width: "55%", marginTop: 12 }} />
      </div>
      <div className="card">
        <div className="skeleton-line" style={{ width: "45%" }} />
        <div className="skeleton-line" style={{ width: "80%", marginTop: 12 }} />
        <div className="skeleton-line" style={{ width: "60%", marginTop: 12 }} />
      </div>
    </div>
  );
}
