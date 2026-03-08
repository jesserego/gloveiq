import React, { useMemo, useState } from "react";
import {
  Avatar,
  Badge,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  ListSubheader,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Tier } from "@gloveiq/shared";
import SearchIcon from "@mui/icons-material/Search";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import DatasetRoundedIcon from "@mui/icons-material/DatasetRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";

type DropdownOption = {
  label: string;
  value: string;
  group?: string;
};

const tierStyles: Record<Tier, { label: string; color: string }> = {
  [Tier.FREE]: { label: "FREE", color: "#94A3B8" },
  [Tier.COLLECTOR]: { label: "COLLECTOR", color: "#3B82F6" },
  [Tier.PRO]: { label: "PRO", color: "#A855F7" },
  [Tier.DEALER]: { label: "DEALER", color: "#F59E0B" },
};

export function SearchInput({
  onActivate,
  shortcutLabel,
}: {
  onActivate: () => void;
  shortcutLabel: string;
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        borderRadius: 2.5,
        px: 1.5,
        py: 1,
        border: `1px solid ${theme.palette.divider}`,
        backgroundColor: alpha(theme.palette.background.paper, isDark ? 0.52 : 0.9),
        boxShadow: isDark ? "0 4px 12px rgba(2,6,23,0.2)" : "0 2px 10px rgba(2,6,23,0.08)",
        transition: "box-shadow 180ms ease, border-color 180ms ease",
        "&:focus-within": {
          borderColor: alpha(theme.palette.primary.main, 0.72),
          boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.2)}`,
        },
      }}
    >
      <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
      <Box
        component="input"
        value=""
        readOnly
        onFocus={onActivate}
        onClick={onActivate}
        onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onActivate();
          }
        }}
        placeholder="Search gloves, models, brands..."
        aria-label="Search gloves, models, brands"
        sx={{
          border: 0,
          outline: 0,
          background: "transparent",
          color: "text.primary",
          fontSize: 14,
          width: "100%",
          minWidth: 0,
          "&::placeholder": { color: "text.secondary", opacity: 0.95 },
        }}
      />
      <Box
        sx={{
          flexShrink: 0,
          borderRadius: 1,
          px: 0.75,
          py: 0.25,
          border: `1px solid ${theme.palette.divider}`,
          bgcolor: alpha(theme.palette.background.default, isDark ? 0.72 : 0.7),
          color: "text.secondary",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 11,
          lineHeight: 1,
        }}
      >
        {shortcutLabel}
      </Box>
    </Box>
  );
}

export function HeaderDropdown({
  label,
  icon,
  value,
  options,
  onChange,
  compact,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  options: DropdownOption[];
  onChange: (next: string) => void;
  compact?: boolean;
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const selectedLabel = options.find((option) => option.value === value)?.label ?? label;
  const open = Boolean(anchorEl);

  return (
    <>
      <Tooltip title={compact ? label : ""}>
        <Button
          color="inherit"
          onClick={(event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget)}
          sx={{
            minWidth: compact ? 38 : "auto",
            px: compact ? 1 : 1.25,
            py: 0.7,
            borderRadius: 2.5,
            border: `1px solid ${theme.palette.divider}`,
            bgcolor: alpha(theme.palette.background.paper, isDark ? 0.5 : 0.88),
            textTransform: "none",
            fontSize: 12,
            fontWeight: 700,
            color: "text.primary",
            display: "inline-flex",
            alignItems: "center",
            gap: 0.7,
            "&:hover": {
              borderColor: alpha(theme.palette.primary.main, 0.45),
              bgcolor: isDark ? "rgba(10,132,255,0.17)" : "rgba(10,132,255,0.10)",
            },
          }}
        >
          {icon}
          {!compact ? <span>{selectedLabel}</span> : null}
          {!compact ? <KeyboardArrowDownRoundedIcon sx={{ fontSize: 16, opacity: 0.8 }} /> : null}
        </Button>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        PaperProps={{
          sx: {
            mt: 0.5,
            borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`,
            bgcolor: alpha(theme.palette.background.paper, isDark ? 0.95 : 0.98),
            minWidth: 220,
          },
        }}
      >
        {options.map((option, index) => {
          const prevGroup = index > 0 ? options[index - 1]?.group : undefined;
          const showGroup = option.group && option.group !== prevGroup;
          return (
            <React.Fragment key={option.value}>
              {showGroup ? <ListSubheader sx={{ lineHeight: "28px", fontWeight: 700 }}>{option.group}</ListSubheader> : null}
              <MenuItem
                selected={option.value === value}
                onClick={() => {
                  onChange(option.value);
                  setAnchorEl(null);
                }}
              >
                {option.label}
              </MenuItem>
            </React.Fragment>
          );
        })}
      </Menu>
    </>
  );
}

export function TierBadge({ tier, onClick }: { tier: Tier; onClick: () => void }) {
  const theme = useTheme();
  const style = tierStyles[tier];
  return (
    <Button
      color="inherit"
      onClick={onClick}
      sx={{
        px: 1.1,
        py: 0.65,
        borderRadius: 999,
        minWidth: 0,
        border: `1px solid ${alpha(style.color, 0.62)}`,
        bgcolor: alpha(style.color, 0.18),
        color: "text.primary",
        fontWeight: 800,
        fontSize: 11,
        letterSpacing: 0.3,
      }}
    >
      {style.label}
    </Button>
  );
}

export function NotificationBell() {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);
  const alerts = [
    "Price alert: Wilson A2000 +6.2%",
    "Arbitrage: JP market spread opportunity",
    "Market signal: Rawlings volume spike",
    "Listing alert: Mizuno Pro Select new comp",
  ];

  return (
    <>
      <IconButton
        onClick={(event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget)}
        sx={{
          width: 36,
          height: 36,
          border: `1px solid ${theme.palette.divider}`,
          bgcolor: alpha(theme.palette.background.paper, 0.7),
        }}
      >
        <Badge color="error" overlap="circular" variant="dot">
          <NotificationsNoneRoundedIcon fontSize="small" />
        </Badge>
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        PaperProps={{ sx: { mt: 0.5, borderRadius: 2, minWidth: 300 } }}
      >
        {alerts.map((alert) => <MenuItem key={alert}>{alert}</MenuItem>)}
      </Menu>
    </>
  );
}

export function ProfileMenu({ onOpenAccount }: { onOpenAccount: () => void }) {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  return (
    <>
      <IconButton
        onClick={(event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget)}
        sx={{
          width: 36,
          height: 36,
          border: `1px solid ${theme.palette.divider}`,
          bgcolor: alpha(theme.palette.background.paper, 0.72),
        }}
      >
        <Avatar sx={{ width: 24, height: 24, fontSize: 12, bgcolor: "primary.main" }}>JR</Avatar>
      </IconButton>
      <Menu anchorEl={anchorEl} open={open} onClose={() => setAnchorEl(null)} PaperProps={{ sx: { mt: 0.5, borderRadius: 2, minWidth: 190 } }}>
        <MenuItem onClick={() => { onOpenAccount(); setAnchorEl(null); }}>Profile</MenuItem>
        <MenuItem onClick={() => { onOpenAccount(); setAnchorEl(null); }}>Settings</MenuItem>
        <MenuItem onClick={() => setAnchorEl(null)}>Billing</MenuItem>
        <MenuItem onClick={() => setAnchorEl(null)}>API Access</MenuItem>
        <MenuItem onClick={() => setAnchorEl(null)}>Logout</MenuItem>
      </Menu>
    </>
  );
}

export default function DashboardHeader({
  tier,
  onOpenPricing,
  onOpenAccount,
  onOpenCommandPalette,
}: {
  tier: Tier;
  onOpenPricing: () => void;
  onOpenAccount: () => void;
  onOpenCommandPalette: () => void;
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const isCompact = useMediaQuery(theme.breakpoints.down("lg"));
  const [actionsValue, setActionsValue] = useState("all-data");
  const [projectValue, setProjectValue] = useState("global-market");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const shortcutLabel = typeof navigator !== "undefined" && /(Mac|iPhone|iPad)/i.test(navigator.platform) ? "⌘K" : "Ctrl+K";

  const actionOptions = useMemo<DropdownOption[]>(() => [
    { group: "View", label: "All Data", value: "all-data" },
    { group: "View", label: "My Collection", value: "my-collection" },
    { group: "View", label: "Market Only", value: "market-only" },
    { group: "View", label: "Dealer Inventory", value: "dealer-inventory" },
    { group: "Sort", label: "Highest Value", value: "highest-value" },
    { group: "Sort", label: "Most Active", value: "most-active" },
    { group: "Sort", label: "Trending", value: "trending" },
  ], []);

  const projectOptions = useMemo<DropdownOption[]>(() => [
    { label: "Global Market", value: "global-market" },
    { label: "My Collection", value: "my-collection" },
    { label: "Dealer Inventory", value: "dealer-inventory" },
    { label: "JP Market", value: "jp-market" },
  ], []);

  return (
    <>
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 12,
          px: { xs: 1.5, sm: 2, md: 2.5 },
          py: { xs: 1, md: 1.25 },
          borderBottom: `1px solid ${theme.palette.divider}`,
          background: alpha(theme.palette.background.default, isDark ? 0.78 : 0.92),
          backdropFilter: "blur(8px) saturate(120%)",
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr auto", md: "minmax(300px,1fr) auto" },
            alignItems: "center",
            gap: { xs: 1, md: 1.25 },
          }}
        >
          <Box sx={{ gridColumn: { xs: "1 / -1", md: "1 / 2" }, minWidth: 0 }}>
            <SearchInput onActivate={onOpenCommandPalette} shortcutLabel={shortcutLabel} />
          </Box>

          <Stack direction="row" spacing={0.8} alignItems="center" justifySelf="end">
            <Box sx={{ display: { xs: "none", sm: "inline-flex" } }}>
              <HeaderDropdown
                label="Actions"
                icon={<TuneRoundedIcon sx={{ fontSize: 16 }} />}
                value={actionsValue}
                options={actionOptions}
                onChange={setActionsValue}
                compact={isCompact}
              />
            </Box>
            <Box sx={{ display: { xs: "none", md: "inline-flex" } }}>
              <HeaderDropdown
                label="Project"
                icon={<DatasetRoundedIcon sx={{ fontSize: 16 }} />}
                value={projectValue}
                options={projectOptions}
                onChange={setProjectValue}
                compact={isCompact}
              />
            </Box>
            <Box sx={{ display: { xs: "none", md: "inline-flex" } }}>
              <TierBadge tier={tier} onClick={() => setUpgradeOpen(true)} />
            </Box>
            <NotificationBell />
            <ProfileMenu onOpenAccount={onOpenAccount} />
          </Stack>
        </Box>
      </Box>

      <Dialog open={upgradeOpen} onClose={() => setUpgradeOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Upgrade Tier</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Unlock Collector, Pro, and Dealer analytics to expand market intelligence and operational tools.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setUpgradeOpen(false)}>Not now</Button>
          <Button onClick={() => { setUpgradeOpen(false); onOpenPricing(); }} endIcon={<ArrowOutwardRoundedIcon fontSize="small" />}>
            View plans
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
