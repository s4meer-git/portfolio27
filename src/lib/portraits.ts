import { mediaUrl } from "./cms";

const number = (value: unknown, fallback: number, min: number, max: number) => {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback;
};
const shirt = (value: any) => ({
  color: /^#[\da-f]{6}$/i.test(value?.color || "") ? value.color : "#17171a",
  logo: mediaUrl(value?.logo),
  logoWidth: number(value?.logoWidth, 24, 1, 32),
  logoHeight: number(value?.logoHeight, 24, 1, 32),
});

/** The main image still follows Profile's avatar fields, including the email signature. */
export function portraitDefinitions(profile: any) {
  const primary = {
    name: "fortnite", label: profile.avatarLabel?.trim() || "Original",
    lightSource: mediaUrl(profile.avatar), darkSource: mediaUrl(profile.avatarDark) || mediaUrl(profile.avatar),
    lightVersion: profile.avatarUpdatedAt || profile.avatar?.updatedAt || "1",
    darkVersion: profile.avatarDarkUpdatedAt || profile.avatarDark?.updatedAt || profile.avatarUpdatedAt || "1",
    imageScale: 1, imageOriginY: 50, ...shirt(profile.avatarShirt),
  };
  const names = new Set([primary.name]);
  const alternatives = (profile.avatarVariants || []).filter((item: any) => item.enabled !== false && mediaUrl(item.avatar))
    .map((item: any, index: number) => {
      const base = /^[a-z\d-]{1,40}$/.test(item.key || "") ? item.key : `variant-${index + 1}`;
      let name = base; let suffix = 2;
      while (names.has(name)) name = `${base}-${suffix++}`;
      names.add(name);
      return {
        name, label: item.label?.trim() || `Portrait ${index + 2}`,
        lightSource: mediaUrl(item.avatar), darkSource: mediaUrl(item.avatarDark) || mediaUrl(item.avatar),
        lightVersion: item.avatar?.updatedAt || "1", darkVersion: item.avatarDark?.updatedAt || item.avatar?.updatedAt || "1",
        imageScale: number(item.imageScale, 1, .5, 3), imageOriginY: number(item.imageOriginY, 50, 0, 100),
        ...shirt(item.shirt),
      };
    });
  return [primary, ...alternatives];
}

export function portraitImageUrl(name: string, theme: string, version: string) {
  const params = new URLSearchParams({ theme, v: version || "1" });
  if (name !== "fortnite") params.set("variant", name);
  return `/api/portrait?${params}`;
}
