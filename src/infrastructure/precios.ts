/* >>> BACKEND <<<  Precio por ticker desde TU servidor (Yahoo, evita CORS).
   Debe devolver un número (€/participación) para el ticker dado. */
export async function fetchYahooPrice(_ticker: string): Promise<number> {
  // const r = await fetch("/api/precio?ticker=" + encodeURIComponent(ticker));
  // const { price } = await r.json();
  // return price;
  throw new Error("Conecta tu backend en fetchYahooPrice()");
}
