import * as DeveloperIcons from 'developer-icons';
import * as LucideIcons from 'lucide-react';
import { customIcons, customIconNames } from './custom-icons.mjs';
import { ROLE_ICON_NAMES } from './role-icons.mjs';

// `developer-icons` exports one React component per logo, plus `default`/`__esModule`
// bookkeeping that must never show up as a pickable icon.
const developerIconNames = Object.keys(DeveloperIcons).filter(
  name => /^[A-Z]/.test(name) && typeof DeveloperIcons[name] === 'function'
);

// Interface icons for roles and schools, which a brand logo cannot express.
const roleIconNames = ROLE_ICON_NAMES.filter(name => Boolean(LucideIcons[name]));

/**
 * Every icon name the website can render. Role icons come first so the generic
 * "what kind of job was this" choices are the first thing an editor sees.
 */
export const ICON_NAMES = [
  ...roleIconNames,
  ...[...customIconNames, ...developerIconNames].sort((a, b) => a.localeCompare(b)),
];

const ICON_NAME_SET = new Set(ICON_NAMES);

/** True when `name` resolves to a real logo (empty is allowed and means "no icon"). */
export const isKnownIcon = name => !name || ICON_NAME_SET.has(name);

/** Renders the same logo the website would render for `name`. */
export function IconPreview({ name, size = 24 }) {
  const custom = customIcons[name];
  if (custom) {
    return (
      <svg
        viewBox={custom.viewBox}
        width={size}
        height={size}
        fill="currentColor"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: custom.body }}
      />
    );
  }

  const Lucide = roleIconNames.includes(name) ? LucideIcons[name] : null;
  if (Lucide) return <Lucide size={size} strokeWidth={2} />;

  const Icon = DeveloperIcons[name];
  return Icon ? <Icon size={size} /> : null;
}
