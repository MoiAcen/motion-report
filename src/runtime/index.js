// 投影片執行端：reveal.js 負責翻頁，GSAP 負責動效與跨頁共用元素。
import Reveal from 'reveal.js';
import 'reveal.js/reset.css';
import 'reveal.js/reveal.css';
import gsap from 'gsap';
import './style.css';

export function start(data) {
  const deck = data.deck ?? {};
  const motion = deck.motion ?? {};
  const dur = { fast: 0.3, mid: 0.6, slow: 1.0, ...(motion.duration ?? {}) };
  const ease = motion.ease ?? 'power3.out';
  const stagger = motion.stagger ?? 0.1;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const D = reduce && motion['reduced-motion'] !== 'off' ? 0.01 : 1;
  const pn = deck['page-number'] ?? {};
  const pnFormat = pn.format ?? '{n} / {total}';
  const total = data.total;

  const root = document.querySelector('.reveal');

  // 共用元素飛行層（不參與 reveal 的縮放，座標以 .reveal 為準）
  const layer = document.createElement('div');
  layer.className = 'motion-layer';
  root.appendChild(layer);

  // 頁碼
  let pageNumberEl = null;
  if (pn.show !== false) {
    pageNumberEl = document.createElement('div');
    pageNumberEl.className = 'page-number';
    root.appendChild(pageNumberEl);
  }

  let activeTl = null;
  let flightTweens = [];
  let lastRects = null; // 上一頁共用元素的位置（以 .reveal 為座標）

  function clearFlights() {
    flightTweens.forEach((t) => t.kill());
    flightTweens = [];
    layer.innerHTML = '';
    root.querySelectorAll('[data-shared]').forEach((el) => (el.style.visibility = ''));
  }

  function measureShared(section) {
    const base = root.getBoundingClientRect();
    const out = {};
    section.querySelectorAll('[data-shared]').forEach((el) => {
      const r = el.getBoundingClientRect();
      out[el.dataset.shared] = {
        x: r.left - base.left,
        y: r.top - base.top,
        w: r.width,
        h: r.height,
        bg: getComputedStyle(el).backgroundColor,
        el,
      };
    });
    return out;
  }

  // 同一個 id 在相鄰兩頁出現時，從舊位置飛到新位置
  function flyShared(from, to) {
    Object.keys(from).forEach((key) => {
      const f = from[key];
      const t = to[key];
      if (!t) return;
      const ghost = document.createElement('div');
      ghost.className = 'shared ghost';
      ghost.style.cssText = `left:${f.x}px;top:${f.y}px;width:${f.w}px;height:${f.h}px;background:${f.bg}`;
      layer.appendChild(ghost);
      t.el.style.visibility = 'hidden';
      flightTweens.push(
        gsap.to(ghost, {
          left: t.x,
          top: t.y,
          width: t.w,
          height: t.h,
          duration: dur.slow * D,
          ease: 'power3.inOut',
          onComplete() {
            ghost.remove();
            t.el.style.visibility = '';
          },
        }),
      );
    });
  }

  // 指定效果：元素上的 data-motion 屬性（fade-in、highlight、typewriter）
  function initMotion(el, kind) {
    if (kind === 'typewriter') {
      if (el.dataset.text == null) el.dataset.text = el.textContent;
      el.textContent = '';
    } else if (kind === 'fade-in') {
      gsap.set(el, { opacity: 0 });
    } else if (kind === 'highlight') {
      gsap.set(el, { backgroundSize: '0% 100%' });
    } else if (kind === 'wipe') {
      gsap.set(el, { clipPath: 'inset(0 100% 0 0)' });
    } else if (kind === 'stamp-sequence') {
      // 整組印章：遮罩淡入、印章蓋下、停留後整組淡出
      gsap.set(el, { opacity: 1 });
      gsap.set(el.querySelector('.stamp-dim'), { opacity: 0 });
      gsap.set(el.querySelector('.stamp'), { opacity: 0, scale: 2.4, rotation: -14 });
    }
  }

  function motionAnim(el, kind) {
    if (kind === 'fade-in') {
      return gsap.fromTo(el, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: dur.mid * D, ease });
    }
    if (kind === 'highlight') {
      return gsap.fromTo(el, { backgroundSize: '0% 100%' }, { backgroundSize: '100% 100%', duration: dur.mid * D, ease: 'power2.out' });
    }
    if (kind === 'wipe') {
      return gsap.fromTo(el, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: dur.mid * D, ease: 'power2.inOut' });
    }
    if (kind === 'stamp-sequence') {
      const dim = el.querySelector('.stamp-dim');
      const stamp = el.querySelector('.stamp');
      return gsap
        .timeline()
        .to(dim, { opacity: 1, duration: dur.mid * D })
        // 印章重重蓋下：先縮放落下，接一個小幅回彈
        .fromTo(stamp, { opacity: 0, scale: 2.4, rotation: -14 }, { opacity: 1, scale: 1, rotation: -14, duration: dur.fast * D, ease: 'power4.in' })
        .to(stamp, { scale: 0.94, duration: 0.08 * D, ease: 'power1.out' })
        .to(stamp, { scale: 1, duration: 0.14 * D, ease: 'power2.out' })
        .to({}, { duration: 0.8 * D })
        .to(el, { opacity: 0, duration: dur.mid * D, ease: 'power2.in' });
    }
    if (kind === 'typewriter') {
      const full = Array.from(el.dataset.text ?? el.textContent);
      const obj = { n: 0 };
      // 每秒約 25 個字，最短 0.4 秒
      const len = Math.max(0.4, full.length / 25) * D;
      return gsap.to(obj, {
        n: full.length,
        duration: len,
        ease: 'none',
        onUpdate: () => (el.textContent = full.slice(0, Math.round(obj.n)).join('')),
      });
    }
    return null;
  }

  // 預設效果：依元素類型決定，對應 deck.md 的 presets
  function playSection(section) {
    if (activeTl) activeTl.kill();
    const tl = gsap.timeline();
    const targets = section.querySelectorAll(
      '.eyebrow, h1, h2, .rule, p:not(.eyebrow), ul, [data-count], .bar-fill, [data-motion]',
    );
    let first = true;
    const add = (anim) => {
      if (!anim) return;
      tl.add(anim, first ? 0 : '-=0.15');
      first = false;
    };
    targets.forEach((el) => {
      if (el.dataset.motion) initMotion(el, el.dataset.motion);
    });
    targets.forEach((el) => {
      if (el.dataset.motion) {
        add(motionAnim(el, el.dataset.motion));
      } else if (el.matches('.eyebrow')) {
        add(gsap.fromTo(el, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: dur.mid * D, ease }));
      } else if (el.matches('h1')) {
        add(gsap.fromTo(el, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: dur.slow * D, ease: 'power2.inOut' }));
      } else if (el.matches('h2')) {
        add(gsap.fromTo(el, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: dur.mid * D, ease: 'power2.inOut' }));
      } else if (el.matches('.rule')) {
        add(gsap.fromTo(el, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: dur.mid * D, ease: 'power2.inOut' }));
      } else if (el.matches('p')) {
        add(gsap.fromTo(el, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: dur.mid * D, ease }));
      } else if (el.matches('ul')) {
        add(gsap.fromTo(el.querySelectorAll('li'), { opacity: 0, x: -24 }, { opacity: 1, x: 0, duration: dur.mid * D, ease, stagger: stagger * D }));
      } else if (el.matches('[data-count]')) {
        const to = Number(el.dataset.count);
        const obj = { v: 0 };
        el.textContent = '0';
        add(gsap.to(obj, { v: to, duration: dur.slow * 1.4 * D, ease: 'power2.out', onUpdate: () => (el.textContent = Math.round(obj.v)) }));
      } else if (el.matches('.bar-fill')) {
        add(gsap.fromTo(el, { scaleX: 0 }, { scaleX: Number(el.dataset.fill ?? 1), transformOrigin: 'left center', duration: dur.slow * D, ease: 'power2.out' }));
      }
    });
    activeTl = tl;
  }

  function updatePageNumber(section) {
    if (!pageNumberEl || !section) return;
    pageNumberEl.textContent = pnFormat.replace('{n}', section.dataset.number).replace('{total}', total);
  }

  function handle(current, previous) {
    clearFlights();
    const now = measureShared(current);
    if (lastRects && previous && previous !== current) flyShared(lastRects, now);
    lastRects = now;
    playSection(current);
    updatePageNumber(current);
  }

  const reveal = Reveal;
  reveal.on('ready', (e) => handle(e.currentSlide, null));
  reveal.on('slidechanged', (e) => handle(e.currentSlide, e.previousSlide));

  reveal.initialize({
    hash: false,
    transition: 'none',
    controls: true,
    controlsLayout: 'edges',
    progress: false,
    slideNumber: false,
    keyboard: true,
    touch: true,
    center: false,
    width: 1280,
    height: 720,
    margin: 0.04,
  });
}
