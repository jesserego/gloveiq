import React from "react";
import { Chip, FormControl, MenuItem, Select, Stack, Typography } from "@mui/material";
import { Tier, TierOrder } from "@gloveiq/shared";
import { Button } from "../ui/Primitives";
import { useTier } from "../providers/TierProvider";

export default function TierSwitch({ compact = false }: { compact?: boolean }) {
  const { tier, accountTier, isOverridden, setTierOverride, clearTierOverride } = useTier();

  return (
    <Stack spacing={0.8}>
      <Stack direction="row" spacing={0.8} alignItems="center" justifyContent="space-between">
        <Typography variant="caption" sx={{ fontWeight: 800 }}>Tier</Typography>
        {isOverridden ? <Chip size="small" label="Override" color="warning" /> : <Chip size="small" label={`Account ${accountTier}`} />}
      </Stack>
      <Stack direction={compact ? "column" : "row"} spacing={0.8}>
        <FormControl size="small" fullWidth>
          <Select
            value={tier}
            onChange={(event) => setTierOverride(event.target.value as Tier)}
            sx={{ minWidth: compact ? 0 : 160 }}
          >
            {TierOrder.map((value) => (
              <MenuItem key={value} value={value}>{value}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          color="inherit"
          sx={{ minWidth: compact ? 0 : 150 }}
          onClick={clearTierOverride}
          disabled={!isOverridden}
        >
          Reset to account tier
        </Button>
      </Stack>
    </Stack>
  );
}
