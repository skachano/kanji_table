#!/usr/bin/env python3
"""
scripts/build_dataset.py
Builds the static 2D Kanji Structural Matrix dataset:
1. Loads raw datasets (kanji-jouyou.json, kanji.json, ids.txt, kanjivg.xml.gz, overrides.json).
2. Maps each character's primary On'yomi to its Gojūon row (あ, か, さ, た, な, は, ま, や, ら, わ, or kun_only).
3. Decomposes each kanji into (radical at position, base component) using IDS + KanjiVG + overrides.
4. Populates the 2D matrix where:
   - Row: position-aware radical (e.g. left:氵, top:艹, nyo:辶), with Row 0 being 'none:∅'.
   - Column: base component (lax inclusion: composite kanji like 連 appear both in Col 車 and Col 連).
5. Audits collisions (guaranteeing <= 1 kanji per cell).
6. Outputs src/data/kanji_matrix.json.
"""

import gzip
import json
import os
import sys
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_RAW = os.path.join(ROOT_DIR, "data", "raw")
SRC_DATA = os.path.join(ROOT_DIR, "src", "data")
OVERRIDES_FILE = os.path.join(ROOT_DIR, "data", "overrides.json")

# Gojūon Row 10-hue definition
GOJUON_ROWS = [
    {"id": "a", "label": "あ行", "hue": 25, "kana": ["あ", "い", "う", "え", "お"]},
    {"id": "ka", "label": "か行", "hue": 55, "kana": ["か", "き", "く", "け", "こ", "が", "ぎ", "ぐ", "げ", "ご"]},
    {"id": "sa", "label": "さ行", "hue": 90, "kana": ["さ", "し", "す", "せ", "そ", "ざ", "じ", "ず", "ぜ", "ぞ"]},
    {"id": "ta", "label": "た行", "hue": 130, "kana": ["た", "ち", "つ", "て", "と", "だ", "ぢ", "づ", "で", "ど"]},
    {"id": "na", "label": "な行", "hue": 160, "kana": ["な", "に", "ぬ", "ね", "の"]},
    {"id": "ha", "label": "は行", "hue": 195, "kana": ["は", "ひ", "ふ", "へ", "ほ", "ば", "び", "ぶ", "べ", "ぼ", "ぱ", "ぴ", "ぷ", "ぺ", "ぽ"]},
    {"id": "ma", "label": "ま行", "hue": 235, "kana": ["ま", "み", "む", "め", "も"]},
    {"id": "ya", "label": "や行", "hue": 275, "kana": ["や", "ゆ", "よ"]},
    {"id": "ra", "label": "ら行", "hue": 315, "kana": ["ら", "り", "る", "れ", "ろ"]},
    {"id": "wa", "label": "わ行", "hue": 350, "kana": ["わ", "を"]},
    {"id": "kun_only", "label": "訓のみ", "hue": 0, "kana": []},
]

KANA_TO_ROW = {}
VOICED_KANA = set("がぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽ")
for row in GOJUON_ROWS:
    for k in row["kana"]:
        KANA_TO_ROW[k] = row["id"]

# Common radical names in Japanese
RADICAL_NAMES = {
    "亻": "にんべん",
    "氵": "さんずい",
    "扌": "てへん",
    "木": "きへん",
    "口": "くちへん",
    "言": "ごんべん",
    "糸": "いとへん",
    "金": "かねへん",
    "日": "ひへん",
    "火": "ひへん",
    "月": "つきへん",
    "土": "つちへん",
    "女": "おんなへん",
    "犭": "けものへん",
    "禾": "のぎへん",
    "目": "めへん",
    "石": "いしへん",
    "貝": "かいへん",
    "車": "くるまへん",
    "虫": "むしへん",
    "弓": "ゆみへん",
    "彳": "ぎょうにんべん",
    "礻": "しめすへん",
    "足": "あしへん",
    "酉": "とりへん",
    "魚": "うおへん",
    "刂": "りっとう",
    "力": "ちから",
    "攵": "のぶん",
    "殳": "ほこづくり",
    "欠": "あくび",
    "頁": "おおがい",
    "隹": "ふるとり",
    "鳥": "とり",
    "羽": "はね",
    "斗": "とます",
    "斤": "おのづくり",
    "卩": "ふしづくり",
    "艹": "くさかんむり",
    "⺮": "たけかんむり",
    "竹": "たけかんむり",
    "⻗": "あめかんむり",
    "雨": "あめかんむり",
    "宀": "うかんむり",
    "冖": "わかんむり",
    "穴": "あなかんむり",
    "⺌": "しょうかんむり",
    "亠": "なべぶた",
    "爫": "つめかんむり",
    "心": "こころ",
    "灬": "れっか",
    "皿": "さら",
    "儿": "ひとあし",
    "大": "だい",
    "辶": "しんにょう",
    "廴": "えんにょう",
    "走": "そうにょう",
    "广": "まだれ",
    "厂": "がんだれ",
    "疒": "やまいだれ",
    "尸": "しかばね",
    "戸": "とだれ",
    "門": "もんがまえ",
    "囗": "くにがまえ",
    "勹": "つつみがまえ",
    "匚": "はこがまえ",
    "凵": "かんにょう",
    "戈": "ほこがまえ",
}

def hira_to_kata(hira: str) -> str:
    res = []
    for c in hira:
        code = ord(c)
        if 0x3041 <= code <= 0x3096:
            res.append(chr(code + 0x60))
        else:
            res.append(c)
    return "".join(res)

def kata_to_hira(kata: str) -> str:
    res = []
    for c in kata:
        code = ord(c)
        if 0x30A1 <= code <= 0x30F6:
            res.append(chr(code - 0x60))
        else:
            res.append(c)
    return "".join(res)

def get_position_label(pos: str, rad: str) -> str:
    if pos == "none":
        return "∅ (基本形)"
    elif pos == "left":
        return f"⿰{rad}□"
    elif pos == "right":
        return f"⿰□{rad}"
    elif pos == "top":
        return f"⿱{rad}□"
    elif pos == "bottom":
        return f"⿱□{rad}"
    elif pos == "nyo":
        return f"⿺{rad}□"
    elif pos == "tare":
        return f"⿸{rad}□"
    elif pos == "kamae":
        return f"⿴{rad}□"
    return f"{pos}:{rad}"

def parse_ids_top(tokens):
    if not tokens:
        return None, []
    op = tokens[0]
    if op in '⿰⿱⿴⿵⿶⿷⿸⿹⿺⿻':
        l, r1 = parse_ids_top(tokens[1:])
        r, r2 = parse_ids_top(r1)
        return (op, l, r), r2
    elif op in '⿲⿳':
        p1, r1 = parse_ids_top(tokens[1:])
        p2, r2 = parse_ids_top(r1)
        p3, r3 = parse_ids_top(r2)
        return (op, p1, p2, p3), r3
    else:
        return op, tokens[1:]

def flatten_tree(node):
    if isinstance(node, str):
        return node
    return "".join(flatten_tree(c) for c in node[1:])

def load_overrides():
    if os.path.exists(OVERRIDES_FILE):
        with open(OVERRIDES_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"kanji": {}, "column_aliases": {}, "primary_onyomi": {}}

def main():
    print("Building Kanji 2D Structural Matrix dataset...")
    os.makedirs(SRC_DATA, exist_ok=True)

    overrides = load_overrides()
    kanji_overrides = overrides.get("kanji", {})
    col_aliases = overrides.get("column_aliases", {})
    onyomi_overrides = overrides.get("primary_onyomi", {})

    # 1. Load Dictionary Data
    with open(os.path.join(DATA_RAW, "kanji-jouyou.json"), "r", encoding="utf-8") as f:
        joyo_data = json.load(f)
    print(f"Loaded {len(joyo_data)} Jōyō kanji.")

    with open(os.path.join(DATA_RAW, "kanji.json"), "r", encoding="utf-8") as f:
        all_kanji_data = json.load(f)
    print(f"Loaded {len(all_kanji_data)} total dictionary kanji.")

    # 2. Load IDS
    ids_trees = {}
    with open(os.path.join(DATA_RAW, "ids.txt"), "r", encoding="utf-8") as f:
        for line in f:
            parts = line.strip().split("\t")
            if len(parts) >= 3:
                char = parts[1]
                if char not in ids_trees:
                    raw = parts[2].split("[")[0]
                    tree, _ = parse_ids_top(list(raw))
                    ids_trees[char] = (raw, tree)
    print(f"Loaded {len(ids_trees)} IDS sequences.")

    # Target kanji set: All Jōyō + Jinmeiyō (grade 9 & 10 from KANJIDIC)
    # Exclude CJK Compatibility Ideographs block (0xF900-0xFAFF) which are legacy duplicate code points
    target_kanji = {}
    for char, info in all_kanji_data.items():
        code = ord(char)
        if 0xF900 <= code <= 0xFAFF:
            continue
        grade = info.get("grade")
        if char in joyo_data:
            target_kanji[char] = {**info, "is_joyo": True}
        elif grade in (9, 10):
            target_kanji[char] = {**info, "is_joyo": False}
        elif char in kanji_overrides:
            target_kanji[char] = {**info, "is_joyo": False}

    print(f"Target dataset: {len(target_kanji)} kanji ({len(joyo_data)} Jōyō, {len(target_kanji)-len(joyo_data)} Jinmeiyō).")

    # 3. Decompose each target kanji
    def decompose(char: str):
        # 1. Check override
        if char in kanji_overrides:
            ov = kanji_overrides[char]
            return ov["position"], ov["radical"], ov["base"]

        # 2. Parse via IDS
        ids_entry = ids_trees.get(char)
        tree = ids_entry[1] if ids_entry else None
        if isinstance(tree, str) or tree is None:
            return "none", "∅", char

        op = tree[0]
        if op == "⿰":
            left = flatten_tree(tree[1])
            right = flatten_tree(tree[2])
            # Known right-side radicals (tsukuri)
            if right in ["刂", "力", "攵", "殳", "欠", "頁", "隹", "鳥", "羽", "斗", "斤", "卩", "阝"]:
                if right == "阝":
                    return "right", "阝", left
                return "right", right, left
            elif left == "阝":
                return "left", "阝", right
            return "left", left, right

        elif op == "⿱":
            top = flatten_tree(tree[1])
            bottom = flatten_tree(tree[2])
            # Known bottom radicals (ashi)
            if bottom in ["灬", "心", "皿", "儿", "大", "口"]:
                if bottom == "口" and top not in ["亼"]:
                    # e.g. 古, 吉, 召, 台, 否
                    return "bottom", "口", top
                elif bottom in ["灬", "心", "皿", "儿", "大"]:
                    return "bottom", bottom, top
            return "top", top, bottom

        elif op == "⿺":
            rad = flatten_tree(tree[1])
            base = flatten_tree(tree[2])
            return "nyo", rad, base

        elif op == "⿸":
            rad = flatten_tree(tree[1])
            base = flatten_tree(tree[2])
            return "tare", rad, base

        elif op in "⿴⿵⿶⿷⿹":
            rad = flatten_tree(tree[1])
            base = flatten_tree(tree[2])
            return "kamae", rad, base

        elif op == "⿲":
            p1 = flatten_tree(tree[1])
            p2 = flatten_tree(tree[2])
            p3 = flatten_tree(tree[3])
            return "left", p1, p2 + p3

        elif op == "⿳":
            p1 = flatten_tree(tree[1])
            p2 = flatten_tree(tree[2])
            p3 = flatten_tree(tree[3])
            return "top", p1, p2 + p3

        return "none", "∅", char

    decompositions = {}
    component_children = {}  # base_col -> list of composite kanji

    for char in target_kanji:
        pos, rad, base = decompose(char)
        # normalize base using column_aliases
        base = col_aliases.get(base, base)
        # normalize radical
        if rad == "⻌": rad = "辶"
        if rad == "⺮": rad = "竹"
        if rad == "⻗": rad = "雨"
        decompositions[char] = (pos, rad, base)

        if pos != "none":
            if base not in component_children:
                component_children[base] = []
            component_children[base].append(char)

    # Lax / Recursive Column Inclusion:
    # A column is formed by:
    # 1. Any base component that has >= 1 composite kanji
    # 2. Standalone kanji that also act as building blocks
    all_columns = set(component_children.keys())

    # For every column component that is a recognized kanji, ensure it also appears in Row 0 (none:∅)
    for col_char in list(all_columns):
        if col_char in target_kanji:
            # col_char will have a cell at (none:∅, col_char)
            pass

    # Build rows and cells
    cells = {}
    row_counts = {}
    col_counts = {}
    kanji_index = {}
    collisions = []

    def get_on_reading_info(char: str):
        info = target_kanji.get(char, {})
        # check override
        if char in onyomi_overrides:
            primary_hira = kata_to_hira(onyomi_overrides[char])
        else:
            ons = info.get("readings_on", [])
            primary_hira = ons[0] if ons else ""
        
        primary_kata = hira_to_kata(primary_hira)
        if not primary_hira:
            return "", "kun_only", False
        
        first_c = primary_hira[0]
        gojuon_row = KANA_TO_ROW.get(first_c, "a")
        is_voiced = first_c in VOICED_KANA
        return primary_kata, gojuon_row, is_voiced

    def register_cell(char: str, row_id: str, col_id: str, is_base_comp: bool):
        key = f"{row_id}::{col_id}"
        info = target_kanji.get(char, all_kanji_data.get(char, {}))
        char_is_joyo = info.get("is_joyo", char in joyo_data)

        if key in cells:
            existing = cells[key]["kanji"]
            if existing != char:
                existing_is_joyo = cells[key]["is_joyo"]
                # If one is modern Joyo and the other is a traditional/kyujitai variant,
                # attach variant to the canonical character instead of colliding
                if existing_is_joyo and not char_is_joyo:
                    if "variants" not in cells[key]:
                        cells[key]["variants"] = []
                    cells[key]["variants"].append(char)
                    return
                elif char_is_joyo and not existing_is_joyo:
                    # Replace with Joyo character, attach previous as variant
                    old_variants = cells[key].get("variants", [])
                    old_char = cells[key]["kanji"]
                    del cells[key]
                    register_cell(char, row_id, col_id, is_base_comp)
                    cells[key]["variants"] = old_variants + [old_char]
                    return
                else:
                    # Both same status: check if one is standard and one is traditional variant
                    # Prioritize the one with lower stroke count (simplification)
                    if info.get("strokes", 99) > cells[key]["strokes"]:
                        if "variants" not in cells[key]:
                            cells[key]["variants"] = []
                        cells[key]["variants"].append(char)
                        return
                    else:
                        old_char = cells[key]["kanji"]
                        old_variants = cells[key].get("variants", [])
                        del cells[key]
                        register_cell(char, row_id, col_id, is_base_comp)
                        cells[key]["variants"] = old_variants + [old_char]
                        return

        primary_on, gojuon_row, is_voiced = get_on_reading_info(char)
        has_own_col = char in all_columns

        # check if this kanji is composite
        decomp_pos, decomp_rad, decomp_base = decompositions.get(char, ("none", "∅", char))
        decomposed_as = None
        if decomp_pos != "none":
            decomposed_as = {
                "row_id": f"{decomp_pos}:{decomp_rad}",
                "col_id": decomp_base,
            }

        cell_data = {
            "kanji": char,
            "row_id": row_id,
            "col_id": col_id,
            "primary_onyomi": primary_on,
            "gojuon_row": gojuon_row,
            "is_voiced": is_voiced,
            "grade": info.get("grade", 0),
            "is_joyo": info.get("is_joyo", char in joyo_data),
            "jlpt": info.get("jlpt_new") or info.get("jlpt_old"),
            "frequency": info.get("freq"),
            "strokes": info.get("strokes", 0),
            "meanings": info.get("meanings", []),
            "all_onyomi": [hira_to_kata(r) for r in info.get("readings_on", [])],
            "all_kunyomi": info.get("readings_kun", []),
            "has_own_column": has_own_col,
            "is_base_component": is_base_comp,
            "decomposed_as": decomposed_as,
        }
        cells[key] = cell_data

        row_counts[row_id] = row_counts.get(row_id, 0) + 1
        col_counts[col_id] = col_counts.get(col_id, 0) + 1

        if char not in kanji_index:
            kanji_index[char] = {"char": char, "placements": []}
        kanji_index[char]["placements"].append({"row_id": row_id, "col_id": col_id})

    # Step A: Place decomposed composite kanji
    for char, (pos, rad, base) in decompositions.items():
        if pos != "none":
            row_id = f"{pos}:{rad}"
            register_cell(char, row_id, base, is_base_comp=False)

    # Step B: Place base components into Row 0 (none:∅)
    # 1. Any column component that is a recognized kanji
    for col_char in all_columns:
        if col_char in target_kanji or col_char in all_kanji_data:
            register_cell(col_char, "none:∅", col_char, is_base_comp=True)

    # 2. Any standalone kanji with pos == 'none'
    for char, (pos, rad, base) in decompositions.items():
        if pos == "none":
            register_cell(char, "none:∅", char, is_base_comp=True)

    # Collision Audit Check
    print(f"\n--- COLLISION AUDIT ---")
    print(f"Total cells placed: {len(cells)}")
    print(f"Collisions detected: {len(collisions)}")
    if collisions:
        for r, c, c1, c2 in collisions:
            print(f"  COLLISION at Row={r}, Col={c}: '{c1}' vs '{c2}'")
    else:
        print("✓ SUCCESS: Exactly 0 collisions! Every cell contains at most 1 kanji.")

    # 4. Construct Sorted Rows
    # Positional order: none (Row 0), then left, right, top, bottom, nyo, tare, kamae
    POS_ORDER = {"none": 0, "left": 1, "right": 2, "top": 3, "bottom": 4, "nyo": 5, "tare": 6, "kamae": 7}
    
    unique_rows = []
    for row_id, count in row_counts.items():
        pos, rad = row_id.split(":", 1)
        name_ja = RADICAL_NAMES.get(rad, "")
        if pos == "none":
            name_ja = "基本形 (追加部首なし)"
        elif pos == "left" and "へん" not in name_ja and rad in RADICAL_NAMES:
            name_ja = RADICAL_NAMES[rad]
        
        unique_rows.append({
            "id": row_id,
            "position": pos,
            "radical": rad,
            "label": get_position_label(pos, rad),
            "name_ja": name_ja,
            "kanji_count": count,
        })

    # Sort rows: pos order, then descending by kanji count
    unique_rows.sort(key=lambda r: (POS_ORDER.get(r["position"], 99), -r["kanji_count"]))

    # 5. Construct Sorted Columns
    unique_cols = []
    all_col_ids = set(c["col_id"] for c in cells.values())
    for col_id in all_col_ids:
        info = target_kanji.get(col_id, all_kanji_data.get(col_id, {}))
        count = col_counts.get(col_id, 0)
        primary_on, gojuon_row, _ = get_on_reading_info(col_id) if info else ("", "", False)
        
        unique_cols.append({
            "id": col_id,
            "glyph": col_id,
            "kanji_count": count,
            "is_joyo": col_id in joyo_data,
            "primary_onyomi": primary_on,
            "gojuon_row": gojuon_row,
            "meanings": info.get("meanings", []),
            "stroke_count": info.get("strokes"),
        })

    # Sort columns: descending by kanji count (density), then stroke count
    unique_cols.sort(key=lambda c: (-c["kanji_count"], c["stroke_count"] or 99, c["id"]))

    # 6. Coverage Statistics
    joyo_cells = [c for c in cells.values() if c["is_joyo"]]
    joyo_unique_kanji = set(c["kanji"] for c in joyo_cells)
    multi_kanji_cols = [c for c in unique_cols if c["kanji_count"] >= 2]
    
    metadata = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_kanji": len(kanji_index),
        "joyo_coverage": f"{len(joyo_unique_kanji)} / {len(joyo_data)} ({len(joyo_unique_kanji)/len(joyo_data)*100:.1f}%)",
        "total_cells": len(cells),
        "total_rows": len(unique_rows),
        "total_columns": len(unique_cols),
        "multi_kanji_columns": len(multi_kanji_cols),
        "collision_count": len(collisions),
    }

    print("\n--- DATASET METRICS ---")
    for k, v in metadata.items():
        print(f"  {k}: {v}")

    # Output structure
    output_bundle = {
        "metadata": metadata,
        "gojuon_rows": GOJUON_ROWS,
        "rows": unique_rows,
        "columns": unique_cols,
        "cells": cells,
        "kanji_index": kanji_index,
    }

    out_file = os.path.join(SRC_DATA, "kanji_matrix.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(output_bundle, f, ensure_ascii=False, indent=2)

    print(f"\nSuccessfully wrote {os.path.getsize(out_file)} bytes to {out_file}")

if __name__ == "__main__":
    main()
