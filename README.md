# Motion Report

以 JavaScript 產生具 motion design 效果的投影片，build 成單一 HTML 檔。內容由 Markdown 編寫，每份投影片是 `slides/` 下的一個資料夾。

規格見 [docs/spec.md](docs/spec.md)。

## 使用

```bash
npm install
npm run build            # 建置 slides/ 下所有 deck
npm run build:example    # 只建置範例 deck
```

輸出為 `dist/<deck>.html`，可直接用瀏覽器開啟。

## 目錄

- `slides/<deck>/deck.md`：第 0 頁，全域設定與動效 token
- `slides/<deck>/pages/NNN.md`：每頁一檔
- `src/build/`：讀取 deck 並 build 成單一 HTML
- `src/runtime/`：投影片執行端（reveal.js、GSAP、共用元素飛行、頁碼）
- `dist/`：build 產出

範例 deck 位於 `slides/example/`。

## 目前的限制

- 動效依元素類型套用預設效果（眉標 fade-up、標題 wipe、數字 count-up、長條 bar-fill 等）。`## 動效` 段落的文字目前還沒有被解析，只當作給人與 AI 讀的描述。
- 只支援亮色主題，主題由 deck.md 的 `theme` 注入。
- 版型（layout）目前只是標記，尚未影響樣式。
