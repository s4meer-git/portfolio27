# Articles and Personal Journal in the CMS

Open **Content Manager → Articles**. Choose the entry type:

- **technical**: appears at `/articles/<slug>` and in the technical article listing.
- **personal**: appears at `/journal/<slug>` and in Personal Journal. It does not appear in the technical listing, its category pages or its series pages.

The existing articles default to technical. Their bodies and publication dates were preserved.

## Categories, series and tags

Categories describe the subject and control the public article/publication filters. Source classification and earlier review files are archived in the private CMS backup.

DesignFlix remains the series for the numbered episodes and a shared tag on all technical posts supplied under the Designflix heading. The original episode number goes in **Episode number**. The series page orders numbered entries by that field, without changing publication dates. The older unnumbered posts use **System Design Notes** as their series and also retain the DesignFlix tag.

Personal stories use **Personal Journal** and have no forced technical series, code or exercise. Tags and original hashtags are separate editable fields. An episode number is not a hashtag.

## Images belong in the body

Insert or move an image using the rich-text editor's media button or a normal Markdown image link:

```markdown
This paragraph explains the diagram.

![A useful description](/uploads/your_image.jpg)

The next paragraph explains what the reader should notice.
```

The **Original images** component retains the source attachments and their descriptions; it never renders them as an automatic gallery. Inline source attachments receive their CMS width and height to reserve space, plus lazy loading and asynchronous decoding. The existing original artwork is preserved in CMS uploads.

## Blockquotes and reader questions

In an article's draft, open the **Blockquotes** panel on the right and click **Insert blockquote**. Choose **Reader question** or **Quotation**, enter the text, and select:

- **Style**: Subtle (muted left rule), Solid (strong left rule), or Plain (no rule).
- **Alignment**: Left, Center, or Right.
- **Attribution and source URL**: optional, shown below the quote.
- **Placement**: beginning, end, or after a section of the article.

The panel previews the treatment and inserts editable Markdown into **Body**. It does not save or publish automatically. Continue editing the body, then save and publish normally. The regular editor's media and formatting controls still work. The panel is unavailable in the published tab or for users without permission to edit the body.

Only use a question when it contributes to the passage. The body supports:

```markdown
> [!QUESTION]
> **_What happens if the same event arrives twice?_**
```

This produces a centered bold italic blockquote with a large outlined question mark above the text. Reader questions default to Plain, with no border or surrounding card. Attribution sits below the text. Subtle and Solid retain their optional left rule. The icon remains in the layout, so it cannot cover or break a short border. Ordinary Markdown blockquotes retain their existing appearance.

For manual Markdown, the optional controls are stored in the marker:

```markdown
> [!QUESTION style=plain align=center]
> What happens if the same event arrives twice?

> [!QUOTE style=subtle align=start]
> A useful quotation goes here.
>
> [!CITE] [Author name](https://example.com/source)
```

Use `subtle`, `solid`, or `plain` for style and `start`, `center`, or `end` for alignment. `[!QUESTION]` remains supported for existing articles. Each quote can have its own settings; all text and source links remain CMS content. The website renders the component without adding a client-side UI library.

## Exercises and sharing

The optional **Try-it-yourself exercise** component stores the question and answer as Markdown. The answer opens in a native dialog; Escape, the close button and a backdrop click dismiss it. Focus returns to the reveal button, including in Safari. If JavaScript is disabled, a details element exposes the answer.

Shared headings, reveal/close labels, share labels and enabled share channels are edited in **Website settings → Articles wording**. Journal page title, description and list wording are there too. Website settings follow the normal draft and publish workflow.

Changing and publishing an article updates the live page and the existing CMS-driven sitemap and LLM discovery documents. Personal entries use their journal URLs in those documents and in the command menu.

## Source provenance

Original LinkedIn dates, links, artwork and hashtags are stored with each adaptation in the CMS. Historical sources and review notes are kept in the private backup. Personal entries belong in the journal and do not need technical code examples or quizzes.
