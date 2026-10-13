/** Display names for the CMS's publication types (Publications → Type). */
export const PUBLICATION_KINDS: Record<string, string> = {
  journal: "Journal article",
  conference: "Conference paper",
  preprint: "Preprint",
  thesis: "Thesis",
  chapter: "Book chapter",
  report: "Report",
  other: "Publication",
};

/** The authors as a list, in citation order. */
export const authorList = (authors?: string) =>
  (authors || "")
    .split(",")
    .map(name => name.trim())
    .filter(Boolean);

/**
 * Whether an author entry is the site owner, so it can be highlighted. Matches the
 * surname plus the first initial, which covers "Sameer Chauhan" and "S. Chauhan".
 */
export function isOwner(author: string, owner: string) {
  const words = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean);
  const me = words(owner);
  const them = words(author);
  if (me.length < 2 || them.length < 2) return false;
  return me.at(-1) === them.at(-1) && me[0][0] === them[0][0];
}

/** A DOI entered as the bare identifier or as a full URL, as a doi.org link. */
export const doiUrl = (doi?: string) => {
  const id = (doi || "").trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
  return id ? `https://doi.org/${id}` : undefined;
};
