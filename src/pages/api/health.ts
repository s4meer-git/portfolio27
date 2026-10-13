import type { APIRoute } from 'astro';
import { cmsApiUrl } from '@/lib/cms-origin';

export const GET: APIRoute = async () => {
  const headers = { 'Cache-Control': 'no-store' };
  try {
    const cms = await fetch(`${cmsApiUrl}/_health`, { signal: AbortSignal.timeout(2500) });
    if (!cms.ok) throw new Error('CMS unavailable');
    return Response.json({ ok: true }, { headers });
  } catch {
    return Response.json({ ok: false }, { status: 503, headers });
  }
};
