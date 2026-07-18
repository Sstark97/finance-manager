// @vitest-environment jsdom
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MobileTabBar, WealthIcon, BudgetIcon } from "@/app/MobileTabBar";

type SampleTabId = "wealth" | "budget";

const SAMPLE_ITEMS = [
  { id: "wealth" as SampleTabId, label: "Patrimonio", icon: WealthIcon },
  { id: "budget" as SampleTabId, label: "Presupuesto", icon: BudgetIcon },
];

describe("MobileTabBar", () => {
  it("should expose the tabs as an accessible, labelled tablist", () => {
    render(<MobileTabBar items={SAMPLE_ITEMS} activeTabId="wealth" onSelect={vi.fn()} />);

    expect(screen.getByRole("tablist", { name: "Navegación principal" })).toBeInTheDocument();
  });

  it("should mark only the active tab as selected", () => {
    render(<MobileTabBar items={SAMPLE_ITEMS} activeTabId="budget" onSelect={vi.fn()} />);

    expect(screen.getByRole("tab", { name: "Presupuesto" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Patrimonio" })).toHaveAttribute("aria-selected", "false");
  });

  it("should notify the selected tab id when a tab is activated by keyboard", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<MobileTabBar items={SAMPLE_ITEMS} activeTabId="wealth" onSelect={onSelect} />);

    await user.tab();
    await user.keyboard("{Enter}");

    expect(onSelect).toHaveBeenCalledWith("wealth");
  });
});
