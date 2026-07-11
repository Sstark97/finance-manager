"use client";

import React, { useEffect } from "react";
import { palette } from "@/lib/theme";

export interface AppErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AppError({ error, reset }: AppErrorProps): React.JSX.Element {
  useEffect(() => {
    console.error("Unhandled error rendering the finance app", error);
  }, [error]);

  return (
    <div style={{
      background: palette.bg, minHeight: "100vh", color: palette.ink,
      fontFamily: "system-ui,sans-serif", display: "flex", alignItems: "center",
      justifyContent: "center", padding: "clamp(16px,4vw,40px)",
    }}>
      <div style={{
        maxWidth: 420, textAlign: "center", background: palette.panel,
        border: `1px solid ${palette.line}`, borderRadius: 14, padding: 24,
      }}>
        <div style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: palette.faint, marginBottom: 10 }}>
          Algo ha ido mal
        </div>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: palette.sub, lineHeight: 1.6 }}>
          Ha ocurrido un error inesperado al cargar esta pantalla. Puedes reintentar; si el problema
          persiste, recarga la página.
        </p>
        <button
          onClick={reset}
          style={{
            background: palette.acc, color: "#06110e", border: `1px solid ${palette.acc}`,
            borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
