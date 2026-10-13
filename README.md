# Sameer Chauhan's portfolio

Astro renders the website; Strapi manages its content and uploads. Both run as Node services. The CMS editing guide is in [CMS.md](CMS.md).

## Local development

Use Node 22 for the CMS and pnpm for the website.

```sh
corepack pnpm install --frozen-lockfile
npm run cms:install
npm run cms:setup
npm run cms:dev
```

In another terminal:

```sh
corepack pnpm dev --host 127.0.0.1
```

Website: `http://127.0.0.1:4321`. CMS: `http://127.0.0.1:1337/admin`.

Set `CMS_LOGIN_ID` (administrator email) and `CMS_PASS` in `cms/.env` or the CMS server environment. They configure the owner account on startup; restart after changing them. Keep both server-only.

## Deployment

For Coolify, use `compose.yaml` and follow [the migration and deployment guide](docs/coolify-deployment.md).
It defines both production images, health checks and persistent storage. Prepare
storage with `scripts/prepare-coolify.py` before the first deployment.

1. Restore the CMS backup into a fresh directory before starting the CMS. It includes existing content, drafts, admin accounts, media, visitor counts and private configuration. Do not create a fresh empty database for the live site.
2. Install dependencies and configure the restored environment for the deployed hosts. Use `HOST=0.0.0.0` for the CMS when required. Set the website's `CMS_URL` to the CMS HTTPS origin at build and runtime. Set `SITE_URL=https://s4meer.com` and matching `REVALIDATE_SECRET` values on both services. Update the Spotify callback URL for the deployed CMS.
3. Build and start the CMS:

```sh
npm run cms:build
npm run cms:start
```

4. Build and start the website:

```sh
corepack pnpm build
HOST=0.0.0.0 PORT=4321 npm start
```

Use HTTPS and persistent storage for `cms/.tmp/`, `cms/public/uploads/`, the CMS environment/Spotify files, and the website's `IMAGE_CACHE_DIR` (defaults to `.cache/`). SQLite requires a single CMS instance sharing that persistent disk. Serve uploaded media from the CMS's public origin.

## CMS backup and restore

The backup is a private `.tar.gz` archive stored outside this repository. It includes configuration secrets, so it is excluded from deployment and version control.

```sh
npm run cms:backup -- /absolute/path/portfolio-cms-backup.tar.gz
# Refresh the same archive after content or credentials change:
npm run cms:backup -- /absolute/path/portfolio-cms-backup.tar.gz --replace
# Permanently retire an archived source file when refreshing:
# Add --omit-archived source-archive/path/to/retired-file (repeat as needed).
npm run cms:verify-backup -- /absolute/path/portfolio-cms-backup.tar.gz
npm run cms:restore -- /absolute/path/portfolio-cms-backup.tar.gz --target /absolute/path/fresh-directory
```

Restore verifies checksums and SQLite integrity, and refuses a non-empty target. Install dependencies and build both services in that directory before starting them. `RESTORE.md` inside the archive contains the same recovery instructions. Any archived authoring sources remain separate from runtime files.

A fresh CMS seeds the current profile, skills, experience, education and certifications. Authored articles and future projects belong to the CMS database; restore the backup before deployment to keep them.

## Maintenance

- `npm run cms:sync-icons`: refresh CMS logo-picker artwork after editing icons.
- `npm run test:icons`, `npm run test:organization-logos`, `npm run test:portraits`: targeted checks.
- CMS integration tests edit temporary content; use the local development database.
- [CMS.md](CMS.md): editing and service configuration.
- [SEO guide](docs/seo-guide.md): domains, discovery files and search settings.
- [Article authoring](docs/article-authoring.md): media, diagrams, questions and sharing.
- [Asset credits](docs/third-party/sources.md): retained third-party attribution and licence notices.
