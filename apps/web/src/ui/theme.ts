import { createTheme } from "@mui/material";

export const appTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#3763E9", dark: "#314FC7" },
    secondary: { main: "#3B82F6" },
    success: { main: "#22C55E" },
    warning: { main: "#F59E0B" },
    error: { main: "#EF4444" },
    info: { main: "#3B82F6" },
    divider: "#E3E8EF",
    background: { default: "#F9FAFC", paper: "#FFFFFF" },
    text: { primary: "#111827", secondary: "#6B7280" },
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
          background:
            "radial-gradient(1000px 560px at 10% -10%, rgba(55,99,233,.10), transparent 60%), radial-gradient(860px 520px at 90% 0%, rgba(59,130,246,.08), transparent 60%), linear-gradient(180deg,#F9FAFC,#F2F4F7)",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: "1px solid #E3E8EF",
          background: "#FFFFFF",
          boxShadow: "0px 1px 3px rgba(0,0,0,0.08)",
          borderRadius: 8,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          border: "1px solid #E3E8EF",
          backgroundColor: "#F2F4F7",
          color: "#111827",
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
          border: "1px solid #E3E8EF",
          backgroundColor: "#FFFFFF",
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
          boxShadow: "0px 1px 3px rgba(0,0,0,0.08)",
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
          backgroundColor: "#FFFFFF",
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiInputLabel-root": { color: "#6B7280" },
          "& .MuiOutlinedInput-notchedOutline": { borderColor: "#E3E8EF" },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: 8,
          border: "1px solid #E3E8EF",
          backgroundColor: "#111827",
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
            backgroundColor: "#0a84ff",
            opacity: 1,
          },
        },
        track: {
          borderRadius: 999,
          backgroundColor: "#A1B0D9",
          opacity: 1,
        },
      },
    },
  },
});
