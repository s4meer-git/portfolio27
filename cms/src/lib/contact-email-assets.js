const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');

const CIDS = { logo: 'site-logo@portfolio', footer: 'site-wordmark@portfolio', avatar: 'site-avatar@portfolio', sender: 'sender-avatar@portfolio' };
const defaults = new Map();

function defaultAsset(publicDir, filename) {
  const filenamePath = path.join(publicDir, 'brand', filename);
  if (!defaults.has(filenamePath)) {
    const content = fs.readFile(filenamePath).catch(error => { defaults.delete(filenamePath); throw error; });
    defaults.set(filenamePath, content);
  }
  return defaults.get(filenamePath);
}

async function uploadedImage(publicDir, media, width, height = width, fit = 'cover', background = '#ffffff') {
  const url = media?.url;
  // Only local uploaded raster files. Never fetch URLs or arbitrary file paths.
  if (typeof url !== 'string' || !/^\/uploads\/[a-zA-Z0-9_.-]+\.(png|jpe?g|webp|gif)$/i.test(url)) return null;
  const uploads = await fs.realpath(path.join(publicDir, 'uploads'));
  const filename = await fs.realpath(path.join(uploads, path.basename(url)));
  if (!filename.startsWith(uploads + path.sep)) return null;
  const stat = await fs.stat(filename);
  if (stat.size > 5 * 1024 * 1024) return null;
  const content = await fs.readFile(filename);
  const image = sharp(content, { limitInputPixels: 20_000_000 }).resize({ width, height, fit, background: background || { r: 0, g: 0, b: 0, alpha: 0 } });
  return (background ? image.flatten({ background }) : image.ensureAlpha()).png().toBuffer();
}

async function contactEmailAssets(site = {}, publicDir) {
  const settings = site.emailBranding || {};
  let logo;
  // Email branding is independent of website theme and future website redesigns.
  try { logo = await uploadedImage(publicDir, settings.logo || settings.logoDark, 264, 120, 'contain', null); } catch { /* Use the dedicated email cutout if unavailable. */ }
  const attachments = [{ filename: 'sc-logo.png', content: logo || await defaultAsset(publicDir, 'sc-logo-cutout.png'), cid: CIDS.logo, contentType: 'image/png', contentDisposition: 'inline' }];
  const assets = { logo: `cid:${CIDS.logo}`, attachments };
  if (settings.showFooterWordmark !== false) {
    attachments.push({ filename: 's4meer-wordmark.png', content: await defaultAsset(publicDir, 's4meer-logo-cutout.png'), cid: CIDS.footer, contentType: 'image/png', contentDisposition: 'inline' });
    assets.footer = `cid:${CIDS.footer}`;
  }
  if (settings.showProfilePhoto !== false && site.profile?.avatar) {
    const media = site.profile.avatar.formats?.thumbnail || site.profile.avatar;
    let photo;
    try { photo = await uploadedImage(publicDir, media, 120, 120, 'cover', '#ffffff'); } catch { /* The signature still works without a photo. */ }
    if (photo) {
      attachments.push({ filename: 'profile.png', content: photo, cid: CIDS.avatar, contentType: 'image/png', contentDisposition: 'inline' });
      assets.avatar = `cid:${CIDS.avatar}`;
    }
  }
  let sender;
  try { sender = await uploadedImage(publicDir, settings.senderAvatar, 132, 132, 'contain', null); } catch { /* Use the shared illustration if unavailable. */ }
  attachments.push({ filename: 'sender-avatar.png', content: sender || await defaultAsset(publicDir, 'sender-avatar.png'), cid: CIDS.sender, contentType: 'image/png', contentDisposition: 'inline' });
  assets.senderAvatar = `cid:${CIDS.sender}`;
  return assets;
}

module.exports = { contactEmailAssets };
