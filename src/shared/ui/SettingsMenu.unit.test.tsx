// @vitest-environment jsdom
import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsMenu } from "@/shared/ui/SettingsMenu";
import { exportFinanceData } from "@/app/actions/exportFinanceData";
import { browserFileDownloader } from "@/shared/infrastructure/BrowserFileDownloader";
import { signOutAction } from "@/app/actions/authSession";

vi.mock("@/app/actions/exportFinanceData", () => ({
  exportFinanceData: vi.fn().mockResolvedValue({ json: "{}", csv: "Cartera\n" }),
}));
vi.mock("@/shared/infrastructure/BrowserFileDownloader", () => ({ browserFileDownloader: { download: vi.fn() } }));
vi.mock("@/app/actions/authSession", () => ({ signOutAction: vi.fn().mockResolvedValue(undefined) }));

beforeEach(() => {
  vi.clearAllMocks();
});

function renderSettingsMenu() {
  return render(<SettingsMenu userEmail="owner@example.com" />);
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

  it("should fetch and download the exported JSON when Exportar JSON is selected", async () => {
    renderSettingsMenu();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Ajustes" }));

    await user.click(screen.getByRole("menuitem", { name: "Exportar JSON" }));

    expect(exportFinanceData).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => {
      expect(browserFileDownloader.download).toHaveBeenCalledWith("finanzas.json", "{}", "application/json");
    });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("should fetch and download the exported CSV when Exportar CSV is selected", async () => {
    renderSettingsMenu();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Ajustes" }));

    await user.click(screen.getByRole("menuitem", { name: "Exportar CSV" }));

    expect(exportFinanceData).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => {
      expect(browserFileDownloader.download).toHaveBeenCalledWith("finanzas.csv", "Cartera\n", "text/csv");
    });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("should sign the user out and close the menu when Cerrar sesión is selected", async () => {
    renderSettingsMenu();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Ajustes" }));

    await user.click(screen.getByRole("menuitem", { name: "Cerrar sesión" }));

    expect(signOutAction).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("should close the menu when clicking outside of it", async () => {
    render(
      <div>
        <button type="button">Fuera</button>
        <SettingsMenu userEmail="owner@example.com" />
      </div>,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Ajustes" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Fuera" }));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
