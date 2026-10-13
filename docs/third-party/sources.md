# Third-party sources and asset credits

This consolidates the former asset and reference README files. Reference copies and original authoring assets are preserved in the private backup; active components and uploads remain in the application/CMS.

## Wordmarks and portrait logos


The SC mark and large S4MEER footer wordmark are outlined directly from the supplied `public/fonts/4x4-font.ttf`.
The SVG uses `currentColor` for automatic light/dark theme support.

Regenerate the wordmark and favicon with `python3 scripts/generate-wordmark.py`
(requires Python fontTools). The original font is retained in the project;
its embedded license identifies it as FontStruct Non-Commercial License.

## Portrait selector logos

- `lego.svg`: The LEGO Group, downloaded from https://assets.lego.com/logos/v8.5.0/brand-lego.svg.
- `fortnite.svg`: Epic Games, downloaded from https://upload.wikimedia.org/wikipedia/commons/a/a0/Fortnite_logo_2.svg; source record: https://commons.wikimedia.org/wiki/File:Fortnite_logo_2.svg.

Retrieved October 3, 2026. These marks identify the portrait styles. Current T-shirt logos are CMS Media Library uploads.

- `lego-lettering.svg`: lettering isolated from the official LEGO SVG above, clipped to its outer letter outline to remove the square backing.
- `fortnite-lettermark.svg`: filled F lettermark extracted from the Fortnite vector at https://www.svgrepo.com/svg/516475/fortnite (CC0 listing), with its surrounding banner removed. Retrieved October 3, 2026.
- `gta6.png`: official Grand Theft Auto VI logo from Rockstar Games, downloaded from https://www.rockstargames.com/VI/_next/static/media/vi.0hxa9~pf214xe.png (displayed on https://www.rockstargames.com/VI). Retrieved October 4, 2026.
- `gta6-badge.webp`: the same transparent logo resized to 112px wide and encoded as lossless WebP for the portrait selector shirt.
- `rockstar.svg`: official Rockstar Games R★ mark downloaded from https://media-rockstargames-com.akamaized.net/rockstargames-newsite/img/meta-icons/rockstar/favicon.svg. Retrieved October 4, 2026.
- `rockstar-lettermark.svg`: the same vector paths in white, without the browser theme override, for the purple GTA VI selector shirt.


## Dino game


`sprite-1x.png` (1233x68) and `sprite-2x.png` (2441x130) are the offline "t-rex runner"
sprite sheets from the Chromium project, used under the BSD 3-Clause licence:
https://chromium.googlesource.com/chromium/src/+/main/LICENSE

The sheets contain the dino frames, small/large cacti, pterodactyl, clouds, moon phases,
stars, the horizon line, the digit font, the "GAME OVER" text and the restart button.
Sprite coordinates live in `src/components/dino-game.astro`.

## Sounds

`jump`, `hit` and `score` are Chromium's `offline-sound-press`, `offline-sound-hit`
and `offline-sound-reached`, extracted from the offline page where they ship as
base64. Despite being labelled `audio/mpeg` there, they are Ogg Vorbis; the `.m4a`
copies are AAC transcodes for Safari, which could not play Vorbis before version 17.
The game picks a format with `canPlayType` at runtime.


## Aceternity components


Downloaded on 2026-09-24 from the Aceternity UI registry, so the site keeps working
if the registry goes away:

- `encrypted-text.json` / `.tsx` — https://ui.aceternity.com/registry/encrypted-text.json
  (docs: https://ui.aceternity.com/components/encrypted-text)
- `link-preview.json` / `.tsx` — https://ui.aceternity.com/registry/link-preview.json
  (docs: https://ui.aceternity.com/components/link-preview)

The site uses adapted components in `src/components/ui/`; original reference copies are archived in the private backup:

- `encrypted-text.tsx` — imports from `framer-motion` (already a dependency; `motion/react`
  is the same library under its new name), and respects reduced motion.
- `link-preview.tsx` — screenshots come from the site's own `/api/link-preview`, which
  keeps a copy of each on disk, instead of from api.microlink.io in the browser.

The npm packages they need (`@radix-ui/react-hover-card`, `qss`, `framer-motion`) are
installed dependencies, pinned in `pnpm-lock.yaml`.


## Theme toggle and portfolio layouts


Downloaded from https://github.com/ncdai/chanhdai.com at commit
`97d6fc3359f2f2e62aaa306d950d3a472cc9a2a8`.

- `theme-toggle-effect/theme-toggle-effect-triangle.json`: original registry style from `public/r/`.
- `theme-toggle-effect/theme-toggle.tsx`: original site toggle from `src/components/` (reference only; requires Next.js).
- `chanhdai-license.txt`: upstream MIT license retained in this directory.

Documentation: https://chanhdai.com/components/theme-toggle-effect

The triangle registry CSS is adapted in `src/styles/theme-toggle-effect.css`,
scoped to explicit theme changes so Astro navigation keeps its own transitions.
The existing Astro toggle invokes the View Transitions API with reduced-motion
and unsupported-browser fallbacks. No React/Next.js dependencies are needed.


The Chánh Đài MIT notice is retained in `chanhdai-license.txt`. Tech-stack artwork sources and notices are listed in [tech-stack-icons.md](tech-stack-icons.md).
