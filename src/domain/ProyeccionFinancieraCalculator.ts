export interface ProyeccionFIParams {
  inicial: number;
  aportacion: number;
  rentabilidadAnual: number;
  objetivo: number;
  maxMeses?: number;
}

export interface ProyeccionFIResultado {
  meses: number | null;
  capitalFinal: number;
}

export class ProyeccionFinancieraCalculator {
  proyectar({ inicial, aportacion, rentabilidadAnual, objetivo, maxMeses = 900 }: ProyeccionFIParams): ProyeccionFIResultado {
    const rentabilidadMensual = Math.pow(1 + rentabilidadAnual, 1 / 12) - 1;
    let capital = inicial;
    for (let mesIndex = 1; mesIndex <= maxMeses; mesIndex++) {
      capital = capital * (1 + rentabilidadMensual) + aportacion;
      if (capital >= objetivo) return { meses: mesIndex, capitalFinal: capital };
    }
    return { meses: null, capitalFinal: capital };
  }
}

export const proyeccionFinancieraCalculator = new ProyeccionFinancieraCalculator();
