/**
 * ⌘K command menu. Structure, grouping, shortcuts and styling follow
 * ncdai/chanhdai.com's `command-menu.tsx` (MIT), adapted to Astro and this CMS.
 *
 * Opens with ⌘K / Ctrl+K or "/", from the search button in the navigation bar, or
 * from any element with `data-command-menu-trigger`. "G then a letter" jumps to the
 * pages that show a shortcut, and "D" toggles the theme, as on the reference site.
 */
import { Command } from "cmdk";
import {
  ArrowUpRight,
  AtSign,
  Award,
  BookOpen,
  Box,
  BriefcaseBusiness,
  CornerDownLeft,
  FileText,
  FolderOpen,
  GraduationCap,
  Layers,
  Library,
  LineChart,
  Link2,
  Mail,
  Monitor,
  MoonStar,
  Newspaper,
  ScrollText,
  Search,
  Send,
  SunMedium,
  UserRound,
  Type,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import "./command-menu.css";

type Item = {
  title: string;
  href: string;
  icon?: string;
  image?: string;
  shortcut?: string;
  keywords?: string[];
  external?: boolean;
};

export type CommandData = {
  placeholder: string;
  emptyText: string;
  showContact: boolean;
  showBrandAssets: boolean;
  showTheme: boolean;
  /** Extra entries from Website settings → Command menu, each with its own group. */
  custom: (Item & { group: string })[];
  mark: string;
  wordmark: string;
  email: string;
  menu: Item[];
  sections: Item[];
  articles: Item[];
  publications: Item[];
  projects: Item[];
  topics: Item[];
  experience: Item[];
  certifications: Item[];
  skills: Item[];
  social: Item[];
};

type Kind = "page" | "link" | "command";

type Entry = {
  value: string;
  title: string;
  keywords: string[];
  kind: Kind;
  icon: ReactNode;
  shortcut?: string;
  external?: boolean;
  onSelect: () => void;
};

/**
 * `browse`: listed while the search box is empty. The rest (every article, project,
 * role, certification, skill and link) is found by typing; listing it all up front
 * turned the menu into a 70-item scroll.
 */
type Group = { heading: string; entries: Entry[]; browse?: boolean };

const ICONS: Record<string, ReactNode> = {
  articles: <Newspaper />,
  publications: <ScrollText />,
  projects: <Box />,
  page: <FileText />,
  about: <UserRound />,
  stack: <Layers />,
  contributions: <LineChart />,
  certifications: <Award />,
  experience: <BriefcaseBusiness />,
  education: <GraduationCap />,
  contact: <Send />,
  category: <FolderOpen />,
  series: <Library />,
};

const ACTION_LABELS: Record<Kind, string> = {
  page: "Go to page",
  link: "Open link",
  command: "Run command",
};

function Mark({ svg, className }: { svg: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`command-mark ${className ?? ""}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

function isTyping(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
  );
}

/**
 * Ranks an item for the query, or 0 to hide it. cmdk's default fuzzy scorer matches
 * letters scattered anywhere in an item, and with article summaries as keywords almost
 * everything matched ("dark" ranked articles above the Dark theme). Here every word of
 * the query has to appear in the title or keywords, and title hits rank first.
 */
function score(search: string, title: string, keywords: string[]) {
  const query = search.trim().toLowerCase();
  if (!query) return 1;
  const name = title.toLowerCase();
  const haystack = `${name} ${keywords.join(" ").toLowerCase()}`;
  const words = query.split(/\s+/);
  if (!words.every(word => haystack.includes(word))) return 0;
  if (name.startsWith(query)) return 1;
  if (name.includes(` ${query}`)) return 0.9;
  if (name.includes(query)) return 0.8;
  if (words.every(word => name.includes(word))) return 0.7;
  return 0.4;
}

async function go(href: string, external?: boolean) {
  if (external || /^(mailto:|tel:)/.test(href)) {
    if (href.startsWith("mailto:")) window.location.href = href;
    else window.open(href, "_blank", "noopener");
    return;
  }
  const url = new URL(href, window.location.href);
  // A section of the page already open: glide to it instead of reloading.
  if (url.pathname === window.location.pathname && url.hash) {
    const target = document.getElementById(url.hash.slice(1));
    if (target) {
      const { lockScroll, scrollToElement } = await import("@/lib/smooth-scroll");
      // The menu froze the page while open. Unfreeze it first: unfreezing resets the
      // smooth scroller, which cancelled a glide started before it (the page stayed
      // put and only the address changed). Then wait a frame for the dialog to go.
      lockScroll(false);
      await new Promise(requestAnimationFrame);
      scrollToElement(target);
      history.replaceState(history.state, "", url.hash);
      return;
    }
  }
  const { navigate } = await import("astro:transitions/client");
  navigate(url.pathname + url.search + url.hash);
}

export function CommandMenu({ data }: { data: CommandData }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Keyboard: ⌘K / Ctrl+K and "/" open; "G then X" navigates; "D" toggles the theme.
  useEffect(() => {
    let pendingG = 0;
    const shortcuts = new Map(
      [...data.menu, ...data.custom]
        .filter(item => item.shortcut)
        .map(item => [item.shortcut!.slice(1).toLowerCase(), item.href])
    );
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(value => !value);
        return;
      }
      if (open || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTyping(event.target) || event.defaultPrevented) return;
      const key = event.key.toLowerCase();
      if (key === "/") {
        event.preventDefault();
        setOpen(true);
      } else if (pendingG && Date.now() - pendingG < 1000 && shortcuts.has(key)) {
        pendingG = 0;
        const target = [...data.menu, ...data.custom].find(item => item.href === shortcuts.get(key));
        void go(shortcuts.get(key)!, target?.external);
      } else if (key === "g") {
        pendingG = Date.now();
      } else if (key === "d" && !event.repeat) {
        pendingG = 0;
        void import("@/lib/theme").then(({ setTheme }) =>
          setTheme(
            document.documentElement.classList.contains("dark") ? "light" : "dark"
          )
        );
      } else {
        pendingG = 0;
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, data.menu, data.custom]);

  // The navigation bar's button is plain HTML, rendered before this island hydrates.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (
        event.target instanceof Element &&
        event.target.closest("[data-command-menu-trigger]")
      ) {
        event.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener("click", onClick);
    if (document.documentElement.dataset.commandMenuPending) {
      delete document.documentElement.dataset.commandMenuPending;
      setOpen(true);
    }
    return () => document.removeEventListener("click", onClick);
  }, []);

  // Freeze the page underneath while open; start each visit fresh.
  useEffect(() => {
    void import("@/lib/smooth-scroll").then(({ lockScroll }) => lockScroll(open));
    if (!open) setSearch("");
  }, [open]);

  // Keep the list starting at the top whenever the query changes.
  useEffect(() => {
    listRef.current?.scrollTo({ top: 0 });
  }, [search]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(timer);
  }, [toast]);

  const run = useCallback((action: () => void) => {
    setOpen(false);
    action();
  }, []);

  const copy = useCallback(
    (text: string, message: string) =>
      run(() => {
        void navigator.clipboard?.writeText(text).then(
          () => setToast(message),
          () => setToast("Copy failed")
        );
      }),
    [run]
  );

  const theme = useCallback(
    (preference: "light" | "dark" | "system") =>
      run(() => {
        void import("@/lib/theme").then(({ setTheme }) => setTheme(preference));
      }),
    [run]
  );

  /** Everything the menu offers, in its resting order. */
  const groups = useMemo<Group[]>(() => {
    const links = (
      heading: string,
      items: Item[],
      kind: Kind,
      fallback: ReactNode,
      browse = false
    ): Group => ({
      heading,
      browse,
      entries: items.map(entry => ({
        value: `${heading}::${entry.title}::${entry.href}`,
        title: entry.title,
        keywords: entry.keywords ?? [],
        kind,
        icon: entry.image ? (
          <img className="command-image" src={entry.image} alt="" loading="lazy" />
        ) : entry.icon === "mark" ? (
          <Mark svg={data.mark} className="command-item-mark" />
        ) : (
          ICONS[entry.icon ?? ""] ?? fallback
        ),
        shortcut: entry.shortcut,
        external: entry.external,
        onSelect: () => run(() => void go(entry.href, entry.external)),
      })),
    });
    const command = (
      name: string,
      title: string,
      icon: ReactNode,
      keywords: string[],
      onSelect: () => void
    ): Entry => ({ value: `command::${name}`, title, keywords, kind: "command", icon, onSelect });

    return [
      links("Menu", data.menu, "page", <FileText />, true),
      links("Portfolio", data.sections, "page", <FileText />, true),
      links("Articles", data.articles, "page", <BookOpen />),
      links("Publications", data.publications, "page", <ScrollText />),
      links("Projects", data.projects, "page", <Box />),
      links("Topics", data.topics, "page", <FolderOpen />),
      links("Experience", data.experience, "page", <BriefcaseBusiness />),
      links("Certifications", data.certifications, "link", <Award />),
      links("Tech Stack", data.skills, "link", <Layers />),
      links("Social Links", data.social, "link", <Link2 />),
      // Custom entries, grouped by the heading the editor gave them.
      ...[...new Set(data.custom.map(link => link.group))].map(heading =>
        links(
          heading,
          data.custom.filter(link => link.group === heading),
          data.custom.some(link => link.group === heading && !link.external) ? "page" : "link",
          <Link2 />,
          // Added by hand in the CMS, so meant to be seen.
          true
        )
      ),
      {
        heading: "Contact",
        browse: true,
        entries: data.showContact && data.email
          ? [
              command("email-open", "Send an email", <Mail />, ["mail", "contact", data.email], () =>
                run(() => void go(`mailto:${data.email}`))
              ),
              command("email-copy", "Copy email address", <AtSign />, ["contact", data.email], () =>
                copy(data.email, "Email address copied")
              ),
            ]
          : [],
      },
      {
        heading: "Brand Assets",
        entries: !data.showBrandAssets ? [] : [
          command(
            "copy-mark",
            "Copy Mark as SVG",
            <Mark svg={data.mark} className="command-item-mark" />,
            ["logo", "brand", "sc"],
            () => copy(data.mark, "Mark as SVG copied")
          ),
          command("copy-wordmark", "Copy Logotype as SVG", <Type />, ["logo", "brand", "wordmark", "s4meer"], () =>
            copy(data.wordmark, "Logotype as SVG copied")
          ),
        ],
      },
      {
        heading: "Theme",
        browse: true,
        entries: !data.showTheme ? [] : [
          command("theme-light", "Light", <SunMedium />, ["theme", "mode"], () => theme("light")),
          command("theme-dark", "Dark", <MoonStar />, ["theme", "mode"], () => theme("dark")),
          command("theme-system", "System", <Monitor />, ["theme", "mode", "auto"], () => theme("system")),
        ],
      },
      links(
        "Other",
        [
          { title: "llms.txt", href: "/llms.txt", external: true, keywords: ["ai", "agents", "llm"] },
          { title: "Profile as Markdown", href: "/index.md", external: true, keywords: ["markdown", "agents", "md"] },
        ],
        "link",
        <FileText />
      ),
    ].filter(group => group.entries.length > 0);
  }, [data, run, copy, theme]);

  /** The query's matches: best groups first, best items first within each group. */
  const visible = useMemo(() => {
    if (!search.trim()) return groups.filter(group => group.browse);
    return groups
      .map(group => {
        const entries = group.entries
          .map(entry => ({ entry, score: score(search, entry.title, entry.keywords) }))
          .filter(match => match.score > 0)
          .sort((a, b) => b.score - a.score);
        return { heading: group.heading, entries: entries.map(match => match.entry), best: entries[0]?.score ?? 0 };
      })
      .filter(group => group.entries.length > 0)
      .sort((a, b) => b.best - a.best);
  }, [groups, search]);

  const kinds = useMemo(
    () => new Map(groups.flatMap(group => group.entries.map(entry => [entry.value, entry.kind]))),
    [groups]
  );
  const selectedKind = kinds.get(selected) ?? "page";

  // The top match is selected as the query changes, as with cmdk's own filtering.
  useEffect(() => {
    setSelected(visible[0]?.entries[0]?.value ?? "");
  }, [visible]);

  return (
    <>
      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Command menu"
        value={selected}
        onValueChange={setSelected}
        overlayClassName="command-overlay"
        contentClassName="command-dialog"
        shouldFilter={false}
        loop
      >
        <div className="command-input-wrapper">
          <Search className="command-input-icon" aria-hidden="true" />
          <Command.Input
            value={search}
            onValueChange={setSearch}
            placeholder={data.placeholder}
          />
        </div>

        <div className="command-panel">
          <Command.List ref={listRef} data-lenis-prevent>
            <Command.Empty>{data.emptyText}</Command.Empty>
            {visible.map(group => (
              <Command.Group key={group.heading} heading={group.heading}>
                {group.entries.map(entry => (
                  <Command.Item key={entry.value} value={entry.value} onSelect={entry.onSelect}>
                    {entry.icon}
                    <span className="command-title">{entry.title}</span>
                    {entry.shortcut && <span className="command-shortcut">{entry.shortcut}</span>}
                    {entry.external && !entry.shortcut && <ArrowUpRight className="command-external" />}
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>
        </div>

        <div className="command-footer">
          <Mark svg={data.mark} className="command-footer-mark" />
          <div className="command-footer-action">
            <span>{ACTION_LABELS[selectedKind]}</span>
            <kbd className="command-kbd">
              <CornerDownLeft />
            </kbd>
          </div>
        </div>
      </Command.Dialog>

      <div className="command-toast" data-visible={Boolean(toast)} role="status" aria-live="polite">
        {toast}
      </div>
    </>
  );
}

export default CommandMenu;
