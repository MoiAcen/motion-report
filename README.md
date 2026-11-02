# Motion Report

以 JavaScript 產生具 motion design 效果的投影片，build 成單一 HTML 檔。內容由 Markdown 編寫，每份投影片是 `slides/` 下的一個資料夾。

規格見 [docs/spec.md](docs/spec.md)（草案，待確認）。

## 目錄

- `slides/<deck>/deck.md`：第 0 頁，全域設定與動效 token
- `slides/<deck>/pages/NNN.md`：每頁一檔
- `src/`：渲染引擎（尚未實作）
- `dist/`：build 產出

範例 deck 位於 `slides/example/`。
