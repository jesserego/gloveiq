import React from "react";
import {
  Box,
  Divider,
  FormControl,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import SportsBaseballIcon from "@mui/icons-material/SportsBaseball";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import CreditCardOutlinedIcon from "@mui/icons-material/CreditCardOutlined";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";

import type { Locale } from "../i18n/strings";
import { t } from "../i18n/strings";
import { Button } from "./Primitives";
import gloveIqLogo from "../assets/GloveIQ.logo.png";

export type MainTab = "search" | "artifact" | "appraisal" | "account" | "pricing";
export type ShellRouteName = "search" | "artifact" | "appraisal" | "account" | "pricing";

export function SidebarNav({
  locale,
  activeTab,
  canOpenArtifact,
  onSelect,
}: {
  locale: Locale;
  activeTab: MainTab;
  canOpenArtifact: boolean;
  onSelect: (tab: MainTab) => void;
}) {
  const items = [
    { tab: "search" as const, label: t(locale, "tab.search"), subtitle: "KPIs, queue, catalog", icon: <HomeOutlinedIcon fontSize="small" /> },
    { tab: "artifact" as const, label: t(locale, "tab.artifact"), subtitle: "Models and artifacts", icon: <SportsBaseballIcon fontSize="small" /> },
    { tab: "appraisal" as const, label: t(locale, "tab.appraisal"), subtitle: "Upload and estimate", icon: <UploadFileOutlinedIcon fontSize="small" /> },
  ];
  const utilityItems = [
    { tab: "account" as const, label: t(locale, "tab.account"), subtitle: "Login, profile, security", icon: <AccountCircleOutlinedIcon fontSize="small" /> },
    { tab: "pricing" as const, label: t(locale, "tab.pricing"), subtitle: "Plans and usage", icon: <CreditCardOutlinedIcon fontSize="small" /> },
  ];

  return (
    <Box
      component="aside"
      sx={{
        display: { xs: "none", md: "flex" },
        flexDirection: "column",
        p: 2,
        gap: 1.5,
        background: "linear-gradient(180deg, #FFFFFF, #F2F4F7)",
        borderRight: "1px solid #E3E8EF",
        color: "text.primary",
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ px: 0.2, py: 0.4 }}>
        <Box
          component="img"
          src={gloveIqLogo}
          alt="GloveIQ logo"
          sx={{
            width: 50,
            height: 50,
            objectFit: "contain",
          }}
        />
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 14, lineHeight: 1.2 }} noWrap>
            GloveIQ
          </Typography>
          <Typography sx={{ fontSize: 12, color: "text.secondary" }} noWrap>
            v0.1.0 • Update 2026.02.12
          </Typography>
        </Box>
      </Stack>

      <Stack spacing={0.75}>
        {items.map((item) => {
          const active = item.tab === activeTab;
          const disabled = item.tab === "artifact" && !canOpenArtifact;
          return (
            <Box
              key={item.tab}
              role="button"
              tabIndex={disabled ? -1 : 0}
              onClick={() => !disabled && onSelect(item.tab)}
              onKeyDown={(e) => {
                if (!disabled && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  onSelect(item.tab);
                }
              }}
              sx={{
                px: 1.1,
                py: 0.95,
                borderRadius: 2,
                border: "1px solid",
                borderColor: active ? "rgba(55,99,233,0.32)" : "transparent",
                backgroundColor: active ? "rgba(55,99,233,0.10)" : "transparent",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.5 : 1,
                transition: "all 140ms ease",
                "&:hover": {
                  backgroundColor: disabled ? "transparent" : "rgba(17,24,39,0.05)",
                },
              }}
            >
              <Stack direction="row" spacing={1.2} alignItems="center">
                <Box sx={{ width: 26, height: 26, borderRadius: 1.3, backgroundColor: active ? "rgba(55,99,233,.18)" : "rgba(17,24,39,0.06)", display: "grid", placeItems: "center" }}>
                  {item.icon}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2 }} noWrap>{item.label}</Typography>
                  <Typography sx={{ fontSize: 11, color: "text.secondary", lineHeight: 1.2 }} noWrap>{item.subtitle}</Typography>
                </Box>
              </Stack>
            </Box>
          );
        })}
      </Stack>

      <Box sx={{ mt: "auto" }} />

      <Divider sx={{ borderColor: "#E3E8EF", my: 0.75 }} />

      <Stack spacing={0.75}>
        {utilityItems.map((item) => {
          const active = item.tab === activeTab;
          return (
            <Box
              key={item.tab}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(item.tab)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(item.tab);
                }
              }}
              sx={{
                px: 1.2,
                py: 0.95,
                borderRadius: 2,
                border: "1px solid",
                borderColor: active ? "rgba(55,99,233,0.32)" : "transparent",
                backgroundColor: active ? "rgba(55,99,233,0.10)" : "transparent",
                cursor: "pointer",
                transition: "all 140ms ease",
                "&:hover": {
                  backgroundColor: "rgba(17,24,39,0.05)",
                },
              }}
            >
              <Stack direction="row" spacing={1.2} alignItems="center">
                <Box sx={{ width: 26, height: 26, borderRadius: 1.3, backgroundColor: active ? "rgba(55,99,233,.18)" : "rgba(17,24,39,0.06)", display: "grid", placeItems: "center" }}>
                  {item.icon}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2 }} noWrap>{item.label}</Typography>
                  <Typography sx={{ fontSize: 11, color: "text.secondary", lineHeight: 1.2 }} noWrap>{item.subtitle}</Typography>
                </Box>
              </Stack>
            </Box>
          );
        })}
      </Stack>

      <Divider sx={{ borderColor: "#E3E8EF", my: 0.75 }} />

      <Box sx={{ p: 1.2, borderRadius: 2, border: "1px solid #E3E8EF", backgroundColor: "#F2F4F7", color: "text.secondary", fontSize: 12, lineHeight: 1.35 }}>
        <Typography component="span" sx={{ color: "text.primary", fontWeight: 700 }}>Prototype mode</Typography>
        <br />
        Visual foundation aligned to the origin-style desktop shell and Liquid Glass patterns.
      </Box>
    </Box>
  );
}

export function ShellTopBar({
  locale,
  setLocale,
  routeName,
  onReset,
}: {
  locale: Locale;
  setLocale: (l: Locale) => void;
  routeName: ShellRouteName;
  onReset: () => void;
}) {
  const subtitle = routeName === "search"
    ? "Overview"
    : routeName === "artifact"
      ? "Artifacts Workspace"
      : routeName === "appraisal"
        ? "Appraisal Intake"
        : routeName === "account"
          ? "Profile and Security"
        : "Plans and Billing";

  return (
    <Box
      sx={{
        height: 64,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1.5,
        px: { xs: 1.25, md: 2.25 },
        borderBottom: "1px solid #E3E8EF",
        backgroundColor: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(16px) saturate(160%)",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
        <Box
          component="img"
          src={gloveIqLogo}
          alt="GloveIQ logo"
          sx={{
            width: 34,
            height: 34,
            borderRadius: 1.2,
            objectFit: "contain",
            p: 0.2,
            border: "1px solid #E3E8EF",
            backgroundColor: "#F2F4F7",
          }}
        />
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 1.5,
            py: 1,
            borderRadius: 999,
            backgroundColor: "#FFFFFF",
            border: "1px solid #E3E8EF",
            boxShadow: "0 1px 0 rgba(0,0,0,0.02) inset",
            minWidth: 0,
            maxWidth: 740,
            width: "100%",
          }}
        >
          <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
          <Box
            component="input"
            placeholder={t(locale, "search.placeholder")}
            aria-label="Global search"
            sx={{
              border: 0,
              outline: 0,
              background: "transparent",
              color: "text.primary",
              fontSize: 14,
              minWidth: 0,
              width: "100%",
            }}
          />
          <Box sx={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 11, color: "text.secondary", border: "1px solid #E3E8EF", px: 0.8, py: 0.25, borderRadius: 1 }}>⌘K</Box>
        </Box>

        <Box sx={{ display: { xs: "none", md: "block" }, minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" noWrap>{subtitle}</Typography>
        </Box>
      </Stack>

      <Stack direction="row" spacing={1} alignItems="center">
        <FormControl size="small">
          <Select
            value={locale}
            onChange={(e) => setLocale(e.target.value as Locale)}
            sx={{ minWidth: 72, borderRadius: 999, backgroundColor: "#FFFFFF", "& .MuiSelect-select": { py: 0.8 } }}
          >
            <MenuItem value="en">EN</MenuItem>
            <MenuItem value="ja">JA</MenuItem>
          </Select>
        </FormControl>
        <Button color="inherit" sx={{ borderRadius: 999, minWidth: 0, px: 1.4, display: { xs: "none", sm: "inline-flex" } }} onClick={onReset}>+ New</Button>
        <Box sx={{ width: 34, height: 34, borderRadius: 999, border: "1px solid #E3E8EF", backgroundColor: "#FFFFFF", display: "grid", placeItems: "center" }}>
          <NotificationsNoneOutlinedIcon fontSize="small" />
        </Box>
      </Stack>
    </Box>
  );
}

export function MobileBottomNav({
  locale,
  activeTab,
  canOpenArtifact,
  onSelect,
}: {
  locale: Locale;
  activeTab: MainTab;
  canOpenArtifact: boolean;
  onSelect: (tab: MainTab) => void;
}) {
  const tabs = [
    { name: "search" as const, label: t(locale, "tab.search"), icon: <SearchIcon fontSize="small" /> },
    { name: "artifact" as const, label: t(locale, "tab.artifact"), icon: <SportsBaseballIcon fontSize="small" /> },
    { name: "appraisal" as const, label: t(locale, "tab.appraisal"), icon: <UploadFileOutlinedIcon fontSize="small" /> },
    { name: "account" as const, label: t(locale, "tab.account"), icon: <AccountCircleOutlinedIcon fontSize="small" /> },
    { name: "pricing" as const, label: t(locale, "tab.pricing"), icon: <LocalOfferIcon fontSize="small" /> },
  ];

  return (
    <Box
      sx={{
        display: { xs: "block", md: "none" },
        position: "fixed",
        left: 10,
        right: 10,
        bottom: 10,
        zIndex: 1200,
        border: "1px solid #E3E8EF",
        borderRadius: 3,
        backdropFilter: "blur(20px) saturate(170%)",
        backgroundColor: "rgba(255,255,255,0.94)",
        boxShadow: "0 12px 28px rgba(0,0,0,0.14)",
      }}
    >
      <Stack direction="row" spacing={0.5} sx={{ p: 0.75 }}>
        {tabs.map((tab) => {
          const active = activeTab === tab.name;
          const disabled = tab.name === "artifact" && !canOpenArtifact;
          return (
            <Box
              key={tab.name}
              role="button"
              tabIndex={disabled ? -1 : 0}
              onClick={() => !disabled && onSelect(tab.name)}
              onKeyDown={(e) => {
                if (!disabled && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  onSelect(tab.name);
                }
              }}
              sx={{
                flex: 1,
                py: 0.75,
                borderRadius: 2,
                border: "1px solid",
                borderColor: active ? "rgba(55,99,233,0.26)" : "transparent",
                backgroundColor: active ? "rgba(55,99,233,0.10)" : "transparent",
                color: disabled ? "text.disabled" : "text.primary",
                opacity: disabled ? 0.5 : 1,
              }}
            >
              <Stack alignItems="center" spacing={0.4}>
                {tab.icon}
                <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 800 }}>{tab.label}</Typography>
              </Stack>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}
