import React, { useState } from "react";
import {
  Avatar,
  Box,
  IconButton,
  InputBase,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";
import MicNoneOutlinedIcon from "@mui/icons-material/MicNoneOutlined";
import CameraAltOutlinedIcon from "@mui/icons-material/CameraAltOutlined";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import AddIcon from "@mui/icons-material/Add";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import SportsBaseballIcon from "@mui/icons-material/SportsBaseball";
import PublicIcon from "@mui/icons-material/Public";

export type GloveShortcut = {
  id: string;
  label: string;
  imageUrl?: string;
  initials?: string;
  onClick?: () => void;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string) => void;
  onIQMode: (seedQuery: string) => void;
  shortcuts: GloveShortcut[];
  onVoice?: () => void;
  onImage?: () => void;
  manufacturers?: string[];
  selectedManufacturer?: string;
  onSelectManufacturer?: (manufacturer: string) => void;
  onGlobalStats?: () => void;
};

function ShortcutItem({ shortcut }: { shortcut: GloveShortcut }) {
  const isAddShortcut = shortcut.id === "add-shortcut";
  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={shortcut.onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          shortcut.onClick?.();
        }
      }}
      sx={{
        width: 92,
        cursor: shortcut.onClick ? "pointer" : "default",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 0.7,
        "&:focus-visible": {
          outline: "2px solid",
          outlineColor: "primary.main",
          outlineOffset: 3,
          borderRadius: 2,
        },
      }}
    >
      <Avatar
        src={shortcut.imageUrl}
        alt={shortcut.label}
        sx={{
          width: 48,
          height: 48,
          bgcolor: alpha("#fff", 0.14),
          color: "text.primary",
          border: "1px solid",
          borderColor: alpha("#fff", 0.18),
          transition: "transform .15s ease, border-color .15s ease, background-color .15s ease",
          "&:hover": {
            transform: "translateY(-1px)",
            borderColor: alpha("#fff", 0.34),
            backgroundColor: alpha("#fff", 0.2),
          },
        }}
      >
        {isAddShortcut ? <AddIcon /> : shortcut.initials || shortcut.label.slice(0, 1).toUpperCase()}
      </Avatar>
      <Typography
        variant="caption"
        sx={{
          maxWidth: "100%",
          color: "text.secondary",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          textAlign: "center",
        }}
      >
        {shortcut.label}
      </Typography>
    </Box>
  );
}

export default function GloveSearchBar({
  value,
  onChange,
  onSearch,
  onIQMode,
  shortcuts,
  onVoice,
  onImage,
  manufacturers = [],
  selectedManufacturer = "",
  onSelectManufacturer,
  onGlobalStats,
}: Props) {
  const [moreAnchor, setMoreAnchor] = useState<HTMLElement | null>(null);
  const [manufacturerAnchor, setManufacturerAnchor] = useState<HTMLElement | null>(null);

  return (
    <Stack spacing={2.2} sx={{ width: "100%", maxWidth: 760, mx: "auto", alignItems: "center" }}>
      <Box
        sx={{
          width: "100%",
          minHeight: 58,
          borderRadius: 999,
          border: "1px solid",
          borderColor: alpha("#fff", 0.23),
          bgcolor: alpha("#fff", 0.03),
          boxShadow: `0 2px 8px ${alpha("#000", 0.45)}`,
          px: { xs: 1.1, sm: 1.5 },
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          transition: "box-shadow .16s ease, border-color .16s ease",
          "&:focus-within": {
            borderColor: alpha("#9CC8FF", 0.92),
            boxShadow: `0 0 0 3px ${alpha("#0A84FF", 0.3)}, 0 2px 10px ${alpha("#000", 0.5)}`,
          },
        }}
      >
        <Tooltip title="Search">
          <IconButton aria-label="Search" onClick={() => onSearch(value)} size="small">
            <SearchIcon sx={{ color: alpha("#fff", 0.76) }} />
          </IconButton>
        </Tooltip>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <label htmlFor="glove-search-input" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
            Search for gloves and artifacts
          </label>
          <InputBase
            id="glove-search-input"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onSearch(value);
            }}
            placeholder="Paste listing link, model, or artifact"
            inputProps={{ "aria-label": "Paste listing link, model, or artifact" }}
            sx={{
              width: "100%",
              color: "text.primary",
              "& .MuiInputBase-input": {
                py: 1.35,
                px: 0.7,
                fontSize: { xs: 16, sm: 20 },
                lineHeight: 1.3,
                "::placeholder": {
                  color: alpha("#fff", 0.68),
                  opacity: 1,
                },
              },
            }}
          />
        </Box>

        <Stack direction="row" spacing={0.2} sx={{ alignItems: "center" }}>
          <Tooltip title={selectedManufacturer ? `Manufacturer: ${selectedManufacturer}` : "Select manufacturer"}>
            <IconButton
              aria-label="Manufacturer"
              onClick={(evt) => setManufacturerAnchor(evt.currentTarget)}
              sx={{ display: { xs: "none", sm: "inline-flex" } }}
            >
              <SportsBaseballIcon sx={{ color: alpha("#fff", 0.78) }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Global baseball statistics">
            <IconButton aria-label="Global stats" onClick={onGlobalStats} sx={{ display: { xs: "none", sm: "inline-flex" } }}>
              <PublicIcon sx={{ color: alpha("#fff", 0.78) }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Voice search">
            <IconButton aria-label="Voice" onClick={onVoice} sx={{ display: { xs: "none", sm: "inline-flex" } }}>
              <MicNoneOutlinedIcon sx={{ color: alpha("#fff", 0.78) }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Image search">
            <IconButton aria-label="Image" onClick={onImage} sx={{ display: { xs: "none", sm: "inline-flex" } }}>
              <CameraAltOutlinedIcon sx={{ color: alpha("#fff", 0.78) }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="More">
            <IconButton aria-label="More" onClick={(evt) => setMoreAnchor(evt.currentTarget)} sx={{ display: { xs: "inline-flex", sm: "none" } }}>
              <MoreHorizIcon sx={{ color: alpha("#fff", 0.78) }} />
            </IconButton>
          </Tooltip>

          <Box
            role="button"
            tabIndex={0}
            aria-label="IQ Mode"
            onClick={() => onIQMode(value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onIQMode(value);
              }
            }}
            sx={{
              ml: 0.25,
              borderRadius: 999,
              border: "1px solid",
              borderColor: alpha("#fff", 0.22),
              px: { xs: 1.05, sm: 1.45 },
              py: 0.7,
              minWidth: 88,
              display: "flex",
              alignItems: "center",
              gap: 0.45,
              bgcolor: alpha("#fff", 0.06),
              cursor: "pointer",
              transition: "background-color .15s ease, border-color .15s ease",
              "&:hover": { bgcolor: alpha("#fff", 0.12), borderColor: alpha("#fff", 0.35) },
              "&:focus-visible": {
                outline: "2px solid",
                outlineColor: "primary.main",
                outlineOffset: 2,
              },
            }}
          >
            <AutoAwesomeRoundedIcon sx={{ fontSize: 16, color: alpha("#fff", 0.9) }} />
            <Typography sx={{ fontSize: 16, fontWeight: 700, lineHeight: 1, color: "text.primary" }}>IQ Mode</Typography>
          </Box>
        </Stack>
      </Box>

      <Stack direction="row" spacing={1.4} sx={{ width: "100%", justifyContent: "center", flexWrap: "wrap", rowGap: 1.2 }}>
        {shortcuts.map((shortcut) => (
          <ShortcutItem key={shortcut.id} shortcut={shortcut} />
        ))}
        <ShortcutItem shortcut={{ id: "add-shortcut", label: "Add shortcut", onClick: undefined }} />
      </Stack>

      <Menu anchorEl={moreAnchor} open={Boolean(moreAnchor)} onClose={() => setMoreAnchor(null)}>
        <MenuItem onClick={() => { setManufacturerAnchor(moreAnchor); setMoreAnchor(null); }}>Manufacturers</MenuItem>
        <MenuItem onClick={() => { onGlobalStats?.(); setMoreAnchor(null); }}>Global stats</MenuItem>
        <MenuItem onClick={() => { onVoice?.(); setMoreAnchor(null); }}>Voice</MenuItem>
        <MenuItem onClick={() => { onImage?.(); setMoreAnchor(null); }}>Image</MenuItem>
      </Menu>
      <Menu anchorEl={manufacturerAnchor} open={Boolean(manufacturerAnchor)} onClose={() => setManufacturerAnchor(null)}>
        <MenuItem onClick={() => { onSelectManufacturer?.(""); setManufacturerAnchor(null); }}>
          All manufacturers
        </MenuItem>
        {manufacturers.map((name) => (
          <MenuItem
            key={name}
            selected={selectedManufacturer === name}
            onClick={() => {
              onSelectManufacturer?.(name);
              setManufacturerAnchor(null);
            }}
          >
            {name}
          </MenuItem>
        ))}
      </Menu>
    </Stack>
  );
}
