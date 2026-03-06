import React, { useEffect, useRef } from "react";
import { Box } from "@mui/material";
import { Bar, Line } from "react-chartjs-2";
import type { Chart as ChartInstance, ChartData, ChartOptions } from "chart.js";
import { buildChartOptions, registerChartInstance, unregisterChartInstance } from "../../lib/chartjsTheme";

type HeightSpec = { xs: number; sm?: number; md?: number; lg?: number };

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

  useEffect(() => {
    const chart = chartRef.current;
    registerChartInstance(chart);
    return () => unregisterChartInstance(chart);
  }, []);

  return (
    <Box sx={{ height, width: "100%" }}>
      <Line ref={chartRef} data={data} options={buildChartOptions(options || {}) as ChartOptions<"line">} />
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

  useEffect(() => {
    const chart = chartRef.current;
    registerChartInstance(chart);
    return () => unregisterChartInstance(chart);
  }, []);

  return (
    <Box sx={{ height, width: "100%" }}>
      <Bar ref={chartRef} data={data} options={buildChartOptions(options || {}) as ChartOptions<"bar">} />
    </Box>
  );
}
