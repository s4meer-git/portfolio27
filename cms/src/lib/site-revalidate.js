/** Refresh every CMS-backed page/SEO output after committed content changes. */
const SITE_URL = process.env.SITE_INTERNAL_URL || process.env.SITE_URL || 'http://127.0.0.1:4321';
const SECRET = process.env.REVALIDATE_SECRET || '';
const WRITES = new Set(['create', 'update', 'delete', 'publish', 'unpublish', 'discardDraft', 'clone']);
const MEDIA_WRITES = new Set(['afterCreate', 'afterUpdate', 'afterDelete', 'afterCreateMany', 'afterUpdateMany', 'afterDeleteMany']);

function registerSiteRevalidation(strapi) {
  let pausedUntil = 0;
  let pending;
  const scheduled = new WeakSet();

  async function ping() {
    if (Date.now() < pausedUntil) return;
    if (pending) return pending;
    pending = (async () => {
      try {
        const response = await fetch(`${SITE_URL}/api/revalidate`, {
          method: 'POST',
          headers: { 'x-revalidate-secret': SECRET, 'Content-Type': 'application/json' },
          body: '{}',
          signal: AbortSignal.timeout(1000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
      } catch (error) {
        pausedUntil = Date.now() + 30_000;
        strapi.log.warn(`Website refresh unavailable (${error.message}); automatic cache expiry remains active.`);
      }
    })().finally(() => { pending = undefined; });
    return pending;
  }

  async function notify() {
    if (!strapi.db.inTransaction()) return ping();
    // A caller may wrap several document operations in an outer transaction.
    // Register once on that commit, and never notify for a rolled-back write.
    await strapi.db.transaction(async ({ trx, onCommit }) => {
      if (scheduled.has(trx)) return;
      scheduled.add(trx);
      onCommit(() => { scheduled.delete(trx); void ping(); });
    });
  }

  // Document middleware runs after the service's transaction has completed.
  // Row-level hooks can fire earlier, while a publish is still replacing rows.
  strapi.documents.use(async (context, next) => {
    const result = await next();
    if (context.uid.startsWith('api::') && context.uid !== 'api::message.message' && WRITES.has(context.action))
      await notify();
    return result;
  });

  // Uploads use the media plugin rather than Document Service.
  strapi.db.lifecycles.subscribe(async event => {
    if (event.model?.uid === 'plugin::upload.file' && MEDIA_WRITES.has(event.action)) await notify();
  });
}

module.exports = { registerSiteRevalidation };
