/**
 * simplelikes — anonymous likes for any static site
 *
 * Usage:
 *   <simple-likes slug="hello-world"></simple-likes>
 *
 *   <script src="simple-likes.js"></script>
 *   <script>window.__simpleLikesApiUrl = "https://simplelikes.william-brendaw.workers.dev";</script>
 *
 * The element renders a "N likes" button that:
 *   - Batch-fetches all counts on page load
 *   - Increments via POST on click with localStorage dedup
 *   - Toggles .liked class on already-liked slugs
 */

function generateVisitorId() {
  const raw = navigator.userAgent + '|' + screen.width + 'x' + screen.height;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash) + raw.charCodeAt(i);
    hash |= 0;
  }
  return 'v' + Math.abs(hash).toString(36);
}

function getApiUrl() {
  return window.__simpleLikesApiUrl || 'https://simplelikes.william-brendaw.workers.dev';
}

class SimpleLikes extends HTMLElement {
  static observedAttributes = ['slug'];

  constructor() {
    super();
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
        setTimeout(() => SimpleLikes._flushQueue(), 0);
      }
    }
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'slug' && oldVal !== newVal && this._initialized) {
      const apiUrl = getApiUrl();
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

    const apiUrl = getApiUrl();
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
    this.innerHTML = '<button class="sl-btn" aria-label="Like"><span class="sl-count">' + this._count + '</span> likes</button>';
    this._btn = this.querySelector('.sl-btn');
    this._countEl = this.querySelector('.sl-count');
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
    }
  }

  async _handleClick() {
    if (this._liked || !this.slug) return;
    const visitorId = this._visitorId || (this._visitorId = generateVisitorId());

    try {
      const res = await fetch(getApiUrl() + '/likes/' + this.slug, {
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
    } catch {
      // Silently fail
    }
  }
}

if (!customElements.get('simple-likes')) {
  customElements.define('simple-likes', SimpleLikes);
}
