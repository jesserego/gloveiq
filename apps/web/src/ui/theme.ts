import { createTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";

export type AppThemeMode = "light" | "dark";

export function buildAppTheme(mode: AppThemeMode) {
  const isDark = mode === "dark";
  const surface = isDark ? alpha("#1C1C1E", 0.74) : alpha("#FFFFFF", 0.8);
  const elevated = isDark ? alpha("#2C2C2E", 0.82) : alpha("#FFFFFF", 0.92);
  const border = isDark ? alpha("#FFFFFF", 0.16) : alpha("#3C3C43", 0.18);
  const fill = isDark ? alpha("#636366", 0.34) : alpha("#787880", 0.16);

  return createTheme({
    palette: {
      mode,
      primary: { main: "#0A84FF", dark: "#0060DF" },
      secondary: { main: "#5AC8FA" },
      success: { main: "#30D158" },
      warning: { main: "#FF9F0A" },
      error: { main: "#FF453A" },
      info: { main: "#64D2FF" },
      divider: border,
      background: isDark
        ? { default: "#000000", paper: surface }
        : { default: "#F2F2F7", paper: surface },
      text: isDark
        ? { primary: "#F2F2F7", secondary: "rgba(235,235,245,0.72)" }
        : { primary: "#1C1C1E", secondary: "rgba(60,60,67,0.72)" },
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
          body: {
            margin: 0,
            background: isDark
              ? "radial-gradient(960px 520px at 8% -8%, rgba(10,132,255,.24), transparent 62%), radial-gradient(900px 520px at 92% -12%, rgba(94,92,230,.16), transparent 60%), linear-gradient(180deg,#000000,#101113)"
              : "radial-gradient(980px 540px at 8% -8%, rgba(10,132,255,.12), transparent 62%), radial-gradient(900px 540px at 90% -12%, rgba(94,92,230,.09), transparent 60%), linear-gradient(180deg,#F2F2F7,#EDEEF3)",
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            backgroundColor: surface,
            border: `1px solid ${border}`,
            backdropFilter: "blur(22px) saturate(135%)",
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            border: `1px solid ${border}`,
            backgroundColor: elevated,
            backdropFilter: "blur(22px) saturate(130%)",
            boxShadow: isDark ? "0 20px 42px rgba(0,0,0,0.45)" : "0 10px 28px rgba(15,23,42,0.10)",
            borderRadius: 8,
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
            background: "linear-gradient(180deg, #0A84FF, #0073F0)",
            border: "1px solid rgba(0,95,204,.44)",
            color: "#FFFFFF",
            boxShadow: isDark ? "0 8px 18px rgba(10,132,255,0.28)" : "0 6px 16px rgba(10,132,255,0.22)",
            "&:hover": {
              background: "#0073F0",
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
              borderColor: alpha("#0A84FF", 0.6),
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: "#0A84FF",
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
            borderRadius: 20,
            border: `1px solid ${border}`,
            backgroundColor: elevated,
            backdropFilter: "blur(26px) saturate(135%)",
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
