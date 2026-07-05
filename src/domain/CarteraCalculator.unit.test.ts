import { describe, expect, it } from "vitest";
import { CarteraCalculator } from "@/domain/CarteraCalculator";
import type { Posicion } from "@/domain/types";

describe("CarteraCalculator", () => {
  const fondoMundial: Posicion = {
    id: "world", nombre: "Fidelity MSCI World", ticker: "0P0000KSPA.F",
    tipo: "fondo", participaciones: 10, precio: 20, grupo: "rv",
  };
  const fondoEmergentes: Posicion = {
    id: "em", nombre: "Fidelity Emerging Markets", ticker: "0P0000KSP9.F",
    tipo: "fondo", participaciones: 5, precio: 10, grupo: "rv",
  };
  const bitcoin: Posicion = {
    id: "btc", nombre: "Bitcoin", ticker: "BTC-EUR",
    tipo: "cripto", participaciones: 0.01, precio: 50000, grupo: "btc",
  };
  const efectivo: Posicion = {
    id: "liquidez", nombre: "Fondo emergencia", ticker: "",
    tipo: "efectivo", participaciones: 300, precio: 1, grupo: "liquidez",
  };
  const posicionVacia: Posicion = {
    id: "vacia", nombre: "Posición sin saldo", ticker: "",
    tipo: "fondo", participaciones: 0, precio: 15, grupo: "rv",
  };

  it("should value an efectivo position as its participaciones, ignoring precio", () => {
    const derivada = new CarteraCalculator().derivar([efectivo]);

    expect(derivada.conValor[0].valor).toBe(300);
  });

  it("should value a non-efectivo position as participaciones times precio", () => {
    const derivada = new CarteraCalculator().derivar([fondoMundial]);

    expect(derivada.conValor[0].valor).toBe(10 * 20);
  });

  it("should compute total, invertido, liquidezTotal, rv and btcTotal across the whole cartera", () => {
    const derivada = new CarteraCalculator().derivar([fondoMundial, fondoEmergentes, bitcoin, efectivo]);

    const valorMundial = 10 * 20;
    const valorEmergentes = 5 * 10;
    const valorBitcoin = 0.01 * 50000;
    const valorEfectivo = 300;

    expect(derivada.total).toBe(valorMundial + valorEmergentes + valorBitcoin + valorEfectivo);
    expect(derivada.invertido).toBe(valorMundial + valorEmergentes + valorBitcoin);
    expect(derivada.liquidezTotal).toBe(valorEfectivo);
    expect(derivada.rv).toBe(valorMundial + valorEmergentes);
    expect(derivada.btcTotal).toBe(valorBitcoin);
  });

  it("should compute btcPesoTotal as the percentage of total held in btc", () => {
    const derivada = new CarteraCalculator().derivar([fondoMundial, bitcoin]);

    const valorMundial = 10 * 20;
    const valorBitcoin = 0.01 * 50000;
    const totalEsperado = valorMundial + valorBitcoin;

    expect(derivada.btcPesoTotal).toBeCloseTo((valorBitcoin / totalEsperado) * 100);
  });

  it("should compute pesoRVde as the percentage a given rv position represents within rv", () => {
    const derivada = new CarteraCalculator().derivar([fondoMundial, fondoEmergentes]);

    const valorMundial = 10 * 20;
    const valorEmergentes = 5 * 10;
    const rvTotal = valorMundial + valorEmergentes;

    expect(derivada.pesoRVde("world")).toBeCloseTo((valorMundial / rvTotal) * 100);
    expect(derivada.pesoRVde("em")).toBeCloseTo((valorEmergentes / rvTotal) * 100);
  });

  it("should return 0 from pesoRVde for a position id that is not part of the cartera", () => {
    const derivada = new CarteraCalculator().derivar([fondoMundial]);

    expect(derivada.pesoRVde("nasdaq")).toBe(0);
  });

  it("should exclude positions with a valor of 0 from pieCartera", () => {
    const derivada = new CarteraCalculator().derivar([fondoMundial, posicionVacia]);

    expect(derivada.pieCartera.map(entry => entry.name)).toEqual([fondoMundial.nombre]);
  });
});
