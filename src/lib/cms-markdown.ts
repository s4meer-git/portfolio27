import MarkdownIt from "markdown-it";
import { mediaUrl } from "./cms";
import { renderArticleDiagram } from './article-diagram';
interface MovieMoment {
  enabled?: boolean; movieTitle: string; caption: string; afterHeading: string;
  gif?: string; video?: string; poster?: string; alt?: string; sourceUrl?: string;
  width?: number; height?: number; displayWidth?: number; captionArea?: number;
  placement?: 'after-intro' | 'after-section';
}
const percentWidth = (value?: number) => Math.min(100, Math.max(20, Number.isFinite(value) ? value! : 100));
export function renderMarkdown(body: string, images: { image?: string; width?: number; height?: number; caption?: string; displayWidth?: number }[] = [], moments: MovieMoment[] = []) {
  const md = new MarkdownIt({ html: false, linkify: true });
  md.core.ruler.push('article-images', state => {
    for (let i = 0; i < state.tokens.length - 2; i++) {
      const open = state.tokens[i];
      const inline = state.tokens[i + 1];
      const close = state.tokens[i + 2];
      if (open.type !== 'paragraph_open' || inline.type !== 'inline' || close.type !== 'paragraph_close' || inline.children?.length !== 1 || inline.children[0].type !== 'image') continue;
      const original = images.find(item => item.image === mediaUrl(inline.children[0].attrGet('src')));
      if (!original) continue;
      open.tag = close.tag = 'figure';
      open.attrJoin('class', 'article-artwork');
      open.attrSet('style', `width:${percentWidth(original.displayWidth)}%`);
      close.meta = { caption: original.caption };
    }
  });
  // Placement is CMS content. Insert after the complete matching section,
  // without changing the reviewed article body or adding entries to its TOC.
  md.core.ruler.push('movie-moments', state => {
    for (const moment of moments.filter(item => item.enabled !== false)) {
      if (!moment.video && !moment.gif) continue;
      let end: number;
      if (moment.placement === 'after-intro') {
        end = state.tokens.findIndex(token => token.type === 'heading_open');
        if (end < 0) end = state.tokens.length;
      } else {
        const start = state.tokens.findIndex((token, index) => token.type === 'heading_open' && state.tokens[index + 1]?.content === moment.afterHeading);
        if (start < 0) continue;
        end = start + 3;
        const depth = Number(state.tokens[start].tag.slice(1));
        while (end < state.tokens.length && !(state.tokens[end].type === 'heading_open' && Number(state.tokens[end].tag.slice(1)) <= depth)) end++;
      }
      const token = new state.Token('movie_moment', 'figure', 0);
      token.block = true;
      token.meta = moment;
      state.tokens.splice(end, 0, token);
    }
  });
  md.renderer.rules.movie_moment = (tokens, index) => {
    const moment: MovieMoment = tokens[index].meta;
    const escape = md.utils.escapeHtml;
    const safeUrl = (value?: string) => value && /^https?:\/\//i.test(value) ? escape(value) : '';
    const width = Math.max(1, moment.width || 480), height = Math.max(1, moment.height || 270);
    const video = safeUrl(moment.video), gif = safeUrl(moment.gif), poster = safeUrl(moment.poster);
    const source = safeUrl(moment.sourceUrl);
    const provider = moment.sourceUrl?.includes('giphy.com') ? 'GIPHY' : 'Tenor';
    return `<figure class="movie-moment" style="width:${percentWidth(moment.displayWidth ?? 80)}%" data-movie-moment>
      <div class="movie-stage" style="aspect-ratio:${width}/${height};--caption-area:${Math.min(50, Math.max(10, moment.captionArea || 32))}%">
        ${poster ? `<img class="movie-poster" src="${poster}" alt="${escape(moment.alt || moment.movieTitle)}" width="${width}" height="${height}" loading="lazy" decoding="async">` : ''}
        ${video ? `<video class="movie-video" data-src="${video}" preload="none" muted loop playsinline aria-label="${escape(moment.alt || moment.movieTitle)}" width="${width}" height="${height}"></video>` : `<img class="movie-gif" src="${gif}" alt="${escape(moment.alt || moment.movieTitle)}" width="${width}" height="${height}" loading="lazy" decoding="async">`}
        <p class="movie-dialogue">${escape(moment.caption)}</p>
        ${video ? '<button class="movie-toggle" type="button" aria-label="Play animation" hidden>Play</button>' : ''}
      </div>
      <figcaption>${escape(moment.movieTitle)}${source ? ` · <a href="${source}" target="_blank" rel="noopener noreferrer">${provider}</a>` : ''} · Adapted dialogue</figcaption>
    </figure>\n`;
  };
  const fence = md.renderer.rules.fence!;
  md.renderer.rules.fence = (tokens, index, options, env, self) => {
    if (tokens[index].info.trim() === 'diagram') {
      const diagram = renderArticleDiagram(tokens[index].content);
      if (diagram) return diagram;
    }
    return fence(tokens, index, options, env, self);
  };
  md.renderer.rules.paragraph_close = (tokens, index, options, env, self) =>
    (tokens[index].meta?.caption ? `<figcaption>${md.utils.escapeHtml(tokens[index].meta.caption)}</figcaption>` : '') + self.renderToken(tokens, index, options);
  // Pages already supply their main heading. Keep imported Markdown outlines
  // nested underneath it, including matching closing tags and TOC depths.
  md.core.ruler.push("page-heading-levels", state => {
    if (!state.tokens.some(token => token.type === "heading_open" && token.tag === "h1")) return;
    for (const token of state.tokens) {
      if (token.type === "heading_open" || token.type === "heading_close")
        token.tag = `h${Math.min(6, Number(token.tag.slice(1)) + 1)}`;
    }
  });
  md.core.ruler.push("reader-questions", state => {
    for (let i = 0; i < state.tokens.length; i++) {
      const token = state.tokens[i];
      if (token.type !== "blockquote_open") continue;
      const inline = state.tokens[i + 2];
      if (inline?.type !== "inline") continue;
      const marker = inline.content.match(/^\[!(QUESTION|QUOTE)(?: style=(subtle|solid|plain))?(?: align=(start|center|end))?\]\s*/);
      if (!marker) continue;
      const question = marker[1] === "QUESTION";
      token.attrJoin("class", `article-blockquote${question ? " article-question" : ""}`);
      token.attrSet("data-variant", marker[2] || (question ? "plain" : "subtle"));
      token.attrSet("data-align", marker[3] || (question ? "center" : "start"));
      inline.content = inline.content.slice(marker[0].length);
      inline.children = [];
      md.inline.parse(inline.content, md, state.env, inline.children);
      // An optional attribution is its own paragraph inside this quote. Limit
      // the scan to direct children so nested quotes cannot steal its caption.
      for (let j = i + 3; j < state.tokens.length; j++) {
        const candidate = state.tokens[j];
        if (candidate.type === "blockquote_close" && candidate.level === token.level) break;
        if (candidate.type !== "paragraph_open" || candidate.level !== token.level + 1) continue;
        const caption = state.tokens[j + 1];
        if (caption?.type !== "inline" || !caption.content.startsWith("[!CITE] ")) continue;
        candidate.tag = state.tokens[j + 2].tag = "footer";
        candidate.attrJoin("class", "article-blockquote-caption");
        caption.content = caption.content.slice(8);
        caption.children = [];
        md.inline.parse(caption.content, md, state.env, caption.children);
      }
    }
  });
  const blockquoteOpen = md.renderer.rules.blockquote_open || ((tokens, index, options, env, self) => self.renderToken(tokens, index, options));
  md.renderer.rules.blockquote_open = (tokens, index, options, env, self) => {
    const opening = blockquoteOpen(tokens, index, options, env, self);
    if (!tokens[index].attrGet("class")?.includes("article-blockquote")) return opening;
    const question = tokens[index].attrGet("class")?.includes("article-question");
    return opening + (question
      ? '<svg class="article-blockquote-icon article-question-icon" viewBox="0 0 24 32" fill="none" stroke="currentColor" aria-hidden="true"><path d="M5 9a7 7 0 0 1 14 0c0 4-7 4-7 9v2" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="27" r="1.4" stroke-width="1.4"/></svg>'
      : '<svg class="article-blockquote-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M10 6H4v7h5c0 3-1 4-4 5M21 6h-6v7h5c0 3-1 4-4 5" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>');
  };
  const headings: { depth: number; slug: string; text: string }[] = [];
  const seen = new Map<string, number>();
  md.renderer.rules.heading_open = (tokens, index, options, env, self) => {
    const text = tokens[index + 1].content;
    const base =
      text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s-]/gu, "")
        .trim()
        .replace(/\s+/g, "-") || "heading";
    const count = seen.get(base) || 0;
    seen.set(base, count + 1);
    const slug = count ? `${base}-${count}` : base;
    tokens[index].attrSet("id", slug);
    headings.push({ depth: Number(tokens[index].tag.slice(1)), slug, text });
    return self.renderToken(tokens, index, options);
  };
  const image = md.renderer.rules.image!;
  md.renderer.rules.image = (tokens, index, options, env, self) => {
    const src = tokens[index].attrGet("src");
    if (src?.startsWith("/uploads/"))
      tokens[index].attrSet("src", mediaUrl(src)!);
    const original = images.find(item => item.image === tokens[index].attrGet('src'));
    if (original?.width && original?.height) {
      tokens[index].attrSet('width', String(original.width));
      tokens[index].attrSet('height', String(original.height));
    }
    tokens[index].attrSet('loading', 'lazy');
    tokens[index].attrSet('decoding', 'async');
    return image(tokens, index, options, env, self);
  };
  const html = md.render(body);
  return { html, headings };
}
