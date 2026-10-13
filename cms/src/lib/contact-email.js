const { validTimeZone } = require('./contact-metadata');

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);
const multiline = value => escapeHtml(value).replace(/\r\n?|\n/g, '<br>');
const mono = "Consolas,'Courier New',monospace";

function formatDate(date, timeZone) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone, day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23', timeZoneName: 'shortOffset',
  }).format(date);
}

function websiteOrigin(site) {
  try {
    const url = new URL(site.seo?.canonicalOrigin || process.env.SITE_URL || 'https://s4meer.com');
    if (['http:', 'https:'].includes(url.protocol)) return url.origin;
  } catch { /* Use the confirmed primary domain. */ }
  return 'https://s4meer.com';
}

function safeLink(href, origin) {
  if (typeof href !== 'string' || !href.trim()) return null;
  try {
    const url = new URL(href, origin);
    return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

function contactEmail(entry, profile = {}, site = {}) {
  const { name, email, message, timeZone, ipAddress, fingerprint, userAgent, language } = entry;
  const settings = site.emailBranding || {};
  // Fixed email palette: never follows website, browser or legacy CMS theme settings.
  const brandBackground = '#000000';
  const brandText = '#ffffff';
  const brandMuted = '#a1a1aa';
  const colors = { canvas: '#f4f4f5', paper: '#ffffff', panel: '#fafafa', text: '#18181b', muted: '#71717a', line: '#e4e4e7' };
  const assets = site.assets || { logo: 'cid:site-logo@portfolio', footer: 'cid:site-wordmark@portfolio', senderAvatar: 'cid:sender-avatar@portfolio' };
  const origin = websiteOrigin(site);
  const domain = new URL(origin).hostname;
  const owner = profile.displayName || site.seo?.siteName || 'Portfolio';
  const description = settings.websiteDescription || '';
  const signature = settings.signatureText || '';
  const footerNote = settings.footerNote || '';
  const ownerZone = validTimeZone(profile.timeZone) || 'UTC';
  const visitorZone = validTimeZone(timeZone);
  const date = new Date(entry.createdAt);
  const received = formatDate(date, ownerZone);
  const visitorTime = visitorZone ? formatDate(date, visitorZone) : 'Not shared';
  const unavailable = 'Not shared';
  const subject = `New message from ${name.replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, 80)}`;
  const replyHref = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(`Re: ${subject}`)}`;
  const receivedDay = new Intl.DateTimeFormat('en-GB', { timeZone: ownerZone, day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  const receivedClock = new Intl.DateTimeFormat('en-GB', { timeZone: ownerZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZoneName: 'shortOffset' }).format(date);
  const recipient = site.recipient || profile.email || owner;
  const ownerEmailHref = profile.email ? `mailto:${encodeURIComponent(profile.email)}` : null;
  const links = (settings.signatureLinks || [])
    .map(link => ({ label: link.label, href: safeLink(link.href, origin) }))
    .filter(link => link.label && link.href).slice(0, 8);
  const details = [
    ['Received', `${received} (${ownerZone})`],
    ['Visitor time', visitorTime],
    ['Time zone', visitorZone || unavailable],
    ['IP address', ipAddress || 'Unavailable'],
    ['Language', language || unavailable],
  ];
  const rows = details.map(([label, value]) => `<tr>
    <td width="30%" style="padding:10px 0;border-bottom:1px solid ${colors.line};color:${colors.muted};font-size:12px;line-height:20px;vertical-align:top;">${escapeHtml(label)}</td>
    <td style="padding:10px 0 10px 12px;border-bottom:1px solid ${colors.line};color:${colors.text};font-size:12px;line-height:20px;vertical-align:top;overflow-wrap:anywhere;word-break:break-word;">${escapeHtml(value)}</td>
  </tr>`).join('');
  const signatureLinks = links.map(link => `<a href="${escapeHtml(link.href)}" style="display:inline-block;margin:8px 16px 0 0;color:${colors.muted};font-size:12px;line-height:20px;text-decoration:underline;overflow-wrap:anywhere;word-break:break-word;">${escapeHtml(link.label)}</a>`).join('');
  const photo = assets.avatar ? `<td width="56" style="width:56px;vertical-align:top;padding-right:16px;"><img src="${escapeHtml(assets.avatar)}" alt="${escapeHtml(owner)}" width="40" height="40" style="display:block;width:40px;height:40px;border:1px solid ${colors.line};border-radius:50%;"></td>` : '';
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">
<title>Contact message | ${escapeHtml(domain)}</title>
<style>:root{color-scheme:light only}a[x-apple-data-detectors]{color:inherit!important;text-decoration:none!important}@media only screen and (max-width:480px){.outer{padding:16px 8px!important}.section{padding:24px 20px!important}.brand{padding:24px 20px!important}.headline{font-size:20px!important}.sender-date{display:block!important;width:auto!important;text-align:left!important;padding:12px 0 0 56px!important}.sender-date br{display:none!important}.sender-date span{margin-right:6px!important}.sender-identity{display:block!important;width:100%!important}}</style>
</head><body style="margin:0;padding:0;background:${colors.canvas};color:${colors.text};font-family:Arial,Helvetica,sans-serif;">
<div style="display:none;font-size:1px;color:${colors.canvas};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${escapeHtml(name)} sent a message through ${escapeHtml(domain)}.</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${colors.canvas}"><tr><td class="outer" align="center" style="padding:32px 16px;">
<!--[if mso]><table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${colors.paper}" style="max-width:600px;table-layout:fixed;border:1px solid ${colors.line};border-radius:12px;overflow:hidden;color:${colors.text};">
<tr><td class="brand" bgcolor="${brandBackground}" style="padding:28px 32px;background:${brandBackground};border-radius:11px 11px 0 0;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="table-layout:fixed;"><tr>
<td width="68" style="vertical-align:middle;"><a href="${escapeHtml(origin)}"><img src="${escapeHtml(assets.logo)}" alt="SC | ${escapeHtml(owner)}" width="48" style="display:block;width:48px;height:auto;border:0;"></a></td>
<td style="vertical-align:middle;overflow-wrap:anywhere;word-break:break-word;"><a href="${escapeHtml(origin)}" style="color:${brandText};font-size:16px;font-weight:600;line-height:24px;text-decoration:none;">${escapeHtml(domain)}</a><p style="margin:2px 0 0;color:${brandMuted};font-size:12px;line-height:20px;">New contact message</p></td>
</tr></table></td></tr>
<tr><td class="section" style="padding:32px;">
<h1 class="headline" style="margin:0 0 18px;color:${colors.text};font-size:20px;font-weight:600;line-height:28px;">Website enquiry</h1>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="table-layout:fixed;"><tr>
<td class="sender-identity" style="vertical-align:top;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="table-layout:fixed;"><tr>
<td width="56" style="width:56px;vertical-align:top;"><img src="${escapeHtml(assets.senderAvatar)}" alt="Illustrated sender avatar" width="44" height="44" style="display:block;width:44px;height:44px;background:#f4f4f5;border:1px solid ${colors.line};border-radius:50%;"></td>
<td style="vertical-align:top;overflow-wrap:anywhere;word-break:break-word;">
<p style="margin:0 0 2px;color:${colors.text};font-size:15px;font-weight:600;line-height:22px;">${escapeHtml(name)}</p>
<a href="${escapeHtml(replyHref)}" style="color:#52525b;font-size:13px;line-height:21px;text-decoration:none;overflow-wrap:anywhere;word-break:break-word;">${escapeHtml(email)}</a>
<p style="margin:4px 0 0;color:${colors.muted};font-size:12px;line-height:20px;">To: ${escapeHtml(recipient)}</p>
</td></tr></table>
</td>
<td class="sender-date" width="132" align="right" style="width:132px;padding-left:12px;vertical-align:top;color:${colors.muted};font-size:12px;line-height:20px;"><span>${escapeHtml(receivedDay)}</span><br><span>${escapeHtml(receivedClock)}</span></td>
</tr></table>
<div class="message" style="margin-top:22px;padding-top:24px;border-top:1px solid ${colors.line};color:${colors.text};font-size:15px;line-height:25px;overflow-wrap:anywhere;word-break:break-word;">${multiline(message)}</div>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:24px;"><tr><td bgcolor="#18181b" style="background:#18181b;border-radius:5px;"><a href="${escapeHtml(replyHref)}" style="display:inline-block;padding:11px 24px;border:1px solid #18181b;border-radius:5px;color:#ffffff;font-size:14px;line-height:22px;font-weight:600;text-decoration:none;">Reply to sender</a></td></tr></table>
</td></tr>
<tr><td class="section" style="padding:24px 32px;border-top:1px solid ${colors.line};">
<h2 style="margin:0 0 8px;color:${colors.text};font-size:15px;font-weight:600;line-height:24px;">Submission details</h2>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="table-layout:fixed;">${rows}</table>
<p style="margin:16px 0 4px;color:${colors.muted};font-size:12px;line-height:20px;">Browser fingerprint</p>
<p style="margin:0;color:${colors.text};font-family:${mono};font-size:11px;line-height:18px;overflow-wrap:anywhere;word-break:break-all;">${escapeHtml(fingerprint || unavailable)}</p>
<p style="margin:4px 0 14px;color:${colors.muted};font-size:11px;line-height:18px;">A browser signature, not a unique device ID.</p>
<p style="margin:0 0 4px;color:${colors.muted};font-size:12px;line-height:20px;">Browser / device</p>
<p style="margin:0;color:${colors.muted};font-size:11px;line-height:18px;overflow-wrap:anywhere;word-break:break-word;">${escapeHtml(userAgent || unavailable)}</p>
<p style="margin:12px 0 0;color:${colors.muted};font-family:${mono};font-size:10px;line-height:18px;overflow-wrap:anywhere;word-break:break-word;">UTC: ${escapeHtml(date.toISOString())}</p>
</td></tr>
<tr><td class="section" bgcolor="${colors.panel}" style="padding:24px 32px;border-top:1px solid ${colors.line};">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="table-layout:fixed;"><tr>${photo}<td style="vertical-align:top;overflow-wrap:anywhere;word-break:break-word;">
<p style="margin:0 0 2px;color:${colors.text};font-size:14px;font-weight:600;line-height:21px;">${escapeHtml(owner)}</p>
${profile.role ? `<p style="margin:0 0 4px;color:${colors.muted};font-size:12px;line-height:20px;">${escapeHtml(profile.role)}</p>` : ''}
${profile.location ? `<p style="margin:0 0 4px;color:${colors.muted};font-size:12px;line-height:20px;">${escapeHtml(profile.location)}</p>` : ''}
${ownerEmailHref ? `<a href="${escapeHtml(ownerEmailHref)}" style="color:${colors.text};font-size:12px;line-height:20px;text-decoration:underline;overflow-wrap:anywhere;word-break:break-word;">${escapeHtml(profile.email)}</a><br>` : ''}
<a href="${escapeHtml(origin)}" style="color:${colors.text};font-size:12px;line-height:20px;text-decoration:underline;">${escapeHtml(domain)}</a>
${signature ? `<p style="margin:8px 0 0;color:${colors.muted};font-size:12px;line-height:20px;">${multiline(signature)}</p>` : ''}
</td></tr></table>
${description ? `<p style="margin:16px 0 0;color:${colors.muted};font-size:12px;line-height:20px;">${multiline(description)}</p>` : ''}
${signatureLinks ? `<div>${signatureLinks}</div>` : ''}
</td></tr>
${assets.footer && settings.showFooterWordmark !== false ? `<tr><td class="brand" align="center" bgcolor="#000000" style="padding:28px 32px;background:#000000;border-radius:0 0 11px 11px;"><a href="${escapeHtml(origin)}"><img src="${escapeHtml(assets.footer)}" alt="S4MEER" width="420" style="display:block;width:100%;max-width:420px;height:auto;border:0;"></a></td></tr>` : ''}
${footerNote ? `<tr><td align="center" style="padding:16px 24px;border-top:1px solid ${colors.line};color:${colors.muted};font-size:11px;line-height:18px;">${multiline(footerNote)}</td></tr>` : ''}
</table><!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>`;
  const text = [
    `New message for ${owner} | ${domain}`, '', `Name: ${name}`, `Email: ${email}`, `To: ${recipient}`, `Date: ${received} (${ownerZone})`, '',
    'MESSAGE', message, '', `Reply to: ${email}`, '', 'SUBMISSION DETAILS',
    ...details.map(([label, value]) => `${label}: ${value}`),
    `Browser fingerprint: ${fingerprint || unavailable}`,
    'Fingerprint is a hash of browser, language and time zone, not a unique device ID.',
    `Browser / device: ${userAgent || unavailable}`, `Recorded in UTC: ${date.toISOString()}`,
    '', 'WEBSITE', origin, description,
    ...links.map(link => `${link.label}: ${link.href}`),
    '', 'SIGNATURE', owner, profile.role, profile.location, profile.email, origin, signature,
    '', footerNote,
  ].filter(value => value !== undefined && value !== null).join('\n');
  return {
    replyTo: { name: name.replace(/[\u0000-\u001f\u007f]/g, ' ').trim(), address: email },
    subject,
    date, text, html, attachments: assets.attachments || [],
  };
}

module.exports = { contactEmail };
