import { generateId } from "@/lib/format";
import type { CategoriaId, Evento, Mes } from "@/domain/types";

export const crearMes = (
  anio: number,
  mesIndex: number,
  overrides: Partial<Record<CategoriaId, number>> = {},
  eventos: Evento[] = [],
): Mes => ({
  id: generateId(),
  fecha: new Date(anio, mesIndex, 1),
  mes: new Date(anio, mesIndex, 1).toLocaleDateString("es-ES", { month: "short", year: "2-digit" }).replace(".", ""),
  overrides, eventos, real: {}, ingresoNetoOverride: null,
});

export const claveMes = (fecha: Date): number => fecha.getFullYear() * 12 + fecha.getMonth();

export const esMesDisponible = (fecha: Date): boolean => claveMes(fecha) <= claveMes(new Date());
