import type React from "react";
import { palette } from "@/lib/theme";

export const SAVED_MESSAGE_DURATION_MS = 2000;

export interface SavedToastProps {
  visible: boolean;
}

export function SavedToast({ visible }: SavedToastProps): React.JSX.Element | null {
  if (!visible) return null;
  return <span style={{ fontSize:12, color:palette.acc }}>Guardado ✓</span>;
}
