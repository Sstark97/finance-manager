export type TipoPosicion = "fondo" | "etf" | "cripto" | "efectivo";
export type GrupoPosicion = "rv" | "btc" | "liquidez";

export interface Posicion {
  id: string;
  nombre: string;
  ticker: string;
  tipo: TipoPosicion;
  participaciones: number;
  precio: number;
  grupo: GrupoPosicion;
}

export interface PuntoHistorico {
  mes: string;
  total: number;
}

export type CategoriaId = "gastosFijos" | "inversion" | "fondoEmergencia" | "ocio" | "caprichos";
export type TipoCategoria = "gasto" | "ahorro";

export interface Categoria {
  id: CategoriaId;
  nombre: string;
  tipo: TipoCategoria;
}

export interface GastoFijoItem {
  id: string;
  nombre: string;
  importe: number;
}

export type CategoriaEvento = CategoriaId | "ingreso";

export interface Evento {
  id: string;
  nombre: string;
  importe: number;
  categoria: CategoriaEvento;
}

export interface Mes {
  id: string;
  fecha: Date;
  mes: string;
  overrides: Partial<Record<CategoriaId, number>>;
  eventos: Evento[];
  real: Partial<Record<CategoriaId, number | null>>;
  ingresoNetoOverride: number | null;
}

export interface PresupuestoBase {
  ingresoNeto: number;
  gastosFijos: number;
  inversion: number;
  fondoEmergencia: number;
  ocio: number;
  caprichos: number;
}

export interface PresupuestoBaseBorrador extends PresupuestoBase {
  gastosFijosItems: GastoFijoItem[];
}

export interface Fase {
  id: number;
  nombre: string;
  edad: string;
  salarioMin: number;
  carteraMin: number;
  desc: string;
}

export interface CondicionesBTC {
  prescindible: boolean;
  dcaActivo: boolean;
}

export interface CompItem {
  n: string;
  v: number;
}

export interface Composicion {
  nombre: string;
  paises: CompItem[];
  sectores: CompItem[];
}
