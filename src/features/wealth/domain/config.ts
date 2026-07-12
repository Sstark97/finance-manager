import type { Composition, EquityIndexKey } from "@/features/wealth/domain/types";

export const COMPOSITIONS: Record<EquityIndexKey, Composition> = {
  world: { name: "Fidelity MSCI World",
    countries: [{name:"EE.UU.",value:71},{name:"Japón",value:6},{name:"Reino Unido",value:4},{name:"Canadá",value:3},{name:"Francia",value:3},{name:"Suiza",value:3},{name:"Alemania",value:2},{name:"Otros",value:8}],
    sectors: [{name:"Tecnología",value:26},{name:"Financiero",value:16},{name:"Salud",value:11},{name:"Consumo discr.",value:11},{name:"Industria",value:11},{name:"Comunicación",value:8},{name:"Consumo básico",value:6},{name:"Otros",value:11}] },
  em: { name: "Fidelity Emerging Markets",
    countries: [{name:"China",value:27},{name:"India",value:20},{name:"Taiwán",value:19},{name:"Corea",value:11},{name:"Brasil",value:5},{name:"Arabia Saudí",value:4},{name:"Otros",value:14}],
    sectors: [{name:"Tecnología",value:24},{name:"Financiero",value:22},{name:"Consumo discr.",value:13},{name:"Comunicación",value:10},{name:"Materiales",value:7},{name:"Industria",value:6},{name:"Otros",value:18}] },
  nasdaq: { name: "iShares Nasdaq 100",
    countries: [{name:"EE.UU.",value:97},{name:"Otros",value:3}],
    sectors: [{name:"Tecnología",value:50},{name:"Comunicación",value:16},{name:"Consumo discr.",value:13},{name:"Salud",value:6},{name:"Consumo básico",value:6},{name:"Industria",value:5},{name:"Otros",value:4}] },
};
