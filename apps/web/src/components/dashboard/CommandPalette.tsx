import React, { useEffect, useMemo, useRef } from "react";
import {
  Box,
  Dialog,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import SportsBaseballRoundedIcon from "@mui/icons-material/SportsBaseballRounded";
import SellRoundedIcon from "@mui/icons-material/SellRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import TravelExploreRoundedIcon from "@mui/icons-material/TravelExploreRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import type { CommandResult, CommandResultType } from "./useCommandPalette";

const groupLabels: Record<CommandResultType, string> = {
  model: "Models",
  brand: "Brands",
  listing: "Listings",
  navigation: "Navigation",
  action: "Actions",
};

function resultIcon(type: CommandResultType) {
  if (type === "model") return <SportsBaseballRoundedIcon sx={{ fontSize: 16 }} />;
  if (type === "brand") return <StorefrontRoundedIcon sx={{ fontSize: 16 }} />;
  if (type === "listing") return <SellRoundedIcon sx={{ fontSize: 16 }} />;
  if (type === "navigation") return <TravelExploreRoundedIcon sx={{ fontSize: 16 }} />;
  return <BoltRoundedIcon sx={{ fontSize: 16 }} />;
}

export default function CommandPalette({
  open,
  query,
  onQuery,
  groupedResults,
  selectedIndex,
  onSelectIndex,
  onMove,
  onRun,
  onClose,
}: {
  open: boolean;
  query: string;
  onQuery: (next: string) => void;
  groupedResults: Record<CommandResultType, CommandResult[]>;
  selectedIndex: number;
  onSelectIndex: (next: number) => void;
  onMove: (delta: number) => void;
  onRun: () => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  const sections = useMemo(
    () => (Object.keys(groupLabels) as CommandResultType[])
      .map((type) => ({ type, label: groupLabels[type], items: groupedResults[type] }))
      .filter((section) => section.items.length > 0),
    [groupedResults],
  );

  let runningIndex = -1;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={false}
      PaperProps={{
        role: "dialog",
        "aria-label": "Command palette",
        sx: {
          width: { xs: "calc(100vw - 20px)", sm: 560, md: 640 },
          maxHeight: "78vh",
          borderRadius: 3,
          border: `1px solid ${theme.palette.divider}`,
          background: alpha(theme.palette.background.paper, isDark ? 0.96 : 0.98),
          boxShadow: isDark ? "0 22px 70px rgba(2,6,23,0.72)" : "0 18px 58px rgba(2,6,23,0.2)",
          backdropFilter: "blur(8px) saturate(120%)",
          overflow: "hidden",
        },
      }}
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: alpha(theme.palette.background.default, isDark ? 0.72 : 0.52),
          },
        },
      }}
    >
      <Box sx={{ p: 1.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <SearchRoundedIcon sx={{ color: "text.secondary", fontSize: 20 }} />
          <Box
            component="input"
            ref={inputRef}
            value={query}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => onQuery(event.target.value)}
            onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                onMove(1);
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                onMove(-1);
              } else if (event.key === "Enter") {
                event.preventDefault();
                onRun();
              } else if (event.key === "Escape") {
                event.preventDefault();
                onClose();
              }
            }}
            placeholder="Search gloves, brands, listings, or pages..."
            aria-label="Search commands"
            sx={{
              border: 0,
              outline: 0,
              background: "transparent",
              color: "text.primary",
              fontSize: 15,
              width: "100%",
              minWidth: 0,
              "&::placeholder": { color: "text.secondary", opacity: 0.95 },
            }}
          />
          <Box sx={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 11, color: "text.secondary", border: `1px solid ${theme.palette.divider}`, px: 0.8, py: 0.2, borderRadius: 1 }}>
            Esc
          </Box>
        </Stack>
      </Box>

      <Box role="listbox" aria-label="Command results" sx={{ px: 1, py: 1, overflowY: "auto" }}>
        {sections.length === 0 ? (
          <Box sx={{ p: 2.5 }}>
            <Typography variant="body2" color="text.secondary">No matching results.</Typography>
          </Box>
        ) : null}

        {sections.map((section) => (
          <Box key={section.type} sx={{ mb: 1.25 }}>
            <Typography variant="caption" sx={{ px: 1.1, textTransform: "uppercase", letterSpacing: 0.7, color: "text.secondary", fontWeight: 700 }}>
              {section.label}
            </Typography>
            <Box sx={{ mt: 0.55 }}>
              {section.items.map((item) => {
                runningIndex += 1;
                const rowIndex = runningIndex;
                const selected = rowIndex === selectedIndex;
                return (
                  <Box
                    key={item.id}
                    role="option"
                    aria-selected={selected}
                    onMouseEnter={() => onSelectIndex(rowIndex)}
                    onClick={() => {
                      onSelectIndex(rowIndex);
                      onRun();
                    }}
                    sx={{
                      mx: 0.2,
                      mb: 0.45,
                      px: 1,
                      py: 0.95,
                      borderRadius: 1.7,
                      border: "1px solid",
                      borderColor: selected ? alpha(theme.palette.primary.main, 0.6) : "transparent",
                      backgroundColor: selected ? alpha(theme.palette.primary.main, 0.16) : "transparent",
                      cursor: "pointer",
                      opacity: item.locked ? 0.72 : 1,
                      transition: "all 140ms ease",
                      "&:hover": {
                        borderColor: alpha(theme.palette.primary.main, 0.5),
                        backgroundColor: alpha(theme.palette.primary.main, 0.14),
                      },
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                        <Box sx={{ width: 22, height: 22, borderRadius: 1, border: `1px solid ${theme.palette.divider}`, display: "grid", placeItems: "center", color: "text.secondary", flexShrink: 0 }}>
                          {resultIcon(item.type)}
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>{item.title}</Typography>
                          {item.subtitle ? <Typography variant="caption" color="text.secondary" noWrap>{item.subtitle}</Typography> : null}
                        </Box>
                      </Stack>
                      {item.locked ? (
                        <Stack direction="row" spacing={0.55} alignItems="center" sx={{ color: "warning.main", flexShrink: 0 }}>
                          <LockRoundedIcon sx={{ fontSize: 14 }} />
                          <Typography variant="caption" sx={{ fontWeight: 700 }}>Locked</Typography>
                        </Stack>
                      ) : null}
                    </Stack>
                  </Box>
                );
              })}
            </Box>
          </Box>
        ))}
      </Box>
    </Dialog>
  );
}
