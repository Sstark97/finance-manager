import { container } from "@/lib/di/ContainerDI";
import type { Position } from "@/features/wealth/domain/types";
import type { HistoryRange } from "@/features/wealth/domain/HistoryRange";

interface PortfolioHistoryRequestBody {
  positions: Position[];
  range: HistoryRange;
}

const VALID_HISTORY_RANGES: string[] = ["1d", "1w", "1m", "ytd", "1y"];

function isValidHistoryRange(range: unknown): range is HistoryRange {
  return typeof range === "string" && VALID_HISTORY_RANGES.includes(range);
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as Partial<PortfolioHistoryRequestBody> | null;
    if (!Array.isArray(body?.positions)) {
      return Response.json({ error: "Se esperaba un array de posiciones" }, { status: 400 });
    }
    if (!isValidHistoryRange(body?.range)) {
      return Response.json({ error: "Rango temporal no válido" }, { status: 400 });
    }

    const computePortfolioHistory = container.computePortfolioHistory();
    const result = await computePortfolioHistory.invoke(body.positions, body.range);
    return Response.json(result);
  } catch {
    return Response.json({ error: "No se pudo calcular la evolución del patrimonio" }, { status: 502 });
  }
}
