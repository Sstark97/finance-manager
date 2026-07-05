import { describe, expect, it } from "vitest";
import { HistoryBucketer } from "@/features/wealth/domain/HistoryBucketer";
import { HISTORY_RANGE_SPECS } from "@/features/wealth/domain/HistoryRange";

describe("HistoryBucketer", () => {
  describe("intraday granularity", () => {
    const bucketer = new HistoryBucketer(HISTORY_RANGE_SPECS["1d"]);

    it("should floor an intraday timestamp down to the 5-minute grid", () => {
      const gridAlignedTimestamp = 1751500200;
      const timestampWithinTheSameGridSlot = gridAlignedTimestamp + 130;

      expect(bucketer.bucketKeyFor(timestampWithinTheSameGridSlot, 0)).toBe(gridAlignedTimestamp);
    });

    it("should keep an already grid-aligned timestamp unchanged", () => {
      const gridAlignedTimestamp = 1751500200;

      expect(bucketer.bucketKeyFor(gridAlignedTimestamp, 0)).toBe(gridAlignedTimestamp);
    });

    it("should format the bucket key as an HH:MM label", () => {
      const gridAlignedTimestamp = 1751500200;

      expect(bucketer.labelFor(gridAlignedTimestamp)).toMatch(/^\d{2}:\d{2}$/);
    });
  });

  describe("daily granularity", () => {
    const bucketer = new HistoryBucketer(HISTORY_RANGE_SPECS["1m"]);
    const dayStartUtcEpochSeconds = Date.UTC(2026, 6, 5, 0, 0, 0) / 1000;

    it("should map an LSE bar stamped near 07:00 UTC and a UTC crypto bar from the same calendar day to the same daily key", () => {
      const lseGmtOffsetSeconds = 3600;
      const lseBarTimestamp = Date.UTC(2026, 6, 5, 7, 0, 0) / 1000;
      const cryptoGmtOffsetSeconds = 0;
      const cryptoBarTimestamp = Date.UTC(2026, 6, 5, 23, 0, 0) / 1000;

      const lseBucketKey = bucketer.bucketKeyFor(lseBarTimestamp, lseGmtOffsetSeconds);
      const cryptoBucketKey = bucketer.bucketKeyFor(cryptoBarTimestamp, cryptoGmtOffsetSeconds);

      expect(lseBucketKey).toBe(dayStartUtcEpochSeconds);
      expect(cryptoBucketKey).toBe(dayStartUtcEpochSeconds);
    });

    it("should shift a bar into the next exchange-local day once the offset pushes it past midnight", () => {
      const gmtOffsetSeconds = 3600;
      const barTimestampJustBeforeUtcMidnight = Date.UTC(2026, 6, 5, 23, 30, 0) / 1000;
      const nextDayStartUtcEpochSeconds = Date.UTC(2026, 6, 6, 0, 0, 0) / 1000;

      expect(bucketer.bucketKeyFor(barTimestampJustBeforeUtcMidnight, gmtOffsetSeconds)).toBe(
        nextDayStartUtcEpochSeconds,
      );
    });

    it("should format the bucket key as a Spanish short day/month label anchored to UTC", () => {
      expect(bucketer.labelFor(dayStartUtcEpochSeconds)).toBe(
        new Date(dayStartUtcEpochSeconds * 1000).toLocaleDateString("es-ES", {
          day: "numeric",
          month: "short",
          timeZone: "UTC",
        }),
      );
    });
  });
});
