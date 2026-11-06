# Kanji 2D Structural Table — Development Plan

## 1. Project Overview & Vision

The **Kanji 2D Structural Table** is an interactive web application that arranges kanji in a two-dimensional matrix based on their structural parts. Its primary goal is to help learners write kanji from memory by visually grouping characters that share components and phonetic patterns.

### Core Concepts
- **Rows (Position-Aware Radicals / Semantic Modifiers):** Each row corresponds to a semantic radical paired with its **structural placement** (e.g., `⿰口` left, `⿱口` top, `⿱口` bottom, `氵` left, `艹` top, `辶` nyō), with the **first row (`∅` / "No Additional Radical")** representing the standalone base component itself. Separating radicals by placement matches traditional Japanese *bushu* categories (*hen* 偏, *tsukuri* 旁, *kanmuri* 冠, *ashi* 脚, *tare* 垂, *nyō* 繞, *kamae* 構) and ensures almost every `(Row, Column)` intersection resolves to a **single unique kanji**.
- **Columns (Base / Phonetic Components):** Each column represents the remainder of the kanji after removing the row radical (often acting as the phonetic component / 音符, *onpu*).
- **Lax / Recursive Column Inclusion:** A composite kanji can appear both as a decomposed cell (`Row Radical + Column Base`) and as a column header of its own if it serves as a building block for further kanji.
  - *Example:* `車` is a column header (`∅ + 車 = 車`, `辶 + 車 = 連`). Because `連` appears inside `蓮` (`艹 + 連`), `連` also gets its own column (`∅ + 連 = 連`, `艹 + 連 = 蓮`, `氵 + 連 = 漣`).
- **On'yomi Gojūon Color Coding:** Each kanji card is colored using a 10-hue palette corresponding to the **gojūon row (あ・か・さ・た・な・は・ま・や・ら・わ行)** of its most common On'yomi reading. This visually highlights phonetic series (形声文字) inside a column when cells share the same hue.
- **Scope Progression:**
  - **Phase 1 (MVP):** 2,136 **Jōyō Kanji (常用漢字)**.
  - **Future Expansion:** Jinmeiyō Kanji (人名用漢字), Hyōgai Kanji (表外漢字), and non-kanji component glyphs (CDP / Unicode Ideographic components).

---

## 2. Architecture & Tech Stack

### 2.1 Data Pipeline (Build-Time / Offline)
- **Language:** Python 3 (or Node.js/TypeScript scripts) run at build time.
- **Primary Data Sources:**
  - **KanjiVG:** SVG stroke paths annotated with structural `kvg:element`, `kvg:position`, and `kvg:radical` attributes (primary source for top-level binary/multi-way splits and stroke order diagrams).
  - **CHISE IDS / cjkvi-ids:** Ideographic Description Sequences (`⿰`, `⿱`, `⿴`, etc.) as a fallback and cross-check for structural decomposition.
  - **KANJIDIC2 & Jōyō Official List:** Official Jōyō status, school grades, JLPT levels, stroke counts, meanings, On'yomi/Kun'yomi readings, and character frequency ranks.
  - **Corpus / Reading Frequency Data:** Used to determine the **most common On'yomi** for each kanji (e.g., via balanced vocabulary frequency lists such as BCCWJ / JMdict word frequencies weighted by kanji occurrence).
- **Output Artifact:** Static, pre-indexed JSON data bundles (`kanji-matrix.json`, `kanji-details.json`) consumed directly by the frontend with zero backend runtime overhead.

### 2.2 Frontend Web Application
- **Framework:** React 19 + TypeScript + Vite.
- **Grid Virtualization:** `@tanstack/react-virtual` for smooth 60fps 2D scrolling across hundreds of columns and dozens of rows.
- **State Management:** Zustand or React Context + URL query sync (for shareable filter/selection states).
- **Styling:** Tailwind CSS + CSS Custom Properties (`--hue-a`, `--hue-ka`, etc.) for accessible light/dark mode and gojūon color theming.

### 2.3 Containerization & Deployment (Docker)
- **Multi-Stage `Dockerfile`:**
  1. **Stage 1 (`data-builder` — `python:3.12-slim`):** Runs `scripts/download_sources.py` and `scripts/build_dataset.py` to generate `src/data/kanji_matrix.json` reproducibly inside an isolated container.
  2. **Stage 2 (`frontend-builder` — `node:22-alpine`):** Installs frontend dependencies, copies the generated `kanji_matrix.json` from Stage 1, and builds the static production bundle (`npm run build` -> `dist/`).
  3. **Stage 3 (`runtime` — `nginx:alpine`):** Serves the compiled static assets from `dist/` with gzip/brotli compression and SPA caching headers on port `80` (`8080` unprivileged).
- **`docker-compose.yml`:**
  - `dev` service: Runs the Vite dev server with hot-module reloading (`HMR`) and bind-mounted `src/` and `data/` volumes (`http://localhost:5173`).
  - `data` profile/service: One-off container command (`docker compose run --rm data`) to re-download sources or rebuild `kanji_matrix.json` after editing `data/overrides.json`.
  - `prod` service: Builds and serves the production Nginx image locally (`http://localhost:8080`).

---

## 3. Data Modeling & Decomposition Algorithm

### 3.1 The 2D Matrix Assignment Rules
To populate the table effectively for visual memory while **strictly targeting 1 kanji per `(Row, Column)` cell**:

1. **Position-Aware Row Keys `(Radical, Position)`:**
   - Instead of grouping all uses of a radical into one row, each row is uniquely keyed by **`(Radical, Placement)`**, derived directly from KanjiVG's `kvg:position` attribute and/or CHISE IDS operators (`⿰`, `⿱`, `⿴`, `⿵`, `⿶`, `⿷`, `⿸`, `⿹`, `⿺`, `⿻`).
   - Standard positional slots (matching traditional Japanese *bushu* positions):
     - **`⿰X□` (Left / 偏 *hen*):** e.g., `⿰口□` (くちへん: `吸`, `叫`, `唄`), `氵` (`⿰氵□`), `扌` (`⿰扌□`), `忄` (`⿰忄□`).
     - **`⿰□X` (Right / 旁 *tsukuri*):** e.g., `⿰□口` (`和`, `知`), `刂` (`⿰□刂`), `力` (`⿰□力`), `欠` (`⿰□欠`).
     - **`⿱X□` (Top / 冠 *kanmuri*):** e.g., `⿱口□` (`員`, `呈`, `呆`), `艹` (`⿱艹□`), `竹/⺮` (`⿱⺮□`), `雨/⻗` (`⿱⻗□`).
     - **`⿱□X` (Bottom / 脚 *ashi*):** e.g., `⿱□口` (`古`, `吉`, `召`), `心` (`⿱□心`, vs `⿰忄□` on the left), `灬` (`⿱□灬`), `皿` (`⿱□皿`).
     - **Enclosures (*tare* 垂 `⿸`, *nyō* 繞 `⿺`, *kamae* 構 `⿴/⿵/⿶/⿷`):** e.g., `⿸广□`, `⿸疒□`, `⿺辶□`, `⿴囗□`, `⿵門□`.
   - **Why this eliminates multi-kanji cell collisions:**
     - Pairs that share the exact same radical and base component almost always differ in placement:
       - `口` + `貝`: **`唄`** is `(⿰口□, 貝)` while **`員`** is `(⿱口□, 貝)`.
       - `心` + `亡`: **`忙`** is `(⿰忄□, 亡)` while **`忘`** is `(⿱□心, 亡)`.
       - `日` + `立`: **`拉`** vs **`泣`** vs **`粒`**; for `日`: **`暗`** is `(⿰日□, 音)` while **`意`** (`音 + 心`) or **`昱`** (`⿱日立`) vs **``** take distinct positional rows.
       - `木` + `公`: **`松`** is `(⿰木□, 公)` while **`枩`** is `(⿱木□, 公)`.
2. **Column Qualification Criterion (Lax Rule):**
   - A component $C$ qualifies as a column if:
     - It appears as the non-radical part of at least $N \ge 1$ composite kanji in the active dataset (configurable threshold, e.g., $N \ge 2$ by default or $N \ge 1$ when "Show all columns" is toggled), **OR**
     - It is a standalone kanji that also acts as a component in another kanji (e.g., `連` in `蓮`).
3. **Dual / Multi-Placement Support across the Grid:**
   - **Self-Row (`Row 0: ∅`):** If a column header $C$ is itself a valid kanji (e.g., `連`, `青`, `寺`, `包`), it is placed in `(Row: ∅, Col: C)`.
   - **Decomposed Cell (`Row: (R, Pos), Col: C'`):** If $C$ can itself be decomposed into a positioned radical $(R, \text{Pos})$ and base component $C'$ (e.g., `連 = ⿺辶□ + 車`), `連` **also** appears in `(Row: ⿺辶□, Col: 車)`.
4. **Collision Audit & Curated Overrides (`data/overrides.yaml`):**
   - During the build-time pipeline (`scripts/build_dataset.py`), any remaining `(Row, Column)` collision after positional separation is automatically flagged in a build report.
   - True homomorphic collisions in Jōyō kanji (where two different kanji have the exact same radical in the exact same position with the exact same residual component) are virtually nonexistent; any edge cases caused by glyph simplification or variant radical choices are resolved cleanly via `data/overrides.yaml` so every cell contains **at most 1 kanji**.

### 3.2 On'yomi Gojūon Color System
Every kanji with an On'yomi reading is mapped to one of the **10 Gojūon rows** based on the **first kana** of its primary (most frequent) On'yomi:

| Row | Kana Initials (Voiced / P-sound normalized to base row) | Suggested Hue Family (OKLCH) |
| :--- | :--- | :--- |
| **あ行 (A)** | あ・い・う・え・お | Red / Coral (`~25°`) |
| **か行 (Ka)** | か・き・く・け・こ (＋ が・ぎ・ぐ・げ・ご) | Orange / Amber (`~55°`) |
| **さ行 (Sa)** | さ・し・す・せ・そ (＋ ざ・じ・ず・ぜ・ぞ) | Yellow / Gold (`~90°`) |
| **た行 (Ta)** | た・ち・つ・て・と (＋ だ・ぢ・づ・で・ど) | Lime / Chartreuse (`~130°`) |
| **な行 (Na)** | な・に・ぬ・ね・の | Emerald / Green (`~160°`) |
| **は行 (Ha)** | は・ひ・ふ・へ・ほ (＋ ば・び・ぶ・べ・ぼ・ぱ・ぴ・ぷ・ぺ・ぽ) | Teal / Cyan (`~195°`) |
| **ま行 (Ma)** | ま・み・む・め・も | Blue (`~235°`) |
| **や行 (Ya)** | や・ゆ・よ | Indigo / Violet (`~275°`) |
| **ら行 (Ra)** | ら・り・る・れ・ろ | Purple / Magenta (`~315°`) |
| **わ行 (Wa)** | わ・を | Rose / Pink (`~350°`) |
| **Kun-only** | *(No On'yomi, e.g., `込`, `峠`, `畑`)* | Neutral Slate / Gray |

- **Voicing Indicator (Optional Visual Cue):** Voiced initials (濁音: が・ざ・だ・ば行) keep the same hue as their base row (since phonetic borrowing often voices or unvoices the initial consonant, e.g., `カ` ↔ `ガ`, `ハ` ↔ `バ`) and can optionally display a subtle border or dot indicator.

---

## 4. Interactive Features & UI Design

### 4.1 2D Virtualized Matrix View
- **Sticky Headers:**
  - **Top Sticky Row:** Column headers showing the base component glyph, its primary reading/meaning, and the count of kanji in that column.
  - **Left Sticky Column:** Row headers showing the radical glyph (and common variants like `水/氵`), traditional radical name (e.g., さんずい), and row kanji count.
  - **Frozen Row 0 (`∅` / Base Component Row):** Optionally pinned right below the column headers so the base kanji is always visible while scrolling down through radicals.
- **Kanji Card Design:**
  - Displays the kanji character prominently, its primary On'yomi (in Katakana), and a background/border tinted by its Gojūon row hue.
  - Visual badge if the kanji also has its own column (e.g., `連` card in the `車` column shows a `→ Col` badge that jumps to the `連` column when clicked).

### 4.2 Filtering, Sorting & Matrix Compaction
- **Dataset Filter:** Jōyō grades (Grade 1–6, Secondary), JLPT levels (N5–N1), frequency ranges, or search query (by kanji, reading, meaning, or component).
- **Row & Column Sorting:**
  - Sort columns by: **Number of kanji in column (density)**, **Stroke count of component**, **Primary On'yomi (Gojūon order)**, or **Frequency**.
  - Sort rows by: **Number of kanji in row**, **Traditional Kangxi radical order**, or **Stroke count**.
- **Dynamic Compaction:**
  - Toggle to hide empty rows/columns after applying a filter, or collapse low-density columns (`N = 1`) to focus on high-yield phonetic series first.
  - **"Focus Mode" on a Column/Row:** Clicking a row header isolates that single radical row and compacts the table to only the columns populated on that row. Clicking a column header isolates that single component column and compacts the table to only the rows populated on that column. Clicking the same header again undoes the filter.

### 4.3 Kanji Detail Modal / Drawer
Clicking any kanji card opens an inspection drawer containing:
- **Stroke Order Diagram:** Interactive SVG playback powered by KanjiVG paths (play/pause, step-by-step strokes, toggle stroke numbers) to directly support learning to write from memory.
- **Readings & Meanings:** All Jōyō On'yomi (with the primary one highlighted) and Kun'yomi, English meanings, grade, JLPT level, and frequency rank.
- **Structural Decomposition Tree:** Interactive tree showing `Radical + Base Component` and recursive sub-parts.
- **Cross-Links ("Where else does this appear?"):**
  - Link to its placement in `Row ∅` (as a column header) if it spawns derived kanji.
  - Link to its placement as a decomposed child (`Radical + Part`).
  - List of all composite kanji that contain this kanji as a component, with one-click navigation to scroll & highlight those cells in the 2D table.

---

## 5. Phased Implementation Roadmap

### Milestone 1: Data Pipeline & Decomposition Prototype
1. Set up repository structure (`scripts/`, `data/`, `src/`).
2. Download and cache open-license datasets (KanjiVG, KANJIDIC2, Jōyō list, word frequency data).
3. Write `scripts/build_dataset.py` to:
   - Parse Jōyō 2,136 kanji metadata and determine primary On'yomi + Gojūon row mapping.
   - Extract `(Radical, Base Component)` splits from KanjiVG / IDS.
   - Apply the lax column rule so composite kanji that act as components (like `連`) are registered both in their parent column (`車`) and as their own column (`連`).
   - Support manual overrides in `data/overrides.yaml`.
4. Output `src/data/kanji_matrix.json` and validate coverage statistics (e.g., % of Jōyō kanji placed into multi-kanji columns).

### Milestone 2: Core 2D Table UI, Gojūon Color System & Docker Setup
1. Scaffold Vite + React + TypeScript + Tailwind CSS project.
2. Add `Dockerfile` (multi-stage: Python data pipeline + Node build + Nginx runtime), `.dockerignore`, and `docker-compose.yml` for containerized development and deployment.
3. Define the 10-hue OKLCH color palette for Gojūon rows (`あ` through `わ`) with light/dark mode support and color-legend bar.
4. Build the virtualized 2D table component (`KanjiMatrix`) with sticky radical row headers, sticky component column headers, and pinned `Row 0 (∅)`.
5. Implement the `KanjiCard` component with On'yomi label, Gojūon hue, and dual-placement indicator badges.

### Milestone 3: Filtering, Sorting & Cross-Navigation
1. Implement column/row sorting (by density/count, stroke count, Gojūon reading, Kangxi order).
2. Implement filtering (Jōyō grade, JLPT level, text search, minimum column size slider, hide empty rows/columns).
3. Add cross-highlighting: hovering or selecting a kanji highlights all its appearances in the grid (both as `Row ∅ + Self` and `Radical + Base`) and allows jumping between its decomposed cell and its own column.

### Milestone 4: Kanji Detail Drawer & Stroke Order Practice
1. Build the slide-over `KanjiDetailDrawer` showing full readings, meanings, decomposition tree, and related kanji in the same column/row.
2. Integrate interactive KanjiVG stroke order viewer/animator for writing memory practice.

### Milestone 5: Future Expansion Beyond Jōyō
1. Add dataset toggle for **Jinmeiyō Kanji (人名用漢字, +863 chars)** and common **Hyōgai Kanji**.
2. Handle non-Unicode / unencoded component glyphs using SVG component rendering from KanjiVG where a column header has no standalone Unicode character.
3. Add optional memory/recall self-testing mode (masking cells in a column to test recalling and writing kanji from their `(Radical, Component)` coordinates).

---

## 6. Proposed Project Directory Structure

```text
kanji_table/
├── doc/
│   └── Plan.md                  # This development plan
├── data/
│   ├── raw/                     # Downloaded KanjiVG, KANJIDIC2, IDS files (gitignored)
│   ├── overrides.json           # Curated decomposition & primary On'yomi overrides
│   └── overrides.yaml           # YAML reference for overrides
├── scripts/
│   ├── download_sources.py      # Fetches KanjiVG, KANJIDIC2, IDS data
│   └── build_dataset.py         # Builds static JSON matrix & decomposition graph
├── public/
│   └── strokes/                 # Optimized KanjiVG stroke SVGs
├── src/
│   ├── components/
│   │   ├── KanjiMatrix.tsx      # Virtualized 2D table with sticky headers
│   │   ├── KanjiCard.tsx        # Gojūon color-coded kanji cell card
│   │   ├── FilterToolbar.tsx    # Search, sort, grade/JLPT filters, color legend
│   │   ├── KanjiDetailDrawer.tsx# Readings, decomposition tree, cross-links
│   │   └── StrokeOrderView.tsx  # Interactive stroke order diagram
│   ├── data/
│   │   └── kanji_matrix.json    # Generated build-time dataset
│   ├── types/
│   │   └── kanji.ts             # TypeScript interfaces for Kanji, Row, Column, Cell
│   ├── utils/
│   │   └── gojuonColors.ts      # Kana-to-Gojūon row mapper and OKLCH palette
│   ├── App.tsx
│   └── main.tsx
├── Dockerfile                   # Multi-stage build (Python data -> Node Vite build -> Nginx)
├── docker-compose.yml           # Dev server, data pipeline runner, and prod preview
├── .dockerignore
└── package.json
```
