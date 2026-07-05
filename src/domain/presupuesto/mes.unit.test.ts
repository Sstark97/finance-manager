import { describe, expect, it } from "vitest";
import { claveMes, crearMes, esMesDisponible } from "@/domain/presupuesto/mes";

describe("esMesDisponible", () => {
  it("should consider a past month available", () => {
    const unMesPasado = new Date();
    unMesPasado.setMonth(unMesPasado.getMonth() - 1);

    expect(esMesDisponible(unMesPasado)).toBe(true);
  });

  it("should consider the current month available", () => {
    expect(esMesDisponible(new Date())).toBe(true);
  });

  it("should consider a future month not available", () => {
    const unMesFuturo = new Date();
    unMesFuturo.setMonth(unMesFuturo.getMonth() + 1);

    expect(esMesDisponible(unMesFuturo)).toBe(false);
  });
});

describe("claveMes", () => {
  it("should increase monotonically from one month to the next", () => {
    const enero2026 = claveMes(new Date(2026, 0, 1));
    const febrero2026 = claveMes(new Date(2026, 1, 1));
    const enero2027 = claveMes(new Date(2027, 0, 1));

    expect(febrero2026).toBeGreaterThan(enero2026);
    expect(enero2027).toBeGreaterThan(febrero2026);
  });
});

describe("crearMes", () => {
  it("should produce the fecha and mes label matching the given year and month index", () => {
    const mes = crearMes(2026, 6);

    expect(mes.fecha).toEqual(new Date(2026, 6, 1));
    expect(mes.mes).toBe(new Date(2026, 6, 1).toLocaleDateString("es-ES", { month: "short", year: "2-digit" }).replace(".", ""));
  });

  it("should default overrides, eventos, real and ingresoNetoOverride to empty state", () => {
    const mes = crearMes(2026, 6);

    expect(mes.overrides).toEqual({});
    expect(mes.eventos).toEqual([]);
    expect(mes.real).toEqual({});
    expect(mes.ingresoNetoOverride).toBeNull();
  });

  it("should keep the given overrides and eventos", () => {
    const eventos = [{ id: "e1", nombre: "Extra", importe: 50, categoria: "ingreso" as const }];

    const mes = crearMes(2026, 6, { inversion: 250 }, eventos);

    expect(mes.overrides).toEqual({ inversion: 250 });
    expect(mes.eventos).toEqual(eventos);
  });
});
