#!/usr/bin/env python3
"""
GloveIQ Scrape + Enrich Orchestrator

Runs selectable steps:
1) SidelineSwap scrape (catalog + details)
2) JustBallGloves scrape (catalog + details)
3) XLSX validation for library import
4) Library normalized export + media manifest generation
5) Optional Backblaze ingest for discovered images

You can run steps individually by flags.
"""
import argparse
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))

def run(cmd):
    print("\n$ " + " ".join(cmd))
    subprocess.check_call(cmd, cwd=HERE)


def has_b2_env():
    return bool(
        os.getenv("B2_KEY_ID", "").strip()
        and os.getenv("B2_APP_KEY", "").strip()
        and os.getenv("B2_BUCKET", "").strip()
    )


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--xlsx", required=True)
    p.add_argument("--out-dir", default=os.path.abspath(os.path.join(HERE, "..", "..", "data_exports")))
    p.add_argument("--delay", type=float, default=1.5)
    p.add_argument("--details", type=int, default=2000, help="Max detail pages to enrich per source.")
    p.add_argument("--ss-pages", type=int, default=25)
    p.add_argument("--jbg-pages", type=int, default=25)
    p.add_argument("--ss", action="store_true", help="Run SidelineSwap")
    p.add_argument("--jbg", action="store_true", help="Run JustBallGloves")
    p.add_argument("--b2", action="store_true", help="Run Backblaze image ingest")
    p.add_argument("--library-only", action="store_true", help="Skip scrapes; only validate + export library artifacts from existing XLSX")
    p.add_argument("--skip-validate", action="store_true", help="Skip validate_library_xlsx.py step")
    p.add_argument("--skip-export", action="store_true", help="Skip library_import.py export step")
    p.add_argument("--skip-regression", action="store_true", help="Skip regression fixture check")
    p.add_argument("--no-resume-export", action="store_true", help="Disable fingerprint resume in library import")
    p.add_argument("--force-export", action="store_true", help="Force regeneration of export artifacts")
    p.add_argument("--resume", action="store_true")
    p.add_argument("--catalog-only", action="store_true")
    args = p.parse_args()
    args.xlsx = os.path.abspath(args.xlsx)
    args.out_dir = os.path.abspath(args.out_dir)

    if args.library_only:
        args.ss = False
        args.jbg = False

    # Default: run full pipeline except B2 unless explicitly requested.
    if not (args.ss or args.jbg or args.b2 or args.library_only):
        args.ss = args.jbg = True

    if args.ss:
        if args.catalog_only:
            run([sys.executable, "ss_master_scraper.py", "--xlsx", args.xlsx, "--max-pages", str(args.ss_pages), "--max-details", "0", "--delay", str(args.delay)])
        else:
            # catalog+details in one go
            cmd = [sys.executable, "ss_master_scraper.py", "--xlsx", args.xlsx, "--max-pages", str(args.ss_pages), "--max-details", str(args.details), "--delay", str(args.delay)]
            if args.resume:
                cmd.append("--resume")
            run(cmd)

    if args.jbg:
        if args.catalog_only:
            run([sys.executable, "jbg_master_scraper.py", "--xlsx", args.xlsx, "--max-pages", str(args.jbg_pages), "--max-details", "0", "--delay", str(args.delay)])
        else:
            cmd = [sys.executable, "jbg_master_scraper.py", "--xlsx", args.xlsx, "--max-pages", str(args.jbg_pages), "--max-details", str(args.details), "--delay", str(args.delay)]
            if args.resume:
                cmd.append("--resume")
            run(cmd)

    if not args.skip_validate:
        validate_cmd = [sys.executable, "validate_library_xlsx.py", "--xlsx", args.xlsx]
        run(validate_cmd)

    if not args.skip_export:
        export_cmd = [sys.executable, "library_import.py", "--xlsx", args.xlsx, "--out-dir", args.out_dir]
        if args.no_resume_export:
            export_cmd.append("--no-resume")
        if args.force_export:
            export_cmd.append("--force")
        run(export_cmd)

    if not args.skip_regression:
        regression_cmd = [sys.executable, "qa_regression_check.py", "--xlsx", args.xlsx]
        run(regression_cmd)

    if args.b2:
        if has_b2_env():
            # resume is safe here too
            cmd = [sys.executable, "b2_ingest_images.py", "--xlsx", args.xlsx, "--resume", "--delay", "0.5"]
            run(cmd)
        else:
            print("[pipeline] B2 env not configured; skipping b2_ingest_images.py (set B2_KEY_ID, B2_APP_KEY, B2_BUCKET).")

if __name__ == "__main__":
    main()
