// @vitest-environment jsdom
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MobileTabBar, WealthIcon, BudgetIcon } from "@/shared/ui/MobileTabBar";

const usePathnameMock = vi.hoisted(() => vi.fn<() => string>());

vi.mock("next/navigation", () => ({ usePathname: usePathnameMock }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

const SAMPLE_ITEMS = [
  { href: "/wealth", label: "Patrimonio", icon: WealthIcon },
  { href: "/budget", label: "Presupuesto", icon: BudgetIcon },
];

describe("MobileTabBar", () => {
  it("should expose the links as an accessible, labelled navigation landmark", () => {
    usePathnameMock.mockReturnValue("/wealth");
    render(<MobileTabBar items={SAMPLE_ITEMS} />);

    expect(screen.getByRole("navigation", { name: "Navegación principal" })).toBeInTheDocument();
  });

  it("should mark only the link matching the current route with aria-current", () => {
    usePathnameMock.mockReturnValue("/budget");
    render(<MobileTabBar items={SAMPLE_ITEMS} />);

    expect(screen.getByRole("link", { name: "Presupuesto" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Patrimonio" })).not.toHaveAttribute("aria-current");
  });

  it("should link each item to its own route", () => {
    usePathnameMock.mockReturnValue("/wealth");
    render(<MobileTabBar items={SAMPLE_ITEMS} />);

    expect(screen.getByRole("link", { name: "Patrimonio" })).toHaveAttribute("href", "/wealth");
    expect(screen.getByRole("link", { name: "Presupuesto" })).toHaveAttribute("href", "/budget");
  });
});
