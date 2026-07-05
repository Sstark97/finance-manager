import { describe, expect, it } from "vitest";
import { PresupuestoMensualCalculator } from "@/domain/PresupuestoMensualCalculator";
import type { Mes, PresupuestoBase } from "@/domain/types";

describe("PresupuestoMensualCalculator", () => {
  const base: PresupuestoBase = {
    ingresoNeto: 1800,
    gastosFijos: 700,
    inversion: 300,
    fondoEmergencia: 300,
    ocio: 300,
    caprichos: 200,
  };

  const construirMes = (overrides: Partial<Mes> = {}): Mes => ({
    id: "mes-test",
    fecha: new Date(2026, 0, 1),
    mes: "ene 26",
    overrides: {},
    eventos: [],
    real: {},
    ingresoNetoOverride: null,
    ...overrides,
  });

  it("should use the mes override for a category instead of the base value", () => {
    const mes = construirMes({ overrides: { inversion: 450 } });

    const calculo = new PresupuestoMensualCalculator().calcular(mes, base);

    expect(calculo.valores.inversion).toBe(450);
    expect(calculo.valores.ocio).toBe(base.ocio);
  });

  it("should add up eventos that belong to a category on top of its objetivo", () => {
    const mes = construirMes({
      eventos: [
        { id: "e1", nombre: "Regalo", importe: 40, categoria: "ocio" },
        { id: "e2", nombre: "Cine", importe: 15, categoria: "ocio" },
      ],
    });

    const calculo = new PresupuestoMensualCalculator().calcular(mes, base);

    expect(calculo.valores.ocio).toBe(base.ocio + 40 + 15);
  });

  it("should add ingresoNetoOverride and ingreso eventos into the ingreso for the mes", () => {
    const mes = construirMes({
      ingresoNetoOverride: 2000,
      eventos: [{ id: "e1", nombre: "Extra", importe: 100, categoria: "ingreso" }],
    });

    const calculo = new PresupuestoMensualCalculator().calcular(mes, base);

    expect(calculo.ingreso).toBe(2000 + 100);
  });

  it("should compute sobrante as ingreso minus totalPresupuestado", () => {
    const mes = construirMes();

    const calculo = new PresupuestoMensualCalculator().calcular(mes, base);
    const totalPresupuestadoEsperado = base.gastosFijos + base.inversion + base.fondoEmergencia + base.ocio + base.caprichos;

    expect(calculo.totalPresupuestado).toBe(totalPresupuestadoEsperado);
    expect(calculo.sobrante).toBe(base.ingresoNeto - totalPresupuestadoEsperado);
  });

  it("should use the real value for totalReal when a category has been registered", () => {
    const mes = construirMes({ real: { ocio: 250 } });

    const calculo = new PresupuestoMensualCalculator().calcular(mes, base);
    const totalSinOcio = base.gastosFijos + base.inversion + base.fondoEmergencia + base.caprichos;

    expect(calculo.totalReal).toBe(totalSinOcio + 250);
  });

  it("should fall back to the valor presupuestado for totalReal when real is null", () => {
    const mes = construirMes({ real: { ocio: null } });

    const calculo = new PresupuestoMensualCalculator().calcular(mes, base);
    const totalPresupuestadoEsperado = base.gastosFijos + base.inversion + base.fondoEmergencia + base.ocio + base.caprichos;

    expect(calculo.totalReal).toBe(totalPresupuestadoEsperado);
  });
});
