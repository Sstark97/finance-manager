import type React from "react";

export interface SectionHeaderProps {
  title: string;
}

export function SectionHeader({ title }: SectionHeaderProps): React.JSX.Element {
  return (
    <h1 id="finance-app-heading" className="disp" style={{ margin:"0 0 20px", fontSize:"clamp(24px,4.5vw,36px)", fontWeight:600, letterSpacing:"-.02em" }}>
      {title}
    </h1>
  );
}
