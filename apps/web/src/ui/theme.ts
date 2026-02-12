import { createTheme } from "@mui/material";

export const appTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#0a84ff" },
    secondary: { main: "#30d158" },
    background: { default: "#111319", paper: "rgba(39,43,54,0.92)" },
    text: { primary: "rgba(246,248,252,0.96)", secondary: "rgba(197,204,216,0.78)" },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: [
      "SF Pro Text",
      "SF Pro Display",
      "-apple-system",
      "BlinkMacSystemFont",
      "Segoe UI",
      "Roboto",
      "Helvetica Neue",
      "Arial",
    ].join(","),
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          margin: 0,
          background:
            "radial-gradient(1100px 600px at 20% -10%, rgba(10,132,255,.18), transparent 60%), radial-gradient(900px 550px at 90% 0%, rgba(48,209,88,.12), transparent 60%), linear-gradient(180deg,#111319,#131620)",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(37,41,50,0.92)",
          backdropFilter: "blur(20px) saturate(120%)",
          boxShadow: "0 16px 36px rgba(0,0,0,.35)",
          borderRadius: 12,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,.12)",
          backgroundColor: "rgba(255,255,255,.03)",
          color: "rgba(236,242,255,0.92)",
          fontWeight: 700,
          fontSize: 11,
          letterSpacing: ".02em",
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
          root: {
            borderRadius: 12,
          border: "1px solid rgba(255,255,255,.1)",
          backgroundColor: "rgba(255,255,255,.04)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          textTransform: "none",
          fontWeight: 700,
        },
        contained: {
          background: "linear-gradient(180deg, rgba(31,136,255,0.95), rgba(11,120,243,0.95))",
          border: "1px solid rgba(128,194,255,.35)",
          color: "#f5f9ff",
          boxShadow: "0 1px 0 rgba(255,255,255,.2) inset",
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          backgroundColor: "rgba(255,255,255,0.03)",
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiInputLabel-root": { color: "rgba(188,201,224,0.72)" },
          "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.14)" },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,.12)",
          backgroundColor: "rgba(34,38,48,0.95)",
          color: "rgba(242,246,255,.95)",
          fontSize: 11,
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
          backgroundColor: "rgba(255,255,255,.2)",
          opacity: 1,
        },
      },
    },
  },
});
