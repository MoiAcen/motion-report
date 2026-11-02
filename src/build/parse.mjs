// 讀取一份 deck 資料夾，回傳給 build 與 runtime 使用的資料結構。
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { marked } from 'marked';

// 「## 動效」之後的段落是給人與 AI 讀的描述，不顯示在投影片上。
const MOTION_HEADING = /^## 動效\s*$/m;

// 共用元素的位置對照（相對於投影片的百分比）
const POSITIONS = {
  'top-left': { left: '8%', top: '10%' },
  'top-right': { right: '8%', top: '10%' },
  'bottom-left': { left: '8%', bottom: '10%' },
  'bottom-right': { right: '8%', bottom: '10%' },
};

function sharedStyle(spec = {}) {
  const pos = POSITIONS[spec.position] ?? POSITIONS['top-right'];
  const m = String(spec.size ?? '44px').match(/([\d.]+)\s*px(?:\s*[x×]\s*([\d.]+)\s*px)?/);
  const w = m?.[1] ?? '44';
  const h = m?.[2] ?? w;
  const css = Object.entries({ ...pos, width: `${w}px`, height: `${h}px` })
    .map(([k, v]) => `${k}:${v}`)
    .join(';');
  return css;
}

export function parseDeck(deckDir) {
  const deckFile = path.join(deckDir, 'deck.md');
  if (!fs.existsSync(deckFile)) throw new Error(`缺少 ${deckFile}`);
  const deck = matter(fs.readFileSync(deckFile, 'utf8')).data;

  const pagesDir = path.join(deckDir, 'pages');
  const files = fs
    .readdirSync(pagesDir)
    .filter((f) => /^\d+\.md$/.test(f))
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  if (files.length === 0) throw new Error(`${pagesDir} 內沒有頁面檔（NNN.md）`);

  const start = deck.numbering?.start ?? 1;
  const pages = files.map((file, i) => {
    const { data, content } = matter(fs.readFileSync(path.join(pagesDir, file), 'utf8'));
    const m = MOTION_HEADING.exec(content);
    const body = m ? content.slice(0, m.index) : content;
    const motion = m ? content.slice(m.index + m[0].length).trim() : '';
    const shared = Object.entries(data.shared ?? {}).map(([id, spec]) => ({
      id,
      style: sharedStyle(spec),
    }));
    return {
      file,
      number: start + i,
      layout: data.layout ?? 'free',
      shared,
      html: marked.parse(body),
      motion,
    };
  });

  return { deck, pages, total: pages.length };
}
