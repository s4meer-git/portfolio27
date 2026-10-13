export type Theme = "light" | "dark";
export type ThemePreference = Theme | "system";

const THEME_COLORS: Record<Theme, string> = { light: "#ffffff", dark: "#080808" };

let activeTransition: Promise<void> | undefined;

function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/**
 * Switches the class without letting any element's own `transition` run.
 *
 * Links, buttons and icons across the site transition their colours. Left alone, every
 * one of them starts easing towards its new colour inside the triangle reveal, so the
 * revealed page is itself still animating and the effect stutters. Transitions are
 * suppressed for the one style recalculation that applies the theme.
 */
function applyTheme(theme: Theme, preference: ThemePreference) {
  const root = document.documentElement;
  const freeze = document.createElement("style");
  freeze.textContent =
    "*,*::before,*::after{transition:none!important}";
  document.head.appendChild(freeze);

  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", THEME_COLORS[theme]);
  try {
    if (preference === "system") localStorage.removeItem("theme");
    else localStorage.setItem("theme", preference);
  } catch {
    // Theme switching still works when storage is unavailable.
  }

  // Force the new styles to resolve while transitions are off, then restore them.
  void window.getComputedStyle(document.body).color;
  requestAnimationFrame(() => freeze.remove());
}

/** Shared by the header toggle, the command menu and the dinosaur game's day/night milestones. */
export async function setTheme(preference: ThemePreference): Promise<void> {
  // Finish an existing reveal before starting another one.
  while (activeTransition) await activeTransition;

  const theme = preference === "system" ? systemTheme() : preference;
  const root = document.documentElement;
  if (root.classList.contains("dark") === (theme === "dark")) {
    // Same look, but the stored preference may still change (e.g. dark -> system).
    applyTheme(theme, preference);
    return;
  }

  if (
    !document.startViewTransition ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    applyTheme(theme, preference);
    return;
  }

  root.dataset.themeTransition = "";
  activeTransition = (async () => {
    try {
      const transition = document.startViewTransition(() =>
        applyTheme(theme, preference)
      );
      await transition.finished;
    } catch {
      applyTheme(theme, preference);
    } finally {
      delete root.dataset.themeTransition;
    }
  })();
  try {
    await activeTransition;
  } finally {
    activeTransition = undefined;
  }
}
