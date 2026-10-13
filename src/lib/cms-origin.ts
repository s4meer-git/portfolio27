/** Server requests can use Docker networking; browser media needs a public URL. */
export const cmsPublicUrl = (
  process.env.CMS_URL || import.meta.env?.CMS_URL || 'http://127.0.0.1:1337'
).replace(/\/+$/, '');

/** CMS media downloads stay on Docker's network; third-party images keep their URL. */
export function cmsFetchUrl(value: string): string {
  if (cmsApiUrl === cmsPublicUrl) return value;
  try {
    const url = new URL(value);
    if (url.origin === new URL(cmsPublicUrl).origin) {
      return new URL(url.pathname + url.search, cmsApiUrl + '/').href;
    }
  } catch { /* Keep the caller's original handling for an invalid URL. */ }
  return value;
}

export const cmsApiUrl = (
  process.env.CMS_INTERNAL_URL || cmsPublicUrl
).replace(/\/+$/, '');
