const fs = require('fs');
const path = require('path');

const KEY = 'certifications-cta-v1';

/** The badges shipped in `seed/certifications/`, imported once into an empty collection. */
const BADGES = [
  {
    name: 'AWS Certified Machine Learning Engineer – Associate',
    file: 'aws-ml-engineer-associate.png',
    credentialUrl: 'https://www.credly.com/badges/1576adbd-adc3-4621-bf32-01e846e0d25e/public_url',
  },
  {
    name: 'AWS Certified Cloud Practitioner',
    file: 'aws-cloud-practitioner.png',
    credentialUrl: 'https://www.credly.com/badges/1fdb6347-5ba9-44a4-977d-e58022c14c55/public_url',
  },
  {
    name: 'AWS Cloud Quest: Generative AI Practitioner',
    file: 'aws-cloud-quest-genai.png',
    credentialUrl: 'https://www.credly.com/badges/296c3642-55e6-44f9-9339-e3c3b8f1a948/public_url',
  },
];

/**
 * Component data read back from the CMS carries ids and whole media objects. Writing a
 * component replaces it, so strip the ids and reduce media to their ids, the same way
 * migrate-footer rebuilds the footer.
 */
function plain(value) {
  if (Array.isArray(value)) return value.map(plain);
  if (!value || typeof value !== 'object') return value;
  if (value.mime && value.url) return value.id;
  const out = {};
  for (const [key, inner] of Object.entries(value)) {
    if (key === 'id') continue;
    out[key] = plain(inner);
  }
  return out;
}

async function uploadBadge(strapi, file, name) {
  const filepath = path.join(process.cwd(), 'seed/certifications', file);
  if (!fs.existsSync(filepath)) return null;
  const [uploaded] = await strapi
    .plugin('upload')
    .service('upload')
    .upload({
      data: { fileInfo: { name: file, alternativeText: `${name} badge` } },
      files: { filepath, originalFilename: file, mimetype: 'image/png', size: fs.statSync(filepath).size },
    });
  return uploaded;
}

module.exports = async function migrateCertificationsCta(strapi) {
  const store = strapi.store({ type: 'core', name: 'portfolio' });
  if (await store.get({ key: KEY })) return;

  const certifications = strapi.documents('api::certification.certification');
  if ((await certifications.count({})) === 0) {
    for (const [order, badge] of BADGES.entries()) {
      const image = await uploadBadge(strapi, badge.file, badge.name);
      if (!image) continue;
      await certifications.create({
        status: 'published',
        data: {
          name: badge.name,
          issuer: 'Amazon Web Services',
          issuerIcon: 'AWS',
          badge: image.id,
          credentialUrl: badge.credentialUrl,
          order,
        },
      });
    }
  }

  const docs = strapi.documents('api::site-setting.site-setting');
  const site = await docs.findFirst({
    status: 'published',
    populate: {
      profile: true,
      socialLinks: true,
      sectionLabels: true,
      footer: { populate: { fields: { populate: ['links'] } } },
      seo: { populate: ['ogImage', 'favicon'] },
      cta: true,
    },
  });

  if (site) {
    const data = {};
    const name = site.profile?.displayName;

    // Update an unchanged personal title when the profile owner changes.
    // Preserve independently customised SEO titles.
    if (site.seo && name && site.seo.author !== name && site.seo.title === site.seo.author) {
      data.seo = { ...plain(site.seo), title: name, author: name };
    }
    if (site.footer && (!site.footer.title || site.footer.title === 'sameer.fyi')) {
      data.footer = { ...plain(site.footer), title: 'S4MEER.COM' };
    }
    if (site.sectionLabels && !site.sectionLabels.certifications) {
      data.sectionLabels = { ...plain(site.sectionLabels), certifications: 'Certifications' };
    }
    if (!site.cta) {
      const resume = (site.socialLinks || []).find(link => /resume|cv/i.test(link.label || ''));
      data.cta = {
        enabled: true,
        availability: 'Available for new opportunities',
        heading: 'Have an idea worth building?',
        description:
          'I help teams ship fast, reliable products — from cloud architecture and ML pipelines to polished interfaces. Tell me what you are working on.',
        primaryLabel: 'Get in touch',
        primaryHref: site.profile?.email ? `mailto:${site.profile.email}` : '',
        secondaryLabel: resume ? 'View resume' : '',
        secondaryHref: resume?.href || '',
      };
    }
    if (Object.keys(data).length) {
      await docs.update({ documentId: site.documentId, status: 'published', data });
    }
  }

  await store.set({ key: KEY, value: true });
  strapi.log.info('Added certifications and the call-to-action block.');
};

const FAVICON_KEY = 'favicon-sc-v1';

/**
 * The favicon field still held the starter template's Astro logo, and the site ignored
 * the field altogether. Replace it with the SC mark from `public/favicon.svg`, unless
 * the editor has already uploaded something of their own.
 */
module.exports.migrateFavicon = async function migrateFavicon(strapi) {
  const store = strapi.store({ type: 'core', name: 'portfolio' });
  if (await store.get({ key: FAVICON_KEY })) return;

  const docs = strapi.documents('api::site-setting.site-setting');
  const site = await docs.findFirst({ status: 'published', populate: { seo: { populate: ['ogImage', 'favicon'] } } });
  const current = site?.seo?.favicon;
  const filepath = path.resolve(process.cwd(), '../public/favicon.svg');
  const isTemplate = !current || (current.name === 'favicon.svg' && current.hash?.startsWith('favicon_'));

  if (site?.seo && isTemplate && fs.existsSync(filepath)) {
    const [file] = await strapi
      .plugin('upload')
      .service('upload')
      .upload({
        data: { fileInfo: { name: 'sc-favicon.svg', alternativeText: 'SC' } },
        files: { filepath, originalFilename: 'sc-favicon.svg', mimetype: 'image/svg+xml', size: fs.statSync(filepath).size },
      });
    await docs.update({
      documentId: site.documentId,
      status: 'published',
      data: { seo: { ...plain(site.seo), favicon: file.id } },
    });
    strapi.log.info('Replaced the template favicon with the SC mark.');
  }
  await store.set({ key: FAVICON_KEY, value: true });
};

const COMMAND_MENU_KEY = 'command-menu-badges-v1';

/** Gives existing sites the Command menu and Badge stack blocks with their defaults. */
module.exports.migrateCommandMenu = async function migrateCommandMenu(strapi) {
  const store = strapi.store({ type: 'core', name: 'portfolio' });
  if (await store.get({ key: COMMAND_MENU_KEY })) return;
  const docs = strapi.documents('api::site-setting.site-setting');
  const site = await docs.findFirst({ status: 'published', populate: { commandMenu: true, badges: true } });
  const data = {};
  if (site && !site.commandMenu) data.commandMenu = { enabled: true, customLinks: [] };
  if (site && !site.badges) data.badges = { enabled: true, shuffle: true, shuffleSeconds: 4 };
  if (Object.keys(data).length) {
    await docs.update({ documentId: site.documentId, status: 'published', data });
  }
  await store.set({ key: COMMAND_MENU_KEY, value: true });
};

const CTA_V2_KEY = 'cta-contact-v2';

/**
 * Rebuilds the call to action as the two-column contact block: contact methods made
 * from your email and links, and the message form switched on.
 */
module.exports.migrateContact = async function migrateContact(strapi) {
  const store = strapi.store({ type: 'core', name: 'portfolio' });
  if (await store.get({ key: CTA_V2_KEY })) return;
  const docs = strapi.documents('api::site-setting.site-setting');
  const site = await docs.findFirst({
    status: 'published',
    populate: { profile: true, socialLinks: true, cta: { populate: ['methods'] } },
  });
  if (site && !site.cta?.methods?.length) {
    const links = site.socialLinks || [];
    const find = pattern => links.find(link => pattern.test(`${link.label} ${link.icon}`));
    const resume = find(/resume|cv/i);
    const linkedin = find(/linkedin/i);
    const x = find(/(^|\s)(x|twitter)(\s|$)/i);
    const email = site.profile?.email;
    const methods = [
      email && { icon: 'Mail', title: email, subtitle: 'Quick inquiries & questions', href: `mailto:${email}`, newTab: false },
      resume && { icon: 'FileText', title: 'View my résumé', subtitle: 'Experience, skills & certifications', href: resume.href, newTab: true },
      linkedin && { icon: 'Linkedin', title: 'Connect on LinkedIn', subtitle: 'Work history & recommendations', href: linkedin.href, newTab: true },
      x && { icon: 'X', title: 'Connect on X', subtitle: 'Follow for updates & insights', href: x.href, newTab: true },
    ].filter(Boolean);
    await docs.update({
      documentId: site.documentId,
      status: 'published',
      data: {
        cta: {
          enabled: site.cta?.enabled !== false,
          eyebrow: "Let's work together",
          heading: 'Get in touch',
          description: 'Choose whichever way suits you, and let\u2019s talk about what you are building.',
          methods,
          formEnabled: true,
          formHeading: 'Send a message',
          formDescription: 'Prefer to write? Fill out the form and I\u2019ll get back to you within 24 hours.',
          formButton: 'Send message',
          formSuccess: 'Thanks \u2014 your message is in. I\u2019ll reply within 24 hours.',
        },
      },
    });
  }
  await store.set({ key: CTA_V2_KEY, value: true });
  strapi.log.info('Rebuilt the call to action as a contact block.');
};

const ISSUER_ICON_KEY = 'certification-issuer-icon-v1';

/** Existing AWS certifications get the AWS logo in their row. */
module.exports.migrateIssuerIcons = async function migrateIssuerIcons(strapi) {
  const store = strapi.store({ type: 'core', name: 'portfolio' });
  if (await store.get({ key: ISSUER_ICON_KEY })) return;
  const docs = strapi.documents('api::certification.certification');
  for (const item of await docs.findMany({ status: 'published' })) {
    if (!item.issuerIcon && /amazon|aws/i.test(`${item.issuer} ${item.name}`)) {
      await docs.update({ documentId: item.documentId, status: 'published', data: { issuerIcon: 'AWS' } });
    }
  }
  await store.set({ key: ISSUER_ICON_KEY, value: true });
};


const CREDENTIAL_ID_KEY = 'certification-credential-id-v1';

/** Credly links carry the badge's ID; print it on the ticket until an editor changes it. */
module.exports.migrateCredentialIds = async function migrateCredentialIds(strapi) {
  const store = strapi.store({ type: 'core', name: 'portfolio' });
  if (await store.get({ key: CREDENTIAL_ID_KEY })) return;
  const docs = strapi.documents('api::certification.certification');
  for (const item of await docs.findMany({ status: 'published' })) {
    const id = /credly\.com\/badges\/([0-9a-f-]{36})/i.exec(item.credentialUrl || '')?.[1];
    if (id && !item.credentialId) {
      await docs.update({ documentId: item.documentId, status: 'published', data: { credentialId: id.split('-')[0].toUpperCase() } });
    }
  }
  await store.set({ key: CREDENTIAL_ID_KEY, value: true });
};

const NAME_VOICE_KEY = 'name-pronunciation-v1';

/** Imports `public/brand/name_voice.mp3` as the profile's name pronunciation, once. */
module.exports.migrateNameVoice = async function migrateNameVoice(strapi) {
  const store = strapi.store({ type: 'core', name: 'portfolio' });
  if (await store.get({ key: NAME_VOICE_KEY })) return;
  const filepath = path.resolve(process.cwd(), '../public/brand/name_voice.mp3');
  const docs = strapi.documents('api::site-setting.site-setting');
  const site = await docs.findFirst({ status: 'published', populate: { profile: { populate: ['avatar', 'avatarDark', 'namePronunciation'] } } });
  if (site?.profile && !site.profile.namePronunciation && fs.existsSync(filepath)) {
    const [file] = await strapi
      .plugin('upload')
      .service('upload')
      .upload({
        data: { fileInfo: { name: 'name_voice.mp3', alternativeText: 'How to pronounce my name' } },
        files: { filepath, originalFilename: 'name_voice.mp3', mimetype: 'audio/mpeg', size: fs.statSync(filepath).size },
      });
    await docs.update({
      documentId: site.documentId,
      status: 'published',
      data: { profile: { ...plain(site.profile), namePronunciation: file.id } },
    });
    strapi.log.info('Added the name pronunciation audio.');
  }
  await store.set({ key: NAME_VOICE_KEY, value: true });
};
