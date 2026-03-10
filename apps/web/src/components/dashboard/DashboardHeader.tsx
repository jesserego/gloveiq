import React, { useState } from "react";
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
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Tier } from "@gloveiq/shared";
import SearchIcon from "@mui/icons-material/Search";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import SportsBaseballIcon from "@mui/icons-material/SportsBaseball";
import PublicIcon from "@mui/icons-material/Public";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";

const tierStyles: Record<Tier, { label: string; color: string }> = {
  [Tier.FREE]: { label: "FREE", color: "#94A3B8" },
  [Tier.COLLECTOR]: { label: "COLLECTOR", color: "#3B82F6" },
  [Tier.PRO]: { label: "PRO", color: "#A855F7" },
  [Tier.DEALER]: { label: "DEALER", color: "#F59E0B" },
};

export function SearchInput({
  onActivate,
  onOpenGlobe,
  onOpenBaseball,
  onOpenIQMode,
}: {
  onActivate: () => void;
  onOpenGlobe: () => void;
  onOpenBaseball: () => void;
  onOpenIQMode: () => void;
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.7,
        borderRadius: 2.5,
        px: 1.15,
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
          flex: 1,
          minWidth: 0,
          "&::placeholder": { color: "text.secondary", opacity: 0.95 },
        }}
      />
      <Tooltip title="Region">
        <IconButton aria-label="Region" onClick={onOpenGlobe} sx={{ width: 30, height: 30, border: "1px solid", borderColor: "divider", bgcolor: alpha(theme.palette.background.paper, isDark ? 0.7 : 0.9) }}>
          <PublicIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Brands">
        <IconButton aria-label="Brands" onClick={onOpenBaseball} sx={{ width: 30, height: 30, border: "1px solid", borderColor: "divider", bgcolor: alpha(theme.palette.background.paper, isDark ? 0.7 : 0.9) }}>
          <SportsBaseballIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>
      <Button
        color="inherit"
        onClick={onOpenIQMode}
        startIcon={<AutoAwesomeRoundedIcon sx={{ fontSize: 14 }} />}
        sx={{
          display: { xs: "none", sm: "inline-flex" },
          borderRadius: 999,
          px: 1.15,
          py: 0.5,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: alpha(theme.palette.background.paper, isDark ? 0.7 : 0.9),
          fontSize: 11,
          fontWeight: 700,
          minWidth: 84,
          flexShrink: 0,
          whiteSpace: "nowrap",
        }}
      >
        IQ Mode
      </Button>
      <Box
        sx={{
          flexShrink: 0,
          display: { xs: "none", sm: "inline-flex" },
          borderRadius: 1,
          px: 0.75,
          py: 0.25,
          border: `1px solid ${theme.palette.divider}`,
          bgcolor: alpha(theme.palette.background.default, isDark ? 0.72 : 0.7),
          color: "text.secondary",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 11,
          lineHeight: 1,
          whiteSpace: "nowrap",
        }}
      >
        Return
      </Box>
    </Box>
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
        PaperProps={{ sx: { mt: 0.5, borderRadius: 2, minWidth: { xs: 220, sm: 300 }, maxWidth: "calc(100vw - 16px)" } }}
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
  onOpenGlobe,
  onOpenBaseball,
  onOpenIQMode,
  onOpenFilters,
}: {
  tier: Tier;
  onOpenPricing: () => void;
  onOpenAccount: () => void;
  onOpenCommandPalette: () => void;
  onOpenGlobe: () => void;
  onOpenBaseball: () => void;
  onOpenIQMode: () => void;
  onOpenFilters: () => void;
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [upgradeOpen, setUpgradeOpen] = useState(false);

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
            <SearchInput
              onActivate={onOpenCommandPalette}
              onOpenGlobe={onOpenGlobe}
              onOpenBaseball={onOpenBaseball}
              onOpenIQMode={onOpenIQMode}
            />
          </Box>

          <Stack direction="row" spacing={0.8} alignItems="center" justifySelf="end">
            <Tooltip title="Filters">
              <IconButton aria-label="Filters" onClick={onOpenFilters} sx={{ border: "1px solid", borderColor: "divider", bgcolor: alpha(theme.palette.background.paper, isDark ? 0.7 : 0.9) }}>
                <TuneRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
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
