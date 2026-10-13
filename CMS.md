# Portfolio CMS

This portfolio uses **Strapi Community Edition**, a self-hosted open-source CMS. Administrators sign in with email and password stored by Strapi; no GitHub, Google, or Strapi Cloud account is needed.

## Open locally

- CMS: http://127.0.0.1:1337/admin
- Portfolio: http://127.0.0.1:4321
- The owner administrator uses **CMS_LOGIN_ID** (email) and **CMS_PASS** from `cms/.env` or the CMS server environment. Startup applies these values to the existing owner account while preserving its roles. On an empty database it creates the first administrator. Both values are server-only.
- Restart the CMS after changing either value. The environment remains the source of truth: a password changed only in the admin panel is reset to CMS_PASS on the next startup. Invalid or incomplete values stop startup with a field-specific error.

## Edit content

Open **Content Manager**. Every field in the admin carries a short description of where
it appears on the website, so you can edit without cross-referencing the code.

### Website settings

A single entry holding everything that is not an article, project or job:

- **Profile** — name, role, slogan, email, biography, avatar, verified badge, and
  **Name pronunciation**: an audio clip of you saying your name, played by the speaker
  button after your name (or the P key). Leave it empty to hide the button.
  Setting **Avatar (dark mode)** shows a different picture when the site is in dark
  mode; leave it empty to use the same one for both.
  **Primary avatar label** and **Primary avatar T-shirt** control the main portrait's
  name, shirt colour, uploaded logo and logo dimensions. **Other avatars & T-shirts**
  contains the additional portraits in switch order, currently LEGO and GTA VI.
  Each entry has its own light/dark images and matching shirt; drag to reorder, turn
  **Enabled** off to hide one, or add another entry. Dark images are optional and
  fall back to the light image. **Portrait zoom** and **Zoom centre (%)** preserve
  each image's framing (LEGO uses 1.24 and 30). Save and publish to apply changes.
  All portrait images use the website's cached 480px WebP endpoint, with only the
  active theme/portrait loading initially. Already optimized 480px WebP files are
  served without recompression. T-shirt logos come from the CMS Media Library;
  transparent SVG, PNG or WebP works well. The hover peek, hook rotation and fog
  transition continue to follow the selected portrait's matching shirt.
  **Location**, **Email address** and **Pronouns** appear in the right-hand profile
  column. Use a city and country for Location (e.g. `Dubai, United Arab Emirates`).
  **Show local time** displays a live clock and the difference from the visitor's
  browser timezone, including daylight saving and fractional-hour differences.
  **Timezone override** accepts an IANA name such as `Asia/Dubai`; leave it empty
  to look up the timezone from Location. If lookup fails, the clock stays hidden
  rather than showing an incorrect time. Automatic lookup uses Open-Meteo / GeoNames,
  with server-side caching; it never requests a visitor's location.
  Hovering the location shows a photo of the city, found on Wikipedia with no setup:
  its Wikidata photo (Dubai: the skyline with the Burj Khalifa), or the article's lead
  image when that is missing or a collage (Agra: the Taj Mahal; Jaipur: the Hawa Mahal).
  **Location photo subject** looks up a landmark instead (e.g. `Dubai Marina`), and an
  uploaded **Location photo** replaces both. The website downloads the photo once and
  keeps it in `.cache/location-photos/` (under `IMAGE_CACHE_DIR` if set), refreshing
  monthly; the Commons file and page are saved beside it in a `.json` for crediting.
  Changing the location fetches the new city's photo.
- **Spotify status** — enable/disable the music row, choose **Live** or **Manual**,
  and edit the status text and recently played text. Live mode reads the currently playing
  song, artist, track link and artwork from the connected Spotify account. Manual
  mode uses the editable track title, artist, link and uploaded **Album cover**.
  The small cover expands on
  hover or keyboard focus; on touch screens, tap it to toggle the preview.
  Both profile columns stack vertically on mobile.
- **Links** — one list of every link to you elsewhere. Each entry has **Show under
  profile** and **Show in footer**, so the same link is edited once and can appear in
  both places. Each profile row reads **Text before link → Link label → Text after
  link**. Leave the first field empty to start with the link, fill both to place it
  in the middle, or leave the last field empty to end with it. For example:
  `See my` + `Resume` + `for my latest experience`. The footer shows the logo only.
  Hovering a profile link shows a small picture of the page (**Preview on hover**).
  The website takes a screenshot once, through Microlink, and keeps it in
  `.cache/link-previews/` (under `IMAGE_CACHE_DIR` if set), refreshing it weekly; if
  Microlink is unavailable the kept copy is still served. Pages that block screenshot
  bots (Credly, LinkedIn) come out as error or sign-in pages: upload a **Preview
  image** for those, or switch the preview off. Changing a link's URL takes a new
  screenshot.
- **Certification tickets** — show/hide the Certifications section, **Auto-rotate**
  and **Seconds per ticket**. The tickets themselves are under Certifications.
- **Call to action** — the contact block above the footer. Left column: eyebrow,
  heading, description, **Contact methods** (icon, title, subtitle, URL — e.g. your
  email, a booking link, LinkedIn, X; drag to reorder). Right column: the message form, with its heading,
  description, button and thank-you text; switch it off with **Show contact form**.
- **Navigation bar** — the links across the top, just a label and a URL.
- **Command menu** — the ⌘K search (also "/" or the search button). Opened empty, it
  lists the navigation, the home page sections, your Extra entries, contact and theme.
  Everything you publish — articles, publications, projects, categories, series,
  roles, schools, certifications, skills and links — is found by typing. Here you can change the placeholder
  and "no results" wording, switch any kind of content off, disable the menu
  entirely, or add **Extra entries**: a label, URL, group heading, search keywords
  and an optional shortcut letter (press G then that letter anywhere on the site).
- **Skills** — compact technology pills in numbered groups. **Group** controls the
  row label (for example, Languages or AI & LLMs); use the same label to put tools
  together. Rows follow the order of their first skill, and the tools follow your
  list order. Leave Group blank for an unlabelled row. Each skill has a **Logo**
  picker and an optional **Custom logo** upload (see below).
- **Home page headings**, **Articles wording**, **Projects wording**, **Button
  wording** — every piece of fixed text on the site, grouped by where it appears
  rather than in one long list.
- **Footer** — the credit line, as two pieces of "text + link text + link URL".
- **Search & sharing** — page title, description, sharing image, favicon, language.
  The favicon defaults to the SC mark (`public/favicon.svg`, regenerated by
  `scripts/generate-wordmark.py`); uploading one here replaces it.
- **Articles per page** — how many articles each page of `/articles` lists.

### Choosing a logo

`Logo` and `Icon` fields (on skills, links, companies, roles and schools) open a
searchable picker showing the actual artwork. It offers interface icons first — a
briefcase, code brackets, a server, a graduation cap and so on, for describing a kind
of role — followed by the ~290 technology and brand logos. Type to filter, click
to select, or **Remove icon** to clear it. A field left empty renders a generic link
icon, and the picker warns if an entry somehow points at a logo that no longer exists.

To use a logo the picker does not have, upload an image into **Custom logo** on the
same entry; it takes priority over the picked logo.

### Articles, categories and series

- **articles** — title, URL slug, date, summary, tags, cover image and rich-text body.
- **categories** and **series** are their own entries with a **name** and a **slug**.
  The name is what the site displays; the slug is the URL. Pick one on an article
  rather than typing it, so a typo can no longer create an orphan page.
  The Articles page shows category navigation only; existing series URLs remain available.

### Publications

Each entry is listed at **/publications** (newest first, **Publications per page** in
Website settings) and gets its own page at `/publications/<slug>`, reached from the
**Publications** link in the navigation bar:

Choose **Category** on each publication to show its topic in the category hashtags.
Categories are shared with articles, and each listing shows only topics used by its
own published entries. Publication category links open `/publications/categories/<slug>`.
Their headings and description are editable under **Website settings → Publications wording**.

- **Title**, **URL slug**, **Published on**, and **Type** (journal article,
  conference paper, preprint, thesis, book chapter, report, other).
- **Authors** — comma-separated, in citation order; your own name is shown in bold.
- **Venue** — the journal, conference or publisher.
- **Abstract** — shown in the list's link previews and at the top of the page.
- **DOI**, **Paper link** and **PDF** — each becomes a button; leave any empty to hide it.
- **Body** — an optional write-up under the abstract, like an article body.
- **BibTeX** — shown under "Cite" with a copy button.

Page wording (title, description, headings) is under **Website settings →
Publications wording**. Publications also appear in the ⌘K search, `/llms.txt`,
`/index.md` and the footer's content count.

### Certifications

Each entry becomes one ticket in the **Certifications** section,
right after the profile. Nothing is fetched automatically; every part is yours to set:

- **Credential name** — printed in the stub beside the QR code; the badge fills the middle.
- **Organization** and **Organization logo** (upload), or **Organization icon** from the
  picker (e.g. AWS) when no logo is uploaded — shown in the ticket's header strip.
- **Badge image** — any image (Credly PNG, course badge, your own artwork) on the stub.
- **Verification link** — any URL. The ticket's QR code is generated from it on the
  server, and **Verify** opens it.
- **Issued** — optional, printed under the badge. **Credential ID** and **Expires** are for your records.
- **Display order** — lowest first; the first ticket starts in front.

Tickets are portrait cards lying flat, one over another: the front one on top (it
expands on hover), the rest overlapping on both sides. The real tickets repeat around an
endless loop, so even three fill both sides; the copies are decorative. Visitors browse
by scrolling over the section, clicking a side ticket, the arrow keys, the ‹ › buttons,
or by swiping on phones. Each ticket that passes the front makes a soft paper-flick sound (after the
visitor's first click, as browsers require); the speaker button beside the counter turns it
off. **Website settings → Certification tickets** switches the
section off, and sets **Auto-rotate** and how many seconds each ticket stays in front.

### Messages

Everything sent through the contact form lands in **Content Manager → Messages**
(name, email, message, visitor time zone, IP address, browser fingerprint, browser
and language). **Created at** records the server's submission time. Tick **Read** once handled. The form validates input, ignores
bots through a hidden field, and accepts at most 5 messages per visitor and 60 overall
every 10 minutes.

To also be emailed each message, add SMTP settings to `cms/.env` and restart the CMS
(`SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM`; see
`cms/.env.example`). Any provider works — Gmail with an app password, Resend, Brevo,
Postmark. Notifications go to the email on your profile, or to `CONTACT_NOTIFY_TO`;
replying answers the visitor directly. The visitor never waits on the mail server,
and if sending fails the message is still stored (the Strapi log shows a
`[contact]` error). The same settings let the admin panel send password-reset emails.

Notifications include a responsive HTML template and a plain-text alternative.
The sender's name and email are visible above the message, with a **Reply** button.
The email's `Reply-To` is the visitor's address, while `From` remains your verified
sending address. Submission details show your profile time zone (UTC if unset),
visitor local time and zone when available, UTC timestamp, IP, browser and language.
The fingerprint is a SHA-256 hash of basic browser headers and time zone; it does
not identify a person or uniquely identify a device. Invalid or unavailable visitor
time zones are shown as **Not shared**. Older messages are kept without inventing
missing metadata. The HTML escapes all visitor content and preserves line breaks.

**Website settings → Contact email branding** controls optional logo image overrides,
website description, signature note, signature links, profile photo, footer wordmark
and final note. Publish your settings to apply them to the next notification.
The design keeps the original white message card with a dark branded header,
an inbox-style sender header above the plain email body, and compact submission details.
The palette is fixed: white content, black header and footer. Website theme changes,
redesigns and old CMS theme values do not change email appearance. Legacy email
theme controls are hidden, with their stored values preserved.
The footer uses the complete S4MEER wordmark in solid white on black.
There are no decorative emojis, arrows or
numbered section badges. Your signature uses
**Profile** for name, role, location, email and avatar. The website address follows
**Search & sharing → Canonical origin**. Extra descriptions, signature notes, links
and footer notes appear only when explicitly filled in Contact email branding;
they are omitted by default. There is no automatic CMS storage reminder.

Senders use a shared gender-neutral 3D cartoon illustration rather than initials.
**Contact email branding → Sender avatar image** can replace that shared image;
it does not infer a sender's gender or fetch anyone's personal profile picture.

The logos, sender illustration and optional profile photo are embedded as PNGs with Content-ID references,
so they do not require recipients to access a local CMS URL. Local logo uploads use
PNG, JPEG, WebP or GIF; unsupported, remote or unavailable files fall back to SC.
The defaults are dedicated transparent PNG cutouts in `cms/public/brand`:
`sc-logo-cutout.png` and `s4meer-logo-cutout.png`. They are separate from website
SVGs and require no 4x4 font. Replace those images explicitly and restart the CMS
if email branding itself should change. `scripts/generate-email-brand.mjs` prepares
compatibility images from those PNGs; it does not read website assets or fonts.
Email text uses standard Arial and Courier-family fonts.

### Projects and experience

- **projects** — title, slug, summary, core/side section, technologies, source and demo
  links, image, body and display order.
- **experiences** — company, logo or icon, website, location and work setup, plus one
  entry per role held there. Each role has its own icon, employment type, start and
  end, description and skills. Leaving the end empty marks the role as current and
  shows an infinity sign; the duration ("2y 7m") is worked out from the dates, so
  there is nothing to keep up to date.
- **education** — schools and courses, same shape as a role: icon or logo, degree,
  field of study, dates, description and subjects.

Both **Experience** and **Education** have an optional **LinkedIn organisation URL**
field. Paste the official `https://www.linkedin.com/company/.../` or
`https://www.linkedin.com/school/.../` page, then save and publish. Personal profile
links are rejected. An uploaded company/school logo takes priority; otherwise the
website fetches the organisation's public logo. If that is unavailable, the selected
icon stays visible.

Automatic logos load lazily, are converted to small WebP images, and are cached on
the website server for seven days. Cached images remain visible while refreshing;
failed requests wait an hour before trying again. Keep `IMAGE_CACHE_DIR` on
persistent storage in production. Discovery uses public LinkedIn metadata, with the
same Microlink provider used for link previews as a fallback. No LinkedIn login or
extra API key is needed. LinkedIn restrictions or provider limits can prevent a
fetch; uploading a logo remains available in that case. Changing the LinkedIn URL
uses a separate cache entry.

Dates use `MM.YYYY` or `YYYY` (e.g. `01.2026` or `2021`). A role or school with a
description gets an expand arrow; without one it renders as a plain row.
- **Media Library** — upload and choose images. To change an image inside article text,
  use the body editor's image control.

Save keeps a draft; **Publish** makes changes visible on the next website request.
The website keeps a copy of the CMS content between requests so pages do not wait on
the CMS; every save or publish pings the site's `/api/revalidate`, which drops that
copy. Set `SITE_URL` in `cms/.env` to the site's origin (and the same
`REVALIDATE_SECRET` on both sides) when they run on different hosts. If the site is
unreachable, the copy refreshes by itself within about 30 seconds.
Unpublish removes an article or project from the public site. New articles and projects
work immediately, without rebuilding. Smaller order numbers appear first, and repeatable
entries can be dragged to reorder.

The editor controls content within the existing design. Layout, CSS and behaviour stay
in code.

## Connect live Spotify

1. Open **Settings → Spotify connection** in Strapi as a Super Admin.
2. Create an app in the [Spotify developer dashboard](https://developer.spotify.com/dashboard).
   Register the exact **Redirect URI** displayed in the Strapi form. Locally it is
   `http://127.0.0.1:1337/spotify-connection/callback`.
3. Paste your **Client ID**, click **Save**, then **Connect Spotify**. Approve
   reading current and recently played tracks; Spotify returns you to Strapi. PKCE is used, so
   no Client Secret is needed. Authorization requests expire after ten minutes.
   If you already have a compatible refresh token, expand **Already have a
   refresh token?**, paste it and save. The masked input is write-only; leaving
   it blank preserves the saved token. Changing Client ID clears the old token.
4. In **Website settings → Spotify status**, select **Live**, enable the row and
   publish. Existing entries without a source also use live mode.

Credentials are saved with owner-only permissions to the ignored file
`cms/.spotify-credentials.local`, outside public uploads and the CMS content API.
The CMS refreshes access tokens automatically and persists rotated refresh tokens.
No restart is needed after connection. For hosting, securely provision this file
on the CMS server with persistent storage; never commit it or copy it into public assets.
Reconnect with **Connect Spotify**. **Disconnect** removes the saved token;
you can also revoke the app in Spotify. Disable the row in Strapi to stop public display.
Connection settings save immediately and do not require publishing Website settings.
For production, set `SPOTIFY_REDIRECT_URI` on the CMS to its public HTTPS callback
URL and register the same URL in Spotify.

The optional CLI connection command remains available:
`npm run spotify:connect -- YOUR_CLIENT_ID`. It uses its own local redirect URI,
`http://127.0.0.1:8888/callback`, which must be registered separately.

The website polls every 20 seconds while visible; the CMS shares cached results
across visitors and honors Spotify rate limits.

The CMS keeps its Spotify session in `cms/.spotify-state.local` (ignored by Git, owner-only):
the current access token, the last track, and any rate-limit back-off. Restarts therefore
reuse the session instead of re-authenticating, so the refresh token only rotates about
once an hour and cannot be lost mid-restart, and the last track shows immediately. If
Spotify rate-limits the app, the row keeps showing the last known track until the back-off
ends. Failures (a rejected token, a rate limit) are logged as `[spotify]` warnings in the
Strapi log; a rejected token means clicking **Connect Spotify** again. Persist this file
alongside the credentials file in production. Paused/no-track playback keeps the
latest track, album cover and Spotify link, labelled **Recently vibing to**. Change
that prefix under **Spotify status → Recently played text**. If no playback is
active, Spotify's recently played history supplies the last track even after a
server restart. If there is no known track or history, the row stays hidden.
Connections made before this feature need **Connect Spotify** again to grant
the additional `user-read-recently-played` permission.
Disconnected or unavailable activity is hidden; the manual
sample is never presented as live activity. This integration displays music tracks,
not podcast episodes, ads or local files, and does not request playback control.

Spotify app/account eligibility is governed by its current
[development mode requirements](https://developer.spotify.com/documentation/web-api/concepts/quota-modes).

Checks: `node tests/spotify.mjs` covers playback handling, token rotation, caching,
PKCE and callback state. `node tests/profile-overview.mjs` uses simulated playback
to verify track changes, idle/error states and responsive album interactions.

## Start again

From the repository root, in two terminals:

```sh
npm run cms:dev
```

```sh
corepack pnpm dev --host 127.0.0.1
```

The CMS commands select Node 22 because Strapi requires a supported LTS version. On a fresh checkout:

```sh
corepack pnpm install --frozen-lockfile
npm run cms:install
npm run cms:setup
npm run cms:dev
```

On a fresh database, original portfolio content is imported once from `cms/seed/content.json`; visit `/admin` to create your first administrator. Existing content is never overwritten on restart.

## Production / self-hosting

Use Node 22 and persistent disk storage. Strapi itself is free; any hosting provider may charge for compute/storage. This is currently running locally, not deployed publicly.

1. Configure `cms/.env` with unique secrets and `HOST=0.0.0.0` when needed by your hosting platform. Keep the generated secret values private.
2. Set the portfolio's `CMS_URL` to the CMS's public HTTPS origin. This origin is also used for uploaded images. Set it during build and runtime.
3. Build and start the CMS with `npm run cms:build` and `npm run cms:start`.
4. Build and start Astro with `corepack pnpm build` and `HOST=0.0.0.0 PORT=4321 npm start`.
5. Put both services behind HTTPS. Persist and back up **`cms/.tmp/data.db` and `cms/public/uploads/` together**, along with a secure copy of `cms/.env`.

The Astro application runs as a Node server so content stays current. Both services must remain running; this is not a static-only deployment. SQLite suits a single CMS instance on persistent storage. Password reset emails need an SMTP provider if you want email-based recovery; signing in and changing your password while logged in do not need one.

## Verification

With both services running and local test credentials available:

```sh
npm run test:cms
node tests/cms-browser.mjs
```

`test:cms` runs two suites. The integration test temporarily changes and restores the
profile name, uploads a test image, creates/publishes/unpublishes/deletes a test article
with a test category, and checks routes and access control. The icon test checks that
every logo name stored in the CMS still resolves to a real logo, and that the picker's
catalogue is in sync with the icon components the website renders — run
`npm run cms:sync-icons` if it reports the generated file is stale.

Run these against the local development database, not a live editorial database. The
browser check drives the admin panel with locally installed Google Chrome in headless
mode.

## Maintenance

- `npm run cms:sync-icons` regenerates the picker's copy of the site's own brand logos
  from `src/components/ui/icons/*.astro`. Run it after adding or changing one.
- `npm run cms:backup -- /absolute/path/backup.tar.gz` creates a restorable archive of both SQLite databases, uploads, CMS source/configuration and private environment files.
- `npm run cms:verify-backup -- /absolute/path/backup.tar.gz` checks every file checksum and database integrity.
- `npm run cms:restore -- /absolute/path/backup.tar.gz --target /absolute/path/fresh-directory` restores into an empty directory. Install dependencies and build before starting. Preserve the original CMS keys; update only deployment-specific origins, ports and callbacks. Keep the archive outside the public repo.

## Footer and build information

In **Content Manager → Website settings → Footer**:

- Edit the site title, description, and wordmark home link.
- **GitHub repository URL** is set to `https://github.com/s4meer-git/Portfolio`.
  **GitHub branch or ref** can be left blank to use the repository's default branch.
- **Footer grid cells** controls each heading, entry text, URL, new-tab behavior,
  cell width, and ordering. Add/remove cells or links as needed. A blank URL renders
  plain text. Source code uses the repository URL unless its first entry overrides it.
- Build/date use GitHub metadata. Stack uses package versions unless you add your own
  entries. Content counts the published articles and projects. All other cells use
  their editable entries. The default For agents links serve current published CMS
  content at `/llms.txt` and `/index.md`.
- Bottom social links still come from **Website settings → Links → Show in footer**.
- **Show large wordmark** controls the interactive SC mark below the footer.
- Save and publish to apply changes.

Local/dev servers show **Developer build** and never fetch a GitHub commit. Production
uses `BUILD_COMMIT_SHA` (or the supported hosting provider's commit environment variable)
when supplied, fetching that commit's date and linking to it. With no deployed SHA,
GitHub supplies the configured branch's latest commit, explicitly marked **latest commit**;
it is not presented as proof of the deployed version. The date is the commit date.
GitHub responses are cached for five minutes with a four-second timeout. Outages show
**Unavailable**, or keep the known deployed SHA if one exists. `GITHUB_TOKEN` is optional,
server-only, and never stored in public Strapi content.

Checks: `node tests/footer-build.mjs` exercises build resolution and failure handling.

### Footer visitor count

The information footer uses the site's content width and displays **Footer heading**
(`S4MEER.COM` by default) in `public/fonts/4x4-font.ttf`. The large animated wordmark remains separate.

The footer shows total visits. Each full page load records a new visit; retries of the same request are deduplicated. Client-side navigation reuses the current visit. No IP addresses or device fingerprints are stored by the visitor counter.

The CMS records visitor IDs and ordinals atomically in `visitors.db`, beside the
configured CMS SQLite database (`cms/.tmp/visitors.db` by default). Persist and back
up that directory in production. All app instances must use the same CMS. If the
counter is unavailable, the footer displays “Thanks for visiting” without inventing
a count. The old footer title/description and social-row settings do not control
this header; social links remain available elsewhere on the site.

Run `node tests/visitors.cjs` with the CMS's Node 22 runtime to check initialization,
deduplication, shared connections, and persistence after reopening the database.

## Structure of the CMS

In **Articles → Original post images**, set **Display width (%)** to control the visible artwork size. The LinkedIn adaptations use 80%, preserving the original files and aspect ratios.

In **Articles → Movie GIFs**, each scene has editable dialogue, movie/show name, source credit, visibility and display width. **Placement** offers **after-intro**, before the first section heading, or **after-section**. For after-section, **Place after section** takes the exact heading text without `##`; the scene appears at the end of that section. Update this field when renaming the heading. An unmatched heading hides the scene rather than placing it elsewhere. The heading field is ignored for after-intro.

Dialogue appears **over the bottom of the animation**. Publishing a dialogue edit updates that overlay without exporting a new video. The imported media includes an edited GIF, a matching lightweight playback video and a WebP still. Replace the matching media together when choosing a new scene. Video loads only as the scene enters view, pauses offscreen and has a manual Play/Pause control. Reduced-motion visitors see the still until they choose Play.

Published articles, original artwork, dates, taxonomy and movie media live in the CMS. Historical import/review folders and original movie sources are archived in the single private backup. Edit future content and media through the CMS; superseded one-time import scripts have been retired.

### Diagrams in article bodies

Add a fenced `diagram` block to the article's CMS body. Its JSON defines a title, rows of nodes, downward connections and an optional caption. For example:

````markdown
```diagram
{"title":"Accepting work is not completing it","rows":[[{"id":"job","text":"Job accepted"}],[{"id":"worker","text":"Worker processes it"}],[{"id":"result","text":"Result available"}]],"edges":[{"from":"job","to":"worker"},{"from":"worker","to":"result"}],"caption":"Show the real job state to the visitor."}
```
````

Node IDs must be unique. Connections reference those IDs and run from an earlier row to a later row; same-row and upward connections aren't supported. Keep diagrams small: at most six rows, three nodes per row, 24 connections and 100 characters per node label. An edge can have a short `label`. Invalid input remains a code block rather than executing anything. Labels are escaped, diagrams render on the server, and narrow screens use a compact layout when the labels fit. No browser diagram library is downloaded. Edit and publish the body to update the diagram.

- **Content Manager** lists, alphabetically: Article categories, Article series,
  Articles, Certifications, Education, Experience, Messages, Projects, Publications,
  Website settings.
- **Website settings** is laid out top to bottom in the order things appear on the
  site: profile, links, Spotify, badge stack, skills, contributions, call to action,
  navigation, command menu, wording blocks, footer, search & sharing.
- One-time content migrations live in `cms/src/bootstrap/`; each records a key in the
  Strapi store so it runs once. Field labels and descriptions are applied from
  `cms/src/bootstrap/admin-view.js` on every start.

Checks: `npm run test:command-menu`, `npm run test:certifications` and `npm run test:contact` drive the ⌘K menu and the
badge stack in Chrome against the running site.
