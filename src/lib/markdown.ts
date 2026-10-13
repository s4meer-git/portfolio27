// @ts-ignore
import MarkdownIt from "markdown-it";

const md = new MarkdownIt();

/**
 * Renders CMS rich text to HTML.
 *
 * Styling belongs to the element this is injected into, not to the markup: an
 * earlier version stamped a class onto every `<p>`, which also hit paragraphs
 * nested inside list items and pushed each bullet's text away from its marker.
 * It also mutated the shared renderer on every call, so the last caller's class
 * leaked into unrelated renders.
 */
export function markdownToHtml(markdown: string): string {
  return md.render(markdown || "");
}
