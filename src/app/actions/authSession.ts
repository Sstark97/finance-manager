"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/infrastructure/auth/auth";
import type { AuthFormState } from "@/app/actions/AuthFormState";

const INVALID_CREDENTIALS_MESSAGE = "Email o contraseña incorrectos.";

export async function signInWithCredentials(_previousState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = formData.get("email");
  const password = formData.get("password");
  if (typeof email !== "string" || typeof password !== "string") {
    return { error: INVALID_CREDENTIALS_MESSAGE };
  }

  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: INVALID_CREDENTIALS_MESSAGE };
    }
    throw error;
  }

  return { error: null };
}

export async function signInWithGoogle(): Promise<void> {
  await signIn("google", { redirectTo: "/" });
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
