import type { HistoryRangeSpec } from "@/features/wealth/domain/HistoryRange";

const SECONDS_PER_DAY = 86400;

export class HistoryBucketer {
  constructor(private readonly spec: HistoryRangeSpec) {}

  bucketKeyFor(timestamp: number, gmtOffsetSeconds: number): number {
    return this.spec.granularity === "intraday"
      ? this.bucketKeyForIntraday(timestamp)
      : this.bucketKeyForDailyBar(timestamp, gmtOffsetSeconds);
  }

  labelFor(bucketKey: number): string {
    return this.spec.granularity === "intraday"
      ? this.intradayLabelFor(bucketKey)
      : this.dailyLabelFor(bucketKey);
  }

  private bucketKeyForIntraday(timestamp: number): number {
    return Math.floor(timestamp / this.spec.bucketSeconds) * this.spec.bucketSeconds;
  }

  private bucketKeyForDailyBar(timestamp: number, gmtOffsetSeconds: number): number {
    return Math.floor((timestamp + gmtOffsetSeconds) / SECONDS_PER_DAY) * SECONDS_PER_DAY;
  }

  private intradayLabelFor(bucketKey: number): string {
    return new Date(bucketKey * 1000).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  }

  private dailyLabelFor(bucketKey: number): string {
    return new Date(bucketKey * 1000).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
  }
}
