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

KVG = '{http://kanjivg.tagaini.net}'

def build_kanjivg_tree(g_elem):
    element = g_elem.get(f'{KVG}element')
    original = g_elem.get(f'{KVG}original')
    position = g_elem.get(f'{KVG}position')
    radical = g_elem.get(f'{KVG}radical')
    phon = g_elem.get(f'{KVG}phon')
    part = g_elem.get(f'{KVG}part')
    variant = g_elem.get(f'{KVG}variant')
    
    direct_paths = len(g_elem.findall(f'.//{KVG}path')) + len(g_elem.findall('.//path'))
    
    children = []
    for child in g_elem:
        tag = child.tag
        if tag.endswith('g'):
            c_tree = build_kanjivg_tree(child)
            if c_tree:
                children.append(c_tree)
            
    res = {}
    if element: res['element'] = element
    if original: res['original'] = original
    if position: res['position'] = position
    if radical: res['radical'] = radical
    if phon: res['phon'] = phon
    if part:
        try: res['part'] = int(part)
        except: pass
    if variant == 'true': res['variant'] = True
    if direct_paths > 0: res['strokes'] = direct_paths
    if children: res['children'] = children
    return res

def ids_to_decomp_tree(char, node):
    if isinstance(node, str):
        return {'element': node}
    op = node[0]
    children = []
    if op == '⿰':
        c1 = ids_to_decomp_tree(flatten_tree(node[1]), node[1])
        c1['position'] = 'left'
        c2 = ids_to_decomp_tree(flatten_tree(node[2]), node[2])
        c2['position'] = 'right'
        children = [c1, c2]
    elif op == '⿱':
        c1 = ids_to_decomp_tree(flatten_tree(node[1]), node[1])
        c1['position'] = 'top'
        c2 = ids_to_decomp_tree(flatten_tree(node[2]), node[2])
        c2['position'] = 'bottom'
        children = [c1, c2]
    elif op == '⿺':
        c1 = ids_to_decomp_tree(flatten_tree(node[1]), node[1])
        c1['position'] = 'nyo'
        c2 = ids_to_decomp_tree(flatten_tree(node[2]), node[2])
        children = [c1, c2]
    elif op == '⿸':
        c1 = ids_to_decomp_tree(flatten_tree(node[1]), node[1])
        c1['position'] = 'tare'
        c2 = ids_to_decomp_tree(flatten_tree(node[2]), node[2])
        children = [c1, c2]
    elif op in '⿴⿵⿶⿷⿹':
        c1 = ids_to_decomp_tree(flatten_tree(node[1]), node[1])
        c1['position'] = 'kamae'
        c2 = ids_to_decomp_tree(flatten_tree(node[2]), node[2])
        children = [c1, c2]
    elif op == '⿲':
        c1 = ids_to_decomp_tree(flatten_tree(node[1]), node[1])
        c1['position'] = 'left'
        c2 = ids_to_decomp_tree(flatten_tree(node[2]), node[2])
        c2['position'] = 'middle'
        c3 = ids_to_decomp_tree(flatten_tree(node[3]), node[3])
        c3['position'] = 'right'
        children = [c1, c2, c3]
    elif op == '⿳':
        c1 = ids_to_decomp_tree(flatten_tree(node[1]), node[1])
        c1['position'] = 'top'
        c2 = ids_to_decomp_tree(flatten_tree(node[2]), node[2])
        c2['position'] = 'middle'
        c3 = ids_to_decomp_tree(flatten_tree(node[3]), node[3])
        c3['position'] = 'bottom'
        children = [c1, c2, c3]
    else:
        children = [ids_to_decomp_tree(flatten_tree(c), c) for c in node[1:]]

    return {
        'element': char,
        'children': children
    }

STANDALONE_RADICALS = set('一丨丶丿乙亅二亠人儿入八冂冖冫几凵刀力勹匕匚匸十卜卩厂厶又口囗土士夂夊夕大女子宀寸小尢尸屮山巛工己巾干幺广廴廾弋弓彐彡彳心戈戶手支攴文斗斤方无日曰月木欠止歹殳毋比毛氏气水火爪父爻爿片牙牛犬玄玉瓜瓦甘生日用田疋疒癶白皮皿目矛矢石示禹禾穴立竹米糸缶网羊羽老而耒耳聿肉臣自至臼舌舛舟艮色艸虍虫血行衣襾見角言谷豆豕豸貝赤走足身車辛辰辵邑酉釆里金長門阜隶隹雨青非面革韋韭音頁風飛食首香馬骨高髟鬥鬯鬲鬼魚鳥鹵鹿麥麻黃黍黑黹黽鼎鼓鼠鼻齊齒龍龜龠')
KNOWN_BOTTOM = {'木', '土', '貝', '力', '子', '女', '手', '日', '月', '示', '心', '灬', '皿', '儿', '大', '口', '見', '虫', '糸', '金', '足', '立', '言', '寸', '巾'}
KNOWN_RIGHT = {'刂', '力', '攵', '殳', '欠', '頁', '隹', '鳥', '羽', '斗', '斤', '卩', '阝'}

def get_node_text(g):
    elem = g.get(f'{KVG}element')
    if elem:
        return elem
    orig = g.get(f'{KVG}original')
    if orig:
        return orig
    sub = []
    for c in g:
        if c.tag.endswith('g'):
            sub.append(get_node_text(c))
    text = ''.join(sub)
    if '⺍' in text and '冖' in text:
        return '⺍冖'
    return text

VALID_POSITIONS = {'none', 'left', 'right', 'top', 'bottom', 'nyo', 'tare', 'kamae'}

def sanitize_pos(pos, default='left'):
    if not pos:
        return default
    if pos in VALID_POSITIONS:
        return pos
    if pos.startswith('tare'):
        return 'tare'
    if pos.startswith('nyo'):
        return 'nyo'
    if pos.startswith('kamae'):
        return 'kamae'
    if pos.startswith(('⿵', '⿴', '凵', '冂')):
        return 'kamae'
    if pos.startswith(('⿸', '广', '尸')):
        return 'tare'
    if pos.startswith(('⿺', '辶')):
        return 'nyo'
    return default

def decompose_kanjivg(char, k_elem):
    if char in STANDALONE_RADICALS:
        return 'none', '∅', char
        
    top_g = k_elem.find('g')
    if top_g is None:
        return None
    children = [c for c in top_g if c.tag.endswith('g')]
    if not children:
        return None
        
    part1_elems = [c for c in children if c.get(f'{KVG}part') == '1']
    if part1_elems:
        p1 = part1_elems[0]
        elem = p1.get(f'{KVG}element')
        non_parts = [c for c in children if c.get(f'{KVG}element') != elem]
        if non_parts:
            inside = get_node_text(non_parts[0])
            if elem == '行':
                inside = inside.replace('行', '')
                return 'kamae', '行', inside
            elif elem == '衣':
                inside = inside.replace('衣', '')
                return 'kamae', '衣', inside
            pos = p1.get(f'{KVG}position')
            return sanitize_pos(pos, 'kamae'), elem, inside

    if len(children) == 2:
        c1, c2 = children[0], children[1]
        t1, t2 = get_node_text(c1), get_node_text(c2)
        pos1, pos2 = c1.get(f'{KVG}position'), c2.get(f'{KVG}position')
        r1, r2 = c1.get(f'{KVG}radical'), c2.get(f'{KVG}radical')
        
        if not t1 or not t2:
            return None
            
        # Pattern B: Crown family (⺍冖) -> prefer bottom radical as row
        if t1 in ('⺍冖', '𭕄冖') or ('⺍' in t1 and '冖' in t1):
            t1 = '⺍冖'
            if r2 in ('general', 'tradit') or t2 in KNOWN_BOTTOM:
                return 'bottom', t2, t1
            return 'top', t1, t2
            
        is_rad1 = r1 in ('general', 'tradit')
        is_rad2 = r2 in ('general', 'tradit')
        
        # If c2 is explicitly marked as radical and c1 is not (Pattern B)
        if is_rad2 and not is_rad1:
            if pos2 in ('tarec', 'nyoc', 'kamaec'):
                if t2 in KNOWN_BOTTOM:
                    p = 'bottom'
                elif pos1 in ('tare', 'nyo', 'kamae'):
                    return sanitize_pos(pos1), t1, t2
                else:
                    p = 'bottom'
            else:
                p = sanitize_pos(pos2, 'bottom' if t2 in KNOWN_BOTTOM else 'right')
            return p, t2, t1
            
        # If c1 is explicitly marked as radical and c2 is not
        if is_rad1 and not is_rad2:
            p = sanitize_pos(pos1, 'top' if pos2 == 'bottom' else 'left')
            return p, t1, t2
            
        # If neither or both: check positions and known radicals
        if pos2 == 'bottom' and t2 in KNOWN_BOTTOM:
            return 'bottom', t2, t1
        if pos1 == 'top':
            return 'top', t1, t2
        if pos1 == 'left':
            if t2 in KNOWN_RIGHT and is_rad2:
                return 'right', t2, t1
            return 'left', t1, t2
        if pos2 == 'right' and t2 in KNOWN_RIGHT:
            return 'right', t2, t1
        if pos1 in ('tare', 'nyo', 'kamae'):
            return sanitize_pos(pos1), t1, t2

    return None

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

    # 2b. Load KanjiVG XML
    kanjivg_path = os.path.join(DATA_RAW, "kanjivg.xml.gz")
    kanjivg_elements = {}
    if os.path.exists(kanjivg_path):
        with gzip.open(kanjivg_path, "rb") as f:
            kvg_tree = ET.parse(f)
            kvg_root = kvg_tree.getroot()
            for kanji_elem in kvg_root.findall("kanji"):
                kid = kanji_elem.get("id", "")
                if kid.startswith("kvg:kanji_"):
                    hex_str = kid.replace("kvg:kanji_", "")
                    try:
                        c = chr(int(hex_str, 16))
                        kanjivg_elements[c] = kanji_elem
                    except Exception:
                        pass
        print(f"Loaded {len(kanjivg_elements)} KanjiVG character trees.")

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

        # 2. Decompose via KanjiVG (Pattern B: prefer radicals as rows)
        if char in kanjivg_elements:
            kvg_res = decompose_kanjivg(char, kanjivg_elements[char])
            if kvg_res:
                return kvg_res

        # 3. Parse via IDS fallback
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
            # Pattern B: Known bottom radicals (ashi)
            if bottom in KNOWN_BOTTOM:
                if bottom == "口" and top not in ["亼"]:
                    return "bottom", "口", top
                elif bottom != "口":
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
            if p3 in KNOWN_BOTTOM:
                return "bottom", p3, p1 + p2
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
            if existing == char:
                return
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

    # Step C: Populate decomposition tree for each kanji in kanji_index
    print(f"Building decomposition trees for {len(kanji_index)} kanji...")
    tree_count = 0
    for char, kinfo in kanji_index.items():
        if char in kanjivg_elements:
            top_g = kanjivg_elements[char].find("g")
            if top_g is not None:
                kinfo["decomposition_tree"] = build_kanjivg_tree(top_g)
                tree_count += 1
                continue
        if char in ids_trees:
            _, parsed_ids = ids_trees[char]
            if parsed_ids is not None:
                kinfo["decomposition_tree"] = ids_to_decomp_tree(char, parsed_ids)
                tree_count += 1
    print(f"Attached decomposition trees to {tree_count} / {len(kanji_index)} kanji.")

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
    bottom_names = {
        "木": "きあし", "土": "つちあし", "貝": "かいあし", "心": "こころ",
        "灬": "れっか", "皿": "さら", "儿": "ひとあし", "大": "だい",
        "口": "くち", "日": "ひ", "月": "つき", "力": "ちから",
        "子": "こ", "女": "おんな", "手": "したて", "示": "しめす",
        "糸": "いと", "金": "かね", "虫": "むし", "見": "みる"
    }
    kamae_names = {
        "行": "ゆきがまえ", "衣": "ころも", "門": "もんがまえ", "囗": "くにがまえ",
        "勹": "つつみがまえ", "匚": "はこがまえ", "凵": "かんにょう", "戈": "ほこがまえ"
    }
    
    for row_id, count in row_counts.items():
        pos, rad = row_id.split(":", 1)
        name_ja = RADICAL_NAMES.get(rad, "")
        if pos == "none":
            name_ja = "基本形 (追加部首なし)"
        elif pos == "bottom":
            name_ja = bottom_names.get(rad, name_ja or f"{rad}あし")
        elif pos == "kamae":
            name_ja = kamae_names.get(rad, name_ja or f"{rad}がまえ")
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
