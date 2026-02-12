import { createTheme } from "@mui/material";

export type AppThemeMode = "light" | "dark";

export function buildAppTheme(mode: AppThemeMode) {
  const isDark = mode === "dark";
  return createTheme({
    palette: {
      mode,
      primary: { main: "#3763E9", dark: "#314FC7" },
      secondary: { main: "#3B82F6" },
      success: { main: "#22C55E" },
      warning: { main: "#F59E0B" },
      error: { main: "#EF4444" },
      info: { main: "#3B82F6" },
      divider: isDark ? "#2A3142" : "#E3E8EF",
      background: isDark
        ? { default: "#0B0E14", paper: "#121826" }
        : { default: "#F9FAFC", paper: "#FFFFFF" },
      text: isDark
        ? { primary: "#E5E7EB", secondary: "#9CA3AF" }
        : { primary: "#111827", secondary: "#6B7280" },
    },
    shape: { borderRadius: 8 },
    typography: {
      fontFamily: [
        "Inter",
        "ui-sans-serif",
        "system-ui",
        "sans-serif",
      ].join(","),
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            margin: 0,
            background: isDark
              ? "radial-gradient(1000px 560px at 10% -10%, rgba(55,99,233,.18), transparent 60%), radial-gradient(860px 520px at 90% 0%, rgba(59,130,246,.12), transparent 60%), linear-gradient(180deg,#0B0E14,#121826)"
              : "radial-gradient(1000px 560px at 10% -10%, rgba(55,99,233,.10), transparent 60%), radial-gradient(860px 520px at 90% 0%, rgba(59,130,246,.08), transparent 60%), linear-gradient(180deg,#F9FAFC,#F2F4F7)",
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            border: `1px solid ${isDark ? "#2A3142" : "#E3E8EF"}`,
            background: isDark ? "#121826" : "#FFFFFF",
            boxShadow: isDark ? "0px 1px 2px rgba(0,0,0,0.40)" : "0px 1px 3px rgba(0,0,0,0.08)",
            borderRadius: 8,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            border: `1px solid ${isDark ? "#2A3142" : "#E3E8EF"}`,
            backgroundColor: isDark ? "#1A2233" : "#F2F4F7",
            color: isDark ? "#E5E7EB" : "#111827",
            fontWeight: 700,
            fontSize: 12,
            letterSpacing: ".02em",
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            border: `1px solid ${isDark ? "#2A3142" : "#E3E8EF"}`,
            backgroundColor: isDark ? "#121826" : "#FFFFFF",
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            textTransform: "none",
            fontWeight: 700,
          },
          contained: {
            background: "linear-gradient(180deg, #3763E9, #314FC7)",
            border: "1px solid rgba(49,79,199,.36)",
            color: "#FFFFFF",
            boxShadow: isDark ? "0px 1px 2px rgba(0,0,0,0.40)" : "0px 1px 3px rgba(0,0,0,0.08)",
            "&:hover": {
              background: "#314FC7",
            },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            backgroundColor: isDark ? "#121826" : "#FFFFFF",
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            "& .MuiInputLabel-root": { color: isDark ? "#9CA3AF" : "#6B7280" },
            "& .MuiOutlinedInput-notchedOutline": { borderColor: isDark ? "#2A3142" : "#E3E8EF" },
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            borderRadius: 8,
            border: `1px solid ${isDark ? "#2A3142" : "#E3E8EF"}`,
            backgroundColor: isDark ? "#1A2233" : "#111827",
            color: "#F9FAFC",
            fontSize: 12,
            fontWeight: 600,
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
              backgroundColor: "#3763E9",
              opacity: 1,
            },
          },
          track: {
            borderRadius: 999,
            backgroundColor: isDark ? "#2A3142" : "#A1B0D9",
            opacity: 1,
          },
        },
      },
    },
  });
}
