// @vitest-environment jsdom
import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SurplusHistoryChart } from "@/features/dashboard/components/SurplusHistoryChart";

describe("SurplusHistoryChart", () => {
  it("should warn that the surplus trend is incomplete when only one month has been registered", () => {
    render(<SurplusHistoryChart surplusHistory={[{ label: "jun 2026", surplus: 120 }]} />);

    expect(screen.getByText("Necesitas al menos 2 meses registrados para ver la tendencia.")).toBeInTheDocument();
  });

  it("should not warn about an incomplete trend once two or more months have been registered", () => {
    render(
      <SurplusHistoryChart
        surplusHistory={[
          { label: "may 2026", surplus: 80 },
          { label: "jun 2026", surplus: 120 },
        ]}
      />,
    );

    expect(screen.queryByText("Necesitas al menos 2 meses registrados para ver la tendencia.")).not.toBeInTheDocument();
  });
});
