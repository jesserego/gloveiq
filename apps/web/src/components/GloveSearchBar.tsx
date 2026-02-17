import React, { useState } from "react";
import {
  Box,
  Button,
  IconButton,
  InputBase,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import SportsBaseballIcon from "@mui/icons-material/SportsBaseball";
import PublicIcon from "@mui/icons-material/Public";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string) => void;
  onIQMode: (seedQuery: string) => void;
  manufacturers?: string[];
  selectedManufacturer?: string;
  onSelectManufacturer?: (manufacturer: string) => void;
  regions?: string[];
  selectedRegion?: string;
  onSelectRegion?: (region: string) => void;
};

export default function GloveSearchBar({
  value,
  onChange,
  onSearch,
  onIQMode,
  manufacturers = [],
  selectedManufacturer = "",
  onSelectManufacturer,
  regions = [],
  selectedRegion = "",
  onSelectRegion,
}: Props) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const toneBase = isDark ? "#fff" : "#000";
  const toneInverse = isDark ? "#000" : "#fff";
  const [manufacturerAnchor, setManufacturerAnchor] = useState<HTMLElement | null>(null);
  const [regionAnchor, setRegionAnchor] = useState<HTMLElement | null>(null);

  return (
    <Box
      sx={{
        width: "100%",
        minHeight: 58,
        borderRadius: 999,
        border: "1px solid",
        borderColor: alpha(toneBase, isDark ? 0.23 : 0.2),
        bgcolor: alpha(toneBase, isDark ? 0.03 : 0.02),
        boxShadow: `0 2px 8px ${alpha(toneInverse, isDark ? 0.45 : 0.14)}`,
        px: { xs: 1.1, sm: 1.5 },
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        transition: "box-shadow .16s ease, border-color .16s ease",
        "&:focus-within": {
          borderColor: alpha("#0A84FF", 0.92),
          boxShadow: `0 0 0 3px ${alpha("#0A84FF", isDark ? 0.3 : 0.16)}, 0 2px 10px ${alpha(toneInverse, isDark ? 0.5 : 0.22)}`,
        },
      }}
    >
      <Tooltip title="Search">
        <IconButton aria-label="Search" onClick={() => onSearch(value)} size="small">
          <SearchIcon sx={{ color: alpha(theme.palette.text.primary, 0.78) }} />
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
              fontSize: { xs: 16, sm: 18 },
              lineHeight: 1.3,
              "::placeholder": {
                color: alpha(theme.palette.text.primary, 0.62),
                opacity: 1,
              },
            },
          }}
        />
      </Box>

      <Stack direction="row" spacing={0.2} sx={{ alignItems: "center" }}>
        <Tooltip title={selectedRegion ? `Region: ${selectedRegion}` : "Select region"}>
          <IconButton
            aria-label="Region"
            onClick={(evt) => setRegionAnchor(evt.currentTarget)}
          >
            <PublicIcon sx={{ color: alpha(theme.palette.text.primary, 0.78) }} />
          </IconButton>
        </Tooltip>
        <Tooltip title={selectedManufacturer ? `Brand: ${selectedManufacturer}` : "Select brand"}>
          <IconButton
            aria-label="Brand"
            onClick={(evt) => setManufacturerAnchor(evt.currentTarget)}
          >
            <SportsBaseballIcon sx={{ color: alpha(theme.palette.text.primary, 0.78) }} />
          </IconButton>
        </Tooltip>
        <Button
          aria-label="IQ Mode"
          variant="outlined"
          onClick={() => onIQMode(value)}
          startIcon={<AutoAwesomeRoundedIcon sx={{ fontSize: 16 }} />}
          sx={{
            borderRadius: 999,
            minWidth: 108,
            px: 1.45,
            height: 36,
            borderColor: alpha(toneBase, isDark ? 0.26 : 0.24),
            color: "text.primary",
            backgroundColor: alpha(toneBase, isDark ? 0.05 : 0.04),
            "&:hover": {
              borderColor: alpha(toneBase, isDark ? 0.38 : 0.34),
              backgroundColor: alpha(toneBase, isDark ? 0.1 : 0.08),
            },
          }}
        >
          IQ Mode
        </Button>
      </Stack>

      <Menu anchorEl={regionAnchor} open={Boolean(regionAnchor)} onClose={() => setRegionAnchor(null)}>
        <MenuItem onClick={() => { onSelectRegion?.(""); setRegionAnchor(null); }}>All regions</MenuItem>
        {regions.map((region) => (
          <MenuItem
            key={region}
            selected={selectedRegion === region}
            onClick={() => {
              onSelectRegion?.(region);
              setRegionAnchor(null);
            }}
          >
            {region}
          </MenuItem>
        ))}
      </Menu>

      <Menu anchorEl={manufacturerAnchor} open={Boolean(manufacturerAnchor)} onClose={() => setManufacturerAnchor(null)}>
        <MenuItem onClick={() => { onSelectManufacturer?.(""); setManufacturerAnchor(null); }}>
          All brands
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
    </Box>
  );
}
