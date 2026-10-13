// Server-only: visitors' locations are never requested or sent to a service.
// Geocoding uses the location published by the editor. Results are cached for a day.
const cache = new Map<
  string,
  { expires: number; value: Promise<string | undefined> }
>();

function validZone(zone?: string): string | undefined {
  if (!zone?.trim()) return;
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone.trim() });
    return zone.trim();
  } catch {
    return;
  }
}

export async function locationTimezone(
  location?: string,
  override?: string
): Promise<string | undefined> {
  const explicit = validZone(override);
  if (explicit) return explicit;
  const key = location?.trim();
  if (!key) return;
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.value;
  const value = (async () => {
    try {
      const query = new URLSearchParams({
        name: key,
        count: "1",
        language: "en",
        format: "json",
      });
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?${query}`,
        { signal: AbortSignal.timeout(2500) }
      );
      if (!response.ok) return;
      const data = await response.json();
      return validZone(data.results?.[0]?.timezone);
    } catch {
      return;
    }
  })();
  if (cache.size >= 100) cache.delete(cache.keys().next().value!);
  const entry = { expires: Date.now() + 86_400_000, value };
  cache.set(key, entry);
  // Retry transient failures after a minute; never display a guessed UTC clock.
  if (!(await value)) entry.expires = Date.now() + 60_000;
  return value;
}
