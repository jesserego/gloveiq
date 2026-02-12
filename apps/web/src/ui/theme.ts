import { createTheme } from "@mui/material";

export const appTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#2b7fff" },
    secondary: { main: "#18a56b" },
    background: { default: "#f6f7f5", paper: "rgba(255,255,255,0.75)" },
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
            "radial-gradient(1100px 600px at 20% -10%, rgba(24,165,107,.12), transparent 60%), radial-gradient(900px 550px at 90% 0%, rgba(43,127,255,.10), transparent 60%), linear-gradient(180deg,#f6f7f5,#f6f7f5)",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: "1px solid rgba(15,23,42,0.09)",
          background: "rgba(255,255,255,0.72)",
          backdropFilter: "blur(14px) saturate(160%)",
          boxShadow: "0 14px 40px rgba(15,23,42,.08)",
          borderRadius: 18,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          border: "1px solid rgba(15,23,42,.1)",
          backgroundColor: "rgba(255,255,255,0.72)",
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
          background: "linear-gradient(135deg, rgba(43,127,255,0.16), rgba(24,165,107,0.1))",
          border: "1px solid rgba(43,127,255,.22)",
          color: "#0f172a",
          boxShadow: "none",
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          backgroundColor: "rgba(255,255,255,0.72)",
        },
      },
    },
  },
});
