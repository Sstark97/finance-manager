import type React from "react";
import { palette } from "@/lib/theme";

export interface OnboardingCardProps {
  title: string;
  description: string;
  ctaLabel: string;
  onConfirm: () => void;
  className?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export function OnboardingCard({ title, description, ctaLabel, onConfirm, className, footer, children }: OnboardingCardProps): React.JSX.Element {
  const footerStyle: React.CSSProperties = footer
    ? { display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10, marginTop:16, paddingTop:16, borderTop:`1px solid ${palette.line}` }
    : { display:"flex", justifyContent:"flex-end", paddingTop:16, borderTop:`1px solid ${palette.line}` };

  return (
    <div className={`card span-full${className ? ` ${className}` : ""}`}>
      <div className="eyebrow" style={{ marginBottom:6 }}>{title}</div>
      <p style={{ margin:"0 0 16px", fontSize:12.5, color:palette.sub, lineHeight:1.5 }}>{description}</p>
      {children}
      <div style={footerStyle}>
        {footer}
        <button className="seg on" onClick={onConfirm}>{ctaLabel}</button>
      </div>
    </div>
  );
}
