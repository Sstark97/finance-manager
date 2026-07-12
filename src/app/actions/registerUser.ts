"use server";

import { AuthError } from "next-auth";
import { container } from "@/lib/di/ContainerDI";
import { signIn } from "@/infrastructure/auth/auth";
import { EmailAlreadyRegisteredError } from "@/features/auth/application/RegisterUser";
import { InvalidEmailFormatError } from "@/features/auth/domain/Email";
import type { AuthFormState } from "@/app/actions/AuthFormState";

export async function registerUser(_previousState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = formData.get("email");
  const password = formData.get("password");
  const displayNameField = formData.get("displayName");

  if (typeof email !== "string" || typeof password !== "string") {
    return { error: "Introduce un email y una contraseña." };
  }

  const displayName = typeof displayNameField === "string" && displayNameField.trim().length > 0 ? displayNameField : null;

  try {
    await container.registerUser().invoke({ email, password, displayName });
  } catch (error) {
    if (error instanceof EmailAlreadyRegisteredError) {
      return { error: "Ya existe una cuenta con ese email." };
    }
    if (error instanceof InvalidEmailFormatError) {
      return { error: "El email introducido no es válido." };
    }
    throw error;
  }

  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Cuenta creada. Inicia sesión con tus credenciales." };
    }
    throw error;
  }

  return { error: null };
}
