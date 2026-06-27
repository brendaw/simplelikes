/**
 * simplelikes — client-side likes integration
 *
 * Drop this script into any static site to enable anonymous likes.
 *
 * Usage:
 *   1. Add data-slug attributes to your like buttons:
 *      <button class="like-btn" data-slug="hello-world">
 *        <span data-counter>0</span> likes
 *      </button>
 *
 *   2. Include this script and instantiate:
 *      <script src="likes.js"></script>
 *      <script>
 *        new LikesClient({ apiUrl: "https://simplelikes.william-brendaw.workers.dev" });
 *      </script>
 *
 * The script:
 *   - Loads all counts via batch endpoint on page load
 *   - POSTs on click with localStorage dedup
 *   - Adds .liked class to already-liked buttons
 *   - Accepts a configurable selector for custom DOM structures
 */

class LikesClient {
  constructor(options = {}) {
    this.apiUrl = options.apiUrl || "https://simplelikes.william-brendaw.workers.dev";
    this.selector = options.selector || "[data-slug]";
    this.visitorId = this._generateVisitorId();
    this._init();
  }

  _generateVisitorId() {
    const raw = navigator.userAgent + "|" + screen.width + "x" + screen.height;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const char = raw.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return "v" + Math.abs(hash).toString(36);
  }

  async _init() {
    const els = document.querySelectorAll(this.selector);
    if (els.length === 0) return;

    // Load all counts in a single batch request
    const slugs = Array.from(els).map((el) => el.dataset.slug);
    const counts = await this._fetchBatch(slugs);

    els.forEach((el) => {
      const slug = el.dataset.slug;
      this._setCount(el, counts[slug] || 0);
      this._applyLikedState(el, slug);
      el.addEventListener("click", () => this._like(el));
    });
  }

  async _fetchBatch(slugs) {
    try {
      const res = await fetch(this.apiUrl + "/likes/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    if (localStorage.getItem("liked:" + slug)) return;

    try {
      const res = await fetch(this.apiUrl + "/likes/" + slug, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Visitor-Id": this.visitorId,
        },
      });
      const data = await res.json();
      localStorage.setItem("liked:" + slug, "1");
      this._setCount(el, data.count);
      el.classList.add("liked");
    } catch {
      // Silently fail — don't break the page if the API is unreachable
    }
  }

  _setCount(el, count) {
    const counter = el.querySelector("[data-counter]") || el;
    counter.textContent = count;
  }

  _applyLikedState(el, slug) {
    if (localStorage.getItem("liked:" + slug)) {
      el.classList.add("liked");
    }
  }
}
