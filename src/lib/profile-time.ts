/** Minutes east of UTC, including daylight saving at the supplied instant. */
export function utcOffset(timeZone: string, now = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
  }).formatToParts(now);
  const offset =
    parts.find(part => part.type === "timeZoneName")?.value || "GMT";
  const match = offset.match(/GMT([+-])(\d{2}):(\d{2})/);
  return match
    ? (Number(match[2]) * 60 + Number(match[3])) * (match[1] === "+" ? 1 : -1)
    : 0;
}

export function profileClock(
  timeZone: string,
  viewerZone: string,
  now = new Date()
) {
  const difference = utcOffset(timeZone, now) - utcOffset(viewerZone, now);
  const minutes = Math.abs(difference);
  const duration = [
    Math.floor(minutes / 60) ? `${Math.floor(minutes / 60)}h` : "",
    minutes % 60 ? `${minutes % 60}m` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return {
    time: new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(now),
    difference:
      difference === 0
        ? "same time"
        : `${duration} ${difference > 0 ? "ahead" : "behind"}`,
    zone: `${timeZone.replaceAll("_", " ")} · UTC${utcOffset(timeZone, now) >= 0 ? "+" : "−"}${String(Math.floor(Math.abs(utcOffset(timeZone, now)) / 60)).padStart(2, "0")}:${String(Math.abs(utcOffset(timeZone, now)) % 60).padStart(2, "0")}`,
  };
}
