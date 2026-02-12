import { createTheme } from "@mui/material";

export const appTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#4a8dff" },
    secondary: { main: "#20c07a" },
    background: { default: "#0a0f1c", paper: "rgba(16,24,38,0.9)" },
    text: { primary: "rgba(241,245,255,0.95)", secondary: "rgba(179,192,214,0.78)" },
  },
  shape: { borderRadius: 14 },
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
            "radial-gradient(1100px 600px at 20% -10%, rgba(24,165,107,.16), transparent 60%), radial-gradient(900px 550px at 90% 0%, rgba(74,141,255,.18), transparent 60%), linear-gradient(180deg,#0a0f1c,#0c1322)",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: "1px solid rgba(255,255,255,0.1)",
          background: "rgba(17,24,39,0.88)",
          backdropFilter: "blur(14px) saturate(160%)",
          boxShadow: "0 14px 40px rgba(0,0,0,.28)",
          borderRadius: 18,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,.14)",
          backgroundColor: "rgba(255,255,255,.04)",
          color: "rgba(234,243,255,0.9)",
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
          border: "1px solid rgba(255,255,255,.12)",
          backgroundColor: "rgba(255,255,255,.04)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: "none",
          fontWeight: 700,
        },
        contained: {
          background: "linear-gradient(135deg, rgba(74,141,255,0.36), rgba(32,192,122,0.24))",
          border: "1px solid rgba(94,155,255,.35)",
          color: "#eaf3ff",
          boxShadow: "none",
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          backgroundColor: "rgba(255,255,255,0.04)",
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
  },
});
