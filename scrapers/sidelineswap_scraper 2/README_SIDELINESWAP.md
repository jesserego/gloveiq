# SidelineSwap → GloveIQ Master Workbook (Integrated)

This pack adds SidelineSwap ingestion into your existing GloveIQ master workbook by creating:
- SS_Full_Catalog
- SS_Detail_Enrichment

## Setup
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

## Test run
```bash
python ss_master_scraper.py --xlsx "GloveIQ_Library_Master_Template_GOOGLE_NATIVE_FULLCAT_READY.xlsx" --max-pages 2 --max-details 25
```

## Full run (resume)
```bash
python ss_master_scraper.py --xlsx "GloveIQ_Library_Master_Template_GOOGLE_NATIVE_FULLCAT_READY.xlsx" --resume
```

## Notes
- Keep the XLSX in the same folder as the script (simplest).
- Resume skips listing_ids already marked OK in SS_Detail_Enrichment.
