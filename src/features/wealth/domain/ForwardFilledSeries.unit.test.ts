import { describe, expect, it } from "vitest";
import { ForwardFilledSeries } from "@/features/wealth/domain/ForwardFilledSeries";

describe("ForwardFilledSeries", () => {
  it("should return the exact close when the bucket key has a matching bar", () => {
    const series = new ForwardFilledSeries(new Map([[100, 10], [200, 20], [300, 30]]), 0);

    expect(series.closeAt(200)).toBe(20);
  });

  it("should forward-fill across a gap by using the most recent close at or before the key", () => {
    const series = new ForwardFilledSeries(new Map([[100, 10], [300, 30]]), 0);

    expect(series.closeAt(250)).toBe(10);
  });

  it("should back-fill with the fallback close for a key before the earliest known bucket", () => {
    const fallbackClose = 42;
    const series = new ForwardFilledSeries(new Map([[300, 30], [400, 40]]), fallbackClose);

    expect(series.closeAt(100)).toBe(fallbackClose);
  });

  it("should stay flat across the whole axis when the series holds a single point", () => {
    const singlePointClose = 8.9928;
    const series = new ForwardFilledSeries(new Map([[500, singlePointClose]]), singlePointClose);

    expect(series.closeAt(100)).toBe(singlePointClose);
    expect(series.closeAt(500)).toBe(singlePointClose);
    expect(series.closeAt(900)).toBe(singlePointClose);
  });

  it("should not depend on the insertion order of the bucket map", () => {
    const series = new ForwardFilledSeries(new Map([[300, 30], [100, 10], [200, 20]]), 0);

    expect(series.closeAt(250)).toBe(20);
  });
});
