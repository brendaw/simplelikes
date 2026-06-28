/**
 * simplelikes — client-side like button widget
 *
 * Drop-in custom element for anonymous likes on any static site.
 *
 * Usage (custom element):
 *   <simple-likes slug="hello-world"></simple-likes>
 *   <simple-likes slug="my-post" data-icon="thumbs-up"></simple-likes>
 *
 * Usage (classic API, backward compatible):
 *   <button data-slug="hello-world">
 *     <span data-counter>0</span> likes
 *   </button>
 *   <script>
 *     new LikesClient({ apiUrl: "https://simplelikes.william-brendaw.workers.dev" });
 *   </script>
 */

const SVG_ICONS = {
  heart: {
    outline: '<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="none" stroke="currentColor" stroke-width="2"/>',
    filled: '<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor" stroke="currentColor" stroke-width="2"/>',
  },
  'thumbs-up': {
    outline: '<path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    filled: '<path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  star: {
    outline: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
    filled: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  },
};

function generateVisitorId() {
  const raw = navigator.userAgent + '|' + screen.width + 'x' + screen.height;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash) + raw.charCodeAt(i);
    hash |= 0;
  }
  return 'v' + Math.abs(hash).toString(36);
}

function getApiUrl(el) {
  return el.dataset.apiUrl || window.__simpleLikesApiUrl || 'https://simplelikes.william-brendaw.workers.dev';
}

// --- SimpleLikes custom element ---

const SL_STYLE = `
  :host { display: inline-flex; }
  .sl-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    border: 1px solid;
    border-radius: 4px;
    cursor: pointer;
    font: inherit;
    background: none;
    color: var(--sl-color, currentColor);
    border-color: var(--sl-color, currentColor);
    transition: color 0.2s, border-color 0.2s;
  }
  .sl-btn:hover { opacity: 0.8; }
  .sl-btn.liked {
    color: var(--sl-color-active, #e74c3c);
    border-color: var(--sl-color-active, #e74c3c);
  }
  .sl-icon {
    width: var(--sl-size, 20px);
    height: var(--sl-size, 20px);
  }
  .sl-count { font-size: 0.9em; }
`;

class SimpleLikesElement extends HTMLElement {
  static observedAttributes = ['slug'];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._liked = false;
    this._count = 0;
    this._initialized = false;
  }

  get slug() {
    return this.getAttribute('slug') || '';
  }

  connectedCallback() {
    this._render();

    if (!this._initialized) {
      this._initialized = true;
      const queue = window.__slQueue || (window.__slQueue = []);
      queue.push(this);
      if (!queue.scheduled) {
        queue.scheduled = true;
        setTimeout(() => SimpleLikesElement._flushQueue(), 0);
      }
    }
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'slug' && oldVal !== newVal && this._initialized) {
      const apiUrl = getApiUrl(this);
      fetch(apiUrl + '/likes/' + newVal)
        .then((r) => r.json())
        .then((data) => {
          this._count = data.count || 0;
          this._updateCount();
          this._applyLikedState();
        })
        .catch(() => {});
    }
  }

  static _flushQueue() {
    const queue = window.__slQueue || [];
    delete window.__slQueue;
    if (queue.length === 0) return;

    const apiUrl = getApiUrl(queue[0]);
    const slugs = [];
    const seen = {};
    queue.forEach((el) => {
      const s = el.slug;
      if (s && !seen[s]) {
        seen[s] = true;
        slugs.push(s);
      }
    });

    if (slugs.length === 0) return;

    fetch(apiUrl + '/likes/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slugs }),
    })
      .then((r) => r.json())
      .then((data) => {
        const counts = data.slugs || {};
        queue.forEach((el) => {
          if (el.slug) {
            el._count = counts[el.slug] || 0;
            el._updateCount();
            el._applyLikedState();
          }
        });
      })
      .catch(() => {});
  }

  _render() {
    this.shadowRoot.innerHTML =
      '<style>' + SL_STYLE + '</style>' +
      '<button class="sl-btn" aria-label="Like">' +
        '<svg class="sl-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
          SVG_ICONS[this.dataset.icon]?.outline || SVG_ICONS.heart.outline +
        '</svg>' +
        '<span class="sl-count">' + this._count + '</span>' +
      '</button>';

    this._btn = this.shadowRoot.querySelector('.sl-btn');
    this._svg = this.shadowRoot.querySelector('.sl-icon');
    this._countEl = this.shadowRoot.querySelector('.sl-count');
    this._btn.addEventListener('click', () => this._handleClick());
  }

  _updateCount() {
    if (this._countEl) this._countEl.textContent = this._count;
  }

  _applyLikedState() {
    if (!this.slug) return;
    if (localStorage.getItem('liked:' + this.slug)) {
      this._liked = true;
      this._btn.classList.add('liked');
      this._setIcon(true);
    }
  }

  _setIcon(filled) {
    const iconType = this.dataset.icon || 'heart';
    const icon = SVG_ICONS[iconType];
    this._svg.innerHTML = filled && icon ? icon.filled : (icon ? icon.outline : '');
  }

  async _handleClick() {
    if (this._liked || !this.slug) return;
    const visitorId = this._visitorId || (this._visitorId = generateVisitorId());

    try {
      const res = await fetch(getApiUrl(this) + '/likes/' + this.slug, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Visitor-Id': visitorId,
        },
      });
      const data = await res.json();
      localStorage.setItem('liked:' + this.slug, '1');
      this._count = data.count;
      this._liked = true;
      this._updateCount();
      this._btn.classList.add('liked');
      this._setIcon(true);
    } catch {
      // Silently fail
    }
  }
}

if (!customElements.get('simple-likes')) {
  customElements.define('simple-likes', SimpleLikesElement);
}

// --- LikesClient (backward compatible) ---

class LikesClient {
  constructor(options = {}) {
    this.apiUrl = options.apiUrl || 'https://simplelikes.william-brendaw.workers.dev';
    this.selector = options.selector || '[data-slug]';
    this.visitorId = generateVisitorId();
    this._init();
  }

  async _init() {
    const els = document.querySelectorAll(this.selector);
    if (els.length === 0) return;

    const slugs = Array.from(els).map((el) => el.dataset.slug);
    const counts = await this._fetchBatch(slugs);

    els.forEach((el) => {
      const slug = el.dataset.slug;
      this._setCount(el, counts[slug] || 0);
      this._applyLikedState(el, slug);
      el.addEventListener('click', () => this._like(el));
    });
  }

  async _fetchBatch(slugs) {
    try {
      const res = await fetch(this.apiUrl + '/likes/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slugs }),
      });
      const data = await res.json();
      return data.slugs || {};
    } catch {
      return {};
    }
  }

  async _like(el) {
    const slug = el.dataset.slug;
    if (localStorage.getItem('liked:' + slug)) return;

    try {
      const res = await fetch(this.apiUrl + '/likes/' + slug, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Visitor-Id': this.visitorId,
        },
      });
      const data = await res.json();
      localStorage.setItem('liked:' + slug, '1');
      this._setCount(el, data.count);
      el.classList.add('liked');
    } catch {
      // Silently fail
    }
  }

  _setCount(el, count) {
    const counter = el.querySelector('[data-counter]') || el;
    counter.textContent = count;
  }

  _applyLikedState(el, slug) {
    if (localStorage.getItem('liked:' + slug)) {
      el.classList.add('liked');
    }
  }
}

window.SimpleLikes = SimpleLikesElement;
window.LikesClient = LikesClient;
