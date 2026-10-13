import type { Schema, Struct } from "@strapi/strapi";

export interface PortfolioArticleExercise extends Struct.ComponentSchema {
  collectionName: "components_portfolio_article_exercise";
  info: {
    displayName: "Try it yourself";
  };
  attributes: {
    answer: Schema.Attribute.RichText;
    question: Schema.Attribute.RichText;
  };
}

export interface PortfolioArticleImage extends Struct.ComponentSchema {
  collectionName: "components_portfolio_article_image";
  info: {
    displayName: "Original article image";
  };
  attributes: {
    alt: Schema.Attribute.String;
    caption: Schema.Attribute.Text;
    displayWidth: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 100;
          min: 20;
        },
        number
      > &
      Schema.Attribute.DefaultTo<100>;
    image: Schema.Attribute.Media<"images">;
  };
}

export interface PortfolioArticleLabels extends Struct.ComponentSchema {
  collectionName: "components_portfolio_article_labels";
  info: {
    description: "Wording on the articles pages. The two page descriptions may contain {name}, replaced by the category or series name.";
    displayName: "Articles wording";
  };
  attributes: {
    articlesLinkLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<"Technical articles">;
    categoriesHeading: Schema.Attribute.String;
    categoryPageDescription: Schema.Attribute.Text;
    closeAnswerLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<"Close answer">;
    copiedLinkLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<"Link copied">;
    copyFailedLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<"Copy the link from the address bar.">;
    copyLinkLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<"Copy link">;
    exerciseHeading: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<"Try it yourself">;
    hashtagsHeading: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<"From the original post">;
    journalDescription: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<"Personal stories, university life and milestones along the way.">;
    journalLinkLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<"Personal Journal">;
    journalListHeading: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<"Journal entries">;
    journalTitle: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<"Personal Journal">;
    listHeading: Schema.Attribute.String;
    pageDescription: Schema.Attribute.Text;
    pageTitle: Schema.Attribute.String;
    revealAnswerLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<"Reveal the answer">;
    seriesHeading: Schema.Attribute.String;
    seriesPageDescription: Schema.Attribute.Text;
    shareDescription: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<"Know someone who would enjoy this? Send it their way.">;
    shareEmail: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    shareEmailLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<"Email">;
    shareHeading: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<"Share this article with your friends">;
    shareLinkedIn: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    shareLinkedInLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<"LinkedIn">;
    shareNative: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    shareNativeLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<"Share">;
    shareWhatsApp: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    shareWhatsAppLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<"WhatsApp">;
    shareX: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    shareXLabel: Schema.Attribute.String & Schema.Attribute.DefaultTo<"X">;
    showShareSection: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    solutionHeading: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<"A possible solution">;
    sourceLinkLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<"Original LinkedIn post">;
    tagsHeading: Schema.Attribute.String & Schema.Attribute.DefaultTo<"Topics">;
  };
}

export interface PortfolioAvatarShirt extends Struct.ComponentSchema {
  collectionName: "components_portfolio_avatar_shirts";
  info: {
    description: "The colour and logo of this portrait's hanging T-shirt.";
    displayName: "T-shirt";
  };
  attributes: {
    color: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 7;
      }> &
      Schema.Attribute.DefaultTo<"#17171a">;
    logo: Schema.Attribute.Media<"images" | "files">;
    logoHeight: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 32;
          min: 1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<24>;
    logoWidth: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 32;
          min: 1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<24>;
  };
}

export interface PortfolioAvatarVariant extends Struct.ComponentSchema {
  collectionName: "components_portfolio_avatar_variants";
  info: {
    description: "Another portrait in the photo switcher, with its matching T-shirt.";
    displayName: "Avatar variant";
  };
  attributes: {
    avatar: Schema.Attribute.Media<"images"> & Schema.Attribute.Required;
    avatarDark: Schema.Attribute.Media<"images">;
    enabled: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    imageOriginY: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 100;
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<50>;
    imageScale: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          max: 3;
          min: 0.5;
        },
        number
      > &
      Schema.Attribute.DefaultTo<1>;
    key: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 40;
      }>;
    label: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    shirt: Schema.Attribute.Component<"portfolio.avatar-shirt", false>;
  };
}

export interface PortfolioBadgeSettings extends Struct.ComponentSchema {
  collectionName: "components_portfolio_badge_settings";
  info: {
    description: "How the certification tickets on the home page behave.";
    displayName: "Certification tickets";
  };
  attributes: {
    enabled: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    shuffle: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    shuffleSeconds: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 30;
          min: 2;
        },
        number
      > &
      Schema.Attribute.DefaultTo<4>;
  };
}

export interface PortfolioCommandLink extends Struct.ComponentSchema {
  collectionName: "components_portfolio_command_links";
  info: {
    description: "An extra entry in the \u2318K command menu.";
    displayName: "Command menu link";
  };
  attributes: {
    group: Schema.Attribute.String & Schema.Attribute.DefaultTo<"Links">;
    href: Schema.Attribute.String & Schema.Attribute.Required;
    keywords: Schema.Attribute.String;
    label: Schema.Attribute.String & Schema.Attribute.Required;
    openInNewTab: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    shortcut: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 1;
      }>;
  };
}

export interface PortfolioCommandMenu extends Struct.ComponentSchema {
  collectionName: "components_portfolio_command_menus";
  info: {
    description: "The \u2318K search: wording, which content it lists, and extra links.";
    displayName: "Command menu";
  };
  attributes: {
    customLinks: Schema.Attribute.Component<"portfolio.command-link", true>;
    emptyText: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<"No results found.">;
    enabled: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    placeholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<"Type a command or search\u2026">;
    showArticles: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    showBrandAssets: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    showCertifications: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    showContact: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    showExperience: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    showProjects: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    showPublications: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    showSections: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    showSkills: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    showSocialLinks: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    showTheme: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    showTopics: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
  };
}

export interface PortfolioContactMethod extends Struct.ComponentSchema {
  collectionName: "components_portfolio_contact_methods";
  info: {
    description: "A row in the call to action's Get in touch column.";
    displayName: "Contact method";
  };
  attributes: {
    href: Schema.Attribute.String & Schema.Attribute.Required;
    icon: Schema.Attribute.String &
      Schema.Attribute.CustomField<"global::icon-picker">;
    newTab: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    subtitle: Schema.Attribute.String;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface PortfolioContributions extends Struct.ComponentSchema {
  collectionName: "components_portfolio_contributions";
  info: {
    description: "The activity heatmap of GitHub and LeetCode contributions.";
    displayName: "Contributions";
  };
  attributes: {
    defaultView: Schema.Attribute.Enumeration<
      ["overall", "github", "leetcode"]
    > &
      Schema.Attribute.DefaultTo<"overall">;
    enabled: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    githubLabel: Schema.Attribute.String & Schema.Attribute.DefaultTo<"GitHub">;
    githubUsername: Schema.Attribute.String;
    leetcodeLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<"LeetCode">;
    leetcodeUsername: Schema.Attribute.String;
    overallLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<"Overall">;
  };
}

export interface PortfolioCta extends Struct.ComponentSchema {
  collectionName: "components_portfolio_ctas";
  info: {
    description: "The closing contact block above the footer on the home page.";
    displayName: "Call to action";
  };
  attributes: {
    description: Schema.Attribute.Text;
    enabled: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    eyebrow: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<"Let's work together">;
    formButton: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<"Send message">;
    formDescription: Schema.Attribute.Text;
    formEnabled: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    formHeading: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<"Send a message">;
    formSuccess: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<"Thanks \u2014 your message is in. I'll reply within 24 hours.">;
    heading: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<"Get in touch">;
    methods: Schema.Attribute.Component<"portfolio.contact-method", true>;
  };
}

export interface PortfolioEmailBranding extends Struct.ComponentSchema {
  collectionName: "components_portfolio_email_branding";
  info: {
    description: "Website identity, signature and links in incoming contact notifications.";
    displayName: "Contact email branding";
  };
  attributes: {
    footerNote: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    logo: Schema.Attribute.Media<"images">;
    logoDark: Schema.Attribute.Media<"images">;
    senderAvatar: Schema.Attribute.Media<"images">;
    showFooterWordmark: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    showProfilePhoto: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    signatureLinks: Schema.Attribute.Component<"portfolio.nav-link", true>;
    signatureText: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    theme: Schema.Attribute.Enumeration<["dark", "light"]> &
      Schema.Attribute.DefaultTo<"dark">;
    websiteDescription: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
  };
}

export interface PortfolioFooter extends Struct.ComponentSchema {
  collectionName: "components_portfolio_footer";
  info: {
    description: "Footer heading, GitHub build source, editable grid cells, and wordmark.";
    displayName: "Footer";
  };
  attributes: {
    developerBuildLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<"Developer build">;
    fields: Schema.Attribute.Component<"portfolio.footer-field", true>;
    homeHref: Schema.Attribute.String & Schema.Attribute.DefaultTo<"/">;
    repositoryBranch: Schema.Attribute.String;
    repositoryUrl: Schema.Attribute.String;
    showWordmark: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    title: Schema.Attribute.String & Schema.Attribute.DefaultTo<"S4MEER.COM">;
    unavailableBuildLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<"Unavailable">;
  };
}

export interface PortfolioFooterField extends Struct.ComponentSchema {
  collectionName: "components_portfolio_footer_field";
  info: {
    description: "One cell in the footer grid. Drag to reorder.";
    displayName: "Footer cell";
  };
  attributes: {
    kind: Schema.Attribute.Enumeration<
      [
        "links",
        "build",
        "date",
        "source",
        "stack",
        "content-count",
        "inspiration",
      ]
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<"links">;
    label: Schema.Attribute.String & Schema.Attribute.Required;
    links: Schema.Attribute.Component<"portfolio.footer-link", true>;
    width: Schema.Attribute.Enumeration<["one", "two", "full"]> &
      Schema.Attribute.DefaultTo<"one">;
  };
}

export interface PortfolioFooterLink extends Struct.ComponentSchema {
  collectionName: "components_portfolio_footer_link";
  info: {
    description: "A footer label with an optional destination.";
    displayName: "Footer entry";
  };
  attributes: {
    href: Schema.Attribute.String;
    label: Schema.Attribute.String & Schema.Attribute.Required;
    newTab: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
  };
}

export interface PortfolioMovieMoment extends Struct.ComponentSchema {
  collectionName: "components_portfolio_movie_moments";
  info: {
    description: "A captioned movie moment placed after an article section.";
    displayName: "Movie GIF";
  };
  attributes: {
    afterHeading: Schema.Attribute.String;
    alt: Schema.Attribute.String;
    caption: Schema.Attribute.Text & Schema.Attribute.Required;
    captionArea: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 50;
          min: 10;
        },
        number
      > &
      Schema.Attribute.DefaultTo<32>;
    displayWidth: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 100;
          min: 20;
        },
        number
      > &
      Schema.Attribute.DefaultTo<80>;
    enabled: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    gif: Schema.Attribute.Media<"images">;
    movieTitle: Schema.Attribute.String & Schema.Attribute.Required;
    placement: Schema.Attribute.Enumeration<["after-intro", "after-section"]> &
      Schema.Attribute.DefaultTo<"after-section">;
    poster: Schema.Attribute.Media<"images">;
    sourceUrl: Schema.Attribute.String & Schema.Attribute.Required;
    video: Schema.Attribute.Media<"videos">;
  };
}

export interface PortfolioNavLink extends Struct.ComponentSchema {
  collectionName: "components_portfolio_nav_link";
  info: {
    description: "One entry in the top navigation bar.";
    displayName: "Navigation link";
  };
  attributes: {
    href: Schema.Attribute.String & Schema.Attribute.Required;
    label: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface PortfolioOwnedDomain extends Struct.ComponentSchema {
  collectionName: "components_portfolio_owned_domain";
  info: {
    displayName: "Owned domain";
  };
  attributes: {
    description: Schema.Attribute.Text;
    label: Schema.Attribute.String;
    redirectToPrimary: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    relationship: Schema.Attribute.Enumeration<["alias", "separate-site"]> &
      Schema.Attribute.DefaultTo<"alias">;
    url: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface PortfolioPageSeo extends Struct.ComponentSchema {
  collectionName: "components_portfolio_page_seo";
  info: {
    displayName: "Page search & sharing";
  };
  attributes: {
    canonicalUrl: Schema.Attribute.String;
    description: Schema.Attribute.Text;
    imageAlt: Schema.Attribute.String;
    includeInSitemap: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    nofollow: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    noindex: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    socialImage: Schema.Attribute.Media<"images">;
    title: Schema.Attribute.String;
  };
}

export interface PortfolioPosition extends Struct.ComponentSchema {
  collectionName: "components_portfolio_position";
  info: {
    description: "One role held at a company.";
    displayName: "Position";
  };
  attributes: {
    description: Schema.Attribute.RichText;
    employmentType: Schema.Attribute.Enumeration<
      [
        "Full-time",
        "Part-time",
        "Contract",
        "Freelance",
        "Internship",
        "Apprenticeship",
        "Self-employed",
      ]
    >;
    endDate: Schema.Attribute.String;
    icon: Schema.Attribute.String &
      Schema.Attribute.CustomField<"global::icon-picker">;
    isExpanded: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    skills: Schema.Attribute.Component<"portfolio.tag", true>;
    startDate: Schema.Attribute.String & Schema.Attribute.Required;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface PortfolioProfile extends Struct.ComponentSchema {
  collectionName: "components_portfolio_profile";
  info: {
    description: "Your name, role and biography, shown at the top of the home page.";
    displayName: "Profile";
  };
  attributes: {
    about: Schema.Attribute.RichText;
    avatar: Schema.Attribute.Media<"images" | "files">;
    avatarAlt: Schema.Attribute.String;
    avatarDark: Schema.Attribute.Media<"images" | "files">;
    avatarLabel: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    avatarShirt: Schema.Attribute.Component<"portfolio.avatar-shirt", false>;
    avatarVariants: Schema.Attribute.Component<
      "portfolio.avatar-variant",
      true
    >;
    displayName: Schema.Attribute.String & Schema.Attribute.Required;
    email: Schema.Attribute.Email;
    location: Schema.Attribute.String;
    locationPhoto: Schema.Attribute.Media<"images">;
    locationPhotoSubject: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    namePronunciation: Schema.Attribute.Media<"audios">;
    pronouns: Schema.Attribute.String;
    role: Schema.Attribute.String;
    showLocalTime: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    slogan: Schema.Attribute.String;
    timeZone: Schema.Attribute.String;
    verified: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
  };
}

export interface PortfolioProjectLabels extends Struct.ComponentSchema {
  collectionName: "components_portfolio_project_labels";
  info: {
    description: "Wording on the projects pages, including the two buttons on each project.";
    displayName: "Projects wording";
  };
  attributes: {
    coreHeading: Schema.Attribute.String;
    emptyMessage: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<"Projects will be added here soon.">;
    pageDescription: Schema.Attribute.Text;
    pageTitle: Schema.Attribute.String;
    previewButton: Schema.Attribute.String;
    sideHeading: Schema.Attribute.String;
    sourceButton: Schema.Attribute.String;
  };
}

export interface PortfolioPublicationLabels extends Struct.ComponentSchema {
  collectionName: "components_portfolio_publication_labels";
  info: {
    description: "Wording on the publications pages.";
    displayName: "Publications wording";
  };
  attributes: {
    abstractHeading: Schema.Attribute.String;
    categoriesHeading: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<"Categories">;
    categoryPageDescription: Schema.Attribute.Text &
      Schema.Attribute.DefaultTo<"Papers and research about {name}.">;
    citeHeading: Schema.Attribute.String;
    listHeading: Schema.Attribute.String;
    pageDescription: Schema.Attribute.Text;
    pageTitle: Schema.Attribute.String;
  };
}

export interface PortfolioSectionLabels extends Struct.ComponentSchema {
  collectionName: "components_portfolio_section_labels";
  info: {
    description: "Headings for the sections on the home page.";
    displayName: "Home page headings";
  };
  attributes: {
    about: Schema.Attribute.String;
    certifications: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<"Certifications">;
    education: Schema.Attribute.String;
    experience: Schema.Attribute.String;
    skills: Schema.Attribute.String;
  };
}

export interface PortfolioSeo extends Struct.ComponentSchema {
  collectionName: "components_portfolio_seo";
  info: {
    description: "Canonical domain, identity, page metadata, search indexing, AI discovery and redirects.";
    displayName: "Search & sharing";
  };
  attributes: {
    aboutTitle: Schema.Attribute.String & Schema.Attribute.DefaultTo<"About">;
    allowAiSearch: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    allowAiTraining: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    alternateNames: Schema.Attribute.Text;
    author: Schema.Attribute.String;
    bingVerification: Schema.Attribute.String;
    canonicalOrigin: Schema.Attribute.String;
    desc: Schema.Attribute.Text;
    domainsHeading: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<"Official websites">;
    favicon: Schema.Attribute.Media<"images" | "files">;
    googleVerification: Schema.Attribute.String;
    homeLabel: Schema.Attribute.String & Schema.Attribute.DefaultTo<"Home">;
    indexingEnabled: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    language: Schema.Attribute.String;
    linksHeading: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<"Official profiles">;
    llmsEnabled: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    locale: Schema.Attribute.String & Schema.Attribute.DefaultTo<"en_US">;
    ogImage: Schema.Attribute.Media<"images" | "files">;
    ogImageAlt: Schema.Attribute.String;
    ownedDomains: Schema.Attribute.Component<"portfolio.owned-domain", true>;
    pages: Schema.Attribute.Component<"portfolio.seo-page", true>;
    profile: Schema.Attribute.String;
    redirects: Schema.Attribute.Component<"portfolio.seo-redirect", true>;
    sameAs: Schema.Attribute.Text;
    showDirectoryLinks: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    sitemapTitle: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<"Site map">;
    siteName: Schema.Attribute.String;
    title: Schema.Attribute.String;
    titleTemplate: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<"%s | %n">;
    twitterHandle: Schema.Attribute.String;
  };
}

export interface PortfolioSeoPage extends Struct.ComponentSchema {
  collectionName: "components_portfolio_seo_page";
  info: {
    displayName: "Page override";
  };
  attributes: {
    metadata: Schema.Attribute.Component<"portfolio.page-seo", false>;
    path: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface PortfolioSeoRedirect extends Struct.ComponentSchema {
  collectionName: "components_portfolio_seo_redirect";
  info: {
    displayName: "Permanent URL redirect";
  };
  attributes: {
    enabled: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    fromPath: Schema.Attribute.String & Schema.Attribute.Required;
    toPath: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface PortfolioSkill extends Struct.ComponentSchema {
  collectionName: "components_portfolio_skill";
  info: {
    description: "A technology shown in the Skills grid.";
    displayName: "Skill";
  };
  attributes: {
    group: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    href: Schema.Attribute.String;
    icon: Schema.Attribute.String &
      Schema.Attribute.CustomField<"global::icon-picker">;
    image: Schema.Attribute.Media<"images" | "files">;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface PortfolioSocialLink extends Struct.ComponentSchema {
  collectionName: "components_portfolio_social_link";
  info: {
    description: "A link to you elsewhere. Shown under your profile, in the footer, or both.";
    displayName: "Link";
  };
  attributes: {
    href: Schema.Attribute.String & Schema.Attribute.Required;
    icon: Schema.Attribute.String &
      Schema.Attribute.CustomField<"global::icon-picker">;
    image: Schema.Attribute.Media<"images" | "files">;
    label: Schema.Attribute.String & Schema.Attribute.Required;
    prefix: Schema.Attribute.String;
    previewImage: Schema.Attribute.Media<"images">;
    showInFooter: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    showInProfile: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    showPreview: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    suffix: Schema.Attribute.String;
  };
}

export interface PortfolioSpotify extends Struct.ComponentSchema {
  collectionName: "components_portfolio_spotify";
  info: {
    description: "Live Spotify listening activity or a manually selected music pick.";
    displayName: "Spotify status";
  };
  attributes: {
    albumCover: Schema.Attribute.Media<"images">;
    artist: Schema.Attribute.String;
    enabled: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    idleText: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<"Recently vibing to">;
    prefix: Schema.Attribute.String & Schema.Attribute.DefaultTo<"Vibing to">;
    source: Schema.Attribute.Enumeration<["live", "manual"]> &
      Schema.Attribute.DefaultTo<"live">;
    trackTitle: Schema.Attribute.String;
    trackUrl: Schema.Attribute.String;
  };
}

export interface PortfolioTag extends Struct.ComponentSchema {
  collectionName: "components_portfolio_tag";
  info: {
    displayName: "Tag";
  };
  attributes: {
    label: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface PortfolioUiLabels extends Struct.ComponentSchema {
  collectionName: "components_portfolio_ui_labels";
  info: {
    description: "Wording on buttons and controls that appear throughout the site.";
    displayName: "Button wording";
  };
  attributes: {
    backToTop: Schema.Attribute.String;
    copiedCode: Schema.Attribute.String;
    copyCode: Schema.Attribute.String;
    next: Schema.Attribute.String;
    previous: Schema.Attribute.String;
    showLess: Schema.Attribute.String;
    showMore: Schema.Attribute.String;
    tableOfContents: Schema.Attribute.String;
    theme: Schema.Attribute.String;
  };
}

declare module "@strapi/strapi" {
  export namespace Public {
    export interface ComponentSchemas {
      "portfolio.article-exercise": PortfolioArticleExercise;
      "portfolio.article-image": PortfolioArticleImage;
      "portfolio.article-labels": PortfolioArticleLabels;
      "portfolio.avatar-shirt": PortfolioAvatarShirt;
      "portfolio.avatar-variant": PortfolioAvatarVariant;
      "portfolio.badge-settings": PortfolioBadgeSettings;
      "portfolio.command-link": PortfolioCommandLink;
      "portfolio.command-menu": PortfolioCommandMenu;
      "portfolio.contact-method": PortfolioContactMethod;
      "portfolio.contributions": PortfolioContributions;
      "portfolio.cta": PortfolioCta;
      "portfolio.email-branding": PortfolioEmailBranding;
      "portfolio.footer": PortfolioFooter;
      "portfolio.footer-field": PortfolioFooterField;
      "portfolio.footer-link": PortfolioFooterLink;
      "portfolio.movie-moment": PortfolioMovieMoment;
      "portfolio.nav-link": PortfolioNavLink;
      "portfolio.owned-domain": PortfolioOwnedDomain;
      "portfolio.page-seo": PortfolioPageSeo;
      "portfolio.position": PortfolioPosition;
      "portfolio.profile": PortfolioProfile;
      "portfolio.project-labels": PortfolioProjectLabels;
      "portfolio.publication-labels": PortfolioPublicationLabels;
      "portfolio.section-labels": PortfolioSectionLabels;
      "portfolio.seo": PortfolioSeo;
      "portfolio.seo-page": PortfolioSeoPage;
      "portfolio.seo-redirect": PortfolioSeoRedirect;
      "portfolio.skill": PortfolioSkill;
      "portfolio.social-link": PortfolioSocialLink;
      "portfolio.spotify": PortfolioSpotify;
      "portfolio.tag": PortfolioTag;
      "portfolio.ui-labels": PortfolioUiLabels;
    }
  }
}
