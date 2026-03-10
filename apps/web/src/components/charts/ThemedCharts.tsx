import React, { useEffect, useRef } from "react";
import { Box, useTheme } from "@mui/material";
import { alpha, keyframes } from "@mui/material/styles";
import { Bar, Line } from "react-chartjs-2";
import type { Chart as ChartInstance, ChartData, ChartOptions } from "chart.js";
import { buildChartOptions, registerChartInstance, unregisterChartInstance } from "../../lib/chartjsTheme";

type HeightSpec = { xs: number; sm?: number; md?: number; lg?: number };

const chartBreath = keyframes`
  0% { opacity: 0.08; transform: translateX(-3%) scale(1); }
  50% { opacity: 0.16; transform: translateX(3%) scale(1.01); }
  100% { opacity: 0.08; transform: translateX(-3%) scale(1); }
`;

function normalizeLineData(data: ChartData<"line">): ChartData<"line"> {
  return {
    ...data,
    datasets: (data.datasets || []).map((dataset) => ({
      ...dataset,
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 3,
      tension: typeof dataset.tension === "number" ? dataset.tension : 0.32,
      fill: typeof dataset.fill === "undefined" ? false : dataset.fill,
    })),
  };
}

function normalizeBarData(data: ChartData<"bar">): ChartData<"bar"> {
  return {
    ...data,
    datasets: (data.datasets || []).map((dataset) => ({
      ...dataset,
      borderRadius: 8,
      borderSkipped: false,
      borderWidth: 0,
    })),
  };
}

export function ThemedLineChart({
  data,
  options,
  height,
}: {
  data: ChartData<"line">;
  options?: ChartOptions<"line">;
  height: HeightSpec;
}) {
  const chartRef = useRef<ChartInstance<"line"> | null>(null);
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  useEffect(() => {
    const chart = chartRef.current;
    registerChartInstance(chart);
    return () => unregisterChartInstance(chart);
  }, []);

  return (
    <Box
      sx={{
        position: "relative",
        height,
        width: "100%",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1.2,
        p: 0.7,
        overflow: "hidden",
        backgroundColor: alpha(theme.palette.background.paper, isDark ? 0.52 : 0.82),
        "&::after": {
          content: '""',
          position: "absolute",
          inset: "-10%",
          pointerEvents: "none",
          background: `radial-gradient(circle at 25% 35%, ${alpha(theme.palette.primary.main, isDark ? 0.16 : 0.08)}, transparent 60%)`,
          animation: `${chartBreath} 4.8s ease-in-out infinite`,
        },
        "@media (prefers-reduced-motion: reduce)": {
          "&::after": { animation: "none" },
        },
      }}
    >
      <Line ref={chartRef} data={normalizeLineData(data)} options={buildChartOptions(options || {}) as ChartOptions<"line">} />
    </Box>
  );
}

export function ThemedBarChart({
  data,
  options,
  height,
}: {
  data: ChartData<"bar">;
  options?: ChartOptions<"bar">;
  height: HeightSpec;
}) {
  const chartRef = useRef<ChartInstance<"bar"> | null>(null);
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  useEffect(() => {
    const chart = chartRef.current;
    registerChartInstance(chart);
    return () => unregisterChartInstance(chart);
  }, []);

  return (
    <Box
      sx={{
        position: "relative",
        height,
        width: "100%",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1.2,
        p: 0.7,
        overflow: "hidden",
        backgroundColor: alpha(theme.palette.background.paper, isDark ? 0.52 : 0.82),
        "&::after": {
          content: '""',
          position: "absolute",
          inset: "-10%",
          pointerEvents: "none",
          background: `radial-gradient(circle at 30% 30%, ${alpha(theme.palette.primary.main, isDark ? 0.13 : 0.06)}, transparent 58%)`,
          animation: `${chartBreath} 5.4s ease-in-out infinite`,
        },
        "@media (prefers-reduced-motion: reduce)": {
          "&::after": { animation: "none" },
        },
      }}
    >
      <Bar ref={chartRef} data={normalizeBarData(data)} options={buildChartOptions(options || {}) as ChartOptions<"bar">} />
    </Box>
  );
}
