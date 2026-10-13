/**
 * Gives every field in the admin panel a human label and an explanation of where it
 * shows up on the website.
 *
 * Strapi generates this configuration from the raw attribute names ("beforeAuthor",
 * "postPerPage"), which leaves an editor guessing. The content-manager plugin has
 * already written its defaults by the time the application bootstrap runs, so this
 * merges on top of whatever is there and leaves everything else untouched — including
 * any ordering the user sets later via "Configure the view".
 */

// field: [label, description, placeholder?]
const CONTENT_TYPES = {
  'api::site-setting.site-setting': {
    profile: ['Profile', 'Your name, role and biography, shown at the top of the home page.'],
    socialLinks: [
      'Links',
      'Every link to you elsewhere. Each one can appear under your profile, in the footer, or both — edit it once here.',
    ],
    spotify: ['Spotify status', 'Live listening activity in the right-hand profile column. Configure visibility, source and wording here.'],
    navigation: ['Navigation bar', 'The links across the top of every page, in order.'],
    skills: ['Skills', 'The technology grid on the home page. Each skill can carry a logo.'],
    contributions: ['Contributions', 'The activity heatmap under your profile.'],
    badges: ['Certification tickets', 'How the certification tickets behave. Add, edit or reorder the tickets themselves under Content Manager → Certifications.'],
    commandMenu: ['Command menu', 'The ⌘K search. New articles, projects, badges and links appear in it automatically; choose which kinds it lists and add your own entries.'],
    cta: ['Call to action', 'The closing invitation above the footer on the home page, with up to two buttons.'],
    emailBranding: ['Contact email branding', 'The website logo, description, profile signature and links in incoming contact-form emails. Name, role, location and email follow Profile; website address follows Search & sharing.'],
    sectionLabels: ['Home page headings', 'The headings above each section of the home page.'],
    articleLabels: ['Articles wording', 'Titles, headings and descriptions on the articles pages.'],
    publicationLabels: ['Publications wording', 'Titles and headings on the publications pages.'],
    projectLabels: ['Projects wording', 'Titles, headings, empty-state text and button labels on the projects pages.'],
    uiLabels: ['Button wording', 'Text on buttons and controls used across the whole site.'],
    footer: ['Footer', 'Title block, GitHub build source, editable metadata cells, and large SC wordmark.'],
    seo: ['Search & sharing', 'What search engines and social networks show for this site.'],
    articlesPerPage: ['Articles per page', 'How many articles each page of /articles lists before paging.'],
    publicationsPerPage: ['Publications per page', 'How many publications each page of /publications lists before paging.'],
  },
  'api::article.article': {
    contentKind: ['Entry type', 'Technical entries appear in Articles. Personal stories appear separately in Personal Journal.'],
    seriesOrder: ['Episode number', 'Optional original series number. Keep the author’s numbering, even if dates do not follow that order.'],
    title: ['Title', 'Shown as the article heading and in the articles list.'],
    slug: ['URL slug', 'The address uses /articles/<slug> for technical entries or /journal/<slug> for personal entries. Changing it breaks existing links.'],
    pubDatetime: ['Published on', 'The date shown on the article and used to order the list.'],
    description: ['Summary', 'One or two sentences shown in the articles list and in link previews.'],
    category: ['Category', 'The topic this article belongs to. Pick an existing one or add a new category.'],
    series: ['Series', 'Optional. Groups multi-part articles together under one page.'],
    tags: ['Tags', 'Short keywords shown on the article.'],
    image: ['Sharing image', 'The image used when the link is shared. Insert visible images in the body beside the passage they illustrate.'],
    body: ['Body', 'Place images with the media button or Markdown links where they belong. Use the Blockquotes panel to insert reader questions or quotations with style, alignment and attribution. Personal entries do not need code or a quiz.'],
  },
  'api::publication.publication': {
    category: ['Category', 'The topic used to filter this paper on the Publications page. Choose an existing category or create one in Categories.'],
    title: ['Title', 'The paper title, shown as the heading and in the publications list.'],
    slug: ['URL slug', 'The address of the page: /publications/<slug>. Changing it breaks existing links.'],
    publishedOn: ['Published on', 'The publication date. Orders the list, newest first.'],
    kind: ['Type', 'Journal article, conference paper, preprint, thesis, book chapter, report or other. Shown beside the venue.'],
    authors: ['Authors', 'In citation order, separated by commas. Your own name is highlighted.', 'S. Chauhan, J. Doe'],
    venue: ['Venue', 'The journal, conference, or publisher.', 'IEEE Access'],
    description: ['Abstract', 'Shown in the list and at the top of the page, and when the link is shared.'],
    doi: ['DOI', 'Just the identifier; it links to doi.org. Leave empty if there is none.', '10.1000/xyz123'],
    url: ['Paper link', 'Where to read it (publisher page, arXiv…). Leave empty to hide the button.'],
    pdf: ['PDF', 'Optional. Upload the paper itself; it gets a PDF button on the page.'],
    tags: ['Tags', 'Short keywords shown on the publication.'],
    image: ['Cover image', 'Optional. Shown when the link is shared.'],
    body: ['Body', 'Optional write-up under the abstract: summary, figures, links. Supports headings, code and images.'],
    citation: ['BibTeX', 'Optional. Shown under "Cite" with a copy button.'],
  },
  'api::project.project': {
    name: ['Name', 'The project title shown on the card and its page.'],
    slug: ['URL slug', 'The address of the project: /projects/<slug>.'],
    description: ['Summary', 'One or two sentences shown on the project card.'],
    type: ['Section', 'Core projects and side projects are listed under separate headings.'],
    technologies: ['Technologies', 'Shown as tags on the project card.'],
    sourceCode: ['Source code URL', 'Shown as the source button. Leave empty to hide it.'],
    preview: ['Live demo URL', 'Shown as the preview button. Leave empty to hide it.'],
    image: ['Image', 'Shown on the project card and page.'],
    body: ['Body', 'The full write-up shown on the project page.'],
    order: ['Display order', 'Lower numbers appear first within the section.'],
  },
  'api::experience.experience': {
    company: ['Company', 'The employer name shown in the Experience section.'],
    companyLogo: ['Company logo', 'Optional upload. Overrides the automatic LinkedIn logo. Greyscale until the entry is hovered.'],
    companyIcon: ['Company icon', 'Fallback when there is no uploaded or available LinkedIn logo. Leave empty for a plain dot.'],
    linkedinUrl: ['LinkedIn organisation URL', 'Optional public LinkedIn company or school page. Its logo is fetched and cached for the website. An uploaded company logo takes priority; blocked pages keep the fallback icon.'],
    companyWebsite: ['Company website', 'Optional. Turns the company name into a link.'],
    location: ['Location', 'e.g. "Bengaluru, India".'],
    locationType: ['Work setup', 'Shown in brackets after the location.'],
    isCurrentEmployer: ['Current employer', 'Adds “· Current” after the location.'],
    order: ['Display order', 'Lower numbers appear first. Use this to keep the newest job at the top.'],
    positions: ['Positions', 'One entry per role held at this company, newest first.'],
  },
  'api::education.education': {
    school: ['School', 'The institution name.'],
    icon: ['Icon', 'Shown in the tile beside the school. Defaults to a graduation cap.'],
    logo: ['Logo', 'Optional upload. Overrides the automatic LinkedIn logo.'],
    linkedinUrl: ['LinkedIn organisation URL', 'Optional public LinkedIn company or school page. Its logo is fetched and cached for the website. An uploaded logo takes priority; blocked pages keep the fallback icon.'],
    degree: ['Degree', 'e.g. "Bachelor\u2019s degree".'],
    fieldOfStudy: ['Field of study', 'e.g. "Computer Science".'],
    startDate: ['Start', 'Use MM.YYYY or YYYY, e.g. "08.2018".'],
    endDate: ['End', 'Same format as the start. Leave empty to show the infinity sign for ongoing study.'],
    description: ['Description', 'Optional. Adds an expandable panel; without it the entry does not open.'],
    skills: ['Subjects', 'Shown as tags under the entry.'],
    isExpanded: ['Open by default', 'Shows the description expanded when the page loads.'],
    order: ['Display order', 'Lower numbers appear first.'],
  },
  'api::certification.certification': {
    name: ['Credential name', 'Printed in the ticket\u2019s stub beside the QR code, e.g. "AWS Certified Machine Learning Engineer \u2013 Associate".'],
    issuer: ['Organization', 'Printed in the ticket header, e.g. Amazon Web Services.'],
    issuerLogo: ['Organization logo', 'Optional upload shown in the ticket header. Leave empty to use the icon below.'],
    issuerIcon: ['Organization icon', 'Used when no logo is uploaded, e.g. AWS.'],
    badge: ['Badge image', 'Shown on the ticket stub. Any image: a Credly PNG, a course badge, your own artwork.'],
    credentialUrl: ['Verification link', 'Any URL. The ticket\u2019s QR code is generated from it, and "Verify" opens it.'],
    credentialId: ['Credential ID', 'Optional, for your records. Not printed on the ticket.'],
    issuedOn: ['Issued', 'Optional, e.g. "03.2025".'],
    expiresOn: ['Expires', 'Optional, e.g. "03.2028".'],
    order: ['Display order', 'Lower numbers come first; the first is the front ticket.'],
  },
  'api::message.message': {
    name: ['Name', 'As typed by the visitor.'],
    email: ['Email', 'Reply to this address.'],
    message: ['Message', 'What they wrote.'],
    read: ['Read', 'Tick once handled, to keep track of what is new.'],
    timeZone: ['Visitor time zone', 'Reported by the browser at submission, e.g. Asia/Kolkata. Missing on older messages. Submission time is recorded in Created at.'],
    ipAddress: ['IP address', 'The connection address forwarded by the local website server. Local tests show a loopback address.'],
    fingerprint: ['Browser fingerprint', 'SHA-256 of browser, language and time zone. A basic browser signature, not a unique or verified device identity.'],
    userAgent: ['Browser / device', 'Browser user-agent header at submission.'],
    language: ['Language', 'Browser Accept-Language header at submission.'],
  },
  'api::category.category': {
    name: ['Name', 'Shown as the heading on the category page and on each article.'],
    slug: ['URL slug', 'The address of the category page: /articles/categories/<slug>.'],
    description: ['Description', 'Optional. Overrides the default wording on the category page.'],
    articles: ['Articles', 'Articles filed under this category. Set from the article, not here.'],
  },
  'api::series.series': {
    name: ['Name', 'Shown as the heading on the series page and on each article.'],
    slug: ['URL slug', 'The address of the series page: /articles/series/<slug>.'],
    description: ['Description', 'Optional. Overrides the default wording on the series page.'],
    articles: ['Articles', 'Articles in this series. Set from the article, not here.'],
  },
};

const COMPONENTS = {
  'portfolio.email-branding': {
    logo: ['Email logo image', 'Optional PNG cutout or local JPEG, WebP or GIF. Displayed on the fixed black email header. Leave empty to use the dedicated SC image cutout. Embedded in the email; no font needed.'],
    senderAvatar: ['Sender avatar image', 'Optional shared illustration for contact-form visitors. Defaults to the gender-neutral 3D cartoon avatar. The same image is used for every sender; no gender is guessed. Embedded in the email.'],
    websiteDescription: ['Website description', 'Optional text below the compact signature. Leave empty to omit. Plain text.'],
    signatureText: ['Signature note', 'Optional personal sign-off. Leave empty to omit. Plain text; line breaks are kept.'],
    signatureLinks: ['Signature links', 'Optional links below the compact signature. Leave empty to omit. Add your own confirmed social profiles here if desired.'],
    showProfilePhoto: ['Profile photo in signature', 'Embeds a small copy of your current Profile avatar in the signature.'],
    showFooterWordmark: ['Footer wordmark', 'The complete S4MEER wordmark in solid white on a black banner.'],
    footerNote: ['Footer note', 'Optional final note. Leave empty to omit.'],
  },
  'portfolio.profile': {
    displayName: ['Display name', 'Your name, shown as the main heading on the home page.'],
    namePronunciation: ['Name pronunciation', 'Optional audio of you saying your name. Adds a speaker button after your name (press P to play). Leave empty to hide it.'],
    role: ['Role', 'The line under your name, e.g. "Full-stack developer".'],
    slogan: ['Slogan', 'The small line of text above your name.'],
    email: ['Email address', 'Shown in the right-hand profile column as a contact link.'],
    location: ['Location', 'City and country, e.g. Dubai, United Arab Emirates. Also used to detect your local timezone automatically.'],
    timeZone: ['Timezone override', 'Optional IANA timezone, e.g. Asia/Dubai. Leave empty to detect from Location. Use this if the city is ambiguous.'],
    locationPhotoSubject: ['Location photo subject', 'Optional. Hovering your location shows a photo of the city, found on Wikipedia. Name a landmark or place here (e.g. Burj Khalifa, Dubai Marina) to show that instead.'],
    locationPhoto: ['Location photo', 'Optional. Upload your own photo for the location hover; it replaces the one found automatically.'],
    pronouns: ['Pronouns', 'Shown beside your contact details, e.g. he/him. Leave empty to hide.'],
    showLocalTime: ['Show local time', 'Shows your current time, timezone and how far ahead of or behind the visitor you are.'],
    about: ['About', 'The biography shown in the About section. Supports Markdown.'],
    avatar: ['Avatar', 'Your profile picture. Used in light mode, and in dark mode too unless you add a dark one below.'],
    avatarDark: ['Avatar (dark mode)', 'Optional. Shown instead of the avatar above when the site is in dark mode. Leave empty to use the same picture for both.'],
    avatarAlt: ['Avatar description', 'Describes the picture for screen readers. Defaults to your name.'],
    avatarLabel: ['Primary avatar label', 'Name shown when switching back to your main portrait, e.g. Fortnite.'],
    avatarShirt: ['Primary avatar T-shirt', 'The colour and uploaded logo on the hanger for your main portrait.'],
    avatarVariants: ['Other avatars & T-shirts', 'Additional portraits in switch order. Each has light/dark images and its matching T-shirt. Drag to reorder; switch Enabled off to hide one.'],
    verified: ['Verified badge', 'Shows the blue check next to your name.'],
  },
  'portfolio.avatar-shirt': {
    color: ['T-shirt colour', 'Hex colour, e.g. #653276.'],
    logo: ['T-shirt logo', 'Upload a transparent SVG, PNG or WebP logo. The logo stays paired with its portrait.'],
    logoWidth: ['Logo width', 'Width inside the badge, in pixels (1–32).'],
    logoHeight: ['Logo height', 'Height inside the badge, in pixels (1–32).'],
  },
  'portfolio.avatar-variant': {
    key: ['Variant key', 'A unique short name using lowercase letters, numbers and hyphens, e.g. lego.'],
    label: ['Avatar label', 'The name shown in the photo controls, e.g. LEGO or GTA VI.'],
    enabled: ['Enabled', 'Show this portrait and its T-shirt in the switcher.'],
    avatar: ['Avatar (light mode)', 'Portrait for this variant. Optimized and cached by the website.'],
    avatarDark: ['Avatar (dark mode)', 'Optional. Leave empty to use the light image in both themes.'],
    shirt: ['Matching T-shirt', 'The shirt colour and logo that travel with this portrait.'],
    imageScale: ['Portrait zoom', '1 means normal size. LEGO currently uses 1.24.'],
    imageOriginY: ['Zoom centre (%)', 'Vertical point around which zoom happens. 50 is the centre; LEGO uses 30.'],
  },
  'portfolio.social-link': {
    label: ['Link label', 'The clickable text. It appears between Text before link and Text after link.'],
    href: ['URL', 'Where the link goes.'],
    prefix: ['Text before link', 'Optional. Leave empty to place the link at the start. Example: "Find my".'],
    suffix: ['Text after link', 'Optional. Leave empty to place the link at the end. Example: "for my latest experience". Fill both text fields to put the link in the middle.'],
    icon: ['Logo', 'The logo shown next to the link. Pick one from the list.'],
    image: ['Custom logo', 'Optional. Upload your own image to use instead of the logo above.'],
    showInProfile: ['Show under profile', 'Lists this link under your name on the home page.'],
    showInFooter: ['Show in footer', 'Shows this link as an icon in the footer of every page.'],
    showPreview: ['Preview on hover', 'Hovering the link under your profile shows a small picture of the page. Switch off for pages that make a poor picture (sign-in walls).'],
    previewImage: ['Preview image', 'Optional. The picture shown on hover. Leave empty to use a screenshot of the page, taken once by the website and kept on its server.'],
  },
  'portfolio.spotify': {
    enabled: ['Show Spotify status', 'Shows your Spotify activity beside the profile links.'],
    source: ['Music source', 'Live reads your connected Spotify account. Set up credentials in Settings → Spotify connection. Manual uses the track fields below.'],
    idleText: ['Recently played text', 'Words before your last track when playback stops, e.g. Recently vibing to.'],
    prefix: ['Status text', 'Words before the track title, e.g. Vibing to.'],
    trackTitle: ['Track title', 'Manual mode only. Live mode gets the song name from Spotify.'],
    artist: ['Artist', 'Manual mode only. Live mode gets the artist from Spotify.'],
    trackUrl: ['Spotify track URL', 'Manual mode only. Live mode gets the track link from Spotify.'],
    albumCover: ['Album cover', 'Manual mode only. Live mode gets artwork from Spotify. The cover expands on hover or keyboard focus.'],
  },
  'portfolio.nav-link': {
    label: ['Label', 'The link text in the navigation bar.'],
    href: ['URL', 'Usually a path on this site, e.g. /articles.'],
  },
  'portfolio.contributions': {
    enabled: ['Show the heatmap', 'Hides the whole section when off.'],
    githubUsername: ['GitHub username', 'Leave empty to drop the GitHub tab.'],
    leetcodeUsername: ['LeetCode username', 'Leave empty to drop the LeetCode tab.'],
    defaultView: ['Default tab', 'Which tab is selected when the page loads.'],
    overallLabel: ['Overall tab label', 'Wording on the combined tab.'],
    githubLabel: ['GitHub tab label', 'Wording on the GitHub tab.'],
    leetcodeLabel: ['LeetCode tab label', 'Wording on the LeetCode tab.'],
  },

  'portfolio.skill': {
    title: ['Name', 'The technology name shown beside its logo.'],
    group: ['Group', 'Optional. Skills with the same label share one row, e.g. Languages or AI & LLMs. Rows follow the order of their first skill.'],
    href: ['URL', 'Where clicking the skill goes, usually its official site.'],
    icon: ['Logo', 'Pick the technology logo. Leave empty to show a generic link icon.'],
    image: ['Custom logo', 'Optional. Upload your own image to use instead of the logo above.'],
  },
  'portfolio.badge-settings': {
    enabled: ['Show certifications', 'Hides the whole section when off.'],
    shuffle: ['Auto-rotate', 'Moves to the next ticket every few seconds. Pauses while a visitor points at or touches the tickets.'],
    shuffleSeconds: ['Seconds per ticket', 'How long each ticket stays in front while auto-rotating.'],
  },
  'portfolio.command-menu': {
    enabled: ['Enable command menu', 'Turns off ⌘K, "/" and the search button when off.'],
    placeholder: ['Search placeholder', 'The grey text in the empty search box.'],
    emptyText: ['No results text', 'Shown when nothing matches.'],
    showSections: ['List home sections', 'About, Tech Stack, Experience and the other home page sections.'],
    showArticles: ['List articles', 'Every published article, found by title, summary, tags, category and series.'],
    showPublications: ['List publications', 'Every published publication, found by title, venue, authors and tags.'],
    showProjects: ['List projects', 'Every published project, found by name, summary and technologies.'],
    showTopics: ['List categories & series', 'The article category and series pages.'],
    showExperience: ['List experience & education', 'Each role and school.'],
    showCertifications: ['List certifications', 'Each Credly badge, opening its public page.'],
    showSkills: ['List tech stack', 'Each skill, opening its website.'],
    showSocialLinks: ['List links', 'Your links from Website settings → Links.'],
    showContact: ['List email actions', '"Send an email" and "Copy email address".'],
    showBrandAssets: ['List brand assets', 'Copy the SC mark or the S4MEER logotype as SVG.'],
    showTheme: ['List theme switcher', 'Light, Dark and System.'],
    customLinks: ['Extra entries', 'Your own entries, e.g. a résumé, a talk or a newsletter. Entries with the same group appear together.'],
  },
  'portfolio.command-link': {
    label: ['Label', 'The text shown in the menu and matched by search.'],
    href: ['URL', 'A path on this site (e.g. /projects) or a full https:// link.'],
    group: ['Group', 'The heading it appears under, e.g. "Links" or "Resources".'],
    keywords: ['Search keywords', 'Optional, comma-separated extra words that should find this entry.'],
    shortcut: ['Shortcut letter', 'Optional. Press G then this letter anywhere on the site to open it.'],
    openInNewTab: ['Open in new tab', 'Usually on for links to other websites.'],
  },
  'portfolio.cta': {
    enabled: ['Show call to action', 'Hides the whole block when off.'],
    eyebrow: ['Section title', 'The heading of the block, styled like About and Experience, e.g. "Let\u2019s work together".'],
    heading: ['Heading', 'The title of the left column, e.g. "Get in touch".'],
    description: ['Description', 'One or two sentences under the heading.'],
    methods: ['Contact methods', 'The rows with an arrow: email, a booking link, socials, a résumé. Drag to reorder.'],
    formEnabled: ['Show contact form', 'The right column. Messages arrive in Content Manager → Messages.'],
    formHeading: ['Form heading', 'e.g. "Send a message".'],
    formDescription: ['Form description', 'One sentence under the form heading.'],
    formButton: ['Send button text', 'e.g. "Send message".'],
    formSuccess: ['Thank-you text', 'Shown in place of the form after a message is sent.'],
  },
  'portfolio.contact-method': {
    icon: ['Icon', 'Pick one, e.g. Mail, Calendar, Linkedin or X.'],
    title: ['Title', 'The main line, e.g. your email address or "Schedule a free call".'],
    subtitle: ['Subtitle', 'The grey line under it, e.g. "30-minute strategy session".'],
    href: ['URL', 'mailto:, https:// or a path on this site.'],
    newTab: ['Open in new tab', 'Usually on for other websites.'],
  },
  'portfolio.footer': {
    title: ['Footer heading', 'The pixel-font title above the footer grid, e.g. S4MEER.COM.'],
    homeHref: ['Wordmark link', 'Destination for both SC wordmarks, normally /.'],
    repositoryUrl: ['GitHub repository URL', 'Repository used for commit details and the Source code cell. e.g. https://github.com/you/portfolio'],
    repositoryBranch: ['GitHub branch or ref', 'Leave empty for the default branch. A deployed commit SHA takes priority.'],
    developerBuildLabel: ['Local build label', 'Shown on localhost and development servers.'],
    unavailableBuildLabel: ['Unavailable build label', 'Shown when GitHub cannot provide build information.'],
    showWordmark: ['Show large wordmark', 'The faded interactive SC mark below the footer.'],
    fields: ['Footer grid cells', 'Drag to reorder. Each cell has an editable label, content type, width, and links.'],
  },
  'portfolio.footer-field': {
    label: ['Cell heading', 'For example Crafted by, Build, License, or Inspired by.'],
    kind: ['Content type', 'Links uses your entries. Build/date/source use GitHub settings. Stack uses installed versions unless entries are provided.'],
    width: ['Cell width', 'One column, two columns, or the full row. Mobile uses two columns.'],
    links: ['Entries', 'Editable labels and URLs. For Source code the first entry can override the label and destination.'],
  },
  'portfolio.footer-link': {
    label: ['Link text', 'Visible text.'],
    href: ['Link URL', 'Leave empty for plain text. Relative site paths and https URLs are supported.'],
    newTab: ['Open in new tab', 'Applies when a URL is provided.'],
  },
  'portfolio.position': {
    title: ['Job title', 'The role held at this company.'],
    icon: ['Role icon', 'Shown in the tile beside the title. Defaults to a briefcase.'],
    employmentType: ['Employment type', 'Shown before the dates.'],
    startDate: ['Start', 'Use MM.YYYY or YYYY, e.g. "01.2026". The duration is worked out from this.'],
    endDate: ['End', 'Same format as the start. Leave empty for a current role, which shows the infinity sign.'],
    description: ['Description', 'What you did in this role. Supports Markdown. Without it the entry does not expand.'],
    skills: ['Skills', 'Shown as tags under the role.'],
    isExpanded: ['Open by default', 'Shows the description expanded when the page loads.'],
  },
  'portfolio.tag': { label: ['Label', 'The text shown on the tag.'] },
  'portfolio.seo': {
    title: ['Site title', 'Shown in the browser tab and in search results.'],
    author: ['Author', 'The author name given to search engines.'],
    profile: ['Legacy profile URL', 'Kept for compatibility. The canonical profile now uses Primary domain; update that field instead.'],
    desc: ['Site description', 'The summary shown in search results and link previews.'],
    ogImage: ['Sharing image', 'Shown when a link to this site is posted on social media.'],
    favicon: ['Favicon', 'The small icon in the browser tab.'],
    language: ['Language', 'The site language code, e.g. "en".'],
  },
  'portfolio.section-labels': {
    about: ['About heading', 'The heading above your biography.'],
    skills: ['Skills heading', 'The heading above the technology grid.'],
    experience: ['Experience heading', 'The heading above your job history.'],
    education: ['Education heading', 'The heading above your schools.'],
    certifications: ['Certifications label', 'Read by screen readers and the search menu for the badge stack beside your profile.'],
  },
  'portfolio.article-labels': {
    pageTitle: ['Page title', 'The title of the /articles page.'],
    pageDescription: ['Page description', 'The introduction under the title on /articles.'],
    listHeading: ['List heading', 'The heading above the list of articles.'],
    categoriesHeading: ['Categories heading', 'The heading above the category tags.'],
    seriesHeading: ['Series heading', 'The heading above the series tags.'],
    categoryPageDescription: [
      'Category page description',
      'Shown on a single category page. Use {name} where the category name should go.',
      'All articles in {name}',
    ],
    seriesPageDescription: [
      'Series page description',
      'Shown on a single series page. Use {name} where the series name should go.',
      'All articles in {name}',
    ],
  },
  'portfolio.publication-labels': {
    pageTitle: ['Page title', 'The title of the /publications page.'],
    pageDescription: ['Page description', 'The introduction under the title on /publications.'],
    listHeading: ['List heading', 'The heading above the list of publications.'],
    categoriesHeading: ['Categories heading', 'The heading above the publication category hashtags.'],
    categoryPageDescription: ['Category page description', 'Shown on a publication category page. Use {name} for the category name.'],
    abstractHeading: ['Abstract heading', 'The heading above the abstract on a publication page.'],
    citeHeading: ['Cite heading', 'The heading above the BibTeX on a publication page.'],
  },
  'portfolio.project-labels': {
    pageTitle: ['Page title', 'The title of the /projects page.'],
    pageDescription: ['Page description', 'The introduction under the title on /projects.'],
    coreHeading: ['Core projects heading', 'The heading above projects marked "core".'],
    emptyMessage: ['Empty projects message', 'Shown when no project has been published.'],
    sideHeading: ['Side projects heading', 'The heading above projects marked "side".'],
    sourceButton: ['Source button', 'The label on the source-code button, e.g. "Source".'],
    previewButton: ['Demo button', 'The label on the live-demo button, e.g. "Preview".'],
  },
  'portfolio.ui-labels': {
    showMore: ['Show more', 'Expands a long job description.'],
    showLess: ['Show less', 'Collapses an expanded job description.'],
    previous: ['Previous page', 'The back link in the articles pager.'],
    next: ['Next page', 'The forward link in the articles pager.'],
    copyCode: ['Copy code', 'The button on a code block before it is clicked.'],
    copiedCode: ['Code copied', 'The same button just after it is clicked.'],
    tableOfContents: ['Table of contents', 'The heading above an article outline.'],
    backToTop: ['Back to top', 'The button that scrolls back to the top of a page.'],
    theme: ['Theme toggle', 'The label on the light/dark mode switch.'],
  },
};

CONTENT_TYPES['api::article.article'].sourceUrl = ['Original post URL', 'Original LinkedIn source for this adapted article.'];
CONTENT_TYPES['api::article.article'].hashtags = ['Original hashtags', 'The hashtags from the original post, stored separately from curated article topics.'];
CONTENT_TYPES['api::article.article'].attachments = ['Original post images', 'Source images and optional captions. Insert each image in the body at its relevant position; this list does not create a gallery.'];
CONTENT_TYPES['api::article.article'].exercise = ['Try it yourself', 'A closing question and its answer. The answer appears in an accessible popup.'];
CONTENT_TYPES['api::article.article'].movieMoments = ['Movie GIFs', 'Captioned movie or show scenes. Each scene appears after its chosen section, with dialogue over the bottom of the animation.'];
COMPONENTS['portfolio.article-image'] = {
  image: ['Image', 'The original attachment.'], alt: ['Image description', 'Accessible description of the image.'], caption: ['Caption', 'Optional text displayed under the image.'],
  displayWidth: ['Display width (%)', '80 makes the artwork 20% smaller in the article. The uploaded original stays intact.']
};
COMPONENTS['portfolio.movie-moment'] = {
  enabled: ['Show this GIF', 'Turn this scene on or off without removing its media.'],
  movieTitle: ['Movie or show', 'Displayed beneath the scene beside its source credit.'],
  caption: ['Dialogue over GIF', 'Your adapted dialogue, shown over the bottom of the animation. Edits appear after publishing without exporting a new video.'],
  placement: ['GIF placement', 'After introduction puts the GIF before the first heading. After section uses the heading below.'],
  afterHeading: ['Place after section', 'For after-section placement, paste the exact heading text without ##. Update this when renaming the heading.'],
  gif: ['Captioned GIF', 'The edited animated GIF. A matching video gives faster playback.'],
  video: ['Playback video', 'A matching muted MP4 loop. It loads when the scene reaches the screen and pauses when it leaves.'],
  poster: ['Still preview', 'Shown before playback and when the visitor prefers reduced motion.'],
  alt: ['Scene description', 'A short accessible description of what the scene shows.'],
  sourceUrl: ['GIF source', 'Original GIPHY or Tenor page, linked beneath the scene.'],
  displayWidth: ['Display width (%)', 'Percentage of the article column, capped at 480 pixels.'],
  captionArea: ['Dialogue area (%)', 'Height of the lower subtitle area. Match the area prepared in the uploaded scene.']
};
COMPONENTS['portfolio.article-exercise'] = {
  question: ['Question', 'Supports Markdown, examples and code.'], answer: ['Answer', 'Shown in the reveal-answer popup. Supports Markdown and code.']
};
for (const [field, value] of Object.entries(require('./article-engagement-defaults.json'))) {
  COMPONENTS['portfolio.article-labels'][field] = [field.replace(/([A-Z])/g, ' $1').replace(/^./, char => char.toUpperCase()),
    typeof value === 'boolean' ? 'Visibility control for article sharing.' : 'Editable wording used in articles, Personal Journal, questions, sharing or source information.'];
}

// Keep SEO controls visible when schemas evolve, including existing CMS instances.
for (const kind of ['article', 'project', 'publication', 'category', 'series']) {
  CONTENT_TYPES[`api::${kind}.${kind}`].seo = ['Search & sharing', 'Optional page-specific title, description, canonical, sharing image and indexing controls.'];
}
for (const [uid, fields] of Object.entries(require('./seo-fields'))) {
  COMPONENTS[uid] = { ...COMPONENTS[uid], ...fields };
}

/**
 * Merges labels into an existing configuration without disturbing anything else.
 *
 * A field missing from the stored configuration gets an entry created for it. The
 * content-manager writes its defaults for components lazily, so a newly added field
 * is often absent at bootstrap; skipping those left them labelled with their raw
 * attribute name.
 */
function applyMetadata(config, fields) {
  if (!config?.metadatas) return false;
  let changed = false;
  for (const [field, [label, description, placeholder]] of Object.entries(fields)) {
    if (!config.metadatas[field]) {
      config.metadatas[field] = {
        edit: { label, description, placeholder: '', visible: true, editable: true },
        list: { label, searchable: true, sortable: true },
      };
      changed = true;
    }
    const meta = config.metadatas[field];
    if (!meta.edit) continue;
    const next = {
      ...meta.edit,
      label,
      description,
      ...(placeholder !== undefined ? { placeholder } : {}),
    };
    if (JSON.stringify(next) !== JSON.stringify(meta.edit)) {
      meta.edit = next;
      changed = true;
    }
    if (meta.list && meta.list.label !== label) {
      meta.list = { ...meta.list, label };
      changed = true;
    }
  }
  return changed;
}

/**
 * Makes sure every field this file labels actually appears in the edit view.
 *
 * A field can carry metadata and still be invisible: the content-manager keeps a
 * separate layout, and a field absent from it is never rendered. That is easy to hit
 * when an attribute is added, removed and re-added, which leaves the layout stale and
 * the field silently missing from the form.
 */
function ensureInLayout(config, fields) {
  const rows = config?.layouts?.edit;
  if (!Array.isArray(rows)) return false;

  const present = new Set(rows.flat().map(field => field.name));
  const missing = Object.keys(fields).filter(
    name => !present.has(name) && config.metadatas?.[name]?.edit?.visible !== false
  );
  if (!missing.length) return false;

  for (const name of missing) {
    rows.push([{ name, size: 6 }]);
  }
  return true;
}

// Preserve legacy values without presenting controls that no longer change email appearance.
function hideLegacyEmailTheme(config, key) {
  if (key !== 'configuration_components::portfolio.email-branding') return false;
  const before = JSON.stringify(config);
  for (const name of ['theme', 'logoDark']) {
    const edit = config.metadatas?.[name]?.edit;
    if (edit) { edit.visible = false; edit.editable = false; }
  }
  if (Array.isArray(config.layouts?.edit)) {
    config.layouts.edit = config.layouts.edit.map(row => row.filter(field => !['theme', 'logoDark'].includes(field.name))).filter(row => row.length);
  }
  return before !== JSON.stringify(config);
}

/** Website settings, in the order an editor meets them on the site: top to bottom. */
const SITE_LAYOUT_KEY = 'site-settings-layout-v4';
const SITE_LAYOUT = [
  ['profile'],
  ['socialLinks'],
  ['spotify'],
  ['badges'],
  ['skills'],
  ['contributions'],
  ['cta'],
  ['navigation'],
  ['commandMenu'],
  ['sectionLabels'],
  ['articleLabels'],
  ['projectLabels'],
  ['uiLabels'],
  ['articlesPerPage'],
  ['footer'],
  ['seo'],
];

/**
 * Applies SITE_LAYOUT once. Later changes made through "Configure the view" are kept,
 * because the store remembers that this version has already been applied.
 */
async function organizeSiteSettings(strapi) {
  const flags = strapi.store({ type: 'core', name: 'portfolio' });
  if (await flags.get({ key: SITE_LAYOUT_KEY })) return;
  const store = strapi.store({
    type: 'plugin',
    name: 'content_manager',
    key: 'configuration_content_types::api::site-setting.site-setting',
  });
  const config = await store.get();
  if (!config?.layouts) return;
  config.layouts.edit = SITE_LAYOUT.map(row =>
    row.map(name => ({ name, size: name === 'articlesPerPage' ? 4 : 12 }))
  );
  await store.set({ value: config });
  await flags.set({ key: SITE_LAYOUT_KEY, value: true });
}

module.exports = async function applyAdminView(strapi) {
  await organizeSiteSettings(strapi);

  const entries = [
    ...Object.entries(CONTENT_TYPES).map(([uid, fields]) => [
      `configuration_content_types::${uid}`,
      fields,
    ]),
    ...Object.entries(COMPONENTS).map(([uid, fields]) => [
      `configuration_components::${uid}`,
      fields,
    ]),
  ];

  let updated = 0;
  for (const [key, fields] of entries) {
    const store = strapi.store({ type: 'plugin', name: 'content_manager', key });
    const config = await store.get();
    if (!config) continue;
    const labelled = applyMetadata(config, fields);
    const hidden = hideLegacyEmailTheme(config, key);
    const laidOut = ensureInLayout(config, fields);
    if (labelled || hidden || laidOut) {
      await store.set({ value: config });
      updated += 1;
    }
  }
  if (updated) strapi.log.info(`Applied admin field descriptions to ${updated} types.`);
};
