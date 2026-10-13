import { cmsApiUrl } from './cms-origin';

export type ContributionDay = { date: string; count: number; level: number };
export type ContributionSource = { days: ContributionDay[]; total: number };
export type Contributions = {
  enabled: boolean;
  sources?: Partial<
    Record<"overall" | "github" | "leetcode", ContributionSource>
  >;
};

let cached: { value: Promise<Contributions>; until: number } | undefined;

/**
 * Daily activity only changes a few times a day, so one copy is shared across
 * requests for five minutes instead of asking the CMS on every home page render.
 */
export function loadContributions(): Promise<Contributions> {
  if (cached && cached.until > Date.now()) return cached.value;
  const value = fetchContributions();
  cached = { value, until: Date.now() + 5 * 60_000 };
  // Do not hold on to a failure; try again on the next request.
  value.then(result => {
    if (!result.enabled && cached?.value === value) cached = undefined;
  });
  return value;
}

/**
 * Daily activity for the heatmap. The CMS caches the upstream calls for an hour,
 * and a failure just hides the section rather than breaking the page.
 */
async function fetchContributions(): Promise<Contributions> {
  try {
    const response = await fetch(`${cmsApiUrl}/api/contributions`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return { enabled: false };
    return await response.json();
  } catch {
    return { enabled: false };
  }
}

/** Sunday-first week columns, padded so every column holds seven days. */
export function toWeeks(days: ContributionDay[]) {
  if (!days.length) return [];
  const lead = new Date(`${days[0].date}T00:00:00Z`).getUTCDay();
  const cells: (ContributionDay | null)[] = [
    ...Array(lead).fill(null),
    ...days,
  ];
  while (cells.length % 7) cells.push(null);
  const weeks: (ContributionDay | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** Month name against the column where that month first appears. */
export function monthLabels(weeks: (ContributionDay | null)[][]) {
  const labels: { index: number; name: string }[] = [];
  let previous = "";
  weeks.forEach((week, index) => {
    const first = week.find(Boolean);
    if (!first) return;
    const name = new Date(`${first.date}T00:00:00Z`).toLocaleString("en", {
      month: "short",
      timeZone: "UTC",
    });
    // Skip a label that would sit on the very last column with no room to read.
    if (name !== previous && index < weeks.length - 1) {
      labels.push({ index, name });
      previous = name;
    }
  });
  return labels;
}

export function formatRange(days: ContributionDay[]) {
  const stamp = (value: string) => {
    const [year, month, day] = value.split("-");
    return `${day}.${month}.${year}`;
  };
  return `${stamp(days[0].date)} – ${stamp(days[days.length - 1].date)}`;
}
