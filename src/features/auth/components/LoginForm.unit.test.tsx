// @vitest-environment jsdom
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { signInWithCredentials, signInWithGoogle } from "@/app/actions/authSession";
import { registerUser } from "@/app/actions/registerUser";

vi.mock("@/app/actions/authSession", () => ({
  signInWithCredentials: vi.fn(),
  signInWithGoogle: vi.fn(),
}));

vi.mock("@/app/actions/registerUser", () => ({
  registerUser: vi.fn(),
}));

describe("LoginForm", () => {
  it("should submit the entered email and password through signInWithCredentials", async () => {
    vi.mocked(signInWithCredentials).mockResolvedValue({ error: null });
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByRole("textbox", { name: "Email" }), "aitor@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "correct-password");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(signInWithCredentials).toHaveBeenCalled();
    const [, submittedFormData] = vi.mocked(signInWithCredentials).mock.calls[0];
    expect(submittedFormData.get("email")).toBe("aitor@example.com");
    expect(submittedFormData.get("password")).toBe("correct-password");
  });

  it("should show an error message when the credentials are invalid", async () => {
    vi.mocked(signInWithCredentials).mockResolvedValue({ error: "Email o contraseña incorrectos." });
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByRole("textbox", { name: "Email" }), "aitor@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Email o contraseña incorrectos.");
  });

  it("should switch to the registration form and submit through registerUser", async () => {
    vi.mocked(registerUser).mockResolvedValue({ error: null });
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.click(screen.getByRole("button", { name: "¿No tienes cuenta? Crea una" }));
    await user.type(screen.getByRole("textbox", { name: "Email" }), "new-user@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "a-strong-password");
    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(registerUser).toHaveBeenCalled();
  });

  it("should call the Google sign-in server action when its button is clicked", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.click(screen.getByRole("button", { name: "Entrar con Google" }));

    expect(signInWithGoogle).toHaveBeenCalled();
  });
});
