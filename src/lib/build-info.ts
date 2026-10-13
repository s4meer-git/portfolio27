/** Server-only GitHub build metadata. No tokens or GitHub requests reach the browser. */
export interface BuildInfo {
  label: string;
  date?: string;
  url?: string;
  source: "local" | "deployment" | "repository" | "unavailable";
}
interface Settings {
  repositoryUrl?: string;
  repositoryBranch?: string;
  developerBuildLabel?: string;
  unavailableBuildLabel?: string;
}
const cache = new Map<
  string,
  { expires: number; result: Promise<BuildInfo> }
>();

export function githubRepository(value?: string): string | undefined {
  try {
    const url = new URL(value || "");
    if (url.protocol !== "https:" || url.hostname !== "github.com") return;
    const match = url.pathname.match(/^\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/);
    if (!match) return;
    return `https://github.com/${match[1]}/${match[2]}`;
  } catch {
    return;
  }
}

export async function getBuildInfo(
  settings: Settings,
  options: {
    local: boolean;
    env?: Record<string, string | undefined>;
    fetcher?: typeof fetch;
  }
): Promise<BuildInfo> {
  if (options.local)
    return {
      label: settings.developerBuildLabel || "Developer build",
      source: "local",
    };
  const unavailable: BuildInfo = {
    label: settings.unavailableBuildLabel || "Unavailable",
    source: "unavailable",
  };
  const repository = githubRepository(settings.repositoryUrl);
  if (!repository) return unavailable;
  const env = options.env || process.env;
  const sha =
    env.BUILD_COMMIT_SHA ||
    env.VERCEL_GIT_COMMIT_SHA ||
    env.CF_PAGES_COMMIT_SHA ||
    env.COMMIT_REF ||
    env.GITHUB_SHA;
  const deployedSha = sha && /^[a-f\d]{7,40}$/i.test(sha) ? sha : undefined;
  const ref = deployedSha || settings.repositoryBranch?.trim() || "HEAD";
  const key = `${repository}:${ref}:${deployedSha ? "deployment" : "repository"}:${unavailable.label}`;
  const existing = cache.get(key);
  if (!options.fetcher && existing && existing.expires > Date.now())
    return existing.result;
  const result = (async (): Promise<BuildInfo> => {
    try {
      const repo = repository.slice("https://github.com/".length);
      const response = await (options.fetcher || fetch)(
        `https://api.github.com/repos/${repo}/commits/${encodeURIComponent(ref)}`,
        {
          headers: {
            Accept: "application/vnd.github+json",
            "User-Agent": "SC-Portfolio",
            ...(env.GITHUB_TOKEN
              ? { Authorization: `Bearer ${env.GITHUB_TOKEN}` }
              : {}),
          },
          signal: AbortSignal.timeout(4000),
        }
      );
      if (!response.ok) throw new Error(`GitHub ${response.status}`);
      const commit = await response.json();
      if (!/^[a-f\d]{40}$/i.test(commit.sha)) throw new Error("Invalid commit");
      const date = commit.commit?.committer?.date;
      return {
        label: commit.sha.slice(0, 7),
        url: `${repository}/commit/${commit.sha}`,
        date:
          typeof date === "string" && Number.isFinite(Date.parse(date))
            ? new Date(date).toISOString().slice(0, 10)
            : undefined,
        source: deployedSha ? "deployment" : "repository",
      };
    } catch {
      // A known deployed SHA remains useful if GitHub is unavailable/rate-limited.
      return deployedSha
        ? {
            label: deployedSha.slice(0, 7),
            url: `${repository}/commit/${deployedSha}`,
            source: "deployment",
          }
        : unavailable;
    }
  })();
  if (!options.fetcher) {
    if (cache.size >= 30) cache.delete(cache.keys().next().value!);
    cache.set(key, { expires: Date.now() + 300_000, result });
  }
  return result;
}
