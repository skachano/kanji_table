# Kanji 2D Structural Table (常用漢字構造表)

An interactive, two-dimensional structural matrix of Japanese kanji that organizes characters by **position-aware radicals** (rows) and **base / phonetic components** (columns).

Designed to help Japanese learners understand kanji composition, recognize phonetic series (形声文字, *keisei moji*), and recall how to write kanji from memory.

---

## 🌟 Key Concepts

### 1. Position-Aware Radicals (Rows)
In traditional dictionaries, all variants of a radical are grouped together. Here, each row is keyed by **`(Radical, Structural Placement)`**:
- **偏 (*hen* / Left):** `⿰口□` (口偏: 唱, 呼), `氵` (さんずい), `扌` (てへん), `亻` (にんべん)
- **旁 (*tsukuri* / Right):** `⿰□口` (和, 知), `刂` (りっとう), `頁` (おおがい)
- **冠 (*kanmuri* / Top):** `⿱口□` (員, 呈), `艹` (くさかんむり), `⺮` (たけかんむり)
- **脚 (*ashi* / Bottom):** `⿱□口` (吉, 古), `心` (したごころ), `灬` (れっか)
- **構・垂・繞 (*kamae*, *tare*, *nyō* / Enclosures):** `⿴囗□` (くにがまえ), `⿸广□` (まだれ), `⿺辶□` (しんにょう)
- **Row 0 (`∅` / 基本形):** The standalone base component itself without any additional radical.

> **Zero Collisions:** Separating radicals by placement ensures that nearly every `(Row, Column)` cell resolves to **at most one unique kanji** (e.g., `口 + 貝` $\to$ `唄` in row `偏`, `員` in row `冠`).

### 2. Base / Phonetic Components (Columns)
Each column represents the residual base or phonetic building block (*onpu* 音符).

### 3. Recursive Column Inclusion (Lax Rule)
If a composite kanji serves as a building block for further kanji, it appears **both** as a decomposed cell in its parent column and as its own column header:
- `車` column: `連` (`辶 + 車 = 連`)
- `連` column: `蓮` (`艹 + 連 = 蓮`), `漣` (`氵 + 連 = 漣`)

### 4. Gojūon On'yomi Color System
Every kanji is color-coded using a 10-hue palette mapped to the initial sound of its primary On'yomi:

| Row | Initial Kana | Hue Family | Example |
| :--- | :--- | :--- | :--- |
| **あ行 (A)** | あ・い・う・え・お | Coral / Red | 愛 (アイ) |
| **か行 (Ka)** | か・き・く・け・こ (＋ が・ぎ・ぐ・げ・ご) | Orange / Amber | 歌 (カ) |
| **さ行 (Sa)** | さ・し・す・せ・そ (＋ ざ・じ・ず・ぜ・ぞ) | Gold / Yellow | 生 (セイ) |
| **た行 (Ta)** | た・ち・つ・て・と (＋ だ・ぢ・づ・で・ど) | Lime / Chartreuse | 大 (タイ) |
| **な行 (Na)** | な・に・ぬ・ね・の | Emerald / Green | 南 (ナン) |
| **は行 (Ha)** | は・ひ・ふ・へ・ほ (＋ ば・び・ぶ・べ・ぼ・ぱ・ぴ・ぷ・ぺ・ぽ) | Teal / Cyan | 方 (ホウ) |
| **ま行 (Ma)** | ま・み・む・め・も | Sky Blue | 万 (マン) |
| **や行 (Ya)** | や・ゆ・よ | Indigo / Violet | 夜 (ヤ) |
| **ら行 (Ra)** | ら・り・る・れ・ろ | Purple / Magenta | 来 (ライ) |
| **わ行 (Wa)** | わ・を | Rose / Pink | 和 (ワ) |
| **訓読み専 (Kun-only)** | *(No On'yomi reading)* | Slate / Gray | 込, 峠, 畑 |

*Because cells in the same column often share phonetic origin, entire columns frequently share the same color family.*

---

## 🚀 Features

- **2D Virtualized Grid:** High-performance scrolling across 1,300+ columns and 440+ rows using `@tanstack/react-virtual`.
- **Counterpart Switcher:** Seamlessly switch between counterpart rows and columns (e.g. `口` column $\leftrightarrow$ `偏: 口偏`, `旁: 口旁`, `冠: 口冠`, `脚: 口脚`, `構: くにがまえ`) with fixed button positions and active highlight.
- **Hierarchical Decomposition Tree & Component Filter:** Click any part in the tree view (e.g. `奉` $\to$ `𡗗` $\to$ `三` $\to$ `一`) to filter the table to all kanji containing that part.
- **Radical Position Filtering:** Quick pills to filter rows by position category (偏, 旁, 冠, 脚, 繞, 垂, 構).
- **Kyūjitai (旧字体) $\leftrightarrow$ Shinjitai (新字体) Navigation:** Bidirectional cross-links between modern and traditional character forms.
- **Kanji Detail Drawer:**
  - Interactive SVG stroke order animator powered by KanjiVG paths.
  - Complete On'yomi / Kun'yomi readings with primary reading badge.
  - Traditional and standard radical identification.
  - English meanings, school grade, JLPT level, and frequency rank.
  - Cross-references to occurrences across the matrix.
- **Filtering & Search:** Instant filter by Jōyō grade (1–6, Secondary), Jinmeiyō, JLPT level (N5–N1), Gojūon row, or free-text search.
- **Light & Dark Theme:** Full dark mode support.

---

## 🛠️ Getting Started

### Option A: Using Docker (Recommended)

1. **Development Server** (with hot-module reloading on `http://localhost:5173`):
   ```bash
   docker compose up dev
   ```

2. **Production Preview** (optimized Nginx build on `http://localhost:8080`):
   ```bash
   docker compose up --build prod
   ```

3. **Rebuild Dataset Pipeline:**
   ```bash
   docker compose run --rm data
   ```

### Option B: Local Setup (Node.js & Python)

**Prerequisites:**
- Node.js 20+
- Python 3.10+

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

3. **Build production bundle:**
   ```bash
   npm run build
   ```

4. **Rebuild dataset (optional):**
   ```bash
   python3 scripts/build_dataset.py
   ```

---

## 📁 Project Structure

```text
kanji_table/
├── data/
│   ├── raw/                  # Downloaded KanjiVG, KANJIDIC2, IDS sources
│   ├── overrides.json        # Curated decomposition & primary On'yomi overrides
│   └── overrides.yaml        # Reference for manual overrides
├── scripts/
│   ├── download_sources.py   # Fetches raw datasets (KanjiVG, KANJIDIC2, Jōyō lists)
│   └── build_dataset.py      # Generates static matrix JSON, validates stroke counts
├── public/
│   └── strokes/              # KanjiVG stroke order SVG paths
├── src/
│   ├── components/
│   │   ├── KanjiMatrix.tsx          # Virtualized 2D table with sticky headers
│   │   ├── KanjiCard.tsx            # Gojūon color-coded kanji cell card
│   │   ├── FilterToolbar.tsx        # Search, position pills, grade/JLPT filters, legend
│   │   ├── KanjiDetailDrawer.tsx    # Slide-over drawer with stroke player & readings
│   │   ├── DecompositionTreeView.tsx# Interactive recursive component tree
│   │   └── RadicalLogogram.tsx      # Visual position logograms (偏, 旁, 冠, etc.)
│   ├── data/
│   │   └── kanji_matrix.json        # Precomputed matrix dataset (3,300+ kanji)
│   ├── types/
│   │   └── kanji.ts                 # TypeScript type definitions
│   ├── utils/
│   │   ├── counterparts.ts          # Radical & component alias switcher
│   │   └── gojuonColors.ts          # Gojūon kana mapping & OKLCH color palettes
│   ├── App.tsx                      # Root application component
│   └── main.tsx                     # Entry point
├── Dockerfile                # Multi-stage build (Python -> Node -> Nginx)
├── docker-compose.yml        # Container orchestration
└── package.json
```

---

## 📊 Dataset Statistics

| Metric | Count |
| :--- | :--- |
| **Total Kanji Indexed** | 3,353 |
| **Jōyō Kanji Coverage** | 2,136 / 2,136 (100.0%) |
| **Total Populated Cells** | 3,783 |
| **Total Rows** | 441 |
| **Total Columns** | 1,323 |
| **Multi-Kanji Columns** | 964 |
| **Matrix Collisions** | **0** (strictly $\le$ 1 kanji per cell) |

---

## 📜 Attribution & Data Sources

- **[KanjiVG](https://kanjivg.tagaini.net/):** Copyright © Ulrich Apel. Used under [Creative Commons Attribution-Share Alike 3.0](https://creativecommons.org/licenses/by-sa/3.0/).
- **[KANJIDIC2](http://www.edrdg.org/wiki/index.php/KANJIDIC_Project):** Property of the Electronic Dictionary Research and Development Group (EDRDG), used under the Creative Commons Attribution-ShareAlike 3.0 Unported licence.
- **[CHISE / cjkvi-ids](https://www.chise.org/):** Ideographic Description Sequences (IDS) decomposition data.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
