import type React from "react";

export interface MetricProps {
  label: string;
  value: string;
  sub: string;
}

export function Metric({ label, value, sub }: MetricProps): React.JSX.Element {
  return (
    <div>
      <div style={{ fontSize:11, fontFamily:"'DM Mono',monospace", letterSpacing:".1em", textTransform:"uppercase", color:"#5d6f78", marginBottom:6 }}>{label}</div>
      <div className="num" style={{ fontSize:22, fontWeight:600 }}>{value}</div>
      <div style={{ fontSize:12, color:"#8fa3ad", marginTop:2 }}>{sub}</div>
    </div>
  );
}
