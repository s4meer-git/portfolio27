// Keep insertion in the existing Markdown body, so CMS save/publish and API
// consumers see the same content. No independent content store is involved.
export function blockquoteMarkdown({ kind = 'QUESTION', variant = 'plain', align = 'center', text, author = '', source = '' }) {
  if (!['QUESTION', 'QUOTE'].includes(kind) || !['subtle', 'solid', 'plain'].includes(variant) || !['start', 'center', 'end'].includes(align)) throw new Error('Choose a valid blockquote style.');
  if (!text?.trim()) throw new Error('Enter the question or quote first.');
  const escapeLabel = value => value.replace(/[\\[\]]/g, '\\$&').replace(/\s+/g, ' ').trim();
  let caption = '';
  if (source.trim()) {
    let url;
    try { url = new URL(source.trim()); } catch { throw new Error('Use a full http:// or https:// source URL.'); }
    if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Use an http:// or https:// source URL.');
    caption = `[${escapeLabel(author.trim() || url.hostname)}](<${url.href.replace(/</g, '%3C').replace(/>/g, '%3E')}>)`;
  } else if (author.trim()) caption = escapeLabel(author);
  return `> [!${kind} style=${variant} align=${align}]\n` + text.trim().split('\n').map(line => `> ${line}`).join('\n') + (caption ? `\n>\n> [!CITE] ${caption}` : '');
}

export function blockquotePositions(body = '') {
  const headings = [];
  let offset = 0, fence = null;
  for (const line of body.split('\n')) {
    const delimiter = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (delimiter) {
      const chars = delimiter[1];
      if (!fence) fence = chars;
      else if (chars[0] === fence[0] && chars.length >= fence.length && !delimiter[2].trim()) fence = null;
    } else if (!fence) {
      const heading = line.match(/^ {0,3}#{1,6}\s+(.+?)\s*#*\s*$/);
      if (heading) headings.push({ offset, text: heading[1] });
    }
    offset += line.length + 1;
  }
  return [
    { value: 'end', label: 'End of article', offset: body.length },
    { value: 'start', label: 'Beginning of article', offset: 0 },
    ...headings.map((heading, index) => ({ value: `section-${heading.offset}`, label: `After section: ${heading.text}`, offset: headings[index + 1]?.offset ?? body.length })),
  ];
}

export function insertBlockquote(body = '', quote, position = 'end') {
  const target = blockquotePositions(body).find(item => item.value === position);
  if (!target) throw new Error('The article sections changed. Choose the placement again.');
  const before = body.slice(0, target.offset).replace(/\n+$/, '');
  const after = body.slice(target.offset).replace(/^\n+/, '');
  return [before, quote, after].filter(Boolean).join('\n\n');
}
