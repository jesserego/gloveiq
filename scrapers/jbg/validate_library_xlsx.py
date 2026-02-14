#!/usr/bin/env python3
"""Validate scraper workbook readiness for GloveIQ library import."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from library_import import build_exports, validate_workbook


def main() -> None:
    p = argparse.ArgumentParser(description="Validate GloveIQ workbook and optional manifest/listing alignment")
    p.add_argument("--xlsx", required=True)
    p.add_argument("--manifest", help="Optional media_manifest.jsonl to validate")
    p.add_argument("--normalized", help="Optional listings.normalized.jsonl to validate")
    p.add_argument("--b2-prefix", default="gloveiq")
    args = p.parse_args()

    vr = validate_workbook(args.xlsx)
    for w in vr.warnings:
        print(f"[WARN] {w}")
    if not vr.ok:
        for e in vr.errors:
            print(f"[ERROR] {e}")
        raise SystemExit(2)

    exports = build_exports(args.xlsx, b2_prefix=args.b2_prefix)
    expected_listings = len(exports["listings"])
    expected_manifest_rows = len(exports["media_manifest"])

    print(f"[OK] workbook structure valid")
    print(f"[INFO] expected listings: {expected_listings}")
    print(f"[INFO] expected manifest rows: {expected_manifest_rows}")

    if args.manifest:
        manifest_path = Path(args.manifest)
        if not manifest_path.exists():
            print(f"[ERROR] manifest file missing: {manifest_path}")
            raise SystemExit(2)
        got_rows = 0
        with manifest_path.open("r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    got_rows += 1
        if got_rows != expected_manifest_rows:
            print(f"[ERROR] manifest row count mismatch: got={got_rows} expected={expected_manifest_rows}")
            raise SystemExit(2)
        print("[OK] manifest row count aligns")

    if args.normalized:
        normalized_path = Path(args.normalized)
        if not normalized_path.exists():
            print(f"[ERROR] normalized file missing: {normalized_path}")
            raise SystemExit(2)
        got_rows = 0
        with normalized_path.open("r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    got_rows += 1
        if got_rows != expected_listings:
            print(f"[ERROR] normalized row count mismatch: got={got_rows} expected={expected_listings}")
            raise SystemExit(2)
        print("[OK] normalized row count aligns")

    print("[DONE] validation passed")


if __name__ == "__main__":
    main()
