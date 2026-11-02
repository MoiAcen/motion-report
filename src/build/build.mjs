// CLI：把 slides/<deck> 轉成 dist/<deck>.html（單一 HTML 檔）
//   node src/build/build.mjs            # 建置 slides/ 下所有 deck
//   node src/build/build.mjs example    # 只建置 slides/example
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { parseDeck } from './parse.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SLIDES = path.join(ROOT, 'slides');
const BUILD = path.join(ROOT, '.build');
const DIST = path.join(ROOT, 'dist');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');

function themeCss(theme = {}) {
  const v = {
    '--bg': theme.bg ?? '#FFFFFF',
    '--fg': theme.fg ?? '#111827',
    '--accent': theme.accent ?? '#1D4ED8',
    '--accent-2': theme['accent-2'] ?? theme.accent ?? '#1D4ED8',
    '--muted': theme.muted ?? '#5B6472',
    '--font-display': theme['font-display'] ?? 'serif',
    '--font-body': theme['font-body'] ?? 'sans-serif',
    '--font-mono': theme['font-mono'] ?? 'monospace',
  };
  return `:root{${Object.entries(v).map(([k, x]) => `${k}:${x}`).join(';')}}`;
}

function renderSlide(page) {
  const shared = page.shared
    .map((s) => `<div class="shared" data-shared="${esc(s.id)}" style="${esc(s.style)}"></div>`)
    .join('');
  return `<section class="page" data-layout="${esc(page.layout)}" data-number="${page.number}" data-file="${esc(page.file)}"><div class="page-body">${page.html}</div>${shared}</section>`;
}

function indexHtml(name, data, slides) {
  const title = data.deck.title ?? name;
  return `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&family=Noto+Serif+TC:wght@700&family=JetBrains+Mono:wght@500&display=swap">
<style>${themeCss(data.deck.theme)}</style>
</head>
<body>
<div class="reveal"><div class="slides">
${slides}
</div></div>
<script type="module" src="./entry.js"></script>
</body>
</html>
`;
}

async function buildDeck(name) {
  const deckDir = path.join(SLIDES, name);
  const data = parseDeck(deckDir);
  const workDir = path.join(BUILD, name);
  fs.rmSync(workDir, { recursive: true, force: true });
  fs.mkdirSync(workDir, { recursive: true });

  const slides = data.pages.map(renderSlide).join('\n');
  fs.writeFileSync(path.join(workDir, 'index.html'), indexHtml(name, data, slides));
  fs.writeFileSync(path.join(workDir, 'data.json'), JSON.stringify({ deck: data.deck, total: data.total }));
  fs.writeFileSync(
    path.join(workDir, 'entry.js'),
    `import data from './data.json';\nimport { start } from '${path.join(ROOT, 'src/runtime/index.js').split(path.sep).join('/')}';\nstart(data);\n`,
  );

  const outDir = path.join(BUILD, `${name}-out`);
  await build({
    configFile: false,
    root: workDir,
    logLevel: 'warn',
    plugins: [viteSingleFile()],
    build: {
      outDir,
      emptyOutDir: true,
      assetsInlineLimit: () => true,
      cssCodeSplit: false,
      modulePreload: false,
      rollupOptions: { input: path.join(workDir, 'index.html') },
    },
  });

  fs.mkdirSync(DIST, { recursive: true });
  const out = path.join(DIST, `${name}.html`);
  fs.copyFileSync(path.join(outDir, 'index.html'), out);
  console.log(`built ${path.relative(ROOT, out)} (${data.total} pages)`);
}

const only = process.argv[2];
const names = only
  ? [only]
  : fs.readdirSync(SLIDES).filter((n) => fs.existsSync(path.join(SLIDES, n, 'deck.md')));
for (const n of names) await buildDeck(n);
