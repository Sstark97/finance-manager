import { getRefreshPositionPrices } from "@/lib/di/container";
import type { Position } from "@/features/wealth/domain/types";

interface RefreshPricesRequestBody {
  positions: Position[];
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as Partial<RefreshPricesRequestBody> | null;
    if (!Array.isArray(body?.positions)) {
      return Response.json({ error: "Se esperaba un array de posiciones" }, { status: 400 });
    }
    const refreshPositionPrices = getRefreshPositionPrices();
    const result = await refreshPositionPrices.invoke(body.positions);
    return Response.json(result);
  } catch {
    return Response.json({ error: "No se pudo actualizar los precios" }, { status: 502 });
  }
}
