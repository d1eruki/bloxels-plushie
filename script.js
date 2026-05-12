
/* ============================================================
   BLOXELS — Landing JS
   ============================================================ */

// ─── Russian typography: keep short prepositions with next word ──
const TYPOGRAPHY_SKIP_SELECTOR = [
  'script',
  'style',
  'noscript',
  'textarea',
  'input',
  'select',
  'option',
  'pre',
  'code',
  'kbd',
  'samp',
  '[data-typography-skip]',
].join(',');

const HANGING_WORDS = [
  'из-за',
  'из-под',
  'без',
  'для',
  'до',
  'за',
  'из',
  'ко',
  'на',
  'над',
  'об',
  'обо',
  'от',
  'по',
  'под',
  'при',
  'про',
  'со',
  'во',
  'а',
  'в',
  'и',
  'к',
  'о',
  'с',
  'у',
].join('|');

const HANGING_WORD_RE = new RegExp(
    `(^|[\\s([{"'«„])(${HANGING_WORDS})([\\s\\u00A0]+)(?=[^\\s.,!?;:)}\\]»”"'])`,
    'giu',
);

function fixHangingPrepositions(root = document.body) {
  if (!root) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      if (node.parentElement?.closest(TYPOGRAPHY_SKIP_SELECTOR)) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes = [];
  let node = walker.nextNode();
  while (node) {
    nodes.push(node);
    node = walker.nextNode();
  }

  nodes.forEach((textNode) => {
    textNode.nodeValue = textNode.nodeValue.replace(HANGING_WORD_RE, '$1$2\u00A0');
  });
}

fixHangingPrepositions();

// ─── Configurable presale end date (UTC+3 / Moscow) ─────────
// Change this to update countdown:
const PRESALE_END = new Date('2026-05-31T23:59:59+03:00');

// ─── Preorder event ─────────────────────────────────────────
// All "Оформить предзаказ" / "Купить" buttons fire this single event.
// Real preorder widget integration can listen on:
//   document.addEventListener('bloxels:preorder', e => {...})
function firePreorder(source) {
  const detail = { source: source || 'unknown', ts: Date.now() };
  document.dispatchEvent(new CustomEvent('bloxels:preorder', { detail }));
  document.getElementById('sets')?.scrollIntoView({ behavior: 'smooth' });
}

document.addEventListener('click', (e) => {
  const preorder = e.target.closest('[data-preorder]');
  if (preorder) {
    e.preventDefault();
    firePreorder(preorder.textContent.trim().slice(0, 40));
  }
});

// ─── Mobile menu ────────────────────────────────────────────
(() => {
  const burger = document.getElementById('burger');
  const menu = document.getElementById('mobileMenu');
  const closeBtn = document.getElementById('mobileMenuClose');
  if (!burger || !menu) return;

  const open = () => {
    menu.hidden = false;
    requestAnimationFrame(() => menu.classList.add('is-open'));
    burger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  };
  const close = () => {
    menu.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    setTimeout(() => { menu.hidden = true; }, 350);
  };
  burger.addEventListener('click', open);
  closeBtn?.addEventListener('click', close);
  menu.addEventListener('click', (e) => {
    if (e.target === menu) close();
    if (e.target.closest('a')) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) close();
  });
})();

// ─── Accordion (one open at a time, smooth height) ─────────
(() => {
  const root = document.getElementById('accordion');
  if (!root) return;
  const items = [...root.querySelectorAll('.acc-item')];

  // Wrap content in animatable container
  items.forEach((item) => {
    const a = item.querySelector('.acc-item__a');
    if (!a) return;
    const wrap = document.createElement('div');
    wrap.className = 'acc-item__a-wrap';
    a.parentNode.insertBefore(wrap, a);
    wrap.appendChild(a);
    item.classList.add('is-anim');

    // initial state matches the [open] attribute
    if (!item.hasAttribute('open')) wrap.style.height = '0px';
    else wrap.style.height = a.offsetHeight + 'px';
  });

  const animateTo = (item, isOpen) => {
    const wrap = item.querySelector('.acc-item__a-wrap');
    const inner = item.querySelector('.acc-item__a');
    if (!wrap || !inner) return;
    if (isOpen) {
      item.setAttribute('open', '');
      wrap.style.height = inner.offsetHeight + 'px';
      // after transition, allow auto height (so resize keeps working)
      wrap.addEventListener('transitionend', function once() {
        if (item.hasAttribute('open')) wrap.style.height = 'auto';
        wrap.removeEventListener('transitionend', once);
      });
    } else {
      // need explicit pixel height before transition to 0
      wrap.style.height = wrap.offsetHeight + 'px';
      // force reflow
      // eslint-disable-next-line no-unused-expressions
      wrap.offsetHeight;
      wrap.style.height = '0px';
      wrap.addEventListener('transitionend', function once() {
        item.removeAttribute('open');
        wrap.removeEventListener('transitionend', once);
      });
    }
  };

  // Intercept native <details> toggle: enforce single-open + smooth
  items.forEach((item) => {
    const summary = item.querySelector('summary');
    summary.addEventListener('click', (e) => {
      e.preventDefault();
      const willOpen = !item.hasAttribute('open');
      if (willOpen) {
        items.forEach((other) => {
          if (other !== item && other.hasAttribute('open')) animateTo(other, false);
        });
        animateTo(item, true);
      } else {
        animateTo(item, false);
      }
    });
  });

  // re-measure heights of open items on resize (height: auto → static)
  window.addEventListener('resize', () => {
    items.forEach((item) => {
      if (item.hasAttribute('open')) {
        const wrap = item.querySelector('.acc-item__a-wrap');
        if (wrap) wrap.style.height = 'auto';
      }
    });
  });
})();

// ─── Countdown ──────────────────────────────────────────────
(() => {
  const root = document.getElementById('countdown');
  if (!root) return;
  const cells = {
    d: root.querySelector('[data-cd="d"]'),
    h: root.querySelector('[data-cd="h"]'),
    m: root.querySelector('[data-cd="m"]'),
    s: root.querySelector('[data-cd="s"]'),
  };
  const pad = (n) => String(Math.max(0, n)).padStart(2, '0');

  const tick = () => {
    let diff = Math.max(0, PRESALE_END.getTime() - Date.now());
    const d = Math.floor(diff / 86400000); diff -= d * 86400000;
    const h = Math.floor(diff / 3600000);  diff -= h * 3600000;
    const m = Math.floor(diff / 60000);    diff -= m * 60000;
    const s = Math.floor(diff / 1000);
    if (cells.d) cells.d.textContent = pad(d);
    if (cells.h) cells.h.textContent = pad(h);
    if (cells.m) cells.m.textContent = pad(m);
    if (cells.s) cells.s.textContent = pad(s);
  };

  tick();
  setInterval(tick, 1000);
})();

// ─── Color Picker Modal ─────────────────────────────────────
(() => {
  const modal = document.getElementById('colorModal');
  const closeBtn = document.getElementById('colorModalClose');
  const backdrop = modal?.querySelector('.color-modal__backdrop');
  const orderBtn = document.getElementById('colorModalOrder');
  const preview = document.getElementById('colorPreview');
  const hexEl = document.getElementById('colorHex');
  const rgbEl = document.getElementById('colorRgb');

  if (!modal) return;

  let selectedColor = { hex: '#FF4BC2', rgb: { r: 255, g: 75, b: 194 } };
  let colorPicker = null;

  const updateUI = () => {
    const { hex, rgb } = selectedColor;
    if (preview) preview.style.background = hex;
    if (hexEl) hexEl.textContent = hex.toUpperCase();
    if (rgbEl) rgbEl.textContent = `${rgb.r}, ${rgb.g}, ${rgb.b}`;
  };

  const open = () => {
    modal.hidden = false;
    requestAnimationFrame(() => modal.classList.add('is-open'));
    document.body.style.overflow = 'hidden';
    if (!colorPicker && typeof iro !== 'undefined') {
      colorPicker = new iro.ColorPicker('#colorWheel', {
        width: 220,
        color: selectedColor.hex,
        layout: [
          { component: iro.ui.Wheel },
          { component: iro.ui.Slider, options: { sliderType: 'value' } },
        ],
      });
      colorPicker.on('color:change', (color) => {
        selectedColor = { hex: color.hexString, rgb: color.rgb };
        updateUI();
      });
    }
    updateUI();
  };

  const close = () => {
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
    setTimeout(() => { modal.hidden = true; }, 350);
  };

  closeBtn?.addEventListener('click', close);
  backdrop?.addEventListener('click', close);
  orderBtn?.addEventListener('click', () => {
    window.alert(`Выбранный цвет: ${selectedColor.hex}`);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) close();
  });
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-action="pick-color"]')) {
      e.preventDefault();
      open();
    }
  });
})();
