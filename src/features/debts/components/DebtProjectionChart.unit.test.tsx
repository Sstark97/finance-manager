// @vitest-environment jsdom
import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DebtProjectionChart } from "@/features/debts/components/DebtProjectionChart";
import type { Debt } from "@/shared/domain/types";

const carLoan: Debt = { id: "coche", name: "Coche", installment: 200, balance: 2000, note: "", isLongTerm: false };
const settledKindle: Debt = { id: "kindle", name: "Kindle", installment: 44, balance: 132, note: "", isLongTerm: false, settledAt: "2026-06-01" };

describe("DebtProjectionChart", () => {
  it("should show an empty-state message when there are no active debts", () => {
    render(<DebtProjectionChart debts={[]} />);

    expect(screen.getByText("Sin deudas activas que proyectar.")).toBeInTheDocument();
  });

  it("should show the empty-state message when every debt is already settled", () => {
    render(<DebtProjectionChart debts={[settledKindle]} />);

    expect(screen.getByText("Sin deudas activas que proyectar.")).toBeInTheDocument();
  });

  it("should render the projection chart title and the theoretical-estimate disclaimer when debts are active", () => {
    render(<DebtProjectionChart debts={[carLoan]} />);

    expect(screen.getByText("Proyección · amortización de deuda")).toBeInTheDocument();
    expect(screen.getByText(/Estimación teórica/)).toBeInTheDocument();
    expect(screen.queryByText("Sin deudas activas que proyectar.")).not.toBeInTheDocument();
  });

  it("should announce how many years and months until the projected debt reaches zero", () => {
    render(<DebtProjectionChart debts={[carLoan]} />);

    expect(screen.getByText(/Libre de deudas en ~\d+ mes(es)? \(.+\)/)).toBeInTheDocument();
  });

  it("should announce being already debt-free when the active debt balance is zero", () => {
    const paidOffDebt: Debt = { ...carLoan, balance: 0 };

    render(<DebtProjectionChart debts={[paidOffDebt]} />);

    expect(screen.getByText("Ya estás libre de deudas según el saldo registrado.")).toBeInTheDocument();
  });

  it("should warn that the debt will not be cleared within the projection horizon when the installment cannot amortize it", () => {
    const stuckDebt: Debt = { ...carLoan, installment: 0 };

    render(<DebtProjectionChart debts={[stuckDebt]} />);

    expect(screen.getByText(/no te librarás de la deuda en los próximos 30 años/)).toBeInTheDocument();
  });
});
