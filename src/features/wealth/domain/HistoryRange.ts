export type HistoryRange = "1d" | "1w" | "1m" | "ytd" | "1y";
export type HistoryGranularity = "intraday" | "daily";

export interface HistoryRangeSpec {
  granularity: HistoryGranularity;
  bucketSeconds: number; // intraday grid resolution; unused for "daily"
}

export const HISTORY_RANGE_SPECS: Record<HistoryRange, HistoryRangeSpec> = {
  "1d": { granularity: "intraday", bucketSeconds: 300 },
  "1w": { granularity: "daily", bucketSeconds: 0 },
  "1m": { granularity: "daily", bucketSeconds: 0 },
  "ytd": { granularity: "daily", bucketSeconds: 0 },
  "1y": { granularity: "daily", bucketSeconds: 0 },
};
