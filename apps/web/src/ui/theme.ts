import { createTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";

export type AppThemeMode = "light" | "dark";

export function buildAppTheme(mode: AppThemeMode) {
  const isDark = mode === "dark";
  const surface = isDark ? alpha("#0B1220", 0.86) : alpha("#FFFFFF", 0.95);
  const elevated = isDark ? alpha("#111C30", 0.9) : alpha("#F8FAFC", 0.98);
  const border = isDark ? alpha("#C9D3E0", 0.16) : alpha("#0F172A", 0.1);
  const fill = isDark ? alpha("#334155", 0.5) : alpha("#CBD5E1", 0.38);

  return createTheme({
    palette: {
      mode,
      primary: { main: "#22C55E", dark: "#16A34A" },
      secondary: { main: "#38BDF8" },
      success: { main: "#22C55E" },
      warning: { main: "#F59E0B" },
      error: { main: "#EF4444" },
      info: { main: "#38BDF8" },
      divider: border,
      background: isDark
        ? { default: "#070B14", paper: surface }
        : { default: "#F1F5F9", paper: surface },
      text: isDark
        ? { primary: "#E2E8F0", secondary: "rgba(203,213,225,0.76)" }
        : { primary: "#0F172A", secondary: "rgba(51,65,85,0.78)" },
    },
    shape: { borderRadius: 8 },
    typography: {
      fontFamily: [
        "-apple-system",
        "BlinkMacSystemFont",
        '"SF Pro Text"',
        '"SF Pro Display"',
        '"Helvetica Neue"',
        "Arial",
        "sans-serif",
      ].join(","),
      h6: { fontWeight: 700, letterSpacing: "-0.01em" },
      subtitle2: { fontWeight: 700, letterSpacing: "-0.01em" },
      body2: { lineHeight: 1.45 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          "*": {
            WebkitFontSmoothing: "antialiased",
            MozOsxFontSmoothing: "grayscale",
          },
          ":root, [data-theme='light']": {
            "--color-bg-card": "#ffffff",
            "--color-border": "#a1a1aa",
            "--color-text-primary": "#1c1c1e",
            "--color-text-secondary": "#52525b",
            "--color-accent": "#22c55e",
            "--color-positive": "#16a34a",
            "--color-negative": "#ef4444",
            "--color-chart-1": "#22c55e",
            "--color-chart-2": "#38bdf8",
            "--color-chart-3": "#6366f1",
            "--color-chart-4": "#f59e0b",
          } as any,
          "[data-theme='dark']": {
            "--color-bg-card": "#0f172a",
            "--color-border": "#334155",
            "--color-text-primary": "#e2e8f0",
            "--color-text-secondary": "#94a3b8",
            "--color-accent": "#22c55e",
            "--color-positive": "#22c55e",
            "--color-negative": "#ef4444",
            "--color-chart-1": "#4ade80",
            "--color-chart-2": "#38bdf8",
            "--color-chart-3": "#818cf8",
            "--color-chart-4": "#fbbf24",
          } as any,
          body: {
            margin: 0,
            background: isDark
              ? "radial-gradient(1000px 560px at 8% -10%, rgba(34,197,94,.2), transparent 65%), radial-gradient(920px 540px at 92% -14%, rgba(56,189,248,.12), transparent 62%), linear-gradient(180deg,#070B14,#0B1220)"
              : "radial-gradient(980px 540px at 8% -10%, rgba(34,197,94,.12), transparent 64%), radial-gradient(920px 540px at 92% -14%, rgba(56,189,248,.08), transparent 60%), linear-gradient(180deg,#F8FAFC,#EEF2F7)",
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            backgroundColor: surface,
            border: `1px solid ${border}`,
            backdropFilter: "blur(10px) saturate(120%)",
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            border: `1px solid ${border}`,
            backgroundColor: elevated,
            backdropFilter: "blur(10px) saturate(118%)",
            boxShadow: isDark ? "0 10px 24px rgba(2,6,23,0.38)" : "0 6px 18px rgba(15,23,42,0.08)",
            borderRadius: 10,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            border: `1px solid ${border}`,
            backgroundColor: fill,
            color: isDark ? "#F2F2F7" : "#1C1C1E",
            fontWeight: 600,
            fontSize: 12,
            letterSpacing: ".01em",
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 14,
            border: `1px solid ${border}`,
            backgroundColor: elevated,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            textTransform: "none",
            fontWeight: 600,
            minHeight: 32,
            letterSpacing: "0.01em",
          },
          contained: {
            background: "linear-gradient(180deg, #22C55E, #16A34A)",
            border: "1px solid rgba(21,128,61,.55)",
            color: "#FFFFFF",
            boxShadow: isDark ? "0 8px 16px rgba(34,197,94,0.28)" : "0 6px 14px rgba(22,163,74,0.2)",
            "&:hover": {
              background: "#16A34A",
            },
          },
          outlined: {
            borderColor: border,
            backgroundColor: fill,
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            backgroundColor: fill,
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: border,
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: alpha("#22C55E", 0.6),
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: "#22C55E",
              borderWidth: 1.5,
            },
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            "& .MuiInputLabel-root": { color: isDark ? "rgba(235,235,245,0.68)" : "rgba(60,60,67,0.68)" },
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            borderRadius: 12,
            border: `1px solid ${border}`,
            backgroundColor: isDark ? "rgba(44,44,46,0.95)" : "rgba(28,28,30,0.90)",
            color: "#F9FAFC",
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: ".01em",
          },
        },
      },
      MuiSwitch: {
        styleOverrides: {
          switchBase: {
            "&.Mui-checked": {
              color: "#ffffff",
            },
            "&.Mui-checked + .MuiSwitch-track": {
              backgroundColor: "#34C759",
              opacity: 1,
            },
          },
          track: {
            borderRadius: 999,
            backgroundColor: isDark ? "rgba(120,120,128,0.38)" : "rgba(120,120,128,0.28)",
            opacity: 1,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 14,
            border: `1px solid ${border}`,
            backgroundColor: elevated,
            backdropFilter: "blur(10px) saturate(120%)",
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            height: 7,
            backgroundColor: fill,
          },
          bar: {
            borderRadius: 999,
          },
        },
      },
    },
  });
}
