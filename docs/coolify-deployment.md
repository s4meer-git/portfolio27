# Deploy this portfolio with Coolify

Deploy `compose.yaml` as one Docker Compose application. It builds two Node 22
services: `website` (Astro, port 4321) and `cms` (Strapi, port 1337). Coolify's
reverse proxy provides HTTPS; the Compose definition does not expose host ports.

## 1. Provide the cleaned source

Connect [s4meer-git/portfolio27](https://github.com/s4meer-git/portfolio27), using
the `main` branch. In Coolify, create a new application from that public repository
and choose Docker Compose. Set Base
Directory to `/` and Docker Compose Location to `compose.yaml`. Load the file,
but prepare the content and environment before selecting Deploy.

Alternatively, Coolify can use prebuilt container images through Docker Compose
Empty; that requires building and delivering both images separately.

Do not commit `.env` files, private Spotify files, the CMS database, uploads, or
the recovery archive. `.dockerignore` excludes these from container builds too.
For builds on the same VPS, 4 GB RAM is a reasonable starting point; monitor the
Strapi admin build and increase memory if necessary.

## 2. Restore the content on the VPS before the first deployment

Keep the single archive private. From your Mac, upload it to your server:

```sh
scp /Users/sameer/Documents/portfolio-cms-backup-20261013.tar.gz YOUR_SSH_USER@YOUR_SERVER_IP:~/portfolio-cms-backup.tar.gz
```

The archive includes `scripts/cms-backup.py`. Obtain that script from your source
checkout, or extract just the script on the VPS:

```sh
tar -xzf ~/portfolio-cms-backup.tar.gz -C /tmp scripts/cms-backup.py
sudo python3 /tmp/scripts/cms-backup.py restore ~/portfolio-cms-backup.tar.gz --target /opt/portfolio-restored
sudo python3 /opt/portfolio-restored/scripts/prepare-coolify.py /opt/portfolio-restored --target /data/portfolio --uid 1000 --gid 1000
```

Both targets must be fresh and empty. Restore checks every archive checksum and
both SQLite databases. Preparation verifies the restored runtime files, copies
the data into the three persistent directories, retains the existing Strapi
secrets/admin credentials, and writes a private `/data/portfolio/coolify.env`.
UID/GID 1000 are the `node` user inside both images.

The Compose file uses explicit absolute bind mounts under `/data/portfolio`.
This avoids Coolify interpreting interpolated storage paths as Docker volumes or
splitting a default-value expression into the wrong source and destination.
If using a different storage root, update all three `source` paths in
`compose.yaml` to match it before deployment. `DATA_ROOT` does not override them.

| Host directory | Container destination | Purpose |
| --- | --- | --- |
| `/data/portfolio/cms-data` | `/app/cms/.tmp` | CMS database, visitor database and private Spotify state |
| `/data/portfolio/cms-uploads` | `/app/cms/public/uploads` | Article artwork, GIFs, avatars and other CMS media |
| `/data/portfolio/site-cache` | `/app/.cache` | Optimised portraits, organisation logos and link previews |

The CMS container refuses to start if its restored database is missing or invalid.
It will not silently create an empty replacement website.

If a manual `docker run` starts but Coolify reports missing restored data, inspect
the actual service mounts. The CMS database destination must be `/app/cms/.tmp`,
backed by `/data/portfolio/cms-data`; the other mounts must match the table above.
Reload the Compose file from Git after changing storage definitions.

## 3. Set the environment in Coolify

Read `/data/portfolio/coolify.env` privately on the server and copy its values
into the resource's Environment Variables. Keep the original Strapi secret
values: generating replacements during migration can break encrypted data and
existing sessions. Use your existing verified Resend sender and API key.

`CMS_URL` and `SITE_URL` are public URLs needed during build and runtime. All
passwords, signing keys, tokens, Resend/SMTP values and `REVALIDATE_SECRET` are
runtime-only. Under Build arguments, choose **Managed manually in Dockerfile**;
the Compose file passes only the declared public build arguments. If a secret
contains `$`, set its Interpolation option to **Literal (keep $ characters as-is)**.

The Compose definition supplies `HOST`, ports, database/cache paths, internal
service URLs and proxy settings. Leave those as defined. The website uses
`http://cms:1337` internally but publishes uploaded image URLs under
`https://cms.s4meer.com`. CMS edits notify `http://website:4321` internally.

The same `REVALIDATE_SECRET` is passed to both services. Administrator credentials
remain controlled by `CMS_LOGIN_ID` and `CMS_PASS`. Use one CMS instance with the
current SQLite database.

## 4. Configure DNS and HTTPS domains

Set DNS records at the provider hosting the authoritative DNS for `s4meer.com`:

| Type | Name | Value |
| --- | --- | --- |
| A | `@` | VPS public IPv4 address |
| A | `cms` | VPS public IPv4 address |
| CNAME | `www` | `s4meer.com` |

Replace conflicting old hosting records for these web hosts. Keep Google/Resend
mail records unchanged. Add an AAAA record only if the VPS has working public
IPv6. If using Cloudflare, start with DNS-only records while configuring HTTPS.

In Coolify's Domains settings, assign:

| Compose service | Coolify domain value |
| --- | --- |
| `website` | `https://s4meer.com:4321` and `https://www.s4meer.com:4321` |
| `cms` | `https://cms.s4meer.com:1337` |

The port suffix belongs only in Coolify's configuration: it selects the internal
container port. The public website is **`https://s4meer.com`**, without `:4321`.
The public CMS is `https://cms.s4meer.com/admin`, without `:1337`.
Preserve the public Host header so canonical URLs, redirects and indexing work.

If Spotify needs reconnecting, add
`https://cms.s4meer.com/spotify-connection/callback` to the Spotify application's
allowed redirect URIs, then reconnect through the CMS.

## 5. Deploy and verify

Select Deploy. Check build logs, runtime logs and both service health checks.
The CMS starts first; the website waits for it to become healthy.

- Open the homepage, Articles, a technical article, and the personal journal.
- Confirm your 39 published articles, artwork, GIFs and avatar/T-shirt variants.
- Sign in at `https://cms.s4meer.com/admin` using the configured owner credentials.
- Make a small CMS wording edit and confirm the live page updates; restore it.
- Submit the contact form with an email address you control and check delivery
  and Reply-To in your inbox.
- Reload and check that the visitor count increases.
- Check `/robots.txt`, `/sitemap.xml`, `/sitemap-index.xml`, `/llms.txt`, and
  `/index.md`. Confirm the primary domain is `https://s4meer.com` and indexing
  is enabled in the CMS. Do not set `SEO_INDEXING_DISABLED=true` in production.
- Redeploy once and confirm the content, uploaded media and visitor count remain.

The website health endpoint is `/api/health` (200 when the CMS is reachable);
Strapi's is `/_health` (204). These are already configured in Compose.

Once live, update the CMS footer's deployment label to Coolify. Configure ongoing
off-server backups of the persistent directories and keep a private copy of the
Coolify environment. Use SQLite's online backup API or stop the CMS before copying
active database files; copying only `data.db` during live WAL writes can miss data.
The migration archive is the pre-launch recovery copy, not an ongoing backup job.
Stop the local CMS after switching live so its Spotify token refreshes do not
compete with the copied production connection.

The deployment checks apply compatible fixes for the critical
[Handlebars advisory](https://github.com/advisories/GHSA-p8wg-vrv2-v86f) and
[shell-quote advisory](https://github.com/advisories/GHSA-pqg4-j6r4-53mv).
Other inherited dependency advisories remain; this deployment verification is
not a complete application security audit.

## Official references

- [Coolify Docker Compose](https://coolify.io/docs/applications/builds/docker-compose)
- [Coolify environment variables](https://coolify.io/docs/applications/configuration/environment-variables)
- [Coolify persistent storage](https://coolify.io/docs/applications/configuration/persistent-storage)
- [Strapi Docker deployment](https://docs.strapi.io/cms/installation/docker)
