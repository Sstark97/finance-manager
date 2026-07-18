// @vitest-environment jsdom
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WealthTargetsOnboarding } from "@/features/wealth/components/WealthTargetsOnboarding";

describe("WealthTargetsOnboarding", () => {
  it("should not persist anything while rendering the onboarding form", () => {
    const onCreateTargets = vi.fn();

    render(<WealthTargetsOnboarding onCreateTargets={onCreateTargets} />);

    expect(onCreateTargets).not.toHaveBeenCalled();
  });

  it("should create the wealth targets only when the onboarding form is explicitly confirmed", () => {
    const onCreateTargets = vi.fn();

    render(<WealthTargetsOnboarding onCreateTargets={onCreateTargets} />);
    fireEvent.click(screen.getByRole("button", { name: "Crear mis objetivos" }));

    expect(onCreateTargets).toHaveBeenCalledTimes(1);
    expect(onCreateTargets).toHaveBeenCalledWith({
      emergencyFund: 0, minimumFund: 0,
      equityTargets: { world: 0, em: 0, nasdaq: 0 },
      btcPauseWeight: 0, btcSellWeight: 0, btcPauseCapital: 0, btcSellCapital: 0,
    });
  });

  it("should pass through the values the user introduced when confirming the form", () => {
    const onCreateTargets = vi.fn();

    render(<WealthTargetsOnboarding onCreateTargets={onCreateTargets} />);
    fireEvent.change(screen.getByRole("spinbutton", { name: "Fondo de emergencia objetivo (€)" }), { target: { value: "6000" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Fondo de emergencia mínimo (€)" }), { target: { value: "1500" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear mis objetivos" }));

    expect(onCreateTargets).toHaveBeenCalledWith({
      emergencyFund: 6000, minimumFund: 1500,
      equityTargets: { world: 0, em: 0, nasdaq: 0 },
      btcPauseWeight: 0, btcSellWeight: 0, btcPauseCapital: 0, btcSellCapital: 0,
    });
  });

  it("should append the caller's className to its own card classes so the mobile grid can reorder it", () => {
    const { container } = render(<WealthTargetsOnboarding onCreateTargets={vi.fn()} className="widget-onboarding-cta" />);

    expect(container.querySelector(".card.span-full.widget-onboarding-cta")).not.toBeNull();
  });
});
