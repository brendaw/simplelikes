import { getCount, batchGet, toggleLike } from "./api.js";
import { resolveText, resolveTextPlural } from "./config.js";

function generateVisitorId(): string {
  const raw = navigator.userAgent + "|" + screen.width + "x" + screen.height;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash) + raw.charCodeAt(i);
    hash |= 0;
  }
  return "v" + Math.abs(hash).toString(36);
}

const SL_STYLE = document.createElement("style");
SL_STYLE.textContent =
  ".sl-btn{display:inline-flex;align-items:center;gap:4px;padding:2px 10px;border:1px solid #d0d0d0;border-radius:12px;background:#fafafa;font:inherit;font-size:0.85em;cursor:pointer;color:#666;transition:all .15s;line-height:1.6}" +
  ".sl-btn:hover{background:#f0f0f0;border-color:#bbb}" +
  ".sl-btn.liked{background:#fff0f0;border-color:#e74c3c;color:#e74c3c}" +
  ".sl-btn.liked:hover{background:#ffe0e0}" +
  ".sl-btn.error{background:#fff0f0;border-color:#999;color:#999;animation:sl-shake .3s}@keyframes sl-shake{25%{transform:translateX(-3px)}50%{transform:translateX(3px)}75%{transform:translateX(-2px)}}";
document.head.appendChild(SL_STYLE);

interface SlQueue extends Array<SimpleLikes> {
  scheduled?: boolean;
}

export class SimpleLikes extends HTMLElement {
  static observedAttributes = ["slug", "text", "text-plural"];

  private _count = 0;
  private _initialized = false;
  private _visitorId?: string;

  get slug(): string {
    return this.getAttribute("slug") || "";
  }

  get text(): string {
    return resolveText(this);
  }

  get textPlural(): string {
    return resolveTextPlural(this);
  }

  connectedCallback() {
    this._render();

    if (!this._initialized) {
      this._initialized = true;
      const queue: SlQueue = (window as any).__slQueue || ((window as any).__slQueue = []);
      queue.push(this);
      if (!queue.scheduled) {
        queue.scheduled = true;
        setTimeout(() => SimpleLikes._flushQueue(), 0);
      }
    }
  }

  attributeChangedCallback(
    name: string,
    oldVal: string | null,
    newVal: string | null,
  ): void {
    if (!this._initialized) return;
    if (name === "slug" && oldVal !== newVal) {
      getCount(newVal || "")
        .then((data) => {
          this._count = data.count || 0;
          this._updateCount();
          this._applyLikedState();
        })
        .catch(() => {});
    }
    if (
      (name === "text" || name === "text-plural") &&
      oldVal !== newVal
    ) {
      this._updateCount();
    }
  }

  static _flushQueue(): void {
    const queue: SlQueue = (window as any).__slQueue || [];
    delete (window as any).__slQueue;
    if (queue.length === 0) return;

    const slugs: string[] = [];
    const seen: Record<string, boolean> = {};
    for (const el of queue) {
      const s = el.slug;
      if (s && !seen[s]) {
        seen[s] = true;
        slugs.push(s);
      }
    }

    if (slugs.length === 0) return;

    batchGet(slugs)
      .then((data) => {
        const counts = data.slugs || {};
        for (const el of queue) {
          if (el.slug) {
            el._count = counts[el.slug] || 0;
            el._updateCount();
            el._applyLikedState();
          }
        }
      })
      .catch(() => {});
  }

  private _render(): void {
    const label = this._count === 1 ? this.text : this.textPlural;
    this.innerHTML =
      '<button class="sl-btn" aria-label="' +
      this.text +
      '"><span class="sl-count">' +
      this._count +
      "</span> " +
      label +
      "</button>";
    this._btn.addEventListener("click", () => this._handleClick());
  }

  private get _btn(): HTMLButtonElement {
    return this.querySelector(".sl-btn")!;
  }

  private _updateCount(): void {
    const label = this._count === 1 ? this.text : this.textPlural;
    this._btn.innerHTML =
      '<span class="sl-count">' + this._count + "</span> " + label;
    this._btn.setAttribute("aria-label", this.text);
  }

  private _applyLikedState(): void {
    if (!this.slug) return;
    if (localStorage.getItem("liked:" + this.slug)) {
      this._btn.classList.add("liked");
    }
  }

  private async _handleClick(): Promise<void> {
    if (!this.slug) return;
    const visitorId = this._visitorId || (this._visitorId = generateVisitorId());

    try {
      const data = await toggleLike(this.slug, visitorId);
      this._count = data.count;
      this._updateCount();
      this._btn.classList.toggle("liked", data.liked!);
      if (data.liked) {
        localStorage.setItem("liked:" + this.slug, "1");
      } else {
        localStorage.removeItem("liked:" + this.slug);
      }
    } catch {
      this._btn.classList.add("error");
      setTimeout(() => this._btn.classList.remove("error"), 2000);
    }
  }
}
