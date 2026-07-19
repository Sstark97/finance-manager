// @vitest-environment jsdom
import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { WealthCompositionChart } from "@/features/dashboard/components/WealthCompositionChart";
import { currencyFormatter } from "@/lib/CurrencyFormatter";

describe("WealthCompositionChart", () => {
  it("should show the wealth composition legend with each group's share of the total", () => {
    render(
      <WealthCompositionChart
        total={1000}
        wealthComposition={[
          { name: "Liquidez", value: 250, color: "#4db6a4" },
          { name: "Renta variable", value: 750, color: "#5b8fb0" },
        ]}
      />,
    );

    expect(screen.getByText("Liquidez")).toBeInTheDocument();
    expect(screen.getByText("Renta variable")).toBeInTheDocument();
    expect(screen.getByText(currencyFormatter.percent(25))).toBeInTheDocument();
    expect(screen.getByText(currencyFormatter.percent(75))).toBeInTheDocument();
  });

  it("should show a zero share for every slice when the portfolio total is zero", () => {
    render(<WealthCompositionChart total={0} wealthComposition={[{ name: "Liquidez", value: 0, color: "#4db6a4" }]} />);

    expect(screen.getByText(currencyFormatter.percent(0))).toBeInTheDocument();
  });
});
