# Motion Report 規格（草案 v1）

狀態：草案，待 MoiAcen 核可後才開始實作引擎。

## 目標

用 JavaScript 產生具 motion design 效果的投影片，build 成單一 HTML 檔。內容由 Markdown 編寫，方便人和 AI 協作。引擎是共用的樣板，同一套引擎可用不同的 deck 資料夾 build 出不同投影片。

## 目錄結構

```
slides/<deck-name>/        每份投影片一個資料夾
  deck.md                  第 0 頁：全域設定
  pages/001.md             每頁一檔，檔名數字即頁序
  assets/                  圖片等素材
themes/<name>.md           共用主題（多份 deck 可引用）
src/                       渲染引擎（尚未實作）
dist/                      build 產出：每個 deck 一個 single HTML
docs/spec.md               本文件
```

## 第 0 頁：deck.md

用 YAML frontmatter 放結構化設定，本文可用 Markdown 寫給人看的說明（引擎不讀取）。

```yaml
---
title: 產品發佈回顧
theme:
  bg: "#EEF0F3"
  fg: "#111827"
  accent: "#0095b8"            # 富邦藍，來源：使用者提供的色票
  accent-2: "#00a29d"          # 富邦綠，來源：使用者提供的色票
  font-display: "Noto Serif TC"
  font-body: "Noto Sans TC"
  font-mono: "JetBrains Mono"
motion:
  duration:
    fast: 0.3
    mid: 0.6
    slow: 1.0
  ease: power3.out
  stagger: 0.1
  reduced-motion: shorten      # 偏好減少動態時，時長縮為接近 0
presets:                       # 預設效果名稱 -> 說明（AI 與引擎都依此實作）
  fade-up: 從下方淡入上移 40px，時長用 mid
  wipe: 由左至右 clip 揭示，時長用 slow
  stagger-in: 子元素依序從左側滑入，間隔 stagger
  count-up: 數字從 0 計數到目標值
numbering:
  start: 1                     # 頁碼從 1 起算，第 0 頁不計入
page-number:
  show: true
  position: bottom-right
  format: "{n} / {total}"      # 例如 3 / 12
---
```

`theme` 與 `motion` 可以改為引用 `themes/<name>.md`，細節實作前再定。

## 單頁：pages/NNN.md

```markdown
---
layout: title                  # 版型種類待實際做投影片時再增減
shared:                        # 可選：跨頁共用元素
  mark:
    position: top-right
    size: 44px
---

# 產品發佈回顧

副標題文字。

## 動效

- 標題：wipe
- 副標題：fade-up，接在標題之後
- 方塊 mark：共用元素，見上方 shared
```

### 規則

- 內文以 Markdown 撰寫，引擎轉為 HTML。
- `## 動效` 段落是給人與 AI 讀的描述，可以直接寫預設名稱（如 `fade-up`），也可以寫自然語言描述新效果。
- 頁面內容中，`## 動效` 之前的部分是內容，之後的段落是動效描述，不會顯示在投影片上。
- 單頁只寫覆寫項目，沒寫的項目沿用 deck.md。

## 跨頁共用元素

同一個 `id` 出現在相鄰頁面時，引擎會在翻頁時把元素從舊位置飛到新位置。範例中的方塊 `mark` 即為此效果。

- id 相同即視為同一元素，位置與大小由各頁 frontmatter 的 `shared` 描述。
- 飛行時間使用 `motion.duration.slow`，緩動使用 `motion.ease`。
- 連續快速翻頁時，中斷前一段飛行，接續新的。

## 頁碼

- 全環境統一編號，由 `numbering.start` 起算，第 0 頁不計入。
- 頁碼依 `pages/` 內的檔名數字排序。
- 顯示在投影片右下角，格式為「頁數 / 總頁數」，例如 `3 / 12`。總頁數為 `pages/` 內的檔案數。

## 驗證

- 以腳本檢查 frontmatter 格式（必填欄位、值域），取代原先的 JSON Schema。
- 規劃中的檢查：deck 有 `deck.md`；每頁檔名為數字；`layout` 與 `shared` 合法。

## Build

- 技術選型（草案）：Vite + vite-plugin-singlefile，輸出單一 HTML。
- 頁面動效：GSAP timeline。翻頁與導覽：reveal.js（或自寫輕量版本，待定）。
- 套件版本實作時再鎖定精確版本。

## 已決定與延後

已決定：
- 頁碼顯示在右下角，格式「頁數 / 總頁數」。
- 圖片素材放在 `slides/<deck>/assets/`。
- 需要共用主題，放在 `themes/`。

延後，等實際做投影片時再決定：
- 版型（layout）的種類要增減哪些。
- 共用元素的位置與大小用自然語言描述，還是固定選項。
