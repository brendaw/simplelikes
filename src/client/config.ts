export interface SimpleLikesConfig {
  apiUrl?: string;
  text?: string;
  "text-plural"?: string;
}

export function getConfig(): SimpleLikesConfig {
  return (window as any).__simpleLikesConfig || {};
}

export function resolveApiUrl(): string {
  const cfg = getConfig();
  return cfg.apiUrl || (window as any).__simpleLikesApiUrl || "/likes";
}

function getAttr(el: HTMLElement, name: string): string | null {
  return el.getAttribute(name);
}

export function resolveText(el: HTMLElement): string {
  const cfg = getConfig();
  return getAttr(el, "text") || cfg.text || "like";
}

export function resolveTextPlural(el: HTMLElement): string {
  const cfg = getConfig();
  return (
    getAttr(el, "text-plural") ||
    cfg["text-plural"] ||
    resolveText(el) + "s"
  );
}
