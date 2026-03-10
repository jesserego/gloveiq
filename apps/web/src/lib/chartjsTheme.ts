import {
  Chart,
  ArcElement,
  BarElement,
  BubbleController,
  CategoryScale,
  DoughnutController,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  RadarController,
  RadialLinearScale,
  Tooltip,
  type ChartOptions,
} from "chart.js";

Chart.register(
  ArcElement,
  BarElement,
  BubbleController,
  CategoryScale,
  DoughnutController,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  RadarController,
  RadialLinearScale,
  Tooltip,
);

type ChartThemeTokens = {
  bgCard: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  positive: string;
  negative: string;
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  grid: string;
  axisBorder: string;
  isDark: boolean;
};

const chartRegistry = new Set<Chart>();
let themeSyncBound = false;

export function getCssVar(name: string, fallback = ""): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export function hexToRgba(hex: string, alpha: number): string {
  const raw = String(hex || "").trim();
  if (!raw) return `rgba(148,163,184,${alpha})`;
  if (raw.startsWith("rgba") || raw.startsWith("rgb")) {
    const nums = raw.match(/\d+(?:\.\d+)?/g);
    if (!nums || nums.length < 3) return raw;
    return `rgba(${nums[0]}, ${nums[1]}, ${nums[2]}, ${alpha})`;
  }

  let normalized = raw.replace(/^#/, "");
  if (normalized.length === 3 || normalized.length === 4) {
    normalized = normalized
      .split("")
      .map((ch) => ch + ch)
      .join("");
  }
  if (normalized.length !== 6 && normalized.length !== 8) return raw;

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function readChartThemeTokens(): ChartThemeTokens {
  const mode = typeof document !== "undefined" ? document.documentElement.getAttribute("data-theme") : null;
  const isDark = mode === "dark";
  const gridAlpha = isDark ? 0.2 : 0.35;

  const border = getCssVar("--color-border", "#94a3b8");
  return {
    bgCard: getCssVar("--color-bg-card", isDark ? "#1c1c1e" : "#ffffff"),
    border,
    textPrimary: getCssVar("--color-text-primary", isDark ? "#f2f2f7" : "#1c1c1e"),
    textSecondary: getCssVar("--color-text-secondary", isDark ? "#c7c7cc" : "#3c3c43"),
    accent: getCssVar("--color-accent", "#0A84FF"),
    positive: getCssVar("--color-positive", "#30D158"),
    negative: getCssVar("--color-negative", "#FF453A"),
    chart1: getCssVar("--color-chart-1", "#4F8BFF"),
    chart2: getCssVar("--color-chart-2", "#FF4DE1"),
    chart3: getCssVar("--color-chart-3", "#6EE7B7"),
    chart4: getCssVar("--color-chart-4", "#F8E71C"),
    grid: hexToRgba(border, gridAlpha),
    axisBorder: hexToRgba(border, isDark ? 0.4 : 0.65),
    isDark,
  };
}

export function applyChartJsDefaults() {
  const tokens = readChartThemeTokens();
  const fontFamily = typeof window !== "undefined"
    ? getComputedStyle(document.body).fontFamily || "inherit"
    : "inherit";

  Chart.defaults.color = tokens.textSecondary;
  Chart.defaults.font.family = fontFamily;
  Chart.defaults.font.size = 12;

  Chart.defaults.plugins.legend.labels.color = tokens.textSecondary;
  Chart.defaults.plugins.tooltip.backgroundColor = tokens.bgCard;
  Chart.defaults.plugins.tooltip.borderColor = tokens.border;
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.titleColor = tokens.textPrimary;
  Chart.defaults.plugins.tooltip.bodyColor = tokens.textSecondary;
  Chart.defaults.plugins.tooltip.displayColors = true;
  Chart.defaults.plugins.tooltip.cornerRadius = 10;

  Chart.defaults.scale.grid.color = tokens.grid;
  Chart.defaults.scale.ticks.color = tokens.textSecondary;
  (Chart.defaults.scale as any).border = {
    ...((Chart.defaults.scale as any).border || {}),
    color: tokens.axisBorder,
  };
}

export function buildChartOptions<TType extends keyof ChartOptions>(baseOptions: ChartOptions = {}): ChartOptions {
  const tokens = readChartThemeTokens();
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: baseOptions.animation ?? {
      duration: 560,
      easing: "easeOutQuart",
    },
    transitions: {
      active: {
        animation: {
          duration: 180,
        },
      },
      ...(baseOptions.transitions || {}),
    },
    ...baseOptions,
    plugins: {
      legend: {
        labels: {
          color: tokens.textSecondary,
        },
      },
      tooltip: {
        backgroundColor: tokens.bgCard,
        borderColor: tokens.border,
        borderWidth: 1,
        titleColor: tokens.textPrimary,
        bodyColor: tokens.textSecondary,
        displayColors: true,
        cornerRadius: 10,
      },
      ...(baseOptions.plugins || {}),
    },
    scales: Object.fromEntries(
      Object.entries(baseOptions.scales || {}).map(([axisKey, axisValue]) => {
        if (!axisValue || typeof axisValue !== "object") return [axisKey, axisValue];
        return [
          axisKey,
          {
            ...(axisValue as object),
            grid: {
              color: tokens.grid,
              ...((axisValue as any).grid || {}),
            },
            ticks: {
              color: tokens.textSecondary,
              ...((axisValue as any).ticks || {}),
            },
            border: {
              color: tokens.axisBorder,
              ...((axisValue as any).border || {}),
            },
          },
        ];
      }),
    ),
  } as ChartOptions;
}

export function registerChartInstance(chart: Chart | null | undefined) {
  if (!chart) return;
  chartRegistry.add(chart);
}

export function unregisterChartInstance(chart: Chart | null | undefined) {
  if (!chart) return;
  chartRegistry.delete(chart);
}

export function updateRegisteredCharts() {
  chartRegistry.forEach((chart) => chart.update());
}

export function initChartThemeSync() {
  if (themeSyncBound || typeof window === "undefined") return;
  themeSyncBound = true;
  const onThemeChange = () => {
    applyChartJsDefaults();
    updateRegisteredCharts();
  };
  window.addEventListener("themechange", onThemeChange);
}
