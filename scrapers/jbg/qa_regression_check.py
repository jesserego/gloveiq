#!/usr/bin/env python3
"""Regression check for ingestion mapping using a 10-row golden fixture."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict, List

from library_import import build_exports


DEFAULT_FIXTURE = Path(__file__).resolve().parent / "fixtures" / "golden_listings_10.jsonl"


def canonicalize(listings: List[Dict[str, Any]], n: int = 10) -> List[Dict[str, Any]]:
    out = []
    for row in listings[:n]:
        out.append(
            {
                "listing_pk": row.get("listing_pk"),
                "source": row.get("source"),
                "source_listing_id": row.get("source_listing_id"),
                "title": row.get("title"),
                "brand": row.get("brand"),
                "model": row.get("model"),
                "model_code": row.get("model_code"),
                "size_in": row.get("size_in"),
                "throw_hand": row.get("throw_hand"),
                "position": row.get("position"),
                "sport": row.get("sport"),
                "condition": row.get("condition"),
                "price": row.get("price"),
                "currency": row.get("currency"),
                "url": row.get("url"),
                "image_count": len(row.get("images") or []),
            }
        )
    return out


def read_jsonl(path: Path) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            s = line.strip()
            if not s:
                continue
            rows.append(json.loads(s))
    return rows


def write_jsonl(path: Path, rows: List[Dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--xlsx", required=True)
    p.add_argument("--fixture", default=str(DEFAULT_FIXTURE))
    p.add_argument("--update-fixture", action="store_true")
    args = p.parse_args()

    fixture_path = Path(args.fixture)
    exports = build_exports(args.xlsx, b2_prefix="gloveiq")
    current = canonicalize(exports["listings"], n=10)

    if args.update_fixture:
        write_jsonl(fixture_path, current)
        print(f"[UPDATED] {fixture_path}")
        return

    if not fixture_path.exists():
        print(f"[ERROR] fixture missing: {fixture_path}")
        print("Run with --update-fixture once to create it.")
        raise SystemExit(2)

    expected = read_jsonl(fixture_path)
    if current != expected:
        print("[ERROR] regression mismatch detected")
        print(f"  current rows: {len(current)}")
        print(f"  fixture rows: {len(expected)}")

        compare_len = min(len(current), len(expected))
        for i in range(compare_len):
            if current[i] != expected[i]:
                print(f"  first diff at index {i}")
                print("  current:", json.dumps(current[i], ensure_ascii=False, sort_keys=True))
                print("  expected:", json.dumps(expected[i], ensure_ascii=False, sort_keys=True))
                break
        raise SystemExit(2)

    print("[OK] regression fixture matches")


if __name__ == "__main__":
    main()
