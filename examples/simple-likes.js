"use strict";
var SimpleLikes = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/client/index.ts
  var index_exports = {};
  __export(index_exports, {
    SimpleLikes: () => SimpleLikes,
    batchGet: () => batchGet,
    getConfig: () => getConfig,
    getCount: () => getCount,
    resolveApiUrl: () => resolveApiUrl,
    resolveText: () => resolveText,
    resolveTextPlural: () => resolveTextPlural,
    toggleLike: () => toggleLike
  });

  // src/client/config.ts
  function getConfig() {
    return window.__simpleLikesConfig || {};
  }
  function resolveApiUrl() {
    const cfg = getConfig();
    return cfg.apiUrl || window.__simpleLikesApiUrl || "/likes";
  }
  function getAttr(el, name) {
    return el.getAttribute(name);
  }
  function resolveText(el) {
    const cfg = getConfig();
    return getAttr(el, "text") || cfg.text || "like";
  }
  function resolveTextPlural(el) {
    const cfg = getConfig();
    return getAttr(el, "text-plural") || cfg["text-plural"] || resolveText(el) + "s";
  }

  // src/client/api.ts
  async function getCount(slug) {
    const res = await fetch(resolveApiUrl() + "/likes/" + slug);
    return res.json();
  }
  async function batchGet(slugs) {
    const res = await fetch(resolveApiUrl() + "/likes/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slugs })
    });
    return res.json();
  }
  async function toggleLike(slug, visitorId) {
    const res = await fetch(resolveApiUrl() + "/likes/" + slug, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Visitor-Id": visitorId
      }
    });
    return res.json();
  }

  // src/client/component.ts
  function generateVisitorId() {
    const raw = navigator.userAgent + "|" + screen.width + "x" + screen.height;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = (hash << 5) - hash + raw.charCodeAt(i);
      hash |= 0;
    }
    return "v" + Math.abs(hash).toString(36);
  }
  var SL_STYLE = document.createElement("style");
  SL_STYLE.textContent = ".sl-btn{display:inline-flex;align-items:center;gap:4px;padding:2px 10px;border:1px solid #d0d0d0;border-radius:12px;background:#fafafa;font:inherit;font-size:0.85em;cursor:pointer;color:#666;transition:all .15s;line-height:1.6}.sl-btn:hover{background:#f0f0f0;border-color:#bbb}.sl-btn.liked{background:#fff0f0;border-color:#e74c3c;color:#e74c3c}.sl-btn.liked:hover{background:#ffe0e0}.sl-btn.error{background:#fff0f0;border-color:#999;color:#999;animation:sl-shake .3s}@keyframes sl-shake{25%{transform:translateX(-3px)}50%{transform:translateX(3px)}75%{transform:translateX(-2px)}}";
  document.head.appendChild(SL_STYLE);
  var SimpleLikes = class _SimpleLikes extends HTMLElement {
    static observedAttributes = ["slug", "text", "text-plural"];
    _count = 0;
    _initialized = false;
    _visitorId;
    get slug() {
      return this.getAttribute("slug") || "";
    }
    get text() {
      return resolveText(this);
    }
    get textPlural() {
      return resolveTextPlural(this);
    }
    connectedCallback() {
      this._render();
      if (!this._initialized) {
        this._initialized = true;
        const queue = window.__slQueue || (window.__slQueue = []);
        queue.push(this);
        if (!queue.scheduled) {
          queue.scheduled = true;
          setTimeout(() => _SimpleLikes._flushQueue(), 0);
        }
      }
    }
    attributeChangedCallback(name, oldVal, newVal) {
      if (!this._initialized) return;
      if (name === "slug" && oldVal !== newVal) {
        getCount(newVal || "").then((data) => {
          this._count = data.count || 0;
          this._updateCount();
          this._applyLikedState();
        }).catch(() => {
        });
      }
      if ((name === "text" || name === "text-plural") && oldVal !== newVal) {
        this._updateCount();
      }
    }
    static _flushQueue() {
      const queue = window.__slQueue || [];
      delete window.__slQueue;
      if (queue.length === 0) return;
      const slugs = [];
      const seen = {};
      for (const el of queue) {
        const s = el.slug;
        if (s && !seen[s]) {
          seen[s] = true;
          slugs.push(s);
        }
      }
      if (slugs.length === 0) return;
      batchGet(slugs).then((data) => {
        const counts = data.slugs || {};
        for (const el of queue) {
          if (el.slug) {
            el._count = counts[el.slug] || 0;
            el._updateCount();
            el._applyLikedState();
          }
        }
      }).catch(() => {
      });
    }
    _render() {
      const label = this._count === 1 ? this.text : this.textPlural;
      this.innerHTML = '<button class="sl-btn" aria-label="' + this.text + '"><span class="sl-count">' + this._count + "</span> " + label + "</button>";
      this._btn.addEventListener("click", () => this._handleClick());
    }
    get _btn() {
      return this.querySelector(".sl-btn");
    }
    _updateCount() {
      const label = this._count === 1 ? this.text : this.textPlural;
      this._btn.innerHTML = '<span class="sl-count">' + this._count + "</span> " + label;
      this._btn.setAttribute("aria-label", this.text);
    }
    _applyLikedState() {
      if (!this.slug) return;
      if (localStorage.getItem("liked:" + this.slug)) {
        this._btn.classList.add("liked");
      }
    }
    async _handleClick() {
      if (!this.slug) return;
      const visitorId = this._visitorId || (this._visitorId = generateVisitorId());
      try {
        const data = await toggleLike(this.slug, visitorId);
        this._count = data.count;
        this._updateCount();
        this._btn.classList.toggle("liked", data.liked);
        if (data.liked) {
          localStorage.setItem("liked:" + this.slug, "1");
        } else {
          localStorage.removeItem("liked:" + this.slug);
        }
      } catch {
        this._btn.classList.add("error");
        setTimeout(() => this._btn.classList.remove("error"), 2e3);
      }
    }
  };

  // src/client/index.ts
  if (!customElements.get("simple-likes")) {
    customElements.define("simple-likes", SimpleLikes);
  }
  return __toCommonJS(index_exports);
})();
