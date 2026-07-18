// @vitest-environment jsdom
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsMenu } from "@/app/SettingsMenu";

function renderSettingsMenu() {
  const onExportJson = vi.fn();
  const onExportCsv = vi.fn();
  const onSignOut = vi.fn();
  render(<SettingsMenu userEmail="owner@example.com" onExportJson={onExportJson} onExportCsv={onExportCsv} onSignOut={onSignOut} />);
  return { onExportJson, onExportCsv, onSignOut };
}

describe("SettingsMenu", () => {
  it("should show the user email next to the settings toggle", () => {
    renderSettingsMenu();

    expect(screen.getByText("owner@example.com")).toBeInTheDocument();
  });

  it("should announce the toggle as a collapsed menu button by default", () => {
    renderSettingsMenu();

    const toggle = screen.getByRole("button", { name: "Ajustes" });
    expect(toggle).toHaveAttribute("aria-haspopup", "menu");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("should reveal a menu with the three actions once the toggle is pressed", async () => {
    renderSettingsMenu();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Ajustes" }));

    expect(screen.getByRole("button", { name: "Ajustes" })).toHaveAttribute("aria-expanded", "true");
    const menu = screen.getByRole("menu", { name: "Ajustes" });
    expect(within(menu).getByRole("menuitem", { name: "Exportar JSON" })).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: "Exportar CSV" })).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: "Cerrar sesión" })).toBeInTheDocument();
  });

  it("should invoke onExportJson and close the menu when Exportar JSON is selected", async () => {
    const { onExportJson } = renderSettingsMenu();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Ajustes" }));

    await user.click(screen.getByRole("menuitem", { name: "Exportar JSON" }));

    expect(onExportJson).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("should invoke onSignOut and close the menu when Cerrar sesión is selected", async () => {
    const { onSignOut } = renderSettingsMenu();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Ajustes" }));

    await user.click(screen.getByRole("menuitem", { name: "Cerrar sesión" }));

    expect(onSignOut).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("should close the menu when clicking outside of it", async () => {
    render(
      <div>
        <button type="button">Fuera</button>
        <SettingsMenu userEmail="owner@example.com" onExportJson={vi.fn()} onExportCsv={vi.fn()} onSignOut={vi.fn()} />
      </div>,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Ajustes" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Fuera" }));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
