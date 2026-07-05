import { CATEGORIAS } from "@/domain/config";
import type { CategoriaId, Mes, PresupuestoBase } from "@/domain/types";

export interface CalculoMes {
  valores: Record<CategoriaId, number>;
  ingreso: number;
  totalPresupuestado: number;
  sobrante: number;
  real: Record<CategoriaId, number | null>;
  totalReal: number;
}

export class PresupuestoMensualCalculator {
  calcular(mes: Mes, base: PresupuestoBase): CalculoMes {
    const valores = {} as Record<CategoriaId, number>;
    CATEGORIAS.forEach(categoria => {
      const objetivoBase = mes.overrides?.[categoria.id] ?? base[categoria.id];
      const importeEventosCategoria = (mes.eventos || [])
        .filter(evento => evento.categoria === categoria.id)
        .reduce((sum, evento) => sum + (evento.importe || 0), 0);
      valores[categoria.id] = objetivoBase + importeEventosCategoria;
    });
    const ingresoEventos = (mes.eventos || [])
      .filter(evento => evento.categoria === "ingreso")
      .reduce((sum, evento) => sum + (evento.importe || 0), 0);
    const ingreso = (mes.ingresoNetoOverride ?? base.ingresoNeto) + ingresoEventos;
    const totalPresupuestado = CATEGORIAS.reduce((sum, categoria) => sum + valores[categoria.id], 0);
    const sobrante = ingreso - totalPresupuestado;
    const real = {} as Record<CategoriaId, number | null>;
    CATEGORIAS.forEach(categoria => {
      const valorReal = mes.real ? mes.real[categoria.id] : undefined;
      real[categoria.id] = valorReal != null ? valorReal : null;
    });
    const totalReal = CATEGORIAS.reduce((sum, categoria) => {
      const valorReal = real[categoria.id];
      return sum + (valorReal != null ? valorReal : valores[categoria.id]);
    }, 0);
    return { valores, ingreso, totalPresupuestado, sobrante, real, totalReal };
  }
}

export const presupuestoMensualCalculator = new PresupuestoMensualCalculator();
