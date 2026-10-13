/**
 * Daily activity for the contribution heatmap.
 *
 * GitHub comes from the public contributions API (the same one chanhdai.com uses);
 * it already buckets each day into a level. LeetCode exposes a submission calendar
 * of unix-second keys through its GraphQL endpoint, with no levels, so those are
 * worked out here. Both are reduced to the same `{ date, count, level }` shape and
 * the combined view is their per-day sum, re-levelled so all three read alike.
 */

const GITHUB_API = 'https://github-contributions-api.jogruber.de/v4';
const LEETCODE_API = 'https://leetcode.com/graphql';
const DAY = 86_400_000;

const isoDate = value => new Date(value).toISOString().slice(0, 10);

/** The 366 days ending today, so every source covers the same window. */
function lastYearDates(today = new Date()) {
  const end = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const dates = [];
  for (let i = 365; i >= 0; i--) dates.push(isoDate(end - i * DAY));
  return dates;
}

/**
 * Buckets counts into GitHub's five levels. Thresholds come from the busiest day,
 * so a quiet year still shows contrast instead of a uniform pale grid.
 */
function levelled(counts) {
  const busiest = Math.max(0, ...counts.values());
  return date => {
    const count = counts.get(date) ?? 0;
    if (count <= 0) return { date, count: 0, level: 0 };
    if (busiest <= 4) return { date, count, level: Math.min(4, count) };
    const share = count / busiest;
    const level = share > 0.66 ? 4 : share > 0.33 ? 3 : share > 0.12 ? 2 : 1;
    return { date, count, level };
  };
}

async function githubDays(username) {
  if (!username) return null;
  const response = await fetch(`${GITHUB_API}/${encodeURIComponent(username)}?y=last`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`GitHub API returned ${response.status}`);
  const body = await response.json();
  const counts = new Map(
    (body.contributions ?? []).map(day => [day.date, Number(day.count) || 0])
  );
  return counts;
}

async function leetcodeDays(username) {
  if (!username) return null;
  const counts = new Map();
  // The calendar is per calendar year, so a rolling window needs both.
  const years = [...new Set([new Date().getUTCFullYear() - 1, new Date().getUTCFullYear()])];
  for (const year of years) {
    const response = await fetch(LEETCODE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Referer: 'https://leetcode.com' },
      body: JSON.stringify({
        query:
          'query($u:String!,$y:Int){matchedUser(username:$u){userCalendar(year:$y){submissionCalendar}}}',
        variables: { u: username, y: year },
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`LeetCode API returned ${response.status}`);
    const raw = (await response.json())?.data?.matchedUser?.userCalendar?.submissionCalendar;
    if (!raw) continue;
    for (const [seconds, count] of Object.entries(JSON.parse(raw))) {
      const date = isoDate(Number(seconds) * 1000);
      counts.set(date, (counts.get(date) ?? 0) + Number(count));
    }
  }
  return counts;
}

function series(counts, dates) {
  const toDay = levelled(counts);
  const days = dates.map(toDay);
  return { days, total: days.reduce((sum, day) => sum + day.count, 0) };
}

function createContributions({ now = Date.now, ttl = 60 * 60 * 1000 } = {}) {
  let cached = null;
  let cacheUntil = 0;
  let key = '';
  let pending = null;

  return async function contributions(settings) {
    if (!settings?.enabled) return { enabled: false };

    const github = settings.githubUsername?.trim() || '';
    const leetcode = settings.leetcodeUsername?.trim() || '';
    const identity = `${github}|${leetcode}`;
    if (identity !== key) {
      key = identity;
      cached = null;
      cacheUntil = 0;
    }
    if (cached && now() < cacheUntil) return cached;
    if (pending) return pending;

    pending = (async () => {
      const dates = lastYearDates();
      // One source failing must not take the other down with it.
      const [githubCounts, leetcodeCounts] = await Promise.all([
        githubDays(github).catch(() => null),
        leetcodeDays(leetcode).catch(() => null),
      ]);

      const result = { enabled: true, sources: {} };
      if (githubCounts) result.sources.github = series(githubCounts, dates);
      if (leetcodeCounts) result.sources.leetcode = series(leetcodeCounts, dates);

      if (githubCounts && leetcodeCounts) {
        const combined = new Map();
        for (const date of dates) {
          combined.set(date, (githubCounts.get(date) ?? 0) + (leetcodeCounts.get(date) ?? 0));
        }
        result.sources.overall = series(combined, dates);
      }

      if (Object.keys(result.sources).length) {
        cached = result;
        cacheUntil = now() + ttl;
      }
      return result;
    })();

    try {
      return await pending;
    } finally {
      pending = null;
    }
  };
}

const contributions = createContributions();

module.exports = { createContributions, contributions, lastYearDates, levelled };
