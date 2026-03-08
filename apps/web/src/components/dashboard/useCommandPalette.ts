import { useEffect, useMemo, useState } from "react";

export type CommandResultType = "model" | "brand" | "listing" | "navigation" | "action";

export type CommandResult = {
  id: string;
  type: CommandResultType;
  title: string;
  subtitle?: string;
  keywords?: string[];
  locked?: boolean;
  onSelect: () => void;
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function scoreForQuery(item: CommandResult, normalizedQuery: string) {
  if (!normalizedQuery) return 1;
  const title = normalize(item.title);
  const subtitle = normalize(item.subtitle || "");
  const keywords = normalize((item.keywords || []).join(" "));
  const combined = `${title} ${subtitle} ${keywords}`;
  if (!combined) return -1;

  let score = 0;
  if (title.includes(normalizedQuery)) score += 100;
  if (title.startsWith(normalizedQuery)) score += 28;
  if (subtitle.includes(normalizedQuery)) score += 55;
  if (keywords.includes(normalizedQuery)) score += 45;

  const tokens = normalizedQuery.split(" ").filter(Boolean);
  for (const token of tokens) {
    if (title.includes(token)) score += 12;
    if (subtitle.includes(token)) score += 6;
    if (keywords.includes(token)) score += 5;
  }

  return score;
}

function isEditableTarget(target: EventTarget | null) {
  const node = target as HTMLElement | null;
  if (!node) return false;
  const tagName = node.tagName;
  return tagName === "INPUT" || tagName === "TEXTAREA" || node.isContentEditable;
}

export function useCommandPalette(items: CommandResult[]) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredResults = useMemo(() => {
    const normalizedQuery = normalize(query);
    const scored = items
      .map((item) => ({ item, score: scoreForQuery(item, normalizedQuery) }))
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title));

    if (!normalizedQuery) {
      const pinned = scored
        .filter((row) => row.item.type === "navigation" || row.item.type === "action")
        .slice(0, 6)
        .map((row) => row.item);
      const recent = scored
        .filter((row) => row.item.type === "model" || row.item.type === "brand" || row.item.type === "listing")
        .slice(0, 12)
        .map((row) => row.item);
      return [...pinned, ...recent];
    }

    return scored.slice(0, 24).map((row) => row.item);
  }, [items, query]);

  const groupedResults = useMemo(() => {
    const out: Record<CommandResultType, CommandResult[]> = {
      model: [],
      brand: [],
      listing: [],
      navigation: [],
      action: [],
    };
    for (const item of filteredResults) out[item.type].push(item);
    return out;
  }, [filteredResults]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, isOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const targetIsEditable = isEditableTarget(event.target);
      const triggerOpen = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";

      if (triggerOpen) {
        if (targetIsEditable) return;
        event.preventDefault();
        setIsOpen((prev) => !prev);
        if (isOpen) setQuery("");
        return;
      }

      if (event.key === "Escape" && isOpen) {
        event.preventDefault();
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  const close = () => {
    setIsOpen(false);
    setQuery("");
    setSelectedIndex(0);
  };

  const open = () => {
    setIsOpen(true);
  };

  const moveSelection = (delta: number) => {
    if (filteredResults.length === 0) return;
    setSelectedIndex((prev) => {
      const len = filteredResults.length;
      return (prev + delta + len) % len;
    });
  };

  const runSelected = () => {
    const selected = filteredResults[selectedIndex];
    if (!selected) return;
    if (selected.locked) {
      close();
      selected.onSelect();
      return;
    }
    selected.onSelect();
    close();
  };

  return {
    isOpen,
    open,
    close,
    query,
    setQuery,
    selectedIndex,
    setSelectedIndex,
    filteredResults,
    groupedResults,
    moveSelection,
    runSelected,
  };
}
