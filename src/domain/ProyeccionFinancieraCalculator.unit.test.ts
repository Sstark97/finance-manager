import { describe, expect, it } from "vitest";
import { ProyeccionFinancieraCalculator } from "@/domain/ProyeccionFinancieraCalculator";

describe("ProyeccionFinancieraCalculator", () => {
  it("should reach the objetivo within the expected number of months under monthly compounding", () => {
    const inicial = 1000;
    const aportacion = 100;
    const rentabilidadAnual = 0.07;
    const objetivo = 2000;

    const resultado = new ProyeccionFinancieraCalculator().proyectar({ inicial, aportacion, rentabilidadAnual, objetivo });

    expect(resultado.meses).not.toBeNull();
    expect(resultado.capitalFinal).toBeGreaterThanOrEqual(objetivo);

    const rentabilidadMensual = Math.pow(1 + rentabilidadAnual, 1 / 12) - 1;
    let capitalUnMesAntes = inicial;
    for (let mesIndex = 1; mesIndex < (resultado.meses ?? 0); mesIndex++) {
      capitalUnMesAntes = capitalUnMesAntes * (1 + rentabilidadMensual) + aportacion;
    }
    expect(capitalUnMesAntes).toBeLessThan(objetivo);
  });

  it("should return meses null when the objetivo is not reached within maxMeses", () => {
    const resultado = new ProyeccionFinancieraCalculator().proyectar({
      inicial: 0, aportacion: 0, rentabilidadAnual: 0, objetivo: 1000, maxMeses: 12,
    });

    expect(resultado.meses).toBeNull();
    expect(resultado.capitalFinal).toBe(0);
  });

  it("should keep capitalFinal coherent with the requested capitalization when goal is unreachable", () => {
    const inicial = 100;
    const aportacion = 50;
    const maxMeses = 6;

    const resultado = new ProyeccionFinancieraCalculator().proyectar({
      inicial, aportacion, rentabilidadAnual: 0, objetivo: 1_000_000, maxMeses,
    });

    expect(resultado.meses).toBeNull();
    expect(resultado.capitalFinal).toBeCloseTo(inicial + aportacion * maxMeses);
  });
});
