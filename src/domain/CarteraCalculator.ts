import { seriesColorAt } from "@/lib/theme";
import type { Posicion } from "@/domain/types";

export interface PosicionConValor extends Posicion {
  color: string;
  valor: number;
}

export interface CarteraDerivada {
  conValor: PosicionConValor[];
  total: number;
  invertido: number;
  liquidezTotal: number;
  rvItems: PosicionConValor[];
  rv: number;
  btcTotal: number;
  btcPesoTotal: number;
  pesoRVde: (id: string) => number;
  pieCartera: { name: string; value: number; color: string }[];
}

export class CarteraCalculator {
  derivar(cartera: Posicion[]): CarteraDerivada {
    const conValor: PosicionConValor[] = cartera.map((posicion, posicionIndex) => ({
      ...posicion,
      color: seriesColorAt(posicionIndex),
      valor: posicion.tipo === "efectivo"
        ? (posicion.participaciones || 0)
        : (posicion.participaciones || 0) * (posicion.precio || 0),
    }));
    const total = conValor.reduce((sum, posicion) => sum + posicion.valor, 0);
    const invertido = conValor.filter(posicion => posicion.grupo !== "liquidez").reduce((sum, posicion) => sum + posicion.valor, 0);
    const liquidezTotal = conValor.filter(posicion => posicion.grupo === "liquidez").reduce((sum, posicion) => sum + posicion.valor, 0);
    const rvItems = conValor.filter(posicion => posicion.grupo === "rv");
    const rv = rvItems.reduce((sum, posicion) => sum + posicion.valor, 0);
    const btcTotal = conValor.filter(posicion => posicion.grupo === "btc").reduce((sum, posicion) => sum + posicion.valor, 0);
    const btcPesoTotal = total ? (btcTotal / total) * 100 : 0;
    const pesoRVde = (id: string): number => {
      const posicion = rvItems.find(item => item.id === id);
      return rv && posicion ? (posicion.valor / rv) * 100 : 0;
    };
    const pieCartera = conValor
      .filter(posicion => posicion.valor > 0)
      .map(posicion => ({ name: posicion.nombre, value: posicion.valor, color: posicion.color }));
    return { conValor, total, invertido, liquidezTotal, rvItems, rv, btcTotal, btcPesoTotal, pesoRVde, pieCartera };
  }
}

export const carteraCalculator = new CarteraCalculator();
