"use client";

import React, { useActionState, useState } from "react";
import { palette } from "@/lib/theme";
import { signInWithCredentials, signInWithGoogle } from "@/app/actions/authSession";
import { registerUser } from "@/app/actions/registerUser";
import type { AuthFormState } from "@/app/actions/AuthFormState";

type FormMode = "signIn" | "register";

const INITIAL_FORM_STATE: AuthFormState = { error: null };

export function LoginForm(): React.JSX.Element {
  const [mode, setMode] = useState<FormMode>("signIn");
  const isRegisterMode = mode === "register";
  const [state, formAction, isPending] = useActionState(isRegisterMode ? registerUser : signInWithCredentials, INITIAL_FORM_STATE);

  return (
    <div style={{ maxWidth: 360, margin: "10vh auto", padding: 24, background: palette.panel, border: `1px solid ${palette.line}`, borderRadius: 12 }}>
      <h1 style={{ margin: "0 0 20px", fontSize: 22, fontWeight: 600, color: palette.ink }}>
        {isRegisterMode ? "Crea tu cuenta" : "Inicia sesión"}
      </h1>

      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {isRegisterMode && (
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: palette.sub }}>
            Nombre
            <input type="text" name="displayName" autoComplete="name" style={inputStyle} />
          </label>
        )}

        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: palette.sub }}>
          Email
          <input type="email" name="email" autoComplete="email" required style={inputStyle} />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: palette.sub }}>
          Contraseña
          <input
            type="password"
            name="password"
            autoComplete={isRegisterMode ? "new-password" : "current-password"}
            required
            minLength={8}
            style={inputStyle}
          />
        </label>

        {state.error && (
          <p role="alert" style={{ margin: 0, color: palette.bad, fontSize: 13 }}>
            {state.error}
          </p>
        )}

        <button type="submit" disabled={isPending} style={primaryButtonStyle}>
          {isRegisterMode ? "Crear cuenta" : "Entrar"}
        </button>
      </form>

      <form action={signInWithGoogle} style={{ marginTop: 12 }}>
        <button type="submit" style={secondaryButtonStyle}>
          Entrar con Google
        </button>
      </form>

      <button
        type="button"
        onClick={() => setMode(isRegisterMode ? "signIn" : "register")}
        style={{ marginTop: 16, background: "none", border: "none", color: palette.acc, cursor: "pointer", fontSize: 13, padding: 0 }}
      >
        {isRegisterMode ? "¿Ya tienes cuenta? Inicia sesión" : "¿No tienes cuenta? Crea una"}
      </button>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 8,
  border: `1px solid ${palette.line}`,
  background: palette.panel2,
  color: palette.ink,
  fontSize: 14,
};

const primaryButtonStyle: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: 8,
  border: "none",
  background: palette.acc,
  color: palette.bg,
  fontWeight: 600,
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 16px",
  borderRadius: 8,
  border: `1px solid ${palette.line}`,
  background: "transparent",
  color: palette.ink,
  fontWeight: 600,
  cursor: "pointer",
};
