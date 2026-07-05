import type { Categoria, CategoriaEvento, CategoriaId, Composicion, Fase } from "@/domain/types";

export const OBJETIVOS = {
  fondoEmergencia: 4900, fondoMinimo: 1000,
  pesoRV: { world: 60, em: 20, nasdaq: 20 },
  btcPausar: 40, btcVender: 50, btcUmbralPausar: 10000, btcUmbralVender: 20000,
};

// Composición de índices (orientativa, jun 2026). Clave = id de la posición.
export const COMPOSICION: Record<string, Composicion> = {
  world: { nombre: "Fidelity MSCI World",
    paises: [{n:"EE.UU.",v:71},{n:"Japón",v:6},{n:"Reino Unido",v:4},{n:"Canadá",v:3},{n:"Francia",v:3},{n:"Suiza",v:3},{n:"Alemania",v:2},{n:"Otros",v:8}],
    sectores: [{n:"Tecnología",v:26},{n:"Financiero",v:16},{n:"Salud",v:11},{n:"Consumo discr.",v:11},{n:"Industria",v:11},{n:"Comunicación",v:8},{n:"Consumo básico",v:6},{n:"Otros",v:11}] },
  em: { nombre: "Fidelity Emerging Markets",
    paises: [{n:"China",v:27},{n:"India",v:20},{n:"Taiwán",v:19},{n:"Corea",v:11},{n:"Brasil",v:5},{n:"Arabia Saudí",v:4},{n:"Otros",v:14}],
    sectores: [{n:"Tecnología",v:24},{n:"Financiero",v:22},{n:"Consumo discr.",v:13},{n:"Comunicación",v:10},{n:"Materiales",v:7},{n:"Industria",v:6},{n:"Otros",v:18}] },
  nasdaq: { nombre: "iShares Nasdaq 100",
    paises: [{n:"EE.UU.",v:97},{n:"Otros",v:3}],
    sectores: [{n:"Tecnología",v:50},{n:"Comunicación",v:16},{n:"Consumo discr.",v:13},{n:"Salud",v:6},{n:"Consumo básico",v:6},{n:"Industria",v:5},{n:"Otros",v:4}] },
};

// --------- METAS ---------------------------------------------------------
export const OBJETIVO_FI = { capital: 750000, edadActual: 28, edadObjetivo: 50, rentaMensual: 2250 };
export const OBJETIVO_VIVIENDA = { masaCritica: 50000, horizonte: "5–10 años" };
export const OBJETIVO_BTC_OP = { objetivo: 630, ventana: "sep–dic 2026" };

export const FASES: Fase[] = [
  { id: 1, nombre: "Acumulación + Operación BTC", edad: "28–31", salarioMin: 0,     carteraMin: 0,      desc: "DCA 200€ fondos + 25€ BTC. Modo estanflación activo. Operación bear market ~630€. Cold wallet." },
  { id: 2, nombre: "Escalada + Japón en radar",    edad: "31–35", salarioMin: 35000, carteraMin: 0,      desc: "Aumentar aportaciones (regla 50/50). Evaluar Japón (Fidelity MSCI Japan) y oro adelantado." },
  { id: 3, nombre: "Small Caps + Renta Fija",      edad: "35–40", salarioMin: 50000, carteraMin: 100000, desc: "Vanguard Global Small-Cap 10%. Inicio renta fija. Posible estrategia vivienda con garantía." },
  { id: 4, nombre: "Consolidación + Oro",          edad: "40–45", salarioMin: 65000, carteraMin: 200000, desc: "Oro 5–10% (ETC físico). Renta fija 15–20%. Private Equity (máx 5%) si cartera >300K." },
  { id: 5, nombre: "Protección pre-retiro",        edad: "45–50", salarioMin: 65000, carteraMin: 400000, desc: "RV 65–70% / RF 20–25% / Oro 5–10%. Bitcoin: venta parcial si >30% del patrimonio." },
];

export const CATEGORIAS: Categoria[] = [
  { id: "gastosFijos",     nombre: "Gastos fijos",              tipo: "gasto"  },
  { id: "inversion",       nombre: "Inversión",                 tipo: "ahorro" },
  { id: "fondoEmergencia", nombre: "Fondo emergencia / casa",   tipo: "ahorro" },
  { id: "ocio",            nombre: "Ocio",                      tipo: "gasto"  },
  { id: "caprichos",       nombre: "Caprichos / tech",          tipo: "gasto"  },
];

export const CATEGORIA_LABEL: Partial<Record<CategoriaEvento, string>> = Object.fromEntries(
  CATEGORIAS.map((categoria): [CategoriaId, string] => [categoria.id, categoria.nombre]),
);
