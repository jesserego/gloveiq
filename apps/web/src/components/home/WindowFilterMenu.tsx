import React, { useState } from "react";
import { IconButton, Menu, MenuItem, Tooltip } from "@mui/material";
import TuneIcon from "@mui/icons-material/Tune";
import type { HomeWindowKey } from "../../lib/homeMarketUtils";

export type WindowFilterOption = {
  key: HomeWindowKey;
  label: string;
};

export default function WindowFilterMenu({
  selected,
  options,
  onChange,
  tooltip = "Filter time window",
}: {
  selected: HomeWindowKey;
  options: WindowFilterOption[];
  onChange: (next: HomeWindowKey) => void;
  tooltip?: string;
}) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  return (
    <>
      <Tooltip title={tooltip} arrow>
        <IconButton size="small" onClick={(event) => setAnchorEl(event.currentTarget)}>
          <TuneIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        {options.map((option) => (
          <MenuItem
            key={option.key}
            selected={selected === option.key}
            onClick={() => {
              onChange(option.key);
              setAnchorEl(null);
            }}
          >
            {option.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
