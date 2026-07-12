import type React from "react";
import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/components/LoginForm";

export const metadata: Metadata = {
  title: "Iniciar sesión — Finanzas",
};

export default function LoginPage(): React.JSX.Element {
  return <LoginForm />;
}
