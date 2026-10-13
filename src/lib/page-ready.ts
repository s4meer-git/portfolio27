/** Initial page readiness, excluding offscreen lazy assets and background polling. */
function onScreen(element: Element) {
  const range = document.createRange();
  range.selectNodeContents(element);
  const contentRect = range.getBoundingClientRect();
  const rect = contentRect.width && contentRect.height ? contentRect : element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight;
}

function eventOrAbort(target: EventTarget, event: string, signal: AbortSignal) {
  return new Promise<void>(resolve => {
    const finish = () => {
      target.removeEventListener(event, finish);
      signal.removeEventListener("abort", finish);
      resolve();
    };
    if (signal.aborted) return finish();
    target.addEventListener(event, finish, { once: true });
    signal.addEventListener("abort", finish, { once: true });
  });
}

function firstUpdate(element: HTMLElement, signal: AbortSignal) {
  return new Promise<void>(resolve => {
    const finish = () => {
      observer.disconnect();
      signal.removeEventListener("abort", finish);
      resolve();
    };
    const observer = new MutationObserver(() => {
      if (element.dataset.pageReady !== "pending") finish();
    });
    // After window.load, a custom element whose module failed cannot ever mark
    // itself ready. Keep its server-rendered fallback available instead of waiting.
    const missingComponent = element.localName.includes("-") && !customElements.get(element.localName);
    if (signal.aborted || element.dataset.pageReady !== "pending" || missingComponent) return finish();
    observer.observe(element, { attributes: true, attributeFilter: ["data-page-ready"] });
    signal.addEventListener("abort", finish, { once: true });
  });
}

async function hydrated(island: Element, signal: AbortSignal) {
  const ready = eventOrAbort(island, "astro:hydrate", signal);
  // Reuse the browser's module cache. A failed import settles instead of leaving
  // the loader waiting for a hydration event that can never arrive.
  const modules = [island.getAttribute("component-url"), island.getAttribute("renderer-url")]
    .filter((url): url is string => Boolean(url));
  try {
    await Promise.all(modules.map(url => import(/* @vite-ignore */ url)));
    if (island.hasAttribute("ssr")) await ready;
  } catch {
    // The existing server-rendered component remains available on a load failure.
  }
}

export async function waitForPage(signal: AbortSignal) {
  const cleanup = new AbortController();
  const readySignal = AbortSignal.any([signal, cleanup.signal]);
  try {
    if (document.readyState !== "complete") await eventOrAbort(window, "load", readySignal);
    if (readySignal.aborted) return;
    const islands = Array.from(document.querySelectorAll("astro-island[ssr]"))
      .filter(island => island.getAttribute("client") !== "visible" || onScreen(island));
    await Promise.race([
      Promise.allSettled([
        document.fonts.ready,
        ...islands.map(island => hydrated(island, readySignal)),
        ...Array.from(document.querySelectorAll<HTMLElement>('[data-page-ready="pending"]'))
          .map(element => firstUpdate(element, readySignal)),
      ]),
      eventOrAbort(readySignal, "abort", readySignal),
    ]);
    if (readySignal.aborted) return;
    // Hydration and live status can add/change images. Decode the final visible sources.
    const images = Array.from(document.images)
      .filter(image => (image.currentSrc || image.getAttribute("src")) && !image.hidden && onScreen(image));
    await Promise.race([
      Promise.allSettled(images.map(image => image.decode())),
      eventOrAbort(readySignal, "abort", readySignal),
    ]);
    if (!readySignal.aborted) await new Promise<void>(resolve => {
      const finish = () => {
        cancelAnimationFrame(frame);
        readySignal.removeEventListener("abort", finish);
        resolve();
      };
      const frame = requestAnimationFrame(finish);
      readySignal.addEventListener("abort", finish, { once: true });
    });
  } finally {
    cleanup.abort();
  }
}
