#!/usr/bin/env python3
"""
scripts/download_sources.py
Downloads open-license kanji data sources needed for building the 2D matrix:
1. kanji-jouyou.json (from davidluzgouveia/kanji-data: Jōyō kanji readings, meanings, JLPT, grade, frequency)
2. ids.txt (from cjkvi/cjkvi-ids: CHISE Ideographic Description Sequences)
3. KanjiVG XML (from KanjiVG/kanjivg GitHub releases: detailed stroke order, component elements and positions)
4. kanjidic2.xml.gz (from EDRDG: comprehensive dictionary data)
"""

import gzip
import json
import os
import sys
import urllib.request
import urllib.error

DATA_RAW = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "raw"))

SOURCES = {
    "kanji-jouyou.json": [
        "https://raw.githubusercontent.com/davidluzgouveia/kanji-data/master/kanji-jouyou.json",
    ],
    "kanji.json": [
        "https://raw.githubusercontent.com/davidluzgouveia/kanji-data/master/kanji.json",
    ],
    "ids.txt": [
        "https://raw.githubusercontent.com/cjkvi/cjkvi-ids/master/ids.txt",
    ],
}

KANJIVG_FALLBACK_URLS = [
    "https://github.com/KanjiVG/kanjivg/releases/download/r20240822/kanjivg-20240822.xml.gz",
    "https://github.com/KanjiVG/kanjivg/releases/download/r20230312/kanjivg-20230312.xml.gz",
    "https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanjivg-20160426.xml.gz",
]

def download_file(url: str, dest_path: str, label: str):
    print(f"Downloading {label} from {url}...")
    headers = {"User-Agent": "Mozilla/5.0 (KanjiTable/1.0; https://github.com/)"}
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=30) as resp, open(dest_path, "wb") as out_file:
        data = resp.read()
        out_file.write(data)
    print(f"Saved {label} to {dest_path} ({os.path.getsize(dest_path)} bytes)")

def get_kanjivg_url() -> str:
    # Try GitHub API first
    api_url = "https://api.github.com/repos/KanjiVG/kanjivg/releases/latest"
    try:
        req = urllib.request.Request(api_url, headers={"User-Agent": "KanjiTable/1.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            for asset in data.get("assets", []):
                name = asset.get("name", "")
                if name.endswith(".xml.gz"):
                    return asset.get("browser_download_url")
    except Exception as e:
        print(f"Notice: Could not fetch latest KanjiVG release via GitHub API ({e}). Using fallback list.")
    return KANJIVG_FALLBACK_URLS[0]

def main():
    os.makedirs(DATA_RAW, exist_ok=True)

    for filename, urls in SOURCES.items():
        dest = os.path.join(DATA_RAW, filename)
        if os.path.exists(dest) and os.path.getsize(dest) > 1000:
            print(f"✓ {filename} already exists ({os.path.getsize(dest)} bytes). Skipping.")
            continue
        success = False
        for url in urls:
            try:
                download_file(url, dest, filename)
                success = True
                break
            except Exception as e:
                print(f"Warning: Failed to download from {url}: {e}")
        if not success:
            print(f"ERROR: Failed to download {filename} from all mirrors.", file=sys.stderr)
            sys.exit(1)

    kanjivg_dest = os.path.join(DATA_RAW, "kanjivg.xml.gz")
    if not (os.path.exists(kanjivg_dest) and os.path.getsize(kanjivg_dest) > 1000):
        url = get_kanjivg_url()
        downloaded = False
        try:
            download_file(url, kanjivg_dest, "KanjiVG XML")
            downloaded = True
        except Exception as e:
            print(f"Failed to download KanjiVG from {url}: {e}")
            for fallback in KANJIVG_FALLBACK_URLS:
                if fallback == url:
                    continue
                try:
                    download_file(fallback, kanjivg_dest, "KanjiVG XML (fallback)")
                    downloaded = True
                    break
                except Exception as fe:
                    print(f"Fallback {fallback} failed: {fe}")
        if not downloaded:
            print("ERROR: Could not download KanjiVG XML.", file=sys.stderr)
            sys.exit(1)
    else:
        print(f"✓ kanjivg.xml.gz already exists ({os.path.getsize(kanjivg_dest)} bytes). Skipping.")

    print("\nAll raw data sources downloaded successfully!")

if __name__ == "__main__":
    main()
