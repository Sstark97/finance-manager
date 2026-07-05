export const palette = {
  bg: "#0f1417", panel: "#161d22", panel2: "#1c252b", line: "#2a363d",
  ink: "#e8eef0", sub: "#8fa3ad", faint: "#5d6f78",
  acc: "#4db6a4", warn: "#d8a657", bad: "#cf6b00",
};

export const chartSeriesColors = [
  "#4db6a4", "#5b8fb0", "#c98a5e", "#d8a657", "#6b7d86",
  "#a87f9e", "#7e9c8a", "#8a9ba3", "#b0654f", "#3d6f63",
];

export const seriesColorAt = (index: number): string => chartSeriesColors[index % chartSeriesColors.length];
