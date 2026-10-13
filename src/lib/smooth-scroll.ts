import Lenis from "lenis";

/**
 * Inertial wheel scrolling for mouse and trackpad users.
 *
 * Lenis keeps the page on native scrolling (so `position: sticky`, anchors and the
 * browser's own restoration still work) and only smooths the wheel input. Touch
 * devices keep their native momentum, and reduced-motion users keep plain scrolling.
 *
 * Nested scroll areas opt out with `data-lenis-prevent` (the command menu list, for one).
 */
let lenis: Lenis | undefined;

function shouldSmooth() {
  return (
    window.matchMedia("(pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function start() {
  if (lenis || !shouldSmooth()) return;
  lenis = new Lenis({
    // Short and eased: enough to take the edge off a notched wheel without feeling floaty.
    duration: 0.9,
    easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    wheelMultiplier: 1,
    // Same-page anchors (e.g. /#experience) glide instead of jumping. Lenis honours
    // each section's scroll-margin-top, which already clears the sticky navigation bar.
    anchors: true,
    autoRaf: true,
  });
}

function stop() {
  lenis?.destroy();
  lenis = undefined;
}

/** Scrolls smoothly where Lenis is active, and natively everywhere else. */
export function scrollToY(y: number, { immediate = false } = {}) {
  if (lenis) lenis.scrollTo(y, { immediate, force: true });
  else window.scrollTo({ top: y, behavior: immediate ? "instant" : "smooth" });
}

/**
 * Scrolls a same-page target into view, below the sticky navigation bar. The gap
 * comes from the target's own scroll-margin-top, which both paths honour.
 */
export function scrollToElement(element: HTMLElement) {
  if (lenis) lenis.scrollTo(element, { force: true });
  else element.scrollIntoView({ behavior: "smooth", block: "start" });
}

/** While a modal is open the page underneath must not move. */
export function lockScroll(locked: boolean) {
  if (locked) lenis?.stop();
  else lenis?.start();
}

if (typeof window !== "undefined") {
  start();
  // Follow the visitor's settings if they change while the tab is open.
  for (const query of ["(pointer: fine)", "(prefers-reduced-motion: reduce)"]) {
    window
      .matchMedia(query)
      .addEventListener("change", () => (shouldSmooth() ? start() : stop()));
  }
  // Each page gets a fresh instance. Carried across a client-side navigation, Lenis
  // kept easing towards the previous page's scroll position on the new page.
  document.addEventListener("astro:before-swap", stop);
  document.addEventListener("astro:page-load", start);
}
